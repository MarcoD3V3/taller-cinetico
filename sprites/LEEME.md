# Sprites propios (PixelLab u otro programa)

Pon una imagen PNG con fondo transparente en la carpeta que toque y el juego la usará en lugar de su dibujo.
Si no hay imagen, todo se ve como siempre.

| Carpeta | Qué cambia | Cómo debe mirar |
|---|---|---|
| `jugador/` | tu personaje | 4 direcciones (ver abajo) |
| `animales/` | animales, mascotas y monturas | hacia la **derecha** |
| `enemigos/` | enemigos y jefes | hacia la **derecha** |
| `bloques/` | bloques colocados (barril, cofre, máquinas…) | ocupa la casilla entera |
| `objetos/` | iconos del inventario, la barra y el suelo | — |

**Nombre del archivo:** el nombre que sale en el juego, en minúsculas y con `_` en vez de espacios
(Lobo → `lobo.png`, Espada de bronce → `espada_de_bronce.png`). También vale el código (`wolf.png`).
La lista completa está en `NOMBRES.txt`.

## Tu personaje (jugador/)

Puedes copiar tal cual lo que descargas de PixelLab (carpetas `rotations/` y `animations/…walk…/`),
o poner estos archivos:

- `abajo.png`, `arriba.png`, `derecha.png`, `izquierda.png` (o `south`, `north`, `east`, `west`)
- Si falta `izquierda`, se usa `derecha` en espejo.
- **Animación de caminar:** una tira horizontal de cuadros iguales en el mismo archivo
  (por ejemplo, 4 cuadros de 48×48 = una imagen de 192×48), o una carpeta `caminar/abajo/` con un PNG por cuadro.

## Tamaños recomendados

- Personaje y enemigos: 48×48 (vale cualquier tamaño: el juego lo ajusta a la altura de siempre).
- Animales: 32×32, o una tira de 2 cuadros para que caminen.
- Bloques y objetos: 32×32.

## Para que aparezcan

- **En internet (Render):** súbelos a GitHub como siempre; el servidor hace la lista al arrancar.
- **En tu PC (jugar.bat):** también se hace sola al arrancar.
- Si no salen, ejecuta `node sprites-lista.js` en la carpeta del juego y recarga.

Con una imagen propia, el bloque deja de tener sus animaciones de serie (engranajes que giran, luces…).

## Hojas (muchos iconos en una imagen)

`hojas/<nombre>.png` con su `hojas/<nombre>.json` (`celda`, `columnas` y la lista `objetos` en orden, por filas).
Cada celda se usa como el icono de ese objeto. `hojas/menas.png` tiene los iconos de las 120 menas.
Un PNG suelto en `objetos/` con el mismo nombre manda sobre la hoja.
