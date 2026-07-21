#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

while IFS= read -r -d '' file; do
    node --check "${file}"
done < <(find . -type f -name '*.js' -print0)

python3 -m py_compile settings.py tools/location_catalog.py tests/location-catalog-smoke-test.py
python3 -m json.tool metadata.json >/dev/null
python3 -m json.tool settings-schema.json >/dev/null
python3 -m json.tool data/area-fallback.json >/dev/null

if grep -R --line-number --fixed-strings "const Extension = imports.ui.extension" applet.js src; then
    echo "ERROR: GNOME Shell-only extension import detected" >&2
    exit 1
fi

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

echo "all checks: OK"
