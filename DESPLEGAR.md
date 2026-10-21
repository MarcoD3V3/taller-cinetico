# Publicar Taller Cinético gratis (Render + Neon)

| Pieza | Dónde | Coste |
|---|---|---|
| Juego + servidor de partidas + inicio de sesión con Discord | **Render** (plan Free) | 0 $ |
| Base de datos (cuentas, mundos en la nube, vetos) | **Neon** (plan Free, PostgreSQL) | 0 $ |
| Código | GitHub: `MarcoD3V3/taller-cinetico` (privado) | 0 $ |

Tiempo: unos 15 minutos. Necesitas tu cuenta de GitHub y tu aplicación de Discord.

---

## Paso 1 · Base de datos en Neon
1. Entra en **https://neon.tech** → *Sign up* (puedes usar GitHub).
2. Crea un proyecto: nombre `taller-cinetico`, la versión de PostgreSQL que proponga, región
   **AWS US East (N. Virginia)** (la misma zona que el servidor de Render: más rápido).
3. En el panel del proyecto pulsa **Connect** y copia la *connection string*. Es algo así:
   `postgresql://usuario:clave@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require`
4. Guárdala solo para ti: es la llave de tu base de datos. No hace falta crear tablas: el juego
   las crea solo la primera vez.

## Paso 2 · Secreto nuevo de Discord
1. https://discord.com/developers/applications → tu aplicación → **OAuth2**.
2. **Reset Secret** y copia el nuevo (el antiguo quedó escrito en un chat: ya no sirve).

## Paso 3 · Servidor en Render
1. Entra en **https://dashboard.render.com** con GitHub.
2. **New +** → **Blueprint** → elige `MarcoD3V3/taller-cinetico`
   (si no aparece: *Configure account* y dale acceso a ese repositorio).
3. Render lee `render.yaml` y te pide dos valores:
   - `DATABASE_URL` → pega la dirección de Neon del paso 1.
   - `DISCORD_CLIENT_SECRET` → pega el secreto del paso 2.
4. **Apply**. Espera a que el servicio diga **Live** (la primera vez, 2–5 minutos).
5. Copia tu dirección: `https://taller-cinetico.onrender.com` (puede llevar letras extra).

## Paso 4 · Avisar a Discord de tu dirección
En tu aplicación de Discord → **OAuth2 → Redirects → Add Redirect**:

```
https://TU-DIRECCION.onrender.com/auth/discord/callback
```

Guarda los cambios.

## Paso 5 · Comprobar
1. Abre `https://TU-DIRECCION.onrender.com/api/info`. Debe decir:
   `"oauth": true` (Discord listo) y `"db": "postgres"` (base de datos conectada).
2. Abre `https://TU-DIRECCION.onrender.com/` → **Cuenta** → **Iniciar sesión con Discord**.
3. Entra en un mundo → **Esc** → **Abrir en red** y pasa la misma dirección a tus amigos.
   Ellos abren la dirección → **Multijugador** → tu partida.

---

## Cómo funciona el plan gratis
- **Se duerme**: tras ~15 minutos sin que nadie abra la página, Render apaga el servidor. La
  siguiente visita lo despierta (tarda ~30–60 s; verás la pantalla de carga). Una partida
  abierta en ese momento se cierra, pero los mundos guardados en la nube no se pierden.
- **Horas al mes**: Render da un número limitado de horas gratis al mes por cuenta; para un
  servidor que duerme cuando nadie juega suele sobrar.
- **Neon gratis**: no caduca, pero tiene un límite de espacio (de sobra para cuentas y unas
  decenas de mundos) y también se duerme sin uso; el primer acceso tarda un momento más.
- **Actualizar el juego**: cada cambio que se sube a GitHub (rama `main`) hace que Render lo
  vuelva a publicar solo, en unos minutos.

Los límites exactos y los precios los marcan Render y Neon y cambian: consúltalos en sus webs.

## Si algo falla
| Ves esto | Qué pasa | Solución |
|---|---|---|
| `"db": "archivo"` en `/api/info` | No conectó con Neon | Revisa `DATABASE_URL` en Render (Environment) y que termine en `?sslmode=require`; mira los *Logs* |
| `"oauth": false` | Falta el secreto | Pon `DISCORD_CLIENT_SECRET` en Render → Environment |
| Discord dice *Invalid redirect_uri* | La dirección no está en Discord | Paso 4, exactamente igual (con `https`) |
| La página tarda en abrir | Estaba dormido | Espera unos segundos; es normal en el plan gratis |
| *Deploy failed* | Error al construir | Render → el servicio → *Logs*, y pásamelos |

## Cuándo pasar a pago
Si el juego crece o te molesta que se duerma: Render **Starter** para el servidor (siempre
encendido) y Neon sigue gratis. O un VPS pequeño con todo dentro. El juego no cambia: solo
las variables.

## Railway (otra opción)
`railway.json` sigue en el repositorio: si algún día usas Railway, crea un proyecto con
PostgreSQL, conecta este repositorio y pon las mismas variables (`DATABASE_URL`,
`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`).

## En tu ordenador
`jugar.bat` arranca el mismo servidor sin base de datos (guarda en la carpeta oculta `.datos/`).
