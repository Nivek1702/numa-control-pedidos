# Numa · Control de pedidos

MVP para registrar pedidos a proveedores y dar seguimiento a su recepción. Incluye dos vistas operativas:

- Solicitante: registra proveedor, producto, cantidad, prioridad y fecha requerida; consulta su historial.
- Administrador: visualiza todos los pedidos, métricas agregadas y actividad por proveedor; confirma pedidos recepcionados.

## Desarrollo local

```powershell
npm install
npm run dev
```

La base `data-canvas.db` se crea automáticamente con SQLite. El selector de usuario permite probar las dos vistas del MVP (`Ana Torres` y `Carlos Mendoza`). En producción debe sustituirse por autenticación real y autorización basada en sesión.

## Despliegue en Vercel

Las Vercel Functions no tienen un disco local persistente. Para conservar SQLite en producción usa una base libSQL/Turso:

```text
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

Las rutas bajo `src/app/api` usan runtime Node.js y mantienen el mismo esquema SQLite en local y en Vercel.

Opcionalmente, configura `OLLAMA_API_KEY` para activar el asistente Numa en la vista administrativa. Sin esa variable, el asistente responde con un resumen local del registro.
