import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Save,
  Wand2,
  CheckCircle2,
  Layers,
  HelpCircle,
  Hash,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Modal } from './Modal.js';
import { DocumentRecord, AnswerKey, AnswerKeyItem, QuestionType } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { useToast } from '../context/ToastContext.js';

interface LjkEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord;
  onSaved: () => void;
  onOpenExcelExport?: () => void;
}

export function LjkEditorModal({
  isOpen,
  onClose,
  document,
  onSaved,
  onOpenExcelExport,
}: LjkEditorModalProps) {
  const [items, setItems] = useState<AnswerKeyItem[]>([]);
  const [passingScore, setPassingScore] = useState<number>(75);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | QuestionType>('ALL');
  const [quickTotalInput, setQuickTotalInput] = useState<number>(document.question_count || 40);
  const [quickPgCount, setQuickPgCount] = useState<number>(Math.min(35, document.question_count || 35));
  const [quickEssayCount, setQuickEssayCount] = useState<number>(5);

  const toast = useToast();

  // Load existing answer key
  useEffect(() => {
    if (!isOpen) return;

    async function loadAnswerKey() {
      setIsLoading(true);
      try {
        const res = await apiClient.get<AnswerKey>(`/answer-keys/${document.id}`);
        if (res.success && res.data && res.data.items && res.data.items.length > 0) {
          setItems(res.data.items);
          setPassingScore(res.data.passing_score || 75);
          setQuickTotalInput(res.data.items.length);
        } else {
          // Initialize default items based on question_count
          const total = document.question_count > 0 ? document.question_count : 40;
          const initialItems: AnswerKeyItem[] = [];
          for (let i = 1; i <= total; i++) {
            initialItems.push({
              number: i,
              type: i <= 35 ? 'PG' : 'ESSAY',
              optionsCount: 5,
              correctAnswers: i <= 35 ? ['A'] : [''],
              weight: i <= 35 ? 2 : 6,
              essayKeywords: [],
              essayRubric: '',
              explanation: '',
            });
          }
          setItems(initialItems);
          setQuickTotalInput(total);
        }
      } catch (err: any) {
        toast.error('Gagal memuat kunci jawaban', err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnswerKey();
  }, [isOpen, document.id]);

  // Handle single PG option click
  const handleSelectPgOption = (number: number, option: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.number === number
          ? { ...item, correctAnswers: [option] }
          : item
      )
    );
  };

  // Handle PGK (multi-select) option toggle
  const handleTogglePgkOption = (number: number, option: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.number !== number) return item;
        const current = item.correctAnswers || [];
        const exists = current.includes(option);
        const updated = exists ? current.filter((o) => o !== option) : [...current, option].sort();
        return { ...item, correctAnswers: updated };
      })
    );
  };

  // Handle True / False toggle
  const handleSelectTf = (number: number, value: 'T' | 'F') => {
    setItems((prev) =>
      prev.map((item) =>
        item.number === number ? { ...item, correctAnswers: [value] } : item
      )
    );
  };

  // Change Question Type
  const handleChangeType = (number: number, newType: QuestionType) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.number !== number) return item;
        let correctAnswers: string[] = ['A'];
        if (newType === 'PGK') correctAnswers = ['A'];
        if (newType === 'TF') correctAnswers = ['T'];
        if (newType === 'ESSAY') correctAnswers = [''];
        return {
          ...item,
          type: newType,
          optionsCount: newType === 'TF' ? 2 : 5,
          correctAnswers,
        };
      })
    );
  };

  // Update item field
  const handleUpdateItem = (number: number, field: keyof AnswerKeyItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.number === number ? { ...item, [field]: value } : item))
    );
  };

  // Add new question
  const handleAddQuestion = () => {
    const nextNumber = items.length + 1;
    const newItem: AnswerKeyItem = {
      number: nextNumber,
      type: 'PG',
      optionsCount: 5,
      correctAnswers: ['A'],
      weight: 2,
    };
    setItems((prev) => [...prev, newItem]);
    setQuickTotalInput(nextNumber);
  };

  // Remove question
  const handleRemoveQuestion = (number: number) => {
    const filtered = items.filter((it) => it.number !== number);
    // re-index
    const reindexed = filtered.map((it, idx) => ({ ...it, number: idx + 1 }));
    setItems(reindexed);
    setQuickTotalInput(reindexed.length);
  };

  // Quick Batch Generator
  const handleApplyQuickSetup = () => {
    const total = quickTotalInput;
    if (total <= 0 || total > 200) {
      toast.warning('Jumlah Tidak Valid', 'Jumlah nomor harus antara 1 sampai 200.');
      return;
    }

    const pgCount = Math.min(quickPgCount, total);
    const newItems: AnswerKeyItem[] = [];

    // PG
    for (let i = 1; i <= pgCount; i++) {
      newItems.push({
        number: i,
        type: 'PG',
        optionsCount: 5,
        correctAnswers: ['A'],
        weight: 2,
      });
    }

    // Remaining as Essay or PG
    for (let i = pgCount + 1; i <= total; i++) {
      newItems.push({
        number: i,
        type: 'ESSAY',
        optionsCount: 0,
        correctAnswers: ['Jawaban Inti / Konsep'],
        essayKeywords: ['kata kunci 1', 'kata kunci 2'],
        essayRubric: 'Rubrik penilaian bertahap',
        weight: 5,
      });
    }

    setItems(newItems);
    toast.success('Format Diterapkan', `Berhasil menyetel ${total} nomor soal LJK.`);
  };

  // Auto distribute weights to total 100 points
  const handleDistributePoints100 = () => {
    if (items.length === 0) return;
    const weightPerItem = Math.round((100 / items.length) * 10) / 10;
    setItems((prev) => prev.map((it) => ({ ...it, weight: weightPerItem })));
    toast.success('Bobot Disesuaikan', `Setiap butir soal memiliki bobot ${weightPerItem} poin.`);
  };

  // Save changes
  const handleSave = async () => {
    if (items.length === 0) {
      toast.warning('Kunci Jawaban Kosong', 'Harap tambahkan minimal 1 butir kunci jawaban.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient.post(`/answer-keys/${document.id}`, {
        items,
        passing_score: Number(passingScore) || 75,
      });

      if (res.success) {
        toast.success('Kunci Jawaban Disimpan', 'Master Kunci Jawaban LJK berhasil diperbarui.');
        onSaved();
        onClose();
      } else {
        toast.error('Gagal Menyimpan', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Menyimpan', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Summary counts
  const totalScore = items.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
  const pgCount = items.filter((i) => i.type === 'PG').length;
  const pgkCount = items.filter((i) => i.type === 'PGK').length;
  const tfCount = items.filter((i) => i.type === 'TF').length;
  const essayCount = items.filter((i) => i.type === 'ESSAY').length;

  const filteredItems = items.filter((it) => activeFilter === 'ALL' || it.type === activeFilter);

  const options5 = ['A', 'B', 'C', 'D', 'E'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editor Kunci Jawaban Interaktif (LJK)"
      subtitle={`Dokumen: ${document.document_code} - ${document.title}`}
      maxWidth="6xl"
    >
      <div className="flex flex-col gap-5">
        {/* Top Control Bar & Quick Generator */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Quick Setup Form */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
              Setel Cepat LJK:
            </span>
            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700">
              <span className="text-zinc-500">Total Nomor:</span>
              <input
                type="number"
                min="1"
                max="200"
                value={quickTotalInput}
                onChange={(e) => setQuickTotalInput(parseInt(e.target.value, 10) || 1)}
                className="w-14 text-center font-bold text-zinc-900 dark:text-zinc-100 bg-transparent focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700">
              <span className="text-zinc-500">PG (A-E):</span>
              <input
                type="number"
                min="0"
                max={quickTotalInput}
                value={quickPgCount}
                onChange={(e) => setQuickPgCount(parseInt(e.target.value, 10) || 0)}
                className="w-12 text-center font-bold text-zinc-900 dark:text-zinc-100 bg-transparent focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyQuickSetup}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-md font-medium transition-colors"
            >
              Terapkan
            </button>
            <button
              type="button"
              onClick={handleDistributePoints100}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-md font-medium transition-colors"
            >
              Auto Bobot (100 Poin)
            </button>
          </div>

          {/* Score & Metric Summary */}
          <div className="flex items-center gap-3 text-xs bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <div>
              <span className="text-zinc-400 block text-[10px]">TOTAL SKOR</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                {totalScore.toFixed(1)} Pts
              </span>
            </div>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div>
              <span className="text-zinc-400 block text-[10px]">PASSING SCORE (KKM)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-12 font-mono font-bold text-zinc-800 dark:text-zinc-200 text-sm bg-transparent border-b border-zinc-300 dark:border-zinc-600 focus:outline-none text-center"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills & Add Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Semua ({items.length})
            </button>
            <button
              onClick={() => setActiveFilter('PG')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeFilter === 'PG'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              PG ({pgCount})
            </button>
            <button
              onClick={() => setActiveFilter('PGK')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeFilter === 'PGK'
                  ? 'bg-white dark:bg-zinc-700 text-violet-600 dark:text-violet-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              PGK ({pgkCount})
            </button>
            <button
              onClick={() => setActiveFilter('TF')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeFilter === 'TF'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              T/F ({tfCount})
            </button>
            <button
              onClick={() => setActiveFilter('ESSAY')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeFilter === 'ESSAY'
                  ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Essay ({essayCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenExcelExport && (
              <button
                type="button"
                onClick={onOpenExcelExport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Format Excel</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Nomor Soal</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* INTERACTIVE LJK GRID / LIST */}
        {/* ------------------------------------------------------------- */}
        <div className="max-h-[50vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/40">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              Tidak ada butir soal dalam filter ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.number}
                  className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col gap-2.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  {/* Item Header Row */}
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-mono font-bold text-xs">
                        {item.number}
                      </span>

                      {/* Type Selector */}
                      <select
                        value={item.type}
                        onChange={(e) => handleChangeType(item.number, e.target.value as QuestionType)}
                        aria-label={`Tipe soal nomor ${item.number}`}
                        className="text-xs font-semibold px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      >
                        <option value="PG">Pilihan Ganda (PG)</option>
                        <option value="PGK">PG Kompleks (PGK)</option>
                        <option value="TF">Benar/Salah (T/F)</option>
                        <option value="ESSAY">Uraian / Essay</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                        <span className="text-[10px] text-zinc-500">Bobot:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          max="50"
                          value={item.weight}
                          onChange={(e) => handleUpdateItem(item.number, 'weight', Number(e.target.value))}
                          aria-label={`Bobot nilai nomor ${item.number}`}
                          className="w-10 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-transparent focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(item.number)}
                        className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors"
                        title="Hapus nomor ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* --------------------------------------------------------- */}
                  {/* LJK INTERACTIVE BUBBLE CHOICES */}
                  {/* --------------------------------------------------------- */}
                  {item.type === 'PG' && (
                    <div className="flex items-center justify-between gap-1 py-1">
                      <span className="text-[11px] font-medium text-zinc-400">Kunci:</span>
                      <div className="flex items-center gap-2">
                        {options5.map((opt) => {
                          const isSelected = item.correctAnswers.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSelectPgOption(item.number, opt)}
                              className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all shadow-xs ${
                                isSelected
                                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-800 scale-105'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {item.type === 'PGK' && (
                    <div className="flex items-center justify-between gap-1 py-1">
                      <span className="text-[11px] font-medium text-zinc-400">Opsi Benar:</span>
                      <div className="flex items-center gap-2">
                        {options5.map((opt) => {
                          const isSelected = item.correctAnswers.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleTogglePgkOption(item.number, opt)}
                              className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-violet-600 text-white ring-2 ring-violet-300 dark:ring-violet-800'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {item.type === 'TF' && (
                    <div className="flex items-center justify-between gap-2 py-1">
                      <span className="text-[11px] font-medium text-zinc-400">Pernyataan:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectTf(item.number, 'T')}
                          className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                            item.correctAnswers.includes('T')
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 border border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Benar (B)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectTf(item.number, 'F')}
                          className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                            item.correctAnswers.includes('F')
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 border border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          <span>Salah (S)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {item.type === 'ESSAY' && (
                    <div className="space-y-2 py-1 text-xs">
                      <div>
                        <input
                          type="text"
                          placeholder="Kata kunci jawaban inti (pisahkan dengan koma)..."
                          value={item.essayKeywords?.join(', ') || ''}
                          onChange={(e) =>
                            handleUpdateItem(
                              item.number,
                              'essayKeywords',
                              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <textarea
                          placeholder="Rubrik / Panduan Penilaian Essay..."
                          value={item.essayRubric || ''}
                          rows={2}
                          onChange={(e) => handleUpdateItem(item.number, 'essayRubric', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Optional Explanation Input */}
                  <div>
                    <input
                      type="text"
                      placeholder="Pembahasan / Catatan (opsional)..."
                      value={item.explanation || ''}
                      onChange={(e) => handleUpdateItem(item.number, 'explanation', e.target.value)}
                      className="w-full text-[11px] px-2 py-1 bg-zinc-50/70 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded text-zinc-600 dark:text-zinc-400 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">
            Total <span className="font-semibold text-zinc-900 dark:text-zinc-100">{items.length} butir</span> kunci
            jawaban terdaftar.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Kunci Jawaban LJK'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
