#!/usr/bin/env python3
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

from location_catalog import (  # noqa: E402
    LocationCatalog,
    Municipality,
    _geocoding_queries,
    forecast_source_code,
)

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

assert forecast_source_code("014030") == "014100"
assert forecast_source_code("460040") == "460100"
assert forecast_source_code("017000") == "017000"

obihiro = Municipality(
    code="0120700", name="帯広市", en_name="Obihiro",
    prefecture_code="01", prefecture_name="北海道",
    office_code="014030", office_name="十勝地方",
    class10_code="014030", class10_name="十勝地方",
    class15_code="", class15_name="",
)
queries = _geocoding_queries(obihiro, ["帯広"])
assert "帯広" in queries
assert "帯広 北海道" in queries
assert "Obihiro" in queries
print("location-catalog-smoke-test: OK")
