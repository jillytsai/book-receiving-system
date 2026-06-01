@echo off
chcp 65001 >nul
echo 正在啟動圖書點收系統伺服器，請稍候...
echo 如果瀏覽器沒有自動開啟，請手動前往 http://localhost:5173
start http://localhost:5173
npm run dev
pause
