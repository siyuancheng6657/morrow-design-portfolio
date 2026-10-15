param(
    [ValidateSet('Start', 'Stop', 'Status')][string]$Action = 'Start',
    [switch]$OpenBrowser
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$serverScript = Join-Path $PSScriptRoot 'serve-local.mjs'
$stateDirectory = Join-Path $projectRoot '.local'
$siteUrl = 'http://127.0.0.1:5188/'
$stateFile = Join-Path $stateDirectory 'server.json'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-OwnService {
    try {
        $request = [System.Net.HttpWebRequest]::Create($siteUrl + '__morrow_health')
        $request.Proxy = $null
        $request.Timeout = 1200
        $request.ReadWriteTimeout = 1200
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream(), [System.Text.Encoding]::UTF8)
        $reply = $reader.ReadToEnd() | ConvertFrom-Json
        if ($reply.app -eq 'morrow-local' -and $reply.project -eq $projectRoot) {
            $running = Get-CimInstance Win32_Process -Filter "ProcessId=$([int]$reply.pid)" -ErrorAction SilentlyContinue
            if ($running.Name -eq 'node.exe' -and $running.CommandLine -match [regex]::Escape($serverScript)) { return $running }
        }
    } catch { return $null }
    finally {
        if ($reader) { $reader.Dispose() }
        if ($response) { $response.Dispose() }
    }
    return $null
}

try {
    New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null
    $lock = [System.IO.File]::Open((Join-Path $stateDirectory 'control.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    $running = Get-OwnService
    if ($Action -eq 'Stop') {
        # An unresponsive website may still have an owned Node process.
        $entryPattern = '(?:^|\s)"?' + [regex]::Escape($serverScript) + '"?(?=\s|$)'
        $ownedServers = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match $entryPattern })
        foreach ($ownedServer in $ownedServers) {
            Stop-Process -Id $ownedServer.ProcessId -ErrorAction Stop
            Wait-Process -Id $ownedServer.ProcessId -Timeout 10 -ErrorAction SilentlyContinue
            $remaining = Get-CimInstance Win32_Process -Filter "ProcessId=$($ownedServer.ProcessId)" -ErrorAction SilentlyContinue
            if ($remaining -and $remaining.CreationDate -eq $ownedServer.CreationDate) { throw 'The local website process is still running after the stop request.' }
        }
        if (Get-NetTCPConnection -State Listen -LocalPort 5188 -ErrorAction SilentlyContinue) {
            throw 'Port 5188 is still in use. Any process not identified as this MORROW website was left unchanged.'
        }
        if (Test-Path -LiteralPath $stateFile) { Remove-Item -LiteralPath $stateFile }
        if ($ownedServers.Count -gt 0) { Write-Host 'MORROW website stopped.' }
        else { Write-Host 'MORROW website is not running. No other process was changed.' }
        exit 0
    }
    if ($Action -eq 'Status') {
        if ($running) { Write-Host "Running: $siteUrl (PID $($running.ProcessId))" }
        else { Write-Host 'MORROW website is not running.' }
        exit 0
    }
    if (-not $running) {
        if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) { throw 'Website build is missing. Run pnpm build in the project folder.' }
        $listener = Get-NetTCPConnection -State Listen -LocalPort 5188 -ErrorAction SilentlyContinue
        if ($listener) { throw 'Port 5188 is in use by another service. Nothing was stopped.' }
        $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
        $nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else { $null }
        if (-not $nodeExecutable) {
            $bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
            if (Test-Path -LiteralPath $bundledNode) { $nodeExecutable = $bundledNode }
        }
        if (-not $nodeExecutable) { throw 'Node.js was not found. Install Node.js 22 or newer, then start again.' }
        $child = Start-Process -FilePath $nodeExecutable -ArgumentList @('"' + $serverScript + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $stateDirectory 'server.log') -RedirectStandardError (Join-Path $stateDirectory 'server-error.log') -PassThru
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            Start-Sleep -Milliseconds 150
            $running = Get-OwnService
            if ($running) { break }
            $child.Refresh()
            if ($child.HasExited) { throw 'Website startup failed. See .local/server-error.log.' }
        }
        if (-not $running) {
            $failedChild = Get-CimInstance Win32_Process -Filter "ProcessId=$($child.Id)" -ErrorAction SilentlyContinue
            if ($failedChild.Name -eq 'node.exe' -and $failedChild.CommandLine -match [regex]::Escape($serverScript)) {
                Stop-Process -Id $child.Id -ErrorAction SilentlyContinue
            }
            throw 'Website did not respond in time. See .local/server-error.log.'
        }
        $state = @{ pid = $running.ProcessId; url = $siteUrl; project = $projectRoot; startedAt = (Get-Date).ToString('o') } | ConvertTo-Json
        [System.IO.File]::WriteAllText($stateFile, $state, $utf8)
    }
    Write-Host "MORROW is ready: $siteUrl"
    if ($OpenBrowser) { Start-Process $siteUrl }
} catch {
    Write-Host ('MORROW: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
} finally {
    if ($lock) { $lock.Dispose() }
}
