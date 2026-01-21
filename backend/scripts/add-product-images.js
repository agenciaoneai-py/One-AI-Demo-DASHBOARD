import supabase from '../config/supabase.js';

// URLs de imágenes de joyería de alta calidad (Unsplash - gratuitas)
const imagesByCategory = {
  anillo: [
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500'
  ],
  pulsera: [
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500',
    'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=500'
  ],
  collar: [
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500',
    'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=500'
  ],
  arete: [
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500',
    'https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=500'
  ],
  cadena: [
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500'
  ],
  perla: [
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500',
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500'
  ],
  diamante: [
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500'
  ],
  default: [
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500',
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500'
  ]
};

async function addImagesToProducts() {
  try {
    console.log('🔍 Obteniendo productos sin imágenes...');

    // Obtener todos los productos activos
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    console.log(`📦 Total de productos: ${products.length}`);

    let updated = 0;
    let alreadyHasImages = 0;

    for (const product of products) {
      // Verificar si ya tiene imágenes
      if (product.image_urls && product.image_urls.length > 0) {
        alreadyHasImages++;
        console.log(`✓ ${product.name} ya tiene imágenes`);
        continue;
      }

      // Determinar qué imágenes usar según el nombre del producto
      let images = imagesByCategory.default;
      const nameLower = product.name.toLowerCase();

      for (const [keyword, urls] of Object.entries(imagesByCategory)) {
        if (keyword !== 'default' && nameLower.includes(keyword)) {
          images = urls;
          break;
        }
      }

      // Actualizar el producto
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_urls: images })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Error actualizando ${product.name}:`, updateError);
      } else {
        updated++;
        console.log(`✅ Imágenes agregadas a: ${product.name}`);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`  Total de productos: ${products.length}`);
    console.log(`  Con imágenes previas: ${alreadyHasImages}`);
    console.log(`  Actualizados: ${updated}`);
    console.log('\n✅ Proceso completado');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar el script
addImagesToProducts();
