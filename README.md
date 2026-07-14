# JMA Weather Widget for Cinnamon 2.0

Linux Cinnamonデスクトップシステム向けの日本用天気アプレットです。

<img width="747" height="460" alt="screenshot" src="https://github.com/user-attachments/assets/49827baa-b9f9-40e3-9c80-1f62d137aeeb" />


## v2.0の主な機能

- 気象庁の公式JSONによる今日・週間予報
- 現在気温・体感温度
- 3～12時間分の時間別予報
- 時間別降水確率
- UV指数
- 雨予報通知
- 高温通知
- UV通知
- tenki.jpなどの詳細ページを開く
- 雨雲レーダーを開く
- 緯度・経度による全国設定
- パネル表示3モード

## データソース

- 今日・週間予報：気象庁
- 現在値・時間別予報・UV：Open-Meteo

気象庁の市区町村単位の短時間予報APIが一般公開されていないため、
時間別表示は緯度・経度ベースの補助データを利用しています。

## インストール

```bash
unzip jma-weather-widget-for-cinnamon-v2.0.0.zip
cd jma-weather-widget-for-cinnamon-v2.0.0
./install.sh
```

X11ならCinnamonを再読み込みします。

```text
Alt+F2
r
Enter
```

古い画面が残る場合は、パネルからアプレットを一度外して再追加してください。

## 府中市の初期設定

- 表示地域名：府中市
- 気象庁コード：130000
- 予報エリア：東京地方
- 気温地点：東京
- 緯度：35.6689
- 経度：139.4777

## 注意

高温通知は公式の熱中症警戒アラートではなく、
設定した予想最高気温しきい値による簡易通知です。

時間別予報とUVは気象庁データではなく、Open-Meteoの補助情報です。

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

![License](https://img.shields.io/github/license/ultrasukiyaki/jma-weather-widget-for-cinnamon)
![GitHub release](https://img.shields.io/github/v/release/ultrasukiyaki/jma-weather-widget-for-cinnamon)
