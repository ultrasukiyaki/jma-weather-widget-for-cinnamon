# JMA Weather Widget for Cinnamon 3.0.0-alpha.3

気象庁の公式予報とOpen-Meteoの補助データを表示する、日本向けCinnamon天気アプレットです。

![screenshot](./screenshot_01.png)
![screenshot](./screenshot_02.png)

> **開発版:** `3.0.0-alpha.3`はv3アーキテクチャの表示刷新版です。
> Provider構成・地域選択UIに加え、パネル・現在・時間別・週間予報を同梱SVGアイコンで表示します。


## v3 alpha.3 SVG表示

天気コードを`IconService`で同梱SVGへ変換し、パネル・現在天気・時間別予報・週間予報へ表示します。パネルはCinnamonのゾーンアイコンサイズへ自動追従し、ポップアップ内のアイコンサイズは設定画面で変更できます。

地域設定は引き続き、都道府県と市区町村を選ぶだけで気象庁コード・予報エリア・緯度経度を自動設定します。

## alpha.1の目的

巨大化していた`applet.js`からデータ取得・解析・統合処理を分離し、今後の地域選択UIとSVG表示を安全に追加できる土台を作りました。

```text
applet.js
    ↓
WeatherService
    ├── JmaProvider
    └── OpenMeteoProvider
            ↓
      WeatherSnapshot
            ↓
      現行UI・通知処理
```

## ディレクトリ構成

```text
settings.py
├── tools/
│   └── location_catalog.py
├── data/
│   └── area-fallback.json
└── src/
    ├── models/
    │   └── weatherData.js
    ├── providers/
    │   ├── jmaProvider.js
    │   └── openMeteoProvider.js
    ├── services/
    │   ├── httpClient.js
    │   ├── iconService.js
    │   ├── locationService.js
    │   └── weatherService.js
    └── utils/
        └── weatherUtils.js
icons/
└── *.svg
```

## 現在の機能

- 気象庁の公式JSONによる今日・週間予報
- Open-Meteoによる現在値・時間別予報・UV・体感温度・風速
- 3～12時間分の時間別表示
- 雨・高温・UV通知
- API片方の取得に失敗した場合、もう片方と前回成功データを維持
- 都道府県・市区町村の連動選択
- 気象庁コード・予報エリア・緯度経度の自動設定
- 緯度経度の任意手動上書き
- 設定画面起動の互換フォールバック
- 同梱SVGによるパネル・現在・時間別・週間予報アイコン
- SVG欠損時のテーマアイコンフォールバック
- 現在天気・予報アイコンサイズ設定

## v3.0.0予定

- `alpha.2`: 都道府県・市区町村選択、座標自動設定、手動座標上書き、v2設定移行
- `alpha.3`: パネル・現在・時間別・週間予報のSVG表示（実装済み）
- `beta.1`: キャッシュ、更新競合防止、通知Service化、部分障害表示
- `rc.1`: 複数Cinnamon環境での互換性確認と移行ガイド

## インストール

```bash
unzip jma-weather-widget-for-cinnamon-v3.0.0-alpha.3-github-ready.zip
cd jma-weather-widget-for-cinnamon-v3.0.0-alpha.3-github
./install.sh
```

X11ではCinnamonを再読み込みします。

```text
Alt+F2
r
Enter
```

古いコードが残る場合は、パネルからアプレットを一度外して再追加してください。

## 開発時チェック

```bash
./test.sh
```

実行内容:

- 全JavaScriptファイルの構文検査
- JSON検査
- Provider・WeatherSnapshotのスモークテスト
- SVG XML検査とIconServiceマッピングテスト
- 地域カタログ解析のスモークテスト
- Python設定画面の構文検査

## データソース

- 今日・週間予報: 気象庁
- 現在値・時間別予報・UV: Open-Meteo

## ログ確認

```text
Alt+F2 → lg → Enter
```

または:

```bash
journalctl --user -f | grep -i jma-weather
```

## License

MIT
