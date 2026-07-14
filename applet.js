const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Settings = imports.ui.settings;

const ByteArray = imports.byteArray;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Soup = imports.gi.Soup;
const St = imports.gi.St;

const UUID = "jma-weather@10yendama.com";

function firstNonEmpty(values) {
    if (!values)
        return null;
    for (const value of values) {
        if (value !== null && value !== undefined && String(value).trim() !== "")
            return String(value);
    }
    return null;
}

function asNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "")
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function weatherIcon(code) {
    const n = Number(code);
    if (n >= 400) return "❄";
    if (n >= 300) return "🌧";
    if (n >= 200) return "☁";
    if (n >= 100) {
        const rainy = [102, 103, 106, 107, 108, 112, 113, 114, 118, 119,
            120, 121, 122, 125, 126, 127, 128, 130, 131, 132, 140,
            160, 170, 181].includes(n);
        const snowy = [104, 105, 115, 116, 117].includes(n);
        if (snowy) return "🌨";
        if (rainy) return "🌦";
        return "☀";
    }
    return "☁";
}

function weekdayLabel(isoString) {
    if (!isoString)
        return "--";
    const d = new Date(isoString);
    return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
}

class JmaWeatherApplet extends Applet.TextApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);

        this._metadata = metadata;
        this._instanceId = instanceId;
        this._timeoutId = 0;
        this._destroyed = false;
        this._cached = null;
        this._lastRainNotificationKey = null;
        this._lastHeatNotificationKey = null;

        this.set_applet_label("天気…");
        this.set_applet_tooltip("気象庁の予報を取得中…");

        this._settings = new Settings.AppletSettings(this, metadata.uuid, instanceId);
        const refresh = this._refresh.bind(this);
        const rerender = this._render.bind(this);

        this._settings.bind("office-code", "officeCode", refresh);
        this._settings.bind("forecast-area-name", "forecastAreaName", refresh);
        this._settings.bind("temperature-area-name", "temperatureAreaName", refresh);
        this._settings.bind("display-location-name", "displayLocationName", rerender);
        this._settings.bind("details-url", "detailsUrl");
        this._settings.bind("panel-mode", "panelMode", rerender);
        this._settings.bind("update-interval", "updateInterval", this._restartTimer.bind(this));
        this._settings.bind("rain-notification", "rainNotification");
        this._settings.bind("rain-threshold", "rainThreshold");
        this._settings.bind("heat-warning", "heatWarning", rerender);
        this._settings.bind("heat-threshold", "heatThreshold", rerender);

        this._menuManager = new PopupMenu.PopupMenuManager(this);
        this._menu = new Applet.AppletPopupMenu(this, orientation);
        this._menuManager.addMenu(this._menu);

        this._header = new PopupMenu.PopupMenuItem("予報を取得しています…", { reactive: false });
        this._header.label.add_style_class_name("jma-weather-title");
        this._menu.addMenuItem(this._header);

        this._alertItem = new PopupMenu.PopupMenuItem("", { reactive: false });
        this._alertItem.label.add_style_class_name("jma-weather-alert");
        this._menu.addMenuItem(this._alertItem);

        this._todayItem = new PopupMenu.PopupMenuItem("", { reactive: false });
        this._todayItem.label.clutter_text.set_line_wrap(true);
        this._menu.addMenuItem(this._todayItem);

        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._weekItems = [];
        for (let i = 0; i < 7; i++) {
            const item = new PopupMenu.PopupMenuItem("", { reactive: false });
            item.label.add_style_class_name("jma-weather-day");
            this._weekItems.push(item);
            this._menu.addMenuItem(item);
        }

        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const refreshItem = new PopupMenu.PopupMenuItem("今すぐ更新");
        refreshItem.connect("activate", () => this._refresh());
        this._menu.addMenuItem(refreshItem);

        const detailsItem = new PopupMenu.PopupMenuItem("詳しい1時間予報を開く");
        detailsItem.connect("activate", () => this._openDetails());
        this._menu.addMenuItem(detailsItem);

        const settingsItem = new PopupMenu.PopupMenuItem("設定を開く");
        settingsItem.connect("activate", () => this._settings.open());
        this._menu.addMenuItem(settingsItem);

        this._session = new Soup.Session({ user_agent: "Cinnamon-JMA-Weather/1.0" });
        this._session.timeout = 15;

        this._refresh();
        this._restartTimer();
    }

    on_applet_clicked() {
        this._menu.toggle();
    }

    _forecastUrl() {
        const code = String(this.officeCode || "130000").replace(/[^0-9]/g, "");
        return `https://www.jma.go.jp/bosai/forecast/data/forecast/${code}.json`;
    }

    _restartTimer() {
        if (this._timeoutId) {
            Mainloop.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        const minutes = Math.max(10, Number(this.updateInterval) || 30);
        this._timeoutId = Mainloop.timeout_add_seconds(minutes * 60, () => {
            this._refresh();
            return true;
        });
    }

    _refresh() {
        if (this._destroyed)
            return;

        this.set_applet_tooltip("気象庁から予報を取得中…");
        let message;
        try {
            message = Soup.Message.new("GET", this._forecastUrl());
        } catch (e) {
            this._showError(`リクエスト作成失敗: ${e.message}`);
            return;
        }

        this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null,
            (session, result) => {
                if (this._destroyed)
                    return;
                try {
                    const bytes = session.send_and_read_finish(result);
                    const status = message.get_status();
                    if (status < 200 || status >= 300)
                        throw new Error(`HTTP ${status}`);
                    const text = ByteArray.toString(bytes.get_data());
                    this._cached = this._parseForecast(JSON.parse(text));
                    this._render();
                    this._notifyIfNeeded();
                } catch (e) {
                    global.logError(`[${UUID}] ${e.stack || e}`);
                    this._showError(e.message);
                }
            });
    }

    _findArea(areas, preferredName) {
        if (!areas || !areas.length)
            return null;
        return areas.find(a => a.area?.name === preferredName) || areas[0];
    }

    _parseForecast(data) {
        if (!Array.isArray(data) || data.length === 0)
            throw new Error("気象庁JSONの形式が想定外です");

        const shortForecast = data[0];
        const weeklyForecast = data.length > 1 ? data[1] : null;
        const series = shortForecast.timeSeries || [];
        const weatherSeries = series[0] || {};
        const popSeries = series[1] || {};
        const tempSeries = series[2] || {};

        const weatherArea = this._findArea(weatherSeries.areas, this.forecastAreaName);
        const popArea = this._findArea(popSeries.areas, this.forecastAreaName);
        const tempArea = this._findArea(tempSeries.areas, this.temperatureAreaName);

        if (!weatherArea)
            throw new Error(`予報エリア「${this.forecastAreaName}」が見つかりません`);

        const weatherCode = firstNonEmpty(weatherArea.weatherCodes) || "000";
        const weatherText = firstNonEmpty(weatherArea.weathers) || "予報不明";
        const windText = firstNonEmpty(weatherArea.winds) || "";
        const temps = tempArea?.temps || [];
        const tempMin = temps.length >= 2 ? asNumber(temps[0]) : null;
        const tempMax = temps.length >= 2 ? asNumber(temps[1]) : asNumber(temps[0]);

        const pops = (popArea?.pops || []).map(asNumber).filter(v => v !== null);
        const maxPop = pops.length ? Math.max(...pops) : null;
        const popSlots = (popSeries.timeDefines || []).map((time, index) => ({
            time,
            pop: asNumber(popArea?.pops?.[index])
        })).filter(x => x.pop !== null);

        const weekly = this._parseWeekly(weeklyForecast);

        return {
            reportDatetime: shortForecast.reportDatetime || "",
            icon: weatherIcon(weatherCode),
            weatherCode,
            weatherText,
            windText,
            tempMin,
            tempMax,
            maxPop,
            popSlots,
            weekly,
            fetchedAt: new Date()
        };
    }

    _parseWeekly(weeklyForecast) {
        if (!weeklyForecast?.timeSeries?.length)
            return [];

        const weatherSeries = weeklyForecast.timeSeries[0] || {};
        const tempSeries = weeklyForecast.timeSeries[1] || {};
        const weatherArea = this._findArea(weatherSeries.areas, this.forecastAreaName);
        const tempArea = this._findArea(tempSeries.areas, this.temperatureAreaName);
        if (!weatherArea)
            return [];

        const times = weatherSeries.timeDefines || [];
        return times.slice(0, 7).map((time, i) => ({
            time,
            code: String(weatherArea.weatherCodes?.[i] || "000"),
            pop: asNumber(weatherArea.pops?.[i]),
            reliability: weatherArea.reliabilities?.[i] || "",
            tempMin: asNumber(tempArea?.tempsMin?.[i]),
            tempMax: asNumber(tempArea?.tempsMax?.[i])
        }));
    }

    _panelLabel(d) {
        const warning = this.heatWarning && d.tempMax !== null && d.tempMax >= Number(this.heatThreshold);
        const prefix = warning ? "🔥" : d.icon;
        if (this.panelMode === "icon")
            return prefix;
        if (this.panelMode === "compact")
            return d.tempMax !== null ? `${prefix}${d.tempMax}°` : `${prefix}`;
        let label = d.tempMax !== null ? `${prefix}${d.tempMax}°` : `${prefix}`;
        if (d.maxPop !== null)
            label += ` ☔${d.maxPop}%`;
        return label;
    }

    _render() {
        if (!this._cached)
            return;
        const d = this._cached;
        this.set_applet_label(this._panelLabel(d));

        const location = this.displayLocationName || this.forecastAreaName || "設定地域";
        this._header.label.set_text(`${location} — 気象庁予報`);

        const warning = this.heatWarning && d.tempMax !== null && d.tempMax >= Number(this.heatThreshold);
        if (warning) {
            this._alertItem.actor.show();
            this._alertItem.label.set_text(`🔥 暑さ警告: 予想最高 ${d.tempMax}℃`);
        } else {
            this._alertItem.label.set_text("");
            this._alertItem.actor.hide();
        }

        const tempText = d.tempMin !== null && d.tempMax !== null
            ? `最低 ${d.tempMin}℃ / 最高 ${d.tempMax}℃`
            : d.tempMax !== null ? `気温 ${d.tempMax}℃` : "気温情報なし";
        const popText = d.maxPop !== null ? `最大降水確率 ${d.maxPop}%` : "降水確率なし";
        const slots = d.popSlots.slice(0, 4).map(x => {
            const h = new Date(x.time).getHours().toString().padStart(2, "0");
            return `${h}時 ${x.pop}%`;
        }).join(" / ");
        const fetched = d.fetchedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

        this._todayItem.label.set_text([
            `${d.icon} ${d.weatherText}`,
            tempText,
            popText,
            slots ? `時間別: ${slots}` : null,
            d.windText ? `風: ${d.windText}` : null,
            `取得: ${fetched}`
        ].filter(Boolean).join("\n"));

        for (let i = 0; i < this._weekItems.length; i++) {
            const item = this._weekItems[i];
            const day = d.weekly[i];
            if (!day) {
                item.actor.hide();
                continue;
            }
            item.actor.show();
            const t = day.tempMin !== null || day.tempMax !== null
                ? `${day.tempMin ?? "--"}/${day.tempMax ?? "--"}℃`
                : "--/--℃";
            const p = day.pop !== null ? `☔${day.pop}%` : "";
            const reliability = day.reliability ? ` 信頼度${day.reliability}` : "";
            item.label.set_text(`${weekdayLabel(day.time)}  ${weatherIcon(day.code)}  ${t}  ${p}${reliability}`);
        }

        this.set_applet_tooltip(`${location}\n${d.weatherText}\n${tempText}\n${popText}`);
    }

    _notifyIfNeeded() {
        const d = this._cached;
        if (!d)
            return;
        const location = this.displayLocationName || this.forecastAreaName || "設定地域";
        const reportKey = d.reportDatetime || d.fetchedAt.toISOString().slice(0, 13);

        if (this.rainNotification && d.maxPop !== null && d.maxPop >= Number(this.rainThreshold)) {
            const key = `${reportKey}:rain:${d.maxPop}`;
            if (this._lastRainNotificationKey !== key) {
                Main.notify(`${location}: 雨に注意`, `最大降水確率 ${d.maxPop}%です。`);
                this._lastRainNotificationKey = key;
            }
        }

        if (this.heatWarning && d.tempMax !== null && d.tempMax >= Number(this.heatThreshold)) {
            const key = `${reportKey}:heat:${d.tempMax}`;
            if (this._lastHeatNotificationKey !== key) {
                Main.notify(`${location}: 暑さ警告`, `予想最高気温 ${d.tempMax}℃です。外出時は熱中症対策を。`);
                this._lastHeatNotificationKey = key;
            }
        }
    }

    _showError(message) {
        this.set_applet_label("⚠天気");
        this.set_applet_tooltip(`予報取得失敗: ${message}`);
        this._header.label.set_text("天気予報の取得に失敗しました");
        this._todayItem.label.set_text(`${message}\n「今すぐ更新」または地域設定を確認してください。`);
        this._alertItem.actor.hide();
        for (const item of this._weekItems)
            item.actor.hide();
    }

    _openDetails() {
        const url = this.detailsUrl || "https://www.jma.go.jp/bosai/forecast/";
        try {
            Gio.AppInfo.launch_default_for_uri(url, null);
        } catch (e) {
            global.logError(`[${UUID}] URL open failed: ${e}`);
        }
    }

    on_applet_removed_from_panel() {
        this._destroyed = true;
        if (this._timeoutId)
            Mainloop.source_remove(this._timeoutId);
        if (this._session)
            this._session.abort();
        if (this._settings)
            this._settings.finalize();
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new JmaWeatherApplet(metadata, orientation, panelHeight, instanceId);
}
