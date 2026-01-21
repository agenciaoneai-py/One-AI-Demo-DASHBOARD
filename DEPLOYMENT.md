# Guía de Deployment

## Variables de Entorno

### Frontend (Vercel)

Configurar en Vercel Dashboard → Settings → Environment Variables:

```
VITE_API_URL=https://one-ai-demo-dashboard-production.up.railway.app
```

**IMPORTANTE:** En Vite, las variables de entorno DEBEN tener el prefijo `VITE_` para ser accesibles en el cliente.

### Backend (Railway)

Configurar en Railway Dashboard → Variables:

```
PORT=3000
OPENAI_API_KEY=sk-proj-your-key-here
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here
FRONTEND_URL=https://one-ai-demo-dashboard.vercel.app
```

## Verificación de Deploy

### Backend (Railway)

1. Verificar logs:
   ```
   🔍 Environment loaded:
     - FRONTEND_URL: https://one-ai-demo-dashboard.vercel.app
     - NODE_ENV: production
     - PORT: 3000
   Backend running on 3000
   ```

2. Probar health check:
   ```
   curl https://one-ai-demo-dashboard-production.up.railway.app/health
   ```
   Respuesta esperada: `OK`

### Frontend (Vercel)

1. Verificar que el build use las variables de entorno correctas
2. Probar en DevTools que las requests vayan al backend de Railway, NO a localhost:3000

## Troubleshooting

### Error: "Failed to fetch" o "ERR_CONNECTION_REFUSED"

**Causa:** El frontend está intentando conectar a localhost:3000 en lugar del backend de Railway.

**Solución:**
1. Verificar que `VITE_API_URL` esté configurada en Vercel
2. Hacer redeploy del frontend en Vercel para que tome la variable de entorno
3. Verificar en DevTools que las requests usen la URL correcta

### Error: "timestamp.toLocaleTimeString is not a function"

**Causa:** El timestamp del backend es string pero el frontend espera un objeto Date.

**Solución:** Ya está corregido. El frontend convierte automáticamente los timestamps ISO string a objetos Date.

## Configuración Inicial de Base de Datos

### Agregar Imágenes a Productos

Los productos necesitan URLs de imágenes para que el agente IA pueda enviarlas cuando el usuario las solicite.

**Ejecutar el script de imágenes:**

```bash
cd backend
npm run add-images
```

Este script:
- Agrega URLs de imágenes de ejemplo (Unsplash) a todos los productos
- NO sobrescribe imágenes existentes
- Asigna imágenes según categorías (anillos, pulseras, collares, etc.)

Para más detalles, ver: `backend/scripts/README.md`

### Verificar que las imágenes se agregaron

En Railway logs, cuando el agente encuentra productos, verás:

```
📦 Productos encontrados:
  - Anillo Solitario Diamante
    image_urls: [ 'https://images.unsplash.com/...' ]
    Tiene imágenes: true
```

## Troubleshooting

### Error: El agente dice que envía fotos pero no aparecen

**Causa:** Los productos en la base de datos no tienen `image_urls` configuradas.

**Solución:**
1. Ejecutar el script: `npm run add-images` en el directorio backend
2. Verificar en logs de Railway que los productos tienen imágenes
3. Probar nuevamente en el simulador

**Verificar en Supabase:**
```sql
SELECT name, image_urls
FROM products
WHERE is_active = true
LIMIT 10;
```

### Error: "Failed to fetch" o "ERR_CONNECTION_REFUSED"

**Causa:** El frontend está intentando conectar a localhost:3000 en lugar del backend de Railway.

**Solución:**
1. Verificar que `VITE_API_URL` esté configurada en Vercel
2. Hacer redeploy del frontend en Vercel para que tome la variable de entorno
3. Verificar en DevTools que las requests usen la URL correcta

### Error: "timestamp.toLocaleTimeString is not a function"

**Causa:** El timestamp del backend es string pero el frontend espera un objeto Date.

**Solución:** Ya está corregido. El frontend convierte automáticamente los timestamps ISO string a objetos Date.

## URLs de Producción

- **Frontend:** https://one-ai-demo-dashboard.vercel.app
- **Backend:** https://one-ai-demo-dashboard-production.up.railway.app
