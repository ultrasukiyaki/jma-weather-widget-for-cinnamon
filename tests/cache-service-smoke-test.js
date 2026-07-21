#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

class MemoryStorage {
    constructor() {
        this.text = null;
        this.removed = false;
    }

    read() {
        return this.text;
    }

    write(text) {
        this.text = text;
        this.removed = false;
    }

    remove() {
        this.text = null;
        this.removed = true;
    }
}

function loadModule(relativePath, extra = {}) {
    const context = {
        Array,
        Boolean,
        Date,
        Error,
        JSON,
        Math,
        Number,
        Object,
        String,
        console,
        imports: {
            byteArray: { toString: value => String(value) },
            gi: {
                GLib: {
                    FileTest: { EXISTS: 1 },
                    get_user_cache_dir: () => "/tmp",
                    file_test: () => false,
                    file_get_contents: () => [false, null],
                    path_get_dirname: value => path.dirname(value),
                    mkdir_with_parents: () => 0,
                    file_set_contents: () => true,
                    unlink: () => 0
                }
            }
        },
        ...extra
    };
    vm.createContext(context);
    const filename = path.join(root, relativePath);
    vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
    return context;
}

const cacheModule = loadModule("src/services/cacheService.js");
const modelModule = loadModule("src/models/weatherData.js", { Map, Set });

const config = {
    jma: {
        areaCode: "130000",
        areaName: "東京地方",
        tempAreaName: "東京",
        displayName: "府中市"
    },
    openMeteo: {
        latitude: 35.6689,
        longitude: 139.4777
    }
};

let now = Date.parse("2026-07-21T08:00:00Z");
const storage = new MemoryStorage();
const cache = new cacheModule.CacheService({
    storage,
    clock: () => now,
    maxAgeMs: 60 * 60 * 1000
});

const snapshot = new modelModule.WeatherSnapshot();
snapshot.setProviderData("jma", {
    provider: "jma",
    weatherCode: "100",
    weatherText: "晴れ",
    updatedAt: "2026-07-21T07:55:00Z"
});
snapshot.setProviderData("openMeteo", {
    provider: "open-meteo",
    current: { temp: 31.2, code: 1, isDay: true },
    rows: [],
    dailyRows: [],
    updatedAt: "2026-07-21T07:56:00Z"
});

assert.strictEqual(cache.save(config, snapshot), true);
assert.ok(storage.text.includes('"schemaVersion":1'));

const loaded = cache.load(config);
assert.ok(loaded);
assert.strictEqual(loaded.jma.weatherCode, "100");
assert.strictEqual(loaded.openMeteo.current.temp, 31.2);
assert.strictEqual(loaded.ageMs, 0);

const restored = modelModule.WeatherSnapshot.fromCache(loaded);
assert.strictEqual(restored.staleLabel(), "前回取得データ");
assert.strictEqual(restored.providerState("jma"), "cache");
assert.strictEqual(restored.providerState("openMeteo"), "cache");

const otherConfig = JSON.parse(JSON.stringify(config));
otherConfig.jma.areaCode = "010000";
assert.strictEqual(cache.load(otherConfig), null, "location mismatch must not restore cache");
assert.strictEqual(storage.removed, false, "location mismatch must not delete valid cache");

const mixedStorage = new MemoryStorage();
const mixedCache = new cacheModule.CacheService({
    storage: mixedStorage,
    clock: () => now,
    maxAgeMs: 60 * 60 * 1000
});
const mixedSnapshot = new modelModule.WeatherSnapshot();
mixedSnapshot.setProviderData("jma", {
    provider: "jma",
    weatherCode: "200",
    updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString()
});
mixedSnapshot.setProviderData("openMeteo", {
    provider: "open-meteo",
    current: { temp: 30 },
    rows: [],
    dailyRows: [],
    updatedAt: new Date(now - 5 * 60 * 1000).toISOString()
});
assert.strictEqual(mixedCache.save(config, mixedSnapshot), true);
const mixedLoaded = mixedCache.load(config);
assert.strictEqual(mixedLoaded.jma, null, "old provider data must not be extended by a partial refresh");
assert.ok(mixedLoaded.openMeteo, "fresh provider data must remain cacheable");

now += 2 * 60 * 60 * 1000;
assert.strictEqual(cache.load(config), null, "expired cache must be ignored");
assert.strictEqual(storage.removed, true, "expired cache must be removed");

storage.text = "{broken json";
storage.removed = false;
assert.strictEqual(cache.load(config), null, "corrupt cache must not escape");
assert.ok(cache.lastError);
assert.strictEqual(storage.removed, true, "corrupt cache must be removed");

console.log("cache-service-smoke-test: OK");
