#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = { Array, Boolean, Date, Math, Number, String };
vm.createContext(context);
vm.runInContext(fs.readFileSync(
    path.join(root, "src/utils/weatherUtils.js"), "utf8"
), context);

const format = context.formatPrecipitationProbability;
const icon = context.shouldShowPrecipitationIcon;
const value = context.shouldShowPrecipitationValue;

assert.strictEqual(format(0), "0%");
assert.strictEqual(icon(0), false);
assert.strictEqual(value(0), true);
assert.strictEqual(format(1), "☔1%");
assert.strictEqual(format(100), "☔100%");
for (const missing of [null, undefined, NaN, -1, 101, Infinity]) {
    assert.strictEqual(format(missing), "", `invalid value rendered: ${missing}`);
    assert.strictEqual(icon(missing), false);
    assert.strictEqual(value(missing), false);
}
assert.strictEqual(format(60, false), "", "disabled value must be hidden");
assert.strictEqual(icon(60, false), false, "disabled icon must be hidden");

assert.notStrictEqual(format(1), format(0), "1% to 0% must change presentation");
assert.notStrictEqual(format(0), format(1), "0% to 1% must change presentation");
assert.strictEqual(format(0), format(0), "0% to 0% must stay stable");
assert.notStrictEqual(format(null), format(0), "missing to 0% must become valid");
assert.notStrictEqual(format(0), format(null), "0% to missing must become missing");

console.log("precipitation-presentation-test: OK");
