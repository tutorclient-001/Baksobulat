import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Key,
  Download,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  MoreVertical,
  ExternalLink,
  Tag,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { DocumentRecord, Category, DocumentFilterParams, Pagination as PaginationType } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { FilterBar } from '../components/FilterBar.js';
import { Pagination } from '../components/Pagination.js';
import { Badge } from '../components/Badge.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

interface DocumentsPageProps {
  categories: Category[];
  onOpenUpload: () => void;
  onOpenPreview: (doc: DocumentRecord) => void;
  onOpenLjk: (doc: DocumentRecord) => void;
  onOpenExcelExport: (doc: DocumentRecord) => void;
  onOpenEdit: (doc: DocumentRecord) => void;
}

export function DocumentsPage({
  categories,
  onOpenUpload,
  onOpenPreview,
  onOpenLjk,
  onOpenExcelExport,
  onOpenEdit,
}: DocumentsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState<DocumentFilterParams>({
    page: 1,
    limit: 10,
    status: 'ACTIVE',
    search: searchParams.get('search') || undefined,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [trashDocTarget, setTrashDocTarget] = useState<DocumentRecord | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<DocumentRecord | null>(null);
  const [isTrashing, setIsTrashing] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  const { isAdmin, canUpload, canEdit } = useAuth();
  const toast = useToast();

  // Sync URL search param changes into filter
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl !== null && searchFromUrl !== filters.search) {
      setFilters((prev) => ({ ...prev, search: searchFromUrl, page: 1 }));
    }
  }, [searchParams]);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ documents: DocumentRecord[]; pagination: PaginationType }>(
        '/documents',
        filters
      );
      if (res.success && res.data) {
        setDocuments(res.data.documents || []);
        setPagination(
          res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }
        );
      }
    } catch (err: any) {
      toast.error('Gagal Memuat Bank Soal', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveActionMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleFilterChange = (newFilters: Partial<DocumentFilterParams>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      if (newFilters.search !== undefined) {
        if (newFilters.search) {
          setSearchParams({ search: newFilters.search });
        } else {
          setSearchParams({});
        }
      }
      return updated;
    });
  };

  const handleResetFilters = () => {
    setSearchParams({});
    setFilters({
      page: 1,
      limit: 10,
      status: 'ACTIVE',
      search: undefined,
    });
  };

  const handleConfirmTrash = async () => {
    if (!trashDocTarget) return;
    setIsTrashing(true);
    try {
      const res = await apiClient.post(`/documents/${trashDocTarget.id}/trash`);
      if (res.success) {
        toast.success(
          'Dokumen Dipindahkan ke Trash',
          `Dokumen ${trashDocTarget.document_code} telah dipindahkan ke tong sampah.`
        );
        setTrashDocTarget(null);
        fetchDocuments();
      } else {
        toast.error('Gagal Memindahkan Dokumen', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Memindahkan Dokumen', err.message);
    } finally {
      setIsTrashing(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    setIsTrashing(true);
    try {
      const res = await apiClient.delete(`/documents/${permanentDeleteTarget.id}/permanent`);
      if (res.success) {
        toast.success(
          'Dokumen Dihapus Permanen',
          `Dokumen ${permanentDeleteTarget.document_code} telah dihapus permanen.`
        );
        setPermanentDeleteTarget(null);
        fetchDocuments();
      } else {
        toast.error('Gagal Menghapus Dokumen', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Menghapus Dokumen', err.message);
    } finally {
      setIsTrashing(false);
    }
  };

  const handleDirectDownloadPdf = async (doc: DocumentRecord) => {
    try {
      await apiClient.downloadBlob(
        `/documents/${doc.id}/download`,
        `${doc.document_code}_Soal_${doc.subject}.pdf`
      );
      toast.success('Unduh Berhasil Dimulai', 'File PDF Soal sedang diunduh.');
    } catch (err: any) {
      toast.error('Gagal Mengunduh Soal', err.message);
    }
  };

  const handleDownloadAnswerKeyPdf = async (doc: DocumentRecord) => {
    try {
      await apiClient.downloadBlob(
        `/documents/${doc.id}/answer-key/download`,
        `${doc.document_code}_KunciJawaban_${doc.subject}.pdf`
      );
      toast.success('Unduh Berhasil Dimulai', 'File PDF Kunci Jawaban sedang diunduh.');
    } catch (err: any) {
      toast.error('Gagal Mengunduh Kunci', err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------- */}
      {/* HEADER BENTO CARD */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Bank Soal & Lembar LJK
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Repositori terpadu naskah ujian resmi, kunci LJK, dan generator format Excel koreksi otomatis.
          </p>
        </div>

        {canUpload && (
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Unggah Naskah Soal</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER & SEARCH BAR */}
      {/* ------------------------------------------------------------- */}
      <FilterBar
        categories={categories}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* ------------------------------------------------------------- */}
      {/* DOCUMENTS DATA TABLE (FULL CRUD ACTION MENU) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Kode & Judul Soal</th>
                <th className="py-3 px-3">Jenjang / Mapel / Kelas</th>
                <th className="py-3 px-3">Kategori & Tahun</th>
                <th className="py-3 px-4 bg-indigo-50/50 dark:bg-indigo-950/20">Lembar Kunci LJK</th>
                <th className="py-3 px-3">Berkas PDF</th>
                <th className="py-3 px-4 text-right">Menu Aksi (Full CRUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Memuat dokumen naskah soal...</span>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">Tidak ada dokumen ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Coba ubah kata kunci pencarian atau bersihkan filter di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                (documents || []).map((doc) => {
                  const qFile = doc.files?.find((f) => f.file_type === 'QUESTION');
                  const akFile = doc.files?.find((f) => f.file_type === 'ANSWER_KEY');
                  const isMenuOpen = activeActionMenuId === doc.id;

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* 1. Code, Title, & Tags */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {doc.document_code}
                            </span>
                            {doc.level_name && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold">
                                {doc.level_name}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5 line-clamp-1">
                            {doc.title}
                          </span>
                          {doc.description && (
                            <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {doc.description}
                            </span>
                          )}

                          {/* Render Document Tags */}
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              {doc.tags.slice(0, 4).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px]"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {doc.tags.length > 4 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  +{doc.tags.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Subject & Grade */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {doc.subject}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            Tingkat: <span className="font-medium text-slate-700 dark:text-slate-300">Kelas {doc.grade}</span>
                          </span>
                        </div>
                      </td>

                      {/* 3. Category & Academic Year */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1">
                          <Badge variant="default" size="sm">
                            {doc.category_name || '-'}
                          </Badge>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {doc.academic_year} • {doc.semester}
                          </span>
                        </div>
                      </td>

                      {/* 4. LEMBAR JAWABAN KOMPUTER (LJK) */}
                      <td className="py-3.5 px-4 bg-indigo-50/30 dark:bg-indigo-950/10 border-x border-indigo-100/70 dark:border-indigo-900/20">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant={doc.has_answer_key ? 'success' : 'warning'}
                              size="sm"
                            >
                              {doc.has_answer_key ? '✓ Kunci LJK Ada' : '✗ Belum Diatur'}
                            </Badge>

                            {canEdit && (
                              <button
                                onClick={() => onOpenLjk(doc)}
                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                {doc.has_answer_key ? 'Ubah KJ' : '+ Tambah KJ'}
                              </button>
                            )}
                          </div>

                          {/* Breakdown of Question Types */}
                          {doc.answer_key_summary ? (
                            <div className="flex items-center gap-1 font-mono text-[10px]">
                              {doc.answer_key_summary.pg_count > 0 && (
                                <span className="bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 px-1 rounded">
                                  PG:{doc.answer_key_summary.pg_count}
                                </span>
                              )}
                              {doc.answer_key_summary.pgk_count > 0 && (
                                <span className="bg-violet-100/70 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 px-1 rounded">
                                  PGK:{doc.answer_key_summary.pgk_count}
                                </span>
                              )}
                              {doc.answer_key_summary.tf_count > 0 && (
                                <span className="bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-1 rounded">
                                  TF:{doc.answer_key_summary.tf_count}
                                </span>
                              )}
                              {doc.answer_key_summary.essay_count > 0 && (
                                <span className="bg-amber-100/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1 rounded">
                                  Esy:{doc.answer_key_summary.essay_count}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Total {doc.question_count || 0} butir soal
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. PDF Files */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>PDF Soal</span>
                            {qFile && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({(qFile.file_size / (1024 * 1024)).toFixed(1)}MB)
                              </span>
                            )}
                          </div>
                          {akFile && (
                            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <Key className="w-3.5 h-3.5" />
                              <span>PDF Kunci</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. USER REQUESTED: FULL CRUD ACTION MENU */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 relative">
                          {/* Quick Preview Button (Read) */}
                          <button
                            onClick={() => onOpenPreview(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                            title="Pratinjau PDF Soal & Split Info"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Pratinjau</span>
                          </button>

                          {/* Main Action Menu Dropdown (Full CRUD) */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(isMenuOpen ? null : doc.id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                              title="Menu Aksi Dokumen"
                            >
                              <span>Aksi</span>
                              <ChevronDown className="w-3 h-3 ml-0.5" />
                            </button>

                            {/* Dropdown Menu Popup */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-1 w-64 rounded-2xl bg-white dark:bg-slate-850 shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-left divide-y divide-slate-100 dark:divide-slate-800"
                              >
                                {/* READ ACTIONS */}
                                <div className="py-1">
                                  <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                    Aksi Baca & Pratinjau
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenPreview(doc);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                                  >
                                    <Eye className="w-4 h-4 text-indigo-600" />
                                    <span>Pratinjau Split Screen</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      navigate(`/documents/${doc.id}`);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                                  >
                                    <ExternalLink className="w-4 h-4 text-slate-500" />
                                    <span>Buka Halaman Detail</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleDirectDownloadPdf(doc);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                                  >
                                    <FileText className="w-4 h-4 text-indigo-600" />
                                    <span>Unduh Naskah Soal PDF</span>
                                  </button>

                                  {akFile && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleDownloadAnswerKeyPdf(doc);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                                    >
                                      <Key className="w-4 h-4 text-emerald-600" />
                                      <span>Unduh Kunci Jawaban PDF</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenExcelExport(doc);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                    <span>Unduh Format Excel LJK (.xlsx)</span>
                                  </button>
                                </div>

                                {/* UPDATE ACTIONS */}
                                {canEdit && (
                                  <div className="py-1">
                                    <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                      Aksi Edit & Pembaruan
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        onOpenEdit(doc);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                                    >
                                      <Edit className="w-4 h-4 text-indigo-600" />
                                      <span>Edit Metadata & Tags</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        onOpenLjk(doc);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                                    >
                                      <Key className="w-4 h-4 text-emerald-600" />
                                      <span>Kelola Kunci Jawaban LJK</span>
                                    </button>
                                  </div>
                                )}

                                {/* DELETE ACTIONS */}
                                {isAdmin && (
                                  <div className="py-1">
                                    <div className="px-3 py-1 text-[10px] font-bold uppercase text-rose-500 tracking-wider">
                                      Aksi Penghapusan
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setTrashDocTarget(doc);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span>Pindahkan ke Sampah</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setPermanentDeleteTarget(doc);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-rose-700 font-bold hover:bg-rose-100 dark:hover:bg-rose-950/60 flex items-center gap-2.5"
                                    >
                                      <Trash2 className="w-4 h-4 text-rose-700" />
                                      <span>Hapus Permanen</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Direct Action Shortcuts */}
                          {canEdit && (
                            <button
                              onClick={() => onOpenEdit(doc)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit Metadata Dokumen"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => setTrashDocTarget(doc)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Pindahkan ke Tong Sampah (Trash)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PAGINATION BAR */}
        {/* ----------------------------------------------------------- */}
        <Pagination
          pagination={pagination}
          onPageChange={(page) => handleFilterChange({ page })}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CONFIRM DIALOGS */}
      {/* ------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={!!trashDocTarget}
        title="Pindahkan Dokumen ke Tong Sampah?"
        message={`Dokumen "${trashDocTarget?.title}" (${trashDocTarget?.document_code}) akan disembunyikan dari katalog aktif dan dipindahkan ke Tong Sampah.`}
        confirmLabel={isTrashing ? 'Memindahkan...' : 'Pindahkan ke Sampah'}
        cancelLabel="Batal"
        isDanger={true}
        isLoading={isTrashing}
        onConfirm={handleConfirmTrash}
        onClose={() => setTrashDocTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!permanentDeleteTarget}
        title="Hapus Dokumen Secara Permanen?"
        message={`PERINGATAN: Dokumen "${permanentDeleteTarget?.title}" (${permanentDeleteTarget?.document_code}) beserta file PDF dan seluruh kunci LJK akan dihapus permanen dari sistem dan Google Drive.`}
        confirmLabel={isTrashing ? 'Menghapus...' : 'Hapus Permanen'}
        cancelLabel="Batal"
        isDanger={true}
        isLoading={isTrashing}
        onConfirm={handleConfirmPermanentDelete}
        onClose={() => setPermanentDeleteTarget(null)}
      />
    </div>
  );
}
