import { useState, useEffect } from 'react';
// import { io } from 'socket.io-client';
import InventarioPage from './components/InventarioPage';
import SimulacionPage from './components/SimulacionPage';
import CRMPage from './components/CRMPage';
import ChannelInboxPage from './components/ChannelInboxPage';

// Socket.IO deshabilitado para deploy simplificado
// const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [config, setConfig] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    totalConversations: 0,
    leadsCalificados: 0,
    citasAgendadas: 0,
    conversionRate: 0,
    activeNow: 0
  });

  // Cargar configuración del cliente
  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConfig(data.data);
        }
      })
      .catch(error => console.error('Error cargando config:', error));
  }, []);

  useEffect(() => {
    // Cargar stats inicial
    fetch(`${API_URL}/api/demo/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(error => console.error('Error cargando stats:', error));

    // Polling cada 30 segundos para actualizar stats
    const interval = setInterval(() => {
      fetch(`${API_URL}/api/demo/stats`)
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(error => console.error('Error actualizando stats:', error));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Mostrar loading mientras carga la config
  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Colapsable */}
      <div
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-[70px]' : 'w-64'
        }`}
      >
        {/* Logo/Branding del Cliente + Botón Hamburguesa */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <i className={`fas ${sidebarCollapsed ? 'fa-bars' : 'fa-times'}`}></i>
            </button>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 flex-1 ml-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={config.logoUrl}
                    alt={config.businessName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1 className="font-bold text-sm truncate">{config.businessName}</h1>
              </div>
            )}
          </div>
        </div>

        {/* Navegación Principal */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center' : 'gap-3'
            } px-3 py-3 rounded-xl transition ${
              currentPage === 'dashboard'
                ? 'bg-indigo-50 text-indigo-600 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            title={sidebarCollapsed ? 'Dashboard' : ''}
          >
            <i className="fas fa-chart-line text-lg"></i>
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          {!sidebarCollapsed && (
            <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
              Canales
            </div>
          )}

          {config.features.multiChannel && (
            <>
              <button
                onClick={() => setCurrentPage('instagram')}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center' : 'gap-3'
                } px-3 py-3 rounded-xl transition relative ${
                  currentPage === 'instagram'
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                title={sidebarCollapsed ? 'Instagram' : ''}
              >
                <i className="fab fa-instagram text-lg"></i>
                {!sidebarCollapsed && <span>Instagram</span>}
                {stats.activeNow > 0 && (
                  <span className={`${
                    sidebarCollapsed
                      ? 'absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center'
                      : 'ml-auto'
                  } bg-green-500 text-white text-xs px-2 py-0.5 rounded-full`}>
                    {stats.activeNow}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCurrentPage('facebook')}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center' : 'gap-3'
                } px-3 py-3 rounded-xl transition ${
                  currentPage === 'facebook'
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                title={sidebarCollapsed ? 'Facebook' : ''}
              >
                <i className="fab fa-facebook-messenger text-lg"></i>
                {!sidebarCollapsed && <span>Facebook</span>}
              </button>

              <button
                onClick={() => setCurrentPage('whatsapp')}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center' : 'gap-3'
                } px-3 py-3 rounded-xl transition ${
                  currentPage === 'whatsapp'
                    ? 'bg-green-50 text-green-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                title={sidebarCollapsed ? 'WhatsApp' : ''}
              >
                <i className="fab fa-whatsapp text-lg"></i>
                {!sidebarCollapsed && <span>WhatsApp</span>}
              </button>
            </>
          )}

          {!sidebarCollapsed && (
            <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
              Gestión
            </div>
          )}

          {config.features.inventory && (
            <button
              onClick={() => setCurrentPage('inventario')}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center' : 'gap-3'
              } px-3 py-3 rounded-xl transition ${
                currentPage === 'inventario'
                  ? 'bg-indigo-50 text-indigo-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={sidebarCollapsed ? 'Inventario' : ''}
            >
              <i className="fas fa-boxes text-lg"></i>
              {!sidebarCollapsed && <span>Inventario</span>}
            </button>
          )}

          {config.features.crm && (
            <button
              onClick={() => setCurrentPage('crm')}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center' : 'gap-3'
              } px-3 py-3 rounded-xl transition relative ${
                currentPage === 'crm'
                  ? 'bg-indigo-50 text-indigo-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={sidebarCollapsed ? 'CRM Closer' : ''}
            >
              <i className="fas fa-users text-lg"></i>
              {!sidebarCollapsed && <span>CRM Closer</span>}
              {stats.leadsCalificados > 0 && (
                <span className={`${
                  sidebarCollapsed
                    ? 'absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center'
                    : 'ml-auto'
                } bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full`}>
                  {stats.leadsCalificados}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setCurrentPage('simulacion')}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center' : 'gap-3'
            } px-3 py-3 rounded-xl transition relative ${
              currentPage === 'simulacion'
                ? 'bg-purple-50 text-purple-600 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            title={sidebarCollapsed ? 'Simulación Cliente' : ''}
          >
            <i className="fas fa-flask text-lg"></i>
            {!sidebarCollapsed && <span>Simulación Cliente</span>}
            {!sidebarCollapsed && (
              <span className="ml-auto bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full font-bold">
                DEMO
              </span>
            )}
          </button>
        </nav>

        {/* Usuario (Cliente) */}
        <div className="p-3 border-t border-gray-100">
          {sidebarCollapsed ? (
            <div className="flex justify-center">
              <button className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden hover:ring-2 hover:ring-indigo-500 transition">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config.ownerName)}&background=6366f1&color=fff`}
                  alt="Usuario"
                />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config.ownerName)}&background=6366f1&color=fff`}
                  alt="Usuario"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{config.ownerName}</p>
                <p className="text-xs text-gray-500 truncate">{config.businessName}</p>
              </div>
              <button className="text-gray-400 hover:text-gray-600 transition">
                <i className="fas fa-cog"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-auto">
        {currentPage === 'dashboard' && <DashboardPage stats={stats} config={config} />}
        {currentPage === 'instagram' && <ChannelInboxPage channel="instagram" />}
        {currentPage === 'facebook' && <ChannelInboxPage channel="facebook" />}
        {currentPage === 'whatsapp' && <ChannelInboxPage channel="whatsapp" />}
        {currentPage === 'inventario' && <InventarioPage config={config} />}
        {currentPage === 'crm' && <CRMPage config={config} />}
        {currentPage === 'simulacion' && <SimulacionPage config={config} />}
      </div>
    </div>
  );
}

// ============================================
// PÁGINA: DASHBOARD (Métricas)
// ============================================
function DashboardPage({ stats }) {
  return (
    <div className="p-8 bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500">Vista general de tu agente IA</p>
      </div>

      {/* A) HEADER CON ESTADO DEL AGENTE */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white mb-8 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="font-semibold text-lg">Agente Activo</span>
        </div>
        <p className="text-white/90 text-sm">Respondiendo conversaciones en Instagram, Facebook y WhatsApp</p>
      </div>

      {/* B) MÉTRICAS (4 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Conversaciones totales */}
        <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-comments text-blue-600 text-xl"></i>
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              +12%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">1,248</h3>
          <p className="text-xs uppercase tracking-wide text-gray-500">Conversaciones totales</p>
          <p className="text-xs text-gray-400 mt-1">vs mes anterior</p>
        </div>

        {/* Card 2: Leads calificados */}
        <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-user-check text-purple-600 text-xl"></i>
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              +8%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">343</h3>
          <p className="text-xs uppercase tracking-wide text-gray-500">Leads calificados</p>
          <p className="text-xs text-gray-400 mt-1">vs mes anterior</p>
        </div>

        {/* Card 3: Listos para closer */}
        <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-fire text-orange-600 text-xl"></i>
            </div>
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
              Urgente
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">58</h3>
          <p className="text-xs uppercase tracking-wide text-gray-500">Listos para closer</p>
          <p className="text-xs text-gray-400 mt-1">Requieren atención</p>
        </div>

        {/* Card 4: Tasa de conversión */}
        <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-trending-up text-indigo-600 text-xl"></i>
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              +3.2%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">27.5%</h3>
          <p className="text-xs uppercase tracking-wide text-gray-500">Tasa de conversión</p>
          <p className="text-xs text-gray-400 mt-1">vs mes anterior</p>
        </div>
      </div>

      {/* C) GRÁFICOS (2 columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de línea - Conversaciones últimos 7 días */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="font-bold text-gray-900 mb-4">Conversaciones últimos 7 días</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {[120, 145, 167, 189, 210, 198, 225].map((value, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-t-lg transition-all hover:from-indigo-600 hover:to-indigo-400"
                  style={{ height: `${(value / 225) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-500">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][idx]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de dona - Distribución por canal */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="font-bold text-gray-900 mb-4">Distribución por canal</h3>
          <div className="flex items-center justify-center h-64">
            <div className="relative w-48 h-48">
              {/* Donut chart simplificado con divs */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 opacity-20"></div>
              <div className="absolute inset-8 rounded-full bg-white flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">100%</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                <span className="text-sm text-gray-700">Instagram</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">60%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700">WhatsApp</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">30%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-700">Facebook</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* D) ACTIVIDAD RECIENTE */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="font-bold text-gray-900 mb-4">Actividad Reciente</h3>
        <div className="space-y-2">
          {/* Lead 1 */}
          <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
              JP
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">Juan Pérez</p>
                <i className="fab fa-instagram text-pink-500 text-sm"></i>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                  Calificado
                </span>
                <span className="text-xs text-gray-500">• Capital: $500</span>
              </div>
            </div>
            <span className="text-xs text-gray-400">Hace 2 min</span>
          </div>

          {/* Lead 2 */}
          <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
              MG
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">María González</p>
                <i className="fab fa-whatsapp text-green-500 text-sm"></i>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">
                  Nuevo
                </span>
                <span className="text-xs text-gray-500">• En calificación</span>
              </div>
            </div>
            <span className="text-xs text-gray-400">Hace 15 min</span>
          </div>

          {/* Lead 3 */}
          <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
              CR
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">Carlos Ruiz</p>
                <i className="fab fa-facebook-messenger text-blue-500 text-sm"></i>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                  Convertido
                </span>
                <span className="text-xs text-gray-500">• Cerrado hoy</span>
              </div>
            </div>
            <span className="text-xs text-gray-400">Hace 1h</span>
          </div>

          {/* Lead 4 */}
          <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
              AL
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">Ana López</p>
                <i className="fab fa-instagram text-pink-500 text-sm"></i>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                  Calificado
                </span>
                <span className="text-xs text-gray-500">• Interesada en pulseras</span>
              </div>
            </div>
            <span className="text-xs text-gray-400">Hace 2h</span>
          </div>

          {/* Lead 5 */}
          <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold">
              LM
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">Luis Martínez</p>
                <i className="fab fa-whatsapp text-green-500 text-sm"></i>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">
                  Nuevo
                </span>
                <span className="text-xs text-gray-500">• Consulta por delivery</span>
              </div>
            </div>
            <span className="text-xs text-gray-400">Hace 3h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;