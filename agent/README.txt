Inventory Agent Installation Instructions
========================================

Method 1: Manual Installation (Single Computer) - EASIEST
--------------------------------------------------------
1. Copy 'Install-Agent.bat' to the target computer's Desktop
2. Double-click 'Install-Agent.bat'
3. Click "Yes" when prompted by UAC (User Account Control)
4. Wait for installation to complete
5. Done! Agent will now auto-start on system boot

Method 2: Manual Installation (Single Computer) - PowerShell
-----------------------------------------------------------
1. Copy 'gpo-install.ps1' to the target computer's Desktop
2. Right-click on the file
3. Select "Run with PowerShell" OR
   - Right-click PowerShell
   - Select "Run as Administrator"
   - Navigate to the file location
   - Run: powershell -ExecutionPolicy Bypass -File .\gpo-install.ps1
4. Wait for installation to complete
5. Done! Agent will now auto-start on system boot

Method 2: GPO Deployment (Multiple Computers)
----------------------------------------------
1. Copy 'gpo-install.ps1' to your domain's SYSVOL:
   \\bpride.com\SYSVOL\bpride.com\Policies\{PolicyID}\Machine\Scripts\Startup\gpo-install.ps1

2. Open Group Policy Management Console (gpmc.msc)

3. Create or edit a GPO:
   - Computer Configuration → Windows Settings → Scripts (Startup/Shutdown)
   - Click "Startup" → Add
   - Browse to the script file
   - Select "gpo-install.ps1"

4. Link the GPO to desired Organizational Unit (OU)

5. Agent will automatically deploy on next reboot

Verification
-----------
After installation, verify the agent is running:
- Open PowerShell as Administrator
- Run: Test-NetConnection -ComputerName localhost -Port 8765
- Should show "TcpTestSucceeded : True"

Troubleshooting
--------------
- If port test fails, check: C:\InventoryAgent\agent.log
- Make sure Windows Firewall allows port 8765
- Run script as Administrator

Web Application
--------------
After agent is installed:
1. Open your web application
2. Go to Systems tab
3. Click the purple CPU icon next to any system
4. Hardware details will be fetched automatically

For Support
-----------
Contact your system administrator
