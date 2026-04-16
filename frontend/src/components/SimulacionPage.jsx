import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DEMO_USER_ID = 'demo_simulator_001';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExampleMessage(business = '') {
  const b = business.toLowerCase();
  if (b.includes('luv')) return 'quiero ver las joyas';
  if (b.includes('joyer') || b.includes('silver') || b.includes('perla')) return 'busco una pulsera de perla';
  if (b.includes('restaurant') || b.includes('parrilla') || b.includes('pizza') || b.includes('comida')) return 'quiero ver el menú del día';
  if (b.includes('clínic') || b.includes('clinic') || b.includes('médic') || b.includes('salud')) return 'quiero agendar una consulta';
  if (b.includes('ropa') || b.includes('urban') || b.includes('moda') || b.includes('style')) return '¿tienen remeras nuevas?';
  if (b.includes('inmobil') || b.includes('propiedad') || b.includes('este')) return 'busco un departamento en Asunción';
  if (b.includes('farmac') || b.includes('quimic')) return 'necesito información sobre un medicamento';
  return 'me interesa conocer sus productos';
}

function getSuggestionChips(business = '') {
  const b = business.toLowerCase();
  if (b.includes('luv'))
    return ['Ver productos', 'Busco un regalo', 'Hacen delivery?'];
  if (b.includes('joyer') || b.includes('silver') || b.includes('perla'))
    return ['Qué joyas tienen?', 'Busco un regalo', 'Hacen delivery?'];
  if (b.includes('restaurant') || b.includes('parrilla') || b.includes('pizza') || b.includes('comida'))
    return ['Ver el menú', 'Quiero hacer pedido', 'Hacen delivery?'];
  if (b.includes('clínic') || b.includes('clinic') || b.includes('médic') || b.includes('salud'))
    return ['Agendar una cita', 'Ver precios', 'Aceptan obra social?'];
  if (b.includes('ropa') || b.includes('urban') || b.includes('moda') || b.includes('style'))
    return ['Qué ropa tienen?', 'Quiero hacer pedido', 'Hacen delivery?'];
  if (b.includes('inmobil') || b.includes('propiedad'))
    return ['Busco departamento', 'Quiero alquilar', 'Agendar una visita'];
  return ['Ver productos', 'Quiero hacer pedido', 'Hacen delivery?'];
}

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
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatGs(n) {
  return Math.round(Number(n) || 0).toLocaleString('es-PY', { maximumFractionDigits: 0 });
}

function formatApptDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PY', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  } catch { return dateStr; }
}

function fmtTime(d) {
  return d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function renderWhatsAppText(text) {
  if (!text) return null;
  // Parse WhatsApp formatting: *bold*, _italic_, ~strikethrough~
  const parts = [];
  // Parse formatting markers within single lines
  const regex = /(\*([^*\n]+)\*)|(_([^_\n]+)_)|(~([^~\n]+)~)/g;
  let lastIndex = 0;
  let match;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) parts.push(<strong key={keyIdx++}>{match[2]}</strong>);
    else if (match[4]) parts.push(<em key={keyIdx++}>{match[4]}</em>);
    else if (match[6]) parts.push(<del key={keyIdx++}>{match[6]}</del>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts.length > 0 ? parts : text;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Toast ───────────────────────────────────────────────────────────────────

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

// ─── PromptEditorModal (unchanged) ───────────────────────────────────────────

function PromptEditorModal({ onClose, onSaved }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(false);

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
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      onSaved(data.success ? undefined : 'error');
      onClose();
    } catch { onSaved('error'); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Editar Prompt del Agente</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><i className="fas fa-xmark text-xl" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Este es el prompt del sistema que define cómo responde tu agente de IA. Los cambios se aplican a partir del próximo mensaje.</p>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : fetchError ? (
          <div className="py-8 text-center text-sm text-red-500"><i className="fas fa-exclamation-circle mr-2" />No se pudo cargar el prompt.</div>
        ) : (
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={16}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            placeholder="Sos un asistente de ventas para..." autoFocus />
        )}
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">{prompt.length} caracteres</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">Cancelar</button>
            <button onClick={handleSave} disabled={saving || loading || !prompt.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar Prompt</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Capabilities tracker ────────────────────────────────────────────────────

const CAPABILITIES = [
  { key: 'search',      label: 'Buscar productos',     icon: 'fas fa-search' },
  { key: 'appointment', label: 'Agendar citas',         icon: 'fas fa-calendar-check' },
  { key: 'order',       label: 'Tomar pedidos',         icon: 'fas fa-bag-shopping' },
  { key: 'delivery',    label: 'Calcular delivery',     icon: 'fas fa-truck' },
  { key: 'vision',      label: 'Analizar imágenes',     icon: 'fas fa-image' },
  { key: 'handoff',     label: 'Derivar a humano',      icon: 'fas fa-headset' },
];

// ─── SimulacionPage ──────────────────────────────────────────────────────────

function SimulacionPage({ config }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [toast, setToast] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [usedCapabilities, setUsedCapabilities] = useState(new Set());
  const [chipsVisible, setChipsVisible] = useState(true);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const now = useNow();

  const agentName = config?.ownerName || 'Agente IA';
  const businessName = config?.businessName || 'Tu Negocio';
  const logoUrl = config?.logoUrl || null;
  const avatarInitial = (agentName || 'A').charAt(0).toUpperCase();
  const features = config?.features || {};

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Chat starts empty — the customer POV opens to a blank conversation

  const sendMessage = async (overrideText) => {
    const text = overrideText || inputMessage;
    if (!text.trim() && !pendingImage) return;

    const imageUrl = pendingImage;
    setInputMessage('');
    setPendingImage(null);
    setChipsVisible(false);

    if (imageUrl) setUsedCapabilities(prev => new Set(prev).add('vision'));

    setMessages(prev => [...prev, { type: 'user', text, imageUrl, timestamp: new Date() }]);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_URL}/webhook/demo-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEMO_USER_ID, message: text, platform: 'demo', imageUrl: imageUrl || null }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { type: 'agent', text: data.response, buttons: data.buttons || [], timestamp: new Date() }]);

        if (data.products?.length > 0) {
          setUsedCapabilities(prev => new Set(prev).add('search'));
          setMessages(prev => [...prev, { type: 'products', products: data.products, timestamp: new Date() }]);
        }
        if (data.appointment) {
          setUsedCapabilities(prev => new Set(prev).add('appointment'));
          setMessages(prev => [...prev, { type: 'appointment', appointment: data.appointment, timestamp: new Date() }]);
        }
        if (data.order) {
          setUsedCapabilities(prev => new Set(prev).add('order'));
          setMessages(prev => [...prev, { type: 'order', order: data.order, timestamp: new Date() }]);
        }
        if (data.referral) {
          setUsedCapabilities(prev => new Set(prev).add('handoff'));
          setMessages(prev => [...prev, { type: 'referral', referral: data.referral, timestamp: new Date() }]);
        }
        // Detect delivery/handoff from text
        const respLower = (data.response || '').toLowerCase();
        if (respLower.includes('delivery') || respLower.includes('envío') || respLower.includes('zona'))
          setUsedCapabilities(prev => new Set(prev).add('delivery'));
        if (respLower.includes('transferir') || respLower.includes('agente humano'))
          setUsedCapabilities(prev => new Set(prev).add('handoff'));
      } else {
        setToast({ type: 'error', message: 'Error al enviar mensaje' });
      }
    } catch {
      setToast({ type: 'error', message: 'Error de conexión' });
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setToast({ type: 'error', message: 'Solo se permiten imágenes' }); return; }
    try { setPendingImage(await resizeImageToBase64(file, 1024)); }
    catch { setToast({ type: 'error', message: 'Error procesando la imagen' }); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handlePromptSaved = (result) => {
    setToast(result === 'error'
      ? { type: 'error', message: 'Error guardando el prompt' }
      : { type: 'success', message: 'Prompt actualizado. Aplica desde el próximo mensaje.' });
  };

  const clearChat = () => {
    fetch(`${API_URL}/api/demo/conversation/${DEMO_USER_ID}`, { method: 'DELETE' }).catch(() => {});
    setMessages([]);
    setUsedCapabilities(new Set());
    setChipsVisible(true);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">

      {/* ══ LEFT PANEL (desktop only) ═══════════════════════════════════════ */}
      <div className="hidden md:flex flex-col justify-center flex-shrink-0 px-10 lg:px-16" style={{ width: '40%' }}>
        <div className="max-w-md">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
            Así ven tus clientes al empleado virtual
          </h1>
          <p className="text-gray-500 text-base lg:text-lg mb-8 leading-relaxed">
            Probá en tiempo real cómo <span className="font-semibold text-gray-700">{agentName}</span> atiende a los clientes de <span className="font-semibold text-gray-700">{businessName}</span>
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-10">
            <button onClick={() => setPromptEditorOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
              <i className="fas fa-wand-magic-sparkles" /> Editar Prompt
            </button>
            <button onClick={clearChat}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
              <i className="fas fa-arrows-rotate" /> Limpiar chat
            </button>
          </div>

          {/* Capabilities tracker */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Capacidades del agente</p>
            <div className="space-y-2">
              {CAPABILITIES.map(cap => {
                const active = usedCapabilities.has(cap.key);
                return (
                  <div key={cap.key} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${
                    active ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-500 ${
                      active ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      <i className={active ? 'fas fa-check' : cap.icon} />
                    </div>
                    <span className={`text-sm transition-colors duration-500 ${active ? 'text-emerald-700 font-medium' : 'text-gray-400'}`}>
                      {cap.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — IPHONE ══════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-4 md:pr-10 lg:pr-16">
        <div className="relative w-full max-w-[390px]" style={{ height: 'min(85vh, 780px)' }}>

          {/* iPhone outer frame */}
          <div className="absolute inset-0 rounded-[44px] bg-gray-800 shadow-2xl"
            style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 0 2px #1f2937' }} />

          {/* iPhone screen */}
          <div className="absolute inset-[3px] rounded-[42px] overflow-hidden flex flex-col bg-white">

            {/* Status bar */}
            <div className="relative flex items-center justify-between px-7 pt-3 pb-1 bg-[#075E54]" style={{ minHeight: '48px' }}>
              {/* Dynamic Island */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full" />
              {/* Time */}
              <span className="text-white text-xs font-semibold" style={{ fontSize: '13px' }}>
                {fmtTime(now)}
              </span>
              {/* Right icons */}
              <div className="flex items-center gap-1">
                <i className="fas fa-signal text-white" style={{ fontSize: '11px' }} />
                <i className="fas fa-wifi text-white" style={{ fontSize: '11px' }} />
                <i className="fas fa-battery-full text-white" style={{ fontSize: '13px' }} />
              </div>
            </div>

            {/* WhatsApp header */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-[#075E54]">
              <i className="fas fa-arrow-left text-white" style={{ fontSize: '16px' }} />
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {logoUrl
                  ? <img src={logoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                  : <span className="text-white font-bold text-sm">{avatarInitial}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{businessName}</p>
                <p className="text-emerald-200 text-xs">en linea</p>
              </div>
              <div className="flex items-center gap-4">
                <i className="fas fa-video text-white" style={{ fontSize: '15px' }} />
                <i className="fas fa-phone text-white" style={{ fontSize: '14px' }} />
                <i className="fas fa-ellipsis-vertical text-white" style={{ fontSize: '14px' }} />
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ backgroundColor: '#ECE5DD' }}>

              {/* Messages */}
              {messages.map((msg, idx) => (
                <div key={idx}>
                  {/* ── Agent bubble ── */}
                  {msg.type === 'agent' && (
                    <div className="flex justify-start mb-1">
                      <div className="max-w-[85%] bg-white rounded-lg rounded-tl-none shadow-sm overflow-hidden" style={{ borderColor: '#e2dbd3' }}>
                        <div className="px-3 py-2">
                          <p className="text-sm text-gray-900 whitespace-pre-line" style={{ fontSize: '14.5px', lineHeight: '1.35' }}>{renderWhatsAppText(msg.text)}</p>
                          <p className="text-right mt-0.5" style={{ fontSize: '11px', color: '#8696a0' }}>
                            {fmtTime(msg.timestamp)}
                          </p>
                        </div>
                        {msg.buttons && msg.buttons.length > 0 && (
                          <div style={{ borderTop: '1px solid #e2dbd3' }}>
                            {msg.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                onClick={() => {
                                  setMessages(prev => prev.map((m, mIdx) => mIdx === idx ? { ...m, buttons: [] } : m));
                                  sendMessage(btn.text);
                                }}
                                className="wa-reply-btn w-full text-center py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                                style={{
                                  color: '#00A884',
                                  borderBottom: bIdx < msg.buttons.length - 1 ? '1px solid #e2dbd3' : 'none',
                                  fontSize: '14px',
                                }}
                              >
                                {btn.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── User bubble ── */}
                  {msg.type === 'user' && (
                    <div className="flex justify-end mb-1">
                      <div className="max-w-[85%] bg-[#D9FDD3] rounded-lg rounded-tr-none px-3 py-2 shadow-sm">
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="" loading="lazy"
                            className="rounded mb-1.5 max-w-full max-h-48 object-contain cursor-pointer"
                            onClick={() => setLightboxImage(msg.imageUrl)} />
                        )}
                        {msg.text && <p className="text-sm text-gray-900" style={{ fontSize: '14.5px', lineHeight: '1.35' }}>{msg.text}</p>}
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span style={{ fontSize: '11px', color: '#8696a0' }}>{fmtTime(msg.timestamp)}</span>
                          {/* Double check */}
                          <svg width="18" height="11" viewBox="0 0 18 11" fill="none" style={{ marginBottom: '-1px' }}>
                            <path d="M6.5 9L2 4.5l.7-.7L6.5 7.6 12.3 1.8l.7.7L6.5 9z" fill="#53bdeb"/>
                            <path d="M11.5 9L7 4.5l.7-.7 3.8 3.8L17.3 1.8l.7.7L11.5 9z" fill="#53bdeb"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Product as WhatsApp photo with caption ── */}
                  {msg.type === 'products' && msg.products?.length > 0 && (() => {
                    const p = msg.products[0];
                    const imgSrc = p.image_url || p.image_urls?.[0];
                    if (!imgSrc) return null;
                    const hasPrice = p.price && Number(p.price) > 0;
                    const desc = p.description ? (p.description.length > 80 ? p.description.substring(0, 80) + '...' : p.description) : '';
                    return (
                      <div style={{ display: 'block', marginBottom: '4px', marginTop: '2px' }}>
                        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', width: '240px', padding: '3px' }}>
                          <img
                            src={imgSrc}
                            alt={p.name}
                            loading="lazy"
                            onClick={() => setLightboxImage(imgSrc)}
                            style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block', borderRadius: '6px', cursor: 'pointer' }}
                          />
                          <div style={{ padding: '6px 4px 4px 4px', fontSize: '13px', color: '#111' }}>
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                            {desc && <span style={{ color: '#555' }}> — {desc}</span>}
                            <div style={{ fontSize: '11px', color: hasPrice ? '#25D366' : '#8696a0', marginTop: '3px' }}>
                              {hasPrice ? `${formatGs(p.price)} ${p.currency === 'USD' ? 'USD' : 'Gs'}` : 'Consultar cotizacion'}
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '10px', color: '#999', marginTop: '2px' }}>
                              {fmtTime(msg.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Appointment card ── */}
                  {msg.type === 'appointment' && msg.appointment && (
                    <div className="flex justify-start mb-1">
                      <div className="max-w-[85%] bg-white rounded-lg rounded-tl-none shadow-sm overflow-hidden">
                        <div className="bg-emerald-500 px-3 py-1.5">
                          <p className="text-white text-xs font-semibold flex items-center gap-1.5">
                            <i className="fas fa-circle-check" /> Cita Agendada
                          </p>
                        </div>
                        <div className="px-3 py-2 space-y-1">
                          <p className="text-sm text-gray-800"><i className="fas fa-calendar text-gray-400 mr-2 w-4" style={{ fontSize: '12px' }} />{formatApptDate(msg.appointment.date)}</p>
                          <p className="text-sm text-gray-800"><i className="fas fa-clock text-gray-400 mr-2 w-4" style={{ fontSize: '12px' }} />{msg.appointment.time}</p>
                          <p className="text-sm text-gray-800"><i className="fas fa-user text-gray-400 mr-2 w-4" style={{ fontSize: '12px' }} />{msg.appointment.customer_name}</p>
                          <p className="text-sm text-gray-800"><i className="fas fa-clipboard-list text-gray-400 mr-2 w-4" style={{ fontSize: '12px' }} />{msg.appointment.service}</p>
                        </div>
                        <p className="text-right px-3 pb-1.5" style={{ fontSize: '11px', color: '#8696a0' }}>{fmtTime(msg.timestamp)}</p>
                      </div>
                    </div>
                  )}

                  {/* ── Order card ── */}
                  {msg.type === 'order' && msg.order && (
                    <div className="flex justify-start mb-1">
                      <div className="max-w-[85%] bg-white rounded-lg rounded-tl-none shadow-sm overflow-hidden">
                        <div className="bg-indigo-500 px-3 py-1.5">
                          <p className="text-white text-xs font-semibold flex items-center gap-1.5">
                            <i className="fas fa-bag-shopping" /> Pedido Creado
                          </p>
                        </div>
                        <div className="px-3 py-2 space-y-1.5">
                          {(msg.order.items || []).map((item, iIdx) => (
                            <div key={iIdx} className="flex justify-between text-xs text-gray-700">
                              <span>{item.quantity}x {item.product_name}</span>
                              <span className="text-gray-500">{formatGs(item.quantity * item.unit_price)} Gs</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                            <span className="text-xs font-semibold text-gray-600">TOTAL</span>
                            <span className="text-sm font-bold text-indigo-700">{formatGs(msg.order.total)} Gs</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            <i className={`fas ${msg.order.delivery_type === 'delivery' ? 'fa-truck' : 'fa-store'} mr-1`} />
                            {msg.order.delivery_type === 'delivery' ? 'Delivery' : 'Retiro'}
                            {msg.order.delivery_address ? ` — ${msg.order.delivery_address}` : ''}
                          </p>
                        </div>
                        <p className="text-right px-3 pb-1.5" style={{ fontSize: '11px', color: '#8696a0' }}>{fmtTime(msg.timestamp)}</p>
                      </div>
                    </div>
                  )}

                  {/* ── Referral card ── */}
                  {msg.type === 'referral' && msg.referral && (
                    <div className="flex justify-start mb-1">
                      <div className="bg-white rounded-lg rounded-tl-none shadow-sm overflow-hidden" style={{ maxWidth: '280px' }}>
                        <div className="flex items-center gap-3 p-3">
                          <img
                            src={msg.referral.photo_url}
                            alt={msg.referral.name}
                            loading="lazy"
                            className="w-12 h-12 rounded-full object-cover border-2 border-green-400 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{msg.referral.name}</p>
                            <p className="text-xs text-gray-500 truncate">{msg.referral.role}</p>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 px-3 py-2 space-y-1">
                          <p className="text-xs text-gray-600">
                            <i className="fas fa-phone text-green-500 mr-2" />{msg.referral.phone}
                          </p>
                          <p className="text-xs text-gray-600">
                            <i className="fas fa-envelope text-blue-500 mr-2" />{msg.referral.email}
                          </p>
                        </div>
                        <a
                          href={msg.referral.whatsapp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2.5 text-white text-sm font-medium"
                          style={{ backgroundColor: '#25D366' }}
                        >
                          <i className="fab fa-whatsapp" />Escribir por WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Empty state — customer writes first, like real WhatsApp */}
              {messages.length === 0 && !isTyping && (
                <div className="flex items-center justify-center py-8">
                  <div className="bg-white/80 rounded-lg px-4 py-2 shadow-sm">
                    <p className="text-xs text-center" style={{ color: '#8696a0' }}>
                      <i className="fas fa-lock mr-1" style={{ fontSize: '9px' }} />
                      Mensajes cifrados de extremo a extremo
                    </p>
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start mb-1">
                  <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center">
                      <span className="wa-typing-dot" style={{ animationDelay: '0ms' }} />
                      <span className="wa-typing-dot" style={{ animationDelay: '200ms' }} />
                      <span className="wa-typing-dot" style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Image preview bar */}
            {pendingImage && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-t border-gray-200">
                <img src={pendingImage} alt="Preview" className="w-10 h-10 object-cover rounded" />
                <span className="text-xs text-gray-500 flex-1">Imagen lista</span>
                <button onClick={() => setPendingImage(null)} className="text-gray-400 hover:text-red-500">
                  <i className="fas fa-xmark" />
                </button>
              </div>
            )}

            {/* Input area */}
            <div className="flex items-center gap-2 px-2 py-2" style={{ backgroundColor: '#F0F2F5' }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={isTyping}
                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-40">
                <i className="fas fa-paperclip" style={{ fontSize: '18px' }} />
              </button>
              <div className="flex-1 flex items-center bg-white rounded-full px-4 py-2">
                <input type="text" value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Mensaje"
                  className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
                  disabled={isTyping} />
              </div>
              <button onClick={() => sendMessage()} disabled={(!inputMessage.trim() && !pendingImage) || isTyping}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40"
                style={{ backgroundColor: '#00A884' }}>
                <i className="fas fa-paper-plane text-white" style={{ fontSize: '15px' }} />
              </button>
            </div>

            {/* Home indicator */}
            <div className="flex justify-center py-2 bg-white">
              <div className="w-28 h-1 bg-gray-900 rounded-full" />
            </div>

          </div>
          {/* End iPhone screen */}
        </div>
      </div>

      {/* ══ MODALS ═══════════════════════════════════════════════════════ */}

      {promptEditorOpen && (
        <PromptEditorModal onClose={() => setPromptEditorOpen(false)} onSaved={handlePromptSaved} />
      )}

      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 leading-none" onClick={() => setLightboxImage(null)}>x</button>
          <img src={lightboxImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {toast && <Toast key={toast.message} {...toast} onDone={() => setToast(null)} />}
    </div>
  );
}

export default SimulacionPage;
