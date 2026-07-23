#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

usage() {
    cat <<'EOF'
Usage: tools/build-release.sh --base-tag TAG [--output-dir DIR]

Build and verify the GitHub-ready ZIP, upgrade ZIP, patch, and SHA256SUMS
for the version declared in metadata.json.
EOF
}

BASE_TAG=""
OUTPUT_DIR="${ROOT_DIR}/dist"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --base-tag)
            [[ $# -ge 2 ]] || { usage >&2; exit 2; }
            BASE_TAG="$2"
            shift 2
            ;;
        --output-dir)
            [[ $# -ge 2 ]] || { usage >&2; exit 2; }
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "ERROR: unknown argument: $1" >&2
            usage >&2
            exit 2
            ;;
    esac
done

[[ -n "${BASE_TAG}" ]] || { echo "ERROR: --base-tag is required" >&2; exit 2; }
git rev-parse --verify "${BASE_TAG}^{commit}" >/dev/null

VERSION="$(
    python3 -c 'import json; print(json.load(open("metadata.json", encoding="utf-8"))["version"])'
)"
[[ "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
    echo "ERROR: metadata version is not a stable semantic version: ${VERSION}" >&2
    exit 1
}

BASE_VERSION="${BASE_TAG#v}"
GITHUB_ZIP="jma-weather-widget-for-cinnamon-v${VERSION}-github-ready.zip"
UPGRADE_ZIP="jma-weather-widget-v${VERSION}-upgrade-from-v${BASE_VERSION}.zip"
PATCH_FILE="v${BASE_VERSION}-to-v${VERSION}.patch"
SUMS_FILE="jma-weather-widget-v${VERSION}-SHA256SUMS.txt"
PACKAGE_ROOT="jma-weather-widget-for-cinnamon-v${VERSION}-github"

BUILD_DIR="$(mktemp -d)"
cleanup() {
    rm -rf -- "${BUILD_DIR}"
}
trap cleanup EXIT

mkdir -p \
    "${BUILD_DIR}/base" \
    "${BUILD_DIR}/current" \
    "${BUILD_DIR}/${PACKAGE_ROOT}" \
    "${OUTPUT_DIR}"

git archive "${BASE_TAG}" | tar -x -C "${BUILD_DIR}/base"
rsync -a \
    --exclude='.git/' \
    --exclude='.agents/' \
    --exclude='.codex/' \
    --exclude='dist/' \
    --exclude='*.zip' \
    --exclude='*.patch' \
    --exclude='*SHA256SUMS.txt' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='*.pyo' \
    ./ "${BUILD_DIR}/current/"
rsync -a "${BUILD_DIR}/current/" "${BUILD_DIR}/${PACKAGE_ROOT}/"

(
    cd "${BUILD_DIR}"
    zip -qr "${GITHUB_ZIP}" "${PACKAGE_ROOT}"
)

mapfile -d '' UPGRADE_FILES < <(
    {
        git diff --name-only -z --diff-filter=ACMRT "${BASE_TAG}" --
        git ls-files --others --exclude-standard -z
    } | sort -zu
)

(
    cd "${BUILD_DIR}/current"
    EXISTING_FILES=()
    for file in "${UPGRADE_FILES[@]}"; do
        [[ -f "${file}" || -L "${file}" ]] && EXISTING_FILES+=("${file}")
    done
    [[ ${#EXISTING_FILES[@]} -gt 0 ]] || {
        echo "ERROR: no upgrade files differ from ${BASE_TAG}" >&2
        exit 1
    }
    zip -q "${BUILD_DIR}/${UPGRADE_ZIP}" "${EXISTING_FILES[@]}"
)

set +e
(
    cd "${BUILD_DIR}"
    diff -ruN base current
) > "${BUILD_DIR}/${PATCH_FILE}"
DIFF_STATUS=$?
set -e
[[ ${DIFF_STATUS} -eq 1 ]] || {
    echo "ERROR: expected release differences from ${BASE_TAG}" >&2
    exit 1
}

mv -- "${BUILD_DIR}/${GITHUB_ZIP}" "${OUTPUT_DIR}/${GITHUB_ZIP}"
mv -- "${BUILD_DIR}/${UPGRADE_ZIP}" "${OUTPUT_DIR}/${UPGRADE_ZIP}"
mv -- "${BUILD_DIR}/${PATCH_FILE}" "${OUTPUT_DIR}/${PATCH_FILE}"

(
    cd "${OUTPUT_DIR}"
    sha256sum "${GITHUB_ZIP}" "${UPGRADE_ZIP}" "${PATCH_FILE}" > "${SUMS_FILE}"
    sha256sum --check "${SUMS_FILE}"
)

for archive in "${OUTPUT_DIR}/${GITHUB_ZIP}" "${OUTPUT_DIR}/${UPGRADE_ZIP}"; do
    if unzip -Z1 "${archive}" | grep -Eq \
        '(^|/)(\.git|\.agents|\.codex|\.vscode|__pycache__)(/|$)|\.py[co]$|\.zip$|\.patch$|SHA256SUMS|(~|\.sw[op])$'; then
        echo "ERROR: forbidden entry in ${archive}" >&2
        exit 1
    fi
done

mkdir -p \
    "${BUILD_DIR}/github-test" \
    "${BUILD_DIR}/upgrade-test" \
    "${BUILD_DIR}/patch-test"
unzip -q "${OUTPUT_DIR}/${GITHUB_ZIP}" -d "${BUILD_DIR}/github-test"
(
    cd "${BUILD_DIR}/github-test/${PACKAGE_ROOT}"
    ./test.sh
)

rsync -a "${BUILD_DIR}/base/" "${BUILD_DIR}/upgrade-test/"
unzip -oq "${OUTPUT_DIR}/${UPGRADE_ZIP}" -d "${BUILD_DIR}/upgrade-test"
diff -qr "${BUILD_DIR}/current" "${BUILD_DIR}/upgrade-test"

rsync -a "${BUILD_DIR}/base/" "${BUILD_DIR}/patch-test/"
(
    cd "${BUILD_DIR}/patch-test"
    patch -s -p1 < "${OUTPUT_DIR}/${PATCH_FILE}"
)
diff -qr "${BUILD_DIR}/current" "${BUILD_DIR}/patch-test"

echo
echo "Release artifacts:"
sed -n '1,20p' "${OUTPUT_DIR}/${SUMS_FILE}"
