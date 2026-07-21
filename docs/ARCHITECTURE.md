# v3 Architecture

## 方針

`applet.js`がAPI仕様・パース・統合・表示をすべて抱えないように、責務を分離します。

## レイヤー

### Provider

外部API固有のURL生成とレスポンス解析を担当します。

- `JmaProvider`: 気象庁府県予報区JSON
- `OpenMeteoProvider`: 緯度経度ベースの現在・時間別・日別データ

ProviderはCinnamon UIを直接操作しません。

### Service

- `HttpClient`: JSON HTTP通信
- `WeatherService`: 2 Providerの並列取得、部分失敗処理、前回成功値の維持

### Model

`WeatherSnapshot`がJMAとOpen-Meteoの結果を保持し、以下を提供します。

- 今日の最低・最高気温・降水確率の決定
- 週間予報のマージ
- 最終更新時刻
- エラー一覧

### Applet/UI

`applet.js`は以下を担当します。

- Cinnamon設定との接続
- メニュー構築
- WeatherServiceの呼び出し
- 表示整形
- 通知判定
- ライフサイクル管理

## alpha.1で意図的に残しているもの

表示RendererとNotificationServiceはまだ分離していません。alpha.1ではデータ取得経路の変更だけを先に検証し、表示差分を最小化するためです。

## 次段階

1. `LocationService`と地域マスタ
2. 設定移行Service
3. SVG `IconService`とUI Renderer
4. CacheServiceと更新排他
5. NotificationService

## Location settings (alpha.2)

`settings.py` resolves a user-facing prefecture/municipality selection into the existing
provider inputs. `LocationService` validates and converts those stored values before
passing them to `WeatherService`.

```text
Prefecture / municipality
        ↓
JMA area catalog + Open-Meteo geocoding
        ↓
Cinnamon settings JSON
        ↓
LocationService
        ├── JMA provider config
        └── Open-Meteo provider config
```
