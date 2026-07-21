#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function loadLegacyModule(relativePath) {
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
    const filename = path.join(root, relativePath);
    vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
    return context;
}

const utils = loadLegacyModule("src/utils/weatherUtils.js");
const jmaModule = loadLegacyModule("src/providers/jmaProvider.js");
const openMeteoModule = loadLegacyModule("src/providers/openMeteoProvider.js");
const modelModule = loadLegacyModule("src/models/weatherData.js");

const fakeHttp = { getJson() { throw new Error("not used"); } };
const jmaProvider = new jmaModule.JmaProvider(fakeHttp, utils);
const openMeteoProvider = new openMeteoModule.OpenMeteoProvider(fakeHttp, utils);

function localIso(date, hour) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}T${String(hour).padStart(2, "0")}:00:00`;
}

const today = new Date();
const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
const todayKey = utils.dateKey(today);
const tomorrowKey = utils.dateKey(tomorrow);

const jmaFixture = [
    {
        timeSeries: [
            {
                areas: [{
                    area: { name: "東京地方" },
                    weatherCodes: ["100"],
                    weathers: ["晴れ"],
                    winds: ["南の風"]
                }]
            },
            {
                areas: [{
                    area: { name: "東京地方" },
                    pops: ["10", "30"]
                }]
            },
            {
                timeDefines: [localIso(today, 6), localIso(today, 15)],
                areas: [{
                    area: { name: "東京" },
                    temps: ["24", "33"]
                }]
            }
        ]
    },
    {
        timeSeries: [
            {
                timeDefines: [todayKey, tomorrowKey],
                areas: [{
                    area: { name: "東京地方" },
                    weatherCodes: ["100", "300"],
                    pops: ["20", "70"]
                }]
            },
            {
                areas: [{
                    area: { name: "東京" },
                    tempsMin: ["24", "25"],
                    tempsMax: ["33", "31"]
                }]
            }
        ]
    }
];

const parsedJma = jmaProvider.parse(jmaFixture, {
    areaName: "東京地方",
    tempAreaName: "東京"
});
assert.strictEqual(parsedJma.weatherCode, "100");
assert.strictEqual(parsedJma.maxPop, 30);
assert.strictEqual(parsedJma.minTemp, 24);
assert.strictEqual(parsedJma.maxTemp, 33);
assert.strictEqual(parsedJma.weeklyRows.length, 2);

const future = new Date(Date.now() + 60 * 60 * 1000);
const futureIso = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}T${String(future.getHours()).padStart(2, "0")}:00`;

const openMeteoFixture = {
    current: {
        temperature_2m: 29.4,
        apparent_temperature: 32.1,
        weather_code: 1,
        is_day: 1,
        wind_speed_10m: 8.4
    },
    hourly: {
        time: [futureIso],
        temperature_2m: [30],
        apparent_temperature: [33],
        precipitation_probability: [40],
        weather_code: [2],
        is_day: [1],
        uv_index: [6.5],
        wind_speed_10m: [9.2]
    },
    daily: {
        time: [todayKey, tomorrowKey],
        weather_code: [1, 61],
        temperature_2m_min: [23, 24],
        temperature_2m_max: [34, 30],
        precipitation_probability_max: [35, 80],
        uv_index_max: [8.1, 5.4]
    }
};

const parsedOpenMeteo = openMeteoProvider.parse(openMeteoFixture);
assert.strictEqual(parsedOpenMeteo.current.temp, 29.4);
assert.strictEqual(parsedOpenMeteo.rows.length, 1);
assert.strictEqual(parsedOpenMeteo.dailyRows.length, 2);

const snapshot = new modelModule.WeatherSnapshot(parsedJma, parsedOpenMeteo, []);
const effective = snapshot.effectiveToday(today);
assert.strictEqual(effective.min, 23);
assert.strictEqual(effective.max, 34);
assert.strictEqual(effective.pop, 30);

const weekly = snapshot.mergedWeeklyRows();
assert.strictEqual(weekly.length, 2);
assert.strictEqual(String(weekly[0].code), "100");
assert.strictEqual(weekly[0].min, 24); // JMA value is preferred when present.
assert.strictEqual(weekly[1].pop, 70);

console.log("parser-smoke-test: OK");
