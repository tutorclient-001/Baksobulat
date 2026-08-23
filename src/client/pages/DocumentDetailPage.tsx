import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { DocumentRecord } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { SplitPdfViewer } from '../components/SplitPdfViewer.js';
import { useAuth } from '../context/AuthContext.js';

interface DocumentDetailPageProps {
  onOpenLjk: (doc: DocumentRecord) => void;
  onOpenExcelExport: (doc: DocumentRecord) => void;
}

export function DocumentDetailPage({ onOpenLjk, onOpenExcelExport }: DocumentDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadDoc() {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const res = await apiClient.get<DocumentRecord>(`/documents/${id}`);
        if (res.success && res.data) {
          setDocument(res.data);
        } else {
          setErrorMsg(res.error?.message || 'Dokumen tidak ditemukan.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal memuat dokumen.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDoc();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-zinc-500">Memuat berkas dokumen...</p>
      </div>
    );
  }

  if (errorMsg || !document) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Gagal Membuka Dokumen</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4">{errorMsg || 'Dokumen tidak ditemukan.'}</p>
        <button
          onClick={() => navigate('/documents')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Bank Soal</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/documents')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Dokumen</span>
        </button>
      </div>

      <SplitPdfViewer
        document={document}
        onOpenLjkEditor={() => onOpenLjk(document)}
        onOpenExcelExport={() => onOpenExcelExport(document)}
        canEdit={canEdit}
      />
    </div>
  );
}
