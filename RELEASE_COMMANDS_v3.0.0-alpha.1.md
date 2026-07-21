# v3.0.0-alpha.1 Release Commands

```bash
git switch -c feature/v3-provider-architecture
```

展開したファイルをリポジトリへ反映したあと:

```bash
./test.sh
git status
git diff --stat
git add .
git commit -m "feat: introduce v3 provider architecture"
git push -u origin feature/v3-provider-architecture
```

確認後にタグを作成:

```bash
git switch main
git pull --ff-only
git tag -a v3.0.0-alpha.1 -m "JMA Weather Widget v3.0.0-alpha.1"
git push origin v3.0.0-alpha.1
```
