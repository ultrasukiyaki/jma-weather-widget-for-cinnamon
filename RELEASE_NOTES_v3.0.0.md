# JMA Weather Japan v3.0.0

JMA Weather Widget for Cinnamon v3の正式版です。

気象庁の公式予報とOpen-Meteoの補助データをProvider構成で統合し、地域選択、SVGアイコン、永続キャッシュ、API部分障害時の継続表示、更新競合防止をひとつの安定版へまとめました。`3.0.0-beta.1`の実機動作確認を経て、コード機能を変更せず正式版へ昇格しています。

## 主な変更

- `JmaProvider`／`OpenMeteoProvider`／`WeatherService`／`WeatherSnapshot`への責務分離
- 都道府県・市区町村の連動選択
- 気象庁予報区・気温地点・緯度経度の自動解決
- 緯度経度の任意手動上書き
- パネル、現在天気、時間別、週間予報の同梱SVG表示
- last-goodデータの永続キャッシュと起動時即時復元
- JMAまたはOpen-Meteo片側障害時の継続表示
- 「前回取得データ」「一部は前回取得データ」の鮮度表示
- 更新世代管理による多重通信と古い応答の反映防止
- timeout／HTTP／JSON／通信／解析エラー分類
- キャッシュのみ状態での雨・高温・UV通知抑制
- Provider、キャッシュ、SVG、地域設定の自動試験

## beta.1からの更新

正式版はbeta.1の機能をそのまま昇格したリリースです。設定と既存キャッシュは引き継がれます。

```bash
unzip jma-weather-widget-v3.0.0-upgrade-from-beta.1.zip -d /path/to/jma-weather-widget-for-cinnamon
cd /path/to/jma-weather-widget-for-cinnamon
./test.sh
./install.sh
```

X11ではインストール後に`Alt+F2`、`r`、`Enter`でCinnamonを再読み込みしてください。古い表示が残る場合は、パネルからアプレットを一度外して再追加します。

## キャッシュ保存先

```text
~/.cache/jma-weather@10yendama.com/weather-<instance-id>.json
```

キャッシュの安全期限は24時間です。地域設定が変わった場合、異なる地域のキャッシュは復元されません。破損・期限切れキャッシュは自動的に破棄されます。

## 対応環境

- Cinnamon 6.6系
- Linux Mint Cinnamon実機で動作確認済み

## データソース

- 今日・週間予報: 気象庁
- 現在値・時間別予報・UV: Open-Meteo

## 検証

`./test.sh`でJavaScript／Python／JSON／SVGの静的検査と、Provider・CacheService・WeatherService・地域設定のスモークテストを実行できます。
