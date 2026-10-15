param(
    [ValidateSet('Start', 'Stop', 'Status', 'Run')][string]$Action = 'Start'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$scriptFile = Join-Path $PSScriptRoot 'keep-awake.ps1'
$stateDirectory = Join-Path $projectRoot '.local'
$stateFile = Join-Path $stateDirectory 'keep-awake.json'
$heartbeatFile = Join-Path $stateDirectory 'keep-awake-request.txt'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$hash = [System.Security.Cryptography.SHA256]::Create()
try { $scope = ([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectRoot.ToLowerInvariant())))).Replace('-', '').Substring(0,24) }
finally { $hash.Dispose() }
$eventName = 'Local\MORROW_StopAwake_' + $scope

function Get-OwnWorker {
    try {
        $saved = [IO.File]::ReadAllText($stateFile, [Text.Encoding]::UTF8) | ConvertFrom-Json
        if ($saved.project -ne $projectRoot) { return $null }
        $running = Get-CimInstance Win32_Process -Filter "ProcessId=$([int]$saved.pid)" -ErrorAction SilentlyContinue
        if ($running.Name -ne 'powershell.exe' -or $running.CommandLine -notmatch [regex]::Escape($scriptFile) -or $running.CommandLine -notmatch '-Action\s+Run') { return $null }
        $process = Get-Process -Id $saved.pid -ErrorAction Stop
        if ($process.StartTime.ToUniversalTime().Ticks.ToString() -ne [string]$saved.startTicks) { return $null }
        return $running
    } catch { return $null }
}

function Test-Ready {
    try {
        if (-not (Test-Path -LiteralPath $heartbeatFile)) { return $false }
        $content = [IO.File]::ReadAllText($heartbeatFile, [Text.Encoding]::UTF8)
        return $content.StartsWith('ES_CONTINUOUS | ES_SYSTEM_REQUIRED; accepted=0x') -and (([DateTime]::UtcNow - [IO.File]::GetLastWriteTimeUtc($heartbeatFile)).TotalSeconds -lt 20)
    } catch { return $false }
}

try {
    New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null
    if ($Action -eq 'Run') {
        $workerLock = [IO.File]::Open((Join-Path $stateDirectory 'keep-awake-worker.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
        $stopEvent = New-Object System.Threading.EventWaitHandle($false, [System.Threading.EventResetMode]::ManualReset, $eventName)
        $stopEvent.Reset() | Out-Null
        $ownProcess = Get-Process -Id $PID
        $state = @{ pid = $PID; startTicks = $ownProcess.StartTime.ToUniversalTime().Ticks.ToString(); project = $projectRoot; startedAt = [DateTime]::UtcNow.ToString('o'); purpose = 'Prevent automatic sleep while MORROW is shared'; eventName = $eventName } | ConvertTo-Json
        [IO.File]::WriteAllText($stateFile, $state, $utf8)
        Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Runtime.InteropServices;
public static class MorrowAwake {
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint SetThreadExecutionState(uint flags);
    public static void Hold(EventWaitHandle stop, string heartbeat) {
        uint previous = SetThreadExecutionState(0x80000001u);
        if (previous == 0) throw new InvalidOperationException("Windows rejected the temporary sleep request.");
        try {
            do {
                File.WriteAllText(heartbeat, "ES_CONTINUOUS | ES_SYSTEM_REQUIRED; accepted=0x" + previous.ToString("X8") + "; utc=" + DateTime.UtcNow.ToString("o"), new UTF8Encoding(false));
            } while (!stop.WaitOne(3000));
        } finally {
            SetThreadExecutionState(0x80000000u);
            if (File.Exists(heartbeat)) File.Delete(heartbeat);
        }
    }
}
'@
        [MorrowAwake]::Hold($stopEvent, $heartbeatFile)
        exit 0
    }

    $controlLock = [IO.File]::Open((Join-Path $stateDirectory 'keep-awake-control.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    $running = Get-OwnWorker
    if ($Action -eq 'Stop') {
        if ($running) {
            try {
                $stopEvent = [Threading.EventWaitHandle]::OpenExisting($eventName)
                $stopEvent.Set() | Out-Null
            } catch { }
            for ($attempt = 0; $attempt -lt 40; $attempt++) {
                Start-Sleep -Milliseconds 100
                if (-not (Get-OwnWorker)) { break }
            }
            $remaining = Get-OwnWorker
            if ($remaining) { Stop-Process -Id $remaining.ProcessId -ErrorAction Stop }
        }
        if (Test-Path -LiteralPath $heartbeatFile) { Remove-Item -LiteralPath $heartbeatFile }
        if (Test-Path -LiteralPath $stateFile) { Remove-Item -LiteralPath $stateFile }
        Write-Host 'MORROW temporary sleep prevention stopped. Original power settings remain in effect.'
        exit 0
    }
    if ($Action -eq 'Status') {
        if ($running -and (Test-Ready)) {
            Write-Host "MORROW automatic sleep prevention is active (PID $($running.ProcessId))."
            Write-Host ([IO.File]::ReadAllText($heartbeatFile, [Text.Encoding]::UTF8))
        } else { Write-Host 'MORROW automatic sleep prevention is not active.' }
        exit 0
    }
    if ($running -and -not (Test-Ready)) { throw 'An owned sleep-prevention process is not ready. Run -Action Stop, then Start again.' }
    if (-not $running) {
        if (Test-Path -LiteralPath $heartbeatFile) { Remove-Item -LiteralPath $heartbeatFile }
        $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $arguments = '-NoLogo -NoProfile -ExecutionPolicy Bypass -File "' + $scriptFile + '" -Action Run'
        $child = Start-Process -FilePath $powershell -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $stateDirectory 'keep-awake.log') -RedirectStandardError (Join-Path $stateDirectory 'keep-awake-error.log') -PassThru
        for ($attempt = 0; $attempt -lt 70; $attempt++) {
            Start-Sleep -Milliseconds 150
            $running = Get-OwnWorker
            if ($running -and (Test-Ready)) { break }
            $child.Refresh()
            if ($child.HasExited) { throw 'Sleep prevention failed. See .local/keep-awake-error.log.' }
        }
        if (-not $running -or -not (Test-Ready)) { throw 'Sleep prevention did not become ready. Run -Action Stop and see .local/keep-awake-error.log.' }
    }
    Write-Host "MORROW automatic sleep prevention is active (PID $($running.ProcessId))."
    Write-Host 'The screen may turn off normally. Manual sleep, lid closing, restart and low-battery actions are unchanged.'
} catch {
    Write-Host ('MORROW: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
} finally {
    if ($stopEvent) { $stopEvent.Dispose() }
    if ($workerLock) { $workerLock.Dispose() }
    if ($controlLock) { $controlLock.Dispose() }
}
