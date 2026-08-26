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

    readAsync(callback) {
        callback(null, this.text);
    }

    write(text) {
        this.text = text;
        this.removed = false;
    }

    removeAsync(callback) {
        this.text = null;
        this.removed = true;
        callback(null);
    }
}

class ErrorStorage {
    readAsync(callback) { callback(new Error("disk unavailable"), null); }
    write() {}
    removeAsync(callback) { callback(null); }
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
                    get_user_cache_dir: () => "/tmp",
                    path_get_dirname: value => path.dirname(value),
                    mkdir_with_parents: () => 0,
                    file_set_contents: () => true
                },
                Gio: { IOErrorEnum: { NOT_FOUND: 1 } }
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

function load(cache, config) {
    let result;
    cache.loadAsync(config, value => { result = value; });
    return result;
}

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

const unreadableCache = new cacheModule.CacheService({ storage: new ErrorStorage() });
assert.strictEqual(load(unreadableCache, config), null,
    "I/O failures must be handled as a cache miss");
assert.ok(unreadableCache.lastError, "I/O failures must be retained for logging");

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

const loaded = load(cache, config);
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
assert.strictEqual(load(cache, otherConfig), null, "location mismatch must not restore cache");
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
const mixedLoaded = load(mixedCache, config);
assert.strictEqual(mixedLoaded.jma, null, "old provider data must not be extended by a partial refresh");
assert.ok(mixedLoaded.openMeteo, "fresh provider data must remain cacheable");

now += 2 * 60 * 60 * 1000;
assert.strictEqual(load(cache, config), null, "expired cache must be ignored");
assert.strictEqual(storage.removed, true, "expired cache must be removed");

storage.text = "{broken json";
storage.removed = false;
assert.strictEqual(load(cache, config), null, "corrupt cache must not escape");
assert.ok(cache.lastError);
assert.strictEqual(storage.removed, true, "corrupt cache must be removed");

console.log("cache-service-smoke-test: OK");
