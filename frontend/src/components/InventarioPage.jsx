import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function InventarioPage({ config }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [uploading, setUploading] = useState(null); // productId being uploaded
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const uploadTargetRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`);
      const result = await response.json();

      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    const productId = uploadTargetRef.current;
    if (!file || !productId) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setToast({ type: 'error', msg: 'Solo JPG, PNG o WebP' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', msg: 'Máximo 5MB' });
      return;
    }

    setUploading(productId);
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}/image`, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, image_urls: data.image_urls } : p));
        setToast({ type: 'success', msg: 'Foto subida' });
      } else {
        setToast({ type: 'error', msg: data.error || 'Error subiendo foto' });
      }
    } catch {
      setToast({ type: 'error', msg: 'Error de conexión' });
    } finally {
      setUploading(null);
      uploadTargetRef.current = null;
    }
  };

  const handleDeleteImage = async (productId, url) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}/image`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, image_urls: data.image_urls } : p));
        setToast({ type: 'success', msg: 'Foto eliminada' });
      }
    } catch {
      setToast({ type: 'error', msg: 'Error eliminando foto' });
    }
  };

  const triggerUpload = (productId) => {
    uploadTargetRef.current = productId;
    fileInputRef.current?.click();
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const categories = ['all', ...new Set(products.map(p => p.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventario</h1>
          <p className="text-gray-500">{products.length} productos en total</p>
        </div>
        <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
          <i className="fas fa-plus mr-2"></i>
          Agregar Producto
        </button>
      </div>

      {/* Filtros por categoría */}
      <div className="flex gap-2 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {cat === 'all' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      {/* Hidden file input for image uploads */}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />

      {/* Grid de productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProducts.map(product => {
          const hasImage = product.image_urls && product.image_urls[0];
          const isUploading = uploading === product.id;
          return (
            <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition">
              {/* Imagen + upload overlay */}
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative group">
                {hasImage ? (
                  <>
                    <img
                      src={product.image_urls[0]}
                      alt={product.name}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setLightboxImage(product.image_urls[0])}
                    />
                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => triggerUpload(product.id)}
                        className="px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-gray-700 shadow hover:bg-gray-50 transition"
                      >
                        <i className="fas fa-camera mr-1"></i>Cambiar
                      </button>
                      <button
                        onClick={() => handleDeleteImage(product.id, product.image_urls[0])}
                        className="px-3 py-1.5 bg-red-500 rounded-lg text-xs font-semibold text-white shadow hover:bg-red-600 transition"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => triggerUpload(product.id)}
                    disabled={isUploading}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="text-xs text-indigo-600 font-medium">Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-cloud-arrow-up text-indigo-400 text-3xl"></i>
                        <span className="text-xs text-gray-500 font-medium">Subir foto</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Info del producto */}
              <div className="p-4">
                <div className="mb-2">
                  <p className="text-xs text-gray-500 mb-1">{product.sku}</p>
                  <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                </div>

                {/* Precio y Stock */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      {Number(product.price) > 0 ? `${Math.round(product.price).toLocaleString('es-PY')} Gs` : 'Cotizar'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-semibold ${
                      product.stock_quantity > 10 ? 'text-green-600' :
                      product.stock_quantity > 0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {product.stock_quantity} stock
                    </p>
                    <p className="text-xs text-gray-500">{product.category}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <button
                    onClick={() => triggerUpload(product.id)}
                    disabled={isUploading}
                    className="flex-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition disabled:opacity-50"
                  >
                    <i className={`fas ${hasImage ? 'fa-images' : 'fa-camera'} mr-1.5`}></i>
                    {hasImage ? 'Agregar foto' : 'Subir foto'}
                  </button>
                  <button className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-semibold hover:bg-gray-100 transition">
                    <i className="fas fa-pen"></i>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <i className="fas fa-box-open text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500">No hay productos en esta categoría</p>
        </div>
      )}

      {/* Lightbox para expandir imágenes */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Producto expandido"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-fade-in-up">
          <div className={`px-4 py-3 rounded-xl shadow-xl text-sm flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
          }`}>
            <i className={`fas ${toast.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-red-200'}`} />
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

export default InventarioPage;