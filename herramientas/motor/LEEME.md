# Motor de sprites

Herramienta aparte para ajustar los sprites del juego sin tocar código. Doble clic en **motor.bat** (en la carpeta del juego):
se abre en el navegador (`http://127.0.0.1:8795/motor/`). Solo funciona en tu ordenador.

## Qué se puede hacer
- **Subir sprites** (PNG o WEBP con fondo transparente): árboles de un tipo del juego, o cosas del suelo en una categoría (existente o nueva).
- Por imagen: **escala**, **mover el dibujo**, **choque** (automático, propio o sin choque), **línea de orden** (desde dónde tapa al personaje),
  **viento**, **ocultar** y **retirar** (va a `herramientas/motor/papelera`, no se borra).
- Por tipo de árbol: en qué **biomas** sale y con qué densidad.
- Por categoría del suelo: tamaño del píxel, si se levanta (se ordena con el personaje), si va centrada, viento, qué da al recogerla,
  y en qué **suelos** sale (peso) y la densidad de cada suelo.
- **Probar**: abre el juego en otra pestaña con tus cambios (aunque no estén guardados) en un mundo pequeño con ese sprite,
  o en un mundo que traigas (Exportar en el juego → «Pegar un mundo exportado»). No se guarda nada. Dentro, **C** muestra choques y líneas.

## Dónde se guarda
**Guardar en el juego** escribe `sprites/ajustes.js`. El juego lo carga y lo aplica (`js/render/motor-ajustes.js`), así que va con el
código: al subirlo a GitHub llega a la web y a la app. **Exportar / Importar** sirven para copias o pasar ajustes a otro equipo.
