import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Config ────────────────────────────────────────────────

const STATUS_DISPLAY = {
  pending_confirmation: { label: 'Pendiente',  textColor: 'text-amber-600',   bgColor: 'bg-amber-50'  },
  confirmed:            { label: 'Confirmado', textColor: 'text-indigo-600',  bgColor: 'bg-indigo-50' },
  preparing:            { label: 'Preparando', textColor: 'text-indigo-600',  bgColor: 'bg-indigo-50' },
  ready_to_ship:        { label: 'Listo',      textColor: 'text-sky-600',     bgColor: 'bg-sky-50'    },
  in_transit:           { label: 'En camino',  textColor: 'text-sky-600',     bgColor: 'bg-sky-50'    },
  delivered:            { label: 'Entregado',  textColor: 'text-emerald-600', bgColor: 'bg-emerald-50'},
  cancelled:            { label: 'Cancelado',  textColor: 'text-red-600',     bgColor: 'bg-red-50'    },
};

const NEXT_ACTION = {
  pending_confirmation: { label: 'Confirmar',  icon: 'fa-check',         color: 'bg-amber-500 hover:bg-amber-600',     next: 'confirmed'     },
  confirmed:            { label: 'Preparar',   icon: 'fa-utensils',      color: 'bg-indigo-500 hover:bg-indigo-600',   next: 'preparing'     },
  preparing:            { label: 'Despachar',  icon: 'fa-truck',         color: 'bg-sky-500 hover:bg-sky-600',         next: 'ready_to_ship' },
  ready_to_ship:        { label: 'Enviar',     icon: 'fa-shipping-fast', color: 'bg-sky-600 hover:bg-sky-700',         next: 'in_transit'    },
  in_transit:           { label: 'Entregado',  icon: 'fa-circle-check',  color: 'bg-emerald-500 hover:bg-emerald-600', next: 'delivered'     },
  delivered:            null,
  cancelled:            null,
};

const PLATFORM_CONFIG = {
  instagram: { icon: 'fab fa-instagram',         hexColor: '#E1306C' },
  whatsapp:  { icon: 'fab fa-whatsapp',           hexColor: '#25D366' },
  facebook:  { icon: 'fab fa-facebook-messenger', hexColor: '#1877F2' },
};

const STATUS_PILLS = [
  { key: 'all',                  label: 'Todos',       dotColor: 'bg-gray-400'    },
  { key: 'pending_confirmation', label: 'Pendientes',  dotColor: 'bg-amber-500'   },
  { key: 'confirmed',            label: 'Confirmados', dotColor: 'bg-indigo-400'  },
  { key: 'preparing',            label: 'Preparando',  dotColor: 'bg-indigo-500'  },
  { key: 'ready_to_ship',        label: 'Listos',      dotColor: 'bg-sky-400'     },
  { key: 'in_transit',           label: 'En camino',   dotColor: 'bg-sky-500'     },
  { key: 'delivered',            label: 'Entregados',  dotColor: 'bg-emerald-500' },
  { key: 'cancelled',            label: 'Cancelados',  dotColor: 'bg-red-500'     },
];

const KANBAN_STATUSES = [
  { key: 'pending_confirmation', label: 'Pendiente',  dotColor: 'bg-amber-500'   },
  { key: 'confirmed',            label: 'Confirmado', dotColor: 'bg-indigo-400'  },
  { key: 'preparing',            label: 'Preparando', dotColor: 'bg-indigo-500'  },
  { key: 'ready_to_ship',        label: 'Listo',      dotColor: 'bg-sky-400'     },
  { key: 'in_transit',           label: 'En camino',  dotColor: 'bg-sky-500'     },
  { key: 'delivered',            label: 'Entregado',  dotColor: 'bg-emerald-500' },
];

// ─── Helpers ───────────────────────────────────────────────

function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return 'ahora';
  if (mins < 60)  return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function FormattedPrice({ amount, size = 'default' }) {
  const formatted = Math.round(amount).toLocaleString('es-PY', { maximumFractionDigits: 0 });
  return (
    <span className="tracking-tight text-gray-900">
      <span className={`font-bold ${size === 'lg' ? 'text-xl' : 'text-lg'}`}>{formatted}</span>
      <span className={`font-medium text-gray-400 ml-0.5 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>Gs</span>
    </span>
  );
}

function StatusBadge({ status }) {
  const d = STATUS_DISPLAY[status] || { label: status, textColor: 'text-gray-600', bgColor: 'bg-gray-50' };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${d.textColor} ${d.bgColor}`}>
      {d.label}
    </span>
  );
}

// ─── Toast ─────────────────────────────────────────────────

let _toastTimer;
function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(_toastTimer);
    setToast({ msg, type });
    _toastTimer = setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, showToast };
}

// ─── Main Component ────────────────────────────────────────

export default function PedidosPage() {
  const [allOrders, setAllOrders]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [viewMode, setViewMode]             = useState('list');   // 'list' | 'kanban'
  const [statusFilter, setStatusFilter]     = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [activeTab, setActiveTab]           = useState('all');   // 'all' | 'delivery' | 'retiro'
  const [selectedOrder, setSelectedOrder]   = useState(null);
  const [advanceTarget, setAdvanceTarget]   = useState(null);
  const [isExporting, setIsExporting]       = useState(false);
  const { toast, showToast }                = useToast();

  // Fetch
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/orders`)
      .then(r => r.json())
      .then(json => setAllOrders(json.data || json.orders || []))
      .catch(() => showToast('Error al cargar pedidos', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Derived counts
  const statusCounts = { all: allOrders.length };
  STATUS_PILLS.forEach(p => {
    if (p.key !== 'all') statusCounts[p.key] = allOrders.filter(o => o.status === p.key).length;
  });
  const deliveryCount = allOrders.filter(o => o.delivery_type === 'delivery').length;
  const retiroCount   = allOrders.filter(o => o.delivery_type !== 'delivery').length;
  const pendingCount  = statusCounts.pending_confirmation || 0;

  // Filter pipeline
  const displayOrders = allOrders.filter(o => {
    if (statusFilter   !== 'all' && o.status   !== statusFilter)   return false;
    if (platformFilter !== 'all' && o.platform !== platformFilter) return false;
    if (activeTab === 'delivery' && o.delivery_type !== 'delivery') return false;
    if (activeTab === 'retiro'   && o.delivery_type === 'delivery') return false;
    return true;
  });

  // Advance order (local state — demo only)
  function handleAdvance(order) { setAdvanceTarget(order); }
  function confirmAdvance() {
    const action = NEXT_ACTION[advanceTarget.status];
    if (!action) return;
    setAllOrders(prev => prev.map(o =>
      o.order_id === advanceTarget.order_id ? { ...o, status: action.next } : o
    ));
    if (selectedOrder?.order_id === advanceTarget.order_id) {
      setSelectedOrder(prev => ({ ...prev, status: action.next }));
    }
    showToast(`Pedido actualizado a "${STATUS_DISPLAY[action.next]?.label}"`);
    setAdvanceTarget(null);
  }

  // Export CSV
  function handleExportCSV() {
    setIsExporting(true);
    try {
      const headers = ['ID', 'Cliente', 'Teléfono', 'Plataforma', 'Estado', 'Total (Gs)', 'Tipo entrega', 'Fecha'];
      const rows = allOrders.map(o => [
        o.order_id,
        o.customer_name || '',
        o.phone || '',
        o.platform,
        STATUS_DISPLAY[o.status]?.label || o.status,
        o.total_amount,
        o.delivery_type === 'delivery' ? 'Delivery' : 'Retiro',
        o.created_at?.slice(0, 10) || '',
      ]);
      const csv  = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'pedidos.csv'; a.click();
      URL.revokeObjectURL(url);
      showToast('Exportación completada');
    } catch {
      showToast('Error al exportar', 'error');
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  }

  const advanceAction = advanceTarget ? NEXT_ACTION[advanceTarget.status] : null;

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-gray-50/30">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white animate-fade-in-up ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
        }`}>
          <i className={`fas ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-2`} />
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pedidos</h1>
          {pendingCount > 0 && (
            <p className="text-orange-600 text-sm mt-1">
              {pendingCount} pedido{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de confirmación
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={allOrders.length === 0 || isExporting}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50"
          >
            <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'} text-base`} />
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              title="Vista lista"
              className={`p-1.5 rounded-md transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className="fas fa-list text-sm" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="Vista kanban"
              className={`p-1.5 rounded-md transition-all duration-200 ${viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className="fas fa-columns text-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Status pills ── */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {STATUS_PILLS.map(pill => (
          <button
            key={pill.key}
            onClick={() => setStatusFilter(pill.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 ${
              statusFilter === pill.key
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                : 'border-gray-200/60 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${pill.dotColor}`} />
            <span className="text-sm font-medium">{statusCounts[pill.key] ?? 0}</span>
            <span className="text-sm text-gray-500">{pill.label}</span>
          </button>
        ))}
      </div>

      {/* ── Platform filter ── */}
      <div className="bg-white border border-gray-200/60 rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
        <select
          value={platformFilter}
          onChange={e => setPlatformFilter(e.target.value)}
          className="w-full md:w-48 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          <option value="all">🌐 Todas las plataformas</option>
          <option value="whatsapp">💬 WhatsApp</option>
          <option value="instagram">📸 Instagram</option>
          <option value="facebook">📘 Facebook</option>
        </select>
      </div>

      {/* ── Delivery / Retiro tabs ── */}
      <div className="flex sm:inline-flex overflow-x-auto bg-gray-100 p-0.5 rounded-lg mb-6">
        {[
          { key: 'all',      label: `Todos (${allOrders.length})`      },
          { key: 'delivery', label: `Delivery (${deliveryCount})`      },
          { key: 'retiro',   label: `Retiro en local (${retiroCount})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-0 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/5" />
              <div className="h-4 bg-gray-100 rounded w-1/4" />
              <div className="h-4 bg-gray-100 rounded w-20" />
              <div className="h-5 bg-gray-100 rounded-full w-20" />
              <div className="h-4 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && displayOrders.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <i className="fas fa-box-open text-3xl text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No hay pedidos que mostrar</p>
          <p className="text-sm text-gray-400 mt-1">Ajustá los filtros para ver más resultados</p>
        </div>
      )}

      {/* ══ LIST VIEW ══════════════════════════════════════════ */}
      {!loading && displayOrders.length > 0 && viewMode === 'list' && (
        <div className="bg-white border border-gray-200/60 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                {['Cliente', 'Productos', 'Total', 'Estado', 'Hace', 'Acciones'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-400 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {displayOrders.map(order => {
                const totalItems  = order.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0;
                const firstName   = order.items?.[0]?.product_name || order.items?.[0]?.name || '—';
                const nextAction  = NEXT_ACTION[order.status];
                const platformCfg = PLATFORM_CONFIG[order.platform];

                return (
                  <tr
                    key={order.order_id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-gray-50/80 transition-colors duration-150 cursor-pointer group"
                  >
                    {/* Cliente */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(order.customer_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{order.customer_name || 'Sin nombre'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <i className={`${platformCfg?.icon || 'fas fa-globe'} text-xs`} style={{ color: platformCfg?.hexColor || '#6b7280' }} />
                            <span className="text-xs text-gray-400 capitalize">{order.platform}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Productos */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 font-medium">{totalItems} producto{totalItems !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{firstName}</p>
                    </td>

                    {/* Total */}
                    <td className="px-6 py-4">
                      <FormattedPrice amount={order.total_amount} />
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Hace */}
                    <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                      {timeAgo(order.created_at)}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {nextAction && (
                          <button
                            onClick={e => { e.stopPropagation(); handleAdvance(order); }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all ${nextAction.color}`}
                          >
                            <i className={`fas ${nextAction.icon} text-[10px]`} />
                            {nextAction.label}
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedOrder(order); }}
                          className="text-gray-400 hover:text-gray-600 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                          title="Ver detalle"
                        >
                          <i className="fas fa-eye text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ KANBAN VIEW ════════════════════════════════════════ */}
      {!loading && displayOrders.length > 0 && viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_STATUSES.map(col => {
            const colOrders = displayOrders.filter(o => o.status === col.key);
            return (
              <div key={col.key} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{colOrders.length}</span>
                </div>

                <div className="space-y-3">
                  {colOrders.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      Sin pedidos
                    </div>
                  ) : colOrders.map(order => {
                    const nextAction  = NEXT_ACTION[order.status];
                    const platformCfg = PLATFORM_CONFIG[order.platform];
                    const itemNames   = order.items?.map(i => i.product_name || i.name).join(', ') || '—';

                    return (
                      <div
                        key={order.order_id}
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white rounded-xl border border-gray-200/60 p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-900 truncate flex-1">{order.customer_name || 'Sin nombre'}</p>
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0 ml-2"
                            style={{ backgroundColor: `${platformCfg?.hexColor || '#6b7280'}18` }}
                          >
                            <i className={`${platformCfg?.icon || 'fas fa-globe'} text-xs`} style={{ color: platformCfg?.hexColor || '#6b7280' }} />
                          </div>
                        </div>

                        <p className="text-xs text-gray-400 truncate mb-2">{itemNames}</p>

                        <div className="flex items-center justify-between mb-3">
                          <FormattedPrice amount={order.total_amount} />
                          <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                        </div>

                        {nextAction && (
                          <button
                            onClick={e => { e.stopPropagation(); handleAdvance(order); }}
                            className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-all ${nextAction.color}`}
                          >
                            <i className={`fas ${nextAction.icon} text-xs`} />
                            {nextAction.label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ ORDER DETAIL SLIDEOUT ══════════════════════════════ */}
      {selectedOrder && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedOrder(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-in-right">

            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-gray-900">
                  Pedido #{selectedOrder.order_id}
                </span>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fas fa-xmark text-gray-400" />
              </button>
            </div>

            <div className="space-y-5 px-4 pb-6 mt-4">

              {/* Cliente */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Cliente</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Nombre</p>
                    <p className="text-sm font-medium text-gray-900">{selectedOrder.customer_name || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Teléfono</p>
                    <p className="text-sm text-gray-700">{selectedOrder.phone || '—'}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                  <i
                    className={`${PLATFORM_CONFIG[selectedOrder.platform]?.icon || 'fas fa-globe'} text-base`}
                    style={{ color: PLATFORM_CONFIG[selectedOrder.platform]?.hexColor || '#6b7280' }}
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">{selectedOrder.platform}</span>
                </div>
              </div>

              {/* Productos */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Productos</h4>
                {(selectedOrder.items || []).map((item, idx) => {
                  const name  = item.product_name || item.name || 'Producto';
                  const price = item.unit_price   || item.price || 0;
                  const qty   = item.quantity || 1;
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2.5 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{name}</p>
                        <p className="text-xs text-gray-500">x{qty}</p>
                      </div>
                      <FormattedPrice amount={price * qty} />
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-900">TOTAL</span>
                  <FormattedPrice amount={selectedOrder.total_amount} size="lg" />
                </div>
              </div>

              {/* Entrega */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Entrega</h4>
                <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-3">
                  <i className={`fas ${selectedOrder.delivery_type === 'delivery' ? 'fa-truck' : 'fa-store'} text-gray-400 mt-0.5`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedOrder.delivery_type === 'delivery' ? 'Delivery' : 'Retiro en local'}
                    </p>
                    {selectedOrder.delivery_address && (
                      <p className="text-xs text-gray-500 mt-0.5">{selectedOrder.delivery_address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-gray-400 font-medium">Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-plus text-emerald-600 text-xs" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Pedido creado</p>
                      <p className="text-xs text-gray-400">{timeAgo(selectedOrder.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${STATUS_DISPLAY[selectedOrder.status]?.bgColor || 'bg-gray-100'}`}>
                      <i className={`fas fa-circle-dot text-xs ${STATUS_DISPLAY[selectedOrder.status]?.textColor || 'text-gray-500'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{STATUS_DISPLAY[selectedOrder.status]?.label || selectedOrder.status}</p>
                      <p className="text-xs text-gray-400">Estado actual</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advance action */}
              {NEXT_ACTION[selectedOrder.status] && (
                <button
                  onClick={() => handleAdvance(selectedOrder)}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm transition-all ${NEXT_ACTION[selectedOrder.status].color}`}
                >
                  <i className={`fas ${NEXT_ACTION[selectedOrder.status].icon} text-sm`} />
                  {NEXT_ACTION[selectedOrder.status].label}
                </button>
              )}

              {/* WhatsApp CTA */}
              {selectedOrder.phone && (
                <button
                  onClick={() => window.open(`https://wa.me/${selectedOrder.phone.replace(/\D/g, '')}`, '_blank')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-all"
                >
                  <i className="fab fa-whatsapp text-base text-green-500" /> Abrir WhatsApp
                </button>
              )}

            </div>
          </div>
        </>
      )}

      {/* ══ ADVANCE CONFIRMATION DIALOG ═══════════════════════ */}
      {advanceTarget && advanceAction && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setAdvanceTarget(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirmar cambio de estado</h2>
            <p className="text-sm text-gray-600 mb-4">
              ¿Confirmar que el pedido{' '}
              <span className="font-semibold">#{advanceTarget.order_id}</span>{' '}
              pasa a{' '}
              <span className="font-semibold">"{STATUS_DISPLAY[advanceAction.next]?.label}"</span>?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setAdvanceTarget(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAdvance}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-check text-sm" /> Confirmar
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
