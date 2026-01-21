-- Script para agregar URLs de imágenes de ejemplo a productos
-- Usa imágenes de productos de joyería de Unsplash (gratuitas y sin copyright)

-- Anillos
UPDATE products
SET image_urls = ARRAY[
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500'
]
WHERE name ILIKE '%anillo%' AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Pulseras
UPDATE products
SET image_urls = ARRAY[
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500',
  'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=500'
]
WHERE name ILIKE '%pulsera%' AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Collares
UPDATE products
SET image_urls = ARRAY[
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500',
  'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=500'
]
WHERE name ILIKE '%collar%' AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Aretes/Aros
UPDATE products
SET image_urls = ARRAY[
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500',
  'https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=500'
]
WHERE (name ILIKE '%arete%' OR name ILIKE '%aro%')
  AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Cadenas
UPDATE products
SET image_urls = ARRAY[
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500'
]
WHERE name ILIKE '%cadena%' AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Perlas (productos con perla en el nombre)
UPDATE products
SET image_urls = ARRAY[
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500'
]
WHERE name ILIKE '%perla%' AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Diamantes (productos con diamante en el nombre)
UPDATE products
SET image_urls = ARRAY[
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500'
]
WHERE name ILIKE '%diamante%' AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Oro/Plata (productos por material)
UPDATE products
SET image_urls = ARRAY[
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500'
]
WHERE (name ILIKE '%oro%' OR name ILIKE '%plata%')
  AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Solitarios
UPDATE products
SET image_urls = ARRAY[
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500'
]
WHERE name ILIKE '%solitario%' AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Fallback: Productos sin imágenes que no matchearon ninguna categoría
UPDATE products
SET image_urls = ARRAY[
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500'
]
WHERE (image_urls IS NULL OR array_length(image_urls, 1) IS NULL) AND is_active = true;

-- Verificar cuántos productos tienen imágenes ahora
SELECT
  COUNT(*) as total_productos,
  COUNT(CASE WHEN image_urls IS NOT NULL AND array_length(image_urls, 1) > 0 THEN 1 END) as con_imagenes,
  COUNT(CASE WHEN image_urls IS NULL OR array_length(image_urls, 1) IS NULL THEN 1 END) as sin_imagenes
FROM products
WHERE is_active = true;
