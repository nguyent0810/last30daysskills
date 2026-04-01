# End-to-end API smoke for staging (or local prod: next start + worker).
# Usage:
#   .\scripts\staging-smoke.ps1 -BaseUrl "https://your-app.vercel.app"
#   $env:STAGING_BASE_URL = "https://..."; .\scripts\staging-smoke.ps1
param(
  [string] $BaseUrl = $env:STAGING_BASE_URL,
  [int] $PollSeconds = 180,
  [int] $PollIntervalSec = 3
)

$ErrorActionPreference = "Stop"
if (-not $BaseUrl) {
  Write-Error "Pass -BaseUrl or set STAGING_BASE_URL."
}
$Base = $BaseUrl.TrimEnd("/")

Write-Host "GET $Base/api/health"
$health = Invoke-RestMethod -Uri "$Base/api/health" -Method Get
if (-not $health.ok) { throw "Health check failed" }
Write-Host "  ok: $($health.ok) service=$($health.service)"

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Write-Host "GET $Base/api/session (anonymous)"
$null = Invoke-WebRequest -Uri "$Base/api/session" -WebSession $session -UseBasicParsing
$sess = Invoke-RestMethod -Uri "$Base/api/session" -WebSession $session -Method Get
if (-not $sess.userId) { throw "Session did not return userId" }
Write-Host "  userId: $($sess.userId)"

$topic = "staging smoke $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"
Write-Host "POST $Base/api/jobs topic=$topic"
$bodyObj = @{ topic = $topic }
$jobCreate = Invoke-RestMethod -Uri "$Base/api/jobs" -Method Post -Body ($bodyObj | ConvertTo-Json) -ContentType "application/json; charset=utf-8" -WebSession $session
if (-not $jobCreate.id) { throw "Create job failed" }
$id = $jobCreate.id
Write-Host "  job id: $id status=$($jobCreate.status)"

$deadline = (Get-Date).AddSeconds($PollSeconds)
$last = $null
while ((Get-Date) -lt $deadline) {
  $poll = Invoke-RestMethod -Uri "$Base/api/jobs/$id" -WebSession $session -Method Get
  $last = $poll
  $st = $poll.job.status
  Write-Host "  poll status=$st"
  if ($st -eq "succeeded") { break }
  if ($st -eq "failed") { throw "Job failed: $($poll.job.error)" }
  Start-Sleep -Seconds $PollIntervalSec
}

if (-not $last -or $last.job.status -ne "succeeded") {
  throw "Timed out after ${PollSeconds}s; last status=$($last.job.status)"
}

Write-Host "GET $Base/api/jobs (history)"
$hist = Invoke-RestMethod -Uri "$Base/api/jobs" -WebSession $session -Method Get
$found = $hist.jobs | Where-Object { $_.id -eq $id }
if (-not $found) { throw "Job not listed in history: $id" }
Write-Host "  history contains job id=$id"

$runs = @($last.sourceRuns)
Write-Host "  sourceRuns count: $($runs.Count)"
if ($runs.Count -lt 1) { throw "Expected at least one source run row" }
foreach ($r in $runs) {
  Write-Host "    $($r.source) $($r.status)"
}

if (-not $last.report) { throw "Expected report markdown on success" }
Write-Host "  report length: $($last.report.Length) chars"

Write-Host "PASS: staging smoke OK"
