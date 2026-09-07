@echo off
title AFB Wallet App - Build APK and Install
color 0A

echo.
echo ============================================
echo   AFB WALLET APP - APK BUILD AND INSTALL
echo ============================================
echo.

:: Set JAVA_HOME (Android Studio bundled JDK - Java 21)
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

:: Set ADB path
set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

echo Checking connected devices...
"%ADB%" devices
echo.

:: Build APK with Gradle
echo Building APK (1-3 minutes, please wait)...
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
echo Installing APK on phone...
"%ADB%" install -r "app\build\outputs\apk\debug\app-debug.apk"
if %errorlevel% neq 0 (
    echo Trying fresh install (removing old version)...
    "%ADB%" uninstall com.afb.wallet
    "%ADB%" install "app\build\outputs\apk\debug\app-debug.apk"
)

:: Launch the app
echo.
"%ADB%" shell am start -n com.afb.wallet/.MainActivity

echo.
echo ============================================
echo   AFB Wallet installed and launched!
echo ============================================
echo.
pause
