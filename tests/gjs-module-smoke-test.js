"use strict";

const GLib = imports.gi.GLib;

const root = GLib.build_filenamev([GLib.get_current_dir(), "src"]);
imports.searchPath.unshift(root);

const WeatherUtils = imports.utils.weatherUtils;
const WeatherData = imports.models.weatherData;

if (WeatherUtils.asNumber("12.5") !== 12.5)
    throw new Error("weatherUtils failed to load under GJS");

const snapshot = new WeatherData.WeatherSnapshot();
if (!snapshot)
    throw new Error("WeatherSnapshot failed to load under GJS");

print("gjs module smoke test: OK");
