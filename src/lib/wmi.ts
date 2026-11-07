import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

function escapePowershellString(str: string): string {
  return str.replace(/'/g, "''");
}

export interface HardwareDetails {
  ram?: string;
  hardDisk?: string;
  cpu?: string;
  os?: string;
  motherboard?: string;
  adminPassword?: string;
  defaultGateway?: string;
}

const PASSWORDS = ['P@$$C00', 'Pride', 'com123', 'Capital.com'];

export async function detectAdminPassword(
  ip: string,
  username?: string,
  password?: string
): Promise<string | undefined> {
  const wmiUser = username || process.env.WMI_USER;
  const wmiPassword = password || process.env.WMI_PASSWORD;

  if (!wmiUser || !wmiPassword) {
    console.log('WMI credentials not provided. Cannot detect admin password.');
    return undefined;
  }

  let userForWMI = wmiUser;
  if (wmiUser.includes('@')) {
    const [user, domain] = wmiUser.split('@');
    userForWMI = `${domain}\\${user}`;
  } else if (!wmiUser.includes('\\')) {
    userForWMI = `bpride.com\\${wmiUser}`;
  }

  console.log('Detecting admin password for system:', ip);

  for (const adminPass of PASSWORDS) {
    try {
      const psScript = `$ErrorActionPreference = 'Stop'; try { $securePassword = ConvertTo-SecureString '${escapePowershellString(adminPass)}' -AsPlainText -Force; $credential = New-Object System.Management.Automation.PSCredential('${escapePowershellString(userForWMI)}', $securePassword); $scriptBlock = { Write-Output "SUCCESS" }; $result = Invoke-Command -ComputerName ${ip} -Credential $credential -ScriptBlock $scriptBlock -ErrorAction Stop; Write-Output $result } catch { Write-Output "ERROR:$($_.Exception.Message)" }`;

      const psResult = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`);

      if (psResult.stdout.includes('SUCCESS')) {
        console.log('Admin password detected:', adminPass);
        return adminPass;
      }
    } catch (error) {
      // Password didn't work, try next one
      continue;
    }
  }

  console.log('No matching admin password found');
  return undefined;
}

export async function getRemoteHardwareDetails(
  ip: string,
  username?: string,
  password?: string
): Promise<HardwareDetails> {
  const details: HardwareDetails = {};

  const wmiUser = username || process.env.WMI_USER;
  const wmiPassword = password || process.env.WMI_PASSWORD;

  if (!wmiUser || !wmiPassword) {
    console.log('WMI credentials not provided. Hardware details sync requires credentials.');
    return details;
  }

  // Support both formats: "username", "DOMAIN\username", or "username@domain"
  let userForWMI = wmiUser;
  if (wmiUser.includes('@')) {
    // Convert "user@domain" to "domain\user"
    const [user, domain] = wmiUser.split('@');
    userForWMI = `${domain}\\${user}`;
  } else if (!wmiUser.includes('\\')) {
    // Auto-add bpride.com domain if no domain specified
    userForWMI = `bpride.com\\${wmiUser}`;
  }

  console.log('Using WMI user format:', userForWMI);

  try {
    // Try PowerShell Remoting with Invoke-Command (requires WinRM enabled)
    try {
      console.log('Attempting PowerShell Remoting...');

      const psScript = `$ErrorActionPreference = 'Stop'; try { $securePassword = ConvertTo-SecureString '${escapePowershellString(wmiPassword)}' -AsPlainText -Force; $credential = New-Object System.Management.Automation.PSCredential('${escapePowershellString(userForWMI)}', $securePassword); $scriptBlock = { $ram = Get-WmiObject Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum; $disks = Get-WmiObject Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | Sort-Object DeviceID; $cpu = Get-WmiObject Win32_Processor | Select-Object -First 1; $os = Get-WmiObject Win32_OperatingSystem; $motherboard = Get-WmiObject Win32_BaseBoard; $gateway = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Select-Object -ExpandProperty NextHop -ErrorAction SilentlyContinue); if (-not $gateway) { $gateway = (Get-WmiObject Win32_IP4RouteTable | Where-Object { $_.Destination -eq "0.0.0.0" } | Select-Object -ExpandProperty NextHop -ErrorAction SilentlyContinue) }; $ramGB = [math]::Round($ram.Sum / 1GB, 0); $diskInfo = @(); foreach ($disk in $disks) { $diskGB = [math]::Round($disk.Size / 1GB, 0); $freeGB = [math]::Round($disk.FreeSpace / 1GB, 0); $diskInfo += $disk.DeviceID + ' ' + $diskGB + ' GB' + ' (Free: ' + $freeGB + ' GB)' }; $disksString = if ($diskInfo.Count -gt 0) { $diskInfo -join '; ' } else { 'No drives found' }; @{ RAM = $ramGB; DISK = $disksString; CPU = $cpu.Name; OS = $os.Caption; MOTHERBOARD = $motherboard.Product; GATEWAY = $gateway } }; $result = Invoke-Command -ComputerName ${ip} -Credential $credential -ScriptBlock $scriptBlock; Write-Output "RAM:$($result.RAM)"; Write-Output "DISK:$($result.DISK)"; Write-Output "CPU:$($result.CPU)"; Write-Output "OS:$($result.OS)"; Write-Output "MOTHERBOARD:$($result.MOTHERBOARD)"; Write-Output "GATEWAY:$($result.GATEWAY)" } catch { Write-Output "ERROR:$($_.Exception.Message)" }`;

      const psResult = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`);
      console.log('PowerShell result:', psResult.stdout);

      const lines = psResult.stdout.split('\n');
      for (const line of lines) {
        if (line.startsWith('ERROR:')) {
          console.log('PowerShell error:', line.replace('ERROR:', '').trim());
          throw new Error(line.replace('ERROR:', '').trim());
        }
        if (line.startsWith('RAM:')) {
          const ramVal = line.replace('RAM:', '').trim();
          if (ramVal !== '0') {
            details.ram = ramVal + ' GB';
          }
        } else if (line.startsWith('DISK:')) {
          const diskVal = line.replace('DISK:', '').trim();
          if (diskVal !== '0') {
            details.hardDisk = diskVal + ' GB';
          }
        } else if (line.startsWith('CPU:')) {
          const cpuVal = line.replace('CPU:', '').trim();
          if (cpuVal !== 'Unknown') {
            details.cpu = cpuVal;
          }
        } else if (line.startsWith('OS:')) {
          const osVal = line.replace('OS:', '').trim();
          if (osVal !== 'Unknown') {
            details.os = osVal;
          }
        } else if (line.startsWith('MOTHERBOARD:')) {
          const mbVal = line.replace('MOTHERBOARD:', '').trim();
          if (mbVal !== 'Unknown') {
            details.motherboard = mbVal;
          }
        } else if (line.startsWith('GATEWAY:')) {
          const gatewayVal = line.replace('GATEWAY:', '').trim();
          if (gatewayVal && gatewayVal !== '') {
            details.defaultGateway = gatewayVal;
          }
        }
      }

      if (Object.keys(details).length > 0) {
        console.log('PowerShell Remoting successful, details:', details);
        return details;
      }
    } catch (psError: any) {
      console.log('PowerShell Remoting failed:', psError.message);
      console.log('Note: PowerShell Remoting requires WinRM to be enabled on remote systems.');
      console.log('Enable WinRM with: Enable-PSRemoting -Force on remote systems, or use Group Policy.');
    }

  } catch (error) {
    console.error('Error fetching hardware details:', error);
  }

  console.log('Final hardware details:', details);
  return details;
}

export async function enableWinRMRemotely(
  ip: string,
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  let userForWMI = username;
  if (username.includes('@')) {
    const [user, domain] = username.split('@');
    userForWMI = `${domain}\\${user}`;
  } else if (!username.includes('\\')) {
    userForWMI = `bpride.com\\${username}`;
  }

  console.log('Enabling WinRM on remote system:', ip);

  try {
    // First, add the entire subnet to TrustedHosts on the client side
    // This will handle all 172.18.x.x IPs
    console.log('Adding subnet to TrustedHosts on client side...');
    try {
      const trustedHostsScript = `Set-Item WSMan:\\localhost\\Client\\TrustedHosts -Value "172.18.*" -Force`;
      await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${trustedHostsScript}"`);
      console.log('Subnet added to TrustedHosts');
    } catch (thError: any) {
      console.log('Warning: Failed to add to TrustedHosts:', thError.message);
      // Try adding specific IP instead
      try {
        const trustedHostsScript = `Set-Item WSMan:\\localhost\\Client\\TrustedHosts -Value "${ip}" -Force -Concatenate`;
        await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${trustedHostsScript}"`);
        console.log('IP added to TrustedHosts');
      } catch (thError2: any) {
        console.log('Warning: Failed to add IP to TrustedHosts:', thError2.message);
      }
    }

    // Now try to enable WinRM on the remote system
    const psScript = `$ErrorActionPreference = 'Stop'; try { $securePassword = ConvertTo-SecureString '${escapePowershellString(password)}' -AsPlainText -Force; $credential = New-Object System.Management.Automation.PSCredential('${escapePowershellString(userForWMI)}', $securePassword); $scriptBlock = { Enable-PSRemoting -Force -SkipNetworkProfileCheck; Set-WSManQuickConfig -Force; Set-Item WSMan:\\localhost\\Client\\TrustedHosts * -Force; Start-Service WinRM; Write-Output "SUCCESS" }; $result = Invoke-Command -ComputerName ${ip} -Credential $credential -ScriptBlock $scriptBlock; Write-Output $result } catch { Write-Output "ERROR:$($_.Exception.Message)" }`;

    const psResult = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`);
    console.log('WinRM enable result:', psResult.stdout);

    if (psResult.stdout.includes('SUCCESS')) {
      console.log('WinRM enabled successfully');
      return { success: true };
    } else if (psResult.stdout.includes('ERROR:')) {
      const errorMsg = psResult.stdout.match(/ERROR:(.+)/)?.[1]?.trim() || 'Unknown error';
      console.log('WinRM enable failed:', errorMsg);
      return { success: false, error: errorMsg };
    }

    return { success: false, error: 'Unknown error' };
  } catch (error: any) {
    console.error('Error enabling WinRM:', error);
    return { success: false, error: error.message };
  }
}

export function detectHardwareChanges(
  oldDetails: HardwareDetails | undefined,
  newDetails: HardwareDetails
): Array<{ field: string; oldValue: string; newValue: string; detectedAt: Date }> {
  const changes: Array<{ field: string; oldValue: string; newValue: string; detectedAt: Date }> = [];

  const fields: (keyof HardwareDetails)[] = ['ram', 'hardDisk', 'cpu', 'os', 'motherboard'];

  for (const field of fields) {
    const oldValue = oldDetails?.[field];
    const newValue = newDetails[field];

    if (newValue && oldValue !== newValue) {
      changes.push({
        field,
        oldValue: oldValue || 'N/A',
        newValue,
        detectedAt: new Date(),
      });
    }
  }

  return changes;
}

// Parse disk string to extract drive letters and sizes (ignoring free space)
// Format: "C: 500 GB (Free: 100 GB); D: 1000 GB (Free: 500 GB)"
// Returns: "C: 500 GB; D: 1000 GB"
function parseDiskString(diskString: string): string {
  if (!diskString) return '';

  // Split by semicolon to get individual drives
  const drives = diskString.split(';').map(d => d.trim());

  // For each drive, extract only the drive letter and total size (ignore free space)
  const parsedDrives = drives.map(drive => {
    // Match pattern like "C: 500 GB" or "C: 500 GB (Free: 100 GB)"
    const match = drive.match(/^([A-Z]:)\s+(\d+\s+GB)/i);
    if (match) {
      return `${match[1]} ${match[2]}`;
    }
    return drive;
  });

  return parsedDrives.join('; ');
}

// Compare disk strings ignoring free space changes
// Returns true if drives have changed (added/removed/resized)
function diskHasChanged(oldDisk: string | undefined, newDisk: string): boolean {
  const parsedOld = parseDiskString(oldDisk || '');
  const parsedNew = parseDiskString(newDisk);
  return parsedOld !== parsedNew;
}

// Detect only significant hardware changes that should trigger alerts
// RAM changes and drive removals are significant
// Storage free space changes are not significant
export function detectSignificantHardwareChanges(
  oldDetails: HardwareDetails | undefined,
  newDetails: HardwareDetails
): Array<{ field: string; oldValue: string; newValue: string; detectedAt: Date }> {
  const significantChanges: Array<{ field: string; oldValue: string; newValue: string; detectedAt: Date }> = [];

  // RAM changes are always significant
  const oldRam = oldDetails?.ram;
  const newRam = newDetails.ram;
  if (newRam && oldRam !== newRam) {
    significantChanges.push({
      field: 'ram',
      oldValue: oldRam || 'N/A',
      newValue: newRam,
      detectedAt: new Date(),
    });
  }

  // Disk changes are significant only if drives are removed/added/resized (not free space)
  const oldDisk = oldDetails?.hardDisk;
  const newDisk = newDetails.hardDisk;
  if (newDisk && diskHasChanged(oldDisk, newDisk)) {
    significantChanges.push({
      field: 'hardDisk',
      oldValue: oldDisk || 'N/A',
      newValue: newDisk,
      detectedAt: new Date(),
    });
  }

  // CPU, OS, and Motherboard changes are always significant
  const fields: (keyof HardwareDetails)[] = ['cpu', 'os', 'motherboard'];
  for (const field of fields) {
    const oldValue = oldDetails?.[field];
    const newValue = newDetails[field];

    if (newValue && oldValue !== newValue) {
      significantChanges.push({
        field,
        oldValue: oldValue || 'N/A',
        newValue,
        detectedAt: new Date(),
      });
    }
  }

  return significantChanges;
}
