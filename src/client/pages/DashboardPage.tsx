import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileText,
  Key,
  FolderKanban,
  Download,
  Eye,
  Plus,
  ArrowRight,
  Sparkles,
  Clock,
  HardDrive,
  FileSpreadsheet,
  Search,
  Tag,
} from 'lucide-react';
import { StatisticsOverview, DocumentRecord, QuestionType, LevelRecord, TagRecord } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { Badge } from '../components/Badge.js';
import { useAuth } from '../context/AuthContext.js';

interface DashboardPageProps {
  onOpenUpload: () => void;
  onOpenPreview: (doc: DocumentRecord) => void;
  onOpenLjk: (doc: DocumentRecord) => void;
  onOpenExcelExport?: (doc: DocumentRecord) => void;
}

export function DashboardPage({
  onOpenUpload,
  onOpenPreview,
  onOpenLjk,
  onOpenExcelExport,
}: DashboardPageProps) {
  const [stats, setStats] = useState<StatisticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levels, setLevels] = useState<LevelRecord[]>([]);
  const [popularTags, setPopularTags] = useState<TagRecord[]>([]);
  const { isAdmin, canUpload } = useAuth();
  const navigate = useNavigate();

  // Interactive Bento LJK quick demo state for instant playground feeling
  const [demoSelectedType, setDemoSelectedType] = useState<QuestionType>('PG');
  const [demoAnswers, setDemoAnswers] = useState<Record<number, string>>({
    1: 'A',
    2: 'C',
    3: 'B',
    4: 'D',
    5: 'A',
    6: 'E',
    7: 'B',
    8: 'C',
    9: 'A',
    10: 'D',
  });

  useEffect(() => {
    async function loadStatsAndMaster() {
      try {
        const [statsRes, masterRes] = await Promise.allSettled([
          apiClient.get<StatisticsOverview>('/statistics/overview'),
          apiClient.get<{ levels: LevelRecord[]; tags: TagRecord[] }>('/master/all'),
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value.success && statsRes.value.data) {
          setStats(statsRes.value.data);
        }

        if (masterRes.status === 'fulfilled' && masterRes.value.success && masterRes.value.data) {
          setLevels(masterRes.value.data.levels || []);
          setPopularTags(masterRes.value.data.tags || []);
        }
      } catch (e) {
        console.error('Failed to load stats/master:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadStatsAndMaster();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/documents?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/documents');
    }
  };

  const handleLevelClick = (levelCode: string) => {
    navigate(`/documents?search=${encodeURIComponent(levelCode)}`);
  };

  const handleTagClick = (tagName: string) => {
    navigate(`/documents?search=${encodeURIComponent(tagName)}`);
  };

  const handleDemoBubbleClick = (num: number, opt: string) => {
    setDemoAnswers((prev) => ({
      ...prev,
      [num]: opt,
    }));
  };

  const statCards = [
    {
      title: 'Total Naskah Soal',
      value: stats?.totalActiveDocuments || 0,
      icon: FileText,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      accent: 'border-l-4 border-l-indigo-600',
      desc: 'Dokumen aktif di Bank Soal',
    },
    {
      title: 'Kunci LJK Terkonfigurasi',
      value: stats?.totalAnswerKeys || 0,
      icon: Key,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      accent: 'border-l-4 border-l-emerald-500',
      desc: 'Siap ekspor & koreksi',
    },
    {
      title: 'Kategori Ujian',
      value: stats?.totalCategories || 0,
      icon: FolderKanban,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      accent: 'border-l-4 border-l-sky-500',
      desc: 'UTS, UAS, Tryout, dll',
    },
    {
      title: 'Total Akses & Unduhan',
      value: (stats?.totalDownloads || 0) + (stats?.totalPreviews || 0),
      icon: Download,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      accent: 'border-l-4 border-l-violet-500',
      desc: 'Pratinjau split & unduhan file',
    },
  ];

  const firstDoc = stats?.recentUploads?.[0] || null;

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------- */}
      {/* USER REQUESTED: SEARCH HERO HEADER */}
      {/* "ganti dengan kolom pencarian file soal dengan tulisan */}
      {/*  Temukan Bank Soal dalam Hitungan Detik */}
      {/*  dibawahnya kolom pencarian tombol cari disampingnya tombol Upload, */}
      {/*  hilangkan menu katalog bank soal" */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-850 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-700/30 relative overflow-hidden">
        {/* Subtle decorative mesh background */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          {/* Main Title Banner */}
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/30 border border-indigo-400/30 text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono">
              Pusat Repositori & Kunci Jawaban
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Temukan Bank Soal dalam Hitungan Detik
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/90 mt-1.5 leading-relaxed">
            Cari naskah ujian resmi, kunci LJK scanner-ready, dan lembar Excel berdasarkan jenjang, kelas, mata pelajaran, atau topik.
          </p>

          {/* Search Bar Form */}
          <form onSubmit={handleSearchSubmit} className="mt-5 flex flex-col gap-3">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Ketik kata kunci, kode naskah, mata pelajaran, materi, atau topik soal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-400/30 shadow-lg"
              />
            </div>

            {/* Action Buttons: Tombol Cari di sampingnya Tombol Upload */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span>Cari</span>
              </button>

              {canUpload && (
                <button
                  type="button"
                  onClick={onOpenUpload}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload</span>
                </button>
              )}

              {/* Master Filter Quick Chips */}
              <div className="hidden md:flex items-center gap-1.5 ml-auto text-xs text-indigo-200">
                <span className="text-[11px] text-indigo-300 font-medium">Jenjang Populer:</span>
                {levels.slice(0, 4).map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => handleLevelClick(lvl.code)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-800/60 hover:bg-indigo-700/80 border border-indigo-700/50 text-[11px] font-semibold text-indigo-100 transition-colors"
                  >
                    {lvl.code}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Popular Tag Chips */}
          {popularTags && popularTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-indigo-800/60 text-[11px]">
              <span className="text-indigo-300 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Tags:
              </span>
              {popularTags.slice(0, 6).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagClick(tag.name)}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-indigo-100 transition-colors font-mono text-[10px]"
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BENTO STATS METRICS (4 TILES) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className={`p-4 rounded-2xl border ${c.bgColor} ${c.accent} shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.title}</span>
                <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                  {isLoading ? '...' : c.value}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{c.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRIMARY BENTO GRID: 12 COLS MODULAR TILES */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-12 gap-5">
        {/* ============================================================= */}
        {/* BENTO TILE 1 (Col 8): DAFTAR NASKAH SOAL & KUNCI JAWABAN */}
        {/* ============================================================= */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">
          {/* Bento Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Daftar Kunci Jawaban & Bank Soal Terkini
              </h2>
            </div>
            <NavLink
              to="/documents"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Lihat Semua Bank Soal →
            </NavLink>
          </div>

          {/* Bento Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-4">Kode & Judul</th>
                  <th className="py-2.5 px-3">Jenjang / Mapel / Kelas</th>
                  <th className="py-2.5 px-3">Status Kunci LJK</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats?.recentUploads && stats.recentUploads.length > 0 ? (
                  stats.recentUploads.slice(0, 5).map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            {doc.document_code}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-xs">
                            {doc.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {doc.category_name} • {doc.academic_year}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1">
                          {doc.level_name && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold">
                              {doc.level_name}
                            </span>
                          )}
                          <span>{doc.subject}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Kelas {doc.grade}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={doc.has_answer_key ? 'success' : 'warning'} size="sm">
                          {doc.has_answer_key ? '✓ Terkunci LJK' : 'Belum Ada'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenPreview(doc)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Pratinjau PDF Soal"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => onOpenLjk(doc)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Kelola Kunci Jawaban LJK"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}
                          {onOpenExcelExport && (
                            <button
                              onClick={() => onOpenExcelExport(doc)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Unduh Format Excel"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Belum ada dokumen soal. Klik "Upload" untuk memulai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============================================================= */}
        {/* BENTO TILE 2 (Col 4): LIVE PDF PREVIEW / FILE INFO TILE */}
        {/* ============================================================= */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Pratinjau PDF Soal & Split Info
              </h2>
            </div>
            {firstDoc && (
              <span className="font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                {firstDoc.document_code}
              </span>
            )}
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between gap-3">
            {firstDoc ? (
              <>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Dokumen Terpilih
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {firstDoc.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{firstDoc.subject}</span>
                    <span>•</span>
                    <span>Kelas {firstDoc.grade}</span>
                    <span>•</span>
                    <span className="font-mono">{firstDoc.academic_year}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Status Kunci Jawaban:
                    </span>
                    <Badge variant={firstDoc.has_answer_key ? 'success' : 'warning'} size="sm">
                      {firstDoc.has_answer_key ? '✓ Terisi' : 'Kosong'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      Penyimpanan:
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Google Drive Protected
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => onOpenPreview(firstDoc)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Split Screen Preview</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => onOpenLjk(firstDoc)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                      title="Atur Kunci LJK"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">
                Belum ada dokumen yang dapat dipratinjau.
              </div>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* BENTO TILE 3 (Col 8): INTERACTIVE LJK CONFIG & BUBBLE SIMULATOR */}
        {/* ============================================================= */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Konfigurasi LJK & Visual Bubble Grid
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
              {(['PG', 'PGK', 'TF', 'ESSAY'] as QuestionType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDemoSelectedType(t)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    demoSelectedType === t
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="text-[11px]">
                Pratinjau Interaktif Lembar Jawaban Komputer (Nomor 1 - 10):
              </span>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                Standar OMR / Scanner Ready
              </span>
            </div>

            {/* Bubble Grid Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3.5 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const currentAnswer = demoAnswers[num] || 'A';
                return (
                  <div
                    key={num}
                    className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">No. {num}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{demoSelectedType}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                        const isSelected = currentAnswer === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleDemoBubbleClick(num, opt)}
                            className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border border-indigo-600 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hint & Direct Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs">
              <span className="text-[11px] text-slate-500">
                Pilih opsi di atas untuk menguji coba visual scanner LJK. Kunci penuh dapat dikelola per dokumen.
              </span>
              <NavLink
                to="/documents"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
              >
                Buka Editor LJK Lengkap
                <ArrowRight className="w-3 h-3" />
              </NavLink>
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* BENTO TILE 4 (Col 4): EMERALD EXCEL LJK HIGHLIGHT TILE */}
        {/* ============================================================= */}
        <div className="col-span-12 lg:col-span-4 bg-emerald-600 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          {/* Subtle Background Rings */}
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-emerald-500/40 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-700/50 rounded-full blur-md pointer-events-none" />

          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 text-white border border-white/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold tracking-tight">
              Ekspor Format LJK Otomatis (.xlsx)
            </h3>
            <p className="text-xs text-emerald-100 mt-1.5 leading-relaxed">
              Unduh lembar penilaian siswa, master kunci jawaban, formula skor instan, dan rekap nilai siap cetak dalam bentuk file Excel resmi.
            </p>
          </div>

          <div className="relative z-10 mt-6 pt-4 border-t border-emerald-500/60 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-emerald-100">
              Formula Otomatis & Nilai
            </span>
            <NavLink
              to="/documents"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <span>Buka Menu Ekspor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
