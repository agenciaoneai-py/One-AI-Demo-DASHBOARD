import { useState } from 'react';
import { useAppContext } from '../App';

// ─── Constants ──────────────────────────────────────────────
const PLATFORM = {
  instagram: { icon: 'fab fa-instagram', color: '#E1306C', gradient: 'from-pink-500 to-rose-600', name: 'Instagram' },
  whatsapp:  { icon: 'fab fa-whatsapp',  color: '#25D366', gradient: 'from-green-500 to-emerald-600', name: 'WhatsApp' },
  facebook:  { icon: 'fab fa-facebook-messenger', color: '#1877F2', gradient: 'from-blue-500 to-blue-600', name: 'Facebook' },
};

const TEMP_COLOR = { hot: '#ef4444', warm: '#f97316', cold: '#3b82f6' };

function fmt(n) {
  if (n == null) return '0';
  return new Intl.NumberFormat('es-PY').format(n);
}
function fmtGs(n) { return fmt(n) + ' Gs.'; }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

// ─── Sparkline (SVG) ────────────────────────────────────────
function Sparkline({ data, color = '#6366f1' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100, h = 40;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.value / max) * h * 0.9 - 2;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  const id = `grad-${color.replace('#', '')}`;

  return (
    <div className="w-full mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#${id})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    </div>
  );
}

// ─── BadgeDelta ─────────────────────────────────────────────
function BadgeDelta({ value }) {
  if (!value) return <span className="text-xs text-gray-400">vs. período anterior</span>;
  const isPositive = value.startsWith('+');
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
    }`}>
      <i className={`fas fa-arrow-${isPositive ? 'up' : 'down'} text-[9px]`} />
      {value.replace('+', '').replace('-', '')}
    </span>
  );
}

// ─── Main component ─────────────────────────────────────────
export default function DashboardPage() {
  const { stats } = useAppContext();
  const [days, setDays] = useState(7);
  const [agentActive, setAgentActive] = useState(true);

  if (!stats) {
    return (
      <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between"><div className="h-8 bg-gray-200 rounded w-64"></div><div className="h-8 bg-gray-200 rounded w-40"></div></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-44 bg-gray-200 rounded-xl"></div>)}</div>
          <div className="h-40 bg-gray-200 rounded-xl"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div className="h-80 bg-gray-200 rounded-xl"></div><div className="h-80 bg-gray-200 rounded-xl"></div></div>
        </div>
      </div>
    );
  }

  const daily = stats.dailyConversations || [];
  const maxConv = Math.max(...daily.map(d => d.conversations || d.count || 0), 1);
  const cd = stats.channelDistribution || { instagram: 45, whatsapp: 35, facebook: 20 };
  const pt = stats.platformTotals || {};
  const rev = stats.revenue || {};
  const lt = stats.leadTemperature || { hot: 0, warm: 0, cold: 0 };
  const ltTotal = lt.hot + lt.warm + lt.cold || 1;
  const activity = stats.recentActivity || [];
  const sp = stats.sparklines || {};
  const cbp = stats.contactsByPlatform || {};
  const cbpTotal = (cbp.instagram || 0) + (cbp.whatsapp || 0) + (cbp.facebook || 0) || 1;
  const budgetPct = 100 - (stats.budget?.percent_used || 23);

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">

      {/* ─── 1. Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, Demo Owner</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen de rendimiento de tu empleado virtual</p>
        </div>
        <div className="flex gap-1 bg-gray-100/80 rounded-lg p-1">
          {[{label:'7 días',value:7},{label:'14 días',value:14},{label:'30 días',value:30}].map(opt => (
            <button key={opt.value} onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                days === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 2. Agent banner ─── */}
      <div className={`rounded-xl p-6 text-white mb-8 shadow-sm transition-all duration-300 animate-fade-in-up ${
        agentActive ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'
      }`} style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${agentActive ? 'bg-white' : 'bg-white/50'}`}
                style={agentActive ? { animation: 'gentle-pulse 2s ease-in-out infinite' } : undefined} />
              <span className="font-semibold text-lg">
                {agentActive ? 'Empleado Virtual Activo' : 'Empleado Virtual Pausado'}
              </span>
            </div>
            <p className="text-white/90 text-sm">
              {agentActive ? 'Respondiendo conversaciones en Instagram, Facebook y WhatsApp' : 'Los mensajes se guardan pero no se responden automáticamente'}
            </p>
          </div>
          <button
            onClick={() => setAgentActive(!agentActive)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 shrink-0 ml-4 ${
              agentActive ? 'bg-white/30' : 'bg-white/20'
            } cursor-pointer hover:bg-white/40`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
              agentActive ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* ─── 3. Stat cards with sparklines ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Clientes Atendidos', value: fmt(stats.totalConversations), icon: 'fas fa-headset', change: stats.conversationsChange, spark: sp.conversations, color: '#6366f1' },
          { label: 'Leads Calientes', value: stats.urgentLeads || 0, icon: 'fas fa-fire-alt', change: stats.leadsChange, spark: sp.leads, color: '#f97316' },
          { label: 'Activos Hoy', value: stats.activeUsers24h || stats.last24h || 0, icon: 'fas fa-bolt', change: stats.activeChange, spark: sp.active, color: '#10b981' },
          { label: 'Conversión a Venta', value: `${stats.conversionRate || 0}%`, icon: 'fas fa-chart-pie', change: stats.conversionChange, spark: sp.conversion, color: '#8b5cf6' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 animate-fade-in-up"
            style={{ animationDelay: `${0.1 + idx * 0.05}s` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
              <i className={`${card.icon} text-xl text-gray-200`} />
            </div>
            <p className="text-2xl font-bold tracking-tight text-gray-900 mb-2">{card.value}</p>
            <BadgeDelta value={card.change} />
            <Sparkline data={card.spark} color={card.color} />
          </div>
        ))}
      </div>

      {/* ─── 4. Resumen de Ventas ─── */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 mb-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Ventas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <p className="text-2xl font-bold tracking-tight text-emerald-700">{fmtGs(rev.total_revenue || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Ingresos totales</p>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-xl">
            <p className="text-2xl font-bold tracking-tight text-indigo-700">{rev.orders_count || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Pedidos (no cancelados)</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <p className="text-2xl font-bold tracking-tight text-purple-700">{fmtGs(rev.avg_order_value || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Valor Promedio</p>
          </div>
        </div>
        {/* Platform revenue bars */}
        <div className="space-y-3">
          {Object.entries(PLATFORM).map(([key, p]) => {
            const val = rev.revenue_by_platform?.[key] || 0;
            const maxRev = Math.max(...Object.values(rev.revenue_by_platform || { a: 1 }));
            const pct = maxRev > 0 ? (val / maxRev) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <i className={`${p.icon} text-lg w-6 text-center`} style={{ color: p.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{p.name}</span>
                    <span className="text-sm font-bold text-gray-900">{fmtGs(val)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: `linear-gradient(to right, ${p.color}60, ${p.color})` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 5. Combustible IA ─── */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 mb-6 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Combustible del Empleado Virtual</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">Disponible</span>
          <span className="text-sm font-bold tracking-tight text-gray-500">{budgetPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${budgetPct}%` }} />
        </div>
        <p className="text-xs font-medium text-gray-500 mt-3">✓ Operando normalmente</p>
      </div>

      {/* ─── 6. Charts: Bar + Donut ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Volumen de Mensajes</h3>
          <div className="flex items-end gap-1 h-48 lg:h-64">
            {daily.map((day, i) => {
              const conv = day.conversations || day.count || 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {day.fullDate || day.date}: {conv}
                  </div>
                  <div className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                    style={{
                      height: `${(conv / maxConv) * 100}%`,
                      backgroundColor: day.isToday ? '#4f46e5' : '#818cf8',
                      minHeight: '4px'
                    }} />
                  {day.showLabel !== false && (
                    <span className="text-[11px] text-gray-400 mt-1">{day.date}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Canal</h3>
          <div className="flex items-center justify-center py-6">
            <div className="mx-auto w-[180px] h-[180px] rounded-full relative"
              style={{
                background: `conic-gradient(#E1306C 0% ${cd.instagram}%, #25D366 ${cd.instagram}% ${cd.instagram + cd.whatsapp}%, #1877F2 ${cd.instagram + cd.whatsapp}% 100%)`
              }}>
              <div className="absolute inset-[25%] bg-white rounded-full flex items-center justify-center shadow-inner">
                <span className="text-lg font-bold text-gray-900">{fmt(stats.totalContacts || 0)}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-5 mt-3 flex-wrap">
            {Object.entries(PLATFORM).map(([key, p]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-sm text-gray-600">{p.name}</span>
                <span className="text-sm font-semibold text-gray-900">{cd[key] || 0}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 7. Actividad Reciente ─── */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 mb-6 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
        {activity.length === 0 ? (
          <div className="text-center py-10">
            <i className="fas fa-inbox text-gray-200 text-3xl mb-2"></i>
            <p className="text-sm text-gray-400">No hay actividad reciente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activity.map(a => {
              const plat = PLATFORM[a.platform] || PLATFORM.instagram;
              const tempColor = TEMP_COLOR[a.temperature] || TEMP_COLOR.warm;
              return (
                <div key={a.id} className="flex items-center gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-gray-50/80 transition-colors duration-200 cursor-pointer">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tempColor }} />
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium bg-gradient-to-br ${plat.gradient}`}>
                      {a.initials || '??'}
                    </div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full flex items-center justify-center border border-white"
                      style={{ backgroundColor: plat.color }}>
                      <i className={`${plat.icon} text-white`} style={{ fontSize: '8px' }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 text-sm truncate block">{a.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{a.timeAgo || a.time}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">{a.status || 'Activo'}</span>
                    </div>
                    {a.note && <p className="text-xs text-gray-500 truncate mt-0.5">{a.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 8. Resumen del Período ─── */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 mb-6 animate-fade-in-up" style={{ animationDelay: '0.55s' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Período ({days} días)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MiniMetric label="Total mensajes" value={fmt(stats.totalMessages || 0)} icon="fas fa-comments" />
          <MiniMetric label="Usuarios únicos" value={fmt(stats.totalUniqueUsers || 0)} icon="fas fa-users" />
          <MiniMetric label="Promedio diario" value={fmt(stats.avgDaily || 0)} icon="fas fa-chart-bar" />
          <MiniMetric label="Últimas 24h" value={fmt(stats.last24h || 0)} icon="fas fa-clock" />
          <MiniMetric label="Score promedio" value={stats.avgScore || 0} icon="fas fa-star" />
        </div>
      </div>

      {/* ─── 9. Mensajes por Plataforma + Leads por Temperatura ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Mensajes por plataforma */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mensajes por Plataforma</h3>
          <div className="space-y-4">
            {Object.entries(PLATFORM).map(([key, p]) => {
              const count = pt[key] || cbp[key] || 0;
              const total = (pt.instagram || cbp.instagram || 0) + (pt.whatsapp || cbp.whatsapp || 0) + (pt.facebook || cbp.facebook || 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <i className={p.icon} style={{ color: p.color }} />
                      <span className="text-sm font-medium text-gray-700">{p.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{fmt(count)} <span className="text-gray-400">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leads por temperatura */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.65s' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads por Temperatura</h3>
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 text-center bg-red-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-700">{lt.hot}</p>
              <p className="text-xs text-gray-500 mt-1">Caliente</p>
            </div>
            <div className="flex-1 text-center bg-orange-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-orange-700">{lt.warm}</p>
              <p className="text-xs text-gray-500 mt-1">Tibio</p>
            </div>
            <div className="flex-1 text-center bg-blue-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-700">{lt.cold}</p>
              <p className="text-xs text-gray-500 mt-1">Frío</p>
            </div>
          </div>
          <div className="flex rounded-full overflow-hidden h-3">
            <div className="bg-red-500 transition-all duration-500" style={{ width: `${(lt.hot / ltTotal) * 100}%` }} />
            <div className="bg-orange-400 transition-all duration-500" style={{ width: `${(lt.warm / ltTotal) * 100}%` }} />
            <div className="bg-blue-400 transition-all duration-500" style={{ width: `${(lt.cold / ltTotal) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>{Math.round((lt.hot / ltTotal) * 100)}% caliente</span>
            <span>{Math.round((lt.warm / ltTotal) * 100)}% tibio</span>
            <span>{Math.round((lt.cold / ltTotal) * 100)}% frío</span>
          </div>
        </div>
      </div>

      {/* ─── 10. Contactos por Plataforma + Engagement Score ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contactos por plataforma */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contactos por Plataforma</h3>
          <div className="space-y-4">
            {Object.entries(PLATFORM).map(([key, p]) => {
              const count = cbp[key] || 0;
              const pct = Math.round((count / cbpTotal) * 100);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <i className={p.icon} style={{ color: p.color }} />
                      <span className="text-sm font-medium text-gray-700">{p.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: `linear-gradient(to right, ${p.color}60, ${p.color})` }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-gray-100 flex justify-between">
              <span className="text-sm font-medium text-gray-500">Total</span>
              <span className="text-sm font-bold text-gray-900">{fmt(stats.totalContacts || 0)}</span>
            </div>
          </div>
        </div>

        {/* Engagement score */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.75s' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Interacción</h3>
          <div className="flex items-center justify-center py-6">
            <EngagementCircle score={stats.avgScore || 62} />
          </div>
          <div className="text-center mt-2">
            <p className="text-sm font-medium text-gray-900">Score de Engagement</p>
            <p className="text-xs text-gray-500 mt-1">Basado en respuestas, calificaciones y conversiones</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{fmt(stats.totalMessages || 0)}</p>
              <p className="text-[10px] text-gray-500 uppercase">Mensajes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{fmt(stats.totalContacts || 0)}</p>
              <p className="text-[10px] text-gray-500 uppercase">Contactos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{stats.conversionRate || 0}%</p>
              <p className="text-[10px] text-gray-500 uppercase">Conversión</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────
function MiniMetric({ label, value, icon }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-xl">
      <i className={`${icon} text-gray-300 text-lg mb-1`} />
      <p className="text-xl font-bold tracking-tight text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500 mt-1 uppercase">{label}</p>
    </div>
  );
}

function EngagementCircle({ score }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="#f3f4f6" strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${score}, 100`} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{score}</span>
      </div>
    </div>
  );
}
