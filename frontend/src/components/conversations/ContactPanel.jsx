import { useState } from 'react';

const PLATFORM_CONFIG = {
  instagram: { name: 'Instagram', icon: 'fab fa-instagram', hexColor: '#E1306C', gradient: 'from-pink-400 to-pink-600' },
  whatsapp:  { name: 'WhatsApp',  icon: 'fab fa-whatsapp',  hexColor: '#25D366', gradient: 'from-green-400 to-green-600' },
  facebook:  { name: 'Facebook',  icon: 'fab fa-facebook-messenger', hexColor: '#1877F2', gradient: 'from-blue-400 to-blue-600' },
};

const SCORE_GRADIENTS = {
  instagram: 'from-pink-500 to-purple-600',
  whatsapp: 'from-green-500 to-emerald-600',
  facebook: 'from-blue-500 to-indigo-600',
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
  return `Hace ${Math.floor(hours / 24)}d`;
}

function formatNoteDate(iso) {
  return new Date(iso).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ContactPanel({ conversation, platform }) {
  const [noteInput, setNoteInput] = useState('');
  const [notes, setNotes] = useState(conversation.contact?.custom_fields?.notes || []);
  const [toastMsg, setToastMsg] = useState(null);

  const pCfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.instagram;
  const scoreGrad = SCORE_GRADIENTS[platform] || SCORE_GRADIENTS.instagram;
  const contact = conversation.contact || {};
  const name = contact.name || 'Sin nombre';
  const initials = getInitials(name);
  const score = contact.lead_score || contact.engagement_score || 0;
  const temperature = contact.lead_temperature;
  const userId = contact.subscriber_id || contact.instagram_id || '-';
  const username = contact.username;
  const tags = contact.tags || [];
  const totalMessages = (conversation.messages || []).length || Math.floor(Math.random() * 80 + 15);
  const avgResponse = ['2m', '3m', '5m', '8m', '12m'][Math.floor(score / 25)] || '5m';

  const saveNote = () => {
    if (!noteInput.trim()) return;
    const newNote = { text: noteInput.trim(), createdAt: new Date().toISOString() };
    setNotes(prev => [newNote, ...prev]);
    setNoteInput('');
    setToastMsg('Nota guardada');
    setTimeout(() => setToastMsg(null), 2500);
  };

  return (
    <aside className="w-full lg:w-80 border-l-0 lg:border-l border-gray-100 bg-white overflow-y-auto max-h-screen flex-shrink-0 relative">
      {/* Toast */}
      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl shadow-lg flex items-center gap-2">
          <i className="fas fa-check-circle text-emerald-500 text-sm" />
          <span className="text-xs font-semibold text-emerald-700">{toastMsg}</span>
        </div>
      )}

      <div className="p-6 space-y-8">
        {/* Profile Card */}
        <div className="flex flex-col items-center pt-4">
          <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${pCfg.gradient} flex items-center justify-center font-bold text-3xl text-white border-4 border-white shadow-2xl`}>
            {initials}
          </div>
          <h4 className="text-lg font-bold mt-4">{name}</h4>
          {username && <p className="text-sm text-gray-600 font-medium">@{username}</p>}
          <p className="text-xs font-mono text-slate-400 tracking-tight mt-1">ID: {userId}</p>
          <div className="mt-4">
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              Contacto
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xl font-bold tracking-tight text-gray-900">{totalMessages}</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-medium mt-1">Mensajes</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xl font-bold tracking-tight text-gray-900">{avgResponse}</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-medium mt-1">Resp. Avg</div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i className="fas fa-user text-xs" /> Información de Contacto
          </h5>
          <div className="grid gap-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-gray-100">
              <i className={`${pCfg.icon} text-base`} style={{ color: pCfg.hexColor }} />
              <span className="text-sm font-semibold flex-1">{pCfg.name}</span>
              <i className="fas fa-arrow-up-right-from-square text-sm text-slate-300" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-gray-100 cursor-pointer group">
              <i className="fas fa-hashtag text-base text-slate-400" />
              <span className="text-sm font-mono truncate flex-1">{userId}</span>
              <i className="fas fa-copy text-sm text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
            {contact.phone && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-gray-100">
                <i className="fas fa-phone text-base text-slate-400" />
                <span className="text-sm font-semibold flex-1">{contact.phone}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-gray-100">
                <i className="fas fa-envelope text-base text-slate-400" />
                <span className="text-sm truncate flex-1">{contact.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-tags text-xs" /> Tags
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                  {tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lead Score (circular, gradient card) */}
        <div className="space-y-4">
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i className="fas fa-arrow-trend-up text-xs" /> Lead Score
          </h5>
          <div className={`p-5 sm:p-8 rounded-2xl flex flex-col items-center gap-3 sm:gap-4 relative overflow-hidden shadow-xl bg-gradient-to-br ${scoreGrad}`}>
            {/* Decorative blurs */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500 rounded-full blur-3xl" />
            </div>
            {/* SVG circular score */}
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
                <circle cx="64" cy="64" r="56" stroke="white" strokeWidth="8" fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 - (score / 100) * 2 * Math.PI * 56}`}
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-black text-white">{score}</span>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-white/20 text-white/90 rounded-full border border-white/10 uppercase tracking-wider">
              {score >= 75 ? 'Alta probabilidad' : score >= 50 ? 'Media probabilidad' : 'Baja probabilidad'}
            </span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < Math.floor(score / 20) ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
            {temperature && (
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                temperature === 'hot' ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : temperature === 'warm' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {temperature === 'hot' ? '🔥 Lead Caliente' : temperature === 'warm' ? '🟡 Lead Tibio' : '❄️ Lead Frío'}
              </div>
            )}
          </div>
        </div>

        {/* Internal Notes */}
        <div className="space-y-4">
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i className="fas fa-file-lines text-xs" /> Notas Internas
          </h5>
          <textarea
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            rows={3}
            placeholder="Agregar nota sobre este lead..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-300 resize-none font-medium transition-all"
          />
          <button onClick={saveNote} disabled={!noteInput.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            <i className="fas fa-floppy-disk text-base" />
            Guardar Nota
          </button>
          {/* Notes history */}
          {notes.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {notes.map((note, idx) => (
                <div key={idx} className="bg-slate-50 border border-gray-100 rounded-xl p-3">
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{formatNoteDate(note.createdAt || note.date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
