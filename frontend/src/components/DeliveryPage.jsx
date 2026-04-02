import { useState } from 'react';

// ── Fake delivery data (inline, no endpoint needed) ──
const ZONES = ['Centro', 'San Lorenzo', 'Luque', 'Fernando de la Mora', 'Lambaré', 'Mariano Roque Alonso'];
const STREETS = ['Av. Mariscal López', 'Calle Palma', 'Av. España', 'Av. Eusebio Ayala', 'Calle Mcal. Estigarribia', 'Av. Sacramento', 'Calle Colón', 'Av. Artigas'];
const NAMES = ['María González', 'Carlos Benítez', 'Ana Villalba', 'Luis Cardozo', 'Rosa Cabrera', 'Pedro Franco', 'Carmen Mendoza', 'José Ramírez'];

function fmtGs(n) { return n.toLocaleString('es-PY') + ' Gs.'; }

function makeDeliveries() {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const items = [];
  for (let i = 0; i < 8; i++) {
    const isToday = i < 4;
    const zone = ZONES[i % ZONES.length];
    const status = isToday
      ? ['confirmed', 'in_transit', 'ready_to_ship', 'delivered'][i]
      : ['pending_confirmation', 'confirmed', 'confirmed', 'pending_confirmation'][i - 4];
    items.push({
      id: `DEL-${String(200 + i).slice(1)}`,
      customer: NAMES[i],
      phone: `+595 9${71 + i} ${100000 + i * 12345}`,
      address: `${STREETS[i % STREETS.length]} ${100 + i * 230}`,
      zone,
      delivery_price: [15000, 20000, 25000, 18000, 22000, 30000][i % 6],
      total: [150000, 280000, 95000, 420000, 180000, 65000, 310000, 125000][i],
      products: [`${1 + (i % 3)}x Producto ${String.fromCharCode(65 + i)}`],
      date: isToday ? today : tomorrow,
      time: `${9 + i}:00`,
      status,
      sequence: i + 1,
    });
  }
  return items;
}

const STATUS_STYLE = {
  pending_confirmation: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-700' },
  confirmed: { label: 'Confirmado', bg: 'bg-blue-100', text: 'text-blue-700' },
  ready_to_ship: { label: 'Listo', bg: 'bg-purple-100', text: 'text-purple-700' },
  in_transit: { label: 'En camino', bg: 'bg-green-100', text: 'text-green-700' },
  delivered: { label: 'Entregado', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const TABS = [
  { key: 'today', label: 'Hoy', icon: 'fas fa-calendar-day' },
  { key: 'scheduled', label: 'Programados', icon: 'fas fa-calendar-alt' },
  { key: 'route', label: 'Ruta', icon: 'fas fa-route' },
];

export default function DeliveryPage() {
  const [tab, setTab] = useState('today');
  const [deliveries] = useState(makeDeliveries);

  const today = new Date().toISOString().slice(0, 10);
  const todayDeliveries = deliveries.filter(d => d.date === today);
  const scheduledDeliveries = deliveries.filter(d => d.date > today);
  const routeDeliveries = todayDeliveries
    .filter(d => d.status !== 'delivered')
    .sort((a, b) => a.sequence - b.sequence);

  const activeCount = todayDeliveries.filter(d => d.status !== 'delivered').length;
  const completedCount = todayDeliveries.filter(d => d.status === 'delivered').length;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Delivery</h1>
        <p className="text-gray-500">Gestión de entregas y rutas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200/60">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-truck text-blue-600 text-lg"></i>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{deliveries.length}</h3>
              <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200/60">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-shipping-fast text-indigo-600 text-lg"></i>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{activeCount}</h3>
              <p className="text-xs uppercase tracking-wide text-gray-500">En proceso hoy</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200/60">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-check-double text-green-600 text-lg"></i>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{completedCount}</h3>
              <p className="text-xs uppercase tracking-wide text-gray-500">Completados hoy</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200/60">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-calendar-plus text-amber-600 text-lg"></i>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{scheduledDeliveries.length}</h3>
              <p className="text-xs uppercase tracking-wide text-gray-500">Programados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-1.5 inline-flex gap-1 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
              tab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className={t.icon}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'today' && (
        <div className="space-y-3">
          {todayDeliveries.length === 0 ? (
            <EmptyState icon="fas fa-truck" text="No hay deliveries para hoy" />
          ) : (
            todayDeliveries.map(d => <DeliveryCard key={d.id} delivery={d} />)
          )}
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="space-y-3">
          {scheduledDeliveries.length === 0 ? (
            <EmptyState icon="fas fa-calendar" text="No hay deliveries programados" />
          ) : (
            scheduledDeliveries.map(d => <DeliveryCard key={d.id} delivery={d} showDate />)
          )}
        </div>
      )}

      {tab === 'route' && (
        <div className="space-y-0">
          {routeDeliveries.length === 0 ? (
            <EmptyState icon="fas fa-route" text="Todas las entregas de hoy fueron completadas" />
          ) : (
            routeDeliveries.map((d, idx) => (
              <div key={d.id} className="flex gap-4">
                {/* Sequence line */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {idx + 1}
                  </div>
                  {idx < routeDeliveries.length - 1 && (
                    <div className="w-0.5 flex-1 bg-indigo-200 my-1"></div>
                  )}
                </div>
                <div className="flex-1 mb-4">
                  <DeliveryCard delivery={d} compact />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function DeliveryCard({ delivery: d, showDate, compact }) {
  const ss = STATUS_STYLE[d.status] || STATUS_STYLE.pending_confirmation;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200/60 ${compact ? 'p-4' : 'p-5'} hover:shadow-md transition`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono font-bold text-indigo-600">{d.id}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ss.bg} ${ss.text}`}>{ss.label}</span>
            {showDate && <span className="text-[10px] text-gray-400">{new Date(d.date).toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })}</span>}
          </div>
          <p className="font-semibold text-gray-900 text-sm">{d.customer}</p>
          <p className="text-xs text-gray-500">{d.phone}</p>

          <div className="flex items-start gap-2 mt-2 text-sm text-gray-600">
            <i className="fas fa-map-marker-alt text-red-400 mt-0.5"></i>
            <div>
              <p>{d.address}</p>
              <p className="text-xs text-gray-400">Zona: {d.zone} — Delivery: {fmtGs(d.delivery_price)}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-1.5">{d.products.join(', ')}</p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-900 text-sm">{fmtGs(d.total)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{d.time}</p>

          {/* Map buttons */}
          <div className="flex gap-1.5 mt-3">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address + ', ' + d.zone + ', Paraguay')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition text-xs"
              title="Google Maps"
            >
              <i className="fas fa-map"></i>
            </a>
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(d.address + ', ' + d.zone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 bg-cyan-50 text-cyan-600 rounded-lg flex items-center justify-center hover:bg-cyan-100 transition text-xs"
              title="Waze"
            >
              <i className="fas fa-location-arrow"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="bg-white rounded-xl p-14 shadow-sm border border-gray-200/60 text-center">
      <i className={`${icon} text-gray-200 text-4xl mb-3`}></i>
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  );
}
