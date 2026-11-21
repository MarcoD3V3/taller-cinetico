@echo off
rem Abre el Motor de sprites de Taller Cinético: ajusta choques, tamaño, orden, viento y biomas de tus
rem sprites, sube imágenes nuevas y pruébalas en el juego. Los cambios se guardan en sprites/ajustes.js.
cd /d "%~dp0"
where node >nul 2>nul || (echo Necesitas Node.js: https://nodejs.org & pause & exit /b)
start "" /b cmd /c "ping -n 2 127.0.0.1 >nul & start "" http://127.0.0.1:8795/motor/"
node herramientas\motor\servidor.js
pause
