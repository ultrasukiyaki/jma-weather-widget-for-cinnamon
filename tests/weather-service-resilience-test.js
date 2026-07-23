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

const modelModule = loadLegacyModule("src/models/weatherData.js");
const serviceModule = loadLegacyModule("src/services/weatherService.js");

function provider(result) {
    return {
        fetch(_config, callback) {
            if (result.error)
                callback(result.error, null);
            else
                callback(null, result.data);
        }
    };
}

function refresh(jmaResult, openResult, previous = null) {
    const service = new serviceModule.WeatherService(
        provider(jmaResult),
        provider(openResult),
        modelModule.WeatherSnapshot
    );

    let output = null;
    service.refresh({ jma: {}, openMeteo: {} }, previous, snapshot => {
        output = snapshot;
    });
    assert.ok(output, "refresh callback was not called");
    return output;
}

const oldJma = {
    provider: "jma",
    weatherCode: "200",
    maxPop: 70,
    minTemp: 20,
    maxTemp: 28,
    weeklyRows: [],
    updatedAt: "2026-07-21T06:00:00Z"
};
const oldOpen = {
    provider: "open-meteo",
    current: { temp: 25, code: 3, isDay: true },
    rows: [],
    dailyRows: [{ time: "2026-07-21", code: 3, min: 19, max: 27, pop: 60 }],
    updatedAt: "2026-07-21T06:00:00Z"
};
const previous = new modelModule.WeatherSnapshot(
    oldJma,
    oldOpen,
    [],
    { jma: "fresh", openMeteo: "fresh" }
);

const newJma = {
    ...oldJma,
    weatherCode: "100",
    maxPop: 10,
    minTemp: 22,
    maxTemp: 32,
    updatedAt: "2026-07-21T08:00:00Z"
};
const timeout = new Error("request timed out");
timeout.kind = "timeout";

const partial = refresh(
    { data: newJma },
    { error: timeout },
    previous
);
assert.strictEqual(partial.jma.weatherCode, "100");
assert.strictEqual(partial.openMeteo.current.temp, 25);
assert.strictEqual(partial.providerState("jma"), "fresh");
assert.strictEqual(partial.providerState("openMeteo"), "previous");
assert.strictEqual(partial.staleLabel(), "一部は前回取得データ");
assert.ok(partial.errors[0].includes("タイムアウト"));
assert.strictEqual(
    partial.effectiveToday("2026-07-21T12:00:00+09:00").max,
    32,
    "fresh JMA must beat stale Open-Meteo"
);

const cached = modelModule.WeatherSnapshot.fromCache({
    jma: oldJma,
    openMeteo: oldOpen,
    savedAt: "2026-07-21T06:00:00Z"
});
const httpError = new Error("HTTP 503");
httpError.kind = "http";
const jsonError = new Error("unexpected token");
jsonError.kind = "json";
const failed = refresh(
    { error: httpError },
    { error: jsonError },
    cached
);
assert.strictEqual(failed.hasFreshData(), false);
assert.strictEqual(failed.hasData(), true);
assert.strictEqual(failed.staleLabel(), "前回取得データ（更新失敗）");
assert.ok(failed.errors.join(" ").includes("HTTPエラー"));
assert.ok(failed.errors.join(" ").includes("JSON解析エラー"));

const freshOpen = {
    ...oldOpen,
    dailyRows: [{ time: "2026-07-21", code: 1, min: 24, max: 35, pop: 20 }],
    updatedAt: "2026-07-21T08:01:00Z"
};
const networkError = new Error("connection refused");
networkError.kind = "network";
const openOnly = refresh(
    { error: networkError },
    { data: freshOpen },
    previous
);
assert.strictEqual(openOnly.providerState("jma"), "previous");
assert.strictEqual(openOnly.providerState("openMeteo"), "fresh");
assert.strictEqual(
    openOnly.effectiveToday("2026-07-21T12:00:00+09:00").max,
    35,
    "fresh Open-Meteo must beat stale JMA"
);

console.log("weather-service-resilience-test: OK");
