import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useParams } from 'react-router-dom';
import InventarioPage from './components/InventarioPage';
import SimulacionPage from './components/SimulacionPage';
import CRMPage from './components/CRMPage';
import ChannelInboxPage from './components/ChannelInboxPage';
import PedidosPage from './components/PedidosPage';
import CitasPage from './components/CitasPage';
import NotificationsPage from './components/NotificationsPage';
import AlertsPage from './components/AlertsPage';
import ConfiguracionPage from './components/ConfiguracionPage';
import DeliveryPage from './components/DeliveryPage';
import SetupPage from './components/SetupPage';
import DashboardPage from './components/DashboardPage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Context para compartir config y stats ──────────────────
const AppContext = createContext(null);
export function useAppContext() { return useContext(AppContext); }
export { API_URL };

// ─── Wrapper de ChannelInboxPage con params ─────────────────
function ChannelInboxWrapper() {
  const { channel } = useParams();
  return <ChannelInboxPage channel={channel || 'instagram'} />;
}

// ─── App root ───────────────────────────────────────────────
function App() {
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then(res => res.json())
      .then(data => { if (data.success) setConfig(data.data); })
      .catch(error => console.error('Error cargando config:', error));
  }, []);

  useEffect(() => {
    const loadStats = () => {
      fetch(`${API_URL}/api/demo/stats`)
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(error => console.error('Error cargando stats:', error));
    };
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

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
    <AppContext.Provider value={{ config, setConfig, stats, setStats, API_URL }}>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="conversations" element={<ChannelInboxPage channel="instagram" />} />
            <Route path="conversations/:channel" element={<ChannelInboxWrapper />} />
            <Route path="inventario" element={<InventarioPage config={config} />} />
            <Route path="crm" element={<CRMPage config={config} />} />
            <Route path="pedidos" element={<PedidosPage />} />
            <Route path="citas" element={<CitasPage />} />
            <Route path="delivery" element={<DeliveryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
            <Route path="simulacion" element={<SimulacionPage config={config} />} />
            <Route path="setup" element={<SetupPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

// ─── Layout ─────────────────────────────────────────────────
function DashboardLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────
function Sidebar() {
  const { config, stats } = useAppContext();
  const [collapsed, setCollapsed] = useState(false);
  const badges = stats?.badges || {};
  const features = config?.features || {};

  const baseLink = (extra = '') =>
    `w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-xl transition relative ${extra}`;

  const linkClass = ({ isActive }) =>
    baseLink(isActive ? 'bg-indigo-50 text-indigo-600 font-semibold border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50');

  const Badge = ({ count, color = 'bg-indigo-500' }) =>
    count > 0 ? (
      <span className={`${collapsed ? 'absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center' : 'ml-auto'} ${color} text-white text-xs px-2 py-0.5 rounded-full`}>
        {count}
      </span>
    ) : null;

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-[70px]' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <i className={`fas ${collapsed ? 'fa-bars' : 'fa-times'}`}></i>
          </button>
          {!collapsed && (
            <div className="flex items-center gap-3 flex-1 ml-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                <img src={config.logoUrl} alt={config.businessName} className="w-full h-full object-cover" />
              </div>
              <h1 className="font-bold text-sm truncate">{config.businessName}</h1>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <NavLink to="/" end className={linkClass} title={collapsed ? 'Dashboard' : ''}>
          <i className="fas fa-chart-line text-lg"></i>
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        {/* ── CANALES ── */}
        {!collapsed && (
          <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Canales</div>
        )}

        {features.multiChannel && (
          <>
            <NavLink
              to="/conversations/instagram"
              className={({ isActive }) =>
                baseLink(isActive ? 'bg-pink-50 text-pink-600 font-semibold border-l-4 border-pink-500' : 'text-gray-600 hover:bg-gray-50')
              }
              title={collapsed ? 'Instagram' : ''}
            >
              <i className="fab fa-instagram text-lg"></i>
              {!collapsed && <span>Instagram</span>}
              <Badge count={stats?.totalContacts} color="bg-green-500" />
            </NavLink>

            <NavLink
              to="/conversations/facebook"
              className={({ isActive }) =>
                baseLink(isActive ? 'bg-blue-50 text-blue-600 font-semibold border-l-4 border-blue-500' : 'text-gray-600 hover:bg-gray-50')
              }
              title={collapsed ? 'Facebook' : ''}
            >
              <i className="fab fa-facebook-messenger text-lg"></i>
              {!collapsed && <span>Facebook</span>}
            </NavLink>

            <NavLink
              to="/conversations/whatsapp"
              className={({ isActive }) =>
                baseLink(isActive ? 'bg-green-50 text-green-600 font-semibold border-l-4 border-green-500' : 'text-gray-600 hover:bg-gray-50')
              }
              title={collapsed ? 'WhatsApp' : ''}
            >
              <i className="fab fa-whatsapp text-lg"></i>
              {!collapsed && <span>WhatsApp</span>}
            </NavLink>
          </>
        )}

        {/* ── GESTIÓN ── */}
        {!collapsed && (
          <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Gestión</div>
        )}

        {features.inventory && (
          <NavLink to="/inventario" className={linkClass} title={collapsed ? 'Inventario' : ''}>
            <i className="fas fa-boxes text-lg"></i>
            {!collapsed && <span>Inventario</span>}
          </NavLink>
        )}

        {features.crm && (
          <NavLink to="/crm" className={linkClass} title={collapsed ? 'CRM Closer' : ''}>
            <i className="fas fa-users text-lg"></i>
            {!collapsed && <span>CRM Closer</span>}
            <Badge count={stats?.urgentLeads} color="bg-orange-500" />
          </NavLink>
        )}

        {features.orders !== false && (
          <NavLink to="/pedidos" className={linkClass} title={collapsed ? 'Pedidos' : ''}>
            <i className="fas fa-shopping-bag text-lg"></i>
            {!collapsed && <span>Pedidos</span>}
            <Badge count={badges.orders} color="bg-blue-500" />
          </NavLink>
        )}

        {features.appointments !== false && (
          <NavLink to="/citas" className={linkClass} title={collapsed ? 'Citas' : ''}>
            <i className="fas fa-calendar-alt text-lg"></i>
            {!collapsed && <span>Citas</span>}
            <Badge count={badges.appointments} color="bg-purple-500" />
          </NavLink>
        )}

        {features.delivery !== false && (
          <NavLink to="/delivery" className={linkClass} title={collapsed ? 'Delivery' : ''}>
            <i className="fas fa-truck text-lg"></i>
            {!collapsed && <span>Delivery</span>}
          </NavLink>
        )}

        <NavLink to="/notifications" className={linkClass} title={collapsed ? 'Notificaciones' : ''}>
          <i className="fas fa-bell text-lg"></i>
          {!collapsed && <span>Notificaciones</span>}
        </NavLink>

        {/* ── DEMO ── */}
        {!collapsed && (
          <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Demo</div>
        )}

        <NavLink
          to="/simulacion"
          className={({ isActive }) =>
            baseLink(isActive ? 'bg-purple-50 text-purple-600 font-semibold border-l-4 border-purple-500' : 'text-gray-600 hover:bg-gray-50')
          }
          title={collapsed ? 'Simulación' : ''}
        >
          <i className="fas fa-flask text-lg"></i>
          {!collapsed && <span>Simulación Cliente</span>}
          {!collapsed && (
            <span className="ml-auto bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full font-bold">DEMO</span>
          )}
        </NavLink>

        {!config?.hideSetup && (
          <NavLink to="/setup" className={linkClass} title={collapsed ? 'Setup' : ''}>
            <i className="fas fa-magic text-lg"></i>
            {!collapsed && <span>Setup Demo</span>}
          </NavLink>
        )}

        {/* ── SISTEMA ── */}
        {!collapsed && (
          <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Sistema</div>
        )}

        <NavLink
          to="/alerts"
          className={({ isActive }) =>
            baseLink(isActive ? 'bg-red-50 text-red-600 font-semibold border-l-4 border-red-500' : 'text-gray-600 hover:bg-gray-50')
          }
          title={collapsed ? 'Alertas' : ''}
        >
          <i className="fas fa-exclamation-triangle text-lg"></i>
          {!collapsed && <span>Alertas</span>}
          <Badge count={badges.alerts} color="bg-red-500" />
        </NavLink>

        <NavLink to="/configuracion" className={linkClass} title={collapsed ? 'Configuración' : ''}>
          <i className="fas fa-cog text-lg"></i>
          {!collapsed && <span>Configuración</span>}
        </NavLink>
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-100">
        {collapsed ? (
          <div className="flex justify-center">
            <NavLink to="/configuracion" className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden hover:ring-2 hover:ring-indigo-500 transition block">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config.ownerName)}&background=6366f1&color=fff`} alt="Usuario" />
            </NavLink>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config.ownerName)}&background=6366f1&color=fff`} alt="Usuario" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{config.ownerName}</p>
              <p className="text-xs text-gray-500 truncate">{config.businessName}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
