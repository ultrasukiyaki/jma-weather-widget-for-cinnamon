# v3.0.0-alpha.2 release commands

```bash
git switch -c feature/v3-location-settings
./test.sh
./install.sh
```

Cinnamon再読み込み後、アプレットの「設定」を開き、都道府県・市区町村を選択してください。

```bash
git add .
git commit -m "feat: add prefecture and municipality location settings"
git push -u origin feature/v3-location-settings
```
