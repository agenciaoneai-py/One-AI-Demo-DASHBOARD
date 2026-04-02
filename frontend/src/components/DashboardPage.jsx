import { useAppContext } from '../App';

const PLATFORM_ICON = {
  instagram: 'fab fa-instagram',
  whatsapp: 'fab fa-whatsapp',
  facebook: 'fab fa-facebook-messenger',
};
const PLATFORM_COLOR = {
  instagram: 'text-[#E1306C]',
  whatsapp: 'text-[#25D366]',
  facebook: 'text-[#1877F2]',
};

const ACTIVITY_CONFIG = {
  new_lead: { badge: 'Nuevo Lead', cls: 'bg-yellow-100 text-yellow-700' },
  sale: { badge: 'Venta', cls: 'bg-green-100 text-green-700' },
  message: { badge: 'Mensaje', cls: 'bg-blue-100 text-blue-700' },
  qualified: { badge: 'Calificado', cls: 'bg-purple-100 text-purple-700' },
  appointment: { badge: 'Cita', cls: 'bg-indigo-100 text-indigo-700' },
};

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function DashboardPage() {
  const { stats } = useAppContext();

  if (!stats) {
    return (
      <div className="p-8 bg-gray-50">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-80 bg-gray-200 rounded-xl"></div>
            <div className="h-80 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const daily = stats.dailyConversations || [];
  const maxCount = Math.max(...daily.map(d => d.count), 1);
  const cd = stats.channelDistribution || { instagram: 45, whatsapp: 35, facebook: 20 };
  const activity = stats.recentActivity || [];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-500">Vista general de tu agente IA</p>
      </div>

      {/* Agent banner */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-5 text-white mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="font-semibold text-lg">Agente Activo</span>
        </div>
        <p className="text-white/80 text-sm">Respondiendo conversaciones en Instagram, Facebook y WhatsApp</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="fas fa-comments" iconBg="bg-blue-50" iconColor="text-blue-600"
          value={fmt(stats.totalConversations)} label="Conversaciones totales" change={stats.conversationsChange} />
        <StatCard icon="fas fa-user-check" iconBg="bg-purple-50" iconColor="text-purple-600"
          value={stats.totalLeads || 0} label="Leads calificados" change={stats.leadsChange} />
        <StatCard icon="fas fa-fire" iconBg="bg-orange-50" iconColor="text-orange-600"
          value={stats.urgentLeads || 0} label="Listos para closer" tag="Urgente" tagCls="text-orange-600 bg-orange-50" />
        <StatCard icon="fas fa-chart-line" iconBg="bg-indigo-50" iconColor="text-indigo-600"
          value={`${stats.conversionRate || 0}%`} label="Tasa de conversión" change={stats.conversionChange} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Bar chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <h3 className="font-bold text-gray-900 mb-5">Conversaciones últimos 7 días</h3>
          <div className="h-56 flex items-end justify-between gap-2">
            {daily.map((d, i) => {
              const pct = (d.count / maxCount) * 85;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] text-gray-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
                  <div className="w-full relative">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-200 group-hover:from-indigo-700 group-hover:to-indigo-500"
                      style={{ height: `${pct}%`, minHeight: '6px' }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">{DAY_LABELS[new Date(d.date).getDay()]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut chart with conic-gradient */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <h3 className="font-bold text-gray-900 mb-5">Distribución por canal</h3>
          <div className="flex items-center justify-center h-56">
            <div className="relative w-44 h-44">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#E1306C 0% ${cd.instagram}%, #25D366 ${cd.instagram}% ${cd.instagram + cd.whatsapp}%, #1877F2 ${cd.instagram + cd.whatsapp}% 100%)`
                }}
              ></div>
              <div className="absolute inset-[18%] rounded-full bg-white flex items-center justify-center shadow-inner">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalContacts || 0}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Contactos</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              { name: 'Instagram', pct: cd.instagram, color: '#E1306C' },
              { name: 'WhatsApp', pct: cd.whatsapp, color: '#25D366' },
              { name: 'Facebook', pct: cd.facebook, color: '#1877F2' },
            ].map(ch => (
              <div key={ch.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ch.color }}></div>
                  <span className="text-sm text-gray-700">{ch.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{ch.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
        <h3 className="font-bold text-gray-900 mb-4">Actividad Reciente</h3>
        <div className="space-y-1">
          {activity.map((item, idx) => {
            const cfg = ACTIVITY_CONFIG[item.type] || ACTIVITY_CONFIG.message;
            const initials = item.name ? item.name.split(' ').map(w => w[0]).join('').slice(0, 2) : '??';
            return (
              <div key={idx} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-all duration-200 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                    {item.platform && <i className={`${PLATFORM_ICON[item.platform]} ${PLATFORM_COLOR[item.platform]} text-sm`}></i>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 text-[10px] rounded-full font-semibold ${cfg.cls}`}>{cfg.badge}</span>
                    {item.amount && <span className="text-xs text-gray-500">{item.amount}</span>}
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>
              </div>
            );
          })}
          {activity.length === 0 && (
            <div className="text-center py-8">
              <i className="fas fa-inbox text-gray-200 text-3xl mb-2"></i>
              <p className="text-sm text-gray-400">No hay actividad reciente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function fmt(n) {
  if (!n) return '0';
  return new Intl.NumberFormat('es-PY').format(n);
}

function StatCard({ icon, iconBg, iconColor, value, label, change, tag, tagCls }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200/60 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center`}>
          <i className={`${icon} ${iconColor} text-lg`}></i>
        </div>
        {change && <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">{change}</span>}
        {tag && <span className={`text-xs font-semibold ${tagCls} px-2 py-1 rounded-full`}>{tag}</span>}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-0.5">{value}</h3>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      {change && <p className="text-[10px] text-gray-400 mt-1">vs mes anterior</p>}
    </div>
  );
}
