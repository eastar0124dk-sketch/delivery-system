@echo off
chcp 65001 >nul
title 배송 인수증명 시스템

echo.
echo  ══════════════════════════════════════
echo    배송 인수증명 시스템 시작
echo  ══════════════════════════════════════
echo.

:: node_modules 없으면 패키지 설치
if not exist "node_modules" (
    echo  [패키지 설치 중... 최초 1회만 실행됩니다]
    call npm install
    echo.
)

echo  [서버 시작 중...]
echo.
node server.js

pause
