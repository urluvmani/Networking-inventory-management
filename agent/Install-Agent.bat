@echo off
echo ========================================
echo Inventory Agent Installation
echo ========================================
echo.
echo This script will install the Inventory Agent.
echo Administrator rights are required.
echo.
pause

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0gpo-install.ps1'"

if %ERRORLEVEL% EQU 0 (





    
    echo.
    echo ========================================
    echo Installation Complete!
    echo ========================================
    echo.
    pause
) else (
    echo.
    echo Installation failed. Please run as Administrator.
    echo.
    pause
)
