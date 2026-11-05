# One-Click Inventory Agent Setup
# Run this script as Administrator on any system to enable hardware monitoring
# After running, the system will be permanently accessible from your web application

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Inventory Agent One-Click Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click the script and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Configuration
$servicePath = "C:\InventoryAgent"
$scriptPath = "$servicePath\service.ps1"
$logPath = "$servicePath\agent.log"
$port = 8765

Write-Host "Step 1: Creating service directory..." -ForegroundColor Yellow
if (-not (Test-Path $servicePath)) {
    New-Item -ItemType Directory -Path $servicePath -Force | Out-Null
    Write-Host "✓ Created: $servicePath" -ForegroundColor Green
} else {
    Write-Host "✓ Directory already exists" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 2: Creating agent script..." -ForegroundColor Yellow
$agentScript = @'
$port = 8765
$logPath = "C:\InventoryAgent\agent.log"

function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $message" | Out-File -FilePath $logPath -Append
}

function Get-HardwareDetails {
    try {
        $ram = Get-WmiObject Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
        $disk = Get-WmiObject Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }
        $cpu = Get-WmiObject Win32_Processor | Select-Object -First 1
        $os = Get-WmiObject Win32_OperatingSystem
        $motherboard = Get-WmiObject Win32_BaseBoard

        $ramGB = if ($ram) { [math]::Round($ram.Sum / 1GB, 0) } else { 0 }
        $diskGB = if ($disk) { [math]::Round($disk.Size / 1GB, 0) } else { 0 }

        $details = @{
            ram = "$ramGB GB"
            hardDisk = "$diskGB GB"
            cpu = if ($cpu) { $cpu.Name } else { "Unknown" }
            os = if ($os) { $os.Caption } else { "Unknown" }
            motherboard = if ($motherboard) { $motherboard.Product } else { "Unknown" }
        }

        return $details | ConvertTo-Json
    } catch {
        Write-Log "Error in Get-HardwareDetails: $($_.Exception.Message)"
        return @{ error = $_.Exception.Message } | ConvertTo-Json
    }
}

try {
    Write-Log "Starting Inventory Agent on port $port"

    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://+:$port/")
    $listener.Start()

    Write-Log "Listener started successfully"

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            if ($request.Url.LocalPath -eq "/hardware") {
                $hardwareData = Get-HardwareDetails
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($hardwareData)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                Write-Log "Hardware details served"
            } elseif ($request.Url.LocalPath -eq "/health") {
                $response.StatusCode = 200
                $buffer = [System.Text.Encoding]::UTF8.GetBytes("OK")
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            } else {
                $response.StatusCode = 404
            }

            $response.Close()
        } catch {
            Write-Log "Error handling request: $($_.Exception.Message)"
        }
    }
} catch {
    Write-Log "Fatal error: $($_.Exception.Message)"
}
'@

$agentScript | Out-File -FilePath $scriptPath -Encoding UTF8
Write-Host "✓ Agent script created" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Configuring firewall..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Inventory Agent" -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
Write-Host "✓ Firewall rule added" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Creating scheduled task..." -ForegroundColor Yellow
Unregister-ScheduledTask -TaskName "Inventory Agent" -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartOnFailure -RestartInterval (New-TimeSpan -Minutes 1) -RestartCount 3
Register-ScheduledTask -TaskName "Inventory Agent" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -User "SYSTEM" -Force | Out-Null
Write-Host "✓ Scheduled task created (auto-start on boot)" -ForegroundColor Green
Write-Host ""

Write-Host "Step 5: Starting agent service..." -ForegroundColor Yellow
Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`"" -WindowStyle Hidden
Write-Host "✓ Agent started" -ForegroundColor Green
Write-Host ""

Write-Host "Step 6: Testing connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $testResult = Invoke-RestMethod -Uri "http://localhost:$port/hardware" -TimeoutSec 5
    Write-Host "✓ Agent is responding correctly" -ForegroundColor Green
    Write-Host ""
    Write-Host "System Hardware Details:" -ForegroundColor Cyan
    Write-Host "  RAM: $($testResult.ram)" -ForegroundColor White
    Write-Host "  Disk: $($testResult.hardDisk)" -ForegroundColor White
    Write-Host "  CPU: $($testResult.cpu)" -ForegroundColor White
    Write-Host "  OS: $($testResult.os)" -ForegroundColor White
} catch {
    Write-Host "⚠ Warning: Could not test connection immediately" -ForegroundColor Yellow
    Write-Host "  This is normal - the agent will start on next reboot" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "System Name: $env:COMPUTERNAME" -ForegroundColor White
Write-Host "IP Address: $((Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' }).IPAddress)" -ForegroundColor White
Write-Host "Agent Port: $port" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Add this system to your web application with its IP address" -ForegroundColor White
Write-Host "2. The agent will automatically start on system boot" -ForegroundColor White
Write-Host "3. Use the 'Fetch Hardware Details' button in your web app" -ForegroundColor White
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "  Log file: $logPath" -ForegroundColor Gray
Write-Host "  Check task: Get-ScheduledTask -TaskName 'Inventory Agent'" -ForegroundColor Gray
Write-Host "  Start manually: Start-ScheduledTask -TaskName 'Inventory Agent'" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
pause
