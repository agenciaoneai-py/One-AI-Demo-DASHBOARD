import { useState, useEffect } from 'react';

function InventarioPage({ config }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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

      {/* Grid de productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition">
            {/* Imagen */}
            <div className="aspect-[4/3] bg-gray-100 overflow-hidden cursor-pointer" onClick={() => product.image_urls?.[0] && setLightboxImage(product.image_urls[0])}>
              {product.image_urls && product.image_urls[0] ? (
                <img
                  src={product.image_urls[0]}
                  alt={product.name}
                  className="w-full h-full object-cover hover:opacity-90 transition"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="fas fa-image text-gray-300 text-5xl"></i>
                </div>
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
                    ${product.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{product.currency}</p>
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

              {/* Metadata */}
              {product.metadata && Object.keys(product.metadata).length > 0 && (
                <div className="border-t border-gray-100 pt-2 mb-3">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(product.metadata).slice(0, 3).map(([key, value]) => {
                      const labelMap = {
                        size_mm: 'Tamaño',
                        material: 'Material',
                        stone_type: 'Piedra',
                        stone_carats: 'Quilates',
                        weight_grams: 'Peso',
                        length_cm: 'Largo',
                        pearl_size_mm: 'Tamaño perla'
                      };
                      const label = labelMap[key] || key;
                      return (
                        <span key={key} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">
                          {label}: {value}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition">
                  <i className="fas fa-pen mr-1.5"></i>
                  Editar
                </button>
                <button className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition">
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
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
    </div>
  );
}

export default InventarioPage;