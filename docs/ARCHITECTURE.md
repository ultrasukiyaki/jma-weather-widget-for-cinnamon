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

- `HttpClient`: JSON HTTP通信とtimeout・HTTP・JSON・通信エラー分類
- `WeatherService`: 2 Providerの並列取得、部分失敗処理、前回成功値の維持
- `LocationService`: 地域設定の検証とProvider入力への変換
- `IconService`: Provider固有コードから同梱SVGへの正規化
- `CacheService`: インスタンス・地域単位のlast-goodデータ永続化

### Model

`WeatherSnapshot`がJMAとOpen-Meteoの結果を保持し、以下を提供します。

- 今日の最低・最高気温・降水確率の決定
- 週間予報のマージ
- Providerごとの`fresh` / `previous` / `cache` / `missing`状態
- 最終更新時刻
- エラー一覧

### Applet/UI

`applet.js`は以下を担当します。

- Cinnamon設定との接続
- メニュー構築
- WeatherServiceの呼び出し
- 表示整形
- 通知判定
- 更新世代管理とライフサイクル管理

表示Rendererと通知判定はv3.0.0時点では`applet.js`に残しています。外部API固有処理はProvider／Serviceへ分離されているため、今後のUI・通知リファクタリングはデータ取得経路へ影響せず進められます。

## v3.0.0実装範囲

1. Provider／WeatherService／WeatherSnapshot分離
2. `LocationService`と地域マスタ、既存設定からの移行
3. SVG `IconService`と各予報表示
4. `CacheService`と更新排他、Provider部分障害時の継続表示
5. timeout・HTTP・JSON・通信・解析エラーの分類
6. キャッシュのみ状態での通知抑制

## Location settings

`settings.py`は、都道府県・市区町村の選択を既存Provider入力へ変換します。`LocationService`は保存値を検証し、`WeatherService`へ渡します。

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

## SVG icon pipeline

`IconService`はProvider固有の天気コードを、同梱する少数の安定したアイコン名へ変換します。Service自体にCinnamon依存はなく、Nodeスモークテストの対象です。

```text
JMA / Open-Meteo weather code
        ↓
IconService
        ↓
icons/*.svg
        ├── TextIconApplet panel icon
        ├── current weather view
        ├── hourly rows
        └── weekly rows
```

パネルアイコンはCinnamonの`set_applet_icon_path()`を使用するため、パネル領域のサイズとHiDPIスケーリングはCinnamonが管理します。ポップアップではファイルベースの`Gio.FileIcon`を使用し、SVG欠損時はテーマの`weather-overcast-symbolic`へフォールバックします。

## Cache and refresh resilience

`CacheService`は、少なくとも一方のProviderを新規取得できたスナップショットだけを保存します。キャッシュはCinnamonアプレットのインスタンス単位で分離し、Provider設定シグネチャで保護するため、以前の市区町村データが新しい地域へ復元されることはありません。

```text
Applet startup
    ↓
CacheService.load(config signature)
    ├── valid and <= 24h → WeatherSnapshot.fromCache()
    ├── location mismatch → ignore
    └── corrupt / expired → remove and continue
```

`WeatherSnapshot`は各Providerを`fresh`、`previous`、`cache`、`missing`として追跡します。`WeatherService`は前回スナップショットから開始し、成功したProviderを個別に置換します。一方が失敗しても、もう一方を破棄しません。

更新要求は`applet.js`で直列化します。各要求で世代番号を更新し、通信中のタイマー・設定変更・手動更新は最後の1要求へ集約します。古い世代の応答は破棄し、最新設定だけを次に取得します。

キャッシュのみのデータでは雨・高温・UV通知を発火しません。部分更新では、その世代で新規取得できたProviderに基づく通知だけを許可します。
