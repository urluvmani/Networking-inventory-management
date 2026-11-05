# Inventory Agent - Installation Script
# For GPO Deployment: Place in \\your-domain\SYSVOL\your-domain\Policies\{PolicyID}\Machine\Scripts\Startup
# For Manual Installation: Run as Administrator on target system

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$serviceName = "InventoryAgent"
$servicePath = "C:\InventoryAgent"
$scriptPath = "$servicePath\service.ps1"
$port = 8765

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Inventory Agent Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if agent is already installed
if (Test-Path $scriptPath) {
    # Check if scheduled task exists
    $taskExists = Get-ScheduledTask -TaskName "Inventory Agent" -ErrorAction SilentlyContinue
    if ($taskExists) {
        # Check if agent process is already running
        $agentRunning = Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*$scriptPath*" }
        if ($agentRunning) {
            # Agent already installed and running, skip installation
            Write-Host "Inventory Agent already installed and running on $env:COMPUTERNAME" -ForegroundColor Green
            exit 0
        } else {
            # Agent installed but not running, start it
            Write-Host "Inventory Agent installed but not running, starting..." -ForegroundColor Yellow
            Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`"" -WindowStyle Hidden
            exit 0
        }
    }
}

# Create service directory
Write-Host "Creating agent directory: $servicePath" -ForegroundColor Gray
if (-not (Test-Path $servicePath)) {
    New-Item -ItemType Directory -Path $servicePath -Force | Out-Null
    Write-Host "Directory created successfully" -ForegroundColor Green
} else {
    Write-Host "Directory already exists" -ForegroundColor Yellow
}

# Agent service script with better error handling and logging
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
        $disks = Get-WmiObject Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
        $cpu = Get-WmiObject Win32_Processor | Select-Object -First 1
        $os = Get-WmiObject Win32_OperatingSystem
        $motherboard = Get-WmiObject Win32_BaseBoard

        $ramGB = if ($ram) { [math]::Round($ram.Sum / 1GB, 0) } else { 0 }

        # Get all drives as a formatted string
        $diskInfo = @()
        foreach ($disk in $disks) {
            $diskGB = [math]::Round($disk.Size / 1GB, 0)
            $diskInfo += "$($disk.DeviceID): $diskGB GB"
        }
        $disksString = if ($diskInfo.Count -gt 0) { $diskInfo -join ", " } else { "No drives found" }

        $details = @{
            ram = "$ramGB GB"
            hardDisk = $disksString
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

# Write agent script
Write-Host "Writing agent script: $scriptPath" -ForegroundColor Gray
$agentScript | Out-File -FilePath $scriptPath -Encoding UTF8
Write-Host "Agent script written successfully" -ForegroundColor Green

# Allow port in firewall
Write-Host "Configuring firewall rule for port $port" -ForegroundColor Gray
New-NetFirewallRule -DisplayName "Inventory Agent" -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
Write-Host "Firewall rule configured" -ForegroundColor Green

# Reserve URL for the port (requires admin rights)
Write-Host "Reserving URL for port $port" -ForegroundColor Gray
try {
    netsh http add urlacl url="http://+:$port/" user="Everyone" | Out-Null
    Write-Host "URL reservation added successfully" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not add URL reservation (requires admin rights)" -ForegroundColor Yellow
}

# Remove old task if exists
Write-Host "Removing old scheduled task (if exists)" -ForegroundColor Gray
Unregister-ScheduledTask -TaskName "Inventory Agent" -Confirm:$false -ErrorAction SilentlyContinue

# Create scheduled task to run on startup with SYSTEM account
Write-Host "Creating scheduled task for auto-start" -ForegroundColor Gray
try {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    Register-ScheduledTask -TaskName "Inventory Agent" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -User "SYSTEM" -Force -ErrorAction Stop
    Write-Host "Scheduled task created successfully" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not create scheduled task. Agent will run manually for now." -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Start the service immediately
Write-Host "Starting agent service..." -ForegroundColor Gray
try {
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`"" -WindowStyle Hidden
    Write-Host "Agent started successfully" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not start agent" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Agent installed on: $env:COMPUTERNAME" -ForegroundColor White
Write-Host "Listening on port: $port" -ForegroundColor White
Write-Host "Auto-start: Enabled (Scheduled Task)" -ForegroundColor White
Write-Host ""
Write-Host "You can now fetch hardware details from the web application." -ForegroundColor Green
Write-Host ""
