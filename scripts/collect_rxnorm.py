#!/usr/bin/env python3
"""
Collect RxNorm data (RxCUI, drug class, brand names) for all drugs in drug-list.json
Rate limit: 20 req/sec — very generous
"""

import json
import os
import time
import urllib.request
import urllib.parse
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DRUG_LIST = os.path.join(SCRIPT_DIR, "drug-list.json")
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "data", "rxnorm")
DELAY = 0.2  # 5 req/sec


def fetch_json(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CascadeGuard/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except:
        return None


def collect_rxnorm(drug):
    result = {
        "genericName": drug,
        "rxcui": None,
        "drugClass": None,
        "brandNames": [],
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    # 1. Get RxCUI
    data = fetch_json(
        f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={urllib.parse.quote(drug)}&search=2"
    )
    time.sleep(DELAY)

    if data and data.get("idGroup", {}).get("rxnormId"):
        result["rxcui"] = data["idGroup"]["rxnormId"][0]
    else:
        # Try approximate match
        data = fetch_json(
            f"https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term={urllib.parse.quote(drug)}&maxEntries=1"
        )
        time.sleep(DELAY)
        candidates = data.get("approximateGroup", {}).get("candidate", []) if data else []
        if candidates:
            result["rxcui"] = candidates[0].get("rxcui")

    if not result["rxcui"]:
        return result

    # 2. Get drug class
    data = fetch_json(
        f"https://rxnav.nlm.nih.gov/REST/rxclass/class/byDrugName.json?drugName={urllib.parse.quote(drug)}&relaSource=MEDRT&relas=has_MoA"
    )
    time.sleep(DELAY)

    if data:
        infos = data.get("rxclassDrugInfoList", {}).get("rxclassDrugInfo", [])
        if infos:
            result["drugClass"] = infos[0].get("rxclassMinConceptItem", {}).get("className")

    # 3. Get brand names
    data = fetch_json(
        f"https://rxnav.nlm.nih.gov/REST/rxcui/{result['rxcui']}/allrelated.json"
    )
    time.sleep(DELAY)

    if data:
        groups = data.get("allRelatedGroup", {}).get("conceptGroup", [])
        bn_group = next((g for g in groups if g.get("tty") == "BN"), None)
        if bn_group and bn_group.get("conceptProperties"):
            result["brandNames"] = [p["name"] for p in bn_group["conceptProperties"]]

    return result


def main():
    with open(DRUG_LIST) as f:
        drugs = json.load(f)["drugs"]

    print(f"\nCollecting RxNorm data for {len(drugs)} drugs...\n")

    success = skipped = partial = 0
    index = {}

    for i, drug in enumerate(drugs):
        safe_name = drug.replace(" ", "_")
        out_file = os.path.join(OUT_DIR, f"{safe_name}.json")

        if os.path.exists(out_file):
            try:
                with open(out_file) as f:
                    existing = json.load(f)
                if existing.get("rxcui"):
                    print(f"[{i+1}/{len(drugs)}] SKIP {drug} (cached)")
                    index[drug] = {"rxcui": existing["rxcui"], "drugClass": existing.get("drugClass")}
                    skipped += 1
                    continue
            except:
                pass

        print(f"[{i+1}/{len(drugs)}] Fetching {drug}...")
        result = collect_rxnorm(drug)

        with open(out_file, "w") as f:
            json.dump(result, f, indent=2)

        if result["rxcui"]:
            print(f"  -> RxCUI: {result['rxcui']} | Class: {result['drugClass'] or 'N/A'} | Brands: {', '.join(result['brandNames'][:3]) or 'N/A'}")
            index[drug] = {"rxcui": result["rxcui"], "drugClass": result["drugClass"]}
            success += 1
        else:
            print(f"  -> No RxCUI found")
            partial += 1

    # Write index
    index_file = os.path.join(SCRIPT_DIR, "..", "data", "rxnorm-index.json")
    with open(index_file, "w") as f:
        json.dump(index, f, indent=2)

    print(f"\nDone! {success} success, {skipped} skipped, {partial} partial")


if __name__ == "__main__":
    main()
