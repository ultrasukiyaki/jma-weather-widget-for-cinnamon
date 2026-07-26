# Pull request draft

## Title

```text
jma-weather@10yendama.com: add JMA Weather Japan applet
```

## Body

```markdown
## Summary

Adds JMA Weather Japan, a weather applet for the Cinnamon panel.

## Features

- JMA regional and weekly forecasts
- Open-Meteo current estimates and hourly forecasts
- Hourly precipitation amount, wind and UV
- Japanese prefecture and municipality configuration
- Persistent last-good cache and partial-provider fallback

## Network access

- Japan Meteorological Agency
- Open-Meteo

Forecast requests send the selected JMA area code or coordinates needed to retrieve weather data. No analytics, advertising or user-account access is used.

## Validation

- [x] `./validate-spice jma-weather@10yendama.com`
- [x] `./test-spice jma-weather@10yendama.com`
- [x] Tested on Cinnamon 6.6.9
- [x] Existing JWA automated tests pass

## Source

https://github.com/ultrasukiyaki/jma-weather-widget-for-cinnamon
```
