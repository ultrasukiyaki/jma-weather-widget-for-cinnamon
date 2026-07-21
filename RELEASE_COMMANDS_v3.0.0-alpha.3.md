# v3.0.0-alpha.3 release commands

```bash
git switch -c feature/v3-svg-icons

./test.sh
./install.sh
```

Cinnamon実機確認後:

```bash
git add .
git commit -m "feat: add SVG weather icons across the applet" \
  -m "- add provider-neutral IconService mappings
- render bundled SVGs in the panel and forecast popup
- add configurable popup icon sizes
- fall back to the active icon theme when SVG loading fails
- add SVG and icon mapping smoke tests"

git push -u origin feature/v3-svg-icons
```
