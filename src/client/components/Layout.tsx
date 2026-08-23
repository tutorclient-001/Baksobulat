import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Key,
  Trash2,
  BarChart3,
  Users,
  Settings,
  History,
  LogOut,
  Menu,
  X,
  UploadCloud,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  Tag,
  Database,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  Eye,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Badge } from './Badge.js';

interface LayoutProps {
  children: React.ReactNode;
  onOpenUpload?: () => void;
}

export function Layout({ children, onOpenUpload }: LayoutProps) {
  const { user, logout, isAdmin, isTutor, isViewer, canUpload } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('ljk_sidebar_open');
    if (saved !== null) {
      return saved === 'true';
    }
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Save sidebar preference
  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('ljk_sidebar_open', String(next));
      return next;
    });
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel = isAdmin
    ? 'ADMINISTRATOR'
    : isTutor
    ? 'TUTOR / GURU'
    : 'VIEWER';

  const roleBadgeVariant: 'primary' | 'success' | 'default' = isAdmin
    ? 'primary'
    : isTutor
    ? 'success'
    : 'default';

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* ------------------------------------------------------------- */}
      {/* TOP BAR: Single functional row with Sidebar Toggle, Brand, Actions */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shrink-0">
        <div className="px-3 sm:px-5 h-14 flex items-center justify-between gap-3">
          {/* Zone 1: Sidebar Toggle & Brand */}
          <div className="flex items-center gap-3">
            {/* Desktop Sidebar Toggle */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
              title={sidebarOpen ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
              aria-label="Toggle Sidebar Navigasi"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              )}
            </button>

            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              aria-label="Menu Utama"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Wordmark */}
            <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
                LJK
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-indigo-950 dark:text-indigo-200 leading-none">
                  LJK-Master
                </span>
                <span className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
                  Bank Soal & Kunci OMR
                </span>
              </div>
            </NavLink>
          </div>

          {/* Zone 2: Middle Breadcrumb / Status hint */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sistem Bank Soal Terintegrasi</span>
          </div>

          {/* Zone 3: Actions & User Pill */}
          <div className="flex items-center gap-2 shrink-0">
            {canUpload && onOpenUpload && (
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors whitespace-nowrap"
              >
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Unggah Soal</span>
              </button>
            )}

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-xs">
              <div className="hidden sm:flex flex-col items-end">
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[130px] leading-tight">
                  {user?.name}
                </p>
                <span className="text-[10px] text-slate-400 font-mono uppercase">
                  {roleLabel}
                </span>
              </div>

              <Badge variant={roleBadgeVariant} size="sm">
                {user?.role}
              </Badge>

              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Keluar dari Akun"
                aria-label="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* SPLIT LAYOUT: SIDEBAR + MAIN CONTENT */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden">
        {/* ----------------------------------------------------------- */}
        {/* DESKTOP COLLAPSIBLE SIDEBAR */}
        {/* ----------------------------------------------------------- */}
        {sidebarOpen && (
          <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shrink-0 select-none overflow-y-auto">
            <div className="p-4 flex flex-col gap-6 flex-1">
              {/* Section 1: Menu Utama */}
              <div className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Menu Utama
                </p>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Dashboard Overview</span>
                </NavLink>

                <NavLink
                  to="/documents"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Bank Soal & Kunci LJK</span>
                </NavLink>
              </div>

              {/* Section 2: Quick Upload Button */}
              {canUpload && onOpenUpload && (
                <div className="px-1">
                  <button
                    onClick={onOpenUpload}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>+ Unggah Naskah Soal</span>
                  </button>
                </div>
              )}

              {/* Section 3: Panel Admin - Manajemen Dokumen (ADMIN ONLY) */}
              {isAdmin && (
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono flex items-center justify-between">
                    <span>Manajemen Arsip</span>
                    <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      Admin
                    </span>
                  </p>
                  <NavLink
                    to="/categories"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <FolderKanban className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>Kategori Naskah</span>
                  </NavLink>

                  <NavLink
                    to="/trash"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Trash2 className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>Trash & Pemulihan</span>
                  </NavLink>

                  <NavLink
                    to="/statistics"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <BarChart3 className="w-4 h-4 shrink-0 text-violet-500" />
                    <span>Statistik & Laporan</span>
                  </NavLink>

                  <NavLink
                    to="/users"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Users className="w-4 h-4 shrink-0 text-sky-500" />
                    <span>Manajemen Pengguna</span>
                  </NavLink>

                  <NavLink
                    to="/audit-logs"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <History className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>Riwayat Audit Log</span>
                  </NavLink>
                </div>
              )}

              {/* Section 4: Pengaturan di Sidebar (ADMIN ONLY as requested) */}
              {isAdmin && (
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                    Pengaturan Sistem
                  </p>

                  <NavLink
                    to="/settings?tab=institution"
                    className={({ isActive }) => {
                      const isInstActive =
                        location.pathname === '/settings' &&
                        (location.search === '' || location.search.includes('tab=institution'));
                      return `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isInstActive
                          ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`;
                    }}
                  >
                    <Building2 className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span>Pengaturan Lembaga</span>
                  </NavLink>

                  <NavLink
                    to="/settings?tab=labels"
                    className={({ isActive }) => {
                      const isLabelActive =
                        location.pathname === '/settings' && location.search.includes('tab=labels');
                      return `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isLabelActive
                          ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`;
                    }}
                  >
                    <Tag className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>Label Halaman</span>
                  </NavLink>

                  <NavLink
                    to="/settings?tab=database_guide"
                    className={({ isActive }) => {
                      const isDbActive =
                        location.pathname === '/settings' &&
                        location.search.includes('tab=database_guide');
                      return `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isDbActive
                          ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`;
                    }}
                  >
                    <Database className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Panduan Integrasi DB</span>
                  </NavLink>

                  <NavLink
                    to="/settings?tab=diagnostics"
                    className={({ isActive }) => {
                      const isDiagActive =
                        location.pathname === '/settings' &&
                        location.search.includes('tab=diagnostics');
                      return `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isDiagActive
                          ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`;
                    }}
                  >
                    <HardDrive className="w-4 h-4 shrink-0 text-sky-500" />
                    <span>Diagnostik & Drive</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* Sidebar User Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user?.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">{user?.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* ----------------------------------------------------------- */}
        {/* MOBILE DRAWER OVERLAY */}
        {/* ----------------------------------------------------------- */}
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer Surface */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-10">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    LJK
                  </div>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    LJK-Master
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 flex flex-col gap-5 flex-1 overflow-y-auto">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Menu Utama
                  </p>
                  <NavLink
                    to="/dashboard"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </NavLink>
                  <NavLink
                    to="/documents"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Bank Soal & Kunci LJK</span>
                  </NavLink>
                </div>

                {canUpload && onOpenUpload && (
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onOpenUpload();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Unggah Naskah Soal</span>
                  </button>
                )}

                {isAdmin && (
                  <>
                    <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Manajemen Arsip (Admin)
                      </p>
                      <NavLink
                        to="/categories"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <FolderKanban className="w-4 h-4" />
                        <span>Kategori Naskah</span>
                      </NavLink>
                      <NavLink
                        to="/trash"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                        <span>Trash & Pemulihan</span>
                      </NavLink>
                      <NavLink
                        to="/statistics"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <BarChart3 className="w-4 h-4 text-violet-500" />
                        <span>Statistik & Laporan</span>
                      </NavLink>
                      <NavLink
                        to="/users"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <Users className="w-4 h-4 text-sky-500" />
                        <span>Manajemen Pengguna</span>
                      </NavLink>
                      <NavLink
                        to="/audit-logs"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <History className="w-4 h-4" />
                        <span>Riwayat Audit Log</span>
                      </NavLink>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Pengaturan Sistem (Admin)
                      </p>
                      <NavLink
                        to="/settings?tab=institution"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        <span>Pengaturan Lembaga</span>
                      </NavLink>
                      <NavLink
                        to="/settings?tab=labels"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <Tag className="w-4 h-4 text-emerald-500" />
                        <span>Label Halaman</span>
                      </NavLink>
                      <NavLink
                        to="/settings?tab=database_guide"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <Database className="w-4 h-4 text-amber-500" />
                        <span>Panduan Integrasi DB</span>
                      </NavLink>
                      <NavLink
                        to="/settings?tab=diagnostics"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <HardDrive className="w-4 h-4 text-sky-500" />
                        <span>Diagnostik & Drive</span>
                      </NavLink>
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user?.name}</p>
                  <Badge variant={roleBadgeVariant} size="sm">
                    {user?.role}
                  </Badge>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* RIGHT MAIN PAGE CONTENT (SPLIT AREA) */}
        {/* ----------------------------------------------------------- */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
