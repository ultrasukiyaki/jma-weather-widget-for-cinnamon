// Provider-neutral weather snapshot used by the applet UI.

function _dateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function _defaultProviderStates(jma, openMeteo) {
    return {
        jma: jma ? "previous" : "missing",
        openMeteo: openMeteo ? "previous" : "missing"
    };
}

var WeatherSnapshot = class WeatherSnapshot {
    constructor(
        jma = null,
        openMeteo = null,
        errors = [],
        providerStates = null,
        cacheSavedAt = null
    ) {
        this.jma = jma;
        this.openMeteo = openMeteo;
        this.errors = Array.isArray(errors) ? errors : [];
        this.providerStates = providerStates || _defaultProviderStates(jma, openMeteo);
        this.cacheSavedAt = cacheSavedAt || null;
    }

    static fromPrevious(previous) {
        if (!previous)
            return new WeatherSnapshot();

        return new WeatherSnapshot(
            previous.jma || null,
            previous.openMeteo || null,
            [],
            _defaultProviderStates(previous.jma, previous.openMeteo),
            previous.cacheSavedAt || null
        );
    }

    static fromCache(cached) {
        if (!cached)
            return new WeatherSnapshot();

        const jma = cached.jma || null;
        const openMeteo = cached.openMeteo || null;
        return new WeatherSnapshot(
            jma,
            openMeteo,
            [],
            {
                jma: jma ? "cache" : "missing",
                openMeteo: openMeteo ? "cache" : "missing"
            },
            cached.savedAt || null
        );
    }

    setProviderData(provider, data) {
        if (provider === "jma")
            this.jma = data;
        else if (provider === "openMeteo")
            this.openMeteo = data;
        else
            throw new Error(`unknown provider: ${provider}`);

        this.providerStates[provider] = data ? "fresh" : "missing";

        if (this.providerStates.jma === "fresh" &&
            this.providerStates.openMeteo === "fresh")
            this.cacheSavedAt = null;
    }

    providerState(provider) {
        return this.providerStates?.[provider] || "missing";
    }

    isProviderFresh(provider) {
        return this.providerState(provider) === "fresh";
    }

    hasFreshData() {
        return this.isProviderFresh("jma") || this.isProviderFresh("openMeteo");
    }

    hasStaleData() {
        return ["cache", "previous"].includes(this.providerState("jma")) ||
            ["cache", "previous"].includes(this.providerState("openMeteo"));
    }

    staleLabel() {
        if (!this.hasStaleData())
            return null;

        if (!this.hasFreshData())
            return this.errors.length
                ? "前回取得データ（更新失敗）"
                : "前回取得データ";

        return "一部は前回取得データ";
    }

    hasData() {
        return Boolean(this.jma || this.openMeteo);
    }

    latestUpdatedAt() {
        if (this.isProviderFresh("openMeteo"))
            return this.openMeteo?.updatedAt || this.jma?.updatedAt || null;
        if (this.isProviderFresh("jma"))
            return this.jma?.updatedAt || this.openMeteo?.updatedAt || null;

        const values = [this.jma?.updatedAt, this.openMeteo?.updatedAt]
            .map(value => ({ value, time: new Date(value).getTime() }))
            .filter(item => item.value && !Number.isNaN(item.time))
            .sort((a, b) => b.time - a.time);
        return values[0]?.value || null;
    }

    dailyForecastFor(dateValue) {
        const key = _dateKey(dateValue);
        if (!key)
            return null;

        return (this.openMeteo?.dailyRows || []).find(row =>
            _dateKey(row.time) === key
        ) || null;
    }

    effectiveToday(now = new Date()) {
        const daily = this.dailyForecastFor(now);
        const jmaFresh = this.isProviderFresh("jma");
        const openFresh = this.isProviderFresh("openMeteo");

        if (jmaFresh && !openFresh) {
            return {
                min: this.jma?.minTemp ?? daily?.min ?? null,
                max: this.jma?.maxTemp ?? daily?.max ?? null,
                pop: this.jma?.maxPop ?? daily?.pop ?? null,
                code: this.jma?.weatherCode ?? daily?.code ?? null
            };
        }

        if (openFresh && !jmaFresh) {
            return {
                min: daily?.min ?? this.jma?.minTemp ?? null,
                max: daily?.max ?? this.jma?.maxTemp ?? null,
                pop: daily?.pop ?? this.jma?.maxPop ?? null,
                code: daily?.code ?? this.jma?.weatherCode ?? null
            };
        }

        return {
            min: daily?.min ?? this.jma?.minTemp ?? null,
            max: daily?.max ?? this.jma?.maxTemp ?? null,
            pop: this.jma?.maxPop ?? daily?.pop ?? null,
            code: this.jma?.weatherCode ?? daily?.code ?? null
        };
    }

    mergedWeeklyRows() {
        const byDate = new Map();

        // Open-Meteo supplies complete daily min/max values, including today.
        for (const row of this.openMeteo?.dailyRows || []) {
            const key = _dateKey(row.time);
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

        // Prefer JMA weather code and precipitation where present, while
        // retaining complete temperature values from Open-Meteo.
        for (const row of this.jma?.weeklyRows || []) {
            const key = _dateKey(row.time);
            if (!key)
                continue;

            const current = byDate.get(key) || {
                time: row.time,
                code: null,
                pop: null,
                min: null,
                max: null
            };

            const preferJma = this.isProviderFresh("jma") ||
                !this.isProviderFresh("openMeteo");
            const validJmaCode = row.code && row.code !== "000";

            byDate.set(key, {
                time: current.time || row.time,
                code: preferJma
                    ? (validJmaCode ? row.code : current.code)
                    : (current.code ?? (validJmaCode ? row.code : null)),
                pop: preferJma ? (row.pop ?? current.pop) : (current.pop ?? row.pop),
                min: preferJma ? (row.min ?? current.min) : (current.min ?? row.min),
                max: preferJma ? (row.max ?? current.max) : (current.max ?? row.max),
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
};
