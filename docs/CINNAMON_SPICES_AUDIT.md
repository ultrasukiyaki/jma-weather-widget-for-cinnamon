# Cinnamon Spices readiness audit

## Scope

- Audit date: 2026-07-26 (Asia/Tokyo)
- JWA commit: `f06afce470aed388db9194db78308d5e063d664b`
- JWA release: `v3.2.0`
- UUID: `jma-weather@10yendama.com`
- GitHub author: `ultrasukiyaki`
- Official Spices commit: `7fa5a40e64e42aeaf4d0838eef31006fb80790ae`

Primary sources reviewed:

- Official repository README
- `.github/CONTRIBUTING.md`
- `.github/copilot-instructions.md`
- `validate-spice`
- `test-spice`
- `cinnamon-spices-makepot`
- Recent additions: Llama.cpp Metrics Monitor, Meeting Bar and Snippitor
- Existing network and Python applets

## Summary

The applet is functionally healthy and its existing automated tests pass. It cannot be submitted directly from the JWA source layout. The reproducible staging build supplies the required Spices structure, an ASCII runtime metadata description, website metadata, screenshot and runtime icon without changing JWA runtime behavior.

The new root `icon.png` is the official source candidate. It is copied unchanged to the required runtime location. It must not appear at the Spices submission root because the official validator forbids a root-level `icon.png`.

## Findings

| Severity | Area | Finding | Remediation | Runtime impact |
|---|---|---|---|---|
| PASS | Git identity | UUID and GitHub author match the intended submission identity. | None. | None |
| PASS | Tests | Existing JWA test suite passes. | Keep tests passing. | None |
| PASS | Network | Runtime requests use HTTPS, asynchronous Soup I/O and a timeout. | Document JMA and Open-Meteo access. | None |
| PASS | Lifecycle | Timers, settings monitor and HTTP session are cleaned up on removal. | None. | None |
| PASS | Cache location | Weather cache is stored below the user cache directory, not the installation directory. | Document storage. | None |
| PASS | Icon | PNG is valid, square, 1024×1024 and contains transparency. | Copy unchanged to the runtime directory. | None |
| PASS | Screenshot 01 | Valid 1169×2104 PNG showing current, hourly, regional and weekly data. | Use as `screenshot.png`. | None |
| BLOCKER | Structure | Native JWA layout is not a Spices UUID tree. | Generate the official structure with the build script. | None |
| BLOCKER | Metadata | Native Japanese description contains Unicode rejected by `validate-spice`. | Use the ASCII English submission metadata. | Display text only |
| BLOCKER | Required files | `info.json`, `screenshot.png` and runtime `icon.png` are absent from a native source checkout. | Generate them in staging. | None |
| PASS | Command launch | Settings fallback uses an argument-array launch with a separate instance-ID argument. | None. | None |
| HIGH | Python settings | Python runtime files are accepted in existing applets, but a Python external configuration app has limited direct precedent. | Validate on Cinnamon 6.6 and explain dependencies. | None |
| PASS | Cache reads | Weather and alert cache reads/removals use asynchronous Gio I/O; missing caches are normal cache misses. | None. | None |
| MEDIUM | Localization | Fixed UI strings are hard-coded Japanese and no gettext catalog exists. | Plan gettext work for a later minor release. | UI string refactor |
| MEDIUM | Screenshot 02 | Browser content is visible behind the settings window. | Omit it; crop a derived image only if later needed. | None |
| MEDIUM | Configured URLs | User-configured detail and radar URIs are opened by the default handler without an HTTPS scheme restriction. | Consider validating allowed schemes separately. | Minor behavior change |
| UNKNOWN | Asset rights | Repository licensing does not itself prove ownership of the new PNG and every SVG source. | Author confirms submission rights. | None |
| UNKNOWN | Platform dependency | `/usr/bin/python3`, PyGObject and GTK 3 must be present. | Verify on the target Cinnamon system. | None |

## Structure and packaging

Required website files:

- `info.json`
- `screenshot.png`
- optional `README.md`

Required download layout:

- `files/jma-weather@10yendama.com/metadata.json`
- `files/jma-weather@10yendama.com/applet.js`
- `files/jma-weather@10yendama.com/icon.png`
- all runtime modules, data, SVG assets, settings files and license

Development tests, GitHub Release scripts, installers, release notes, archives and compiled Python files are excluded.

## Metadata

`spices/metadata.json` retains UUID, name, version, instance limit, Cinnamon target and external configuration entry. Only the description is changed to an ASCII English description required by the official validator. The official validator accepts both numeric and string versions in current examples and does not enforce a version type.

No `icon` field is added because the official validator forbids it.

## Screenshots and icon

- `screenshot_01.png`: valid PNG, 1169×2104, opaque; selected as the website screenshot.
- `screenshot_02.png`: valid PNG, 1417×1274, opaque; excluded because unrelated browser content is visible behind the settings window.
- `icon.png`: valid PNG, 1024×1024, transparent, visually identifies weather and Japan; copied unchanged.

The official validator checks only that the runtime icon is square. It defines no maximum byte size, recommended pixel dimensions, padding or screenshot dimensions.

## License

JWA declares the MIT License. Current Spices examples declare licenses in `info.json` and may include a runtime LICENSE file. The staging tree declares MIT and includes JWA's LICENSE. No license conversion is proposed.

The author must confirm that the PNG and SVG assets can be submitted under the declared terms. JMA and Open-Meteo data are accessed remotely and are not vendored.

## Security and privacy

Expected network endpoints are JMA and Open-Meteo, including Open-Meteo geocoding. The applet sends only the selected area code or coordinates necessary for forecasts. No account, credential, advertising, analytics or tracking code was found.

The main settings launch and Cinnamon settings fallbacks use argument arrays. User-selected detail and radar URLs use the desktop default URI handler.

## Lifecycle and asynchronous I/O

The applet tracks refresh generations, serializes refreshes, ignores callbacks after destruction, removes timers, disconnects and cancels the settings monitor, aborts the Soup session and finalizes settings.

HTTP is asynchronous. Python settings network work runs on worker threads. Weather and alert cache reads/removals use asynchronous Gio I/O; delayed cache reads are gated so they cannot overwrite newer network data.

## Localization

Fixed applet and settings UI strings are Japanese. JMA-supplied Japanese forecast text and place data are distinct from those fixed strings. Translation support is not a current validator blocker. A later gettext change should add a POT and source PO files using `cinnamon-spices-makepot`; compiled MO files must not be committed.

## Python settings

The settings program uses `/usr/bin/python3`, PyGObject and GTK 3. It stores settings below `XDG_CONFIG_HOME`, uses atomic replacement, and performs network access away from the GTK main thread. Both Python entry files retain executable mode in staging.

## Version recommendation

Keep `v3.2.0` for documentation, metadata and packaging-only changes. Treat command launch, URI validation or cache I/O changes as separate runtime work and a possible `v3.2.1`. Treat gettext/UI restructuring as a later minor release.

## Validation

Results are recorded in `docs/CINNAMON_SPICES_VALIDATION.log`. The approved official `test-spice` run completed successfully and installed a `devtest-` copy. Panel placement and runtime behavior were manually verified on Cinnamon 6.6.9.

## Remaining manual checks

- Confirm rights to submit the PNG and SVG assets.
- Test the external Python configuration window on Cinnamon 6.6.
- Test light and dark desktop themes.
- Confirm the screenshot represents the intended release UI.
