import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../App';

const PLATFORM_ICON = {
  instagram: 'fab fa-instagram text-pink-500',
  whatsapp: 'fab fa-whatsapp text-green-500',
  facebook: 'fab fa-facebook-messenger text-blue-500',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resuming, setResuming] = useState(null);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/alerts`)
      .then(r => r.json())
      .then(data => { if (data.success) setAlerts(data.data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  // Auto-refresh display every 15s
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleResume = async (alertId) => {
    setResuming(alertId);
    try {
      const res = await fetch(`${API_URL}/api/alerts/${alertId}/resume`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
      }
    } catch (err) {
      console.error('Error reactivando IA:', err);
    } finally {
      setResuming(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="h-16 bg-gray-200 rounded-xl"></div>
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}</div>
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Alertas</h1>
          <p className="text-gray-500">Conversaciones con IA pausada que requieren atención humana</p>
        </div>
        {/* Auto-refresh indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Auto-refresh activo
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white rounded-xl p-16 shadow-sm border border-gray-200/60 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <i className="fas fa-check-circle text-green-400 text-4xl"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Todo en orden</h3>
          <p className="text-gray-500 max-w-sm mx-auto">No hay conversaciones pausadas en este momento. El agente IA está funcionando correctamente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Alert banner */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-red-500 text-lg"></i>
              </div>
              <div>
                <p className="text-sm text-red-800 font-semibold">
                  {alerts.length} conversación{alerts.length > 1 ? 'es' : ''} requiere{alerts.length > 1 ? 'n' : ''} atención
                </p>
                <p className="text-xs text-red-600">La IA fue pausada y necesita intervención humana</p>
              </div>
            </div>
            <button
              onClick={() => alerts.forEach(a => handleResume(a.alert_id))}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition flex items-center gap-2 whitespace-nowrap"
            >
              <i className="fas fa-play"></i>
              Reactivar todas
            </button>
          </div>

          {/* Alert cards */}
          {alerts.map(alert => (
            <div key={alert.alert_id} className="bg-white rounded-xl shadow-sm border border-gray-200/60 border-l-4 border-l-red-400 hover:shadow-md transition">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {alert.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + meta */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-gray-900">{alert.name}</p>
                        <i className={`${PLATFORM_ICON[alert.platform] || ''} text-sm`}></i>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">IA pausada</span>
                      </div>

                      {/* Reason */}
                      <p className="text-sm text-red-600 font-medium mb-2">
                        <i className="fas fa-pause-circle mr-1.5"></i>
                        {alert.reason}
                      </p>

                      {/* Preview */}
                      {alert.conversation_preview && (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic border-l-2 border-gray-300">
                          &ldquo;{alert.conversation_preview}&rdquo;
                        </div>
                      )}

                      {/* Time */}
                      <p className="text-xs text-gray-400 mt-2">
                        <i className="far fa-clock mr-1"></i>
                        {timeAgo(alert.paused_at)}
                      </p>
                    </div>
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => handleResume(alert.alert_id)}
                    disabled={resuming === alert.alert_id}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition flex items-center gap-2 whitespace-nowrap disabled:opacity-50 flex-shrink-0"
                  >
                    {resuming === alert.alert_id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <i className="fas fa-play"></i>
                    )}
                    Reactivar IA
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
