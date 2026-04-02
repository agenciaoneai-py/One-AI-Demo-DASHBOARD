import { useState, useEffect } from 'react';
import { API_URL } from '../App';

const STATUS_STYLE = {
  sent: { label: 'Enviada', bg: 'bg-green-100', text: 'text-green-700' },
  pending: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-700' },
  failed: { label: 'Fallida', bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { label: 'Cancelada', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const TYPE_CONFIG = {
  appointment_reminder: { label: 'Recordatorio', icon: 'fas fa-calendar-alt', iconColor: 'text-purple-500', iconBg: 'bg-purple-50' },
  order_update: { label: 'Pedido', icon: 'fas fa-shopping-bag', iconColor: 'text-blue-500', iconBg: 'bg-blue-50' },
  custom: { label: 'Personalizada', icon: 'fas fa-bullhorn', iconColor: 'text-orange-500', iconBg: 'bg-orange-50' },
};

function fmtDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return 'Hoy, ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API_URL}/api/notifications`).then(r => r.json()),
      fetch(`${API_URL}/api/notifications/stats`).then(r => r.json()),
    ])
      .then(([notifsRes, statsRes]) => {
        if (notifsRes.success) setNotifications(notifsRes.data);
        if (statsRes.success) setStats(statsRes.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const filtered = notifications.filter(n => {
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="p-8 bg-gray-50">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}</div>
          <div className="h-12 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Notificaciones</h1>
        <p className="text-gray-500">Mensajes enviados y programados</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200/60">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center">
                <i className="fas fa-check-circle text-green-600 text-lg"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{stats.total_sent}</h3>
                <p className="text-xs uppercase tracking-wide text-gray-500">Enviadas</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200/60">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
                <i className="fas fa-clock text-amber-600 text-lg"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{stats.total_pending}</h3>
                <p className="text-xs uppercase tracking-wide text-gray-500">Pendientes</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200/60">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
                <i className="fas fa-percentage text-indigo-600 text-lg"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{stats.success_rate}%</h3>
                <p className="text-xs uppercase tracking-wide text-gray-500">Tasa de éxito</p>
              </div>
              <div className="ml-auto w-16 h-16">
                {/* Mini donut */}
                <div className="relative w-full h-full">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#6366f1" strokeWidth="3"
                      strokeDasharray={`${stats.success_rate} ${100 - stats.success_rate}`} strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide self-center mr-1">Estado:</span>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'sent', label: 'Enviadas' },
            { key: 'pending', label: 'Pendientes' },
            { key: 'failed', label: 'Fallidas' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                statusFilter === f.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60'
              }`}
            >{f.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide self-center mr-1">Tipo:</span>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'appointment_reminder', label: 'Recordatorio' },
            { key: 'order_update', label: 'Pedido' },
            { key: 'custom', label: 'Personalizada' },
          ].map(f => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                typeFilter === f.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mensaje</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Destinatario</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Plataforma</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(n => {
              const ss = STATUS_STYLE[n.status] || STATUS_STYLE.pending;
              const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.custom;
              return (
                <tr key={n.notification_id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 ${tc.iconBg} rounded-lg flex items-center justify-center`}>
                        <i className={`${tc.icon} ${tc.iconColor} text-sm`}></i>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{tc.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-900 max-w-[280px] truncate">{n.message}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-700">{n.recipient_name}</p>
                    <p className="text-xs text-gray-400">{n.recipient_phone}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-gray-500 capitalize">{n.platform}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ss.bg} ${ss.text}`}>{ss.label}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">{fmtDate(n.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <i className="fas fa-bell-slash text-gray-200 text-3xl mb-3"></i>
            <p className="text-gray-400 text-sm">No hay notificaciones con estos filtros</p>
          </div>
        )}
      </div>
    </div>
  );
}
