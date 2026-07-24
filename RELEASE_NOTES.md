# JMA Weather Japan v3.2.0

v3.2.0は、Open-Meteoの地点推定と気象庁の地域予報を画面・モデル上で分離し、異なる時間・空間粒度の値が矛盾して見える問題を改善するリリースです。

## データソースの役割

- 現在の推定天気、現在気温、体感温度、降水量、風: Open-Meteo Current
- 時間別アイコン、気温、降水確率、降水量、風、UV: 同じOpen-Meteo Hourlyレコード
- 今日・明日の地域天気、風概況、時間帯降水確率、週間予報: 気象庁

現在欄は「現在の天気（推定）」と表示します。Open-Meteoが利用できずJMAだけを表示する場合は「地域予報（Open-Meteo取得不可）」と明示し、JMA日次予報を現在推定値として扱いません。

## 降水表示

雨アイコンはOpen-Meteo weather codeを優先し、`precipitation`、`rain`、`showers`のいずれかが正値の場合も降水系として表示します。降水確率だけでは雨アイコンへ変更しません。

時間別行には降水確率と1時間降水量を併記します。気象庁の降水確率は各時間へ複製せず、元の時間帯単位で地域予報欄へ表示します。

## Provider・時刻・鮮度

- Open-Meteo Currentの有効時刻
- 気象庁の発表時刻
- Providerごとの`fresh` / `previous` / `cache` / `missing`
- キャッシュ保存時刻

実際にProviderから得られた時刻だけを表示します。

## v3.1.1からの更新

```bash
unzip jma-weather-widget-v3.2.0-upgrade-from-v3.1.1.zip -d /path/to/jma-weather-widget-for-cinnamon
cd /path/to/jma-weather-widget-for-cinnamon
./install.sh
```

設定キー、UUID、インスタンスID、キャッシュschema、保存パスは変更していません。v3.1.1の設定と有効なlast-goodキャッシュを引き継ぎます。古いキャッシュに新規表示フィールドがない場合も安全に欠損表示します。

通常利用に単体の`gjs` CLIは不要です。開発・CIの完全なテストでのみ使用します。

## 自動確認

- [x] 高い降水確率と0 mmで晴れ・曇りアイコンを維持
- [x] weather codeまたは正の降水量で降水系アイコンを表示
- [x] null、undefined、負値、NaNを安全に処理
- [x] 時間別表示を単一Open-Meteoレコードから構築
- [x] JMA時間帯降水確率と発表時刻を保持
- [x] 未整列、重複、不正日時、midnight rollover
- [x] Provider部分障害、previous/cache、期限切れ・破損キャッシュ
- [x] UUID、設定schema、キャッシュschemaの互換性

## 実機で確認が必要な項目

- [ ] Cinnamonへ追加し、現在・時間別・地域・週間の各欄が表示される
- [ ] パネルのアイコンと降水確率が同じ時間別行に一致する
- [ ] ポップアップ幅で時間別の降水量・風向表示が欠けない
- [ ] オフライン時の継続表示と復旧後のfresh更新
- [ ] 地域・座標設定、雨・高温・UV通知
- [ ] 複数インスタンスと日付変更前後の動作

## 対応環境

Target: Cinnamon desktop environment on Linux

Tested baseline: Linux Mint / Cinnamon 6.6 / GJS 1.80 / X11

---

# JMA Weather Japan v3.1.1

v3.1.1は、公開済みv3.1.0を基に設定画面の起動互換性とクリーンインストール内容を修正するパッチリリースです。

## 修正内容

- Cinnamonから設定画面を起動するとき、ディストリビューションの`/usr/bin/python3`を明示的に使用します
- pyenvなどのユーザー管理PythonにGTK用PyGObjectが入っていない環境でも、システム側のGTK環境で設定画面を起動できます
- `settings.py`のshebangも`#!/usr/bin/python3`へ統一しました
- `install.sh`が設定画面に必要な`tools/location_catalog.py`を配置するよう修正しました
- 開発専用の`tools/build-release.sh`はCinnamonアプレットのインストール先へ含めません
- 現在時間に同期したパネル表示を示す`screenshot_01.png`を次期リリース向けに更新しました

設定キー、UUID、インスタンスID、キャッシュschema、保存パスは変更していません。v3.1.0の設定と有効なキャッシュをそのまま引き継ぎます。削除必須ファイルはありません。

## v3.1.0からの更新

```bash
unzip jma-weather-widget-v3.1.1-upgrade-from-v3.1.0.zip -d /path/to/jma-weather-widget-for-cinnamon
cd /path/to/jma-weather-widget-for-cinnamon
./install.sh
```

patchを使用する場合は、v3.1.0のツリー直下でGit binary patchを適用します。

```bash
git apply -p1 /path/to/v3.1.0-to-v3.1.1.patch
```

## 現在の検証状況

- [x] システムPythonでPyGObject／GTKと設定モジュールを読み込める
- [x] 設定画面の起動コマンドが`/usr/bin/python3`を使用する
- [x] インストール後の`settings.py`が実行可能で、システムPythonのshebangを保持する
- [x] インストール後に`location_catalog`をシステムPythonでimportできる
- [x] インストール済み`settings.py`がクリーンなデスクトップ環境でGTK画面を起動できる
- [x] 全自動テスト
- [x] `git diff --check`
- [ ] 修正版をCinnamonへ再インストール後、アプレットの「設定」から画面が開く
- [ ] 設定保存後にウィンドウが閉じ、パネル表示へ反映される

## 対応環境

Target: Cinnamon desktop environment on Linux

Tested baseline: Linux Mint / Cinnamon 6.6 / GJS 1.80 / X11

---

# JMA Weather Japan v3.1.0

v3.1.0は、Cinnamonパネルの天気アイコンと降水確率を、現在時刻に対応する同じ時間別予報へ同期するマイナーリリースです。追跡Issueは[#11](https://github.com/ultrasukiyaki/jma-weather-widget-for-cinnamon/issues/11)です。

## パネル表示

- 天気アイコンは現在時刻に対応するOpen-Meteo時間別予報を使用します
- 降水確率は天気アイコンと同じ時間別レコードを使用します
- 気温は従来どおりOpen-Meteoの現在気温を使用し、時間別の予想気温では上書きしません
- 高温警告は当日の最高気温と設定閾値を引き続き使用します
- 雨・高温・UV通知とポップアップ表示の仕様は変更しません

時間別レコードはAsia/Tokyoとして日時を解析し、現在以前で最も新しい行を選びます。過去行がない場合は最初の未来行を選びます。未整列、重複、不正・欠損日時を安全に処理し、現在から遠すぎる行は使用しません。

## フォールバックと障害時の動作

有効な時間別行がない場合、パネルアイコンはOpen-Meteoの現在天気、次にJMAの日次天気へフォールバックします。パネル降水確率は既存の日次予報へフォールバックします。

Provider片側障害時は成功したProviderとpreviousデータを併用します。起動時の有効なlast-goodキャッシュも利用でき、`fresh`、`previous`、`cache`、`missing`の状態と古いデータの警告表示を維持します。地域署名が異なるキャッシュ、破損キャッシュ、24時間を超えたデータは復元しません。

## v3.0.1からの更新

```bash
unzip jma-weather-widget-v3.1.0-upgrade-from-v3.0.1.zip -d /path/to/jma-weather-widget-for-cinnamon
cd /path/to/jma-weather-widget-for-cinnamon
./install.sh
```

設定キー、UUID、インスタンスID、キャッシュschemaと保存パスは変更していません。v3.0.1の設定と有効なキャッシュを引き継ぎます。アップグレードZIPはファイルを上書きしますが、ファイルを削除することはできません。v3.1.0に削除必須の実行ファイルはありません。

一般利用では単体の`gjs` CLIは不要です。開発者向けの完全な自動テストには`gjs` CLIが必要です。

## 対応・動作確認環境

Target: Cinnamon desktop environment on Linux

Tested on: Linux Mint / Cinnamon 6.6 / GJS 1.80 / X11

自動テストに加え、利用者によるローカル再インストール後のCinnamon実機確認を実施しました。

## 自動テスト

- JavaScript、Python、JSON、SVGの構文・形式検査
- Provider、WeatherSnapshot、CacheService、IconService、LocationServiceのスモークテスト
- 現在時間選択、日付変更、重複・不正日時、Asia/Tokyo、距離制限のResolverテスト
- Provider部分障害、全障害、previous/cache継続表示テスト
- GJSモジュール読み込み、隔離HOMEでのインストールテスト
- GitHub-ready ZIP展開後テスト
- v3.0.1へのupgrade ZIPおよびpatch適用比較
- SHA256照合

## 手動確認チェックリスト

以下は利用者がローカル環境へ再インストール後に確認済みです。

- [x] Cinnamonへアプレットを追加できる
- [x] 起動直後にパネル表示が出る
- [x] パネルのアイコンと降水確率が現在時間の同じ時間別行と一致する
- [x] パネルの現在気温が従来どおり表示される
- [x] ポップアップの現在天気、時間別予報、週間予報が表示される
- [x] 都道府県・市区町村変更と緯度経度手動指定が動く
- [x] 手動更新と自動更新が動く
- [x] 雨・高温・UV通知が動く
- [x] Cinnamon再起動後にキャッシュが復元される
- [x] オフライン時に前回データが表示され、復旧後にfreshへ戻る
- [x] 日付変更前後にパネル表示が正しく切り替わる
- [x] 設定変更中に古い応答で表示が巻き戻らない
- [x] 複数インスタンスのキャッシュが混在しない

## 既知の制約

- UIはLinux上のCinnamon desktop environmentでのみ利用できます
- Waylandではアプレット再読み込みにログアウト／ログインが必要な場合があります
- 時間別予報が現在から遠すぎる場合は、短時間予報として扱わず現在天気へフォールバックします
- Provider通信が長時間利用できずキャッシュが24時間を超えると、期限切れとして使用しません

---

# JMA Weather Japan v3.0.1

v3.0.1は、v3.0.0の天気表示機能と互換性を維持しながら、導入性、保守性、公式配布準備を改善するパッチリリースです。

## 主な変更

- 一般ユーザーが通常利用する際、単体の`gjs` CLIを追加導入する必要がなくなりました
- `install.sh`はCinnamonアプレットの実行に必要なファイルだけを配置します
- 開発者テストではGJS互換性の確認に`gjs` CLIを使用します
- CIで`gjs`が不足している場合は、必須テストを黙ってスキップせず失敗します
- Cinnamon Spicesでの将来配布を意識し、利用者向け説明と配布内容を整理しました

## v3.0.0からの更新

```bash
unzip jma-weather-widget-v3.0.1-upgrade-from-v3.0.0.zip -d /path/to/jma-weather-widget-for-cinnamon
cd /path/to/jma-weather-widget-for-cinnamon
./install.sh
```

X11ではインストール後に`Alt+F2`、`r`、`Enter`でCinnamonを再読み込みしてください。古い表示が残る場合は、パネルからアプレットを一度外して再追加します。

設定キー、インスタンスID、キャッシュschemaは変更していません。v3.0.0の設定と、`~/.cache/jma-weather@10yendama.com/`にあるlast-goodキャッシュは引き継がれます。

## 開発者向けテスト

通常利用には不要ですが、完全な開発者テストには`gjs`が必要です。

Ubuntu / Linux Mint:

```bash
sudo apt install gjs
./test.sh
```

## 動作確認環境

- Linux Mint
- Cinnamon 6.6
- GJS 1.80
- X11

## 既知の制約

- Cinnamonデスクトップ上でのみアプレットUIを利用できます
- X11ではCinnamonをその場で再読み込みできますが、Waylandではログアウト／ログインが必要になる場合があります
- 気象庁およびOpen-Meteoへの通信が長時間利用できない場合、24時間を超えたキャッシュは期限切れになります
- アップグレードZIPはファイルを上書きしますが、将来削除対象が生じた場合に古いファイルを削除することはできません。v3.0.1では削除必須の実行ファイルはありません

## 手動確認チェックリスト

以下はCinnamon実機での確認が必要であり、このリリース準備時点では未確認です。

- [ ] Cinnamon起動
- [ ] アプレット追加
- [ ] 現在天気表示
- [ ] 時間別予報
- [ ] 週間予報
- [ ] 設定画面
- [ ] 都道府県／市区町村選択
- [ ] 雨・高温・UV通知
- [ ] 手動更新
- [ ] Cinnamon再起動後のキャッシュ復元
- [ ] オフライン時の前回取得表示
- [ ] オンライン復旧後の再取得

---

# JMA Weather Japan v3.0.0

v3.0.0は、気象庁の公式予報とOpen-Meteoの補助データをProvider構成で統合した正式版です。地域選択、SVGアイコン、永続キャッシュ、API部分障害時の継続表示、更新競合防止をひとつの安定版へまとめました。

## 主な変更

- `JmaProvider`／`OpenMeteoProvider`／`WeatherService`／`WeatherSnapshot`への責務分離
- 都道府県・市区町村の連動選択
- 気象庁予報区・気温地点・緯度経度の自動解決
- 緯度経度の任意手動上書き
- パネル、現在天気、時間別、週間予報の同梱SVG表示
- last-goodデータの永続キャッシュと起動時即時復元
- JMAまたはOpen-Meteo片側障害時の継続表示
- `fresh`／`previous`／`cache`／`missing`の状態管理
- 更新世代管理による多重通信と古い応答の反映防止
- キャッシュのみ状態での雨・高温・UV通知抑制

## v3.0.0の互換性

設定と既存キャッシュは旧版から引き継がれます。キャッシュはインスタンス・地域単位で保存され、安全期限は24時間です。地域設定が変わった場合、異なる地域のキャッシュは復元されません。破損・期限切れキャッシュは自動的に破棄されます。
