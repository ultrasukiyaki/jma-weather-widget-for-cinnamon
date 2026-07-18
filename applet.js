const Applet = imports.ui.applet;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Util = imports.misc.util;

const ByteArray = imports.byteArray;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Soup = imports.gi.Soup;

const UUID = "jma-weather@10yendama.com";
const VERSION = "2.1.0";

function firstValue(values) {
    if (!Array.isArray(values))
        return null;

    for (const value of values) {
        if (value !== null && value !== undefined && String(value).trim() !== "")
            return String(value);
    }
    return null;
}

function asNumber(value) {
    if (value === null || value === undefined || value === "")
        return null;

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function weatherIcon(code) {
    const n = Number(code);

    if ([100, 101, 110, 111].includes(n))
        return "☀";
    if ([200, 201, 202, 203, 209, 210, 211, 212, 213, 214,
         218, 219, 220, 221, 222, 223, 224, 225, 226].includes(n))
        return "☁";
    if ([102, 103, 106, 107, 108, 112, 113, 114, 118, 119,
         120, 121, 122, 125, 126, 127, 128, 130, 131, 132,
         140, 160, 170, 181, 204, 205, 206, 207, 208, 215,
         216, 217, 228, 229, 230, 231, 240, 250, 260, 270,
         281].includes(n))
        return "🌦";
    if ([300, 301, 302, 303, 304, 306, 308, 309, 311,
         313, 314, 315, 316, 317, 320, 321, 322, 323,
         324, 325, 326, 327, 328, 329, 340, 350, 361,
         371].includes(n))
        return "🌧";
    if ([400, 401, 402, 403, 405, 406, 407, 409, 411,
         413, 414, 420, 421, 422, 423, 425, 426, 427,
         450].includes(n))
        return "❄";

    return "☁";
}

function openMeteoIcon(code, isDay) {
    const n = Number(code);

    if (n === 0)
        return isDay ? "☀" : "🌙";
    if ([1, 2].includes(n))
        return isDay ? "🌤" : "☁";
    if (n === 3)
        return "☁";
    if ([45, 48].includes(n))
        return "🌫";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(n))
        return "🌧";
    if ([71, 73, 75, 77, 85, 86].includes(n))
        return "❄";
    if ([95, 96, 99].includes(n))
        return "⛈";

    return "☁";
}

function formatHour(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
        return iso;

    return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatWeekday(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
        return iso;

    return date.toLocaleDateString("ja-JP", {
        month: "numeric",
        day: "numeric",
        weekday: "short"
    });
}

function formatUpdatedAt(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return "--:--";

    return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function uvSeverity(value) {
    const uv = asNumber(value);
    if (uv === null)
        return "不明";
    if (uv < 3)
        return "弱い";
    if (uv < 6)
        return "中程度";
    if (uv < 8)
        return "強い";
    if (uv < 11)
        return "非常に強い";
    return "極端に強い";
}

function feelsLikeDescription(actual, apparent) {
    const temperature = asNumber(actual);
    const feels = asNumber(apparent);
    if (temperature === null || feels === null)
        return "";

    const difference = feels - temperature;
    if (difference <= -4)
        return "かなり寒く感じます";
    if (difference <= -2)
        return "寒く感じます";
    if (difference >= 4)
        return "かなり暑く感じます";
    if (difference >= 2)
        return "暑く感じます";
    return "気温どおりの体感です";
}

class JmaWeatherApplet extends Applet.TextApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);

        this._metadata = metadata;
        this._instanceId = instanceId;
        this._timeoutId = 0;
        this._destroyed = false;
        this._jma = null;
        this._hourly = null;
        this._lastNoticeKeys = new Set();
        this._lastRainNotice = null;

        this.set_applet_label("天気…");
        this.set_applet_tooltip("天気予報を取得しています");

        this._settings = new Settings.AppletSettings(
            this,
            metadata.uuid,
            instanceId
        );

        const refreshKeys = [
            ["display-name", "displayName"],
            ["jma-area-code", "jmaAreaCode"],
            ["jma-area-name", "jmaAreaName"],
            ["jma-temp-area-name", "jmaTempAreaName"],
            ["latitude", "latitude"],
            ["longitude", "longitude"],
            ["panel-mode", "panelMode"],
            ["hourly-count", "hourlyCount"],
            ["rain-notification", "rainNotification"],
            ["rain-threshold", "rainThreshold"],
            ["heat-notification", "heatNotification"],
            ["heat-threshold", "heatThreshold"],
            ["uv-notification", "uvNotification"],
            ["uv-threshold", "uvThreshold"],
            ["details-url", "detailsUrl"],
            ["radar-url", "radarUrl"]
        ];

        for (const [key, property] of refreshKeys) {
            this._settings.bind(
                key,
                property,
                this._onSettingChanged.bind(this)
            );
        }

        this._settings.bind(
            "update-interval",
            "updateInterval",
            this._restartTimer.bind(this)
        );

        this._session = new Soup.Session({
            user_agent: `JMA-Weather-Cinnamon/${VERSION}`
        });
        this._session.timeout = 20;

        this._buildMenu();
        this._refreshAll();
        this._restartTimer();
    }

    _buildMenu() {
        this._menuManager = new PopupMenu.PopupMenuManager(this);
        this._menu = new Applet.AppletPopupMenu(
            this,
            this._orientation
        );
        this._menuManager.addMenu(this._menu);

        this._currentItem = new PopupMenu.PopupMenuItem(
            "予報を取得しています…",
            { reactive: false }
        );
        this._currentItem.label.clutter_text.set_line_wrap(true);
        this._menu.addMenuItem(this._currentItem);

        this._hourlyHeader = new PopupMenu.PopupMenuItem(
            "時間別予報",
            { reactive: false }
        );
        this._hourlyHeader.label.add_style_class_name("jma-weather-header");
        this._menu.addMenuItem(this._hourlyHeader);

        this._hourlyItem = new PopupMenu.PopupMenuItem(
            "取得中…",
            { reactive: false }
        );
        this._hourlyItem.label.clutter_text.set_line_wrap(true);
        this._menu.addMenuItem(this._hourlyItem);

        this._weeklyHeader = new PopupMenu.PopupMenuItem(
            "週間予報",
            { reactive: false }
        );
        this._weeklyHeader.label.add_style_class_name("jma-weather-header");
        this._menu.addMenuItem(this._weeklyHeader);

        this._weeklyItem = new PopupMenu.PopupMenuItem(
            "取得中…",
            { reactive: false }
        );
        this._weeklyItem.label.clutter_text.set_line_wrap(true);
        this._menu.addMenuItem(this._weeklyItem);

        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const refresh = new PopupMenu.PopupMenuItem("今すぐ更新");
        refresh.connect("activate", () => this._refreshAll());
        this._menu.addMenuItem(refresh);

        const details = new PopupMenu.PopupMenuItem("詳しい予報を開く");
        details.connect("activate", () => this._openUri(this.detailsUrl));
        this._menu.addMenuItem(details);

        const radar = new PopupMenu.PopupMenuItem("雨雲レーダーを開く");
        radar.connect("activate", () => this._openUri(this.radarUrl));
        this._menu.addMenuItem(radar);

        const settings = new PopupMenu.PopupMenuItem("設定");
        settings.connect("activate", () => this._openSettings());
        this._menu.addMenuItem(settings);
    }

    on_applet_clicked() {
        this._menu.toggle();
    }

    _onSettingChanged() {
        this._render();
        this._refreshAll();
    }

    _restartTimer() {
        if (this._timeoutId) {
            Mainloop.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        const minutes = Math.max(10, Number(this.updateInterval) || 30);
        this._timeoutId = Mainloop.timeout_add_seconds(
            minutes * 60,
            () => {
                this._refreshAll();
                return true;
            }
        );
    }

    _requestJson(url, callback) {
        let message;

        try {
            message = Soup.Message.new("GET", url);
        } catch (error) {
            callback(error, null);
            return;
        }

        this._session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                if (this._destroyed)
                    return;

                try {
                    const bytes = session.send_and_read_finish(result);
                    const status = message.get_status();

                    if (status < 200 || status >= 300)
                        throw new Error(`HTTP ${status}`);

                    const text = ByteArray.toString(bytes.get_data());
                    callback(null, JSON.parse(text));
                } catch (error) {
                    callback(error, null);
                }
            }
        );
    }

    _refreshAll() {
        this.set_applet_tooltip("天気予報を更新しています…");

        const areaCode = String(this.jmaAreaCode || "130000").trim();
        const jmaUrl =
            `https://www.jma.go.jp/bosai/forecast/data/forecast/${areaCode}.json`;

        const lat = Number(this.latitude);
        const lon = Number(this.longitude);
        const hourlyUrl =
            "https://api.open-meteo.com/v1/forecast" +
            `?latitude=${encodeURIComponent(lat)}` +
            `&longitude=${encodeURIComponent(lon)}` +
            "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m" +
            "&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,is_day,uv_index,wind_speed_10m" +
            "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max" +
            "&timezone=Asia%2FTokyo&forecast_days=7";

        let pending = 2;
        let errors = [];

        const finished = () => {
            pending -= 1;
            if (pending > 0)
                return;

            this._render();
            this._checkNotifications();

            if (errors.length)
                global.logError(`[${UUID}] ${errors.join(" | ")}`);
        };

        this._requestJson(jmaUrl, (error, data) => {
            if (error) {
                errors.push(`JMA: ${error.message}`);
            } else {
                try {
                    this._jma = this._parseJma(data);
                } catch (parseError) {
                    errors.push(`JMA parse: ${parseError.message}`);
                }
            }
            finished();
        });

        this._requestJson(hourlyUrl, (error, data) => {
            if (error) {
                errors.push(`Open-Meteo: ${error.message}`);
            } else {
                try {
                    this._hourly = this._parseHourly(data);
                } catch (parseError) {
                    errors.push(`hourly parse: ${parseError.message}`);
                }
            }
            finished();
        });
    }

    _parseJma(data) {
        if (!Array.isArray(data) || data.length === 0)
            throw new Error("予報JSONの形式が想定外です");

        const short = data[0];
        const weekly = data.length > 1 ? data[1] : null;
        const series = short.timeSeries || [];

        const weatherSeries = series[0] || {};
        const popSeries = series[1] || {};
        const tempSeries = series[2] || {};

        const areaName = this.jmaAreaName || "東京地方";
        const tempAreaName = this.jmaTempAreaName || "東京";

        const weatherArea =
            (weatherSeries.areas || []).find(a => a.area?.name === areaName) ||
            (weatherSeries.areas || [])[0];

        const popArea =
            (popSeries.areas || []).find(a => a.area?.name === areaName) ||
            (popSeries.areas || [])[0];

        const tempArea =
            (tempSeries.areas || []).find(a => a.area?.name === tempAreaName) ||
            (tempSeries.areas || [])[0];

        if (!weatherArea)
            throw new Error(`予報エリア「${areaName}」が見つかりません`);

        const weatherCode = firstValue(weatherArea.weatherCodes) || "000";
        const weatherText = firstValue(weatherArea.weathers) || "予報不明";
        const windText = firstValue(weatherArea.winds) || "";

        const pops = (popArea?.pops || [])
            .map(asNumber)
            .filter(v => v !== null);
        const maxPop = pops.length ? Math.max(...pops) : null;

        // The JMA short forecast temperature array is aligned to timeDefines.
        // Its first two entries are not guaranteed to be today's min/max, so
        // classify values by timestamp instead of relying on array position.
        const tempTimes = tempSeries.timeDefines || [];
        const tempValues = tempArea?.temps || [];
        const todayKey = this._dateKey(new Date());
        const todayTemps = [];

        for (let i = 0; i < Math.min(tempTimes.length, tempValues.length); i++) {
            const value = asNumber(tempValues[i]);
            if (value === null || this._dateKey(tempTimes[i]) !== todayKey)
                continue;
            todayTemps.push(value);
        }

        const minTemp = todayTemps.length ? Math.min(...todayTemps) : null;
        const maxTemp = todayTemps.length ? Math.max(...todayTemps) : null;

        const weeklyRows = [];
        if (weekly?.timeSeries?.length) {
            const weatherWeekly = weekly.timeSeries[0];
            const tempWeekly = weekly.timeSeries[1];

            const weeklyArea =
                (weatherWeekly.areas || []).find(a => a.area?.name === areaName) ||
                (weatherWeekly.areas || [])[0];

            const weeklyTempArea =
                (tempWeekly?.areas || []).find(a => a.area?.name === tempAreaName) ||
                (tempWeekly?.areas || [])[0];

            const times = weatherWeekly.timeDefines || [];
            const codes = weeklyArea?.weatherCodes || [];
            const weeklyPops = weeklyArea?.pops || [];
            const mins = weeklyTempArea?.tempsMin || [];
            const maxs = weeklyTempArea?.tempsMax || [];

            for (let i = 0; i < Math.min(times.length, 7); i++) {
                weeklyRows.push({
                    time: times[i],
                    code: String(codes[i] || "000"),
                    pop: asNumber(weeklyPops[i]),
                    min: asNumber(mins[i]),
                    max: asNumber(maxs[i])
                });
            }
        }

        return {
            icon: weatherIcon(weatherCode),
            weatherCode,
            weatherText,
            windText,
            maxPop,
            minTemp,
            maxTemp,
            weeklyRows,
            updatedAt: new Date()
        };
    }

    _parseHourly(data) {
        if (!data || !data.hourly)
            throw new Error("時間別JSONの形式が想定外です");

        const times = data.hourly.time || [];
        const temperatures = data.hourly.temperature_2m || [];
        const feels = data.hourly.apparent_temperature || [];
        const pops = data.hourly.precipitation_probability || [];
        const codes = data.hourly.weather_code || [];
        const dayFlags = data.hourly.is_day || [];
        const uvs = data.hourly.uv_index || [];
        const winds = data.hourly.wind_speed_10m || [];

        const now = Date.now();
        const rows = [];

        for (let i = 0; i < times.length; i++) {
            const timeValue = new Date(times[i]).getTime();
            if (Number.isNaN(timeValue) || timeValue < now - 30 * 60 * 1000)
                continue;

            rows.push({
                time: times[i],
                temp: asNumber(temperatures[i]),
                feels: asNumber(feels[i]),
                pop: asNumber(pops[i]),
                code: asNumber(codes[i]),
                isDay: Number(dayFlags[i]) === 1,
                uv: asNumber(uvs[i]),
                wind: asNumber(winds[i])
            });

            if (rows.length >= 24)
                break;
        }

        const dailyTimes = data.daily?.time || [];
        const dailyCodes = data.daily?.weather_code || [];
        const dailyMins = data.daily?.temperature_2m_min || [];
        const dailyMaxs = data.daily?.temperature_2m_max || [];
        const dailyPops = data.daily?.precipitation_probability_max || [];
        const dailyUvs = data.daily?.uv_index_max || [];
        const dailyRows = [];

        for (let i = 0; i < Math.min(dailyTimes.length, 7); i++) {
            dailyRows.push({
                time: dailyTimes[i],
                code: asNumber(dailyCodes[i]),
                min: asNumber(dailyMins[i]),
                max: asNumber(dailyMaxs[i]),
                pop: asNumber(dailyPops[i]),
                uv: asNumber(dailyUvs[i])
            });
        }

        return {
            current: {
                temp: asNumber(data.current?.temperature_2m),
                feels: asNumber(data.current?.apparent_temperature),
                code: asNumber(data.current?.weather_code),
                isDay: Number(data.current?.is_day) === 1,
                wind: asNumber(data.current?.wind_speed_10m)
            },
            rows,
            dailyRows,
            uvMax: asNumber(dailyUvs[0]),
            updatedAt: new Date()
        };
    }

    _dateKey(value) {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime()))
            return null;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    _dailyForecastFor(dateKey) {
        return (this._hourly?.dailyRows || []).find(row =>
            this._dateKey(row.time) === dateKey
        ) || null;
    }

    _effectiveToday() {
        const dateKey = this._dateKey(new Date());
        const daily = this._dailyForecastFor(dateKey);

        return {
            min: daily?.min ?? this._jma?.minTemp ?? null,
            max: daily?.max ?? this._jma?.maxTemp ?? null,
            pop: this._jma?.maxPop ?? daily?.pop ?? null,
            code: this._jma?.weatherCode ?? daily?.code ?? null
        };
    }

    _mergedWeeklyRows() {
        const byDate = new Map();

        // Open-Meteo supplies complete daily min/max values, including today.
        for (const row of this._hourly?.dailyRows || []) {
            const key = this._dateKey(row.time);
            if (!key)
                continue;
            byDate.set(key, {
                time: row.time,
                code: row.code,
                pop: row.pop,
                min: row.min,
                max: row.max,
                source: "open-meteo"
            });
        }

        // Prefer JMA weather code and precipitation where they are present,
        // while retaining complete temperature values from the daily fallback.
        for (const row of this._jma?.weeklyRows || []) {
            const key = this._dateKey(row.time);
            if (!key)
                continue;

            const current = byDate.get(key) || {
                time: row.time,
                code: null,
                pop: null,
                min: null,
                max: null
            };

            byDate.set(key, {
                time: current.time || row.time,
                code: row.code && row.code !== "000" ? row.code : current.code,
                pop: row.pop ?? current.pop,
                min: row.min ?? current.min,
                max: row.max ?? current.max,
                source: "merged"
            });
        }

        return Array.from(byDate.values())
            .filter(row => row.time && (
                row.code !== null || row.pop !== null ||
                row.min !== null || row.max !== null
            ))
            .sort((a, b) => new Date(a.time) - new Date(b.time))
            .slice(0, 7);
    }

    _openSettings() {
        try {
            // Cinnamon's command is more reliable than the custom URI handler.
            Util.spawnCommandLine(
                `cinnamon-settings applets ${UUID} ${this._instanceId}`
            );
        } catch (error) {
            global.logError(`[${UUID}] settings open failed: ${error}`);

            try {
                Util.spawnCommandLine("cinnamon-settings applets");
                Main.notify(
                    "アプレット設定を開きました",
                    "一覧から JMA Weather Japan の設定を選んでください。"
                );
            } catch (fallbackError) {
                global.logError(
                    `[${UUID}] settings fallback failed: ${fallbackError}`
                );
                Main.notify(
                    "設定画面を開けませんでした",
                    String(fallbackError.message || fallbackError)
                );
            }
        }
    }

    _render() {
        if (!this._jma && !this._hourly) {
            this.set_applet_label("⚠ 天気");
            this.set_applet_tooltip("予報を取得できませんでした");
            return;
        }

        const jma = this._jma;
        const hourly = this._hourly;
        const icon =
            jma?.icon ||
            openMeteoIcon(hourly?.current?.code, hourly?.current?.isDay);

        const currentTemp = hourly?.current?.temp;
        const today = this._effectiveToday();
        const minTemp = today.min;
        const maxTemp = today.max;
        const maxPop = today.pop;

        let label = icon;
        if (this.panelMode === "temperature" || this.panelMode === "full") {
            const displayTemp = currentTemp !== null && currentTemp !== undefined
                ? Math.round(currentTemp)
                : maxTemp !== null && maxTemp !== undefined
                    ? Math.round(maxTemp)
                    : null;

            if (displayTemp !== null)
                label += `${displayTemp}°`;
        }

        if (this.panelMode === "full" && maxPop !== null && maxPop !== undefined)
            label += ` ☔${Math.round(maxPop)}%`;

        if (maxTemp !== null &&
            maxTemp !== undefined &&
            Number(maxTemp) >= Number(this.heatThreshold || 35))
            label += " 🔥";

        this.set_applet_label(label);

        const location = this.displayName || "設定地域";
        const currentLines = [
            `${location}`,
            jma ? `${jma.icon} ${jma.weatherText}` : null,
            currentTemp !== null && currentTemp !== undefined
                ? `現在 ${Math.round(currentTemp)}℃` : null,
            hourly?.current?.feels !== null && hourly?.current?.feels !== undefined
                ? `体感 ${Math.round(hourly.current.feels)}℃（${feelsLikeDescription(currentTemp, hourly.current.feels)}）`
                : null,
            minTemp !== null && minTemp !== undefined &&
            maxTemp !== null && maxTemp !== undefined
                ? `最低 ${Math.round(minTemp)}℃ / 最高 ${Math.round(maxTemp)}℃`
                : maxTemp !== null && maxTemp !== undefined
                    ? `最高 ${Math.round(maxTemp)}℃`
                    : null,
            maxPop !== null && maxPop !== undefined
                ? `最大降水確率 ${Math.round(maxPop)}%` : null,
            hourly?.uvMax !== null && hourly?.uvMax !== undefined
                ? `最大UV指数 ${hourly.uvMax.toFixed(1)}（${uvSeverity(hourly.uvMax)}）`
                : null,
            hourly?.current?.wind !== null && hourly?.current?.wind !== undefined
                ? `風速 ${hourly.current.wind.toFixed(1)} km/h`
                : null,
            jma?.windText ? `風向・概況: ${jma.windText}` : null,
            `更新 ${formatUpdatedAt(hourly?.updatedAt || jma?.updatedAt)}`
        ].filter(Boolean);

        this._currentItem.label.set_text(currentLines.join("\n"));

        const count = Math.max(3, Math.min(12, Number(this.hourlyCount) || 8));
        const hourlyLines = (hourly?.rows || []).slice(0, count).map(row => {
            const rowIcon = openMeteoIcon(row.code, row.isDay);
            const temp = row.temp !== null ? `${Math.round(row.temp)}℃` : "--℃";
            const pop = row.pop !== null ? `${Math.round(row.pop)}%` : "--%";
            const wind = row.wind !== null ? `${Math.round(row.wind)}km/h` : "--km/h";
            const uv = row.uv !== null ? `UV${row.uv.toFixed(1)}` : "UV--";
            return `${formatHour(row.time)}  ${rowIcon}  ${temp}  ☔${pop}  💨${wind}  ${uv}`;
        });

        this._hourlyItem.label.set_text(
            hourlyLines.length ? hourlyLines.join("\n") : "時間別予報を取得できません"
        );

        const weeklyLines = this._mergedWeeklyRows().map(row => {
            const numericCode = Number(row.code);
            const rowIcon = numericCode >= 100
                ? weatherIcon(row.code)
                : openMeteoIcon(row.code, true);
            const min = row.min !== null ? Math.round(row.min) : "--";
            const max = row.max !== null ? Math.round(row.max) : "--";
            const pop = row.pop !== null ? Math.round(row.pop) : "--";
            return `${formatWeekday(row.time)}  ${rowIcon}  ${min}/${max}℃  ☔${pop}%`;
        });

        this._weeklyItem.label.set_text(
            weeklyLines.length ? weeklyLines.join("\n") : "週間予報を取得できません"
        );

        const tooltip = [
            location,
            jma?.weatherText,
            currentTemp !== null && currentTemp !== undefined
                ? `現在 ${Math.round(currentTemp)}℃` : null,
            maxPop !== null && maxPop !== undefined
                ? `降水 ${Math.round(maxPop)}%` : null,
            `更新 ${formatUpdatedAt(hourly?.updatedAt || jma?.updatedAt)}`
        ].filter(Boolean).join("\n");

        this.set_applet_tooltip(tooltip);
    }

    _checkNotifications() {
        const jma = this._jma;
        const hourly = this._hourly;

        if (this.rainNotification && hourly?.rows?.length) {
            const threshold = Number(this.rainThreshold || 60);
            const sixHoursLater = Date.now() + 6 * 60 * 60 * 1000;
            const target = hourly.rows.find(row => {
                const time = new Date(row.time).getTime();
                return row.pop !== null &&
                    row.pop >= threshold &&
                    !Number.isNaN(time) &&
                    time <= sixHoursLater;
            });

            if (target) {
                const probability = Math.round(target.pop);
                const shouldNotify =
                    !this._lastRainNotice ||
                    this._lastRainNotice.time !== target.time ||
                    probability >= this._lastRainNotice.probability + 10;

                if (shouldNotify) {
                    this._lastRainNotice = {
                        time: target.time,
                        probability
                    };
                    this._notifyOnce(
                        `rain:${target.time}:${probability}`,
                        `${this.displayName || "設定地域"}：6時間以内に雨の可能性`,
                        `${formatHour(target.time)}ごろの降水確率は${probability}%です。傘の準備をおすすめします。`
                    );
                }
            } else {
                this._lastRainNotice = null;
            }
        }

        const today = this._effectiveToday();
        if (this.heatNotification &&
            today.max !== null &&
            today.max !== undefined &&
            today.max >= Number(this.heatThreshold || 35)) {
            const key = `heat:${new Date().toDateString()}:${today.max}`;
            this._notifyOnce(
                key,
                `${this.displayName || "設定地域"}：高温に注意`,
                `予想最高気温は${Math.round(today.max)}℃です。外出時は暑さ対策をしてください。`
            );
        }

        if (this.uvNotification &&
            hourly?.uvMax !== null &&
            hourly?.uvMax !== undefined &&
            hourly.uvMax >= Number(this.uvThreshold || 8)) {
            const key = `uv:${new Date().toDateString()}:${hourly.uvMax}`;
            this._notifyOnce(
                key,
                `${this.displayName || "設定地域"}：紫外線が強い予報`,
                `最大UV指数は${hourly.uvMax.toFixed(1)}です。`
            );
        }
    }

    _notifyOnce(key, title, body) {
        if (this._lastNoticeKeys.has(key))
            return;

        this._lastNoticeKeys.add(key);
        Main.notify(title, body);

        if (this._lastNoticeKeys.size > 30) {
            const first = this._lastNoticeKeys.values().next().value;
            this._lastNoticeKeys.delete(first);
        }
    }

    _openUri(url) {
        if (!url)
            return;

        try {
            Gio.AppInfo.launch_default_for_uri(url, null);
        } catch (error) {
            global.logError(`[${UUID}] URL open failed: ${error}`);
            Main.notify("URLを開けませんでした", String(error.message || error));
        }
    }

    on_applet_removed_from_panel() {
        this._destroyed = true;

        if (this._timeoutId) {
            Mainloop.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        if (this._session)
            this._session.abort();

        if (this._settings)
            this._settings.finalize();
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new JmaWeatherApplet(
        metadata,
        orientation,
        panelHeight,
        instanceId
    );
}
