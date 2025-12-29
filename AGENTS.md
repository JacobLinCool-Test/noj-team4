我是臺師大資工系二年級的學生，這學期修了「軟體工程」這門課。
這門課以大型軟體開發實務為主，透過整學期唯一團隊專案（PBL）串起需求、設計、測試、專案管理。

這學期的題目：優化 NOJ 系統。
NOJ 是一個線上判題與課程平台，整合自動批改、作業管理與評測沙盒，支援課程教學與學習統計。

全班被分成「3+1」大組（每組 15 人）。
由於我特別強（擅長 vibe coding），老師讓我自己一個人一組，變成「第四組」。

我想要與其他三組不太一樣：
原本的 NOJ 系統是使用 Vue + Flask + MongoDB 等等，但我打算整個打掉重寫，使用以下框架：
* 前端：Next.js（React＋TypeScript）、Tailwind CSS
* 後端：NestJS（Node.js/TypeScript）
* 資料庫：PostgreSQL ＋ Prisma
* 快取／佇列：Redis ＋ BullMQ
* 檔案儲存：S3 相容（MinIO／AWS S3）
* 評測沙盒：Docker 容器 ＋ nsjail
* 程式編輯器：Monaco Editor
* 認證：Auth.js（NextAuth）＋ JWT
* 部署：Docker Compose → GitHub Actions → Kubernetes

我會這樣選是因為這套網站框架更主流，讓我更有學習意義。
老師也特別同意我：題目不必局限在「優化 NOJ 系統」，我可以打造一個全新的線上解題系統。（我希望主打 AI 功能）

備註：
1. 請使用繁體中文與我對話。
2. 不管我問什麼問題，請你一律先閱讀以下這4份檔案：

- 課綱：`./docs/course-syllabus.txt`
- NOJ 介紹：`./docs/noj-overview.txt`
- NOJ 客戶需求：`./docs/noj-client-requirements.txt`
- NOJ 需求規格書+設計規格書+測試計畫書：`./docs/noj-requirements-design-test-specs.txt`

你可以視情況閱讀以下檔案：

- 整學期上課簡報：`./docs/full-semester-lecture-slides.txt`
- NOJ 舊系統完整程式碼：`./docs/noj-legacy-full-source-code.txt`

3. 未來的問答，若有需要，你可以隨時開啟網路搜尋功能，例如搜尋最新程式官方文檔、論壇討論。
4. 之後我會一直問你問題，如果中途（該步驟）你建議我 git add，你就要主動跟我講，並幫我想好 git commit message（全英文，字數精簡）。
5. 在你的教學中，若需要輸入終端機指令，你應該告訴我要在哪一個目錄下執行。
6. 請你隨時考慮資安問題，不應該撰寫暫時性、省略細節、忽略安全性的程式碼。
7. NOJ 系統的主要主題色：#003865（primary-focus 為 #1e5d8f）。
8. 目前語言切換（以 cookie 維護）僅需支援「繁體中文 (zh-TW)」和「英文 (en)」即可。
--
目前我的環境設在雲端 VM，資訊如下：
Google Cloud（專案ID：noj-team4）
e2-standard-2 (2 個 vCPU, 8 GB 記憶體)
名稱：noj-team4-dev
位置：asia-east1-c
作業系統：Ubuntu 24.04 LTS (x86/64)
類型：已平衡的永久磁碟
儲存空間：100 GB
--
網域：noj4.dev (Cloudflare CDN + Caddy)
Github repository：andyli0123/noj-team4

提醒：
1. 部署/重啟建議順序（避免重啟後找不到 build 產物）：
   - 先啟動 infra（PostgreSQL/Redis/MinIO）：`docker compose -f infra/docker-compose.dev.yml up -d`
   - 再 build：`pnpm --filter api build`、`pnpm --filter web build`
   - 最後用 PM2 重啟（優先）：`pm2 restart ecosystem.config.js --update-env`
2. 並確保 web-prod/web-dev 分別使用 `NEXT_DIST_DIR=.next-prod/.next-dev`，避免共用 `.next` 造成 production build 壞掉。
3. **禁止重置或清空資料庫**：絕對不要使用 `prisma db push --force-reset`、`prisma migrate reset` 或任何會刪除資料的指令。如需修改 schema，請使用 `prisma migrate dev` 建立遷移檔。
