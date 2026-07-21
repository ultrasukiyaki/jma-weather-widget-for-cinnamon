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

var WeatherSnapshot = class WeatherSnapshot {
    constructor(jma = null, openMeteo = null, errors = []) {
        this.jma = jma;
        this.openMeteo = openMeteo;
        this.errors = Array.isArray(errors) ? errors : [];
    }

    static fromPrevious(previous) {
        if (!previous)
            return new WeatherSnapshot();

        return new WeatherSnapshot(
            previous.jma || null,
            previous.openMeteo || null,
            []
        );
    }

    hasData() {
        return Boolean(this.jma || this.openMeteo);
    }

    latestUpdatedAt() {
        return this.openMeteo?.updatedAt || this.jma?.updatedAt || null;
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
};
