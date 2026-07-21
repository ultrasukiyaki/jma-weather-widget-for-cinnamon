#!/usr/bin/env python3
import json
import os
import tempfile
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

from location_catalog import SettingsStore, UUID  # noqa: E402


def write_config(path: Path, display_name: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"display-name": {"value": display_name}}), encoding="utf-8")


old_home = os.environ.get("HOME")
old_xdg = os.environ.get("XDG_CONFIG_HOME")
try:
    with tempfile.TemporaryDirectory() as tmp:
        home = Path(tmp) / "home"
        xdg = Path(tmp) / "xdg"
        home.mkdir()
        os.environ["HOME"] = str(home)
        os.environ["XDG_CONFIG_HOME"] = str(xdg)

        current = xdg / "cinnamon" / "spices" / UUID / "7.json"
        legacy = home / ".cinnamon" / "configs" / UUID / "7.json"

        # New installations write to Cinnamon's current XDG path.
        store = SettingsStore(ROOT, "7")
        assert store.path == current, store.path

        # Legacy-only installations retain the legacy file.
        write_config(legacy, "legacy")
        store = SettingsStore(ROOT, "7")
        assert store.path == legacy, store.path

        # Current path wins when both files exist, matching Cinnamon.
        write_config(current, "current")
        store = SettingsStore(ROOT, "7")
        assert store.path == current, store.path
        assert store.get("display-name") == "current"
finally:
    if old_home is None:
        os.environ.pop("HOME", None)
    else:
        os.environ["HOME"] = old_home
    if old_xdg is None:
        os.environ.pop("XDG_CONFIG_HOME", None)
    else:
        os.environ["XDG_CONFIG_HOME"] = old_xdg

print("settings-store-smoke-test: OK")
