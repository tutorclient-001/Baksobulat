import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { DocumentRecord } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { Badge } from '../components/Badge.js';
import { useToast } from '../context/ToastContext.js';

export function TrashPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState<DocumentRecord | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<DocumentRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const toast = useToast();

  const fetchTrash = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ documents: DocumentRecord[] }>('/documents', {
        status: 'TRASHED',
        limit: 50,
      });
      if (res.success && res.data) {
        setDocuments(res.data.documents || []);
      }
    } catch (err: any) {
      toast.error('Gagal Memuat Trash', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setIsProcessing(true);
    try {
      const res = await apiClient.post(`/documents/${restoreTarget.id}/restore`);
      if (res.success) {
        toast.success('Dokumen Dipulihkan', `Dokumen ${restoreTarget.document_code} kembali aktif.`);
        setRestoreTarget(null);
        fetchTrash();
      } else {
        toast.error('Gagal Memulihkan', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Memulihkan', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentPurge = async () => {
    if (!purgeTarget) return;
    setIsProcessing(true);
    try {
      const res = await apiClient.delete(`/documents/${purgeTarget.id}/permanent`);
      if (res.success) {
        toast.success('Dihapus Permanen', `Dokumen dan berkas Google Drive telah dihapus permanen.`);
        setPurgeTarget(null);
        fetchTrash();
      } else {
        toast.error('Gagal Menghapus Permanen', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Menghapus Permanen', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            Tempat Sampah (Trash)
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Daftar dokumen yang dihapus sementara. Anda dapat memulihkannya atau menghapusnya secara permanen.
          </p>
        </div>

        <button
          onClick={fetchTrash}
          disabled={isLoading}
          className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Kode & Judul Dokumen</th>
                <th className="py-3 px-3">Mata Pelajaran & Kelas</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Tanggal Dihapus</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <Trash2 className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="font-semibold text-zinc-600 dark:text-zinc-300">Trash Kosong</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Tidak ada dokumen di dalam tempat sampah.</p>
                  </td>
                </tr>
              ) : (
                (documents || []).map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                          {doc.document_code}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mt-0.5">
                          {doc.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {doc.subject} ({doc.grade})
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant="default" size="sm">
                        {doc.category_name || '-'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-zinc-500 font-mono text-[11px]">
                      {doc.deleted_at ? new Date(doc.deleted_at).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setRestoreTarget(doc)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-lg font-semibold text-xs transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Pulihkan</span>
                        </button>
                        <button
                          onClick={() => setPurgeTarget(doc)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 rounded-lg font-semibold text-xs transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Permanen</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore Dialog */}
      <ConfirmDialog
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title="Pulihkan Dokumen?"
        message={`Apakah Anda yakin ingin memulihkan dokumen "${restoreTarget?.title}" (${restoreTarget?.document_code}) kembali ke Bank Soal Aktif?`}
        confirmLabel="Pulihkan Sekarang"
        icon="restore"
        isLoading={isProcessing}
      />

      {/* Permanent Delete Dialog */}
      <ConfirmDialog
        isOpen={!!purgeTarget}
        onClose={() => setPurgeTarget(null)}
        onConfirm={handlePermanentPurge}
        title="Hapus Permanen & Purge Penyimpanan?"
        message={`PERINGATAN: Tindakan ini TIDAK DAPAT DIBATALKAN. File PDF soal dan kunci jawaban di Google Drive serta seluruh data tabel di database PostgreSQL akan dihapus secara permanen untuk "${purgeTarget?.title}".`}
        confirmLabel="Hapus Permanen Sekarang"
        isDanger={true}
        isLoading={isProcessing}
      />
    </div>
  );
}
