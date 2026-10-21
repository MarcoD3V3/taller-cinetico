# Publicar Taller Cinético en Railway

El juego y su servidor van juntos: `servidor.js` sirve la página, las partidas en línea
(WebSocket en `/ws`), el inicio de sesión con Discord y la nube de mundos.

## 1. Proyecto en Railway
1. Crea un proyecto y añade **PostgreSQL** (New → Database → PostgreSQL).
2. Añade el juego como servicio:
   - **Con GitHub:** sube esta carpeta a un repositorio y elige *Deploy from GitHub repo*.
   - **Sin GitHub:** instala la herramienta de Railway y, dentro de esta carpeta,
     ejecuta `npx @railway/cli login`, `npx @railway/cli link` y `npx @railway/cli up`.
3. En el servicio del juego: *Settings → Networking → Generate Domain*. Te da algo como
   `https://taller-cinetico.up.railway.app`.

Railway lee `package.json` y `railway.json`: instala `pg` y arranca `node servidor.js`.

## 2. Variables del servicio del juego
| Variable | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia a la base de datos) |
| `DISCORD_CLIENT_ID` | `1562327426837516288` |
| `DISCORD_CLIENT_SECRET` | el **Client Secret nuevo** (regenerado) de tu aplicación de Discord |
| `PUBLIC_URL` | la dirección del paso 1.3, sin barra final |

El secreto va **solo aquí**, nunca en el código ni en un chat.

## 3. Discord
En https://discord.com/developers/applications → tu aplicación → **OAuth2 → Redirects**, añade:

```
https://TU-DOMINIO.up.railway.app/auth/discord/callback
```

## 4. Comprobar
- `https://TU-DOMINIO/api/info` debe decir `"oauth": true` y `"db": "postgres"`.
- Abre el juego → Cuenta → *Iniciar sesión con Discord*.
- Multijugador → abre tu mundo con Esc → *Abrir en red* y pasa la dirección a tus amigos.

## En tu ordenador
`jugar.bat` arranca el mismo servidor sin base de datos (guarda en `.datos/`).
