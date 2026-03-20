#!/usr/bin/env python3
"""Download RxNorm displaynames for client-side autocomplete"""

import json
import os
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(SCRIPT_DIR, "..", "data", "rxnorm-displaynames.json")

def main():
    print("Downloading RxNorm displaynames...")
    url = "https://rxnav.nlm.nih.gov/REST/Prescribe/displaynames.json"
    req = urllib.request.Request(url, headers={"User-Agent": "CascadeGuard/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())

    names = data.get("displayTermsList", {}).get("term", [])
    with open(OUT_FILE, "w") as f:
        json.dump(names, f)

    print(f"Saved {len(names)} drug names ({os.path.getsize(OUT_FILE) / 1024:.0f} KB)")

if __name__ == "__main__":
    main()
