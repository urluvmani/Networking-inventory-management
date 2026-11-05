# Remote Agent Deployment using PSExec
# Download PSExec from: https://learn.microsoft.com/en-us/sysinternals/downloads/psexec

param(
    [Parameter(Mandatory=$true)]
    [string]$TargetComputer,
    [Parameter(Mandatory=$true)]
    [string]$Username,
    [Parameter(Mandatory=$true)]
    [string]$Password
)

# PSExec path (update if different)
$psexecPath = ".\PsExec.exe"

# Agent script
$agentScript = @'
$port = 8765

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

# Deployment commands
$commands = @(
    "mkdir C:\InventoryAgent",
    "echo '$agentScript' > C:\InventoryAgent\service.ps1",
    "netsh advfirewall firewall add rule name=`"Inventory Agent`" dir=in action=allow protocol=TCP localport=8765",
    "schtasks /create /tn `"Inventory Agent`" /tr `"powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\InventoryAgent\service.ps1`" /sc onstart /ru SYSTEM /rl highest /f",
    "start powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\InventoryAgent\service.ps1"
)

foreach ($cmd in $commands) {
    & $psexecPath \\$TargetComputer -u $Username -p $Password cmd /c $cmd
}

Write-Host "Agent deployed to $TargetComputer"
