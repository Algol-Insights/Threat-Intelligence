import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { wsService } from './services/websocket';
import {
  LayoutDashboard, FileText, Shield, AlertTriangle,
  Scale, Settings, LogOut, Menu, X, Activity, ChevronRight,
  Sun, Moon, Volume2, VolumeX, Zap, Bug, Network, FileBarChart
} from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Compliance from './pages/Compliance';
import Incidents from './pages/Incidents';
import Playbooks from './pages/Playbooks';
import Threats from './pages/Threats';
import NetworkPage from './pages/Network';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';

// Still accessible via URL but not in primary nav
import MitreMatrix from './pages/MitreMatrix';
import ExecutiveBriefing from './pages/ExecutiveBriefing';
import Assets from './pages/Assets';
import AttackHeatmap from './pages/AttackHeatmap';

// ── Toast context ───────────────────────────────────────────────────────────
interface Toast { id: string; message: string; severity: string; timestamp: number; }
const ToastCtx = createContext<{ toasts: Toast[]; addToast: (msg: string, sev: string) => void }>({ toasts: [], addToast: () => {} });
export const useToast = () => useContext(ToastCtx);

// ── 9-section navigation ────────────────────────────────────────────────────
const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', key: '1' },
  { to: '/events', icon: FileText, label: 'Events', key: '2' },
  { to: '/compliance', icon: Scale, label: 'CDPA Compliance', accent: true, key: '3' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents', key: '4' },
  { to: '/playbooks', icon: Zap, label: 'SOAR Playbooks', key: '5' },
  { to: '/threats', icon: Bug, label: 'Threat Intel', key: '6' },
  { to: '/network', icon: Network, label: 'Network', key: '7' },
  { to: '/reports', icon: FileBarChart, label: 'Reports', key: '8' },
  { to: '/settings', icon: Settings, label: 'Settings', role: 'admin', key: '9' },
];

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-soc-surface border-r border-soc-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className="h-14 flex items-center px-4 border-b border-soc-border gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
          <Shield className="w-4.5 h-4.5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-wide text-soc-text leading-tight">CHENGETO</p>
            <p className="text-[9px] text-soc-muted tracking-wider uppercase">Security Operations</p>
          </div>
        )}
        <button onClick={onToggle} className="ml-auto text-soc-muted hover:text-soc-text transition-colors">
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {NAV.filter(n => !n.role || n.role === user?.role).map(item => {
          const isActive = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
          return (
            <NavLink key={item.to} to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all
              ${isActive ? 'bg-brand-600/15 text-brand-400' : 'text-soc-muted hover:text-soc-text hover:bg-white/[0.04]'}
              ${item.accent && !isActive ? 'text-emerald-400/70' : ''}`}>
              <item.icon className={`w-[17px] h-[17px] shrink-0 ${isActive ? 'text-brand-400' : ''}`} />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.accent && <span className="ml-auto text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">NEW</span>}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-brand-400/50" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-1.5 border-t border-soc-border/30">
          <p className="text-[8px] text-soc-muted/40">Alt+1-9 to navigate</p>
        </div>
      )}

      <div className="border-t border-soc-border p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.displayName || user?.username}</p>
              <p className="text-[10px] text-soc-muted capitalize">{user?.role}</p>
            </div>
          )}
          <button onClick={logout} className="text-soc-muted hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ collapsed }: { collapsed: boolean }) {
  const [wsConnected, setWsConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('alertSound') !== 'false');

  useEffect(() => {
    const unsub = wsService.on('_connection', (d: any) => setWsConnected(d.connected));
    const interval = setInterval(() => setWsConnected(wsService.connected), 5000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const toggleTheme = () => { const n = !darkMode; setDarkMode(n); localStorage.setItem('theme', n ? 'dark' : 'light'); document.documentElement.classList.toggle('light', !n); };
  const toggleSound = () => { const n = !soundEnabled; setSoundEnabled(n); localStorage.setItem('alertSound', String(n)); };

  return (
    <header className={`fixed top-0 right-0 z-20 h-12 border-b border-soc-border bg-soc-bg/80 backdrop-blur-sm flex items-center px-5 gap-4 transition-all ${collapsed ? 'left-16' : 'left-56'}`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className={`text-xs font-medium ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>{wsConnected ? 'Live' : 'Reconnecting...'}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-soc-muted"><Activity className="w-3 h-3" /><span>Real-time monitoring</span></div>
      <div className="ml-auto flex items-center gap-3">
        <button onClick={toggleSound} className="text-soc-muted hover:text-soc-text transition-colors" title={soundEnabled ? 'Mute' : 'Unmute'}>
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
        <button onClick={toggleTheme} className="text-soc-muted hover:text-soc-text transition-colors" title="Theme">
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        <span className="text-[11px] text-soc-muted font-mono">{new Date().toLocaleDateString('en-ZW', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
    </header>
  );
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-14 right-4 z-50 space-y-2 w-80">
      {toasts.map(t => {
        const colors: Record<string, string> = { Critical: 'border-red-500 bg-red-500/10', High: 'border-orange-500 bg-orange-500/10', CDPA: 'border-emerald-500 bg-emerald-500/10' };
        return (
          <div key={t.id} className={`rounded-lg border-l-4 p-3 backdrop-blur-sm shadow-2xl animate-slide-in ${colors[t.severity] || 'border-brand-500 bg-brand-500/10'}`}>
            <p className="text-xs font-semibold text-soc-text">{t.severity} Alert</p>
            <p className="text-[11px] text-soc-muted mt-0.5 leading-relaxed">{t.message}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const navigate = useNavigate();

  const addToast = useCallback((message: string, severity: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, severity, timestamp: Date.now() }].slice(-5));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);

  useEffect(() => { if (isAuthenticated) wsService.connect(); return () => wsService.disconnect(); }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubs = [
      wsService.on('CORRELATION_ALERT', (a: any) => {
        if (a.severity === 'Critical' || a.severity === 'High') {
          addToast(`${a.ruleName} — ${a.sourceIp} → :${a.destinationPort}`, a.severity);
          if (localStorage.getItem('alertSound') !== 'false') wsService.playAlertSound(a.severity);
        }
      }),
      wsService.on('CDPA_BREACH', () => {
        addToast('CDPA breach detected — 72-hour POTRAZ notification required', 'CDPA');
        if (localStorage.getItem('alertSound') !== 'false') wsService.playAlertSound('Critical');
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [isAuthenticated, addToast]);

  // Keyboard shortcuts Alt+1-9
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || !isAuthenticated) return;
      const routes = ['/dashboard', '/events', '/compliance', '/incidents', '/playbooks', '/threats', '/network', '/reports', '/settings'];
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < routes.length) { e.preventDefault(); navigate(routes[idx]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAuthenticated, navigate]);

  useEffect(() => { if (localStorage.getItem('theme') === 'light') document.documentElement.classList.add('light'); }, []);

  if (!isAuthenticated) return <Routes><Route path="*" element={<Login />} /></Routes>;

  return (
    <ToastCtx.Provider value={{ toasts, addToast }}>
      <div className="min-h-screen bg-soc-bg text-soc-text">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <TopBar collapsed={collapsed} />
        <ToastContainer toasts={toasts} />
        <main className={`pt-14 pb-6 px-6 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-56'}`}>
          <Routes>
            {/* Primary nav — 9 sections */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/playbooks" element={<Playbooks />} />
            <Route path="/threats" element={<Threats />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Secondary — accessible via URL */}
            <Route path="/mitre" element={<MitreMatrix />} />
            <Route path="/briefing" element={<ExecutiveBriefing />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/heatmap" element={<AttackHeatmap />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </ToastCtx.Provider>
  );
}
