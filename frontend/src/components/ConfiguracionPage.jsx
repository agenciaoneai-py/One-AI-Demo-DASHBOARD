import { useState } from 'react';
import { useAppContext } from '../App';

const TABS = [
  { key: 'perfil', label: 'Perfil', icon: 'fas fa-user' },
  { key: 'seguridad', label: 'Seguridad', icon: 'fas fa-shield-alt' },
  { key: 'agente', label: 'Mi Agente', icon: 'fas fa-robot' },
  { key: 'negocio', label: 'Mi Negocio', icon: 'fas fa-store' },
  { key: 'horarios', label: 'Horarios', icon: 'fas fa-clock' },
];

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const INPUT = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition outline-none';

export default function ConfiguracionPage() {
  const { config } = useAppContext();
  const [tab, setTab] = useState('perfil');
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 bg-green-50 border border-green-200 rounded-xl shadow-lg flex items-center gap-2">
          <i className="fas fa-check-circle text-green-500"></i>
          <span className="text-sm font-medium text-green-800">{toast}</span>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Configuración</h1>
        <p className="text-gray-500">Ajustes del sistema y preferencias</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-all duration-200 whitespace-nowrap ${
                  tab === t.key ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <i className={`${t.icon} text-sm ${tab === t.key ? 'text-indigo-500' : 'text-gray-400'}`}></i>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {tab === 'perfil' && <TabPerfil config={config} onSave={() => showToast('Perfil guardado')} />}
          {tab === 'seguridad' && <TabSeguridad onSave={() => showToast('Contraseña actualizada')} />}
          {tab === 'agente' && <TabAgente config={config} onSave={() => showToast('Configuración del agente guardada')} />}
          {tab === 'negocio' && <TabNegocio config={config} onSave={() => showToast('Datos del negocio guardados')} />}
          {tab === 'horarios' && <TabHorarios onSave={() => showToast('Horarios guardados')} />}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Perfil ────────────────────────────────────────────
function TabPerfil({ config, onSave }) {
  const [name, setName] = useState(config?.ownerName || 'Demo Owner');
  const [email, setEmail] = useState('demo@oneai.com');
  const [bio, setBio] = useState('Administrador del dashboard demo de ONE AI.');

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
      <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
        <i className="fas fa-user text-indigo-500"></i>Perfil personal
      </h3>
      <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{name}</p>
          <p className="text-sm text-gray-500">{email}</p>
          <button className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition">
            <i className="fas fa-camera mr-1"></i>Cambiar avatar
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className={INPUT} />
        </div>
        <SaveBtn onClick={onSave} />
      </div>
    </div>
  );
}

// ─── Tab: Seguridad ─────────────────────────────────────────
function TabSeguridad({ onSave }) {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');

  const match = newPwd && confirm && newPwd === confirm;
  const strong = newPwd.length >= 8;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
      <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
        <i className="fas fa-shield-alt text-indigo-500"></i>Cambiar contraseña
      </h3>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className={INPUT} placeholder="••••••••" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className={INPUT} placeholder="Mínimo 8 caracteres" />
          {newPwd && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`h-1 flex-1 rounded-full ${strong ? 'bg-green-400' : 'bg-amber-400'}`}></div>
              <span className={`text-xs font-medium ${strong ? 'text-green-600' : 'text-amber-600'}`}>
                {strong ? 'Segura' : 'Débil'}
              </span>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={INPUT} placeholder="Repetir contraseña" />
          {confirm && !match && <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>}
          {match && <p className="text-xs text-green-500 mt-1"><i className="fas fa-check mr-1"></i>Coinciden</p>}
        </div>
        <SaveBtn onClick={onSave} disabled={!current || !match || !strong} label="Actualizar contraseña" />
      </div>
    </div>
  );
}

// ─── Tab: Mi Agente ─────────────────────────────────────────
function TabAgente({ config, onSave }) {
  const [enabled, setEnabled] = useState(true);
  const [instructions, setInstructions] = useState('Responder todas las consultas de forma amigable. Priorizar leads calificados. Escalar a humano si el cliente muestra frustración.');

  return (
    <div className="space-y-6">
      {/* Kill switch */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i className="fas fa-robot text-indigo-500"></i>Estado del agente
        </h3>
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200/60 bg-gray-50/50">
          <div>
            <p className="font-semibold text-gray-900">{config?.ownerName || 'Agente IA'}</p>
            <p className="text-sm text-gray-500">Kill switch — {enabled ? 'Agente respondiendo' : 'Agente pausado'}</p>
          </div>
          <button onClick={() => setEnabled(!enabled)}
            className={`relative w-14 h-7 rounded-full transition-all duration-200 ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-200 ${enabled ? 'left-7' : 'left-0.5'}`}></div>
          </button>
        </div>
        {!enabled && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <i className="fas fa-exclamation-triangle text-red-500"></i>
            <p className="text-sm text-red-700">El agente IA está pausado. No responderá mensajes automáticamente.</p>
          </div>
        )}
      </div>

      {/* Agent config */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i className="fas fa-sliders-h text-purple-500"></i>Configuración
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del agente</label>
            <input type="text" value={config?.ownerName || ''} readOnly className={`${INPUT} bg-gray-50 text-gray-500 cursor-not-allowed`} />
            <p className="text-xs text-gray-400 mt-1">Cambiar desde Setup Demo</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones del operador</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={4} className={INPUT}
              placeholder="Instrucciones adicionales para el agente..." />
            <p className="text-xs text-gray-400 mt-1">Estas instrucciones se agregan al system prompt</p>
          </div>
          <SaveBtn onClick={onSave} />
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Mi Negocio ────────────────────────────────────────
function TabNegocio({ config, onSave }) {
  const [name, setName] = useState(config?.businessName || '');
  const [desc, setDesc] = useState('Dashboard demo para demostración de ONE AI a clientes potenciales.');

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
      <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
        <i className="fas fa-store text-indigo-500"></i>Datos del negocio
      </h3>
      <div className="space-y-4">
        {/* Logo placeholder */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {config?.logoUrl ? (
                <img src={config.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-image text-gray-300 text-2xl"></i>
              )}
            </div>
            <div>
              <button type="button" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                <i className="fas fa-upload mr-2"></i>Subir logo
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG. Máximo 2MB</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className={INPUT} />
        </div>

        {/* Integrations */}
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Integraciones activas</h4>
          <div className="space-y-2">
            {[
              { name: 'OpenAI (GPT-4o)', icon: 'fas fa-brain', active: true },
              { name: 'Supabase', icon: 'fas fa-database', active: true },
              { name: 'Instagram', icon: 'fab fa-instagram', color: 'text-[#E1306C]', active: !!config?.features?.multiChannel },
              { name: 'WhatsApp', icon: 'fab fa-whatsapp', color: 'text-[#25D366]', active: !!config?.features?.multiChannel },
              { name: 'Facebook', icon: 'fab fa-facebook-messenger', color: 'text-[#1877F2]', active: !!config?.features?.multiChannel },
            ].map(i => (
              <div key={i.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <i className={`${i.icon} ${i.color || 'text-gray-500'}`}></i>
                  <span className="text-sm text-gray-700">{i.name}</span>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${i.active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
            ))}
          </div>
        </div>
        <SaveBtn onClick={onSave} />
      </div>
    </div>
  );
}

// ─── Tab: Horarios ──────────────────────────────────────────
function TabHorarios({ onSave }) {
  const [schedule, setSchedule] = useState(
    DAYS.map((d, i) => ({ day: d, active: i < 6, open: '09:00', close: '18:00' }))
  );
  const [closures, setClosures] = useState([
    { date: '2026-04-10', reason: 'Jueves Santo' },
  ]);

  const toggle = (idx) => setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, active: !s.active } : s));
  const updateTime = (idx, field, val) => setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));

  return (
    <div className="space-y-6">
      {/* Weekly schedule */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i className="fas fa-clock text-indigo-500"></i>Horarios de atención
        </h3>
        <div className="space-y-2">
          {schedule.map((s, idx) => (
            <div key={s.day} className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${s.active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
              <button onClick={() => toggle(idx)} className={`w-10 h-5 rounded-full transition-all duration-200 relative flex-shrink-0 ${s.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${s.active ? 'left-5' : 'left-0.5'}`}></div>
              </button>
              <span className="text-sm font-medium text-gray-900 w-24">{s.day}</span>
              {s.active ? (
                <div className="flex items-center gap-2">
                  <input type="time" value={s.open} onChange={e => updateTime(idx, 'open', e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <span className="text-gray-400 text-sm">a</span>
                  <input type="time" value={s.close} onChange={e => updateTime(idx, 'close', e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Cerrado</span>
              )}
            </div>
          ))}
        </div>
        <SaveBtn onClick={onSave} />
      </div>

      {/* Temporary closures */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <i className="fas fa-calendar-times text-red-400"></i>Cierres temporales
          </h3>
          <button onClick={() => setClosures(prev => [...prev, { date: '', reason: '' }])}
            className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1.5">
            <i className="fas fa-plus text-xs"></i>Agregar
          </button>
        </div>
        <div className="space-y-2">
          {closures.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <input type="date" value={c.date} onChange={e => setClosures(prev => prev.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              <input type="text" value={c.reason} onChange={e => setClosures(prev => prev.map((x, j) => j === i ? { ...x, reason: e.target.value } : x))}
                placeholder="Motivo" className={`${INPUT} flex-1`} />
              <button onClick={() => setClosures(prev => prev.filter((_, j) => j !== i))}
                className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex items-center justify-center">
                <i className="fas fa-trash-alt text-sm"></i>
              </button>
            </div>
          ))}
          {closures.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay cierres programados</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Shared ─────────────────────────────────────────────────
function SaveBtn({ onClick, disabled, label = 'Guardar cambios' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
      <i className="fas fa-check"></i>{label}
    </button>
  );
}
