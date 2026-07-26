#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
readonly DEFAULT_OUTPUT="$PROJECT_ROOT/dist/cinnamon-spices"
readonly UUID="$(
    python3 -c \
        'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["uuid"])' \
        "$PROJECT_ROOT/spices/metadata.json"
)"

output_root="$DEFAULT_OUTPUT"
validator_repo=""

usage() {
    echo "Usage: $0 [--output-dir DIR] [--validator-repo DIR]"
}

while (($#)); do
    case "$1" in
        --output-dir)
            [[ $# -ge 2 ]] || { usage >&2; exit 2; }
            output_root="$2"
            shift 2
            ;;
        --validator-repo)
            [[ $# -ge 2 ]] || { usage >&2; exit 2; }
            validator_repo="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            usage >&2
            exit 2
            ;;
    esac
done

case "$output_root" in
    ""|"/"|"$PROJECT_ROOT"|"$PROJECT_ROOT/")
        echo "Refusing unsafe output directory: $output_root" >&2
        exit 1
        ;;
esac

stage_root="$output_root/$UUID"
runtime_root="$stage_root/files/$UUID"

rm -rf -- "$stage_root"
mkdir -p -- "$runtime_root"

install -m 0644 "$PROJECT_ROOT/spices/info.json" "$stage_root/info.json"
install -m 0644 "$PROJECT_ROOT/spices/README.md" "$stage_root/README.md"
install -m 0644 "$PROJECT_ROOT/screenshot_01.png" "$stage_root/screenshot.png"

install -m 0644 "$PROJECT_ROOT/spices/metadata.json" "$runtime_root/metadata.json"
install -m 0644 "$PROJECT_ROOT/applet.js" "$runtime_root/applet.js"
install -m 0644 "$PROJECT_ROOT/icon.png" "$runtime_root/icon.png"
install -m 0644 "$PROJECT_ROOT/settings-schema.json" "$runtime_root/settings-schema.json"
install -m 0755 "$PROJECT_ROOT/settings.py" "$runtime_root/settings.py"
install -m 0644 "$PROJECT_ROOT/stylesheet.css" "$runtime_root/stylesheet.css"
install -m 0644 "$PROJECT_ROOT/LICENSE" "$runtime_root/LICENSE"

for directory in data icons src; do
    cp -a -- "$PROJECT_ROOT/$directory" "$runtime_root/$directory"
done

mkdir -p -- "$runtime_root/tools"
install -m 0755 \
    "$PROJECT_ROOT/tools/location_catalog.py" \
    "$runtime_root/tools/location_catalog.py"

find "$stage_root" -type d -exec chmod 0755 {} +
find "$stage_root" -type f -exec chmod 0644 {} +
chmod 0755 \
    "$runtime_root/settings.py" \
    "$runtime_root/tools/location_catalog.py"

if find "$stage_root" -type f \
    \( -name '*.mo' -o -name '*.pyc' -o -name '*.zip' -o -name '*.tar.gz' \) \
    -print -quit | grep -q .; then
    echo "Forbidden generated file found in staging tree." >&2
    exit 1
fi

if [[ "$(find "$stage_root/files" -mindepth 1 -maxdepth 1 -printf '%f\n')" != "$UUID" ]]; then
    echo "The files directory must contain only $UUID." >&2
    exit 1
fi

echo "Staging tree:"
find "$stage_root" -printf '%M %P\n' | LC_ALL=C sort

echo
echo "SHA256:"
(
    cd "$stage_root"
    find . -type f -print0 |
        LC_ALL=C sort -z |
        xargs -0 sha256sum
)

if [[ -n "$validator_repo" ]]; then
    if [[ ! -x "$validator_repo/validate-spice" ]]; then
        echo "validate-spice not found or not executable: $validator_repo" >&2
        exit 1
    fi

    validation_parent="$(mktemp -d)"
    trap 'rm -rf -- "$validation_parent"' EXIT
    cp -a -- "$stage_root" "$validation_parent/$UUID"
    (
        cd "$validation_parent"
        "$validator_repo/validate-spice" "$UUID"
    )
fi
