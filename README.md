# Numa · Control de pedidos

Plataforma para registrar pedidos a proveedores y dar seguimiento a su recepción. Incluye autenticación con Supabase Auth y aislamiento por usuario mediante RLS:

- Solicitante: registra proveedor, producto, cantidad, prioridad y fecha requerida; consulta su historial.
- Administrador: visualiza sus pedidos y el consolidado de todos los solicitantes, métricas, actividad por proveedor y gráficos de productos.
- Asistente Numa: guarda cada conversación vinculada al usuario autenticado.

## Desarrollo local

```powershell
npm install
npm run dev
```

Configura `.env.local` a partir de `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-key>
OLLAMA_API_KEY=<ollama-key>
NEXT_PUBLIC_APP_URL=https://<tu-tunel-ngrok>
```

La migración `supabase/migrations/20260906180000_initial_schema.sql` crea perfiles, pedidos y conversaciones con políticas RLS. Ejecuta su contenido en el SQL Editor de Supabase (o con la CLI) antes de iniciar la app. La confirmación de correo debe estar desactivada en Authentication → Sign In / Providers.

Los registros nuevos comienzan como `worker`. Para promover una cuenta administradora, ejecuta en el SQL Editor (solo como propietario del proyecto). Las políticas RLS permiten al administrador leer el consolidado, mientras que las conversaciones y las escrituras de pedidos permanecen aisladas por usuario:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'admin@tu-dominio.com');
```

## Despliegue en Vercel

Las rutas bajo `src/app/api` usan runtime Node.js y consultan Supabase con la sesión del usuario; nunca aceptan un `userId` enviado desde el navegador. Las políticas RLS vuelven a validar la propiedad en la base de datos.

Opcionalmente, configura `OLLAMA_API_KEY` para activar el asistente Numa en la vista administrativa. Sin esa variable, el asistente responde con un resumen local del registro.
