import { useState, useMemo, useCallback } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0)   return 'programado';
  if (mins < 60)  return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isoOffset(days = 0, hours = 0, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours, d.getMinutes() + minutes, 0, 0);
  return d.toISOString();
}

function startOfDay(d = new Date()) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function isToday(dateStr) {
  const d = new Date(dateStr); const s = startOfDay();
  return d >= s && d < new Date(s.getTime() + 86400000);
}
function isYesterday(dateStr) {
  const d = new Date(dateStr); const s = startOfDay();
  const ys = new Date(s.getTime() - 86400000);
  return d >= ys && d < s;
}
function isThisWeek(dateStr) {
  const d = new Date(dateStr); const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
  return d >= mon && d <= sun;
}
function dateGroupKey(dateStr) {
  if (isToday(dateStr))     return 'today';
  if (isYesterday(dateStr)) return 'yesterday';
  if (isThisWeek(dateStr))  return 'week';
  return 'older';
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_LABELS = {
  appointment_reminder: 'Recordatorio de Cita',
  order_update:         'Actualización de Pedido',
  abandoned_cart:       'Carrito Abandonado',
  custom:               'Personalizado',
};
const TYPE_STYLES = {
  appointment_reminder: { bg: 'bg-green-50',  icon: 'fa-calendar-check',  text: 'text-green-600' },
  order_update:         { bg: 'bg-indigo-50', icon: 'fa-box',              text: 'text-indigo-600' },
  abandoned_cart:       { bg: 'bg-orange-50', icon: 'fa-cart-shopping',    text: 'text-orange-600' },
  custom:               { bg: 'bg-purple-50', icon: 'fa-envelope',         text: 'text-purple-600' },
};
const STATUS_LABELS = { pending: 'Pendiente', sent: 'Enviado', failed: 'Fallido', cancelled: 'Cancelado' };
const STATUS_COLORS = {
  pending:   'bg-yellow-50 text-yellow-600',
  sent:      'bg-green-50 text-green-600',
  failed:    'bg-red-50 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
};
const PLATFORM_ICONS = {
  whatsapp:  'fab fa-whatsapp',
  instagram: 'fab fa-instagram',
  facebook:  'fab fa-facebook-messenger',
};
const TYPE_FILTERS = [
  { key: 'all',                  label: 'Todas',    icon: 'fas fa-th' },
  { key: 'appointment_reminder', label: 'Citas',    icon: 'fas fa-calendar-check' },
  { key: 'order_update',         label: 'Pedidos',  icon: 'fas fa-box' },
  { key: 'abandoned_cart',       label: 'Carritos', icon: 'fas fa-cart-shopping' },
  { key: 'custom',               label: 'Custom',   icon: 'fas fa-envelope' },
];
const STATUS_FILTERS = [
  { key: 'all',       label: 'Todos' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'sent',      label: 'Enviados' },
  { key: 'failed',    label: 'Fallidos' },
  { key: 'cancelled', label: 'Cancelados' },
];
const DATE_GROUPS = [
  { key: 'today',     label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week',      label: 'Esta semana' },
  { key: 'older',     label: 'Anteriores' },
];

// ─── Fake data (dynamic dates) ────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS = [
  // 5 sent today
  {
    id: 'notif_001', type: 'appointment_reminder', status: 'sent', platform: 'whatsapp',
    contact_name: 'María González',
    title: 'Recordatorio de cita',
    message: 'Hola María, te recordamos tu cita mañana a las 10:00 AM con el Dr. Rodríguez. Por favor confirma tu asistencia respondiendo este mensaje.',
    scheduled_for: isoOffset(0, -1, -30),
    sent_at: isoOffset(0, -1, -29),
    created_at: isoOffset(-1, 0, 0),
  },
  {
    id: 'notif_002', type: 'order_update', status: 'sent', platform: 'whatsapp',
    contact_name: 'Carlos Martínez',
    title: 'Tu pedido está en camino',
    message: 'Hola Carlos, tu pedido #ORD-4821 está en camino. El repartidor llegará en aproximadamente 30 minutos. ¡Gracias por tu compra!',
    scheduled_for: isoOffset(0, -2, 0),
    sent_at: isoOffset(0, -2, 0),
    created_at: isoOffset(0, -3, 0),
  },
  {
    id: 'notif_003', type: 'abandoned_cart', status: 'sent', platform: 'instagram',
    contact_name: 'Laura Benítez',
    title: 'Carrito abandonado',
    message: 'Laura, dejaste productos en tu carrito 🛒 ¿Deseas completar tu compra? Te esperamos con un 10% de descuento por tiempo limitado.',
    scheduled_for: isoOffset(0, -3, 0),
    sent_at: isoOffset(0, -3, 0),
    created_at: isoOffset(0, -4, 0),
  },
  {
    id: 'notif_004', type: 'custom', status: 'sent', platform: 'facebook',
    contact_name: 'Roberto Sosa',
    title: 'Promoción especial',
    message: 'Hola Roberto, tenemos una oferta exclusiva para vos: 20% de descuento en todos nuestros productos esta semana. ¡No te lo pierdas!',
    scheduled_for: isoOffset(0, -4, 0),
    sent_at: isoOffset(0, -4, 0),
    created_at: isoOffset(0, -5, 0),
  },
  {
    id: 'notif_005', type: 'appointment_reminder', status: 'sent', platform: 'whatsapp',
    contact_name: 'Ana Paredes',
    title: 'Confirmación de cita',
    message: 'Hola Ana, tu cita del día de hoy a las 14:30 está confirmada. Te esperamos en nuestra sucursal de Av. España. ¡Hasta pronto!',
    scheduled_for: isoOffset(0, -5, 0),
    sent_at: isoOffset(0, -5, 0),
    created_at: isoOffset(0, -6, 0),
  },
  // 3 pending (today / tomorrow)
  {
    id: 'notif_006', type: 'appointment_reminder', status: 'pending', platform: 'whatsapp',
    contact_name: 'Diego Romero',
    title: 'Recordatorio de cita mañana',
    message: 'Hola Diego, te recordamos que mañana a las 09:00 AM tenés una cita programada. Por favor avísanos si necesitás reprogramar.',
    scheduled_for: isoOffset(1, 1, 0),
    sent_at: null,
    created_at: isoOffset(0, -1, 0),
  },
  {
    id: 'notif_007', type: 'order_update', status: 'pending', platform: 'whatsapp',
    contact_name: 'Valeria Torres',
    title: 'Pedido listo para retirar',
    message: 'Valeria, tu pedido #ORD-5103 está listo para retirar en nuestra sucursal. Podés pasar hoy de 09:00 a 18:00.',
    scheduled_for: isoOffset(0, 1, 0),
    sent_at: null,
    created_at: isoOffset(0, -0, -30),
  },
  {
    id: 'notif_008', type: 'abandoned_cart', status: 'pending', platform: 'instagram',
    contact_name: 'Fernanda Lopes',
    title: 'Recordatorio de carrito',
    message: 'Fernanda, no olvides los productos que dejaste en tu carrito. ¡Aún están disponibles y te estamos esperando!',
    scheduled_for: isoOffset(0, 2, 0),
    sent_at: null,
    created_at: isoOffset(0, 0, -15),
  },
  // 2 failed (yesterday)
  {
    id: 'notif_009', type: 'order_update', status: 'failed', platform: 'whatsapp',
    contact_name: 'Héctor Villalba',
    title: 'Error de entrega',
    message: 'Hola Héctor, intentamos enviarte la actualización de tu pedido pero no fue posible. Por favor verificá que tu número de WhatsApp esté activo.',
    scheduled_for: isoOffset(-1, -2, 0),
    sent_at: null,
    created_at: isoOffset(-1, -3, 0),
  },
  {
    id: 'notif_010', type: 'custom', status: 'failed', platform: 'facebook',
    contact_name: 'Patricia Núñez',
    title: 'Mensaje no entregado',
    message: 'Patricia, te queríamos informar sobre nuestra nueva colección pero no pudimos contactarte. Revisá tu configuración de mensajes de Facebook.',
    scheduled_for: isoOffset(-1, -4, 0),
    sent_at: null,
    created_at: isoOffset(-1, -5, 0),
  },
  // 2 cancelled (this week)
  {
    id: 'notif_011', type: 'appointment_reminder', status: 'cancelled', platform: 'whatsapp',
    contact_name: 'Miriam Cabrera',
    title: 'Recordatorio cancelado',
    message: 'Este recordatorio de cita fue cancelado a solicitud del cliente.',
    scheduled_for: isoOffset(-2, 0, 0),
    sent_at: null,
    created_at: isoOffset(-2, -2, 0),
  },
  {
    id: 'notif_012', type: 'custom', status: 'cancelled', platform: 'instagram',
    contact_name: 'Jorge Acosta',
    title: 'Campaña cancelada',
    message: 'Mensaje de campaña promocional que fue cancelado antes del envío.',
    scheduled_for: isoOffset(-3, 0, 0),
    sent_at: null,
    created_at: isoOffset(-3, -1, 0),
  },
  // 4 sent (this week — older days)
  {
    id: 'notif_013', type: 'order_update', status: 'sent', platform: 'whatsapp',
    contact_name: 'Claudia Ríos',
    title: 'Pedido entregado',
    message: 'Claudia, confirmamos que tu pedido #ORD-4790 fue entregado exitosamente. ¡Esperamos que disfrutes tu compra! Calificá tu experiencia respondiendo este mensaje.',
    scheduled_for: isoOffset(-2, -1, 0),
    sent_at: isoOffset(-2, -1, 0),
    created_at: isoOffset(-2, -2, 0),
  },
  {
    id: 'notif_014', type: 'appointment_reminder', status: 'sent', platform: 'whatsapp',
    contact_name: 'Sebastián Vera',
    title: 'Recordatorio de cita',
    message: 'Sebastián, te recordamos tu cita del miércoles a las 11:00 AM. ¡Te esperamos!',
    scheduled_for: isoOffset(-3, 0, 0),
    sent_at: isoOffset(-3, 0, 1),
    created_at: isoOffset(-3, -12, 0),
  },
  {
    id: 'notif_015', type: 'abandoned_cart', status: 'sent', platform: 'facebook',
    contact_name: 'Natalia Flores',
    title: 'Recuperación de carrito',
    message: 'Natalia, vimos que no completaste tu compra. ¿Podemos ayudarte? Escríbenos y con gusto te asesoramos.',
    scheduled_for: isoOffset(-4, 0, 0),
    sent_at: isoOffset(-4, 0, 0),
    created_at: isoOffset(-4, -3, 0),
  },
  {
    id: 'notif_016', type: 'custom', status: 'sent', platform: 'instagram',
    contact_name: 'Andrés Medina',
    title: 'Mensaje personalizado',
    message: 'Hola Andrés, queríamos agradecerte por ser un cliente fiel. Como muestra de aprecio, tenés un 15% de descuento disponible en tu próxima compra.',
    scheduled_for: isoOffset(-5, 0, 0),
    sent_at: isoOffset(-5, 0, 0),
    created_at: isoOffset(-5, -2, 0),
  },
  // 2 sent (older — previous week)
  {
    id: 'notif_017', type: 'order_update', status: 'sent', platform: 'whatsapp',
    contact_name: 'Gabriela Soto',
    title: 'Confirmación de pedido',
    message: 'Hola Gabriela, confirmamos la recepción de tu pedido #ORD-4650. Estamos preparándolo y te avisaremos cuando esté listo.',
    scheduled_for: isoOffset(-10, 0, 0),
    sent_at: isoOffset(-10, 0, 1),
    created_at: isoOffset(-10, -1, 0),
  },
  {
    id: 'notif_018', type: 'appointment_reminder', status: 'sent', platform: 'whatsapp',
    contact_name: 'Luis Ramírez',
    title: 'Cita anterior',
    message: 'Luis, te recordamos tu cita de la semana pasada. ¿Cómo fue tu experiencia? Nos gustaría escuchar tu opinión.',
    scheduled_for: isoOffset(-12, 0, 0),
    sent_at: isoOffset(-12, 0, 0),
    created_at: isoOffset(-12, -2, 0),
  },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const done = useCallback(onDone, []);
  useState(() => { const t = setTimeout(done, 3000); return () => clearTimeout(t); });

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm flex items-center gap-2">
        <i className="fas fa-circle-check text-emerald-400" />
        {message}
      </div>
    </div>
  );
}

// ─── NotificationsPage ────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [expandedId,    setExpandedId]    = useState(null);
  const [viewedIds,     setViewedIds]     = useState(new Set());
  const [createOpen,    setCreateOpen]    = useState(false);
  const [toast,         setToast]         = useState(null);

  // Form state
  const [form, setForm] = useState({
    contact: '', platform: 'whatsapp', type: 'custom',
    title: '', message: '', date: '', time: '',
  });

  const showToast = (msg) => setToast(msg);

  // Derived
  const sentCount    = notifications.filter(n => n.status === 'sent').length;
  const pendingCount = notifications.filter(n => n.status === 'pending').length;
  const failedCount  = notifications.filter(n => n.status === 'failed').length;
  const total        = notifications.length;
  const successRate  = total > 0 ? Math.round((sentCount / total) * 100) : 0;

  const unreadCount  = useMemo(
    () => notifications.filter(n => !viewedIds.has(n.id)).length,
    [notifications, viewedIds]
  );

  // Filtered
  const filtered = useMemo(() => {
    return notifications
      .filter(n => typeFilter   === 'all' || n.type   === typeFilter)
      .filter(n => statusFilter === 'all' || n.status === statusFilter)
      .sort((a, b) => new Date(b.scheduled_for) - new Date(a.scheduled_for));
  }, [notifications, typeFilter, statusFilter]);

  // Date groups
  const dateGroups = useMemo(() => {
    const groups = {};
    filtered.forEach(n => {
      const key = dateGroupKey(n.scheduled_for);
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return DATE_GROUPS.filter(g => groups[g.key]?.length > 0).map(g => ({
      ...g, notifications: groups[g.key],
    }));
  }, [filtered]);

  const hasFilters = typeFilter !== 'all' || statusFilter !== 'all';

  // Handlers
  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
    setViewedIds(prev => new Set([...prev, id]));
  };

  const handleMarkAllRead = () => {
    setViewedIds(new Set(notifications.map(n => n.id)));
    showToast('Todas marcadas como leídas');
  };

  const handleCancel = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'cancelled' } : n));
    showToast('Notificación cancelada');
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (expandedId === id) setExpandedId(null);
    showToast('Notificación eliminada');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Tipo', 'Estado', 'Plataforma', 'Contacto', 'Título', 'Mensaje', 'Programado para', 'Enviado'];
    const rows = notifications.map(n => [
      n.id, TYPE_LABELS[n.type], STATUS_LABELS[n.status], n.platform,
      n.contact_name, n.title,
      `"${n.message.replace(/"/g, '""')}"`,
      formatDateTime(n.scheduled_for),
      n.sent_at ? formatDateTime(n.sent_at) : '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'notificaciones.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => setForm({ contact: '', platform: 'whatsapp', type: 'custom', title: '', message: '', date: '', time: '' });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    resetForm();
    setCreateOpen(false);
    showToast('Notificación programada exitosamente');
  };

  const STATS = [
    { title: 'Total',      value: total,        icon: 'fa-chart-line',        iconColor: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { title: 'Enviadas',   value: sentCount,    subtitle: `${successRate}% éxito`, icon: 'fa-paper-plane', iconColor: 'text-green-600', bgColor: 'bg-green-50' },
    { title: 'Pendientes', value: pendingCount, icon: 'fa-clock',              iconColor: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { title: 'Fallidas',   value: failedCount,  icon: 'fa-exclamation-circle', iconColor: 'text-red-600',    bgColor: 'bg-red-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Recordatorios</h1>
            <p className="text-sm text-gray-400">Mensajes y recordatorios enviados a tus clientes</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                unreadCount > 0 ? 'text-indigo-600 hover:text-indigo-700' : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-check-double text-xs" /> Marcar todas como leídas
            </button>
            <button
              onClick={handleExportCSV}
              disabled={notifications.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <i className="fas fa-download text-base" /> Exportar CSV
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <i className="fas fa-plus text-base" /> Nueva Notificación
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <p className="col-span-full text-xs text-gray-500 -mb-2">Últimos 30 días</p>
          {STATS.map(s => (
            <div key={s.title} className="bg-white border border-gray-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{s.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{s.value}</p>
                  {s.subtitle && <p className="text-xs text-gray-500 mt-1">{s.subtitle}</p>}
                </div>
                <div className={`${s.bgColor} p-3 rounded-full`}>
                  <i className={`fas ${s.icon} text-xl ${s.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200/60 rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {TYPE_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                  typeFilter === f.key
                    ? 'bg-gray-900 text-white font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <i className={`${f.icon} text-xs`} /> {f.label}
              </button>
            ))}

            <div className="w-px h-5 bg-gray-200 flex-shrink-0 mx-1" />

            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                  statusFilter === f.key
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count + unread */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <p>
            Mostrando <span className="font-semibold">{filtered.length}</span> de{' '}
            <span className="font-semibold">{notifications.length}</span> notificaciones
          </p>
          {unreadCount > 0 && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">
              {unreadCount} sin leer
            </span>
          )}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <i className="fas fa-bell-slash text-3xl text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {hasFilters ? 'No hay resultados' : 'No hay notificaciones'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {hasFilters
                ? 'Intenta ajustar los filtros.'
                : 'Las notificaciones aparecerán aquí cuando se programen.'}
            </p>
          </div>
        ) : (
          dateGroups.map(group => (
            <div key={group.key} className="mb-4">
              {/* Sticky date label */}
              <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm px-4 py-2 -mx-4 lg:-mx-6 lg:px-6 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </span>
              </div>

              <div className="space-y-0 bg-white rounded-xl border border-gray-200/60 overflow-hidden shadow-sm">
                {group.notifications.map(n => {
                  const isExpanded = expandedId === n.id;
                  const isViewed   = viewedIds.has(n.id);
                  const styles     = TYPE_STYLES[n.type] || TYPE_STYLES.custom;

                  return (
                    <div key={n.id} className="cursor-pointer border-b border-gray-100/50 last:border-b-0">
                      {/* Collapsed row */}
                      <div
                        onClick={() => toggleExpand(n.id)}
                        className="flex items-start gap-3 p-4 hover:bg-gray-50/80 transition-colors"
                      >
                        {/* Unread dot */}
                        <div className="w-2 flex-shrink-0 mt-3">
                          {!isViewed && <span className="block w-2 h-2 rounded-full bg-indigo-500" />}
                        </div>
                        {/* Type icon */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${styles.bg}`}>
                          <i className={`fas text-sm ${styles.icon} ${styles.text}`} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className={`text-sm text-gray-900 ${!isViewed ? 'font-semibold' : ''}`}>
                              {TYPE_LABELS[n.type]}
                            </p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[n.status]}`}>
                              {STATUS_LABELS[n.status]}
                            </span>
                            <i className={`${PLATFORM_ICONS[n.platform] || 'fas fa-comment'} text-xs text-gray-400`} />
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {n.contact_name} — {n.message.slice(0, 80)}{n.message.length > 80 ? '…' : ''}
                          </p>
                        </div>
                        {/* Time + chevron */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          <span className="text-xs text-gray-400">{timeAgo(n.scheduled_for)}</span>
                          <i className={`fas fa-chevron-down text-[10px] text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pl-[4.5rem] space-y-3">
                          <p className="text-sm text-gray-600 whitespace-pre-line">{n.message}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                            <span><i className="fas fa-user mr-1" />{n.contact_name}</span>
                            <span><i className="far fa-clock mr-1" />{formatDateTime(n.scheduled_for)}</span>
                            {n.sent_at && (
                              <span><i className="fas fa-check mr-1" />Enviado {timeAgo(n.sent_at)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {n.status === 'pending' && (
                              <button
                                onClick={e => { e.stopPropagation(); handleCancel(n.id); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                              >
                                <i className="fas fa-times text-xs" /> Cancelar
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(n.id); }}
                              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create dialog */}
      {createOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => { resetForm(); setCreateOpen(false); }}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Nueva Notificación</h2>
              <button
                onClick={() => { resetForm(); setCreateOpen(false); }}
                className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"
              >
                <i className="fas fa-xmark text-xl" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Destinatario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destinatario</label>
                <input
                  required
                  value={form.contact}
                  onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                  placeholder="Nombre del contacto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {/* Platform + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plataforma</label>
                  <select
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="custom">Personalizado</option>
                    <option value="appointment_reminder">Recordatorio de Cita</option>
                    <option value="order_update">Actualización de Pedido</option>
                    <option value="abandoned_cart">Carrito Abandonado</option>
                  </select>
                </div>
              </div>
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Título de la notificación"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {/* Mensaje */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                <textarea
                  required
                  rows={3}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Escribe el mensaje aquí..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              {/* Fecha + Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <input
                    required
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <i className="fas fa-paper-plane text-base" /> Programar Notificación
              </button>
            </form>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
