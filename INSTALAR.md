# Cómo montar MuniStoDomingo Trámites en otro computador

Guía paso a paso para levantar la aplicación completa (base de datos, API y sitio web) en un
equipo nuevo. **No necesitas instalar XAMPP, MySQL, Node ni npm**: todo corre dentro de Docker.

Tiempo estimado: 15 minutos la primera vez (casi todo es descarga); después, menos de 1 minuto.

---

## Antes de empezar

| Necesitas | Detalle |
|---|---|
| Docker Desktop | Gratis. Se instala una sola vez (paso 1). En Windows pide permisos de administrador. |
| Internet | Solo el primer arranque. El código del front y del back ya viene en la carpeta; lo que se descarga son las imágenes base de Docker (Node, Nginx, MariaDB) y las librerías npm que se instalan dentro de los contenedores. Después funciona sin conexión. |
| Espacio en disco | Unos 3 GB libres. |
| Puertos libres | `8080` (sitio), `3000` (API) y `3307` (base de datos). Si alguno está ocupado, ver [Si algo falla](#si-algo-falla). |

> **Si es para una presentación:** haz los pasos 1 a 4 el día anterior en el mismo computador.
> Así las descargas ya están hechas y el día de la presentación solo haces doble clic en `iniciar.bat`.

---

## Paso 1. Instalar Docker Desktop (una sola vez)

**Windows 10/11**
1. Descarga Docker Desktop desde https://www.docker.com/products/docker-desktop/ e instálalo con las opciones por defecto (deja marcado **WSL 2**).
2. Reinicia el computador si te lo pide.
3. Abre **Docker Desktop** y espera a que abajo a la izquierda diga **Engine running** (la ballena deja de moverse). Puedes saltarte el inicio de sesión.
4. Si aparece un error de virtualización o de WSL, revisa la sección [Si algo falla](#si-algo-falla).

**macOS:** instala Docker Desktop (elige Apple Silicon o Intel según tu Mac) y ábrelo.
**Linux:** instala Docker Engine y el plugin Compose (`docker compose`).

Para comprobarlo, abre una terminal (PowerShell en Windows) y escribe:

```powershell
docker compose version
```

Debe responder algo como `Docker Compose version v2...`. Si dice que no reconoce el comando, Docker no quedó instalado.

## Paso 2. Obtener el proyecto

Usa **una** de estas opciones:

- **Con Git** (recomendado):
  ```powershell
  git clone -b docker https://github.com/luffy126/MuniStoDomingo-Tramites.git
  cd MuniStoDomingo-Tramites
  ```
- **Sin Git:** en GitHub, cambia a la rama **docker**, pulsa **Code → Download ZIP** y descomprímelo.
- **Desde un pendrive:** copia la carpeta completa del proyecto al computador.

La carpeta correcta es la que tiene `docker-compose.yml`, `iniciar.bat` y las carpetas `backend` y `frontend`.

## Paso 3. Iniciar

- **Windows:** doble clic en **`iniciar.bat`**.
- **macOS / Linux:** en una terminal dentro de la carpeta, `./iniciar.sh`.

El script revisa que Docker esté encendido, construye todo y espera a que los tres servicios
respondan. No descarga el código (ya viene en la carpeta): la primera vez tarda entre 3 y 10
minutos porque baja las imágenes base y las librerías npm y compila; verás mucho texto pasar, es normal.
Al final dice **"Listo"** y abre el navegador.

Si prefieres escribir el comando a mano (es lo mismo que hace el script):

```powershell
docker compose --env-file .env.docker up -d --build --wait
```

## Paso 4. Entrar a la aplicación

Abre **http://localhost:8080** y entra con una de las cuentas de prueba:

| Rol | Correo | Contraseña |
|---|---|---|
| Vecino | `vecino@test.com` | `Test1234` |
| Funcionario | `funcionario@test.com` | `Test1234` |

Los correos de la app (por ejemplo, el **código de 6 dígitos** de la verificación en dos pasos)
no se envían de verdad mientras no haya clave de Resend: aparecen en los registros. Para verlos:

```powershell
docker compose logs -f backend
```

(Ctrl + C para salir de los registros; la aplicación sigue funcionando.)

## Paso 5. Detener y volver a iniciar

- **Detener:** doble clic en **`detener.bat`** (o `./detener.sh`). Los datos y los documentos se conservan.
- **Volver a iniciar:** de nuevo `iniciar.bat`. Tarda segundos porque ya está todo construido.
- Docker Desktop debe estar abierto para iniciar. Al apagar el computador, la app se detiene sola.

**Volver a los datos de prueba originales** (borra todo lo que se haya creado: solicitudes,
usuarios nuevos y documentos subidos). Solo si de verdad quieres empezar de cero:

```powershell
docker compose --env-file .env.docker down -v
```

y luego `iniciar.bat`.

---

## Si algo falla

| Lo que ves | Qué hacer |
|---|---|
| `iniciar.bat` dice que no encuentra Docker | Docker Desktop no está instalado o falta reiniciar tras instalarlo (paso 1). |
| Dice que Docker no está encendido | Abre Docker Desktop y espera a **Engine running**. Vuelve a ejecutar `iniciar.bat`. |
| `port is already allocated` | Otro programa usa ese puerto (por ejemplo XAMPP o un servidor de desarrollo). Ciérralo, o abre `.env.docker` con el Bloc de notas y cambia `FRONTEND_PORT=8080` por `8081` (o `BACKEND_PORT` / `DB_EXTERNAL_PORT` según el puerto del error). Si cambias `FRONTEND_PORT`, la app queda en `http://localhost:8081`. |
| Docker Desktop: "WSL 2 installation is incomplete" o "Virtualization support not detected" | En PowerShell como administrador: `wsl --install` y reinicia. Si persiste, hay que activar la virtualización (VT-x / AMD-V / SVM) en la BIOS del computador. En equipos de laboratorio puede requerir al administrador. |
| Error de red o `TLS handshake timeout` en el primer arranque | Falta internet o la red bloquea Docker Hub. Prueba con otra red (por ejemplo, el celular compartiendo datos) y vuelve a ejecutar. |
| La página no carga o queda en blanco | Espera a que `iniciar.bat` diga "Listo". Recarga con Ctrl + F5. Revisa `docker compose ps`: los tres deben decir `healthy`. |
| "Demasiados intentos" al iniciar sesión | Es la protección contra fuerza bruta: 10 intentos por IP cada 15 minutos. Espera, o sube `AUTH_RATE_LIMIT_MAX` en `.env.docker` y vuelve a iniciar. |
| Algo distinto | `docker compose logs backend` muestra el error de la API; `docker compose logs db`, el de la base de datos. |

**No puedo instalar Docker en ese computador** (sin permisos de administrador o sin
virtualización): usa la versión para XAMPP del proyecto (ramas `backend` y `frontend`, ver su
README) o lleva tu propio computador con Docker ya instalado y probado.

---

## Opcional: correos de verdad (Resend)

Solo si quieres que los correos (código de verificación, recuperar contraseña, avisos de
estado) lleguen a la casilla real de cada usuario.

1. Crea en la carpeta del proyecto un archivo llamado `.env.docker.local` (git lo ignora, así la
   clave no se sube). En el Bloc de notas: **Guardar como → Tipo: Todos los archivos**, para que
   no quede como `.env.docker.local.txt`.
2. Escribe estas dos líneas con la clave real de Resend (pídesela al equipo; nunca la subas a GitHub):

   ```
   RESEND_API_KEY=re_tu_clave_real
   EMAIL_FROM=MuniStoDomingo <no-reply@tenerex.cl>
   ```

3. Ejecuta `iniciar.bat`. Lo detecta solo y dice "Usando también .env.docker.local".
4. Prueba: entra como vecino, activa la verificación en dos pasos y revisa que el código llegue
   al correo. Si no llega, `docker compose logs backend` muestra el error de Resend.

El dominio `tenerex.cl` ya está verificado en Resend, así que los correos llegan a cualquier
dirección. Sin dominio verificado (remitente `onboarding@resend.dev`) solo llegan al dueño de
la cuenta Resend; en ese caso agrega `EMAIL_REDIRECT_TO=tu_correo` para desviarlos todos ahí.

Los enlaces de los correos apuntan a `http://localhost:8080`, así que solo abren en este mismo
computador. Mientras uses `compartir.bat` (siguiente sección) apuntan a la URL pública.

## Opcional: compartir con una URL pública (Cloudflare Tunnel)

Para que otras personas (por ejemplo, la comisión desde sus celulares) entren a la app que
corre en tu computador, sin abrir puertos del router.

1. Una sola vez, instala `cloudflared` en PowerShell:
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
2. Inicia la app con `iniciar.bat` y espera a que diga "Listo".
3. Doble clic en **`compartir.bat`**. Al final muestra la URL y la copia al portapapeles.
4. **Ctrl + C** en esa ventana deja de compartir. La app sigue funcionando en localhost.

| Modo | Cómo | URL |
|---|---|---|
| Dirección fija | Guarda el token de Cloudflare del equipo en un archivo `cloudflare-token.txt` en esta carpeta (git lo ignora). | `https://muni.tenerex.cl` |
| Rápido, sin cuenta | Sin token, o desde PowerShell: `.\compartir.bat -Rapido` | Una al azar, `https://….trycloudflare.com`, distinta cada vez |

Mientras comparte, la API usa la URL pública en los enlaces de los correos y reconoce la IP
real de cada visitante para el límite de intentos. Al cerrar con Ctrl + C vuelve sola a la
configuración local. Si cerraste la ventana con la X, ejecuta `iniciar.bat` otra vez.

`muni.tenerex.cl` es el mismo túnel que usa la versión XAMPP (`Compartir.bat` de las ramas
`backend`/`frontend`): solo una de las dos puede estar compartiendo a la vez.

## Más información

- [`DOCKER.md`](DOCKER.md): referencia técnica (arquitectura, variables, volúmenes, migraciones).
- [`Crear BD.md`](Crear%20BD.md): pasos para que un agente de IA cree y verifique la base de datos.
- [`README.md`](README.md): descripción del proyecto y del equipo.
