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
    readAsync(callback) { callback(null, this.text); }
    write(text) { this.text = text; this.removed = false; }
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

const context = {
    Array, Date, Error, JSON, Math, Number, Object, String,
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
    }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(
    path.join(root, "src/services/alertCacheService.js"), "utf8"
), context);

let now = Date.parse("2026-08-26T00:10:00Z");
const storage = new MemoryStorage();
const cache = new context.AlertCacheService({
    storage,
    clock: () => now,
    maxAgeMs: 10 * 60 * 1000
});
function load(cacheService, cacheConfig) {
    let result;
    cacheService.loadAsync(cacheConfig, value => { result = value; });
    return result;
}
const unreadableCache = new context.AlertCacheService({ storage: new ErrorStorage() });
assert.strictEqual(load(unreadableCache, { officeCode: "130000", municipalityCode: "1320600" }), null,
    "alert I/O failures must be handled as a cache miss");
assert.ok(unreadableCache.lastError,
    "alert I/O failures must be retained for logging");
const instanceA = new context.AlertCacheService({ uuid: "jma", instanceId: "1" });
const instanceB = new context.AlertCacheService({ uuid: "jma", instanceId: "2" });
assert.notStrictEqual(instanceA._storage.path, instanceB._storage.path,
    "instances must not share alert cache files");
const config = {
    officeCode: "130000",
    municipalityCode: "1320600"
};
const data = {
    provider: "jma-alerts",
    areaCode: "1320600",
    alerts: [{ code: "14", areaCode: "1320600", status: "active" }],
    updatedAt: "2026-08-26T00:09:00Z"
};

assert.strictEqual(cache.save(config, data), true);
assert.ok(storage.text.includes('"schemaVersion":1'));
assert.strictEqual(load(cache, config).data.alerts[0].code, "14");

const otherArea = { ...config, municipalityCode: "1320700" };
assert.strictEqual(load(cache, otherArea), null, "areas must never share alert cache");
assert.strictEqual(storage.removed, false, "signature mismatch must not delete cache");

const otherOffice = { ...config, officeCode: "140000" };
assert.strictEqual(load(cache, otherOffice), null, "offices must never share alert cache");

now += 11 * 60 * 1000;
assert.strictEqual(load(cache, config), null, "stale alert cache must expire");
assert.strictEqual(storage.removed, true);

storage.text = "{broken";
storage.removed = false;
assert.strictEqual(load(cache, config), null, "malformed alert cache must not escape");
assert.ok(cache.lastError);
assert.strictEqual(storage.removed, true);

console.log("alert-cache-service-test: OK");
