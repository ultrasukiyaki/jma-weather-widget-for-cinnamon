# Cinnamon Spices submission procedure

## Inputs

- JWA source branch: `chore/cinnamon-spices-readiness`
- UUID: `jma-weather@10yendama.com`
- Author: `ultrasukiyaki`
- Official repository: `linuxmint/cinnamon-spices-applets`

The root `icon.png` is the source-of-truth submission icon. The build script copies it without modification to `files/jma-weather@10yendama.com/icon.png`. A root-level icon is not included because the official validator forbids it.

## Build and validate

Clone the official repository outside this repository:

```bash
official_dir="$(mktemp -d)"
git clone --depth=1 \
  https://github.com/linuxmint/cinnamon-spices-applets.git \
  "$official_dir/cinnamon-spices-applets"
```

Generate and validate the staging tree:

```bash
./tools/build-cinnamon-spice.sh \
  --validator-repo "$official_dir/cinnamon-spices-applets"
```

The generated tree is under:

```text
dist/cinnamon-spices/jma-weather@10yendama.com
```

`dist/` is ignored and must not be committed.

## Optional local test

The official `test-spice` script installs a development copy under:

```text
~/.local/share/cinnamon/applets/devtest-jma-weather@10yendama.com
```

Copy the generated UUID directory into a clean official checkout, then run:

```bash
./test-spice jma-weather@10yendama.com
```

This step changes the local Cinnamon installation and must be explicitly approved first. Remove development copies with:

```bash
./test-spice -r
```

Note that `-r` removes all `devtest-` applets, not only JWA.

## Fork and pull request

After local verification:

1. Fork `linuxmint/cinnamon-spices-applets` on GitHub.
2. Create a topic branch from the official `master`.
3. Copy the generated UUID directory to the official repository root.
4. Run `./validate-spice jma-weather@10yendama.com`.
5. Commit only `jma-weather@10yendama.com/`.
6. Push the topic branch to the fork.
7. Open one pull request for this applet.

Use this title format:

```text
jma-weather@10yendama.com: add JMA Weather Japan applet
```

Do not modify the JWA `v3.2.0` tag or push directly to either repository's protected branch.

## Updating the applet

For a later JWA release, update the runtime source and `spices/metadata.json`, regenerate the tree, validate it, and submit only the UUID directory to the official repository.

## Rollback

- Staging only: remove `dist/cinnamon-spices/jma-weather@10yendama.com`.
- Local test: run the official `./test-spice -r`; be aware it removes every `devtest-` applet.
- Unpushed branch: switch to `main`, then delete the topic branch.
- Pushed fork branch: delete that remote branch.
- Pull request: close it; the GitHub history remains visible.
