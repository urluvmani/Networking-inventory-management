# Inventory Agent - Hardware Monitoring Service
# This script runs as a background service and exposes hardware details via HTTP

$Port = 8765
$ServiceName = "InventoryAgent"

function Get-HardwareDetails {
    try {
        $ram = Get-WmiObject Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
        $disk = Get-WmiObject Win32_LogicalDisk | Where-Object { $_.DeviceID -eq 'C:' }
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
        return @{ error = $_.Exception.Message } | ConvertTo-Json
    }
}

function Start-AgentServer {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://+:$Port/")
    $listener.Start()

    Write-Host "Inventory Agent started on port $Port"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        if ($request.Url.LocalPath -eq "/hardware") {
            $hardwareData = Get-HardwareDetails
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($hardwareData)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } elseif ($request.Url.LocalPath -eq "/health") {
            $response.StatusCode = 200
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("OK")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } else {
            $response.StatusCode = 404
        }

        $response.Close()
    }
}

function Install-Agent {
    Write-Host "Installing Inventory Agent..."

    # Create service directory
    $servicePath = "C:\InventoryAgent"
    if (-not (Test-Path $servicePath)) {
        New-Item -ItemType Directory -Path $servicePath -Force
    }

    # Copy script to service path
    $scriptPath = $MyInvocation.MyCommand.Path
    Copy-Item $scriptPath -Destination "$servicePath\inventory-agent.ps1" -Force

    # Create service script
    $serviceScript = @'
$agentPath = "C:\InventoryAgent\inventory-agent.ps1"
$port = 8765

function Get-HardwareDetails {
    try {
        $ram = Get-WmiObject Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
        $disk = Get-WmiObject Win32_LogicalDisk | Where-Object { $_.DeviceID -eq 'C:' }
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
        return @{ error = $_.Exception.Message } | ConvertTo-Json
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$port/")
$listener.Start()

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    if ($request.Url.LocalPath -eq "/hardware") {
        $hardwareData = Get-HardwareDetails
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($hardwareData)
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
    } elseif ($request.Url.LocalPath -eq "/health") {
        $response.StatusCode = 200
        $buffer = [System.Text.Encoding]::UTF8.GetBytes("OK")
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
    } else {
        $response.StatusCode = 404
    }

    $response.Close()
}
'@

    $serviceScript | Out-File -FilePath "$servicePath\service.ps1" -Encoding UTF8

    # Allow port in firewall
    New-NetFirewallRule -DisplayName "Inventory Agent" -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

    # Create scheduled task to run on startup
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$servicePath\service.ps1`""
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    Register-ScheduledTask -TaskName "Inventory Agent" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force -ErrorAction SilentlyContinue

    # Start the service immediately
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$servicePath\service.ps1`"" -WindowStyle Hidden

    Write-Host "Inventory Agent installed successfully!"
    Write-Host "Service will start automatically on system boot."
    Write-Host "Current status: Running on port $Port"
}

function Uninstall-Agent {
    Write-Host "Uninstalling Inventory Agent..."

    # Stop any running processes
    Get-Process powershell | Where-Object { $_.CommandLine -like "*inventory-agent*" } | Stop-Process -Force -ErrorAction SilentlyContinue

    # Remove scheduled task
    Unregister-ScheduledTask -TaskName "Inventory Agent" -Confirm:$false -ErrorAction SilentlyContinue

    # Remove firewall rule
    Remove-NetFirewallRule -DisplayName "Inventory Agent" -ErrorAction SilentlyContinue

    # Remove service directory
    Remove-Item -Path "C:\InventoryAgent" -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host "Inventory Agent uninstalled successfully!"
}

# Main execution
$command = $args[0]

switch ($command) {
    "install" { Install-Agent }
    "uninstall" { Uninstall-Agent }
    "start" { Start-AgentServer }
    default {
        Write-Host "Usage: .\inventory-agent.ps1 [install|uninstall|start]"
        Write-Host "  install   - Install agent as Windows service"
        Write-Host "  uninstall - Remove agent from system"
        Write-Host "  start     - Start agent server (for testing)"
    }
}
