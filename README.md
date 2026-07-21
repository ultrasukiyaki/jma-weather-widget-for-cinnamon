# JMA Weather Widget for Cinnamon 3.0.0

気象庁の公式予報とOpen-Meteoの補助データを表示する、日本向けCinnamon天気アプレットです。

![天気ポップアップ](./screenshot_01.png)
![地域設定画面](./screenshot_02.png)

> **正式版:** `3.0.0`では、Provider構成、都道府県・市区町村選択、SVGアイコン、永続キャッシュ、API部分障害時の継続表示、更新競合防止を統合しました。

## v3.0.0の主な変更

最後に正常取得できたJMA／Open-Meteoデータをインスタンス・地域単位で保存し、Cinnamon再読み込み直後や一時的な通信障害時にも前回データを表示します。キャッシュは24時間で期限切れとなり、破損時は自動破棄されます。

Providerの片側だけ失敗した場合は、新しい側と前回成功した側を併用し、ポップアップとツールチップへ「一部は前回取得データ」と明示します。通信中に設定変更・タイマー・手動更新が重なった場合は、古い応答を破棄して最後の要求だけを反映します。

地域設定は都道府県と市区町村を選ぶだけで、気象庁コード・予報エリア・緯度経度を自動設定できます。緯度経度は必要に応じて手動上書きできます。

## v3アーキテクチャ

巨大化していた`applet.js`から、データ取得・解析・統合処理をProvider／Service／Modelへ分離しました。

```text
applet.js
    ↓
WeatherService
    ├── JmaProvider
    └── OpenMeteoProvider
            ↓
      WeatherSnapshot
            ↓
      Cinnamon UI・通知処理
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
    │   ├── cacheService.js
    │   ├── httpClient.js
    │   ├── iconService.js
    │   ├── locationService.js
    │   └── weatherService.js
    └── utils/
        └── weatherUtils.js
icons/
└── *.svg
```

## 機能

- 気象庁の公式JSONによる今日・週間予報
- Open-Meteoによる現在値・時間別予報・UV・体感温度・風速
- 3～12時間分の時間別表示
- 雨・高温・UV通知
- API片方の取得に失敗した場合、もう片方と前回成功データを維持
- last-goodデータの永続キャッシュと起動時即時復元
- Providerごとの鮮度表示とキャッシュのみ状態での通知抑制
- 更新世代管理による多重通信・古い応答の反映防止
- timeout・HTTP・JSON・通信・解析エラー分類
- 都道府県・市区町村の連動選択
- 気象庁コード・予報エリア・緯度経度の自動設定
- 緯度経度の任意手動上書き
- 設定画面起動の互換フォールバック
- 同梱SVGによるパネル・現在・時間別・週間予報アイコン
- SVG欠損時のテーマアイコンフォールバック
- 現在天気・予報アイコンサイズ設定

## インストール

```bash
unzip jma-weather-widget-for-cinnamon-v3.0.0-github-ready.zip
cd jma-weather-widget-for-cinnamon-v3.0.0-github
./install.sh
```

X11ではCinnamonを再読み込みします。

```text
Alt+F2
r
Enter
```

古いコードが残る場合は、パネルからアプレットを一度外して再追加してください。

## beta.1からの更新

上書きアップグレードZIPをリポジトリまたは展開済みbeta.1へ重ね、テスト後に再インストールします。

```bash
unzip jma-weather-widget-v3.0.0-upgrade-from-beta.1.zip -d /path/to/jma-weather-widget-for-cinnamon
cd /path/to/jma-weather-widget-for-cinnamon
./test.sh
./install.sh
```

## キャッシュ保存先

```text
~/.cache/jma-weather@10yendama.com/weather-<instance-id>.json
```

`XDG_CACHE_HOME`が設定されている場合は、その配下へ保存されます。

## 開発時チェック

```bash
./test.sh
```

実行内容:

- 全JavaScriptファイルの構文検査
- JSON検査
- Provider・WeatherSnapshotのスモークテスト
- CacheServiceの保存・復元・期限切れ・破損キャッシュテスト
- Provider部分障害・全障害のレジリエンステスト
- 更新世代管理とエラー分類の静的検査
- SVG XML検査とIconServiceマッピングテスト
- 地域カタログ解析のスモークテスト
- Python設定画面の構文検査
- 正式版バージョン表記の整合性検査

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
