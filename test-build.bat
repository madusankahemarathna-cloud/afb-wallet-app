@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "H:\app\client\android"
echo Building APK...
call gradlew.bat assembleDebug --no-daemon
echo.
echo Exit code: %errorlevel%
if %errorlevel% equ 0 (
    echo BUILD SUCCESS!
    dir "app\build\outputs\apk\debug\app-debug.apk"
) else (
    echo BUILD FAILED!
)
