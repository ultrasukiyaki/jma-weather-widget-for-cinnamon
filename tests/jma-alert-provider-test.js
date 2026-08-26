#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = { Array, Date, Error, JSON, Map, Number, Object, Set, String };
vm.createContext(context);
vm.runInContext(
    fs.readFileSync(path.join(root, "src/providers/jmaAlertProvider.js"), "utf8"),
    context
);

const provider = new context.JmaAlertProvider({ getJson() {} });
const fixture = JSON.parse(fs.readFileSync(
    path.join(root, "tests/fixtures/jma-alerts.json"),
    "utf8"
));
const config = {
    officeCode: "130000",
    municipalityCode: "1320600",
    areaName: "府中市"
};

assert.ok(provider.buildUrl(config).endsWith("/warning/data/r8/130000.json"));
assert.throws(() => provider.buildUrl({ officeCode: "13" }), /6桁/);

const parsed = provider.parse(fixture, config, new Date("2026-08-26T00:06:00Z"));
assert.strictEqual(parsed.alerts.length, 3, "warning plus two advisories expected");
assert.strictEqual(parsed.alerts.filter(alert => alert.level === 2).length, 2,
    "multiple advisories expected");
assert.strictEqual(parsed.alerts[0].name, "レベル4大雨危険警報");
assert.strictEqual(parsed.alerts[0].severity, "dangerous_warning");
assert.strictEqual(parsed.alerts[0].level, 4);
assert.strictEqual(parsed.alerts[0].status, "active");
assert.strictEqual(parsed.alerts[1].severity, "advisory");
assert.strictEqual(parsed.alerts.find(alert => alert.code === "21").status, "continued");
assert.strictEqual(parsed.alerts[0].areaCode, "1320600");
assert.strictEqual(parsed.alerts[0].areaName, "府中市");
assert.strictEqual(parsed.alerts[0].updatedAt, null, "missing source field must stay null");
assert.strictEqual(parsed.reportDatetime, "2026-08-26T09:05:00+09:00");

const noAlerts = JSON.parse(JSON.stringify(fixture));
for (const report of noAlerts)
    report.warning.class20Items[0].kinds = [{ status: "発表警報・注意報はなし" }];
assert.strictEqual(provider.parse(noAlerts, config).alerts.length, 0);

const cancelled = JSON.parse(JSON.stringify(fixture));
cancelled[0].warning.class20Items[0].kinds = [{ code: "43", status: "解除" }];
const cancelledParsed = provider.parse(cancelled, config);
assert.ok(!cancelledParsed.alerts.some(alert => alert.code === "43"));
assert.ok(cancelledParsed.cancelledAlerts.some(alert => alert.status === "cancelled"));

const unknown = JSON.parse(JSON.stringify(noAlerts));
unknown[1].warning.class20Items[0].kinds = [{ code: "99", status: "発表" }];
const unknownParsed = provider.parse(unknown, config);
assert.strictEqual(unknownParsed.alerts[0].severity, "unknown");
assert.ok(unknownParsed.alerts[0].name.includes("99"));

const levels = [
    ["33", 5, "emergency_warning"],
    ["03", 3, "warning"],
    ["10", 2, "advisory"],
    ["49", 4, "dangerous_warning"],
    ["38", 5, "emergency_warning"],
    ["05", 3, "warning"],
    ["12", 2, "advisory"],
    ["37", 5, "emergency_warning"]
];
for (const [code, level, severity] of levels) {
    const payload = JSON.parse(JSON.stringify(noAlerts));
    payload[0].warning.class20Items[0].kinds = [{ code, status: "発表" }];
    const alert = provider.parse(payload, config).alerts[0];
    assert.strictEqual(alert.level, level, `wrong level for ${code}`);
    assert.strictEqual(alert.severity, severity, `wrong severity for ${code}`);
}

const continued = parsed.alerts.map(alert => ({ ...alert, status: "continued" }));
assert.strictEqual(context.newAlerts(parsed.alerts, continued).length, 0,
    "active to continued must not notify again");
assert.strictEqual(context.newAlerts(parsed.alerts, [
    ...continued,
    { ...continued[0], rawType: "VPWW60", code: "06" }
]).length, 1, "only the new alert must notify");
assert.strictEqual(context.newAlerts(parsed.alerts, []).length, 0,
    "cancellation must not be a new alert");
assert.notStrictEqual(
    context.alertIdentity(parsed.alerts[0]),
    context.alertIdentity({ ...parsed.alerts[0], status: "cancelled" }),
    "notification identity must include normalized status"
);

assert.throws(() => provider.parse({}, config), /形式/);
assert.throws(() => provider.parse(fixture, {
    ...config,
    municipalityCode: "9999999"
}), /見つかりません/);
assert.throws(() => provider.parse(fixture, {
    ...config,
    municipalityCode: "bad"
}), /7桁/);

console.log("jma-alert-provider-test: OK");
