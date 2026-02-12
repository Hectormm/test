# Liga Vistahermosa F7 – Scraper Web (demo)

Web sencilla que:
- hace fetch del HTML de la liga desde `/api/group` (proxy en Node para evitar CORS),
- parsea resultados por jornada,
- calcula y muestra la clasificación.

## Ejecutar
- `npm run dev` (StackBlitz suele arrancarlo automáticamente)

## Variables de entorno (opcionales)
- `LIGA_URL` para cambiar la competición/grupo.
