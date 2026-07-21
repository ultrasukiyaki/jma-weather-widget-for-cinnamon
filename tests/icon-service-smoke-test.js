#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = { Number, Set, String };
vm.createContext(context);
vm.runInContext(
    fs.readFileSync(path.join(root, "src/services/iconService.js"), "utf8"),
    context,
    { filename: "iconService.js" }
);

const service = new context.IconService(root);

assert.strictEqual(service.jmaIconName("100"), "clear-day");
assert.strictEqual(service.jmaIconName("200"), "cloudy");
assert.strictEqual(service.jmaIconName("300"), "rain");
assert.strictEqual(service.jmaIconName("400"), "snow");
assert.strictEqual(service.openMeteoIconName(0, 1), "clear-day");
assert.strictEqual(service.openMeteoIconName(0, 0), "clear-night");
assert.strictEqual(service.openMeteoIconName(2, 0), "partly-cloudy-night");
assert.strictEqual(service.openMeteoIconName(45, 1), "fog");
assert.strictEqual(service.openMeteoIconName(65, 1), "heavy-rain");
assert.strictEqual(service.openMeteoIconName(95, 1), "thunderstorm");
assert.strictEqual(service.currentIconName("100", 95, 1), "thunderstorm");
assert.strictEqual(service.currentIconName("100", null, 1), "clear-day");
assert.ok(service.iconPath("rain").endsWith("/icons/rain.svg"));
assert.ok(service.iconPath("../../bad").endsWith("/icons/unknown.svg"));

for (const name of [
    "clear-day", "clear-night", "partly-cloudy-day", "partly-cloudy-night",
    "cloudy", "fog", "drizzle", "rain", "heavy-rain", "sleet", "snow",
    "thunderstorm", "unknown", "warning"
]) {
    assert.ok(fs.existsSync(service.iconPath(name)), `missing SVG: ${name}`);
}

console.log("icon-service-smoke-test: OK");
