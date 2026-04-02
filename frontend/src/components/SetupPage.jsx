import { useState, useEffect } from 'react';
import { API_URL, useAppContext } from '../App';

// ─── Templates ──────────────────────────────────────────────
const TEMPLATES = {
  joyeria: {
    label: 'Joyería',
    icon: 'fas fa-gem',
    businessName: 'Silver Line Joyería',
    agentName: 'Jessica',
    agentRole: 'Asesora de ventas',
    systemPrompt: `Sos Jessica, asesora de ventas de Silver Line Joyería en Paraguay. Hablás en español paraguayo, con tono amigable y profesional. Tu objetivo es ayudar a los clientes a encontrar la joya perfecta, resolver consultas sobre precios, materiales y disponibilidad, y cerrar ventas. Siempre mencioná los productos disponibles cuando sea relevante. Ofrecé delivery y preguntá la zona. Si el cliente está listo para comprar, pedí sus datos para el pedido.`,
    products: [
      { name: 'Anillo Solitario Diamante', price: 2500000, category: 'Anillos', stock: 8, description: 'Anillo de oro 18k con diamante central de 0.5ct' },
      { name: 'Pulsera de Perlas Naturales', price: 450000, category: 'Pulseras', stock: 15, description: 'Pulsera artesanal con perlas naturales cultivadas' },
      { name: 'Collar Corazón Oro Rosa', price: 680000, category: 'Collares', stock: 12, description: 'Collar de oro rosa 14k con dije de corazón' },
      { name: 'Aretes Gota Esmeralda', price: 890000, category: 'Aretes', stock: 6, description: 'Aretes de plata 925 con esmeralda colombiana' },
      { name: 'Alianzas de Boda Clásicas', price: 1200000, category: 'Alianzas', stock: 20, description: 'Par de alianzas en oro 18k, grabado incluido' },
    ],
    features: { multiChannel: true, inventory: true, crm: true, orders: true, appointments: true, delivery: true },
  },
  restaurante: {
    label: 'Restaurante',
    icon: 'fas fa-utensils',
    businessName: 'La Parrilla de Don Carlos',
    agentName: 'Carlos',
    agentRole: 'Asesor de pedidos',
    systemPrompt: `Sos Carlos, el asistente virtual de La Parrilla de Don Carlos, restaurante paraguayo especializado en parrilladas y comida típica. Hablás en español paraguayo, amigable y eficiente. Tu objetivo es tomar pedidos, explicar el menú, informar tiempos de delivery y resolver consultas. Siempre sugerí combos y bebidas. Preguntá la zona para calcular el delivery.`,
    products: [
      { name: 'Parrillada Completa (2 personas)', price: 180000, category: 'Parrilladas', stock: 50, description: 'Asado, chorizo, morcilla, ensalada y mandioca' },
      { name: 'Lomito al Champignon', price: 95000, category: 'Platos', stock: 30, description: 'Lomito de res con salsa de champignon y papas' },
      { name: 'Empanadas (docena)', price: 60000, category: 'Entradas', stock: 100, description: 'Empanadas de carne, pollo o jamón y queso' },
      { name: 'Sopa Paraguaya', price: 25000, category: 'Guarniciones', stock: 40, description: 'Sopa paraguaya tradicional casera' },
      { name: 'Combo Familiar (4 personas)', price: 320000, category: 'Combos', stock: 20, description: 'Parrillada grande, 4 bebidas, ensalada y postre' },
    ],
    features: { multiChannel: true, inventory: true, crm: true, orders: true, appointments: false, delivery: true },
  },
  clinica: {
    label: 'Clínica',
    icon: 'fas fa-heartbeat',
    businessName: 'Clínica Santa María',
    agentName: 'Ana',
    agentRole: 'Asistente de citas',
    systemPrompt: `Sos Ana, asistente virtual de la Clínica Santa María. Tu rol es agendar citas médicas, informar sobre especialidades disponibles, horarios de doctores y preparaciones para estudios. Hablás en español paraguayo, con tono profesional y empático. Nunca des diagnósticos ni recomendaciones médicas. Siempre confirmá disponibilidad antes de agendar.`,
    products: [
      { name: 'Consulta General', price: 150000, category: 'Consultas', stock: 99, description: 'Consulta con médico clínico' },
      { name: 'Consulta Especialista', price: 250000, category: 'Consultas', stock: 99, description: 'Consulta con especialista (cardiólogo, dermatólogo, etc.)' },
      { name: 'Ecografía', price: 200000, category: 'Estudios', stock: 99, description: 'Ecografía abdominal o pélvica' },
      { name: 'Análisis de Sangre Completo', price: 180000, category: 'Laboratorio', stock: 99, description: 'Hemograma, glucemia, perfil lipídico, hepático y renal' },
      { name: 'Chequeo Ejecutivo', price: 800000, category: 'Paquetes', stock: 99, description: 'Consulta + laboratorio + ECG + ecografía' },
    ],
    features: { multiChannel: true, inventory: false, crm: true, orders: false, appointments: true, delivery: false },
  },
  ropa: {
    label: 'Tienda de ropa',
    icon: 'fas fa-tshirt',
    businessName: 'Urban Style PY',
    agentName: 'Valentina',
    agentRole: 'Asesora de moda',
    systemPrompt: `Sos Valentina, asesora de moda de Urban Style PY, tienda de ropa urbana y casual en Paraguay. Hablás en español paraguayo, con onda y buena vibra. Ayudás a los clientes a elegir outfits, consultás tallas disponibles y procesás pedidos. Sugerí combinaciones y mencioná ofertas activas. Preguntá talla antes de confirmar.`,
    products: [
      { name: 'Remera Oversize Básica', price: 89000, category: 'Remeras', stock: 45, description: 'Algodón premium, disponible en S/M/L/XL' },
      { name: 'Jean Mom Fit', price: 195000, category: 'Pantalones', stock: 25, description: 'Jean tiro alto, lavado claro' },
      { name: 'Campera Denim', price: 280000, category: 'Abrigos', stock: 15, description: 'Campera de jean clásica con botones' },
      { name: 'Vestido Midi Floral', price: 165000, category: 'Vestidos', stock: 20, description: 'Vestido midi estampado floral, tela liviana' },
      { name: 'Zapatillas Urban', price: 320000, category: 'Calzado', stock: 18, description: 'Zapatillas urbanas blancas, suela gruesa' },
    ],
    features: { multiChannel: true, inventory: true, crm: true, orders: true, appointments: false, delivery: true },
  },
  inmobiliaria: {
    label: 'Inmobiliaria',
    icon: 'fas fa-building',
    businessName: 'Propiedades del Este',
    agentName: 'Roberto',
    agentRole: 'Asesor inmobiliario',
    systemPrompt: `Sos Roberto, asesor inmobiliario de Propiedades del Este, especializado en propiedades en Asunción, Luque y San Lorenzo. Hablás en español paraguayo, profesional y confiable. Tu objetivo es entender las necesidades del cliente (compra/alquiler, presupuesto, zona, tipo de propiedad), mostrar opciones disponibles y agendar visitas. Nunca presiones, sé consultivo.`,
    products: [
      { name: 'Departamento 2 amb. Asunción', price: 85000, category: 'Alquiler', stock: 3, description: 'Dto. 2 ambientes, barrio Carmelitas, 65m²' },
      { name: 'Casa 3 dormitorios Luque', price: 450000000, category: 'Venta', stock: 1, description: 'Casa con patio, 3 dorm, 2 baños, garage' },
      { name: 'Local Comercial Centro', price: 120000, category: 'Alquiler', stock: 2, description: 'Local 40m² sobre calle principal' },
      { name: 'Terreno 360m² San Lorenzo', price: 280000000, category: 'Venta', stock: 4, description: 'Terreno loteado, zona residencial, servicios' },
      { name: 'Oficina Coworking', price: 65000, category: 'Alquiler', stock: 8, description: 'Puesto en coworking, Wi-Fi, AC, sala de reuniones' },
    ],
    features: { multiChannel: true, inventory: true, crm: true, orders: false, appointments: true, delivery: false },
  },
};

const EMPTY_PRODUCT = { name: '', price: '', category: '', stock: '', description: '' };

const FEATURE_LABELS = {
  multiChannel: { label: 'Canales (IG/WA/FB)', icon: 'fas fa-comments' },
  inventory: { label: 'Inventario', icon: 'fas fa-boxes' },
  crm: { label: 'CRM', icon: 'fas fa-users' },
  orders: { label: 'Pedidos', icon: 'fas fa-shopping-bag' },
  appointments: { label: 'Citas', icon: 'fas fa-calendar-alt' },
  delivery: { label: 'Delivery', icon: 'fas fa-truck' },
};

const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition outline-none';

export default function SetupPage() {
  const { setConfig, setStats } = useAppContext();

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentRole, setAgentRole] = useState('Asesora de ventas');
  const [logoUrl, setLogoUrl] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [products, setProducts] = useState([{ ...EMPTY_PRODUCT }, { ...EMPTY_PRODUCT }, { ...EMPTY_PRODUCT }]);
  const [features, setFeatures] = useState({
    multiChannel: true, inventory: true, crm: true, orders: true, appointments: false, delivery: false,
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Load current status
  useEffect(() => {
    fetch(`${API_URL}/api/demo/setup/status`)
      .then(r => r.json())
      .then(data => { if (data.success) setStatus(data.data); })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Apply template
  const applyTemplate = (key) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setBusinessName(t.businessName);
    setAgentName(t.agentName);
    setAgentRole(t.agentRole);
    setSystemPrompt(t.systemPrompt);
    setProducts(t.products.map(p => ({ ...p, price: String(p.price), stock: String(p.stock) })));
    setFeatures({ ...t.features });
    setLogoUrl('');
  };

  // Product table helpers
  const updateProduct = (idx, field, value) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const addProduct = () => setProducts(prev => [...prev, { ...EMPTY_PRODUCT }]);
  const removeProduct = (idx) => {
    if (products.length <= 1) return;
    setProducts(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleFeature = (key) => setFeatures(prev => ({ ...prev, [key]: !prev[key] }));

  // Validate
  const validProducts = products.filter(p => p.name.trim() && p.price);
  const isValid = businessName.trim() && agentName.trim() && systemPrompt.trim() && validProducts.length >= 1;

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setToast(null);

    try {
      const body = {
        businessName: businessName.trim(),
        agentName: agentName.trim(),
        agentRole: agentRole.trim() || 'Asesora de ventas',
        logoUrl: logoUrl.trim(),
        systemPrompt: systemPrompt.trim(),
        products: validProducts.map(p => ({
          name: p.name.trim(),
          price: Number(p.price),
          currency: 'Gs',
          category: p.category.trim() || 'General',
          description: p.description.trim(),
          stock: Number(p.stock) || 10,
        })),
        features,
      };

      const res = await fetch(`${API_URL}/api/demo/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setToast({ type: 'success', message: data.message });
        // Refresh status
        const statusRes = await fetch(`${API_URL}/api/demo/setup/status`).then(r => r.json());
        if (statusRes.success) setStatus(statusRes.data);
        // Refresh global config + stats
        const [configRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/config`).then(r => r.json()),
          fetch(`${API_URL}/api/demo/stats`).then(r => r.json()),
        ]);
        if (configRes.success) setConfig(configRes.data);
        setStats(statsRes);
      } else {
        setToast({ type: 'error', message: data.error || 'Error desconocido' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 max-w-md px-5 py-4 rounded-xl shadow-lg border flex items-start gap-3 animate-in ${
          toast.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'} text-lg mt-0.5`}></i>
          <div className="flex-1">
            <p className={`text-sm font-medium ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xs"></i></button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            <i className="fas fa-cog text-indigo-500 mr-2"></i>Configurar Demo
          </h1>
          <p className="text-gray-500">Prepará el dashboard para tu próxima reunión</p>
        </div>

        {/* Template selector */}
        <div className="relative group">
          <button type="button" className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2 shadow-sm">
            <i className="fas fa-magic text-indigo-500"></i>
            Templates rápidos
            <i className="fas fa-chevron-down text-gray-400 text-xs ml-1"></i>
          </button>
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 hidden group-hover:block z-40">
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <i className={`${t.icon} text-indigo-500 text-sm`}></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-400">{t.businessName}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">

        {/* ── DATOS DEL NEGOCIO ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-store text-indigo-500"></i>Datos del negocio
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio <span className="text-red-400">*</span></label>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                placeholder="Silver Line Joyería" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del agente <span className="text-red-400">*</span></label>
              <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                placeholder="Jessica" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol del agente</label>
              <input type="text" value={agentRole} onChange={e => setAgentRole(e.target.value)}
                placeholder="Asesora de ventas" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL <span className="text-gray-400 text-xs">(opcional)</span></label>
              <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..." className={INPUT_CLASS} />
            </div>
          </div>
        </div>

        {/* ── PROMPT ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-robot text-purple-500"></i>Prompt del agente <span className="text-red-400">*</span>
          </h3>
          <textarea
            value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
            rows={10}
            placeholder="Sos Jessica, asesora de ventas de Silver Line Joyería en Paraguay. Hablás en español paraguayo, con tono amigable y profesional..."
            className={`${INPUT_CLASS} font-mono text-sm leading-relaxed`}
          />
          <p className="mt-2 text-xs text-gray-400">
            <i className="fas fa-lightbulb text-amber-400 mr-1"></i>
            Describí la personalidad y conocimiento del agente. Incluí info sobre productos, políticas del negocio, y cómo debe responder.
          </p>
        </div>

        {/* ── PRODUCTOS ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <i className="fas fa-boxes text-blue-500"></i>Productos
              <span className="text-xs text-gray-400 font-normal ml-1">(mínimo 1 con nombre y precio)</span>
            </h3>
            <button type="button" onClick={addProduct}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1.5">
              <i className="fas fa-plus text-xs"></i>Agregar
            </button>
          </div>

          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-1 mb-2">
            <span className="col-span-3 text-xs font-semibold text-gray-500 uppercase">Nombre</span>
            <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase">Precio (Gs)</span>
            <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase">Categoría</span>
            <span className="col-span-1 text-xs font-semibold text-gray-500 uppercase">Stock</span>
            <span className="col-span-3 text-xs font-semibold text-gray-500 uppercase">Descripción</span>
            <span className="col-span-1"></span>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {products.map((p, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50/50 rounded-lg p-2 md:p-1">
                <input type="text" value={p.name} onChange={e => updateProduct(idx, 'name', e.target.value)}
                  placeholder="Nombre producto" className={`${INPUT_CLASS} col-span-1 md:col-span-3`} />
                <input type="number" value={p.price} onChange={e => updateProduct(idx, 'price', e.target.value)}
                  placeholder="150000" min="0" className={`${INPUT_CLASS} col-span-1 md:col-span-2`} />
                <input type="text" value={p.category} onChange={e => updateProduct(idx, 'category', e.target.value)}
                  placeholder="Categoría" className={`${INPUT_CLASS} col-span-1 md:col-span-2`} />
                <input type="number" value={p.stock} onChange={e => updateProduct(idx, 'stock', e.target.value)}
                  placeholder="10" min="0" className={`${INPUT_CLASS} col-span-1 md:col-span-1`} />
                <input type="text" value={p.description} onChange={e => updateProduct(idx, 'description', e.target.value)}
                  placeholder="Descripción breve" className={`${INPUT_CLASS} col-span-1 md:col-span-3`} />
                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => removeProduct(idx)}
                    disabled={products.length <= 1}
                    className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
                    <i className="fas fa-trash-alt text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-gray-400">
            {validProducts.length} producto{validProducts.length !== 1 ? 's' : ''} válido{validProducts.length !== 1 ? 's' : ''}
            {validProducts.length < 1 && <span className="text-red-400 ml-1">— necesitás al menos 1</span>}
          </p>
        </div>

        {/* ── FEATURES ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-toggle-on text-green-500"></i>Features visibles en sidebar
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(FEATURE_LABELS).map(([key, { label, icon }]) => {
              const enabled = features[key];
              return (
                <button key={key} type="button" onClick={() => toggleFeature(key)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition flex items-center gap-2.5 ${
                    enabled ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                  }`}>
                  <i className={`${icon} ${enabled ? 'text-indigo-500' : 'text-gray-300'}`}></i>
                  <span>{label}</span>
                  <i className={`fas ${enabled ? 'fa-check-circle text-indigo-500' : 'fa-circle text-gray-200'} ml-auto`}></i>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SUBMIT ── */}
        <button type="submit" disabled={loading || !isValid}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm">
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Configurando demo...
            </>
          ) : (
            <>
              <i className="fas fa-rocket"></i>
              Preparar Demo
            </>
          )}
        </button>

        {/* ── STATUS ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-info-circle text-gray-400"></i>Estado actual
          </h3>
          {statusLoading ? (
            <div className="animate-pulse flex gap-4">
              <div className="h-5 bg-gray-200 rounded w-40"></div>
              <div className="h-5 bg-gray-200 rounded w-32"></div>
            </div>
          ) : status ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Negocio</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{status.businessName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Agente</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{status.agentName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Productos / Contactos</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{status.productCount} productos · {status.contactCount} contactos</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Última configuración</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {status.lastSetup
                    ? new Date(status.lastSetup).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date(status.lastSetup).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
                    : 'Nunca configurado'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No se pudo cargar el estado</p>
          )}
        </div>
      </form>
    </div>
  );
}
