# v2.1.0 リリースコマンド

想定ブランチ: `feature/v2.1.0-weather-details`

## 1. ブランチ作成

```bash
cd ~/Apps/Sources/Utilities/jma-weather-widget-for-cinnamon
git switch main
git pull --ff-only
git switch -c feature/v2.1.0-weather-details
```

## 2. このZIPのファイルをリポジトリへ上書き後、確認

```bash
git status
git diff --stat
git diff
```

## 3. 動作確認

```bash
./install.sh
```

Cinnamonを再読込後、以下を確認します。

- UV指数の日本語ラベル
- 体感温度コメント
- 現在・時間別の風速
- 更新時刻
- 雨通知

## 4. コミット・プッシュ

```bash
git add applet.js metadata.json settings-schema.json stylesheet.css \
  install.sh README.md CHANGELOG.md LICENSE .gitignore \
  RELEASE_NOTES_v2.1.0.md

git diff --cached
git commit -m "feat: add weather detail enhancements for v2.1.0"
git push -u origin feature/v2.1.0-weather-details
```

## 5. Pull Request作成

```bash
gh pr create \
  --base main \
  --head feature/v2.1.0-weather-details \
  --title "feat: release v2.1.0 weather detail enhancements" \
  --body-file RELEASE_NOTES_v2.1.0.md
```

## 6. Squash and Merge

```bash
gh pr merge feature/v2.1.0-weather-details \
  --squash \
  --delete-branch
```

## 7. main同期

```bash
git switch main
git pull --ff-only
git fetch --prune
```

## 8. 配布ZIP作成

```bash
cd ~/Apps/Sources/Utilities
rm -f jma-weather-widget-for-cinnamon-v2.1.0.zip

zip -r jma-weather-widget-for-cinnamon-v2.1.0.zip \
  jma-weather-widget-for-cinnamon/applet.js \
  jma-weather-widget-for-cinnamon/metadata.json \
  jma-weather-widget-for-cinnamon/settings-schema.json \
  jma-weather-widget-for-cinnamon/stylesheet.css \
  jma-weather-widget-for-cinnamon/install.sh \
  jma-weather-widget-for-cinnamon/README.md \
  jma-weather-widget-for-cinnamon/CHANGELOG.md \
  jma-weather-widget-for-cinnamon/LICENSE
```

## 9. タグ作成・プッシュ

```bash
cd ~/Apps/Sources/Utilities/jma-weather-widget-for-cinnamon
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0
```

## 10. GitHub Release公開

```bash
gh release create v2.1.0 \
  ../jma-weather-widget-for-cinnamon-v2.1.0.zip \
  --title "JMA Weather Widget for Cinnamon v2.1.0" \
  --notes-file RELEASE_NOTES_v2.1.0.md
```

## 11. 最終確認

```bash
gh release view v2.1.0
git status
git log --oneline --graph --decorate --all -10
```
