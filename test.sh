#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

check_gjs() {
    if command -v gjs >/dev/null 2>&1; then
        return 0
    fi

    echo "ERROR: Developer tests require the gjs command." >&2
    echo "Ubuntu / Linux Mint:" >&2
    echo "  sudo apt install gjs" >&2
    if [[ -n "${CI:-}" ]]; then
        echo "CI cannot skip the required GJS tests." >&2
    else
        echo "GJS tests were not run. Install gjs and retry ./test.sh." >&2
    fi
    return 2
}

if [[ "${1:-}" == "--check-dependencies" ]]; then
    check_gjs
    echo "developer dependencies: OK"
    exit 0
fi

check_gjs
PYTHON_CACHE_DIR="$(mktemp -d)"
trap 'rm -rf -- "${PYTHON_CACHE_DIR}"' EXIT

while IFS= read -r -d '' file; do
    node --check "${file}"
done < <(find . -type f -name '*.js' -print0)

PYTHONPYCACHEPREFIX="${PYTHON_CACHE_DIR}" python3 -m py_compile \
    settings.py \
    tools/location_catalog.py \
    tests/location-catalog-smoke-test.py \
    tests/settings-store-smoke-test.py
python3 -m json.tool metadata.json >/dev/null
python3 -m json.tool settings-schema.json >/dev/null
python3 -m json.tool data/area-fallback.json >/dev/null

python3 - <<'PYTEST'
from pathlib import Path
from xml.etree import ElementTree
icons = sorted(Path("icons").glob("*.svg"))
assert len(icons) >= 14, "bundled SVG icon set is incomplete"
for icon in icons:
    root = ElementTree.parse(icon).getroot()
    assert root.tag.endswith("svg"), f"invalid SVG root: {icon}"
PYTEST

if grep -R --line-number --fixed-strings "const Extension = imports.ui.extension" applet.js src; then
    echo "ERROR: GNOME Shell-only extension import detected" >&2
    exit 1
fi

# The custom menu must launch the v3 GTK settings application before any
# schema-generated Cinnamon settings fallback.
python3 - <<'PYTEST'
from pathlib import Path
text = Path("applet.js").read_text(encoding="utf-8")
start = text.index("    _openSettings() {")
end = text.index("    _render() {", start)
block = text[start:end]
assert 'settings.py' in block, "external settings launcher is missing"
assert 'Gio.Subprocess.new' in block, "external settings launcher is not direct"
assert block.index('Gio.Subprocess.new') < block.index('if (typeof this.configureApplet'), \
    "legacy configureApplet() is still preferred over external settings"
PYTEST

python3 - <<'PYTEST'
from pathlib import Path
catalog = Path("tools/location_catalog.py").read_text(encoding="utf-8")
settings = Path("settings.py").read_text(encoding="utf-8")
applet = Path("applet.js").read_text(encoding="utf-8")
assert '"cinnamon" / "spices" / UUID' in catalog, "current Cinnamon config path is missing"
assert 'XDG_CONFIG_HOME' in catalog, "XDG config support is missing"
assert '"014030": "014100"' in catalog, "Tokachi forecast source alias is missing"
assert '"460040": "460100"' in catalog, "Amami forecast source alias is missing"
assert "monitor_directory" in applet and "remoteUpdate" in applet, "settings file monitor is missing"
assert applet.count("this._settingsMonitor = null;") == 2, "settings monitor state was injected outside init/cleanup"
notifications = applet[applet.index("    _checkNotifications() {"):applet.index("    _notifyOnce(", applet.index("    _checkNotifications() {"))]
assert "_settingsMonitor" not in notifications, "notification code must not reset the settings monitor"
assert '"Eval"' not in settings, "settings dialog must not block on Cinnamon Eval"
assert 'self.latitude_entry.set_text("")' in settings, "automatic location changes must clear stale latitude"
assert 'self.longitude_entry.set_text("")' in settings, "automatic location changes must clear stale longitude"
assert 'self.lookup_pending' in settings and '_update_save_sensitivity' in settings, "lookup/save interlock is missing"
assert 'self.latitude_entry.connect("changed"' in settings, "manual latitude edits must update save sensitivity"
assert 'self.longitude_entry.connect("changed"' in settings, "manual longitude edits must update save sensitivity"
PYTEST

python3 - <<'PYTEST'
from pathlib import Path
text = Path("settings.py").read_text(encoding="utf-8")
start = text.index("    def _save(")
end = text.index("\ndef main()", start)
block = text[start:end]
save_pos = block.index("self.store.save()")
hide_pos = block.index("self.hide()", save_pos)
close_pos = block.index("self.destroy()", hide_pos)
assert save_pos < hide_pos < close_pos, "successful save must close locally and immediately"
assert "_notify_cinnamon_settings_changed" not in text, "blocking D-Bus save path remains"
PYTEST


python3 - <<'PYTEST'
from pathlib import Path
applet = Path("applet.js").read_text(encoding="utf-8")
schema = Path("settings-schema.json").read_text(encoding="utf-8")
assert "Applet.TextIconApplet" in applet, "panel SVG support requires TextIconApplet"
assert "set_applet_icon_path" in applet, "panel SVG path renderer is missing"
assert "WeatherSummaryMenuItem" in applet, "current weather SVG view is missing"
assert "WeatherForecastMenuItem" in applet, "forecast SVG list view is missing"
assert '"current-icon-size"' in schema and '"forecast-icon-size"' in schema, "SVG size settings are missing"
PYTEST


python3 - <<'PYTEST'
from pathlib import Path
applet = Path("applet.js").read_text(encoding="utf-8")
http_client = Path("src/services/httpClient.js").read_text(encoding="utf-8")
model = Path("src/models/weatherData.js").read_text(encoding="utf-8")
import json
metadata = json.loads(Path("metadata.json").read_text(encoding="utf-8"))
readme = Path("README.md").read_text(encoding="utf-8")
assert metadata.get("version") == "3.0.1", "metadata version must be exactly 3.0.1"
assert 'const VERSION = "3.0.1";' in applet, "applet version must be exactly 3.0.1"
assert readme.startswith("# JMA Weather Widget for Cinnamon 3.0.1\n"), "README release title is inconsistent"
assert "3.0.1" in Path("CHANGELOG.md").read_text(encoding="utf-8"), "CHANGELOG release is missing"
release_notes = Path("RELEASE_NOTES.md").read_text(encoding="utf-8")
assert "JMA Weather Japan v3.0.1" in release_notes, "v3.0.1 release notes are missing"
assert "JMA Weather Japan v3.0.0" in release_notes, "v3.0.0 release notes are missing"
assert not list(Path(".").glob("RELEASE_NOTES_*.md")), "versioned release notes must be consolidated"
assert not list(Path(".").glob("RELEASE_COMMANDS*.md")), "release command files must not remain"
assert "3.0.0-beta.1-github-ready.zip" not in readme, "README still points to the beta archive"
assert "_refreshGeneration" in applet and "_refreshInFlight" in applet and "_refreshQueued" in applet, \
    "refresh generation/exclusion state is missing"
assert "generation === this._refreshGeneration" in applet, "stale response gate is missing"
assert "WeatherSnapshot.fromCache" in applet, "startup cache restore is missing"
assert "前回取得データ" in model, "stale cache UI state is missing"
for kind in ["timeout", "http", "json", "network"]:
    assert f'"{kind}"' in http_client, f"HTTP error kind is missing: {kind}"
PYTEST

for required in \
    settings.py \
    tools/location_catalog.py \
    data/area-fallback.json \
    src/utils/weatherUtils.js \
    src/models/weatherData.js \
    src/services/httpClient.js \
    src/services/weatherService.js \
    src/services/locationService.js \
    src/services/iconService.js \
    src/services/cacheService.js \
    icons/unknown.svg \
    icons/warning.svg \
    src/providers/jmaProvider.js \
    src/providers/openMeteoProvider.js; do
    test -f "${required}" || { echo "ERROR: missing ${required}" >&2; exit 1; }
done

node tests/parser-smoke-test.js
node tests/icon-service-smoke-test.js
node tests/cache-service-smoke-test.js
node tests/weather-service-resilience-test.js
gjs tests/gjs-module-smoke-test.js
python3 tests/location-catalog-smoke-test.py
python3 tests/settings-store-smoke-test.py
bash tests/release-scripts-test.sh

echo "all checks: OK"
