@echo off
rem Taller Cinetico: arranca el servidor del juego (web + partidas en red) y abre el navegador.
rem Sirve SOLO esta carpeta. Tus amigos de la misma red entran con la direccion que se muestra.
cd /d "%~dp0"
if not exist "index.html" (
  echo No encuentro index.html. Pon este archivo dentro de la carpeta del juego.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 goto sinnode
start "" "http://localhost:8080/"
node servidor.js
pause
exit /b 0

:sinnode
echo No tienes Node.js instalado: el juego funcionara, pero sin multijugador.
echo (Instala Node.js desde https://nodejs.org para jugar en red.)
echo.
start "" "http://localhost:8080/"
python -m http.server 8080 --bind 127.0.0.1
pause
