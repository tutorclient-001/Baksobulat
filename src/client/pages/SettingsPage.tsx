import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings,
  HardDrive,
  Database,
  Building,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Activity,
  Tag,
  Copy,
  Check,
  Server,
  FileCode,
  Shield,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { InstitutionSettings } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { useToast } from '../context/ToastContext.js';

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'institution';

  const [settings, setSettings] = useState<InstitutionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Diagnostics state
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);

  // Reconciliation state
  const [isReconciling, setIsReconciling] = useState(false);
  const [recReport, setRecReport] = useState<any>(null);

  // Page labels / branding customization state
  const [pageLabels, setPageLabels] = useState({
    systemName: 'LJK-Master',
    systemTagline: 'Bank Soal & Pengelolaan Lembar Jawaban Komputer Terintegrasi',
    codePrefix: 'SMK-UJN',
    defaultHeaderTitle: 'Bank Soal Ujian & LJK',
    showOmrSimulator: true,
    enableWatermark: true,
  });

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const toast = useToast();

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<InstitutionSettings>('/settings/institution');
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (err: any) {
      toast.error('Gagal Memuat Pengaturan', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    handleTestDrive();
    handleTestDb();

    // Load saved labels from local storage if available
    const savedLabels = localStorage.getItem('ljk_page_labels');
    if (savedLabels) {
      try {
        setPageLabels(JSON.parse(savedLabels));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      const res = await apiClient.put('/settings/institution', settings);
      if (res.success) {
        toast.success('Pengaturan Disimpan', 'Identitas institusi dan kebijakan file berhasil diperbarui.');
      } else {
        toast.error('Gagal Menyimpan', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Menyimpan', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLabels = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('ljk_page_labels', JSON.stringify(pageLabels));
    toast.success('Label Berhasil Disimpan', 'Konfigurasi label halaman & branding telah diperbarui.');
  };

  const handleTestDrive = async () => {
    setIsTestingDrive(true);
    try {
      const res = await apiClient.get('/settings/test-drive');
      if (res.success && res.data) {
        setDriveStatus(res.data);
      }
    } catch (err: any) {
      setDriveStatus({ healthy: false, message: err.message });
    } finally {
      setIsTestingDrive(false);
    }
  };

  const handleTestDb = async () => {
    setIsTestingDb(true);
    try {
      const res = await apiClient.get('/settings/test-database');
      if (res.success && res.data) {
        setDbStatus(res.data);
      }
    } catch (err: any) {
      setDbStatus({ healthy: false, message: err.message });
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleRunReconciliation = async () => {
    setIsReconciling(true);
    try {
      const res = await apiClient.post('/reconciliation/run');
      if (res.success && res.data) {
        setRecReport(res.data);
        toast.success('Rekonsiliasi Berhasil', `Diperiksa: ${res.data.totalChecked} berkas.`);
      } else {
        toast.error('Gagal Menjalankan Rekonsiliasi', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Rekonsiliasi', err.message);
    } finally {
      setIsReconciling(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success('Tersalin ke Clipboard', 'Teks telah disalin.');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500">Memuat konfigurasi sistem...</p>
      </div>
    );
  }

  const sqlSchemaSnippet = `-- Skema Database PostgreSQL untuk LJK-Master Bank Soal
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'TUTOR', -- 'ADMIN', 'TUTOR', 'VIEWER'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(64) PRIMARY KEY,
  document_code VARCHAR(64) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id VARCHAR(64) REFERENCES categories(id),
  academic_year VARCHAR(32) NOT NULL,
  semester VARCHAR(16) NOT NULL,
  subject VARCHAR(128) NOT NULL,
  grade VARCHAR(64) NOT NULL,
  question_count INT NOT NULL DEFAULT 40,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_by VARCHAR(64) REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS document_files (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) REFERENCES documents(id) ON DELETE CASCADE,
  google_drive_file_id VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  file_type VARCHAR(32) NOT NULL, -- 'QUESTION' or 'ANSWER_KEY'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answer_keys (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  total_questions INT NOT NULL,
  passing_score NUMERIC(5,2) DEFAULT 75,
  max_score NUMERIC(6,2) DEFAULT 100,
  items_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

  const envConfigSnippet = `# Konfigurasi Database PostgreSQL
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB_NAME]?sslmode=require

# Konfigurasi Google Drive Service Account
GOOGLE_DRIVE_FOLDER_ID=1abc...XYZ
GOOGLE_SERVICE_ACCOUNT_EMAIL=bank-soal-drive@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Konfigurasi Keamanan JWT
AUTH_SECRET=rahasia-super-aman-kunci-jwt-bank-soal-2026`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Pengaturan & Panduan Integrasi Sistem
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Panel Administrator untuk mengonfigurasi lembaga, label halaman, panduan database, dan penyimpanan Google Drive.
          </p>
        </div>
      </div>

      {/* Tab Navigation Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setTab('institution')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'institution'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>1. Pengaturan Lembaga</span>
        </button>

        <button
          onClick={() => setTab('labels')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'labels'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>2. Label Halaman & Branding</span>
        </button>

        <button
          onClick={() => setTab('database_guide')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'database_guide'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>3. Panduan Integrasi ke Database</span>
        </button>

        <button
          onClick={() => setTab('diagnostics')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'diagnostics'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>4. Diagnostik & Storage Drive</span>
        </button>
      </div>

      {/* TAB 1: PENGATURAN LEMBAGA */}
      {activeTab === 'institution' && (
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              Identitas & Informasi Lembaga / Sekolah
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lembaga / Sekolah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.institution_name}
                  onChange={(e) => setSettings({ ...settings, institution_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Kontak Resmi
                </label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap Lembaga
                </label>
                <textarea
                  rows={2}
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tahun Pelajaran Aktif
                </label>
                <input
                  type="text"
                  value={settings.academic_year_active || '2025/2026'}
                  onChange={(e) =>
                    setSettings({ ...settings, academic_year_active: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Semester Aktif Default
                </label>
                <select
                  value={settings.semester_active || 'GENAP'}
                  onChange={(e) =>
                    setSettings({ ...settings, semester_active: e.target.value as any })
                  }
                  aria-label="Pilih Semester Aktif"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                >
                  <option value="GANJIL">Semester Ganjil</option>
                  <option value="GENAP">Semester Genap</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batas Maksimal Ukuran File (MB)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.max_file_size_mb || 25}
                  onChange={(e) =>
                    setSettings({ ...settings, max_file_size_mb: parseInt(e.target.value, 10) || 25 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Lembaga'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-4 text-xs">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">
              Informasi Status Sistem
            </h3>
            <p className="text-slate-500 leading-relaxed">
              Pengaturan institusi di atas akan digunakan sebagai metadata cetak pada lembar jawaban, header ekspor Excel, dan konfigurasi default naskah soal yang baru diunggah oleh guru & tutor.
            </p>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Penyimpanan:</span>
                <span className="font-semibold text-indigo-600">Google Drive API</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Database:</span>
                <span className="font-semibold text-emerald-600">
                  {dbStatus?.isPostgres ? 'PostgreSQL (Cloud)' : 'Active Store'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Terakhir Diperbarui:</span>
                <span className="text-slate-400 font-mono">
                  {new Date(settings.updated_at).toLocaleDateString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: LABEL HALAMAN & BRANDING */}
      {activeTab === 'labels' && (
        <form onSubmit={handleSaveLabels} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              Kustomisasi Label Halaman & Format Penomoran
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Brand / Judul Aplikasi
                </label>
                <input
                  type="text"
                  value={pageLabels.systemName}
                  onChange={(e) => setPageLabels({ ...pageLabels, systemName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tagline & Deskripsi Header
                </label>
                <input
                  type="text"
                  value={pageLabels.systemTagline}
                  onChange={(e) => setPageLabels({ ...pageLabels, systemTagline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Prefix Kode Soal Otomatis
                </label>
                <input
                  type="text"
                  value={pageLabels.codePrefix}
                  onChange={(e) => setPageLabels({ ...pageLabels, codePrefix: e.target.value })}
                  placeholder="Contoh: SMK-UJN"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Contoh hasil: {pageLabels.codePrefix}-2026-001
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Halaman Katalog Utama
                </label>
                <input
                  type="text"
                  value={pageLabels.defaultHeaderTitle}
                  onChange={(e) =>
                    setPageLabels({ ...pageLabels, defaultHeaderTitle: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Kustomisasi Label</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3 text-xs">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Pratinjau Tampilan Label</h3>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {pageLabels.systemName}
              </span>
              <p className="text-[11px] text-slate-500 leading-snug">{pageLabels.systemTagline}</p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                  Kode: {pageLabels.codePrefix}-2026-X12
                </span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: PANDUAN INTEGRASI KE DATABASE */}
      {activeTab === 'database_guide' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-500" />
                  Panduan Lengkap Integrasi Database PostgreSQL / Cloud SQL
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Langkah demi langkah menyambungkan database persisten mandiri ke LJK-Master Bank Soal.
                </p>
              </div>

              <button
                onClick={handleTestDb}
                disabled={isTestingDb}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
                <span>Uji Koneksi DB Sekarang</span>
              </button>
            </div>

            {/* Step by Step Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Siapkan Database PostgreSQL
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  Gunakan provider cloud database PostgreSQL seperti Google Cloud SQL, Supabase, Neon.tech, atau PostgreSQL lokal.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Jalankan SQL Schema Script
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  Eksekusi skrip DDL SQL di bawah pada database Anda untuk membuat tabel users, documents, files, answer_keys, dan categories.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Atur Environment Variables
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  Masukkan variabel <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">DATABASE_URL</code> pada konfigurasi runtime/server Anda.
                </p>
              </div>
            </div>

            {/* Code Snippet: Environment Variables */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-indigo-600" />
                  Format Environment Variables (.env)
                </span>
                <button
                  onClick={() => copyToClipboard(envConfigSnippet, 'env')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  {copiedCode === 'env' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'env' ? 'Tersalin' : 'Salin Konfigurasi'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 text-indigo-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
                {envConfigSnippet}
              </pre>
            </div>

            {/* Code Snippet: SQL Schema DDL */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-emerald-600" />
                  Skrip Struktur Tabel PostgreSQL (DDL Schema)
                </span>
                <button
                  onClick={() => copyToClipboard(sqlSchemaSnippet, 'sql')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                >
                  {copiedCode === 'sql' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'sql' ? 'Tersalin' : 'Salin SQL Schema'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800 max-h-72">
                {sqlSchemaSnippet}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DIAGNOSTIK & DRIVE STORAGE */}
      {activeTab === 'diagnostics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Diagnostic Google Drive */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-sky-500" />
                Diagnostik Google Drive Storage
              </h3>
              <button
                onClick={handleTestDrive}
                disabled={isTestingDrive}
                className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                title="Uji Ulang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingDrive ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Status Koneksi API:</span>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    driveStatus?.healthy ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {driveStatus?.healthy ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {driveStatus?.healthy ? 'Terhubung (Aktif)' : 'Mode Mock Storage'}
                </span>
              </div>

              {driveStatus?.message && (
                <p className="text-[11px] text-slate-500 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  {driveStatus.message}
                </p>
              )}
            </div>
          </div>

          {/* Diagnostic Database */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                Diagnostik Database Server
              </h3>
              <button
                onClick={handleTestDb}
                disabled={isTestingDb}
                className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                title="Uji Ulang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Driver & Engine:</span>
                <span className="font-semibold text-indigo-600">
                  {dbStatus?.isPostgres ? 'PostgreSQL Pool' : 'In-Memory Secure Store'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Status Ping Query:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {dbStatus?.healthy ? 'Sehat (Healthy)' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Rekonsiliasi Storage & Database */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-500" />
                  Alat Rekonsiliasi Integritas Berkas
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Memeriksa kesesuaian antara catatan file pada database dengan objek file aktual di Google Drive.
                </p>
              </div>

              <button
                onClick={handleRunReconciliation}
                disabled={isReconciling}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isReconciling ? 'Memeriksa Berkas...' : 'Jalankan Rekonsiliasi'}</span>
              </button>
            </div>

            {recReport && (
              <div className="p-4 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 text-xs">
                <p className="font-bold text-violet-900 dark:text-violet-200 mb-2">
                  Hasil Laporan Rekonsiliasi:
                </p>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-violet-200 dark:border-violet-800">
                    <span className="block text-slate-400 text-[10px]">Total Diperiksa:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{recReport.totalChecked || 0} file</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <span className="block text-slate-400 text-[10px]">Sinkron & Valid:</span>
                    <span className="font-bold text-emerald-600">{recReport.healthyCount || recReport.totalChecked || 0} file</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-rose-200 dark:border-rose-800">
                    <span className="block text-slate-400 text-[10px]">Anomali / Yatim:</span>
                    <span className="font-bold text-rose-600">{recReport.missingFiles?.length || 0} file</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
