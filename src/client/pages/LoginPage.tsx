import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, GraduationCap, Eye, EyeOff, Crown, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      await login(email.trim().toLowerCase(), password);
      toast.success('Login Berhasil', 'Selamat datang di Bank Soal PDF!');
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Email atau kata sandi tidak valid. Pastikan penulisan huruf besar/kecil benar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-md mb-3">
          LJK
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Bank Soal & Kunci LJK
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Sistem Repositori Soal, Editor Kunci LJK OMR, & Manajemen Arsip Ujian
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl border border-slate-200/80 dark:border-slate-800 sm:rounded-2xl flex flex-col gap-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Gagal Masuk</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="admin@banksoal.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Sembunyikan</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Kata Sandi</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
            <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider mb-2.5 text-center">
              Pilihan Akun Siap Pakai (Klik untuk Isi Otomatis):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@banksoal.sch.id', 'Admin#2026!')}
                className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 text-left hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Crown className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Admin 1</span>
                  </div>
                  <span className="text-[10px] font-mono bg-indigo-200/60 dark:bg-indigo-900 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-300">Admin</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-1">admin@banksoal.sch.id</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Sandi: Admin#2026!</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin2@banksoal.sch.id', 'Admin2#2026!')}
                className="p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 text-left hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Admin 2</span>
                  </div>
                  <span className="text-[10px] font-mono bg-purple-200/60 dark:bg-purple-900 px-1.5 py-0.5 rounded text-purple-800 dark:text-purple-300">Admin</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-1">admin2@banksoal.sch.id</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Sandi: Admin2#2026!</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('tutorclient001@gmail.com', 'Tutor#2026!')}
                className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 text-left hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors sm:col-span-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Akun Anda (Admin / Tutor)</span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-200/60 dark:bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-300">ADMIN</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-1">tutorclient001@gmail.com</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Sandi: Tutor#2026!</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
