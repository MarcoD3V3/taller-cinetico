# Recortador de Sprites

Recorta hojas de sprites (por ejemplo, las de SpriteCook o PixelLab) al estilo del Sprite Editor de Unity
y guarda cada sprite donde el juego lo usa.

**Abrir:** doble clic en `recortador.bat` (en la carpeta del juego).

## Cómo se usa

1. Mete una imagen en la carpeta `hojas/` del juego (o arrástrala a la ventana). Se abre sola.
2. **✂ Recortar**: automático (separa cada dibujo por la transparencia), o por cuadrícula (tamaño de celda o número de filas y columnas).
3. Ajusta a mano: arrastra en un hueco para crear un recorte, arrastra uno para moverlo, usa las asas para cambiar su tamaño.
4. Pon el **nombre del archivo** de cada sprite. Al escribir salen los nombres que el juego conoce (`espada_de_bronce`…).
5. **💾 Exportar recortes** (Ctrl+S): guarda un PNG por sprite en `sprites/objetos/` (o la carpeta que elijas). Recarga el juego para verlos.

Los recortes de cada hoja se guardan en `hojas/<imagen>.recortes.json`: al volver a abrirla, todo sigue igual.

## Animaciones

En el panel de abajo: **＋ Nueva**, añade recortes como fotogramas (botones o tecla `A`), arrástralos para
ordenarlos, elige FPS, bucle o ida y vuelta, y mira la vista previa (con papel cebolla si quieres).
**Exportar tira** guarda una imagen con los fotogramas en fila: es el formato que el juego usa para animar.
Con `/` en el nombre se crea una subcarpeta (por ejemplo `caminar/derecha` en `sprites/jugador`).

## Otras herramientas (como en Unity)

- **Pivote** de cada sprite (centro, pies…): alinea los fotogramas al exportar animaciones.
- **Bordes 9-slice**: se marcan en verde y se guardan en el archivo de recortes.
- Deshacer y rehacer, duplicar, ajustar al contenido, zoom con rejilla de píxeles.

## Teclas

`Rueda` zoom · `Clic derecho` o `Espacio`+arrastrar: mover la vista · `F` ajustar · `1` tamaño real
`Supr` borrar · `Flechas` mover 1 px (`Shift` 10) · `Alt`+flechas: tamaño · `Tab` siguiente
`Ctrl+D` duplicar · `A` añadir a la animación · `P` reproducir · `Ctrl+Z` / `Ctrl+Y` · `Ctrl+S` exportar
