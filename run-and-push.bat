@echo off
REM run-and-push.bat
REM اجرای تست‌های cypress و ارسال نتیجه به n8n. توسط Task Scheduler هر ساعت اجرا می‌شود.
REM آدرس webhook n8n را اینجا تنظیم کن (Production URL نود Webhook):
set N8N_WEBHOOK_URL=https://YOUR-N8N-HOST/webhook/cypress-report

cd /d C:\Users\me.moslemi\Desktop\cypress-e2e
node "C:\Users\me.moslemi\Desktop\cypress-e2e\push-results-to-n8n.js" >> "C:\Users\me.moslemi\Desktop\cypress-e2e\hourly-run.log" 2>&1
