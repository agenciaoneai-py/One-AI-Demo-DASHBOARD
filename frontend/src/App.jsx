import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useLocation, useNavigate } from 'react-router-dom';
import InventarioPage    from './components/InventarioPage';
import SimulacionPage    from './components/SimulacionPage';
import CRMPage           from './components/CRMPage';
import ChannelInboxPage  from './components/ChannelInboxPage';
import PedidosPage       from './components/PedidosPage';
import CitasPage         from './components/CitasPage';
import NotificationsPage from './components/NotificationsPage';
import AlertsPage        from './components/AlertsPage';
import ConfiguracionPage from './components/ConfiguracionPage';
import DeliveryPage      from './components/DeliveryPage';
import SetupPage         from './components/SetupPage';
import DashboardPage     from './components/DashboardPage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AppContext = createContext(null);
export function useAppContext() { return useContext(AppContext); }
export { API_URL };

function ChannelInboxWrapper() {
  const { channel } = useParams();
  return <ChannelInboxPage channel={channel || 'instagram'} />;
}

// ─── App root ────────────────────────────────────────────────────────────────

function App() {
  const [config, setConfig] = useState(null);
  const [stats,  setStats]  = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then(r => r.json())
      .then(d => { if (d.success) setConfig(d.data); })
      .catch(e => console.error('Error cargando config:', e));
  }, []);

  useEffect(() => {
    const load = () => {
      fetch(`${API_URL}/api/demo/stats`)
        .then(r => r.json())
        .then(d => setStats(d))
        .catch(e => console.error('Error cargando stats:', e));
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
            <Route index                element={<DashboardPage />} />
            <Route path="conversations" element={<ChannelInboxPage channel="instagram" />} />
            <Route path="conversations/:channel" element={<ChannelInboxWrapper />} />
            <Route path="inventario"    element={<InventarioPage config={config} />} />
            <Route path="crm"           element={<CRMPage config={config} />} />
            <Route path="pedidos"       element={<PedidosPage />} />
            <Route path="citas"         element={<CitasPage />} />
            <Route path="delivery"      element={<DeliveryPage />} />
            <Route path="notificaciones" element={<NotificationsPage />} />
            <Route path="notifications"  element={<Navigate to="/notificaciones" replace />} />
            <Route path="alertas"       element={<AlertsPage />} />
            <Route path="alerts"        element={<Navigate to="/alertas" replace />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
            <Route path="simulacion"    element={<SimulacionPage config={config} />} />
            <Route path="setup"         element={<SetupPage />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function DashboardLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50 flex flex-col pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}

// ─── Nav config ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: '/', icon: 'fas fa-chart-line', label: 'Dashboard' },

  { section: 'Canales' },
  { path: '/conversations/instagram', icon: 'fab fa-instagram',          label: 'Instagram', iconColor: '#E1306C', badgeKey: 'instagram' },
  { path: '/conversations/facebook',  icon: 'fab fa-facebook-messenger', label: 'Facebook',  iconColor: '#1877F2', badgeKey: 'facebook'  },
  { path: '/conversations/whatsapp',  icon: 'fab fa-whatsapp',           label: 'WhatsApp',  iconColor: '#25D366', badgeKey: 'whatsapp'  },

  { section: 'Gestión' },
  { path: '/crm',            icon: 'fas fa-users',                label: 'CRM'            },
  { path: '/inventario',     icon: 'fas fa-box',                  label: 'Inventario'     },
  { path: '/alertas',        icon: 'fas fa-exclamation-triangle', label: 'Alertas',        badgeKey: 'alerts'       },
  { path: '/citas',          icon: 'fas fa-calendar-alt',         label: 'Citas',          badgeKey: 'appointments' },
  { path: '/pedidos',        icon: 'fas fa-shopping-bag',         label: 'Pedidos',        badgeKey: 'orders'       },
  { path: '/delivery',       icon: 'fas fa-motorcycle',           label: 'Delivery'       },
  { path: '/notificaciones', icon: 'fas fa-bell',                 label: 'Notificaciones' },

  { section: 'Demo' },
  { path: '/simulacion', icon: 'fas fa-flask', label: 'Simulación', demoBadge: true },
  { path: '/setup',      icon: 'fas fa-cog',   label: 'Setup Demo'                 },

  { path: '/configuracion', icon: 'fas fa-cog', label: 'Configuración' },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar() {
  const { stats } = useAppContext();
  const location  = useLocation();
  const navigate  = useNavigate();

  const [collapsed,        setCollapsed]        = useState(true);
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [isMobile,         setIsMobile]         = useState(window.innerWidth < 1024);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const badges = stats?.badges || {};

  // Mobile detection
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const onMouseDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const isCollapsed = isMobile ? false : collapsed;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = (e, path) => {
    e.preventDefault();
    navigate(path);
    if (isMobile) setMobileOpen(false);
    setUserDropdownOpen(false);
  };

  const renderBadge = (item) => {
    if (item.demoBadge) {
      return (
        <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-1.5 h-[18px] rounded-full flex items-center justify-center leading-none">
          DEMO
        </span>
      );
    }
    const count = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
    if (count > 0) {
      return (
        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center leading-none px-1">
          {count > 99 ? '99+' : count}
        </span>
      );
    }
    return null;
  };

  // ── Shared sidebar body ──────────────────────────────────────────────────
  const sidebarBody = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => isMobile ? setMobileOpen(false) : setCollapsed(c => !c)}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <i className={`fas text-xl ${
              isMobile ? 'fa-xmark' : (isCollapsed ? 'fa-angles-right' : 'fa-angles-left')
            }`} />
          </button>
          {!isCollapsed && (
            <div className="flex items-center gap-3 flex-1 ml-3 min-w-0">
              <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gray-100 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-600">ONE AI</span>
              </div>
              <span className="font-bold text-sm text-gray-900 truncate">ONE AI</span>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {NAV_ITEMS.map((item, idx) => {
          // Section header
          if (item.section) {
            if (isCollapsed) return <div key={`sep-${idx}`} className="py-2 border-t border-gray-100/80 mx-2 mt-1" />;
            return (
              <div key={`sec-${idx}`} className="pt-5 pb-1.5 px-3 text-xs font-medium text-gray-400 uppercase tracking-widest">
                {item.section}
              </div>
            );
          }

          const active = isActive(item.path);
          const activeClass = 'bg-indigo-50/60 text-indigo-600 font-medium';
          const inactiveClass = 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';

          if (isCollapsed) {
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={e => handleNavClick(e, item.path)}
                title={item.label}
                className={`w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${active ? activeClass : inactiveClass}`}
              >
                <i
                  className={`${item.icon} text-lg`}
                  style={item.iconColor && !active ? { color: item.iconColor } : undefined}
                />
              </a>
            );
          }

          return (
            <a
              key={item.path}
              href={item.path}
              onClick={e => handleNavClick(e, item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${active ? activeClass : inactiveClass}`}
            >
              <i
                className={`${item.icon} text-lg flex-shrink-0`}
                style={item.iconColor && !active ? { color: item.iconColor } : undefined}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {renderBadge(item)}
            </a>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-2.5 border-t border-gray-100 flex-shrink-0 relative" ref={dropdownRef}>
        {/* Dropdown pops UP */}
        {userDropdownOpen && !isCollapsed && (
          <div className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
            <a
              href="/configuracion"
              onClick={e => handleNavClick(e, '/configuracion')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-200"
            >
              <i className="fas fa-user-circle text-gray-600" />
              <span className="text-sm text-gray-700">Mi Perfil</span>
            </a>
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors duration-200">
              <i className="fas fa-sign-out-alt" />
              <span className="text-sm">Cerrar Sesión</span>
            </button>
          </div>
        )}

        {isCollapsed ? (
          <button
            onClick={() => setUserDropdownOpen(o => !o)}
            className="w-full flex justify-center py-1 hover:opacity-80 transition-opacity duration-200"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              DO
            </div>
          </button>
        ) : (
          <button
            onClick={() => setUserDropdownOpen(o => !o)}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
              DO
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Demo Owner</p>
              <p className="text-xs text-gray-400 truncate">demo@oneai.com</p>
            </div>
            <i className={`fas fa-chevron-${userDropdownOpen ? 'up' : 'down'} text-gray-400 text-sm flex-shrink-0`} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      {isMobile && !mobileOpen && (
        <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200/60 flex items-center justify-between px-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <i className="fas fa-bars text-lg" />
          </button>
          <div className="flex items-center gap-2 flex-1 ml-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-gray-600">ONE AI</span>
            </div>
            <span className="font-semibold text-sm text-gray-900 truncate">ONE AI</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            DO
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div className={`bg-white border-r border-gray-200/60 flex flex-col h-screen flex-shrink-0 transition-all duration-300 ease-out ${collapsed ? 'w-[70px]' : 'w-64'}`}>
          {sidebarBody}
        </div>
      )}

      {/* Mobile drawer + backdrop */}
      {isMobile && (
        <>
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
          )}
          <div className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200/60 flex flex-col transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {sidebarBody}
          </div>
        </>
      )}
    </>
  );
}

export default App;
