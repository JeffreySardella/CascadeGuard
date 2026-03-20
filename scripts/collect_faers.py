#!/usr/bin/env python3
"""
Collect openFDA FAERS adverse event counts for all drugs in drug-list.json
Rate limit: 40 req/min without API key = 1 request every 1.6s
"""

import json
import os
import time
import urllib.request
import urllib.parse
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DRUG_LIST = os.path.join(SCRIPT_DIR, "drug-list.json")
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "data", "faers")
DELAY = 1.6  # seconds between requests
BASE_URL = "https://api.fda.gov/drug/event.json"


def fetch_faers(drug):
    query = f'patient.drug.openfda.generic_name:"{drug}"'
    params = urllib.parse.urlencode({
        "search": query,
        "count": "patient.reaction.reactionmeddrapt.exact",
        "limit": "50"
    })
    url = f"{BASE_URL}?{params}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CascadeGuard/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            return {
                "drug": drug,
                "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "results": data.get("results", [])
            }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"drug": drug, "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "results": [], "note": "No FAERS data found"}
        if e.code == 429:
            print(f"  Rate limited, waiting 10s...")
            time.sleep(10)
            return fetch_faers(drug)
        return {"drug": drug, "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "results": [], "error": f"HTTP {e.code}"}
    except Exception as e:
        return {"drug": drug, "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "results": [], "error": str(e)}


def main():
    with open(DRUG_LIST) as f:
        drugs = json.load(f)["drugs"]

    print(f"\nCollecting FAERS data for {len(drugs)} drugs...")
    print(f"Estimated time: ~{len(drugs) * DELAY / 60:.1f} minutes\n")

    success = skipped = errors = 0

    for i, drug in enumerate(drugs):
        safe_name = drug.replace(" ", "_")
        out_file = os.path.join(OUT_DIR, f"{safe_name}.json")

        # Skip if already collected
        if os.path.exists(out_file):
            try:
                with open(out_file) as f:
                    existing = json.load(f)
                if existing.get("results") and len(existing["results"]) > 0:
                    print(f"[{i+1}/{len(drugs)}] SKIP {drug} (cached)")
                    skipped += 1
                    continue
            except:
                pass

        print(f"[{i+1}/{len(drugs)}] Fetching {drug}...")
        result = fetch_faers(drug)

        with open(out_file, "w") as f:
            json.dump(result, f, indent=2)

        if result["results"]:
            top = result["results"][0]
            print(f"  -> {len(result['results'])} reactions. Top: {top['term']} ({top['count']})")
            success += 1
        else:
            note = result.get("note", result.get("error", "unknown"))
            print(f"  -> No results ({note})")
            errors += 1

        if i < len(drugs) - 1:
            time.sleep(DELAY)

    print(f"\nDone! {success} success, {skipped} skipped, {errors} no data")
    print(f"Data saved to: {OUT_DIR}/")


if __name__ == "__main__":
    main()
