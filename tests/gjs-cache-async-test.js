"use strict";

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const root = GLib.build_filenamev([GLib.get_current_dir(), "src"]);
imports.searchPath.unshift(root);

const CacheService = imports.services.cacheService;
const AlertCacheService = imports.services.alertCacheService;

const directory = GLib.dir_make_tmp("jwa-cache-async-test-XXXXXX");
const weatherPath = GLib.build_filenamev([directory, "weather.json"]);
const alertPath = GLib.build_filenamev([directory, "alerts.json"]);
const loop = GLib.MainLoop.new(null, false);

function fail(message) {
    printerr(message);
    GLib.unlink(weatherPath);
    GLib.unlink(alertPath);
    GLib.rmdir(directory);
    loop.quit();
    throw new Error(message);
}

const weatherStorage = new CacheService.FileCacheStorage(weatherPath);
const alertStorage = new AlertCacheService.AlertFileCacheStorage(alertPath);

weatherStorage.readAsync((error, text) => {
    if (error || text !== null)
        fail("weather cache NOT_FOUND must be a cache miss");

    GLib.file_set_contents(weatherPath, "weather");
    weatherStorage.readAsync((readError, readText) => {
        if (readError || readText !== "weather")
            fail("weather cache asynchronous read failed");

        weatherStorage.removeAsync(removeError => {
            if (removeError)
                fail("weather cache asynchronous remove failed");

            weatherStorage.removeAsync(removeAgainError => {
                if (removeAgainError)
                    fail("weather cache repeated remove must ignore NOT_FOUND");

                alertStorage.readAsync((alertError, alertText) => {
                    if (alertError || alertText !== null)
                        fail("alert cache NOT_FOUND must be a cache miss");

                    GLib.file_set_contents(alertPath, "alerts");
                    alertStorage.readAsync((alertReadError, alertReadText) => {
                        if (alertReadError || alertReadText !== "alerts")
                            fail("alert cache asynchronous read failed");

                        alertStorage.removeAsync(alertRemoveError => {
                            if (alertRemoveError)
                                fail("alert cache asynchronous remove failed");
                            GLib.rmdir(directory);
                            print("gjs cache async test: OK");
                            loop.quit();
                        });
                    });
                });
            });
        });
    });
});

loop.run();
