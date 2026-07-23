#!/usr/bin/env bash
set -euo pipefail

UUID="jma-weather@10yendama.com"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="${HOME}/.local/share/cinnamon/applets/${UUID}"
DEST_PARENT="$(dirname "${DEST_DIR}")"
STAGING_DIR=""
BACKUP_DIR=""

cleanup() {
    if [[ -n "${STAGING_DIR}" && -d "${STAGING_DIR}" ]]; then
        rm -rf -- "${STAGING_DIR}"
    fi
}
trap cleanup EXIT

PAYLOAD=(
    applet.js
    data
    icons
    metadata.json
    settings-schema.json
    settings.py
    src
    stylesheet.css
)

echo "Installing ${UUID}..."
mkdir -p "${DEST_PARENT}"
STAGING_DIR="$(mktemp -d "${DEST_PARENT}/.${UUID}.install.XXXXXX")"

for item in "${PAYLOAD[@]}"; do
    if [[ ! -e "${SOURCE_DIR}/${item}" ]]; then
        echo "ERROR: required applet file is missing: ${item}" >&2
        exit 1
    fi
    cp -a -- "${SOURCE_DIR}/${item}" "${STAGING_DIR}/"
done
chmod 755 "${STAGING_DIR}/settings.py"

if [[ -e "${DEST_DIR}" ]]; then
    BACKUP_DIR="${DEST_PARENT}/.${UUID}.backup.$$"
    if [[ -e "${BACKUP_DIR}" ]]; then
        echo "ERROR: backup path already exists: ${BACKUP_DIR}" >&2
        exit 1
    fi
    mv -- "${DEST_DIR}" "${BACKUP_DIR}"
fi

if ! mv -- "${STAGING_DIR}" "${DEST_DIR}"; then
    echo "ERROR: could not install the applet to ${DEST_DIR}" >&2
    if [[ -n "${BACKUP_DIR}" && -d "${BACKUP_DIR}" ]]; then
        mv -- "${BACKUP_DIR}" "${DEST_DIR}"
        echo "The previous installation was restored." >&2
    fi
    exit 1
fi
STAGING_DIR=""

if [[ -n "${BACKUP_DIR}" && -d "${BACKUP_DIR}" ]]; then
    rm -rf -- "${BACKUP_DIR}"
fi

echo
echo "Installed to:"
echo "  ${DEST_DIR}"
echo
echo "Reload Cinnamon:"
echo "  Alt+F2 -> r -> Enter  (X11)"
echo
echo "Then remove/re-add the applet if the old UI remains cached."
