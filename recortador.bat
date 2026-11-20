@echo off
rem Abre el Recortador de Sprites (Electron). Vigila la carpeta «hojas» y guarda en «sprites».
cd /d "%~dp0herramientas\recortador"
if exist "%~dp0escritorio\node_modules\electron\dist\electron.exe" (
  start "" "%~dp0escritorio\node_modules\electron\dist\electron.exe" .
) else (
  if not exist node_modules\electron call npm install
  call npx electron .
)
