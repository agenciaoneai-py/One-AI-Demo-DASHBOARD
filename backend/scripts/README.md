# Scripts de Base de Datos

## Agregar Imágenes a Productos

Este script agrega URLs de imágenes de ejemplo a los productos que no tienen imágenes configuradas.

### Opción 1: Script Node.js (Recomendado)

```bash
cd backend
node scripts/add-product-images.js
```

**Ventajas:**
- Usa la configuración existente de Supabase
- Más fácil de ejecutar
- Muestra logs detallados del proceso

### Opción 2: Script SQL (Directo en Supabase)

1. Abre Supabase Dashboard → SQL Editor
2. Copia el contenido de `add-product-images.sql`
3. Ejecuta el script

**Ventajas:**
- Más rápido para grandes volúmenes
- Útil si tienes acceso directo a la base de datos

## Imágenes Utilizadas

Las URLs de imágenes provienen de Unsplash (gratuitas y sin copyright):
- Anillos: Imágenes de anillos de diamante y solitarios
- Pulseras: Imágenes de pulseras de oro y plata
- Collares: Imágenes de collares elegantes
- Aretes: Imágenes de aretes y aros
- Perlas: Productos con perlas
- General: Imágenes de joyería variada

## Verificar Resultados

Después de ejecutar el script, puedes verificar que las imágenes se agregaron correctamente:

```sql
-- En Supabase SQL Editor
SELECT
  name,
  image_urls,
  CASE
    WHEN image_urls IS NOT NULL AND array_length(image_urls, 1) > 0
    THEN 'Sí'
    ELSE 'No'
  END as tiene_imagenes
FROM products
WHERE is_active = true
ORDER BY name;
```

## Notas

- El script NO sobrescribe imágenes existentes
- Solo actualiza productos que tienen `image_urls` NULL o vacío
- Las imágenes se asignan según palabras clave en el nombre del producto
- Todos los productos recibirán al menos una imagen por defecto
