# Judge Worker（Docker + nsjail Sandbox）

`apps/judge` 是 BullMQ 的 judge worker：負責把 submission 丟進沙箱編譯/執行，並把結果寫回 DB。

本專案已把「在 host 上直接 spawn 不可信程式碼」改為：

1. 外層：每次 compile / 每個 test case 都用一次性 `docker run --rm` 容器執行（no network、read-only rootfs、drop caps、no-new-privileges、pids/memory/cpu 限制）
2. 內層：容器內用 `nsjail` 再套一層 time/rlimit 限制

> 安全提醒：只要 judge worker 能呼叫 Docker daemon，就等同於持有極高權限；請把 judge worker 放在獨立 VM/節點，並避免把 Docker socket 暴露給其他服務。

## 前置需求

- Docker daemon（judge worker 執行帳號需可執行 `docker`）
- 先建好 sandbox image：見 `infra/sandbox/README.md`

## 重要環境變數

- `NOJ_SANDBOX_IMAGE`：sandbox image tag（預設 `noj4-sandbox:0.1`）
- `NOJ_JUDGE_JOB_ROOT_DIR`：submission job 資料夾根目錄（預設系統 temp 下的 `noj-judge-jobs`）
- `NOJ_JUDGE_CONCURRENCY`：worker concurrency（預設 `1`）

Docker 限制（可視 VM 規格調整）：

- `NOJ_SANDBOX_DOCKER_CPUS`（預設 `1`）
- `NOJ_SANDBOX_DOCKER_MEMORY`（預設 `512m`）
- `NOJ_SANDBOX_DOCKER_PIDS_LIMIT`（預設 `256`）
- `NOJ_SANDBOX_DOCKER_TMPFS_SIZE`（預設 `128m`）
- `NOJ_SANDBOX_OUTPUT_LIMIT_BYTES`（預設 `262144`，stdout/stderr 各自上限）

## 安全回歸測試（惡意程式）

在 `apps/judge` 目錄執行：

```bash
pnpm sandbox:security
```

此腳本會驗證：fork bomb、無網路、rootfs 唯讀、大量輸出、超時、爆記憶體都能被限制住且不會拖垮 host。

