#!/usr/bin/env python3
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

from location_catalog import LocationCatalog  # noqa: E402

with (ROOT / "data" / "area-fallback.json").open(encoding="utf-8") as handle:
    catalog = LocationCatalog(json.load(handle))

hakodate = catalog.municipality("0120200")
assert hakodate is not None
assert hakodate.office_code == "017000"
assert hakodate.class10_name == "渡島地方"
assert hakodate.prefecture_name == "北海道"

fuchu = catalog.find_legacy("府中市", "130000")
assert fuchu is not None
assert fuchu.code == "1320600"

assert len(catalog.municipalities("01")) == 1
assert len(catalog.municipalities("13")) == 1
print("location-catalog-smoke-test: OK")
