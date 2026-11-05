# Group Policy Deployment Guide for Inventory Agent

This guide explains how to deploy the Inventory Agent to all domain computers using Group Policy.

## Prerequisites

- Domain Administrator access
- Active Directory Domain Services (AD DS)
- SYSVOL access to copy scripts

## Deployment Steps

### 1. Copy Installation Script to SYSVOL

1. Copy `agent/gpo-install.ps1` to your domain's SYSVOL:
   ```
   \\bpride.com\SYSVOL\bpride.com\Policies\InventoryAgent\gpo-install.ps1
   ```

2. Or create a shared folder:
   ```
   \\your-server\InventoryAgentShare\
   ```

### 2. Create Group Policy Object (GPO)

1. Open **Group Policy Management Console (gpmc.msc)**
2. Right-click on your domain or OU → **Create a GPO in this domain, and Link it here**
3. Name it: **Inventory Agent Deployment**
4. Click **OK**

### 3. Configure Startup Script

1. Right-click the new GPO → **Edit**
2. Navigate to: **Computer Configuration** → **Policies** → **Windows Settings** → **Scripts (Startup/Shutdown)**
3. Double-click **Startup**
4. Click **Add** → **Browse**
5. Navigate to the script location (SYSVOL or shared folder)
6. Select `gpo-install.ps1`
7. Click **Open** → **OK**

### 4. Deploy GPO

The GPO will automatically deploy to:
- All computers in the linked OU during next reboot
- Or force update with: `gpupdate /force` on target computers

### 5. Verify Deployment

1. Reboot a test computer
2. Check if agent is running:
   ```powershell
   Get-ScheduledTask -TaskName "Inventory Agent"
   Get-NetFirewallRule -DisplayName "Inventory Agent"
   ```
3. Test agent API:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8765/hardware"
   ```

## Troubleshooting

### Agent not installing
- Check Event Viewer → Windows Logs → Application
- Verify script path is accessible
- Ensure PowerShell execution policy allows scripts

### Firewall blocking
- GPO should automatically add firewall rule
- Manually verify: `Get-NetFirewallRule -DisplayName "Inventory Agent"`

### Scheduled task not running
- Check Task Scheduler
- Verify PowerShell execution policy
- Run script manually for errors

## Remove Agent (Uninstall)

Create uninstall script `gpo-uninstall.ps1`:

```powershell
# Stop and remove agent
Get-Process powershell | Where-Object { $_.CommandLine -like "*InventoryAgent*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "Inventory Agent" -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Inventory Agent" -ErrorAction SilentlyContinue
Remove-Item -Path "C:\InventoryAgent" -Recurse -Force -ErrorAction SilentlyContinue
```

Add as a new GPO startup script or use GPO to remove the old GPO.
