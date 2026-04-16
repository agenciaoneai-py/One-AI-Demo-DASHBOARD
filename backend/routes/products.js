import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

const BUCKET = 'product-images';

// Ensure bucket exists on first use
let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] });
    console.log(`✅ Bucket "${BUCKET}" created`);
  }
  bucketReady = true;
}

// GET /api/products - Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/products/:id - Obtener un producto por ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/products/:id/image — Upload product image to Supabase Storage
router.post('/:id/image', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }), async (req, res) => {
  try {
    await ensureBucket();

    const productId = req.params.id;
    const contentType = req.headers['content-type'] || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const filename = `${Date.now()}_${productId.substring(0, 8)}.${ext}`;

    // Upload to Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, req.body, { contentType, upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Build public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    // Update product — prepend to image_urls array
    const { data: product } = await supabase
      .from('products')
      .select('image_urls')
      .eq('id', productId)
      .single();

    const currentUrls = product?.image_urls || [];
    const newUrls = [publicUrl, ...currentUrls];

    const { error: updateError } = await supabase
      .from('products')
      .update({ image_urls: newUrls })
      .eq('id', productId);

    if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

    console.log(`📸 Image uploaded for product ${productId}: ${filename}`);

    res.json({ success: true, url: publicUrl, image_urls: newUrls });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/products/:id/image — Remove a product image
router.delete('/:id/image', async (req, res) => {
  try {
    const productId = req.params.id;
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'url required' });

    // Remove from image_urls array
    const { data: product } = await supabase
      .from('products')
      .select('image_urls')
      .eq('id', productId)
      .single();

    const newUrls = (product?.image_urls || []).filter(u => u !== url);

    const { error: updateError } = await supabase
      .from('products')
      .update({ image_urls: newUrls })
      .eq('id', productId);

    if (updateError) throw updateError;

    // Try to delete from storage (extract filename from URL)
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    if (filename) {
      await supabase.storage.from(BUCKET).remove([filename]);
    }

    res.json({ success: true, image_urls: newUrls });
  } catch (error) {
    console.error('Error removing image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;