#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = {
    Array,
    Boolean,
    Date,
    Error,
    Map,
    Math,
    Number,
    Object,
    Set,
    String,
    console
};
vm.createContext(context);
vm.runInContext(
    fs.readFileSync(path.join(root, "src/models/weatherData.js"), "utf8"),
    context,
    { filename: "src/models/weatherData.js" }
);

const resolve = context.resolvePanelHourlyForecast;
const row = (time, code = 1, pop = 20, temp = 30) => ({
    time,
    code,
    pop,
    temp,
    isDay: true
});

const afternoon = "2026-07-23T15:37:00+09:00";
assert.strictEqual(
    resolve([
        row("2026-07-23T15:00", 2),
        row("2026-07-23T16:00", 3),
        row("2026-07-23T17:00", 4)
    ], afternoon).code,
    2
);
assert.strictEqual(
    resolve([
        row("2026-07-23T16:00", 3),
        row("2026-07-23T17:00", 4)
    ], afternoon).code,
    3
);
assert.strictEqual(
    resolve([
        row("2026-07-23T13:00", 1),
        row("2026-07-23T14:00", 2)
    ], afternoon).code,
    2
);

assert.strictEqual(
    resolve([row("2026-07-22T23:00", 1)], "2026-07-23T00:10:00+09:00"),
    null,
    "the previous day must not be treated as the current forecast after midnight"
);
assert.strictEqual(
    resolve([
        row("2026-07-23T01:00", 2),
        row("2026-07-23T02:00", 3)
    ], "2026-07-23T00:10:00+09:00").code,
    2
);
assert.strictEqual(
    resolve([
        row("2026-07-24T01:00", 3),
        row("2026-07-24T00:00", 2),
        row("2026-07-23T23:00", 1)
    ], "2026-07-23T23:50:00+09:00").code,
    1
);
assert.strictEqual(
    resolve([
        row("2026-07-23T23:00", 1),
        row("2026-07-24T01:00", 3),
        row("2026-07-24T02:00", 4)
    ], "2026-07-24T00:10:00+09:00").code,
    3,
    "a previous-day row must yield to the first near-future row"
);

assert.strictEqual(
    resolve([
        row("2026-07-23T17:00", 4),
        row("2026-07-23T15:00", 2),
        row("2026-07-23T16:00", 3)
    ], afternoon).code,
    2,
    "provider order must not affect selection"
);
assert.doesNotThrow(() => resolve([
    row("2026-07-23T15:00", 2),
    row("2026-07-23T15:00", 3)
], afternoon));
assert.strictEqual(
    resolve([
        row("not-a-date", 1),
        row(null, 2),
        row("2026-07-23T15:00", 3)
    ], afternoon).code,
    3
);
assert.strictEqual(resolve([], afternoon), null);
assert.strictEqual(resolve(undefined, afternoon), null);
assert.strictEqual(
    resolve([row("2026-07-23T12:00")], afternoon),
    null,
    "stale hourly data must fall back"
);
assert.strictEqual(
    resolve([row("2026-07-23T20:00")], afternoon),
    null,
    "distant future hourly data must fall back"
);

assert.strictEqual(
    resolve([row("2026-07-23T15:00", 7)], "2026-07-23T06:37:00Z").code,
    7,
    "offset-less provider time must be interpreted as Asia/Tokyo"
);
assert.strictEqual(
    resolve([row("2026-07-23T06:00:00Z", 8)], afternoon).code,
    8,
    "explicitly zoned timestamps must represent the same instant"
);

const snapshot = new context.WeatherSnapshot(
    {
        weatherCode: "100",
        maxPop: 80,
        maxTemp: 36,
        weeklyRows: []
    },
    {
        current: { temp: 28, code: 1, isDay: true },
        rows: [row("2026-07-23T15:00", 3, 48, 31)],
        dailyRows: [{
            time: "2026-07-23",
            code: 1,
            min: 24,
            max: 35,
            pop: 70
        }]
    },
    [],
    { jma: "fresh", openMeteo: "fresh" }
);
const panel = snapshot.panelWeather(afternoon);
assert.strictEqual(panel.hourlyEntry.code, 3);
assert.strictEqual(panel.precipitation, 48);
assert.strictEqual(panel.currentTemp, 28);
assert.notStrictEqual(panel.currentTemp, panel.hourlyEntry.temp);
assert.strictEqual(snapshot.effectiveToday(afternoon).max, 35);

const fallback = snapshot.panelWeather("2026-07-23T20:00:00+09:00");
assert.strictEqual(fallback.hourlyEntry, null);
assert.strictEqual(fallback.precipitation, null);
assert.strictEqual(fallback.currentTemp, 28);

console.log("panel-forecast-resolver-test: OK");
