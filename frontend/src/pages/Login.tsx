import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(username, password); } catch (err: any) { setError(err.message || 'Login failed'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-soc-surface via-soc-bg to-brand-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0L60 30L30 60L0 30Z\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'0.5\'/%3E%3C/svg%3E")', backgroundSize: '60px 60px' }} />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wider text-white">CHENGETO</span>
          </div>
          <p className="text-sm text-soc-muted tracking-widest uppercase mt-1">by Algol Cyber Security</p>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Africa's first<br />
            <span className="text-brand-400">AI-powered</span><br />
            SOC platform
          </h1>
          <p className="text-soc-muted max-w-md leading-relaxed">
            Real-time threat detection, CDPA 2021 compliance tracking, and AI-driven analysis — built for the African enterprise market.
          </p>
          <div className="flex gap-6 text-sm">
            <div><p className="text-2xl font-bold text-white">100%</p><p className="text-soc-muted">CDPA compliant</p></div>
            <div className="w-px bg-soc-border" />
            <div><p className="text-2xl font-bold text-white">90%</p><p className="text-soc-muted">Cost reduction</p></div>
            <div className="w-px bg-soc-border" />
            <div><p className="text-2xl font-bold text-white">24/7</p><p className="text-soc-muted">Monitoring</p></div>
          </div>
        </div>

        <p className="text-xs text-soc-muted/50 relative">
          &copy; {new Date().getFullYear()} Algol Cyber Security — A subsidiary of Algol Insights
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-wider">CHENGETO</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-soc-muted text-sm mb-8">Sign in to access the Security Operations Center</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="input" placeholder="Enter username" autoFocus required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input pr-10" placeholder="Enter password" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-soc-muted hover:text-soc-text">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading || !username || !password} className="btn-primary w-full justify-center py-3">
              {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-soc-border">
            <p className="text-xs text-soc-muted text-center">
              Default credentials — <span className="font-mono text-soc-text">admin</span> / <span className="font-mono text-soc-text">Chengeto@2026!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
