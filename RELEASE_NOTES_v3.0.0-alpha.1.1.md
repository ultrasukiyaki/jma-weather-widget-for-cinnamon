# v3.0.0-alpha.1.1 Release Notes

## Startup crash hotfix

`v3.0.0-alpha.1`はローカルモジュールの読込にGNOME Shell向けAPI
`imports.ui.extension.getCurrentExtension()`を誤って使用していたため、Cinnamon上で
`applet.js`の評価時にクラッシュしました。

本版では`metadata.path`を基点にCinnamon/CJSの`imports.searchPath`へ各モジュール
ディレクトリを登録し、Provider・Service・Model・Utilsを読み込みます。

## Upgrade

```bash
./install.sh
```

その後、X11では`Alt+F2`→`r`、Waylandではログアウト・ログインしてください。
