import { useState, useEffect } from 'react';

function CRMPage({ config }) {
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: '',
    status: '',
    lead_quality: '',
    search: ''
  });
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchContacts();
  }, [filters]);

  const fetchStats = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/contacts/stats`);
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error cargando stats:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.platform) queryParams.append('platform', filters.platform);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.lead_quality) queryParams.append('lead_quality', filters.lead_quality);
      if (filters.search) queryParams.append('search', filters.search);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/contacts?${queryParams}`);
      const result = await response.json();
      
      if (result.success) {
        setContacts(result.data);
      }
    } catch (error) {
      console.error('Error cargando contactos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      qualified: 'bg-purple-100 text-purple-700',
      converted: 'bg-green-100 text-green-700',
      lost: 'bg-red-100 text-red-700'
    };
    const labels = {
      new: 'Nuevo',
      contacted: 'Contactado',
      qualified: 'Calificado',
      converted: 'Convertido',
      lost: 'Perdido'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getLeadQualityBadge = (quality) => {
    const styles = {
      hot: 'bg-red-500 text-white',
      warm: 'bg-orange-500 text-white',
      cold: 'bg-blue-500 text-white',
      unknown: 'bg-gray-400 text-white'
    };
    const labels = {
      hot: '🔥 Caliente',
      warm: '⚡ Tibio',
      cold: '❄️ Frío',
      unknown: '❓ Desconocido'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[quality] || 'bg-gray-400 text-white'}`}>
        {labels[quality] || quality}
      </span>
    );
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      instagram: 'fab fa-instagram text-pink-600',
      whatsapp: 'fab fa-whatsapp text-green-600',
      facebook: 'fab fa-facebook text-blue-600'
    };
    return <i className={icons[platform] || 'fas fa-comment'}></i>;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CRM - Gestión de Clientes</h1>
        <p className="text-gray-500">Gestiona tus contactos y leads en un solo lugar</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Total Contactos</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-blue-600 mb-1">Nuevos</p>
            <p className="text-2xl font-bold text-blue-700">{stats.new}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <p className="text-sm text-purple-600 mb-1">Calificados</p>
            <p className="text-2xl font-bold text-purple-700">{stats.qualified}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-sm text-green-600 mb-1">Convertidos</p>
            <p className="text-2xl font-bold text-green-700">{stats.converted}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-sm text-red-600 mb-1">Leads Calientes</p>
            <p className="text-2xl font-bold text-red-700">{stats.hot_leads}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <p className="text-sm text-yellow-600 mb-1">Ingresos</p>
            <p className="text-xl font-bold text-yellow-700">${stats.total_revenue.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, email o teléfono..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filters.platform}
            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las plataformas</option>
            <option value="instagram">Instagram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="facebook">Facebook</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los estados</option>
            <option value="new">Nuevo</option>
            <option value="contacted">Contactado</option>
            <option value="qualified">Calificado</option>
            <option value="converted">Convertido</option>
            <option value="lost">Perdido</option>
          </select>
          <select
            value={filters.lead_quality}
            onChange={(e) => setFilters({ ...filters, lead_quality: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las calidades</option>
            <option value="hot">🔥 Caliente</option>
            <option value="warm">⚡ Tibio</option>
            <option value="cold">❄️ Frío</option>
          </select>
        </div>
      </div>

      {/* Tabla de Contactos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-users text-6xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">No se encontraron contactos</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plataforma</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Calidad</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tags</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Última Interacción</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelectedContact(contact)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.email || contact.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(contact.platform)}
                      <span className="text-sm capitalize">{contact.platform}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(contact.status)}
                  </td>
                  <td className="px-6 py-4">
                    {getLeadQualityBadge(contact.lead_quality)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${contact.engagement_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{contact.engagement_score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags?.slice(0, 2).map((tagObj, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {tagObj.tag}
                        </span>
                      ))}
                      {contact.tags?.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                          +{contact.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">
                      {new Date(contact.last_interaction_at).toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(contact.last_interaction_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">
                      ${contact.lifetime_value > 0 ? contact.lifetime_value.toFixed(0) : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm">
                      Ver detalles →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de detalles del contacto */}
      {selectedContact && (
        <ContactDetailModal 
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
}

// Modal de detalles
function ContactDetailModal({ contact, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{contact.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Email</p>
              <p className="font-semibold">{contact.email || 'No proporcionado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Teléfono</p>
              <p className="font-semibold">{contact.phone || 'No proporcionado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Notas del Setter IA</p>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{contact.notes || 'Sin notas'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total de mensajes</p>
              <p className="font-semibold">{contact.total_messages}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CRMPage;