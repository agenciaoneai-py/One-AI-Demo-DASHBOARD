import { useState, useEffect, useMemo } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPYG(amount) {
  return Math.round(amount).toLocaleString('es-PY') + ' Gs';
}

function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return 'ahora';
  if (mins < 60)  return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function isToday(dateStr) {
  if (!dateStr) return true; // no scheduled date → treat as today
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth()    === now.getMonth()    &&
         d.getDate()     === now.getDate();
}

// ─── Config ─────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  pending_confirmation: { label: 'Pendiente',        color: 'bg-amber-50 text-amber-600' },
  confirmed:            { label: 'Confirmado',        color: 'bg-indigo-50 text-indigo-600' },
  preparing:            { label: 'Preparando',        color: 'bg-indigo-50 text-indigo-600' },
  ready_to_ship:        { label: 'Listo para enviar', color: 'bg-sky-50 text-sky-600' },
  in_transit:           { label: 'En camino',         color: 'bg-sky-50 text-sky-600' },
  delivered:            { label: 'Entregado',         color: 'bg-emerald-50 text-emerald-600' },
  cancelled:            { label: 'Cancelado',         color: 'bg-red-50 text-red-600' },
};

const TRANSITIONS = {
  pending_confirmation: { status: 'preparing',    label: 'Confirmar y preparar' },
  confirmed:            { status: 'preparing',    label: 'Comenzar preparación' },
  preparing:            { status: 'ready_to_ship', label: 'Listo para despachar' },
  ready_to_ship:        { status: 'in_transit',   label: 'Marcar enviado' },
  in_transit:           { status: 'delivered',    label: 'Marcar entregado' },
};

const STATUS_TABS = [
  { value: 'active',              label: 'Activos',         icon: 'fas fa-fire' },
  { value: 'pending_confirmation', label: 'Pendientes',     icon: 'fas fa-clock' },
  { value: 'preparing',           label: 'Preparando',      icon: 'fas fa-box-open' },
  { value: 'ready_to_ship',       label: 'Para despachar',  icon: 'fas fa-box' },
  { value: 'in_transit',          label: 'En camino',       icon: 'fas fa-truck' },
  { value: 'delivered',           label: 'Entregados',      icon: 'fas fa-circle-check' },
];

const ACTIVE_STATUSES = ['pending_confirmation', 'confirmed', 'preparing', 'ready_to_ship', 'in_transit'];

// Fake history timeline builder
function buildFakeHistory(order) {
  const steps = [
    { status: 'pending_confirmation', label: 'Pedido recibido',    icon: 'fa-cart-shopping' },
    { status: 'confirmed',            label: 'Confirmado',          icon: 'fa-check' },
    { status: 'preparing',            label: 'Preparando',          icon: 'fa-box-open' },
    { status: 'ready_to_ship',        label: 'Listo para enviar',   icon: 'fa-box' },
    { status: 'in_transit',           label: 'En camino',           icon: 'fa-truck' },
    { status: 'delivered',            label: 'Entregado',           icon: 'fa-circle-check' },
  ];

  const order_statuses = Object.keys(STATUS_LABELS);
  const currentIdx = order_statuses.indexOf(order.status);
  const reached = steps.filter(s => order_statuses.indexOf(s.status) <= currentIdx);

  const base = new Date(order.created_at || Date.now() - 3600000 * 2);
  return reached.reverse().map((s, i) => ({
    ...s,
    time: new Date(base.getTime() + (reached.length - 1 - i) * 18 * 60000)
      .toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }),
  }));
}

// ─── DeliveryOrderCard ───────────────────────────────────────────────────────

function DeliveryOrderCard({ order, onStatusChange, onViewHistory }) {
  const [showConfirm, setShowConfirm] = useState(null);
  const [notes, setNotes]             = useState('');

  const statusInfo     = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-50 text-gray-600' };
  const nextTransition = TRANSITIONS[order.status] || null;
  const items          = order.items || [];
  const customerName   = order.customer_name || order.customer_info?.nombre || '—';
  const phone          = order.phone         || order.customer_info?.telefono || '';
  const dateFormatted  = order.created_at    ? timeAgo(order.created_at)      : '';

  return (
    <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-gray-900">
            #{(order.order_id || 'XXXXXXXX').slice(0, 8).toUpperCase()}
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
        <button
          onClick={() => onViewHistory(order)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
        >
          <i className="fas fa-clock-rotate-left text-sm" /> Historial
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-3 space-y-3 flex-1">
        {/* Cliente */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-gray-900">{customerName}</p>
            {phone && <p className="text-xs text-gray-500">{phone}</p>}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{dateFormatted}</span>
        </div>

        {/* Productos */}
        {items.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-1">Productos</p>
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.quantity || 1}x {item.product_name || item.name || '—'}
                  </span>
                  <span className="text-gray-500">
                    {formatPYG((item.unit_price || item.price || 0) * (item.quantity || 1))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Delivery info */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Entrega</p>
          <div className="flex items-start gap-2">
            <i className="fas fa-map-pin text-base text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">{order.delivery_address || 'Sin dirección'}</p>
          </div>
          {order.delivery_zone && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1">
                <i className="fas fa-map text-sm" /> {order.delivery_zone}
              </span>
              {order.delivery_fee > 0 && (
                <span className="text-gray-700 font-medium">Envío: {formatPYG(order.delivery_fee)}</span>
              )}
            </div>
          )}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
          >
            <i className="fas fa-location-arrow text-sm" /> Abrir ruta en Google Maps
          </a>
        </div>

        {/* Total */}
        <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2">
          <span className="text-gray-600">Total</span>
          <span className="text-gray-900">{formatPYG(order.total_amount || 0)}</span>
        </div>
      </div>

      {/* Action */}
      {nextTransition && (
        <div className="px-5 py-3 border-t border-gray-100">
          {showConfirm === nextTransition.status ? (
            <div className="space-y-2">
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas opcionales"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { onStatusChange(order.order_id, nextTransition.status); setShowConfirm(null); setNotes(''); }}
                  className="flex-1 py-2 text-sm text-white font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setShowConfirm(null)}
                  className="px-4 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(nextTransition.status)}
              className="w-full py-2.5 text-sm text-white font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all"
            >
              {nextTransition.label}
            </button>
          )}
        </div>
      )}

      {order.status === 'delivered' && (
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-sm text-center text-green-600 font-medium flex items-center justify-center gap-1">
            <i className="fas fa-circle-check text-base" /> Pedido completado
          </p>
        </div>
      )}

      {order.status === 'cancelled' && (
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-sm text-center text-red-500 font-medium flex items-center justify-center gap-1">
            <i className="fas fa-xmark text-base" /> Pedido cancelado
          </p>
        </div>
      )}
    </div>
  );
}

// ─── RouteView ───────────────────────────────────────────────────────────────

function RouteView({ orders }) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <i className="fas fa-map-pin text-5xl text-gray-200 mx-auto mb-4 block" />
        <p className="text-gray-400 font-medium">No hay entregas para hoy</p>
        <p className="text-gray-300 text-sm mt-1">Las entregas con dirección aparecerán aquí</p>
      </div>
    );
  }

  const totalKm = orders.reduce((sum, o) => sum + (o.distance_km || 0), 0);

  return (
    <div className="space-y-4 mt-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-white border border-gray-200/60 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            <span className="font-semibold text-gray-900">{orders.length}</span> paradas
          </span>
          {totalKm > 0 && (
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">{Math.round(totalKm * 10) / 10}</span> km total
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">Lista estática · Ruta sugerida</span>
      </div>

      {/* Route stops */}
      <div className="space-y-2">
        {orders.map((order, index) => (
          <div
            key={order.order_id}
            className="bg-white border border-gray-200/60 rounded-xl p-3 flex items-start gap-3 shadow-sm hover:shadow-md transition-all duration-300"
          >
            {/* Stop number */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
              {index + 1}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-900 truncate block">
                {order.customer_name || order.customer_info?.nombre || '—'}
              </span>
              <p className="text-sm text-gray-500 truncate mt-0.5">
                <i className="fas fa-map-pin text-xs inline mr-1" />
                {order.delivery_address}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-green-600">{formatPYG(order.total_amount || 0)}</span>
                {order.delivery_zone && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{order.delivery_zone}</span>
                )}
                {(() => {
                  const si = STATUS_LABELS[order.status];
                  return si ? (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${si.color}`}>{si.label}</span>
                  ) : null;
                })()}
              </div>
            </div>
            {/* Nav buttons */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              <a
                href={`https://waze.com/ul?q=${encodeURIComponent(order.delivery_address || '')}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                title="Waze"
              >
                <i className="fas fa-location-arrow text-base" />
              </a>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                title="Google Maps"
              >
                <i className="fas fa-map text-base" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OrderHistoryPanel ────────────────────────────────────────────────────────

function OrderHistoryPanel({ order, onClose }) {
  if (!order) return null;
  const history = buildFakeHistory(order);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm h-full shadow-xl flex flex-col rounded-l-xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-900">Historial del pedido</h3>
            <p className="text-xs text-gray-500 font-mono">
              #{(order.order_id || 'XXXXXXXX').slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors">
            <i className="fas fa-xmark text-xl" />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="relative">
            <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {history.map((entry, index) => (
                <div key={index} className="flex gap-4 relative">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${
                    index === 0
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white border-gray-300'
                  }`}>
                    <i className={`fas ${entry.icon || 'fa-circle'} text-[0.6rem] ${
                      index === 0 ? 'text-white' : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-sm font-medium text-gray-900">{entry.label}</p>
                    <span className="text-xs text-gray-400">{entry.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">Resumen del pedido</p>
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.quantity || 1}x {item.product_name || item.name}</span>
                <span className="text-gray-500">{formatPYG((item.unit_price || item.price || 0) * (item.quantity || 1))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-100">
              <span className="text-gray-600">Total</span>
              <span className="text-gray-900">{formatPYG(order.total_amount || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm flex items-center gap-2">
        <i className="fas fa-circle-check text-emerald-400" />
        {message}
      </div>
    </div>
  );
}

// ─── DeliveryPage ────────────────────────────────────────────────────────────

export default function DeliveryPage() {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [scheduleTab,  setScheduleTab]  = useState('today');
  const [activeTab,    setActiveTab]    = useState('active');
  const [historyOrder, setHistoryOrder] = useState(null);
  const [toast,        setToast]        = useState(null);

  // Fetch
  useEffect(() => {
    fetch(`${API_URL}/api/orders`)
      .then(r => r.json())
      .then(json => {
        const all = json.data || json.orders || [];
        // Keep only delivery orders
        const delivery = all.filter(o =>
          o.delivery_type === 'delivery' || (o.delivery_address && o.delivery_address.trim() !== '')
        );
        setOrders(delivery);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  // Status change (local only)
  const handleStatusChange = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
    const label = STATUS_LABELS[newStatus]?.label || newStatus;
    setToast(`Estado actualizado a "${label}"`);
  };

  // Derived counts
  const todayOrders     = useMemo(() => orders.filter(o => isToday(o.scheduled_date)), [orders]);
  const scheduledOrders = useMemo(() => orders.filter(o => o.scheduled_date && !isToday(o.scheduled_date)), [orders]);
  const scheduledCount  = scheduledOrders.length;

  // Orders for current schedule tab
  const scheduleFiltered = useMemo(() => {
    if (scheduleTab === 'scheduled') return scheduledOrders;
    return todayOrders;
  }, [scheduleTab, todayOrders, scheduledOrders]);

  // Status filtered (not used for route tab)
  const statusFiltered = useMemo(() => {
    if (activeTab === 'active') return scheduleFiltered.filter(o => ACTIVE_STATUSES.includes(o.status));
    return scheduleFiltered.filter(o => o.status === activeTab);
  }, [activeTab, scheduleFiltered]);

  // Count per status tab
  const countFor = (tabValue) => {
    if (tabValue === 'active') return scheduleFiltered.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
    return scheduleFiltered.filter(o => o.status === tabValue).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Delivery</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de pedidos en tiempo real</p>
        </div>

        {/* Schedule tabs */}
        <div
          className="flex sm:inline-flex overflow-x-auto bg-gray-100 p-0.5 rounded-lg mt-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <button
            onClick={() => setScheduleTab('today')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
              scheduleTab === 'today'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fas fa-truck text-base" /> Para hoy
          </button>
          <button
            onClick={() => setScheduleTab('scheduled')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
              scheduleTab === 'scheduled'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fas fa-calendar-days text-base" /> Programados
            {scheduledCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                scheduleTab === 'scheduled' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {scheduledCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setScheduleTab('route')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
              scheduleTab === 'route'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fas fa-map-pin text-base" /> Ruta del día
          </button>
        </div>

        {/* Status tabs (hidden for route view) */}
        {scheduleTab !== 'route' && (
          <div className="overflow-x-auto -mx-4 px-4 mt-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex gap-2 min-w-max pb-3">
              {STATUS_TABS.map(tab => {
                const isActive = activeTab === tab.value;
                const count    = countFor(tab.value);
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 min-h-[44px] transition-all duration-200 ${
                      isActive
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <i className={`${tab.icon} text-sm`} />
                    {tab.label}
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : scheduleTab === 'route' ? (
          <RouteView
            orders={todayOrders.filter(o =>
              ACTIVE_STATUSES.includes(o.status) || o.status === 'delivered'
            )}
          />
        ) : statusFiltered.length === 0 ? (
          <div className="text-center py-20">
            <i className="fas fa-truck text-5xl text-gray-200 mx-auto mb-4 block" />
            <p className="text-gray-400 font-medium">
              {scheduleTab === 'scheduled' ? 'No hay pedidos programados' : 'No hay pedidos en este estado'}
            </p>
            <p className="text-gray-300 text-sm mt-1">Los pedidos aparecerán aquí cuando estén disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {statusFiltered.map(order => (
              <DeliveryOrderCard
                key={order.order_id}
                order={order}
                onStatusChange={handleStatusChange}
                onViewHistory={setHistoryOrder}
              />
            ))}
          </div>
        )}
      </div>

      {/* History slideout */}
      {historyOrder && (
        <OrderHistoryPanel
          order={historyOrder}
          onClose={() => setHistoryOrder(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
