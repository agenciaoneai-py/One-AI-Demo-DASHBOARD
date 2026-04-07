import { useState, useEffect, useCallback, useMemo } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Config ────────────────────────────────────────────────

const STATUS_DISPLAY = {
  scheduled: { label: 'Agendada',   className: 'bg-amber-50 text-amber-600'   },
  completed: { label: 'Completada', className: 'bg-emerald-50 text-emerald-600' },
  cancelled: { label: 'Cancelada',  className: 'bg-red-50 text-red-600'       },
};

const PLATFORM_CONFIG = {
  instagram: { icon: 'fab fa-instagram',         hexColor: '#E1306C' },
  whatsapp:  { icon: 'fab fa-whatsapp',           hexColor: '#25D366' },
  facebook:  { icon: 'fab fa-facebook-messenger', hexColor: '#1877F2' },
};

const PERIOD_FILTERS = [
  { key: 'today',      label: 'Hoy'             },
  { key: 'this-week',  label: 'Esta semana'      },
  { key: 'next-week',  label: 'Próxima semana'   },
  { key: 'this-month', label: 'Este mes'         },
  { key: 'all',        label: 'Todas'            },
];

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Date helpers ──────────────────────────────────────────

function formatTime(raw) {
  if (!raw) return '';
  const [h, m] = raw.split(':');
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return raw;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${suffix}`;
}

function formatShortDate(raw) {
  const d = new Date(raw + 'T12:00:00');
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' });
}

function formatFullDateTime(date, time) {
  const d = new Date(date + 'T12:00:00');
  if (isNaN(d.getTime())) return `${date} ${time}`;
  return `${d.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${formatTime(time)}`;
}

function toDateObj(dateStr) {
  return new Date(dateStr + 'T12:00:00');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(dateStr) {
  return dateStr === todayStr();
}

function isThisWeek(dateStr) {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  const d = toDateObj(dateStr);
  return d >= mon && d <= sun;
}

function isNextWeek(dateStr) {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + 7);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  const d = toDateObj(dateStr);
  return d >= mon && d <= sun;
}

function isThisMonth(dateStr) {
  const now = new Date();
  const d = toDateObj(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isPastDate(dateStr, time) {
  const dt = new Date(`${dateStr}T${time || '23:59'}:00`);
  return dt < new Date();
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

// ─── Countdown Component ───────────────────────────────────

function NextAppointmentCard({ appointment }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const target = new Date(`${appointment.date}T${appointment.time}:00`);
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft('Ahora'); setProgress(100); return; }
      const hours = Math.floor(diff / 1000 / 60 / 60);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      setTimeLeft(`${hours}h ${minutes}min`);
      const totalMs = 24 * 60 * 60 * 1000;
      setProgress(Math.min(100, Math.max(0, ((totalMs - diff) / totalMs) * 100)));
    }
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [appointment]);

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-xl border border-indigo-200/50 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-wider">Próxima reunión</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{appointment.client_name}</p>
          <p className="text-sm text-gray-500">{formatFullDateTime(appointment.date, appointment.time)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-indigo-600 tracking-tight">{timeLeft}</p>
          <p className="text-xs text-indigo-400">restantes</p>
        </div>
      </div>
      <div className="mt-3 h-1 rounded-full bg-indigo-200/50 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// ─── Appointment Card ──────────────────────────────────────

function AppointmentCard({ appointment, onView, onCancel, variant = 'upcoming' }) {
  const display = STATUS_DISPLAY[appointment.status] || { label: appointment.status, className: 'bg-gray-100 text-gray-600' };
  const platformCfg = PLATFORM_CONFIG[appointment.platform];
  const isPast = variant === 'past';
  const today = isToday(appointment.date);

  return (
    <div
      onClick={onView}
      className={`flex items-center gap-4 rounded-xl transition-all duration-200 cursor-pointer group ${
        isPast
          ? 'p-3 bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50'
          : 'p-4 bg-white border border-gray-200/60 hover:shadow-md'
      } ${today && !isPast ? 'border-l-2 border-l-indigo-500' : ''}`}
    >
      {/* Time column */}
      <div className="flex-shrink-0 text-center min-w-[60px]">
        <p className={isPast ? 'text-base text-gray-400' : 'text-lg font-bold text-gray-900'}>
          {formatTime(appointment.time)}
        </p>
        {today && !isPast ? (
          <span className="inline-block bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full text-[10px] font-medium">Hoy</span>
        ) : (
          <p className="text-xs text-gray-400">{formatShortDate(appointment.date)}</p>
        )}
      </div>

      {/* Divider */}
      <div className={`w-px flex-shrink-0 self-stretch ${isPast ? 'bg-gray-100' : 'bg-gray-200'}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isPast ? 'font-normal text-gray-500' : 'font-semibold text-gray-900'}`}>
          {appointment.client_name}
        </p>
        <p className={`text-xs truncate ${isPast ? 'text-gray-400' : 'text-gray-500'}`}>
          {appointment.client_company || 'Particular'}
        </p>
        {!isPast && appointment.reason && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{appointment.reason}</p>
        )}
      </div>

      {/* Status + platform */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isPast ? 'bg-gray-100 text-gray-400' : display.className
        }`}>
          {display.label}
        </span>
        {!isPast && platformCfg && (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ backgroundColor: `${platformCfg.hexColor}15` }}
          >
            <i className={`${platformCfg.icon} text-xs`} style={{ color: platformCfg.hexColor }} />
          </div>
        )}
      </div>

      {/* Cancel on hover */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {appointment.status === 'scheduled' && (
          <button
            onClick={e => { e.stopPropagation(); onCancel(); }}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Cancelar cita"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mini Calendar ─────────────────────────────────────────

function MiniCalendar({ appointments, selectedDate, onSelectDate }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const datesWithAppointments = useMemo(() =>
    new Set(appointments.filter(a => a.status !== 'cancelled').map(a => a.date)),
    [appointments]
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
    const days = [];

    // Leading days from prev month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, daysInPrev - i);
      days.push({ date: d.toISOString().slice(0, 10), dayNumber: daysInPrev - i, isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(viewYear, viewMonth, d);
      const dateStr = dt.toISOString().slice(0, 10);
      days.push({
        date: dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: isToday(dateStr),
        isSelected: dateStr === selectedDate,
        hasAppointment: datesWithAppointments.has(dateStr),
      });
    }
    // Trailing days
    const trailing = 42 - days.length;
    for (let d = 1; d <= trailing; d++) {
      const dt = new Date(viewYear, viewMonth + 1, d);
      days.push({ date: dt.toISOString().slice(0, 10), dayNumber: d, isCurrentMonth: false });
    }
    return days;
  }, [viewYear, viewMonth, datesWithAppointments, selectedDate]);

  return (
    <div className="rounded-xl border border-gray-200/60 p-3 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <i className="fas fa-chevron-left text-xs text-gray-400" />
        </button>
        <span className="text-sm font-semibold text-gray-900">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <i className="fas fa-chevron-right text-xs text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {['D','L','M','M','J','V','S'].map((d, i) => (
          <div key={i} className="text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {calendarDays.map((day, i) => (
          <button
            key={i}
            onClick={() => day.isCurrentMonth && onSelectDate(day.isSelected ? null : day.date)}
            className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs transition-all ${
              !day.isCurrentMonth ? 'text-gray-300 cursor-default' :
              day.isToday ? 'bg-indigo-600 text-white font-bold' :
              day.isSelected ? 'bg-indigo-100 text-indigo-700 font-semibold' :
              day.hasAppointment ? 'font-bold text-gray-900 underline underline-offset-2 decoration-indigo-400' :
              'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {day.dayNumber}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────

export default function CitasPage() {
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [periodFilter, setPeriodFilter]       = useState('all');
  const [platformFilter, setPlatformFilter]   = useState('all');
  const [statusFilter, setStatusFilter]       = useState('all');
  const [calendarDate, setCalendarDate]       = useState(null);  // selected from mini calendar
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [createDialogOpen, setCreateDialogOpen]       = useState(false);
  const [form, setForm] = useState({ client_name: '', phone: '', platform: 'whatsapp', client_company: '', date: '', time: '', reason: '' });
  const { toast, showToast } = useToast();

  // Fetch
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/appointments`)
      .then(r => r.json())
      .then(json => setAllAppointments(json.data || json.appointments || []))
      .catch(() => showToast('Error al cargar citas', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Derived stats
  const scheduledCount = allAppointments.filter(a => a.status === 'scheduled').length;
  const stats = {
    scheduled: scheduledCount,
    completed: allAppointments.filter(a => a.status === 'completed').length,
    cancelled: allAppointments.filter(a => a.status === 'cancelled').length,
  };

  // Next appointment in the next 24h
  const nextAppointment = useMemo(() => {
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;
    return allAppointments.find(a => {
      if (a.status !== 'scheduled') return false;
      const dt = new Date(`${a.date}T${a.time}:00`).getTime();
      return dt > now && dt <= in24h;
    }) || null;
  }, [allAppointments]);

  // Filter pipeline
  const filtered = useMemo(() => {
    return allAppointments.filter(a => {
      if (platformFilter !== 'all' && a.platform !== platformFilter) return false;
      if (statusFilter   !== 'all' && a.status   !== statusFilter)   return false;
      if (calendarDate   && a.date !== calendarDate)                  return false;
      if (!calendarDate) {
        if (periodFilter === 'today'      && !isToday(a.date))      return false;
        if (periodFilter === 'this-week'  && !isThisWeek(a.date))   return false;
        if (periodFilter === 'next-week'  && !isNextWeek(a.date))   return false;
        if (periodFilter === 'this-month' && !isThisMonth(a.date))  return false;
      }
      return true;
    });
  }, [allAppointments, periodFilter, platformFilter, statusFilter, calendarDate]);

  const upcomingAppointments = filtered.filter(a => !isPastDate(a.date, a.time));
  const pastAppointments     = filtered.filter(a => isPastDate(a.date, a.time)).reverse();

  // Cancel (local state only)
  function handleCancel(apt) {
    setAllAppointments(prev => prev.map(a =>
      a.appointment_id === apt.appointment_id ? { ...a, status: 'cancelled' } : a
    ));
    if (selectedAppointment?.appointment_id === apt.appointment_id) {
      setSelectedAppointment(prev => ({ ...prev, status: 'cancelled' }));
    }
    showToast('Cita cancelada');
  }

  // Create (fake — no persist)
  function handleCreateSubmit(e) {
    e.preventDefault();
    setCreateDialogOpen(false);
    setForm({ client_name: '', phone: '', platform: 'whatsapp', client_company: '', date: '', time: '', reason: '' });
    showToast('Cita agendada correctamente');
  }

  // Export CSV
  function handleExportCSV() {
    try {
      const headers = ['ID', 'Cliente', 'Teléfono', 'Fecha', 'Hora', 'Estado', 'Plataforma', 'Motivo'];
      const rows = allAppointments.map(a => [
        a.appointment_id, a.client_name, a.phone || '',
        a.date, a.time, STATUS_DISPLAY[a.status]?.label || a.status,
        a.platform, a.reason || '',
      ]);
      const csv  = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'citas.csv'; a.click();
      URL.revokeObjectURL(url);
      showToast('Exportación completada');
    } catch {
      showToast('Error al exportar', 'error');
    }
  }

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
          <h1 className="text-2xl font-semibold text-gray-900">Citas</h1>
          <p className="mt-1 text-sm text-gray-400">
            {scheduledCount} agendada{scheduledCount !== 1 ? 's' : ''} de {allAppointments.length} totales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={allAppointments.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50"
          >
            <i className="fas fa-download text-base" /> Exportar
          </button>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-200 text-sm font-medium"
          >
            <i className="fas fa-plus text-base" /> Nueva Cita
          </button>
        </div>
      </div>

      {/* ── Next appointment countdown ── */}
      {nextAppointment && <NextAppointmentCard appointment={nextAppointment} />}

      {/* ── 2-column layout ── */}
      <div className="flex gap-6">

        {/* ── Left: filters + list ── */}
        <div className="flex-1 min-w-0">

          {/* Period pills */}
          <div className="flex items-center gap-2 overflow-x-auto mb-4 pb-1">
            {PERIOD_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setPeriodFilter(f.key); setCalendarDate(null); }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm transition-all duration-200 flex-shrink-0 ${
                  periodFilter === f.key && !calendarDate
                    ? 'bg-gray-900 text-white font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
            {calendarDate && (
              <button
                onClick={() => setCalendarDate(null)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-sm bg-indigo-600 text-white font-medium flex-shrink-0 flex items-center gap-1.5"
              >
                <i className="fas fa-calendar-day text-xs" />
                {formatShortDate(calendarDate)}
                <i className="fas fa-xmark text-xs ml-1" />
              </button>
            )}
          </div>

          {/* Platform + status filters */}
          <div className="flex gap-3 mb-6">
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="flex-1 sm:flex-none sm:w-44 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="all">🌐 Todas las plataformas</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="instagram">📸 Instagram</option>
              <option value="facebook">📘 Facebook</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none sm:w-40 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="scheduled">Agendadas</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200/60 p-4 flex gap-4 animate-pulse">
                  <div className="w-14 h-10 bg-gray-100 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm flex flex-col items-center justify-center py-14 text-center">
              <i className="fas fa-calendar-xmark text-3xl text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Sin citas para este período</p>
              <p className="text-sm text-gray-400 mt-1">Cambiá el filtro o creá una nueva cita</p>
            </div>
          )}

          {/* Upcoming */}
          {!loading && upcomingAppointments.length > 0 && (
            <div className="space-y-3 mb-2">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                Próximas
              </h3>
              {upcomingAppointments.map(apt => (
                <AppointmentCard
                  key={apt.appointment_id}
                  appointment={apt}
                  variant="upcoming"
                  onView={() => setSelectedAppointment(apt)}
                  onCancel={() => handleCancel(apt)}
                />
              ))}
            </div>
          )}

          {/* Separator */}
          {!loading && upcomingAppointments.length > 0 && pastAppointments.length > 0 && (
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">Pasadas</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

          {/* Past */}
          {!loading && pastAppointments.length > 0 && (
            <div className="space-y-2">
              {!upcomingAppointments.length && (
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                  Pasadas
                </h3>
              )}
              {pastAppointments.map(apt => (
                <AppointmentCard
                  key={apt.appointment_id}
                  appointment={apt}
                  variant="past"
                  onView={() => setSelectedAppointment(apt)}
                  onCancel={() => handleCancel(apt)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: mini calendar + stats (desktop only) ── */}
        <div className="hidden lg:block flex-shrink-0 w-[280px]">
          <div className="sticky top-6 space-y-4">

            <MiniCalendar
              appointments={allAppointments}
              selectedDate={calendarDate}
              onSelectDate={setCalendarDate}
            />

            {/* Quick stats */}
            <div className="bg-white rounded-xl border border-gray-200/60 p-4 shadow-sm">
              <h4 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">Resumen</h4>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm text-gray-600">Agendadas</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{stats.scheduled}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-gray-600">Completadas</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{stats.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm text-gray-600">Canceladas</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{stats.cancelled}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ══ DETAIL MODAL ══════════════════════════════════════ */}
      {selectedAppointment && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedAppointment(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Detalle de Cita</h2>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fas fa-xmark text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Cliente</p>
                <p className="text-sm font-semibold text-gray-900">{selectedAppointment.client_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Teléfono</p>
                <p className="text-sm text-gray-700">{selectedAppointment.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Plataforma</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <i className={`${PLATFORM_CONFIG[selectedAppointment.platform]?.icon || 'fas fa-globe'} text-sm`}
                     style={{ color: PLATFORM_CONFIG[selectedAppointment.platform]?.hexColor || '#6b7280' }} />
                  <span className="text-sm text-gray-700 capitalize">{selectedAppointment.platform}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Estado</p>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${
                  STATUS_DISPLAY[selectedAppointment.status]?.className || 'bg-gray-100 text-gray-600'
                }`}>
                  {STATUS_DISPLAY[selectedAppointment.status]?.label || selectedAppointment.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Fecha</p>
                <p className="text-sm text-gray-700">{formatShortDate(selectedAppointment.date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Hora</p>
                <p className="text-sm text-gray-700">{formatTime(selectedAppointment.time)}</p>
              </div>
              {selectedAppointment.reason && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Motivo</p>
                  <p className="text-sm text-gray-700">{selectedAppointment.reason}</p>
                </div>
              )}
            </div>

            {selectedAppointment.status === 'scheduled' && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                <button
                  onClick={() => { handleCancel(selectedAppointment); setSelectedAppointment(null); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-all"
                >
                  <i className="fas fa-xmark text-base" /> Cancelar Cita
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ CREATE DIALOG ══════════════════════════════════════ */}
      {createDialogOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => { setCreateDialogOpen(false); setForm({ client_name: '', phone: '', platform: 'whatsapp', client_company: '', date: '', time: '', reason: '' }); }}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Nueva Cita</h2>
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fas fa-xmark text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                  <input
                    required
                    type="text"
                    placeholder="María González"
                    value={form.client_name}
                    onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="+595 981 000 000"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Plataforma</label>
                  <select
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Empresa</label>
                  <input
                    type="text"
                    placeholder="Particular"
                    value={form.client_company}
                    onChange={e => setForm(f => ({ ...f, client_company: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hora *</label>
                  <input
                    required
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Motivo</label>
                <textarea
                  rows={3}
                  placeholder="Ej: Consulta sobre productos nuevos"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all"
              >
                <i className="fas fa-calendar-check text-base" /> Agendar Cita
              </button>
            </form>
          </div>
        </>
      )}

    </div>
  );
}
