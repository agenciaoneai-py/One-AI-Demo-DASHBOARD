import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DEMO_USER_ID = 'demo_simulator_001';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExampleMessage(business = '') {
  const b = business.toLowerCase();
  if (b.includes('joyer') || b.includes('silver') || b.includes('perla')) return 'busco una pulsera de perla';
  if (b.includes('restaurant') || b.includes('parrilla') || b.includes('pizza') || b.includes('comida')) return 'quiero ver el menú del día';
  if (b.includes('clínic') || b.includes('clinic') || b.includes('médic') || b.includes('salud')) return 'quiero agendar una consulta';
  if (b.includes('ropa') || b.includes('urban') || b.includes('moda') || b.includes('style')) return '¿tienen remeras nuevas?';
  if (b.includes('inmobil') || b.includes('propiedad') || b.includes('este')) return 'busco un departamento en Asunción';
  if (b.includes('farmac') || b.includes('quimic')) return 'necesito información sobre un medicamento';
  return 'me interesa conocer sus productos';
}

// Resize an uploaded image client-side and return a base64 data URL.
// Keeps payloads under control for the OpenAI vision API.
async function resizeImageToBase64(file, maxDim = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatGsAmount(n) {
  return Math.round(Number(n) || 0).toLocaleString('es-PY', { maximumFractionDigits: 0 });
}

function formatAppointmentDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PY', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-fade-in-up">
      <div className={`px-4 py-3 rounded-xl shadow-xl text-sm flex items-center gap-2 ${
        type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
      }`}>
        <i className={`fas ${type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-red-200'}`} />
        {message}
      </div>
    </div>
  );
}

// ─── PromptEditorModal ────────────────────────────────────────────────────────

function PromptEditorModal({ onClose, onSaved }) {
  const [prompt,       setPrompt]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [fetchError,   setFetchError]   = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/demo/prompt`)
      .then(r => r.json())
      .then(d => setPrompt(d.prompt || ''))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!prompt.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/demo/prompt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
        onClose();
      } else {
        onSaved('error');
        onClose();
      }
    } catch {
      onSaved('error');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Editar Prompt del Agente</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
            <i className="fas fa-xmark text-xl" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Este es el prompt del sistema que define cómo responde tu agente de IA. Los cambios se aplican a partir del próximo mensaje.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="py-8 text-center text-sm text-red-500">
            <i className="fas fa-exclamation-circle mr-2" />
            No se pudo cargar el prompt. Intentá de nuevo.
          </div>
        ) : (
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={16}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            placeholder="Sos un asistente de ventas para..."
            autoFocus
          />
        )}

        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">{prompt.length} caracteres</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !prompt.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {saving
                ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                : <><i className="fas fa-save" /> Guardar Prompt</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SimulacionPage ───────────────────────────────────────────────────────────

function SimulacionPage({ config }) {
  const [messages,         setMessages]         = useState([]);
  const [inputMessage,     setInputMessage]      = useState('');
  const [isTyping,         setIsTyping]          = useState(false);
  const [promptEditorOpen, setPromptEditorOpen]  = useState(false);
  const [lightboxImage,    setLightboxImage]     = useState(null);
  const [toast,            setToast]             = useState(null);
  const [pendingImage,     setPendingImage]      = useState(null);  // base64 data URL
  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);

  // Derive display values from config
  const agentName    = config?.ownerName    || 'Agente IA';
  const businessName = config?.businessName || 'Tu Negocio';
  const agentRole    = config?.industryConfig?.agentRole || 'Asistente de ventas';
  const logoUrl      = config?.logoUrl      || null;
  const avatarInitial = agentName.charAt(0).toUpperCase();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!inputMessage.trim() && !pendingImage) return;

    const text = inputMessage;
    const imageUrl = pendingImage;
    setInputMessage('');
    setPendingImage(null);

    setMessages(prev => [...prev, { type: 'user', text, imageUrl, timestamp: new Date() }]);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_URL}/webhook/demo-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          message: text,
          platform: 'demo',
          imageUrl: imageUrl || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { type: 'agent', text: data.response, timestamp: new Date() }]);
        if (data.products?.length > 0) {
          setMessages(prev => [...prev, { type: 'products', products: data.products, timestamp: new Date() }]);
        }
        if (data.appointment) {
          setMessages(prev => [...prev, { type: 'appointment', appointment: data.appointment, timestamp: new Date() }]);
        }
        if (data.order) {
          setMessages(prev => [...prev, { type: 'order', order: data.order, timestamp: new Date() }]);
        }
      } else {
        setToast({ type: 'error', message: 'Error al enviar mensaje' });
      }
    } catch (err) {
      console.error('Error:', err);
      setToast({ type: 'error', message: 'Error de conexión' });
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToast({ type: 'error', message: 'Solo se permiten imágenes' });
      return;
    }
    try {
      const dataUrl = await resizeImageToBase64(file, 1024);
      setPendingImage(dataUrl);
    } catch (err) {
      console.error('Error procesando imagen:', err);
      setToast({ type: 'error', message: 'Error procesando la imagen' });
    } finally {
      // Clear so re-uploading the same file fires onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePromptSaved = (result) => {
    if (result === 'error') {
      setToast({ type: 'error', message: 'Error guardando el prompt' });
    } else {
      setToast({ type: 'success', message: 'Prompt actualizado. Se aplica desde el próximo mensaje.' });
    }
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Chat */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto bg-white shadow-xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={businessName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-white font-bold text-sm">{avatarInitial}</span>
              )}
            </div>
            <div>
              <p className="font-bold text-white">{agentName} – {businessName}</p>
              <p className="text-xs text-green-100">{agentRole} • En línea</p>
            </div>
          </div>
          <button
            onClick={() => setPromptEditorOpen(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            <i className="fas fa-cog" />
            Editar Prompt
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-yellow-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900 mb-1">💬 Simulador de Conversación</p>
              <p className="text-xs text-yellow-700">
                Así se verá {agentName} respondiendo en WhatsApp/Instagram de {businessName}.
                Probá consultando por productos, precios o delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#e5ddd5]">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-comments text-green-600 text-3xl" />
              </div>
              <p className="text-gray-600 font-semibold mb-2">Iniciá la conversación</p>
              <p className="text-sm text-gray-500">
                Ejemplo: "{getExampleMessage(businessName)}"
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.type === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-md">
                    <div className="bg-[#dcf8c6] px-3 py-2 rounded-lg shadow">
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="Imagen enviada"
                          className="rounded mb-2 max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition"
                          onClick={() => setLightboxImage(msg.imageUrl)}
                        />
                      )}
                      {msg.text && <p className="text-sm text-gray-900">{msg.text}</p>}
                      <p className="text-xs text-gray-500 text-right mt-1">
                        {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {msg.type === 'agent' && (
                <div className="flex justify-start">
                  <div className="max-w-md">
                    <div className="bg-white px-4 py-2 rounded-lg shadow">
                      <p className="text-sm text-gray-900 whitespace-pre-line">{msg.text}</p>
                      <p className="text-xs text-gray-500 text-right mt-1">
                        {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {msg.type === 'products' && msg.products?.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-lg">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      {msg.products.map((product, pIdx) => {
                        const imgSrc = product.image_url || product.image_urls?.[0];
                        const currency = product.currency === 'USD' ? 'USD' : 'Gs';
                        const stockNum = product.stock ?? product.stock_quantity;
                        return (
                          <div key={pIdx} className="border-b last:border-b-0 p-3 hover:bg-gray-50">
                            <div className="flex gap-3">
                              {imgSrc && (
                                <img
                                  src={imgSrc}
                                  alt={product.name}
                                  className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80 transition flex-shrink-0"
                                  onClick={() => setLightboxImage(imgSrc)}
                                  title="Click para ver en tamaño completo"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                                {product.description && (
                                  <p className="text-xs text-gray-500 mb-1 line-clamp-2">{product.description}</p>
                                )}
                                <p className="text-lg font-bold text-green-600">
                                  {formatGsAmount(product.price)} {currency}
                                </p>
                                {stockNum > 0 && (
                                  <p className="text-xs text-gray-500">Stock: {stockNum}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-xs text-gray-400 text-right p-2">
                        {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {msg.type === 'appointment' && msg.appointment && (
                <div className="flex justify-start">
                  <div className="max-w-md w-full">
                    <div className="bg-white rounded-lg shadow border-l-4 border-emerald-500 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <i className="fas fa-circle-check text-emerald-500 text-lg" />
                        <p className="text-sm font-bold text-emerald-700">Cita agendada</p>
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-700">
                        <p><i className="fas fa-user text-gray-400 w-5" /> {msg.appointment.customer_name}</p>
                        <p><i className="fas fa-clipboard-list text-gray-400 w-5" /> {msg.appointment.service}</p>
                        <p><i className="fas fa-calendar text-gray-400 w-5" /> {formatAppointmentDate(msg.appointment.date)}</p>
                        <p><i className="fas fa-clock text-gray-400 w-5" /> {msg.appointment.time}</p>
                        {msg.appointment.customer_phone && (
                          <p><i className="fas fa-phone text-gray-400 w-5" /> {msg.appointment.customer_phone}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 text-right mt-2">
                        {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {msg.type === 'order' && msg.order && (
                <div className="flex justify-start">
                  <div className="max-w-md w-full">
                    <div className="bg-white rounded-lg shadow border-l-4 border-indigo-500 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <i className="fas fa-bag-shopping text-indigo-500 text-lg" />
                        <p className="text-sm font-bold text-indigo-700">Pedido creado</p>
                      </div>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><i className="fas fa-user text-gray-400 w-5" /> {msg.order.customer_name}</p>
                        <div className="bg-gray-50 rounded p-2 space-y-1">
                          {(msg.order.items || []).map((item, iIdx) => (
                            <div key={iIdx} className="flex justify-between text-xs">
                              <span className="text-gray-700">
                                {item.quantity}× {item.product_name}
                              </span>
                              <span className="text-gray-500">
                                {formatGsAmount(item.quantity * item.unit_price)} Gs
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t">
                          <span className="text-xs font-semibold text-gray-600">TOTAL</span>
                          <span className="font-bold text-indigo-700">
                            {formatGsAmount(msg.order.total)} Gs
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          <i className={`fas ${msg.order.delivery_type === 'delivery' ? 'fa-truck' : 'fa-store'} mr-1.5`} />
                          {msg.order.delivery_type === 'delivery' ? 'Delivery' : 'Retiro en local'}
                          {msg.order.delivery_address && ` — ${msg.order.delivery_address}`}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 text-right mt-2">
                        {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-lg shadow">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-gray-100 p-4 border-t border-gray-200">
          {/* Image preview */}
          {pendingImage && (
            <div className="mb-3 flex items-center gap-3 bg-white rounded-lg p-2 border border-gray-200">
              <img src={pendingImage} alt="Preview" className="w-14 h-14 object-cover rounded" />
              <div className="flex-1 text-sm text-gray-600">
                <p className="font-medium">Imagen lista para enviar</p>
                <p className="text-xs text-gray-400">Escribí un mensaje opcional</p>
              </div>
              <button
                onClick={() => setPendingImage(null)}
                className="text-gray-400 hover:text-red-500 p-2"
                title="Quitar imagen"
              >
                <i className="fas fa-xmark" />
              </button>
            </div>
          )}

          <div className="flex gap-3 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping}
              title="Adjuntar imagen"
              className="w-12 h-12 flex items-center justify-center bg-white border border-gray-300 rounded-full text-gray-500 hover:text-green-600 hover:bg-green-50 transition disabled:opacity-50"
            >
              <i className="fas fa-paperclip text-lg" />
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={`Escribile a ${agentName}...`}
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={(!inputMessage.trim() && !pendingImage) || isTyping}
              className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              <i className="fas fa-paper-plane" />
            </button>
          </div>
        </div>
      </div>

      {/* Prompt editor */}
      {promptEditorOpen && (
        <PromptEditorModal
          onClose={() => setPromptEditorOpen(false)}
          onSaved={handlePromptSaved}
        />
      )}

      {/* Image lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 leading-none"
            onClick={() => setLightboxImage(null)}
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Producto expandido"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Toast */}
      {toast && <Toast key={toast.message} {...toast} onDone={() => setToast(null)} />}
    </div>
  );
}

export default SimulacionPage;
