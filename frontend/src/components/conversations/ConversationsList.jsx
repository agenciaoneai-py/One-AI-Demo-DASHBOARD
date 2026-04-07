import { useState, useMemo } from 'react';

const PLATFORM_CONFIG = {
  instagram: { name: 'Instagram', icon: 'fab fa-instagram', hexColor: '#E1306C', gradient: 'from-pink-400 to-pink-600' },
  whatsapp:  { name: 'WhatsApp',  icon: 'fab fa-whatsapp',  hexColor: '#25D366', gradient: 'from-green-400 to-green-600' },
  facebook:  { name: 'Facebook',  icon: 'fab fa-facebook-messenger', hexColor: '#1877F2', gradient: 'from-blue-400 to-blue-600' },
};

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatTimeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days}d`;
  return new Date(iso).toLocaleDateString('es-PY');
}

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'unread', label: 'No leídos' },
  { key: 'sales', label: 'Sales' },
];

export default function ConversationsList({ conversations, selectedId, onSelect, platform, isLoading }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const pCfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.instagram;

  const filtered = useMemo(() => {
    let list = conversations || [];
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => (c.contact?.name || '').toLowerCase().includes(q));
    }
    // Filter
    if (filter === 'unread') list = list.filter(c => c.unread_count > 0);
    if (filter === 'sales') list = list.filter(c => c.contact?.lead_temperature === 'hot');
    return list;
  }, [conversations, filter, search]);

  // Footer stats
  const activeCount = conversations.filter(c => c.ai_mode === 'automatic').length;
  const qualifiedCount = conversations.filter(c => c.status === 'calificado').length;
  const pausedCount = conversations.filter(c => c.ai_mode === 'manual').length;

  return (
    <aside className="w-full lg:w-80 bg-white border-r border-gray-200/60 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 space-y-3 border-b border-gray-100/80">
        {/* Platform header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight flex items-center gap-2 text-gray-900">
            <i className={pCfg.icon} style={{ color: pCfg.hexColor }} />
            {pCfg.name}
          </h2>
          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 font-medium">
            {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex p-0.5 bg-gray-100 rounded-lg">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex-1 text-xs font-medium py-2 sm:py-1.5 rounded-md transition-all duration-200 ${
                filter === f.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative group">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar contacto..."
            className="w-full bg-gray-50 border-0 rounded-lg py-2 pl-9 pr-8 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:shadow-sm transition-all duration-200 placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <i className="fas fa-times text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <i className="fas fa-comments text-4xl mb-3" />
            <p className="text-sm font-medium">No hay conversaciones</p>
            <p className="text-xs mt-1">Las conversaciones aparecerán aquí cuando los clientes escriban</p>
          </div>
        ) : (
          filtered.map(conv => {
            const isSelected = conv.id === selectedId;
            const contact = conv.contact || {};
            const name = contact.name || 'Sin nombre';
            const initials = getInitials(name);
            const unread = conv.unread_count || 0;
            const temp = contact.lead_temperature;
            const aiOff = conv.ai_mode === 'manual';
            const subtitle = platform === 'whatsapp' ? (contact.whatsapp_phone || contact.phone || '') :
                             platform === 'instagram' ? (contact.username ? `@${contact.username}` : `ID: ${(contact.instagram_id || '').toString().slice(-8)}`) :
                             (contact.username || `ID: ${(contact.subscriber_id || '').toString().slice(-6)}`);

            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`px-4 py-3 min-h-[64px] cursor-pointer transition-colors duration-150 border-b border-gray-100/50 ${
                  isSelected ? 'border-l-2 border-l-indigo-500 bg-indigo-50/40' : 'hover:bg-gray-50/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${pCfg.gradient} flex items-center justify-center text-sm font-semibold text-white`}>
                      {initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                      <i className={pCfg.icon} style={{ color: pCfg.hexColor, fontSize: '9px' }} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className={`text-sm truncate block ${unread > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                            {name}
                          </span>
                          {temp === 'hot' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-full text-xs font-bold">🔥</span>
                          )}
                          {temp === 'warm' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-xs font-bold">🟡</span>
                          )}
                          {aiOff && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full border border-red-200">
                              <div className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                              IA OFF
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs font-medium text-slate-400">{formatTimeAgo(conv.last_message_at)}</span>
                        {unread > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded-full">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
                    <p className={`text-sm truncate mt-1 ${unread > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                      {conv.last_message || '...'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2 sm:px-4 sm:py-3 border-t border-gray-100/80">
        <div className="flex items-center justify-around text-center">
          <div>
            <div className="text-sm font-semibold text-gray-700">{activeCount}</div>
            <div className="text-xs text-gray-400">Activos</div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <div className="text-sm font-semibold text-emerald-600">{qualifiedCount}</div>
            <div className="text-xs text-gray-400">Calificados</div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <div className={`text-sm font-semibold ${pausedCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>{pausedCount}</div>
            <div className="text-xs text-gray-400">En Pausa</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
