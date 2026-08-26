#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = {
    Array, Boolean, Date, Error, JSON, Map, Math, Number, Object, Set, String
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(
    path.join(root, "src/services/alertService.js"), "utf8"
), context);
vm.runInContext(fs.readFileSync(
    path.join(root, "src/models/weatherData.js"), "utf8"
), context);

const freshData = { provider: "jma-alerts", alerts: [{ code: "14" }] };
const success = new context.AlertService({
    fetch(_config, callback) { callback(null, freshData); }
});
let result = null;
success.refresh({}, null, value => { result = value; });
assert.strictEqual(result.state, "fresh");
assert.strictEqual(result.data, freshData);

const timeout = new Error("timed out");
timeout.kind = "timeout";
const failure = new context.AlertService({
    fetch(_config, callback) { callback(timeout, null); }
});
failure.refresh({}, freshData, value => { result = value; });
assert.strictEqual(result.state, "previous");
assert.strictEqual(result.data, freshData);
assert.ok(result.error.includes("タイムアウト"));

failure.refresh({}, null, value => { result = value; });
assert.strictEqual(result.state, "missing");
assert.strictEqual(result.data, null);

let online = false;
const recovering = new context.AlertService({
    fetch(_config, callback) {
        if (!online) {
            callback(timeout, null);
            return;
        }
        callback(null, freshData);
    }
});
recovering.refresh({}, freshData, value => { result = value; });
assert.strictEqual(result.state, "previous", "offline data must be marked previous");
online = true;
recovering.refresh({}, result.data, value => { result = value; });
assert.strictEqual(result.state, "fresh", "online recovery must replace previous data");

const snapshot = new context.WeatherSnapshot();
snapshot.setAlertResult({
    data: { alerts: [{ code: "43", level: 4 }] },
    state: "fresh",
    error: null
});
assert.strictEqual(snapshot.alerts.length, 1);
assert.strictEqual(snapshot.highestAlertLevel(), 4);
assert.strictEqual(snapshot.isAlertFresh(), true);
const previous = context.WeatherSnapshot.fromPrevious(snapshot);
assert.strictEqual(previous.alertState, "previous");
assert.strictEqual(previous.alerts.length, 1);

console.log("alert-service-resilience-test: OK");
