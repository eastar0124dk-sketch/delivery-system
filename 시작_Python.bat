@echo off
cd /d "%~dp0"
title Delivery System

echo.
echo  ========================================
echo   [Delivery Receipt System] Starting...
echo  ========================================
echo.

py server_python.py

echo.
echo  Server stopped.
pause
