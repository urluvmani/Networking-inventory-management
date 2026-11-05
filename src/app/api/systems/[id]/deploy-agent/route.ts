import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

// Minimal agent script
const agentScript = `$port = 8765

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
`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let tempScriptPath: string | null = null;

  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    console.log('Deploy agent request for system ID:', id);

    const system = await System.findById(id);

    if (!system) {
      return NextResponse.json(
        { error: 'System not found' },
        { status: 404 }
      );
    }

    if (!system.ipAddress || system.connectionType !== 'IP-based') {
      return NextResponse.json(
        { error: 'System must be IP-based with an IP address' },
        { status: 400 }
      );
    }

    // Support both formats: "username", "DOMAIN\username", or "username@domain"
    let userForPS = username;
    if (username.includes('@')) {
      const [user, domain] = username.split('@');
      userForPS = `${domain}\\${user}`;
    } else if (!username.includes('\\')) {
      userForPS = `bpride.com\\${username}`;
    }

    console.log('Using PowerShell user format:', userForPS);

    // Write deployment script to temporary file
    tempScriptPath = join(process.cwd(), 'temp-deploy.ps1');
    const deployScript = `$ErrorActionPreference = 'Stop'
try {
    # Add IP to TrustedHosts if not already there
    $currentTrustedHosts = (Get-Item WSMan:\\localhost\\Client\\TrustedHosts).Value
    if ($currentTrustedHosts -notlike "*${system.ipAddress}*") {
        if ($currentTrustedHosts) {
            Set-Item WSMan:\\localhost\\Client\\TrustedHosts -Value "$currentTrustedHosts,${system.ipAddress}" -Force
        } else {
            Set-Item WSMan:\\localhost\\Client\\TrustedHosts -Value "${system.ipAddress}" -Force
        }
    }

    $securePassword = ConvertTo-SecureString '${password}' -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential('${userForPS}', $securePassword)

    $scriptBlock = {
        $servicePath = "C:\\InventoryAgent"
        if (-not (Test-Path $servicePath)) {
            New-Item -ItemType Directory -Path $servicePath -Force
        }

        $serviceScript = @'
${agentScript}
'@

        $serviceScript | Out-File -FilePath "$servicePath\\service.ps1" -Encoding UTF8

        # Allow port in firewall
        New-NetFirewallRule -DisplayName "Inventory Agent" -Direction Inbound -LocalPort 8765 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

        # Create scheduled task to run on startup
        $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File \\"$servicePath\\service.ps1\\""
        $trigger = New-ScheduledTaskTrigger -AtStartup
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        Register-ScheduledTask -TaskName "Inventory Agent" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force -ErrorAction SilentlyContinue

        # Start the service immediately
        Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \\"$servicePath\\service.ps1\\"" -WindowStyle Hidden

        Write-Output "SUCCESS:Agent deployed and started"
    }

    $result = Invoke-Command -ComputerName ${system.ipAddress} -Credential $credential -ScriptBlock $scriptBlock
    Write-Output $result
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
}
`;

    writeFileSync(tempScriptPath, deployScript, 'utf-8');

    // Execute the deployment script
    const psResult = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`);
    console.log('PowerShell result:', psResult.stdout);

    if (psResult.stdout.includes('SUCCESS')) {
      return NextResponse.json({
        success: true,
        message: 'Agent deployed successfully. Hardware monitoring is now active.',
      });
    } else if (psResult.stdout.includes('ERROR')) {
      const errorMsg = psResult.stdout.split('ERROR:')[1]?.trim() || 'Unknown error';
      return NextResponse.json(
        { error: `Failed to deploy agent: ${errorMsg}` },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: 'Failed to deploy agent. Check server logs for details.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error deploying agent:', error);
    return NextResponse.json(
      { error: 'Failed to deploy agent: ' + error.message },
      { status: 500 }
    );
  } finally {
    // Clean up temporary file
    if (tempScriptPath) {
      try {
        unlinkSync(tempScriptPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}
