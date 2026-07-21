#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

while IFS= read -r -d '' file; do
    node --check "${file}"
done < <(find . -type f -name '*.js' -print0)

python3 -m py_compile settings.py tools/location_catalog.py tests/location-catalog-smoke-test.py tests/settings-store-smoke-test.py
python3 -m json.tool metadata.json >/dev/null
python3 -m json.tool settings-schema.json >/dev/null
python3 -m json.tool data/area-fallback.json >/dev/null

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

for required in \
    settings.py \
    tools/location_catalog.py \
    data/area-fallback.json \
    src/utils/weatherUtils.js \
    src/models/weatherData.js \
    src/services/httpClient.js \
    src/services/weatherService.js \
    src/services/locationService.js \
    src/providers/jmaProvider.js \
    src/providers/openMeteoProvider.js; do
    test -f "${required}" || { echo "ERROR: missing ${required}" >&2; exit 1; }
done

node tests/parser-smoke-test.js
python3 tests/location-catalog-smoke-test.py
python3 tests/settings-store-smoke-test.py

echo "all checks: OK"
