@echo off
:menu
cls
echo ========================================
echo    Sistema de Assinaturas - Menu
echo ========================================
echo.
echo 1. Iniciar Sistema
echo 2. Reiniciar Sistema
echo 3. Parar Sistema
echo 4. Status do Sistema
echo 5. Sair
echo.
echo ========================================
set /p choice=Escolha uma opção (1-5): 

if "%choice%"=="1" goto start
if "%choice%"=="2" goto restart
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto status
if "%choice%"=="5" goto exit
echo Opção inválida! Pressione qualquer tecla para continuar...
pause >nul
goto menu

:start
echo.
echo Iniciando sistema...
call start-system.bat
goto menu

:restart
echo.
echo Reiniciando sistema...
call restart.bat
goto menu

:stop
echo.
echo Parando sistema...
call stop-system.bat
goto menu

:status
echo.
call status.bat
goto menu

:exit
echo.
echo Saindo do menu...
exit /b
