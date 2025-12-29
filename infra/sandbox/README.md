# NOJ4 Sandbox Image（Docker + nsjail）

這個資料夾提供 `noj4-sandbox` Docker 映像檔，給 `apps/judge` 在評測時用 `docker run` 啟動一次性容器來執行：

- 編譯（compile）
- 執行（run）

容器內使用 `nsjail` 作為第二層限制（time / rlimit），外層再由 `docker run` 套用硬限制（no-network、read-only rootfs、drop caps 等）。

## 建置

在專案根目錄執行：

```bash
docker build -f infra/sandbox/Dockerfile -t noj4-sandbox:0.1 infra/sandbox
```

若要釘死 nsjail 版本（供應鏈安全），可指定：

```bash
docker build \
  --build-arg NSJAIL_GIT_REF=<tag-or-commit-sha> \
  -f infra/sandbox/Dockerfile \
  -t noj4-sandbox:0.1 \
  infra/sandbox
```

## 容器內介面（entrypoint）

`ENTRYPOINT` 為 `noj-sandbox`，提供：

- `noj-sandbox compile <C|CPP|JAVA|PYTHON>`
- `noj-sandbox run <C|CPP|JAVA|PYTHON> --time-limit-ms <ms> --memory-limit-kb <kb> --stdout-file <path> --stderr-file <path>`

`/work` 需由 host volume mount 進來，並包含：

- `/work/src`：來源碼（由 judge 寫入）
- `/work/build`：編譯產物（由 compile 產出）
- `/work/out`：執行時輸出（stdout/stderr 檔案）

