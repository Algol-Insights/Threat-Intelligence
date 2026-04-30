import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'react';
import { wsService } from './services/websocket';
import {
  LayoutDashboard, FileText, Shield, Network, AlertTriangle,
  Scale, Settings, LogOut, Menu, X, Activity, ChevronRight, Bug,
  Grid3X3, FileBarChart, Zap, GraduationCap, Briefcase, Package, Sun, Moon
} from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Compliance from './pages/Compliance';
import NetworkPage from './pages/Network';
import Incidents from './pages/Incidents';
import SettingsPage from './pages/Settings';
import Threats from './pages/Threats';
import MitreMatrix from './pages/MitreMatrix';
import Reports from './pages/Reports';
import Playbooks from './pages/Playbooks';
import ExecutiveBriefing from './pages/ExecutiveBriefing';
import Training from './pages/Training';
import Assets from './pages/Assets';

// ── Sidebar navigation ──────────────────────────────────────────────────────

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/events', icon: FileText, label: 'Events' },
  { to: '/compliance', icon: Scale, label: 'CDPA Compliance', accent: true },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/playbooks', icon: Zap, label: 'SOAR Playbooks' },
  { to: '/network', icon: Network, label: 'Network' },
  { to: '/assets', icon: Package, label: 'Asset Inventory' },
  { to: '/threats', icon: Bug, label: 'Threat Intel' },
  { to: '/mitre', icon: Grid3X3, label: 'MITRE ATT&CK' },
  { to: '/briefing', icon: Briefcase, label: 'Executive Briefing' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/training', icon: GraduationCap, label: 'Training' },
  { to: '/settings', icon: Settings, label: 'Settings', role: 'admin' },
];

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-soc-surface border-r border-soc-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-soc-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm tracking-wide text-white leading-tight">CHENGETO</p>
            <p className="text-[10px] text-soc-muted tracking-widest uppercase">Algol Cyber Security</p>
          </div>
        )}
        <button onClick={onToggle} className="ml-auto text-soc-muted hover:text-white transition-colors p-1">
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV.map(item => {
          if (item.role && user?.role !== item.role) return null;
          const active = location.pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                ${active ? 'bg-brand-600/20 text-brand-400' : 'text-soc-muted hover:text-soc-text hover:bg-white/5'}
                ${item.accent && !active ? 'text-emerald-400/80' : ''}`}>
              <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-brand-400' : ''} ${item.accent && !active ? 'text-emerald-400' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.accent && !active && <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
              {!collapsed && active && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
            </NavLink>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-soc-border p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName || user?.username}</p>
              <p className="text-xs text-soc-muted capitalize">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} className="text-soc-muted hover:text-red-400 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── Top metrics bar ──────────────────────────────────────────────────────────

function TopBar({ collapsed }: { collapsed: boolean }) {
  const [wsConnected, setWsConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setWsConnected(wsService.connected), 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    document.documentElement.classList.toggle('light');
  };

  return (
    <header className={`fixed top-0 right-0 z-20 h-12 border-b border-soc-border bg-soc-bg/80 backdrop-blur-sm flex items-center px-6 gap-6 transition-all ${collapsed ? 'left-16' : 'left-60'}`}>
      <div className="flex items-center gap-2 text-xs text-soc-muted">
        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{wsConnected ? 'Live' : 'Disconnected'}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-soc-muted">
        <Activity className="w-3.5 h-3.5" />
        <span>Real-time monitoring active</span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <button onClick={toggleTheme} className="text-soc-muted hover:text-soc-text transition-colors" title="Toggle theme">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <span className="text-xs text-soc-muted font-mono">
          {new Date().toLocaleDateString('en-ZW', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      </div>
    </header>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated) { wsService.connect(); return () => wsService.disconnect(); }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-brand-500 mx-auto mb-4 animate-pulse" />
          <p className="text-soc-muted text-sm">Loading Chengeto...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Routes><Route path="*" element={<Login />} /></Routes>;
  }

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
      <TopBar collapsed={sidebarCollapsed} />
      <main className={`pt-12 transition-all ${sidebarCollapsed ? 'pl-16' : 'pl-60'}`}>
        <div className="p-6">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/threats" element={<Threats />} />
            <Route path="/mitre" element={<MitreMatrix />} />
            <Route path="/briefing" element={<ExecutiveBriefing />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/playbooks" element={<Playbooks />} />
            <Route path="/training" element={<Training />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
