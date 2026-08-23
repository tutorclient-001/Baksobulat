import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Key,
  Calendar,
  Layers,
  GraduationCap,
  Hash,
  HardDrive,
  Clock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  BookOpen,
  FolderDown,
} from 'lucide-react';
import { DocumentRecord } from '../../shared/types.js';
import { Badge } from './Badge.js';
import { apiClient } from '../api/apiClient.js';
import { useToast } from '../context/ToastContext.js';

interface SplitPdfViewerProps {
  document: DocumentRecord;
  onOpenLjkEditor?: () => void;
  onOpenExcelExport?: () => void;
  onClose?: () => void;
  canEdit?: boolean;
}

export function SplitPdfViewer({
  document,
  onOpenLjkEditor,
  onOpenExcelExport,
  onClose,
  canEdit = false,
}: SplitPdfViewerProps) {
  const [activeTab, setActiveTab] = useState<'QUESTION' | 'ANSWER_KEY'>('QUESTION');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const toast = useToast();

  // Load PDF stream securely via backend authorization
  useEffect(() => {
    let isCancelled = false;
    let currentUrl: string | null = null;

    async function loadPdf() {
      setIsLoadingPdf(true);
      setPdfError(null);

      const endpoint =
        activeTab === 'QUESTION'
          ? `/documents/${document.id}/preview`
          : `/documents/${document.id}/answer-key/preview`;

      try {
        const res = await apiClient.get<Blob>(endpoint);
        if (res.success && res.data) {
          if (!isCancelled) {
            const blob = res.data as unknown as Blob;
            currentUrl = window.URL.createObjectURL(blob);
            setPdfBlobUrl(currentUrl);
          }
        } else {
          if (!isCancelled) {
            setPdfError(
              res.error?.message ||
                (activeTab === 'ANSWER_KEY'
                  ? 'File PDF kunci jawaban belum diunggah untuk dokumen ini.'
                  : 'Gagal memuat pratinjau dokumen PDF.')
            );
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setPdfError(err.message || 'Gagal memuat pratinjau PDF.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPdf(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (currentUrl) {
        window.URL.revokeObjectURL(currentUrl);
      }
    };
  }, [document.id, activeTab]);

  const handleDownloadQuestion = async () => {
    try {
      await apiClient.downloadBlob(
        `/documents/${document.id}/download`,
        `${document.document_code}_Soal_${document.subject}.pdf`
      );
      toast.success('Unduhan Dimulai', 'File PDF Soal sedang diunduh.');
    } catch (err: any) {
      toast.error('Gagal Mengunduh', err.message);
    }
  };

  const handleDownloadAnswerKey = async () => {
    try {
      await apiClient.downloadBlob(
        `/documents/${document.id}/answer-key/download`,
        `${document.document_code}_KunciJawaban_${document.subject}.pdf`
      );
      toast.success('Unduhan Dimulai', 'File PDF Kunci Jawaban sedang diunduh.');
    } catch (err: any) {
      toast.error('Gagal Mengunduh', err.message);
    }
  };

  const qFile = document.files?.find((f) => f.file_type === 'QUESTION');
  const akFile = document.files?.find((f) => f.file_type === 'ANSWER_KEY');

  return (
    <div className="flex flex-col lg:flex-row h-[80vh] bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* ------------------------------------------------------------- */}
      {/* LEFT PANE: PDF VIEWER STREAM */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col bg-slate-950/90 border-b lg:border-b-0 lg:border-r border-slate-800 relative min-h-[350px]">
        {/* PDF Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setActiveTab('QUESTION')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'QUESTION'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Naskah Soal PDF</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('ANSWER_KEY')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'ANSWER_KEY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>Kunci Jawaban PDF</span>
                {akFile && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'QUESTION' && qFile && (
              <button
                onClick={handleDownloadQuestion}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
                title="Unduh PDF Soal"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh PDF Soal</span>
              </button>
            )}

            {activeTab === 'ANSWER_KEY' && akFile && (
              <button
                onClick={handleDownloadAnswerKey}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
                title="Unduh PDF Kunci Jawaban"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh PDF Kunci</span>
              </button>
            )}
          </div>
        </div>

        {/* PDF Frame / Stream Area */}
        <div className="flex-1 relative flex items-center justify-center p-2 bg-slate-950">
          {isLoadingPdf ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Memuat pratinjau dokumen dari backend...</p>
            </div>
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-500/80" />
              <p className="text-sm font-semibold text-slate-200">Pratinjau Tidak Tersedia</p>
              <p className="text-xs text-slate-400">{pdfError}</p>
              {activeTab === 'ANSWER_KEY' && onOpenLjkEditor && canEdit && (
                <button
                  onClick={onOpenLjkEditor}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-xs"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Buka Editor Kunci Jawaban LJK</span>
                </button>
              )}
            </div>
          ) : pdfBlobUrl ? (
            <iframe
              src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
              title="Pratinjau PDF Soal"
              className="w-full h-full rounded-xl border border-slate-800 bg-white"
            />
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT PANE: SPLIT METADATA & QUICK ACTIONS */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto shrink-0">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
              {document.document_code}
            </span>
            <Badge variant={document.has_answer_key ? 'success' : 'warning'} size="sm">
              {document.has_answer_key ? '✓ Kunci LJK Ada' : 'Belum Ada Kunci'}
            </Badge>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {document.title}
          </h3>

          {document.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {document.description}
            </p>
          )}
        </div>

        {/* Structured Metadata List */}
        <div className="p-5 space-y-3.5 flex-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1 text-[11px]">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Mata Pelajaran
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{document.subject}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1 text-[11px]">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Tingkat / Kelas
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{document.grade}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Periode
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {document.academic_year} ({document.semester})
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1 text-[11px]">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Kategori
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {document.category_name || '-'}
              </span>
            </div>
          </div>

          {/* Answer Key Summary Box */}
          {document.answer_key_summary ? (
            <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Rincian Kunci Jawaban
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {document.answer_key_summary.total_questions} Butir Soal
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[11px] text-emerald-800 dark:text-emerald-200">
                <div className="bg-white/80 dark:bg-slate-900/60 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                  <span className="block text-[9px] text-slate-500 dark:text-slate-400 uppercase font-sans">PG</span>
                  <span className="font-bold">{document.answer_key_summary.pg_count}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                  <span className="block text-[9px] text-slate-500 dark:text-slate-400 uppercase font-sans">PGK</span>
                  <span className="font-bold">{document.answer_key_summary.pgk_count}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                  <span className="block text-[9px] text-slate-500 dark:text-slate-400 uppercase font-sans">T/F</span>
                  <span className="font-bold">{document.answer_key_summary.tf_count}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                  <span className="block text-[9px] text-slate-500 dark:text-slate-400 uppercase font-sans">Essay</span>
                  <span className="font-bold">{document.answer_key_summary.essay_count}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
              <span className="font-medium text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Kunci Jawaban interaktif belum diatur.
              </span>
            </div>
          )}

          {/* Dedicated Download Hub in Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <span className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
              <FolderDown className="w-4 h-4 text-indigo-600" />
              Pusat Unduh Berkas Paket Soal
            </span>
            <div className="grid grid-cols-1 gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadQuestion}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Unduh PDF Soal</span>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {akFile && (
                <button
                  type="button"
                  onClick={handleDownloadAnswerKey}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Unduh PDF Kunci Jawaban</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              {onOpenExcelExport && (
                <button
                  type="button"
                  onClick={onOpenExcelExport}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Unduh Format LJK Excel (.xlsx)</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 shrink-0">
          {onOpenLjkEditor && canEdit && (
            <button
              onClick={onOpenLjkEditor}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            >
              <Key className="w-4 h-4" />
              <span>Buka Editor Kunci Jawaban LJK</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
