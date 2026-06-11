'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, Eye, EyeOff, Scissors, Sparkles, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      login(response.data.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col md:grid md:grid-cols-12 bg-slate-950 overflow-hidden relative">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(-8deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(12deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.08); }
        }
        @keyframes draw-path {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-float-1 { animation: float-slow 7s ease-in-out infinite; }
        .animate-float-2 { animation: float-medium 9s ease-in-out infinite; }
        .animate-float-3 { animation: float-fast 5s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 6s ease-in-out infinite; }
      `}} />

      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

      {/* Left panel: Styling graphics & branding */}
      <div className="hidden md:flex md:col-span-5 lg:col-span-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800/80">
        {/* Pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Branding/Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">TailorPro</h1>
            <p className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">Atelier ERP</p>
          </div>
        </div>

        {/* Central SVG Graphic */}
        <div className="relative flex items-center justify-center py-8 z-10">
          <svg viewBox="0 0 500 500" className="w-full max-w-[400px] mx-auto filter drop-shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="mannequinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="50%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#312e81" />
              </linearGradient>
              <linearGradient id="tapeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Ambient Glow */}
            <circle cx="250" cy="250" r="200" fill="url(#glow)" className="animate-pulse-glow" />

            {/* Grid Lines */}
            <g opacity="0.08" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="5,5">
              <line x1="50" y1="250" x2="450" y2="250" />
              <line x1="250" y1="50" x2="250" y2="450" />
              <circle cx="250" cy="250" r="180" fill="none" />
              <circle cx="250" cy="250" r="100" fill="none" />
            </g>

            {/* Animated Pattern Line */}
            <path d="M150 150 L250 100 L350 150 L300 350 L200 350 Z" fill="none" stroke="url(#accentLine)" strokeWidth="2" strokeDasharray="1000" strokeDashoffset="1000" style={{ animation: 'draw-path 15s linear infinite' }} />

            {/* Mannequin / Dress Form */}
            {/* Hanger Hook */}
            <path d="M250 100 C240 80 260 70 250 60 C240 50 245 40 250 40 C255 40 260 50 250 60" fill="none" stroke="#818cf8" strokeWidth="4" strokeLinecap="round" />
            {/* Neck */}
            <rect x="242" y="100" width="16" height="20" rx="3" fill="#4f46e5" />
            {/* Torso */}
            <path d="M185 140 C210 125 290 125 315 140 C335 170 305 240 285 320 C275 350 225 350 215 320 C195 240 165 170 185 140 Z" fill="url(#mannequinGrad)" />
            {/* Waist Lines */}
            <path d="M202 240 Q250 252 298 240" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
            <path d="M208 280 Q250 292 292 280" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />

            {/* Stand */}
            <rect x="246" y="348" width="8" height="95" fill="#312e81" />
            <path d="M210 443 L290 443 C290 443 280 430 250 430 C220 430 210 443 210 443 Z" fill="#1e1b4b" />
            <path d="M230 443 L210 458" stroke="#1e1b4b" strokeWidth="6" strokeLinecap="round" />
            <path d="M270 443 L290 458" stroke="#1e1b4b" strokeWidth="6" strokeLinecap="round" />

            {/* Measuring Tape */}
            <path d="M165 180 Q260 215 325 170 C305 220 230 245 175 225 Q270 285 315 325" fill="none" stroke="url(#tapeGrad)" strokeWidth="5" strokeLinecap="round" className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
            <path d="M165 180 Q260 215 325 170 C305 220 230 245 175 225 Q270 285 315 325" fill="none" stroke="#78350f" strokeWidth="5" strokeLinecap="round" strokeDasharray="1.5,5.5" opacity="0.6" />

            {/* Floatings */}
            {/* Scissor */}
            <g transform="translate(85, 130)" className="animate-float-1 text-indigo-400/80">
              <path d="M0 0 L12 12 M12 0 L0 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="-2.5" cy="-2.5" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="14.5" cy="-2.5" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
            </g>
            {/* Button */}
            <g transform="translate(385, 115)" className="animate-float-2 text-pink-400/80">
              <circle cx="10" cy="10" r="11" fill="currentColor" />
              <circle cx="10" cy="10" r="9" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.5" />
              <circle cx="7.5" cy="7.5" r="1.2" fill="#fff" />
              <circle cx="12.5" cy="7.5" r="1.2" fill="#fff" />
              <circle cx="7.5" cy="12.5" r="1.2" fill="#fff" />
              <circle cx="12.5" cy="12.5" r="1.2" fill="#fff" />
            </g>
            {/* Thread Reel */}
            <g transform="translate(375, 310)" className="animate-float-3 text-amber-400/85">
              <rect x="0" y="4" width="16" height="22" rx="2" fill="currentColor" />
              <line x1="0" y1="8" x2="16" y2="8" stroke="#fff" strokeWidth="1.2" />
              <line x1="0" y1="12" x2="16" y2="12" stroke="#fff" strokeWidth="1.2" />
              <line x1="0" y1="16" x2="16" y2="16" stroke="#fff" strokeWidth="1.2" />
              <line x1="0" y1="20" x2="16" y2="20" stroke="#fff" strokeWidth="1.2" />
              <rect x="2.5" y="0" width="11" height="4" fill="#b45309" />
              <rect x="2.5" y="26" width="11" height="4" fill="#b45309" />
            </g>
          </svg>
        </div>

        {/* Footer text */}
        <div className="relative z-10">
          <p className="text-sm font-medium text-slate-200">
            Precision, Elegance & Modern Management
          </p>
          <p className="text-xs text-slate-400 mt-1">
            TailorPro integrates your measurements, custom orders, and invoicing in one high-performance platform.
          </p>
        </div>
      </div>

      {/* Right panel: Login Form */}
      <div className="flex col-span-1 md:col-span-7 lg:col-span-6 items-center justify-center p-6 sm:p-12 lg:p-16 relative z-10">
        
        {/* Mobile Header (hidden on md+) */}
        <div className="absolute top-6 left-6 flex md:hidden items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">TailorPro</span>
        </div>

        <div className="w-full max-w-[420px] space-y-8">
          <div className="text-center md:text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modern Atelier Management</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Welcome back
            </h2>
            <p className="text-sm text-slate-400">
              Sign in to manage your workshop orders and customers
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Ambient card tint */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-6 animate-in fade-in slide-in-from-top-1 duration-200">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail className="w-4.5 h-4.5" />
                  </span>
                  <Input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    placeholder="admin@tailorpro.com"
                    className="w-full pl-11 pr-4 py-6 bg-slate-950/60 border-slate-800/80 focus:border-indigo-500 focus:ring-indigo-500/10 text-white placeholder-slate-500 rounded-xl transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                </div>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-4.5 h-4.5" />
                  </span>
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-6 bg-slate-950/60 border-slate-800/80 focus:border-indigo-500 focus:ring-indigo-500/10 text-white placeholder-slate-500 rounded-xl transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 active:text-slate-100 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full py-6 mt-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/15 hover:shadow-indigo-500/25 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

