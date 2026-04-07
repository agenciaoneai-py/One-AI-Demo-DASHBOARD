import { useState, useEffect, useRef, useMemo } from 'react';

const PLATFORM_CONFIG = {
  instagram: { icon: 'fab fa-instagram', hexColor: '#E1306C' },
  whatsapp:  { icon: 'fab fa-whatsapp',  hexColor: '#25D366' },
  facebook:  { icon: 'fab fa-facebook-messenger', hexColor: '#1877F2' },
};

function getInitials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const QUICK_ACTIONS = [
  { id: 'hot', label: 'Ver solo leads HOT', icon: 'fas fa-fire', iconColor: 'text-rose-500', action: 'filter_hot' },
  { id: 'ig', label: 'Solo Instagram', icon: 'fab fa-instagram', iconColor: 'text-pink-500', action: 'filter_instagram' },
  { id: 'wa', label: 'Solo WhatsApp', icon: 'fab fa-whatsapp', iconColor: 'text-green-500', action: 'filter_whatsapp' },
  { id: 'all', label: 'Mostrar todos', icon: 'fas fa-globe', iconColor: 'text-gray-500', action: 'clear_filters' },
];

export default function CommandPalette({ isOpen, onClose, contacts, onSelectContact, onAction }) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard: ESC close, arrow keys navigate, Enter select
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => i + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (query.trim()) {
          if (results.length > 0) {
            const idx = selectedIdx % results.length;
            onSelectContact(results[idx]);
            onClose();
          }
        } else {
          const idx = selectedIdx % QUICK_ACTIONS.length;
          onAction(QUICK_ACTIONS[idx].action);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, query, selectedIdx]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return (contacts || []).filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    ).slice(0, 8);
  }, [contacts, query]);

  const recentContacts = useMemo(() => (contacts || []).slice(0, 5), [contacts]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 px-4">
        <div className="rounded-xl border border-gray-200/60 bg-white shadow-2xl overflow-hidden">
          {/* Search header */}
          <div className="flex items-center border-b border-gray-100 px-4">
            <i className="fas fa-search mr-2 text-xl text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
              placeholder="Buscar contacto, filtrar, acciones..."
              className="flex h-14 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 font-medium"
            />
            <button onClick={onClose} className="ml-auto p-1 hover:bg-gray-100 rounded-lg">
              <i className="fas fa-xmark text-xl text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto p-2">
            {query.trim() ? (
              /* Search results */
              results.length > 0 ? (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Resultados</div>
                  {results.map((c, idx) => {
                    const pCfg = PLATFORM_CONFIG[c.platform] || {};
                    return (
                      <button key={c.id} onClick={() => { onSelectContact(c); onClose(); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                          idx === selectedIdx % results.length ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        }`}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {getInitials(c.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.name || 'Sin nombre'}</p>
                          <p className="text-xs text-gray-500 truncate">{c.email || c.phone || c.platform}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-semibold text-gray-500">{c.engagement_score}</span>
                          <i className={pCfg.icon || 'fas fa-globe'} style={{ color: pCfg.hexColor || '#6b7280', fontSize: '14px' }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <i className="fas fa-search text-2xl mb-2" />
                  <p className="text-sm">Sin resultados para "{query}"</p>
                </div>
              )
            ) : (
              /* Quick actions + recent contacts */
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones rápidas</div>
                {QUICK_ACTIONS.map((action, idx) => (
                  <button key={action.id} onClick={() => { onAction(action.action); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                      idx === selectedIdx % QUICK_ACTIONS.length ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}>
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <i className={`${action.icon} ${action.iconColor}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{action.label}</span>
                  </button>
                ))}

                {recentContacts.length > 0 && (
                  <>
                    <div className="px-3 py-2 mt-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Contactos recientes</div>
                    {recentContacts.map(c => {
                      const pCfg = PLATFORM_CONFIG[c.platform] || {};
                      return (
                        <button key={c.id} onClick={() => { onSelectContact(c); onClose(); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getInitials(c.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                          </div>
                          <span className="text-xs font-semibold text-gray-400">{c.engagement_score}</span>
                          <i className={pCfg.icon || 'fas fa-globe'} style={{ color: pCfg.hexColor || '#6b7280', fontSize: '12px' }} />
                        </button>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Presiona <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono font-medium">ESC</kbd> para cerrar</span>
              <span><kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono font-medium">↑↓</kbd> navegar</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
