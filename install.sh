#!/usr/bin/env bash
set -euo pipefail

UUID="jma-weather@10yendama.com"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="${HOME}/.local/share/cinnamon/applets/${UUID}"

mkdir -p "$(dirname "${DEST_DIR}")"
rm -rf "${DEST_DIR}"
cp -a "${SRC_DIR}" "${DEST_DIR}"

echo
echo "インストール完了:"
echo "  ${DEST_DIR}"
echo
echo "次の操作:"
echo "  1. Cinnamonの『アプレット』を開く"
echo "  2. 『JMA Weather Japan』を探す"
echo "  3. パネルへ追加する"
echo
echo "一覧に出ない場合:"
echo "  Alt+F2 → r → Enter（X11セッションのみ）"
