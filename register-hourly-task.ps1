# register-hourly-task.ps1
# این اسکریپت یک Scheduled Task ویندوز می‌سازد که هر ۱ ساعت یکبار
# run-and-push.bat را اجرا می‌کند (اجرای cypress + ارسال نتیجه به n8n).
#
# اجرا: کلیک راست → Run with PowerShell  (یا در ترمینال PowerShell اجرا کن)
# توجه: چون تست‌ها headed هستند، Task باید در همان session لاگین‌شده‌ی شما اجرا شود
#       تا پنجره مرورگر بتواند باز شود (به همین دلیل -RunLevel و کاربر فعلی استفاده می‌شود).

$ErrorActionPreference = 'Stop'

$taskName = 'Cypress E2E Hourly Run'
$batPath  = 'C:\Users\me.moslemi\Desktop\cypress-e2e\run-and-push.bat'

if (-not (Test-Path $batPath)) {
  Write-Error "Batch file not found: $batPath"
  exit 1
}

# اگر از قبل وجود دارد، حذفش کن
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Removed existing task: $taskName"
}

$action = New-ScheduledTaskAction -Execute $batPath

# هر ۱ ساعت، به مدت نامحدود، شروع از الان
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Hours 1) `
  -RepetitionDuration ([TimeSpan]::MaxValue)

# در session فعلی کاربر اجرا شود (لازم برای headed browser)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings -Description 'Runs Cypress e2e-final-tests hourly and pushes results to n8n webhook.'

Write-Host ""
Write-Host "Scheduled Task '$taskName' created. Runs every 1 hour." -ForegroundColor Green
Write-Host "Test it now with:" -ForegroundColor Yellow
Write-Host "    Start-ScheduledTask -TaskName '$taskName'"
Write-Host "Remove it later with:" -ForegroundColor Yellow
Write-Host "    Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
