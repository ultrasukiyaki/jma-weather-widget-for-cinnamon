# v3.0.0-beta.1 release commands

```bash
git switch -c feature/v3-cache-resilience

./test.sh
./install.sh
```

Cinnamon実機確認後:

```bash
git add .
git commit -m "feat: add persistent weather cache and refresh resilience" \
  -m "- restore last-good provider data at startup
- track fresh, previous, cache, and missing provider states
- serialize overlapping refresh requests with generation gating
- classify timeout, HTTP, JSON, network, and parse failures
- show stale-data status and suppress notifications from cached-only data
- add cache corruption and partial-failure smoke tests"

git push -u origin feature/v3-cache-resilience
```
