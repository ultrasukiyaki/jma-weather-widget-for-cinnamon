#!/usr/bin/env bash
set -euo pipefail

UUID="jma-weather@10yendama.com"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="${HOME}/.local/share/cinnamon/applets/${UUID}"

echo "Installing ${UUID}..."
mkdir -p "$(dirname "${DEST_DIR}")"
rm -rf "${DEST_DIR}"
cp -a "${SOURCE_DIR}" "${DEST_DIR}"

echo
echo "Installed to:"
echo "  ${DEST_DIR}"
echo
echo "Reload Cinnamon:"
echo "  Alt+F2 -> r -> Enter  (X11)"
echo
echo "Then remove/re-add the applet if the old UI remains cached."
