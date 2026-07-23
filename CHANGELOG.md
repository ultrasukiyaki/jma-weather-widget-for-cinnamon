# Changelog

## [3.0.1] - 2026-07-23

### Changed

- 一般ユーザー向けインストールから単体の`gjs` CLI依存を分離
- `install.sh`の配置対象をCinnamonアプレットの実行ファイルに限定
- 既存インストールを復元可能な一時配置・置換方式へ変更
- 開発者向けの`gjs`導入方法とLinux上のCinnamon対応範囲を明記

### Tests

- GJSによるレガシーモジュール読み込みスモークテストを追加
- `gjs`の有無とCI環境での依存判定テストを追加
- 一時HOMEを使ったインストール内容とパッケージマネージャー非実行テストを追加

### Compatibility

- v3.0.0の設定キー、インスタンスID、キャッシュschema、Provider構成を維持

## [3.0.0] - 2026-07-21

### Added

- 気象庁／Open-Meteoを分離したProvider・Service・Model構成
- 都道府県・市区町村選択と気象庁コード・座標の自動解決
- パネル・現在・時間別・週間予報の同梱SVGアイコン
- インスタンス・地域単位の永続last-goodキャッシュ
- Providerごとの`fresh` / `previous` / `cache` / `missing`状態管理
- timeout・HTTP・JSON・通信・解析エラー分類
- Provider・キャッシュ・地域設定・SVGを対象とした自動試験

### Changed

- `applet.js`から外部API取得・解析・統合処理を分離
- API片側障害時は新しいProviderと前回成功データを併用
- 更新要求を直列化し、古い非同期応答を破棄
- キャッシュのみの状態では雨・高温・UV通知を抑制
- 外部GTK設定画面から地域・座標・アイコンサイズを設定

### Fixed

- 地域変更時に旧地域データや旧座標が混在する問題
- Cinnamon再読み込み直後や一時的な通信障害で空表示になる問題
- 設定保存・タイマー・手動更新の競合による表示巻き戻り
- 破損・期限切れキャッシュが起動へ影響する問題

### Release

- `3.0.0-beta.1`の実機動作確認を完了し、正式版へ昇格

## [3.0.0-beta.1] - 2026-07-21

### Added

- インスタンス・地域単位の永続last-goodキャッシュ`CacheService`
- 起動時のキャッシュ即時復元と24時間の安全期限
- Providerごとの`fresh` / `previous` / `cache` / `missing`状態管理
- 「前回取得データ」「一部は前回取得データ」のポップアップ・ツールチップ表示
- timeout・HTTP・JSON・通信・Provider解析エラーの分類
- キャッシュ正常・地域不一致・期限切れ・破損時のスモークテスト
- Provider部分障害と全障害のレジリエンステスト

### Changed

- 更新処理を世代管理し、通信中の設定変更・タイマー・手動更新を最後の1要求へ集約
- 古い世代の非同期応答をUIへ反映しないよう変更
- 片方のProviderだけ更新できた場合、新しいProvider値を古いProvider値より優先
- キャッシュ／前回値だけの状態では通知を送信しないよう変更

### Fixed

- 地域変更時に旧地域のProviderデータが混在する可能性を解消
- 破損キャッシュがアプレット起動を妨げないよう自動破棄

## [3.0.0-alpha.3] - 2026-07-21

### Added

- 天気コードを同梱SVGへ変換する`IconService`
- パネル・現在天気・時間別予報・週間予報のSVG表示
- 昼夜・晴れ・曇り・霧・雨・雪・雷など14種類のSVGアイコン
- 現在天気と時間別・週間予報のアイコンサイズ設定
- SVG XML検査とアイコンマッピングのスモークテスト

### Changed

- パネル本体を`TextApplet`から`TextIconApplet`へ移行
- パネルラベルから天気絵文字を外し、SVGアイコンと数値表示を分離
- ポップアップ予報をSVG付きの行UIへ変更

### Fixed

- SVGファイルを読めない場合はテーマの天気アイコンへフォールバック

## [3.0.0-alpha.2.4] - 2026-07-21

### Fixed

- 十勝地方（014030）と奄美地方（460040）の気象庁JSON取得先を代表コードへ補正
- 市区町村変更時に以前の気温地点・座標が残る問題を修正
- Open-Meteoの座標検索に市区町村名の接尾辞除去と気温地点名を追加
- 設定保存中の非同期地域検索との競合を防止
- Cinnamon側で設定ファイルを監視し、再起動なしで確実に反映
- 設定保存時の同期D-Bus呼び出しを廃止し、保存後に必ず画面を閉じる
- 複数キー更新時のProvider再取得をデバウンス

## [3.0.0-alpha.2.3] - 2026-07-21

### Fixed

- 設定保存後、CinnamonのD-Bus再読込結果にかかわらず設定画面を閉じるよう修正
- 設定ファイルの保存成功と、任意の即時再読込通知を分離
- 保存ボタンの回帰テストを追加

## [3.0.0-alpha.2.2] - 2026-07-21

### Fixed

- 外部設定画面が旧`~/.cinnamon/configs`へ書き込み、実行中アプレットが参照する設定とずれる問題を修正
- Cinnamonと同じ`~/.config/cinnamon/spices`（`XDG_CONFIG_HOME`対応）を優先するよう修正
- 保存後にCinnamonへ設定再読込を通知し、地域変更を即時反映
- 旧設定パスのみ存在する環境では従来どおり旧ファイルを使用

## [3.0.0-alpha.2.1] - 2026-07-21

### Fixed

- アプレットメニューの「設定」が旧スキーマ画面を開く問題を修正
- `settings.py`をインスタンスID付きで直接起動し、失敗時のみ従来画面へフォールバック

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
