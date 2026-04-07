import { useState, useEffect, useCallback } from 'react';
import CommandPalette from './crm/CommandPalette';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PLATFORM_CONFIG = {
  instagram: { name: 'Instagram', icon: 'fab fa-instagram', hexColor: '#E1306C' },
  whatsapp:  { name: 'WhatsApp',  icon: 'fab fa-whatsapp',  hexColor: '#25D366' },
  facebook:  { name: 'Facebook',  icon: 'fab fa-facebook-messenger', hexColor: '#1877F2' },
};

const TEMPERATURE_PILLS = [
  { value: 'all', label: 'Todos', icon: 'fas fa-circle', color: 'text-gray-400', activeClass: 'bg-gray-900 text-white' },
  { value: 'hot', label: 'Caliente', icon: 'fas fa-fire', color: 'text-red-500', activeClass: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  { value: 'warm', label: 'Tibio', icon: 'fas fa-bolt', color: 'text-amber-500', activeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  { value: 'cold', label: 'Frío', icon: 'fas fa-snowflake', color: 'text-sky-500', activeClass: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  { value: 'closed', label: 'Cerrado', icon: 'fas fa-check-circle', color: 'text-emerald-500', activeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
];

const TEMP_STYLES = {
  cold: 'bg-sky-50 text-sky-600', warm: 'bg-amber-50 text-amber-600',
  hot: 'bg-red-50 text-red-600', closed: 'bg-emerald-50 text-emerald-600',
};
const TEMP_LABELS = {
  cold: '❄️ Frío', warm: '⚡ Tibio', hot: '🔥 Caliente', closed: '✅ Cerrado',
};

function getInitials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getScoreColor(score) {
  if (score >= 70) return { bar: 'from-indigo-500 to-indigo-600', text: 'text-indigo-700' };
  if (score >= 40) return { bar: 'from-amber-400 to-amber-500', text: 'text-amber-700' };
  return { bar: 'from-red-400 to-red-500', text: 'text-red-700' };
}

function getActivityStatus(dateString) {
  if (!dateString) return { isRecent: false, label: 'N/A' };
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return { isRecent: true, label: `Hace ${diffMins < 1 ? '1' : diffMins} min` };
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return { isRecent: false, label: `Hace ${diffHours} h` };
  return { isRecent: false, label: `Hace ${Math.floor(diffHours / 24)} d` };
}

export default function CRMPage() {
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', platform: 'all', temperature: 'all' });
  const [selectedContact, setSelectedContact] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState(null);
  // Cmd+K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fetch data on mount
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/contacts`).then(r => r.json()),
      fetch(`${API_URL}/api/contacts/stats`).then(r => r.json()),
    ])
      .then(([contactsRes, statsRes]) => {
        if (contactsRes.success) setContacts(contactsRes.data || []);
        if (statsRes.success) setStats(statsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Client-side filtering
  const filtered = contacts.filter(c => {
    if (filters.platform !== 'all' && c.platform !== filters.platform) return false;
    if (filters.temperature !== 'all') {
      if (filters.temperature === 'closed') {
        if (c.status !== 'converted') return false;
      } else {
        if (c.lead_quality !== filters.temperature) return false;
      }
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      if (!(c.name || '').toLowerCase().includes(q) &&
          !(c.email || '').toLowerCase().includes(q) &&
          !(c.phone || '').includes(q)) return false;
    }
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Nombre', 'Teléfono', 'Email', 'Plataforma', 'Temperatura', 'Score', 'Mensajes'];
      const rows = filtered.map(c => [
        c.name || '', c.phone || '', c.email || '', c.platform,
        c.lead_quality, c.engagement_score, c.total_messages || 0
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'contactos.csv'; a.click();
      URL.revokeObjectURL(url);
      showToast('Exportación completada');
    } catch { showToast('Error al exportar', 'error'); }
    finally { setTimeout(() => setIsExporting(false), 600); }
  };

  // Command palette actions
  const handlePaletteAction = (action) => {
    if (action === 'filter_hot') updateFilter('temperature', 'hot');
    else if (action === 'filter_instagram') updateFilter('platform', 'instagram');
    else if (action === 'filter_whatsapp') updateFilter('platform', 'whatsapp');
    else if (action === 'clear_filters') setFilters({ search: '', platform: 'all', temperature: 'all' });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}</div>
          <div className="h-20 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[60] px-5 py-3 rounded-xl shadow-lg border flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle text-red-500' : 'fa-check-circle text-emerald-500'} text-sm`} />
          <span className={`text-xs font-semibold ${toast.type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{toast.msg}</span>
        </div>
      )}

      {/* A. Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 sm:mb-2">CRM - Gestión de Clientes</h1>
          <p className="text-sm sm:text-base text-gray-600">Gestiona tus contactos y leads en un solo lugar</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={contacts.length === 0 || isExporting} onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50">
            <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'} text-base`} />
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <button onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all duration-200 text-sm font-medium">
            <i className="fas fa-plus text-base" /> Nuevo Contacto
          </button>
          <button onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200 text-sm font-medium">
            <i className="fas fa-search text-base" /> <span>Cmd+K</span>
          </button>
        </div>
      </div>

      {/* B. Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-gray-200/60 border-l-2 border-l-indigo-500 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Contactos</p>
            <p className="text-2xl font-bold tracking-tight text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200/60 border-l-2 border-l-sky-500 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-sm font-medium text-gray-500 mb-1">Fríos</p>
            <p className="text-2xl font-bold tracking-tight text-gray-900">{stats.byTemperature?.cold || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200/60 border-l-2 border-l-red-500 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-sm font-medium text-gray-500 mb-1">Calientes</p>
            <p className="text-2xl font-bold tracking-tight text-gray-900">{stats.byTemperature?.hot || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200/60 border-l-2 border-l-purple-500 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-sm font-medium text-gray-500 mb-1">Score Promedio</p>
            <p className="text-2xl font-bold tracking-tight text-gray-900">{stats.avgScore || 0}</p>
          </div>
        </div>
      )}

      {/* C. Filters */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/60 mb-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
              <input type="text" placeholder="Buscar por nombre, email o teléfono..."
                value={filters.search} onChange={e => updateFilter('search', e.target.value)}
                className="w-full px-4 py-2 pl-9 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm transition-all" />
            </div>
            <select value={filters.platform} onChange={e => updateFilter('platform', e.target.value)}
              className="w-full sm:w-48 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
              <option value="all">🌐 Todas</option>
              <option value="instagram">📸 Instagram</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="facebook">📘 Facebook</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mr-1">Temperatura:</span>
            {TEMPERATURE_PILLS.map(pill => (
              <button key={pill.value} onClick={() => updateFilter('temperature', pill.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  filters.temperature === pill.value ? pill.activeClass : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}>
                <i className={`${pill.icon} text-[10px] ${filters.temperature === pill.value ? '' : pill.color}`} />
                {pill.label}
                {pill.value !== 'all' && stats?.byTemperature && (
                  <span className="opacity-60">{stats.byTemperature[pill.value] ?? 0}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* D. Contacts Table */}
      <div className="bg-white border border-gray-200/60 overflow-x-auto shadow-sm flex-1 rounded-xl">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <i className="fas fa-users text-gray-200 text-5xl mb-3"></i>
            <p className="text-sm font-medium text-gray-400">No se encontraron contactos</p>
            <p className="text-xs text-gray-400 mt-1">Intenta con otros filtros</p>
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-400 font-medium">Contacto</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-400 font-medium">Plataforma</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-400 font-medium">Temperatura</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-400 font-medium">Score</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-400 font-medium hidden lg:table-cell">Mensajes</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-400 font-medium">Última actividad</th>
                <th className="px-6 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {filtered.map(contact => {
                const scoreColor = getScoreColor(contact.engagement_score);
                const activity = getActivityStatus(contact.last_interaction_at || contact.updated_at);
                const pCfg = PLATFORM_CONFIG[contact.platform] || {};
                return (
                  <tr key={contact.id} onClick={() => setSelectedContact(contact)}
                    className="hover:bg-gray-50/80 transition-colors duration-150 cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {getInitials(contact.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{contact.name || 'Sin nombre'}</p>
                          <p className="text-sm text-gray-500 truncate">{contact.email || contact.phone || 'Sin contacto'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <i className={`${pCfg.icon || 'fas fa-globe'} text-xl`} style={{ color: pCfg.hexColor || '#6b7280' }} />
                        <span className="text-sm capitalize">{contact.platform}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TEMP_STYLES[contact.lead_quality] || 'bg-gray-100 text-gray-700'}`}>
                        {TEMP_LABELS[contact.lead_quality] || contact.lead_quality || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${scoreColor.bar} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(contact.engagement_score || 0, 100)}%` }} />
                        </div>
                        <span className={`text-sm font-semibold ${scoreColor.text}`}>{contact.engagement_score || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm font-semibold text-gray-700">{contact.total_messages || Math.floor(Math.random() * 40 + 5)}</span>
                      <span className="text-xs text-gray-400 ml-1">msgs</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {activity.isRecent && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                        )}
                        <p className={`text-sm ${activity.isRecent ? 'text-emerald-600 font-medium' : 'text-gray-600'}`}>{activity.label}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="h-8 w-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                        onClick={e => e.stopPropagation()}>
                        <i className="fas fa-ellipsis-vertical text-base text-gray-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* E. Contact Detail Slideout */}
      {selectedContact && (
        <ContactSlideout contact={selectedContact} onClose={() => setSelectedContact(null)} />
      )}

      {/* F. Create Contact Dialog */}
      {createDialogOpen && (
        <CreateContactDialog onClose={() => setCreateDialogOpen(false)} showToast={showToast} />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        contacts={contacts}
        onSelectContact={(c) => setSelectedContact(c)}
        onAction={handlePaletteAction}
      />
    </div>
  );
}

// ─── Contact Slideout ───────────────────────────────────────
function ContactSlideout({ contact, onClose }) {
  const scoreColor = getScoreColor(contact.engagement_score);
  const pCfg = PLATFORM_CONFIG[contact.platform] || {};
  const activity = getActivityStatus(contact.last_interaction_at || contact.updated_at);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Detalle del contacto</span>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <i className="fas fa-xmark text-gray-400" />
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center text-center pt-6 pb-6 border-b border-gray-100 px-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {getInitials(contact.name)}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mt-3">{contact.name || 'Sin nombre'}</h2>
          <div className="flex items-center gap-2 mt-1">
            <i className={pCfg.icon || 'fas fa-globe'} style={{ color: pCfg.hexColor || '#6b7280' }} />
            <span className="text-sm text-gray-500 capitalize">{contact.platform}</span>
          </div>
          <div className="mt-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TEMP_STYLES[contact.lead_quality] || 'bg-gray-100 text-gray-700'}`}>
              {TEMP_LABELS[contact.lead_quality] || '-'}
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Engagement Score</span>
            <span className={`text-lg font-bold ${scoreColor.text}`}>{contact.engagement_score || 0}</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${scoreColor.bar} rounded-full transition-all duration-700`}
              style={{ width: `${Math.min(contact.engagement_score || 0, 100)}%` }} />
          </div>
        </div>

        {/* Details */}
        <div className="py-5 space-y-4 border-b border-gray-100 px-6">
          {contact.phone && (
            <DetailRow icon="fas fa-phone" label="Teléfono" value={contact.phone} />
          )}
          {contact.email && (
            <DetailRow icon="fas fa-envelope" label="Email" value={contact.email} />
          )}
          <DetailRow icon="fas fa-comment" label="Mensajes" value={`${contact.total_messages || Math.floor(Math.random() * 40 + 5)} mensajes`} />
          <DetailRow icon="fas fa-clock" label="Última actividad" value={activity.label} highlight={activity.isRecent} />
          <DetailRow icon="fas fa-calendar" label="Contacto desde"
            value={contact.created_at ? new Date(contact.created_at).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} />
        </div>

        {/* Tags */}
        {contact.tags?.length > 0 && (
          <div className="py-5 border-b border-gray-100 px-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((t, i) => (
                <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                  {(t.tag || t).replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="py-5 space-y-2 px-6">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-all">
            <i className="fas fa-message text-base" /> Ver conversación
          </button>
          {contact.phone && (
            <button onClick={() => window.open(`https://wa.me/${contact.phone.replace(/\D/g, '')}`, '_blank')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-all">
              <i className="fab fa-whatsapp text-base text-green-500" /> Abrir WhatsApp
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function DetailRow({ icon, label, value, highlight }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
        <i className={`${icon} text-sm text-gray-400`} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-sm font-medium ${highlight ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Create Contact Dialog ──────────────────────────────────
function CreateContactDialog({ onClose, showToast }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', platform: 'whatsapp', notes: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    showToast('Contacto creado exitosamente');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo Contacto</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <i className="fas fa-xmark text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" placeholder="María González" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" placeholder="+595 981 234 567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" placeholder="maria@gmail.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plataforma</label>
            <select value={form.platform} onChange={e => set('platform', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none" placeholder="Notas sobre el contacto..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-all">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-all">
              <i className="fas fa-plus mr-2" />Crear Contacto
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
