#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf -- "${TEMP_DIR}"' EXIT

FAKE_BIN="${TEMP_DIR}/bin"
mkdir -p "${FAKE_BIN}"
ln -s "$(command -v bash)" "${FAKE_BIN}/bash"
ln -s "$(command -v dirname)" "${FAKE_BIN}/dirname"

set +e
PATH="${FAKE_BIN}" bash "${ROOT_DIR}/test.sh" --check-dependencies \
    >"${TEMP_DIR}/local.out" 2>&1
local_status=$?
CI=1 PATH="${FAKE_BIN}" bash "${ROOT_DIR}/test.sh" --check-dependencies \
    >"${TEMP_DIR}/ci.out" 2>&1
ci_status=$?
set -e

test "${local_status}" -eq 2
test "${ci_status}" -eq 2
grep -q "Developer tests require the gjs command" "${TEMP_DIR}/local.out"
grep -q "GJS tests were not run" "${TEMP_DIR}/local.out"
grep -q "CI cannot skip" "${TEMP_DIR}/ci.out"

ln -s "$(command -v gjs)" "${FAKE_BIN}/gjs"
PATH="${FAKE_BIN}" bash "${ROOT_DIR}/test.sh" --check-dependencies \
    >"${TEMP_DIR}/available.out" 2>&1
grep -q "developer dependencies: OK" "${TEMP_DIR}/available.out"

INSTALL_HOME="${TEMP_DIR}/home"
mkdir -p "${INSTALL_HOME}"
HOME="${INSTALL_HOME}" bash "${ROOT_DIR}/install.sh" \
    >"${TEMP_DIR}/install.out" 2>&1
DEST="${INSTALL_HOME}/.local/share/cinnamon/applets/jma-weather@10yendama.com"
test -f "${DEST}/applet.js"
test -x "${DEST}/settings.py"
test ! -e "${DEST}/.git"
test ! -e "${DEST}/test.sh"
test ! -e "${DEST}/tests"

if grep -Eq '\b(apt|apt-get|dnf|pacman|zypper|apk)\b' "${ROOT_DIR}/install.sh"; then
    echo "ERROR: install.sh must not invoke a package manager" >&2
    exit 1
fi
if grep -Eq '(^|[[:space:]])gjs([[:space:]]|$)' "${ROOT_DIR}/install.sh"; then
    echo "ERROR: install.sh must not require the gjs command" >&2
    exit 1
fi

test -x "${ROOT_DIR}/tools/build-release.sh"
bash -n "${ROOT_DIR}/tools/build-release.sh"
"${ROOT_DIR}/tools/build-release.sh" --help >"${TEMP_DIR}/builder-help.out"
grep -q -- "--base-tag TAG" "${TEMP_DIR}/builder-help.out"
grep -q "SHA256SUMS" "${TEMP_DIR}/builder-help.out"
grep -q "actions/checkout@v6" "${ROOT_DIR}/.github/workflows/test.yml"
grep -q "contents: read" "${ROOT_DIR}/.github/workflows/test.yml"

echo "release script tests: OK"
