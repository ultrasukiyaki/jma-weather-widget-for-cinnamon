# Changelog

## [3.0.0-alpha.1.1] - 2026-07-21

### Fixed

- Cinnamonに存在しない`imports.ui.extension.getCurrentExtension()`を削除
- `metadata.path`と`imports.searchPath`を使うCJS互換ローダーへ変更
- Provider/Service分割後のアプレット起動時クラッシュを修正
- `test.sh`へCinnamon非互換importの静的検査を追加

## [3.0.0-alpha.1] - 2026-07-21

### Added

- `JmaProvider`と`OpenMeteoProvider`
- Providerを統合する`WeatherService`
- Provider共通の`WeatherSnapshot`モデル
- 独立した`HttpClient`と天気ユーティリティ
- Provider・モデルのNodeスモークテスト
- v3アーキテクチャ資料

### Changed

- `applet.js`をUI・設定・通知の制御中心に縮小
- API障害時は前回成功したProviderデータを維持
- バージョンを`3.0.0-alpha.1`へ更新

### Fixed

- `configureApplet()`優先＋外部コマンドフォールバックによる設定画面起動修正を本体へ統合

## [2.1.0] - 2026-07-19

### Added

- UV指数の強さを日本語ラベルで表示
- 体感温度の説明を追加
- 現在および時間別の風速表示
- 最終更新時刻の表示

### Changed

- 雨通知を6時間以内の予報に絞り、通知内容を具体化
- 同一予報時刻に対する重複通知を抑制


## 2.0.1

- 当日の最低・最高気温を時刻対応で解析し、同値になる問題を修正
- Open-Meteoの日別最低・最高気温を補助データとして追加
- 週間予報を日付でマージし、先頭行が `--/--℃` になる問題を修正
- 気象庁の天気・降水確率を優先しつつ、欠損値を日別予報で補完
- 設定画面を `cinnamon-settings applets` から開く方式へ変更
- 設定画面を直接開けない場合のフォールバックと通知を追加

## 2.0.0

- 現在気温・体感温度を追加
- 3～12時間の時間別予報を追加
- 時間別降水確率を追加
- UV指数を追加
- 雨雲レーダーリンクを追加
- 雨・高温・UV通知を追加
- 緯度・経度設定を追加
- ポップアップUIを今日・時間別・週間に整理
- 外部データ取得を共通化
- エラー処理と通知の重複防止を改善

## 1.0.0

- 気象庁の今日・週間予報
- パネル表示3モード
- 雨通知
- 簡易暑さ警告
- 地域設定

## [3.0.0-alpha.2] - 2026-07-21

### Added
- External GTK3 settings application with prefecture and municipality selectors.
- Automatic JMA office/forecast-area resolution.
- Automatic coordinate lookup with optional manual override.
- LocationService and location catalog smoke tests.

### Changed
- Location settings now preserve legacy v2 values while supporting guided migration.
