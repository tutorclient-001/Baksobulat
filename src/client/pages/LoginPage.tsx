import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Key, AlertCircle, GraduationCap, Eye, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await login(email, password);
      toast.success('Login Berhasil', 'Selamat datang di LJK-Master Bank Soal.');
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Email atau kata sandi tidak valid.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-md mb-3">
          LJK
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          LJK-Master Bank Soal
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Sistem Repositori Soal, Editor Kunci LJK OMR, & Panduan Integrasi Database
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl border border-slate-200/80 dark:border-slate-800 sm:rounded-2xl flex flex-col gap-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@banksoal.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-all disabled:opacity-50"
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider mb-2 text-center">
              Pilih Akun Demo Cepat (3 Peran Pengguna):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@banksoal.sch.id', 'Admin#2026!')}
                className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 text-left hover:bg-indigo-100 transition-colors"
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <Crown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Admin</span>
                </div>
                <span className="text-[10px] text-slate-500 block truncate mt-0.5">Akses Penuh & Setup</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('tutorclient001@gmail.com', 'Tutor#2026!')}
                className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 text-left hover:bg-emerald-100 transition-colors"
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tutor / Guru</span>
                </div>
                <span className="text-[10px] text-slate-500 block truncate mt-0.5">Upload, Edit & KJ</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('viewer@banksoal.sch.id', 'Viewer#2026!')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1 font-bold text-xs">
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>Viewer</span>
                </div>
                <span className="text-[10px] text-slate-500 block truncate mt-0.5">Pratinjau & Unduh</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
