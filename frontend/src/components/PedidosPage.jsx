import { useState, useEffect } from 'react';
import { API_URL } from '../App';

const COLUMNS = [
  { key: 'pending_confirmation', label: 'Pendiente', color: 'amber', icon: 'fa-clock', headerBg: 'bg-amber-50', headerText: 'text-amber-700', dot: 'bg-amber-400' },
  { key: 'confirmed', label: 'Confirmado', color: 'blue', icon: 'fa-check', headerBg: 'bg-blue-50', headerText: 'text-blue-700', dot: 'bg-blue-400' },
  { key: 'preparing', label: 'Preparando', color: 'purple', icon: 'fa-utensils', headerBg: 'bg-purple-50', headerText: 'text-purple-700', dot: 'bg-purple-400' },
  { key: 'in_transit', label: 'En camino', color: 'green', icon: 'fa-truck', headerBg: 'bg-green-50', headerText: 'text-green-700', dot: 'bg-green-400' },
  { key: 'delivered', label: 'Entregado', color: 'gray', icon: 'fa-check-double', headerBg: 'bg-gray-50', headerText: 'text-gray-600', dot: 'bg-gray-400' },
];

const STATUS_CONFIG = {
  pending_confirmation: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-700' },
  confirmed: { label: 'Confirmado', bg: 'bg-blue-100', text: 'text-blue-700' },
  preparing: { label: 'Preparando', bg: 'bg-purple-100', text: 'text-purple-700' },
  ready_to_ship: { label: 'Listo para envío', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  in_transit: { label: 'En camino', bg: 'bg-green-100', text: 'text-green-700' },
  delivered: { label: 'Entregado', bg: 'bg-gray-100', text: 'text-gray-600' },
  cancelled: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-700' },
};

const PLATFORM_BADGE = {
  instagram: { bg: 'bg-pink-100', text: 'text-pink-700', icon: 'fab fa-instagram' },
  whatsapp: { bg: 'bg-green-100', text: 'text-green-700', icon: 'fab fa-whatsapp' },
  facebook: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'fab fa-facebook-messenger' },
};

function fmtGs(amount) {
  return amount.toLocaleString('es-PY') + ' Gs.';
}

function fmtDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return 'Hoy, ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
}

export default function PedidosPage() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API_URL}/api/orders`).then(r => r.json()),
      fetch(`${API_URL}/api/orders/stats`).then(r => r.json()),
    ])
      .then(([ordersRes, statsRes]) => {
        if (ordersRes.success) setOrders(ordersRes.data);
        if (statsRes.success) setStats(statsRes.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const filtered = platformFilter === 'all' ? orders : orders.filter(o => o.platform === platformFilter);

  if (loading) {
    return (
      <div className="p-8 bg-gray-50">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-40"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}</div>
          <div className="grid grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <div key={i} className="h-96 bg-gray-200 rounded-xl"></div>)}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-50 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-circle text-red-400 text-2xl"></i>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchData} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            <i className="fas fa-redo mr-2"></i>Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Pedidos</h1>
        <p className="text-gray-500">Gestión de órdenes y entregas</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon="fas fa-shopping-bag" iconBg="bg-blue-50" iconColor="text-blue-600" value={stats.total} label="Total pedidos" />
          <StatCard icon="fas fa-clock" iconBg="bg-amber-50" iconColor="text-amber-600" value={stats.pending} label="Pendientes" />
          <StatCard icon="fas fa-spinner" iconBg="bg-purple-50" iconColor="text-purple-600" value={stats.in_progress} label="En proceso" />
          <StatCard icon="fas fa-coins" iconBg="bg-green-50" iconColor="text-green-600" value={fmtGs(stats.revenue_today || 0)} label="Revenue hoy" small />
        </div>
      )}

      {/* Platform filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'instagram', label: 'Instagram', icon: 'fab fa-instagram' },
          { key: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp' },
          { key: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-messenger' },
        ].map(f => (
          <button key={f.key} onClick={() => setPlatformFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
              platformFilter === f.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60'
            }`}
          >
            {f.icon && <i className={f.icon}></i>}
            {f.label}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
        {COLUMNS.map(col => {
          const colOrders = filtered.filter(o => {
            if (col.key === 'in_transit') return o.status === 'in_transit' || o.status === 'ready_to_ship';
            return o.status === col.key;
          });
          return (
            <div key={col.key} className="min-w-0">
              {/* Column header */}
              <div className={`${col.headerBg} rounded-xl px-4 py-3 mb-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></div>
                  <span className={`text-sm font-semibold ${col.headerText}`}>{col.label}</span>
                </div>
                <span className={`text-xs font-bold ${col.headerText} bg-white/60 px-2 py-0.5 rounded-full`}>{colOrders.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {colOrders.map(order => {
                  const pb = PLATFORM_BADGE[order.platform] || PLATFORM_BADGE.instagram;
                  return (
                    <div
                      key={order.order_id}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-indigo-600">{order.order_id}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${pb.bg} ${pb.text}`}>
                          <i className={pb.icon}></i>
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mb-1 truncate">{order.customer_name}</p>
                      <p className="text-xs text-gray-500 mb-2 truncate">
                        {order.items.map(it => `${it.quantity}x ${it.product_name}`).join(', ')}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">{fmtGs(order.total_amount)}</span>
                        <span className="text-[10px] text-gray-400">{fmtDate(order.created_at)}</span>
                      </div>
                      {order.delivery_type === 'delivery' && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                          <i className="fas fa-truck"></i>
                          <span>Delivery</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {colOrders.length === 0 && (
                  <div className="text-center py-8 text-gray-300 text-xs">Sin pedidos</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose }) {
  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_confirmation;
  const pb = PLATFORM_BADGE[order.platform] || PLATFORM_BADGE.instagram;

  const TIMELINE_STEPS = [
    { key: 'pending_confirmation', label: 'Pedido recibido', icon: 'fa-inbox' },
    { key: 'confirmed', label: 'Confirmado', icon: 'fa-check' },
    { key: 'preparing', label: 'Preparando', icon: 'fa-box-open' },
    { key: 'ready_to_ship', label: 'Listo para envío', icon: 'fa-box' },
    { key: 'in_transit', label: 'En camino', icon: 'fa-truck' },
    { key: 'delivered', label: 'Entregado', icon: 'fa-check-double' },
  ];

  const currentIdx = TIMELINE_STEPS.findIndex(s => s.key === order.status);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-sm font-mono font-bold text-indigo-600">{order.order_id}</span>
              <h3 className="text-xl font-bold text-gray-900">{order.customer_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${pb.bg} ${pb.text}`}>
                  <i className={pb.icon}></i> {order.platform}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{sc.label}</span>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Timeline */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Progreso</h4>
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, idx) => {
                const done = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        done ? (isCurrent ? 'bg-indigo-600 text-white' : 'bg-green-500 text-white') : 'bg-gray-100 text-gray-400'
                      }`}>
                        <i className={`fas ${done && !isCurrent ? 'fa-check' : step.icon}`}></i>
                      </div>
                      {idx < TIMELINE_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 ${idx < currentIdx ? 'bg-green-300' : 'bg-gray-200'}`}></div>
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</h4>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.image_url && <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-xs text-gray-500">Cant: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{fmtGs(item.unit_price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-sm font-bold text-gray-900">{fmtGs(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Delivery info */}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <i className={`fas ${order.delivery_type === 'delivery' ? 'fa-truck' : 'fa-store'} text-gray-400`}></i>
            <span>{order.delivery_type === 'delivery' ? 'Delivery' : 'Retiro en tienda'}</span>
            {order.delivery_address && <span className="text-gray-400">— {order.delivery_address}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, iconColor, value, label, small }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200/60">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center`}>
          <i className={`${icon} ${iconColor} text-lg`}></i>
        </div>
        <div>
          <h3 className={`${small ? 'text-lg' : 'text-2xl'} font-bold text-gray-900`}>{value}</h3>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
