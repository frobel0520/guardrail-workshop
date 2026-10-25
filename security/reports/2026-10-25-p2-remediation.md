# SEC-P2-20261025：guardrail-workshop

日期：2026-10-25。基準：3cee8c6e40845ad33ff567a6a1e9c6ddc902f6df（main）。

狀態：隔離修補已備妥，待整合。未推送／合併／部署；原始工作目錄保留。

Vite7.3.7及受影響傳遞依賴修補；Python33個解析版本加約束；CI權限明確read及固定Action SHA。

- 既有24個Python guard／API fixture測試
- 前端型別及build
- npm及Python解析依賴公告0；付費模型與真實輸出品質未評分

npm公告：{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}。
Python公告：0個獨立命中／33個解析版本。



效能：{"beforeGzipBytes":85196,"afterGzipBytes":85196,"growth":0,"thresholdGrowth":0.05,"result":"pass","scope":"Local gzip bundle size, not production latency"}。

範圍與成本：只跑本機及合成fixture，不啟用付費API或遠端CI。沒有完整正式安全或發布驗收；未評項目not_scored。

- 原始工作目錄、未提交修改與分支全部保留；本報告僅適用此隔離分支。
- 完整history／秘密輪替／正式服務與二進位鑑識不在此輪驗收，未評項目not_scored。

Task契約：輸入為固定基準及既有測試；交付為獨立修補分支、manifest/lockfile或來源修補與此去敏證據；無跨專案依賴。驗收是原生工具成功、已知發現逐項處置、適當真實回歸及影響範圍效能門檻；未完成項目明記，不以fixture代表正式環境。
