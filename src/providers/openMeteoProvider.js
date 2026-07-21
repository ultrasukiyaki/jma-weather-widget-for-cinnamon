var OpenMeteoProvider = class OpenMeteoProvider {
    constructor(httpClient, utils) {
        this._httpClient = httpClient;
        this._utils = utils;
    }

    buildUrl(config) {
        const latitude = Number(config.latitude);
        const longitude = Number(config.longitude);

        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
            throw new Error("緯度が正しくありません");
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
            throw new Error("経度が正しくありません");

        return "https://api.open-meteo.com/v1/forecast" +
            `?latitude=${encodeURIComponent(latitude)}` +
            `&longitude=${encodeURIComponent(longitude)}` +
            "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m" +
            "&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,is_day,uv_index,wind_speed_10m" +
            "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max" +
            "&timezone=Asia%2FTokyo&forecast_days=7";
    }

    fetch(config, callback) {
        let url;

        try {
            url = this.buildUrl(config);
        } catch (error) {
            callback(error, null);
            return;
        }

        this._httpClient.getJson(url, (error, data) => {
            if (error) {
                callback(error, null);
                return;
            }

            try {
                callback(null, this.parse(data));
            } catch (parseError) {
                callback(new Error(`parse: ${parseError.message}`), null);
            }
        });
    }

    parse(data) {
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
                temp: this._utils.asNumber(temperatures[i]),
                feels: this._utils.asNumber(feels[i]),
                pop: this._utils.asNumber(pops[i]),
                code: this._utils.asNumber(codes[i]),
                isDay: Number(dayFlags[i]) === 1,
                uv: this._utils.asNumber(uvs[i]),
                wind: this._utils.asNumber(winds[i])
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
                code: this._utils.asNumber(dailyCodes[i]),
                min: this._utils.asNumber(dailyMins[i]),
                max: this._utils.asNumber(dailyMaxs[i]),
                pop: this._utils.asNumber(dailyPops[i]),
                uv: this._utils.asNumber(dailyUvs[i])
            });
        }

        return {
            provider: "open-meteo",
            current: {
                temp: this._utils.asNumber(data.current?.temperature_2m),
                feels: this._utils.asNumber(data.current?.apparent_temperature),
                code: this._utils.asNumber(data.current?.weather_code),
                isDay: Number(data.current?.is_day) === 1,
                wind: this._utils.asNumber(data.current?.wind_speed_10m)
            },
            rows,
            dailyRows,
            uvMax: this._utils.asNumber(dailyUvs[0]),
            updatedAt: new Date()
        };
    }
};
