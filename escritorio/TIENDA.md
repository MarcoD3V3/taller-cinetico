# Publicar Taller Cinético en la Microsoft Store

En la Store, Microsoft firma la app: no sale el aviso azul de SmartScreen y se instala con un clic.
El instalador (.exe) y la versión portable siguen igual; esto se crea aparte.

## 1. Tu cuenta (una vez)
1. Entra en https://partner.microsoft.com/dashboard y crea una cuenta de desarrollador **individual** con tu cuenta de Microsoft.
2. **Apps y juegos → Nueva aplicación →** reserva el nombre **Taller Cinético**.
3. En **Administración del producto → Identidad del producto** copia estos tres datos:
   - `Package/Identity/Name` (algo como `12345MarcoD3V3.TallerCinetico`)
   - `Package/Identity/Publisher` (empieza por `CN=`)
   - `Package/Properties/PublisherDisplayName`

## 2. Ponerlos en el proyecto
En `escritorio/package.json`, sección `"appx"`, cambia:
- `identityName` → el Name
- `publisher` → el Publisher (con `CN=`)
- `publisherDisplayName` → el PublisherDisplayName

## 3. Crear el paquete
En la carpeta `escritorio`: `npm run store` → sale `dist/TallerCinetico-Store.appx`.
Cada versión nueva: sube `"version"` en package.json (1.0.1, 1.0.2…) antes de compilar.

## 4. Enviarlo
En Partner Center, en tu app → **Iniciar el envío**:
- **Paquetes:** sube el `.appx`.
- **Precio:** gratis. **Clasificación por edades:** rellena el cuestionario.
- **Descripción de la Store:** descripción, capturas (mínimo 1, de 1366×768 o más) y el icono.
- Como la app pide "confianza total" (es Electron), explica en las notas para certificación que es un juego que abre ventanas y guarda partidas.
- **Enviar a la Store.** La revisión suele tardar de unas horas a unos días.
