import { useState, useEffect } from 'react';
import { API_URL } from '../App';

const STATUS_STYLE = {
  scheduled: { label: 'Agendada', bg: 'bg-blue-100', text: 'text-blue-700' },
  completed: { label: 'Completada', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-700' },
};

const PLATFORM_ICON = {
  instagram: 'fab fa-instagram text-pink-500',
  whatsapp: 'fab fa-whatsapp text-green-500',
  facebook: 'fab fa-facebook-messenger text-blue-500',
};

function fmtDateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' });
}

function getDayName(iso) {
  return new Date(iso).toLocaleDateString('es-PY', { weekday: 'short' }).replace('.', '');
}

export default function CitasPage() {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API_URL}/api/appointments`).then(r => r.json()),
      fetch(`${API_URL}/api/appointments/stats`).then(r => r.json()),
    ])
      .then(([apptsRes, statsRes]) => {
        if (apptsRes.success) setAppointments(apptsRes.data);
        if (statsRes.success) setStats(statsRes.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayTs = new Date(today).getTime();

  // Build 7-day calendar pills
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayTs + i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    weekDays.push({ date: dateStr, day: d.getDate(), name: getDayName(dateStr), isToday: dateStr === today });
  }

  // Countdown to next appointment today
  const nextToday = appointments
    .filter(a => a.date === today && a.status === 'scheduled')
    .sort((a, b) => a.time.localeCompare(b.time))
    .find(a => {
      const [h, m] = a.time.split(':').map(Number);
      const aptTime = new Date();
      aptTime.setHours(h, m, 0, 0);
      return aptTime > new Date();
    });

  const countdownText = (() => {
    if (!nextToday) return null;
    const [h, m] = nextToday.time.split(':').map(Number);
    const aptTime = new Date();
    aptTime.setHours(h, m, 0, 0);
    const diffMin = Math.floor((aptTime - Date.now()) / 60000);
    if (diffMin <= 0) return null;
    if (diffMin < 60) return `en ${diffMin} min`;
    return `en ${Math.floor(diffMin / 60)}h ${diffMin % 60}min`;
  })();

  // Split into upcoming and past
  const upcoming = appointments.filter(a => a.date >= today && a.status !== 'completed');
  const past = appointments.filter(a => a.date < today || a.status === 'completed');

  // Filter by selected day pill
  const filteredUpcoming = selectedDay ? upcoming.filter(a => a.date === selectedDay) : upcoming;

  if (loading) {
    return (
      <div className="p-8 bg-gray-50">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}</div>
          <div className="h-16 bg-gray-200 rounded-xl"></div>
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}</div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Citas</h1>
        <p className="text-gray-500">Calendario de citas y reuniones</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon="fas fa-calendar-day" iconBg="bg-indigo-50" iconColor="text-indigo-600" value={stats.today} label="Hoy" />
          <StatCard icon="fas fa-calendar-plus" iconBg="bg-purple-50" iconColor="text-purple-600" value={stats.tomorrow} label="Mañana" />
          <StatCard icon="fas fa-calendar-week" iconBg="bg-blue-50" iconColor="text-blue-600" value={stats.this_week} label="Esta semana" />
          <StatCard icon="fas fa-calendar-check" iconBg="bg-green-50" iconColor="text-green-600" value={stats.total_scheduled} label="Total agendadas" />
        </div>
      )}

      {/* Countdown banner */}
      {countdownText && nextToday && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 mb-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-clock text-lg"></i>
            </div>
            <div>
              <p className="font-semibold">Próxima cita {countdownText}</p>
              <p className="text-sm text-white/80">{nextToday.client_name} — {nextToday.reason}</p>
            </div>
          </div>
          <span className="text-2xl font-bold">{nextToday.time}</span>
        </div>
      )}

      {/* Week calendar pills */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-4 mb-6">
        <div className="flex gap-2 justify-between">
          <button
            onClick={() => setSelectedDay(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!selectedDay ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Todas
          </button>
          {weekDays.map(wd => {
            const count = appointments.filter(a => a.date === wd.date && a.status === 'scheduled').length;
            const active = selectedDay === wd.date;
            return (
              <button
                key={wd.date}
                onClick={() => setSelectedDay(active ? null : wd.date)}
                className={`flex flex-col items-center px-3 py-2 rounded-xl transition min-w-[52px] ${
                  active ? 'bg-indigo-600 text-white shadow-sm' : wd.isToday ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <span className="text-[10px] uppercase font-medium">{wd.name}</span>
                <span className="text-lg font-bold">{wd.day}</span>
                {count > 0 && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${active ? 'bg-white' : 'bg-indigo-400'}`}></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          <i className="fas fa-arrow-right mr-2"></i>Próximas ({filteredUpcoming.length})
        </h3>
        {filteredUpcoming.length === 0 ? (
          <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-200/60 text-center">
            <i className="fas fa-calendar-check text-gray-200 text-4xl mb-3"></i>
            <p className="text-gray-400 text-sm">No hay citas próximas{selectedDay ? ' para este día' : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUpcoming.map(apt => <AppointmentCard key={apt.appointment_id} apt={apt} today={today} />)}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            <i className="fas fa-history mr-2"></i>Pasadas ({past.length})
          </h3>
          <div className="space-y-3 opacity-75">
            {past.map(apt => <AppointmentCard key={apt.appointment_id} apt={apt} today={today} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ apt, today }) {
  const ss = STATUS_STYLE[apt.status] || STATUS_STYLE.scheduled;
  const isToday = apt.date === today;

  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-200/60 border-l-4 ${
      isToday ? 'border-l-indigo-500' : apt.status === 'completed' ? 'border-l-green-400' : apt.status === 'cancelled' ? 'border-l-red-300' : 'border-l-gray-200'
    } hover:shadow-md transition`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center min-w-[56px]">
            <p className="text-xl font-bold text-gray-900">{apt.time}</p>
            <p className="text-[10px] text-gray-500 font-medium uppercase">
              {isToday ? 'Hoy' : fmtDateLabel(apt.date)}
            </p>
          </div>
          <div className="border-l border-gray-200 pl-4">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-gray-900">{apt.client_name}</p>
              <i className={`${PLATFORM_ICON[apt.platform] || ''} text-sm`}></i>
            </div>
            <p className="text-sm text-gray-500">{apt.reason}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400"><i className="fas fa-phone mr-1"></i>{apt.phone}</span>
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ss.bg} ${ss.text}`}>{ss.label}</span>
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, iconColor, value, label }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200/60">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center`}>
          <i className={`${icon} ${iconColor} text-lg`}></i>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
