import React, { useState } from 'react';
import { FileSpreadsheet, Download, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { Modal } from './Modal.js';
import { DocumentRecord } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { useToast } from '../context/ToastContext.js';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord;
}

export function ExcelExportModal({ isOpen, onClose, document }: ExcelExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'BLANK_LJK' | 'MASTER_KEY' | 'GRADING_TEMPLATE'>('BLANK_LJK');
  const [isDownloading, setIsDownloading] = useState(false);
  const toast = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const modeNames = {
        BLANK_LJK: 'LJK_Siswa',
        MASTER_KEY: 'Master_Kunci',
        GRADING_TEMPLATE: 'Template_Koreksi_Otomatis',
      };

      const filename = `Format_${modeNames[selectedFormat]}_${document.document_code}_${document.subject.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

      await apiClient.downloadBlob(
        `/documents/${document.id}/export-ljk?mode=${selectedFormat}`,
        filename
      );

      toast.success('Unduhan Berhasil', `File Excel (${filename}) berhasil dibuat dan diunduh.`);
      onClose();
    } catch (err: any) {
      toast.error('Gagal Mengunduh Format Excel', err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unduh Format LJK Excel Otomatis"
      subtitle={`Naskah: ${document.document_code} - ${document.title}`}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Sistem secara otomatis menyesuaikan kolom nomor, tipe soal (PG, PGK, T/F, Essay), serta bobot penilaian
          sesuai konfigurasi Bank Soal ini.
        </p>

        <div className="space-y-2.5">
          {/* Option 1: Blank LJK */}
          <div
            onClick={() => setSelectedFormat('BLANK_LJK')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              selectedFormat === 'BLANK_LJK'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
            }`}
          >
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0 mt-0.5">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  1. Blanko LJK Siswa Siap Pakai (.xlsx)
                </span>
                {selectedFormat === 'BLANK_LJK' && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Template Lembar Jawab Komputer lengkap dengan identitas peserta, bubble pilihan ganda [A][B][C][D][E], checkbox PGK, dan ruang isian essay.
              </p>
            </div>
          </div>

          {/* Option 2: Master Key */}
          <div
            onClick={() => setSelectedFormat('MASTER_KEY')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              selectedFormat === 'MASTER_KEY'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
            }`}
          >
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  2. Master Kunci Jawaban & Bobot Nilai (.xlsx)
                </span>
                {selectedFormat === 'MASTER_KEY' && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Dokumen resmi kunci jawaban per nomor, rubrik essay, kata kunci pembahasan, dan bobot poin per butir soal.
              </p>
            </div>
          </div>

          {/* Option 3: Auto Grading Matrix */}
          <div
            onClick={() => setSelectedFormat('GRADING_TEMPLATE')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              selectedFormat === 'GRADING_TEMPLATE'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
            }`}
          >
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  3. Template Koreksi Otomatis & Nilai Siswa (.xlsx)
                </span>
                {selectedFormat === 'GRADING_TEMPLATE' && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Matriks daftar siswa berformula Excel untuk penilaian instan dan analisis butir soal secara otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Menghasilkan Excel...' : 'Unduh File Excel'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
