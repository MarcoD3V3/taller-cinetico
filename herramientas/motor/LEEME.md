# Motor de sprites

Herramienta aparte para ajustar el juego sin tocar código. Doble clic en **motor.bat** (carpeta del juego): se abre en el
navegador (`http://127.0.0.1:8795/motor/`). Solo funciona en tu ordenador.

## Secciones
- **Sprites**: escala, mover, choque (automático, propio o sin choque), línea de orden (desde dónde tapa al personaje), viento,
  ocultar, retirar; biomas de cada árbol; suelos, píxel, viento y objeto de cada categoría del suelo.
  **✎ Editar píxeles** (lápiz, borrador, cubo, cuentagotas, línea, rectángulos, mover, simetría, voltear, lienzo, paletas)
  y **✎ Nuevo sprite** para dibujar desde cero. **Subir sprites** para tus PNG/WEBP.
- **Jugador**: velocidad al andar y correr, vida, aguante y maná base, alcance, salto, gravedad, choque, tamaño del dibujo y
  línea de orden. Son la base: habilidades, nivel, equipo, pociones, clima, heridas y monturas siguen multiplicando encima.
  Doble clic en el personaje de prueba de la vista abre esta sección.
- **Comandos**: crea comandos `/nombre` para el chat del juego. Su función: pasos (otros comandos con `$1 $2… $todo $x $y $cx $cy`)
  y, si quieres, JavaScript con `api` (dar, tp, poner suelo, mensajes…).

## Probar
**▶ Probar** entra directamente al **mundo de prueba**: se genera como el del juego, es aparte (no sale en el juego normal) y se guarda
al salir. Lleva un cuadrado pequeño con el sprite elegido. **⚙** cambia las opciones (mundo nuevo o guardado, suelo, tamaño del cuadrado,
copias, hora, clima, ver choques, empezar volando; también traer un mundo tuyo exportado, que no se toca).
Dentro: **doble espacio** vuelo libre (rápido, sin choques ni capas), **doble clic** selecciona un sprite o al jugador,
**clic derecho** abre un menú con sus ajustes (y «Abrir en el motor»), **C** muestra choques y líneas de orden.
Los cambios del motor se ven en el juego de prueba al momento.

## Guardar y publicar
Todo se guarda solo como **borrador** a cada rato (también Ctrl+S). El juego de verdad no cambia hasta **⬆ Publicar**: entonces
se escribe `sprites/ajustes.js` y se sube todo lo de `sprites/` (ajustes e imágenes) a GitHub, y llega a la web y a la app.
Las imágenes retiradas o reemplazadas quedan en `herramientas/motor/papelera`.
