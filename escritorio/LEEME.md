# Taller Cinético para escritorio (Windows)

- **Con internet** abre el juego de Render: el mismo de la web, con multijugador, cuentas,
  Discord y mundos en la nube. Siempre tiene la última versión sin reinstalar.
- **Sin internet** (o si el servidor no despierta en 75 s, o pulsas «Jugar sin conexión»)
  abre la copia que trae dentro: Un jugador completo.
- **FPS**: usa la gráfica potente, no se frena en segundo plano y va a la frecuencia de tu monitor.
- Teclas: **F11** pantalla completa · **Ctrl+R** recargar.

## Crear el instalador
```
cd escritorio
npm install
npm run dist
```
Salen en `escritorio/dist/`: `TallerCinetico-Instalador-1.0.0.exe` y `TallerCinetico-Portable-1.0.0.exe`.

Si falla con «no se pudo abrir StdUtils.nsh», la ruta de la carpeta es demasiado larga:
`subst T: <carpeta del juego>` y ejecuta `npm run dist` desde `T:\escritorio`.

## Probar sin instalar
```
cd escritorio
npm start
```
