# v3.0.0 release commands

## 正式版昇格コミット

```bash
git switch feature/v3-resilience-cache
git pull --ff-only

./test.sh
git diff --check
git status --short

git add CHANGELOG.md README.md applet.js metadata.json test.sh \
  docs/ARCHITECTURE.md \
  RELEASE_NOTES_v3.0.0.md RELEASE_COMMANDS_v3.0.0.md

git commit -m "chore: promote v3.0.0-beta.1 to v3.0.0" \
  -m "- mark the validated beta feature set as stable
- update release metadata, documentation, and install instructions
- add final release notes and version consistency checks"

git push origin feature/v3-resilience-cache
```

GitHubで`feature/v3-resilience-cache`から`main`へのPRを作成し、CIと差分確認後にマージします。

## タグ作成

```bash
git switch main
git pull --ff-only origin main

./test.sh
git tag -a v3.0.0 -m "JMA Weather Japan v3.0.0"
git push origin v3.0.0
```

## GitHub Release

タイトル:

```text
JMA Weather Japan v3.0.0
```

本文には`RELEASE_NOTES_v3.0.0.md`を使用します。

添付ファイル:

- `jma-weather-widget-for-cinnamon-v3.0.0-github-ready.zip`
- `jma-weather-widget-v3.0.0-upgrade-from-beta.1.zip`
- `v3.0.0-beta.1-to-v3.0.0-release.patch`
- `jma-weather-widget-v3.0.0-SHA256SUMS.txt`

GitHub CLIを使う場合:

```bash
gh release create v3.0.0 \
  jma-weather-widget-for-cinnamon-v3.0.0-github-ready.zip \
  jma-weather-widget-v3.0.0-upgrade-from-beta.1.zip \
  v3.0.0-beta.1-to-v3.0.0-release.patch \
  jma-weather-widget-v3.0.0-SHA256SUMS.txt \
  --title "JMA Weather Japan v3.0.0" \
  --notes-file RELEASE_NOTES_v3.0.0.md
```
