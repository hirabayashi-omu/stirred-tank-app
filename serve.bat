@echo off
title Stirred Tank App Local Server
echo ===================================================
echo  Stirred Tank App: ローカルWebサーバーを起動しています...
echo ===================================================
echo.

:: http-server (Node.js) を試行
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo Node.js/npx を検出しました。http-server で起動します。
    echo ブラウザで http://localhost:8080/ を開いてください。
    echo.
    npx -y http-server -p 8080 .
    goto end
)

:: Python を試行
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo Python を検出しました。http.server で起動します。
    echo ブラウザで http://localhost:8080/ を開いてください。
    echo.
    python -m http.server 8080
    goto end
)

:: Python3 を試行
where python3 >nul 2>nul
if %errorlevel% equ 0 (
    echo Python3 を検出しました。http.server で起動します。
    echo ブラウザで http://localhost:8080/ を開いてください。
    echo.
    python3 -m http.server 8080
    goto end
)

echo.
echo [エラー] ローカルサーバーを起動するための Node.js または Python が見つかりません。
echo フォルダ内の index.html を直接ダブルクリックして起動できますが、
echo ブラウザのセキュリティ制限(CORS)により、一部の機能(槽模式図やPDF保存)が動作しない可能性があります。
echo.
pause

:end
