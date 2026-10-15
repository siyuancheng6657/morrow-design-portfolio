param(
    [ValidateSet('Start', 'Stop', 'Status')][string]$Action = 'Start',
    [switch]$OpenBrowser
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$stateDirectory = Join-Path $projectRoot '.local'
$stateFile = Join-Path $stateDirectory 'public-share.json'
$linkFile = Join-Path $projectRoot 'PUBLIC-URL.txt'
$sshExecutable = Join-Path $env:SystemRoot 'System32\OpenSSH\ssh.exe'
$powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$awakeScript = Join-Path $PSScriptRoot 'keep-awake.ps1'
$knownHosts = Join-Path $stateDirectory 'share_known_hosts'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-OwnedTunnel($saved) {
    if (-not $saved -or -not $saved.pid) { return $null }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$([int]$saved.pid)" -ErrorAction SilentlyContinue
    if ($process.Name -eq 'ssh.exe' -and $process.CommandLine.Contains($knownHosts) -and $process.CommandLine.Contains('80:127.0.0.1:5188') -and $process.CommandLine.Contains('nokey@localhost.run') -and $process.CreationDate.ToUniversalTime().ToString('o') -eq $saved.createdAt) { return $process }
    return $null
}

function Test-PublicSite([string]$url) {
    if ($url -notmatch '^https://[a-z0-9-]+\.(lhr\.life|localhost\.run)/?$') { return $false }
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $request = [System.Net.HttpWebRequest]::Create($url)
        $request.Proxy = $null
        $request.Method = 'HEAD'
        $request.Timeout = 6000
        $request.ReadWriteTimeout = 6000
        $response = $request.GetResponse()
        return $response.StatusCode -eq 200 -and $response.Headers['X-Morrow-Server'] -eq 'local-static-v1'
    } catch { return $false }
    finally { if ($response) { $response.Dispose() } }
}

function Stop-OwnedTunnel($saved) {
    $running = Get-OwnedTunnel $saved
    if ($running) {
        Stop-Process -Id $running.ProcessId -ErrorAction Stop
        Wait-Process -Id $running.ProcessId -Timeout 10 -ErrorAction SilentlyContinue
        if (Get-OwnedTunnel $saved) { throw 'The public connection is still running after the stop request.' }
    }
    if (Test-Path -LiteralPath $stateFile) { Remove-Item -LiteralPath $stateFile }
    if (Test-Path -LiteralPath $linkFile) { Remove-Item -LiteralPath $linkFile }
}

try {
    New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null
    $lock = [System.IO.File]::Open((Join-Path $stateDirectory 'share-control.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    if ($Action -eq 'Stop') {
        $stopFailures = @()
        try {
            $saved = if (Test-Path -LiteralPath $stateFile) { Get-Content -LiteralPath $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
            Stop-OwnedTunnel $saved
        }
        catch { $stopFailures += ('Public connection: ' + $_.Exception.Message) }
        try {
            if (Test-Path -LiteralPath $awakeScript) {
                & $powerShell -NoProfile -ExecutionPolicy Bypass -File $awakeScript -Action Stop
                if ($LASTEXITCODE -ne 0) { throw 'Temporary sleep prevention could not stop.' }
            }
        } catch { $stopFailures += ('Sleep prevention: ' + $_.Exception.Message) }
        try {
            & $powerShell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'local-site.ps1') -Action Stop
            if ($LASTEXITCODE -ne 0) { throw 'The local website could not stop.' }
        } catch { $stopFailures += ('Local website: ' + $_.Exception.Message) }
        if ($stopFailures.Count -gt 0) {
            throw ('Shutdown incomplete. ' + ($stopFailures -join ' '))
        }
        Write-Host 'MORROW public sharing and local website stopped. Temporary sleep prevention released.'
        exit 0
    }
    $saved = if (Test-Path -LiteralPath $stateFile) { Get-Content -LiteralPath $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
    $running = Get-OwnedTunnel $saved
    $healthy = $running -and (Test-PublicSite $saved.url)
    if ($Action -eq 'Status') {
        if ($healthy) { Write-Host ('Available: ' + $saved.url) }
        else { Write-Host 'Public sharing is unavailable. Start sharing again to create a working link.' }
        exit 0
    }
    & $powerShell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'local-site.ps1') -Action Start
    if ($LASTEXITCODE -ne 0) { throw 'The local website could not start.' }
    if (-not $healthy) {
        Stop-OwnedTunnel $saved
        if (-not (Test-Path -LiteralPath $sshExecutable)) { throw 'Windows OpenSSH client was not found.' }
        $runId = [Guid]::NewGuid().ToString('N')
        $stdoutFile = Join-Path $stateDirectory ('share-' + $runId + '.out.log')
        $stderrFile = Join-Path $stateDirectory ('share-' + $runId + '.err.log')
        $sshArguments = @('-F', 'NUL', '-n', '-T', '-o', 'StrictHostKeyChecking=accept-new', '-o', ('UserKnownHostsFile="' + $knownHosts + '"'), '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'IdentityFile=none', '-o', 'IdentityAgent=none', '-o', 'ConnectTimeout=12', '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3', '-o', 'ExitOnForwardFailure=yes', '-R', '80:127.0.0.1:5188', 'nokey@localhost.run', '--', '--output', 'json')
        $child = Start-Process -FilePath $sshExecutable -ArgumentList $sshArguments -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile -PassThru
        $created = Get-CimInstance Win32_Process -Filter "ProcessId=$($child.Id)"
        $saved = @{ pid = $child.Id; createdAt = $created.CreationDate.ToUniversalTime().ToString('o'); url = ''; stdout = $stdoutFile; stderr = $stderrFile }
        [System.IO.File]::WriteAllText($stateFile, ($saved | ConvertTo-Json), $utf8)
        for ($attempt = 0; $attempt -lt 90; $attempt++) {
            Start-Sleep -Milliseconds 500
            $child.Refresh()
            if ($child.HasExited) { throw ('Public connection exited. See ' + $stderrFile) }
            $output = if (Test-Path -LiteralPath $stdoutFile) { Get-Content -LiteralPath $stdoutFile -Raw -Encoding UTF8 } else { '' }
            if ([string]::IsNullOrEmpty($output)) { continue }
            $urlMatch = [regex]::Match([string]$output, 'https://[a-z0-9-]+\.(?:lhr\.life|localhost\.run)')
            if ($urlMatch.Success) {
                $saved.url = $urlMatch.Value + '/'
                if (Test-PublicSite $saved.url) { $healthy = $true; break }
            }
        }
        if (-not $healthy) { throw ('Public connection did not become ready. See ' + $stderrFile) }
        [System.IO.File]::WriteAllText($stateFile, ($saved | ConvertTo-Json), $utf8)
    }
    [System.IO.File]::WriteAllText($linkFile, ($saved.url + [Environment]::NewLine), $utf8)
    if (Test-Path -LiteralPath $awakeScript) {
        & $powerShell -NoProfile -ExecutionPolicy Bypass -File $awakeScript -Action Start
        if ($LASTEXITCODE -ne 0) { throw 'Public link is ready, but the temporary awake helper could not start.' }
    }
    Write-Host ('Public link ready: ' + $saved.url)
    if ($OpenBrowser) { Start-Process $saved.url }
} catch {
    if ($child) { Stop-OwnedTunnel $saved }
    $failure = 'MORROW: ' + $_.Exception.Message + [Environment]::NewLine + $_.ScriptStackTrace
    [System.IO.File]::WriteAllText((Join-Path $stateDirectory 'share-last-error.txt'), $failure, $utf8)
    Write-Host $failure -ForegroundColor Red
    exit 1
} finally {
    if ($lock) { $lock.Dispose() }
}
