@echo off
title AFB Wallet App - Build and Install
color 0A

echo.
echo ============================================
echo   AFB WALLET APP - BUILD AND INSTALL
echo ============================================
echo.

:: Set JAVA_HOME (Android Studio bundled JDK - Java 21)
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

:: Set ADB path
set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

:: Verify Java
echo Checking Java...
java -version
if %errorlevel% neq 0 (
    echo [ERROR] Java not found! Check JAVA_HOME path.
    pause
    exit /b 1
)
echo.

:: Step 1: Web Build
echo [1/4] Building web app...
echo.
cd /d "H:\app\client"
call npx --yes vite build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Web build failed!
    pause
    exit /b 1
)
echo.
echo [OK] Web build done!
echo.

:: Step 2: Capacitor Sync
echo [2/4] Syncing to Android...
echo.
call npx cap sync android
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b 1
)
echo.
echo [OK] Android sync done!
echo.

:: Step 3: Check phone connection
echo [3/4] Checking phone connection...
echo.
"%ADB%" devices
echo.
echo Make sure your phone is connected via USB with USB Debugging ON.
echo If phone not listed above, connect it and press any key to continue...
echo.
pause

:: Step 4: Build APK with Gradle
echo [4/4] Building APK (1-3 minutes)...
echo.
cd /d "H:\app\client\android"
call gradlew.bat assembleDebug --no-daemon
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] APK build failed!
    pause
    exit /b 1
)

:: Install APK on phone
echo.
echo Installing on phone...
"%ADB%" install -r "app\build\outputs\apk\debug\app-debug.apk"
if %errorlevel% neq 0 (
    echo Trying fresh install...
    "%ADB%" uninstall com.afb.wallet
    "%ADB%" install "app\build\outputs\apk\debug\app-debug.apk"
)

:: Launch the app automatically
echo.
"%ADB%" shell am start -n com.afb.wallet/.MainActivity

echo.
echo ============================================
echo   SUCCESS! AFB Wallet installed and opened!
echo ============================================
echo.
pause
