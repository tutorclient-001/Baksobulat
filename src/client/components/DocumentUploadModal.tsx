import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Key,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Info,
  Layers,
  FileCheck,
  Grid,
  Tag,
  GraduationCap,
  Plus,
  X,
} from 'lucide-react';
import { Modal } from './Modal.js';
import {
  Category,
  DocumentRecord,
  AnswerKeyItem,
  QuestionType,
  LevelRecord,
  GradeRecord,
  SubjectRecord,
  TagRecord,
} from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { useToast } from '../context/ToastContext.js';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSuccess: (newDoc: DocumentRecord) => void;
}

type Step = 1 | 2 | 3 | 4;

export function DocumentUploadModal({
  isOpen,
  onClose,
  categories,
  onSuccess,
}: DocumentUploadModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Master Data state
  const [masterLevels, setMasterLevels] = useState<LevelRecord[]>([]);
  const [masterGrades, setMasterGrades] = useState<GradeRecord[]>([]);
  const [masterSubjects, setMasterSubjects] = useState<SubjectRecord[]>([]);
  const [masterTags, setMasterTags] = useState<TagRecord[]>([]);
  const [isMasterLoading, setIsMasterLoading] = useState(false);

  // Step 1: File Selection
  const [questionPdfFile, setQuestionPdfFile] = useState<File | null>(null);
  const [answerKeyPdfFile, setAnswerKeyPdfFile] = useState<File | null>(null);

  // Step 2: Metadata Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories?.[0]?.id || '');
  const [levelId, setLevelId] = useState('');
  const [levelName, setLevelName] = useState('');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [semester, setSemester] = useState<'GANJIL' | 'GENAP' | 'ALL'>('GENAP');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('XII');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // Step 3: LJK Setup
  const [questionCount, setQuestionCount] = useState<number>(40);
  const [defaultType, setDefaultType] = useState<QuestionType>('PG');
  const [optionsCount, setOptionsCount] = useState<number>(5); // 5 for A-E, 4 for A-D
  const [passingScore, setPassingScore] = useState<number>(75);
  const [ljkItems, setLjkItems] = useState<AnswerKeyItem[]>([]);

  // Step 4: Live Upload & Progress Bar
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transferredBytes, setTransferredBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadSpeedMbps, setUploadSpeedMbps] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const progressIntervalRef = useRef<any>(null);
  const toast = useToast();

  // Load all master data for dropdowns
  useEffect(() => {
    async function loadMasterData() {
      setIsMasterLoading(true);
      try {
        const res = await apiClient.get<{
          levels: LevelRecord[];
          grades: GradeRecord[];
          subjects: SubjectRecord[];
          tags: TagRecord[];
        }>('/master/all');
        if (res.success && res.data) {
          setMasterLevels(res.data.levels || []);
          setMasterGrades(res.data.grades || []);
          setMasterSubjects(res.data.subjects || []);
          setMasterTags(res.data.tags || []);

          if (res.data.levels && res.data.levels.length > 0 && !levelId) {
            setLevelId(res.data.levels[0].id);
            setLevelName(res.data.levels[0].name);
          }
        }
      } catch (e) {
        console.error('Failed to load master data for upload modal:', e);
      } finally {
        setIsMasterLoading(false);
      }
    }

    if (isOpen) {
      loadMasterData();
    }
  }, [isOpen]);

  // Initialize category ID if missing
  useEffect(() => {
    if (!categoryId && categories && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // Generate initial LJK items whenever questionCount or optionsCount changes
  useEffect(() => {
    const items: AnswerKeyItem[] = [];
    for (let i = 1; i <= questionCount; i++) {
      items.push({
        number: i,
        type: defaultType,
        optionsCount: defaultType === 'TF' ? 2 : optionsCount,
        correctAnswers: [],
        weight: 1,
      });
    }
    setLjkItems(items);
  }, [questionCount, defaultType, optionsCount]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handleLevelChange = (selectedId: string) => {
    setLevelId(selectedId);
    const found = masterLevels.find((l) => l.id === selectedId);
    if (found) {
      setLevelName(found.name);
    }
  };

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tagName));
    } else {
      setSelectedTags((prev) => [...prev, tagName]);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim().replace(/^#/, '');
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleQuestionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('File naskah soal wajib berformat .pdf');
        return;
      }
      setErrorMessage(null);
      setQuestionPdfFile(file);

      // Auto-suggest title and subject from filename if blank
      if (!title) {
        const cleanName = file.name
          .replace(/\.pdf$/i, '')
          .replace(/[-_]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        setTitle(cleanName);
      }
    }
  };

  const handleAnswerKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('File kunci jawaban harus berformat .pdf');
        return;
      }
      setErrorMessage(null);
      setAnswerKeyPdfFile(file);
    }
  };

  const handleLjkAnswerSelect = (num: number, key: string) => {
    setLjkItems((prev) =>
      prev.map((item) => {
        if (item.number === num) {
          const current = item.correctAnswers || [];
          const exists = current.includes(key);
          return {
            ...item,
            correctAnswers: exists
              ? current.filter((k) => k !== key)
              : item.type === 'PG' || item.type === 'TF'
              ? [key]
              : [...current, key],
          };
        }
        return item;
      })
    );
  };

  // Step Navigations
  const goToStep2 = () => {
    if (!questionPdfFile) {
      setErrorMessage('Silakan pilih berkas PDF Naskah Soal terlebih dahulu.');
      return;
    }
    setErrorMessage(null);
    setCurrentStep(2);
  };

  const goToStep3 = () => {
    if (!title.trim() || !subject.trim() || !categoryId) {
      setErrorMessage('Mohon lengkapi judul soal, mata pelajaran, dan kategori dokumen.');
      return;
    }
    setErrorMessage(null);
    setCurrentStep(3);
  };

  const goToStep4 = () => {
    setErrorMessage(null);
    setCurrentStep(4);
  };

  const handleStartUpload = async () => {
    if (!questionPdfFile) {
      setErrorMessage('File PDF Naskah Soal tidak ditemukan.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(0);

    const totalCalculatedBytes =
      (questionPdfFile?.size || 0) + (answerKeyPdfFile?.size || 0) + 12000;
    setTotalBytes(totalCalculatedBytes);
    setTransferredBytes(0);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('category_id', categoryId);
    if (levelId) formData.append('level_id', levelId);
    if (levelName) formData.append('level_name', levelName);
    formData.append('academic_year', academicYear);
    formData.append('semester', semester);
    formData.append('subject', subject.trim());
    formData.append('grade', grade);
    formData.append('tags', JSON.stringify(selectedTags));
    formData.append('question_count', String(questionCount || 40));
    formData.append('question_pdf', questionPdfFile);

    if (answerKeyPdfFile) {
      formData.append('answer_key_pdf', answerKeyPdfFile);
    }

    // Attach initial LJK config & answers
    const initialLjkPayload = {
      passing_score: passingScore,
      items: ljkItems,
    };
    formData.append('initial_ljk_data', JSON.stringify(initialLjkPayload));

    // Live progress simulation tracker
    let progress = 5;
    setUploadProgress(5);
    setUploadStage('1/4 Membaca dan memvalidasi struktur berkas PDF...');
    setUploadSpeedMbps(4.2);

    const stages = [
      { p: 25, stage: '2/4 Mengunggah naskah soal ke penyimpanan cloud...', speed: 6.8 },
      { p: 60, stage: '3/4 Menyimpan lembar jawaban LJK, KKM & Tags...', speed: 8.4 },
      { p: 88, stage: '4/4 Memverifikasi integritas hash file...', speed: 5.1 },
    ];

    let stageIdx = 0;
    progressIntervalRef.current = setInterval(() => {
      if (stageIdx < stages.length) {
        progress = stages[stageIdx].p;
        setUploadProgress(progress);
        setUploadStage(stages[stageIdx].stage);
        setUploadSpeedMbps(stages[stageIdx].speed);
        setTransferredBytes(Math.round((progress / 100) * totalCalculatedBytes));
        stageIdx++;
      }
    }, 450);

    try {
      const res = await apiClient.post<DocumentRecord>('/documents', formData);

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setUploadProgress(100);
      setTransferredBytes(totalCalculatedBytes);
      setUploadStage('Unggah berhasil diselesaikan!');

      if (res.success && res.data) {
        toast.success(
          'Unggah Berhasil!',
          `Dokumen ${res.data.document_code} dan konfigurasi LJK tersimpan di Bank Soal.`
        );
        setTimeout(() => {
          onSuccess(res.data);
          onClose();
        }, 800);
      } else {
        setErrorMessage(res.error?.message || 'Gagal mengunggah dokumen.');
        setIsUploading(false);
      }
    } catch (err: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setIsUploading(false);
      setErrorMessage(err.message || 'Terjadi gangguan jaringan saat mengunggah dokumen.');
    }
  };

  // Convert bytes to human readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatBits = (bytes: number) => {
    const bits = bytes * 8;
    if (bits < 1000) return `${bits} bit`;
    if (bits < 1000000) return `${(bits / 1000).toFixed(1)} Kbit`;
    return `${(bits / 1000000).toFixed(2)} Mbit`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isUploading) onClose();
      }}
      title="Alur Unggah Naskah Soal & Lembar LJK"
      subtitle="4 Langkah terstruktur: Pilih File → Isi Metadata & Tags → Buat LJK OMR → Unggah Berkas"
      maxWidth="4xl"
    >
      <div className="flex flex-col gap-5">
        {/* Step Indicator Header Bar */}
        <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => setCurrentStep(1)}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold transition-all ${
              currentStep === 1
                ? 'bg-indigo-600 text-white shadow-xs'
                : currentStep > 1
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
              {currentStep > 1 ? '✓' : '1'}
            </span>
            <span className="hidden sm:inline truncate">1. Pilih File</span>
          </button>

          <button
            type="button"
            disabled={isUploading || !questionPdfFile}
            onClick={() => questionPdfFile && setCurrentStep(2)}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold transition-all ${
              currentStep === 2
                ? 'bg-indigo-600 text-white shadow-xs'
                : currentStep > 2
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
              {currentStep > 2 ? '✓' : '2'}
            </span>
            <span className="hidden sm:inline truncate">2. Isi Form & Tags</span>
          </button>

          <button
            type="button"
            disabled={isUploading || !title || !subject}
            onClick={() => title && subject && setCurrentStep(3)}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold transition-all ${
              currentStep === 3
                ? 'bg-indigo-600 text-white shadow-xs'
                : currentStep > 3
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
              {currentStep > 3 ? '✓' : '3'}
            </span>
            <span className="hidden sm:inline truncate">3. Tambah LJK</span>
          </button>

          <button
            type="button"
            disabled={isUploading || !title}
            onClick={() => title && setCurrentStep(4)}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold transition-all ${
              currentStep === 4
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
              4
            </span>
            <span className="hidden sm:inline truncate">4. Upload</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: PILIH FILE */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Question PDF Upload Area */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  PDF Naskah Soal Ujian <span className="text-rose-500">* (Wajib)</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${
                    questionPdfFile
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-850'
                  }`}
                  onClick={() => document.getElementById('question-pdf-input')?.click()}
                >
                  <input
                    id="question-pdf-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleQuestionFileChange}
                  />
                  {questionPdfFile ? (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center mx-auto">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
                        {questionPdfFile.name}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatBytes(questionPdfFile.size)} ({formatBits(questionPdfFile.size)})
                      </p>
                      <span className="text-[10px] text-slate-400 block">Klik untuk ganti file</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        Klik atau Tarik File PDF Soal
                      </p>
                      <p className="text-[11px] text-slate-400">Maksimal 25MB (Format PDF)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Answer Key PDF Upload Area (Optional) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-600" />
                  PDF Kunci Jawaban Resmi <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${
                    answerKeyPdfFile
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-850'
                  }`}
                  onClick={() => document.getElementById('answer-key-pdf-input')?.click()}
                >
                  <input
                    id="answer-key-pdf-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleAnswerKeyFileChange}
                  />
                  {answerKeyPdfFile ? (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
                        {answerKeyPdfFile.name}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatBytes(answerKeyPdfFile.size)} ({formatBits(answerKeyPdfFile.size)})
                      </p>
                      <span className="text-[10px] text-slate-400 block">Klik untuk ganti file</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                        <Key className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                        Pilih PDF Kunci (Jika ada)
                      </p>
                      <p className="text-[11px] text-slate-400">Akan ditampilkan berdampingan di viewer</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={goToStep2}
                disabled={!questionPdfFile}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Lanjut: Isi Form Metadata</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2: ISI FORM & MASTER DATA (Jenjang, Kelas, Mapel, Tags) */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Naskah Soal / Ujian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Soal Penilaian Akhir Semester Matematika Wajib Kelas XII"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Jenjang Dropdown (Integrated Master Data) */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jenjang Pendidikan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={levelId}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  aria-label="Pilih Jenjang Pendidikan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 font-medium"
                >
                  <option value="">Pilih Jenjang</option>
                  {masterLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.code} - {lvl.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kategori Dokumen */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Dokumen <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  aria-label="Pilih Kategori Dokumen"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                >
                  {(categories || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mata Pelajaran (with master suggestions) */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Matematika, Fisika, Bahasa Indonesia"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    list="master-subjects-list"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                  />
                  <datalist id="master-subjects-list">
                    {masterSubjects.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Tingkat / Kelas */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tingkat / Kelas <span className="text-rose-500">*</span>
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  aria-label="Pilih Tingkat / Kelas"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                >
                  {masterGrades && masterGrades.length > 0 ? (
                    masterGrades.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="X">Kelas X (Sepuluh)</option>
                      <option value="XI">Kelas XI (Sebelas)</option>
                      <option value="XII">Kelas XII (Dua Belas)</option>
                      <option value="VII">Kelas VII (Tujuh)</option>
                      <option value="VIII">Kelas VIII (Delapan)</option>
                      <option value="IX">Kelas IX (Sembilan)</option>
                      <option value="UMUM">Umum / Semua Tingkat</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tahun Pelajaran
                </label>
                <input
                  type="text"
                  placeholder="2025/2026"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as any)}
                  aria-label="Pilih Semester"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                >
                  <option value="GANJIL">Semester Ganjil</option>
                  <option value="GENAP">Semester Genap</option>
                  <option value="ALL">Semua Semester</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Petunjuk Singkat
                </label>
                <input
                  type="text"
                  placeholder="Petunjuk khusus pengerjaan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Interactive Tag Management */}
              <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  Tags Pencarian & Kategori Khusus (Full Integrasi):
                </label>

                {/* Selected Tags Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-2xs"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className="hover:bg-indigo-700 p-0.5 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedTags.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">Belum ada tag dipilih.</span>
                  )}
                </div>

                {/* Master Tag Suggestions */}
                {masterTags && masterTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5 text-[11px]">
                    <span className="text-slate-400">Pilih dari Master:</span>
                    {masterTags.slice(0, 8).map((t) => {
                      const isSelected = selectedTags.includes(t.name);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleToggleTag(t.name)}
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-mono transition-colors ${
                            isSelected
                              ? 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                          }`}
                        >
                          +{t.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Add Custom Tag */}
                <div className="flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    placeholder="Tambah tag baru..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg"
                  >
                    + Tag
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                onClick={goToStep3}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Lanjut: Tambah Lembar LJK</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 3: TAMBAH LJK */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Butir Soal
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                  aria-label="Pilih Jumlah Butir Soal"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
                >
                  <option value={10}>10 Butir Soal</option>
                  <option value={20}>20 Butir Soal</option>
                  <option value={25}>25 Butir Soal</option>
                  <option value={30}>30 Butir Soal</option>
                  <option value={40}>40 Butir Soal (Standar)</option>
                  <option value={50}>50 Butir Soal</option>
                  <option value={100}>100 Butir Soal</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Format Opsi
                </label>
                <select
                  value={optionsCount}
                  onChange={(e) => setOptionsCount(parseInt(e.target.value, 10))}
                  aria-label="Pilih Opsi Pilihan Ganda"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                >
                  <option value={5}>5 Opsi (A - B - C - D - E)</option>
                  <option value={4}>4 Opsi (A - B - C - D)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batas Lulus (KKM)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value, 10) || 75)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kunci Terisi
                </label>
                <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                  {ljkItems.filter((i) => i.correctAnswers.length > 0).length} / {questionCount} Soal
                </div>
              </div>
            </div>

            {/* Quick Answer Grid */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-indigo-600" />
                  Matriks Kunci Jawaban Cepat (Opsional - Bisa diisi sekarang atau nanti)
                </span>
                <span className="text-[11px] text-slate-400">Klik opsi untuk mengisi</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-52 overflow-y-auto p-1">
                {ljkItems.map((item) => {
                  const opts = optionsCount === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];
                  return (
                    <div
                      key={item.number}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-1 text-[11px]"
                    >
                      <span className="font-mono font-bold text-slate-600 dark:text-slate-400 w-5 text-right shrink-0">
                        {item.number}.
                      </span>
                      <div className="flex items-center gap-1">
                        {opts.map((opt) => {
                          const isSelected = item.correctAnswers.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleLjkAnswerSelect(item.number, opt)}
                              className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-2xs font-mono scale-105'
                                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                onClick={goToStep4}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Lanjut: Konfirmasi & Unggah</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 4: RINGKASAN & LIVE PROGRESS UPLOAD */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Ringkasan Berkas yang Akan Diunggah:
              </h3>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block">Naskah Soal:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                    {questionPdfFile?.name}
                  </span>
                  <span className="text-indigo-600 font-mono">
                    {questionPdfFile && formatBytes(questionPdfFile.size)}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block">Kunci Jawaban PDF:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                    {answerKeyPdfFile ? answerKeyPdfFile.name : 'Tidak dilampirkan'}
                  </span>
                  <span className="text-emerald-600 font-mono">
                    {answerKeyPdfFile ? formatBytes(answerKeyPdfFile.size) : '-'}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block">Jenjang & Mata Pelajaran:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {levelName ? `${levelName} • ` : ''}{subject} • Kelas {grade}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block">Tags & KKM:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedTags.length > 0 ? selectedTags.map(t => `#${t}`).join(', ') : '-'} • KKM {passingScore}
                  </span>
                </div>
              </div>
            </div>

            {/* LIVE HORIZONTAL PROGRESS BAR WITH BIT & PERCENTAGE INDICATORS */}
            {isUploading && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    {uploadStage || 'Mengunggah berkas...'}
                  </span>
                  <span className="font-mono text-sm text-indigo-600 dark:text-indigo-400">
                    {uploadProgress}%
                  </span>
                </div>

                {/* Horizontal Progress Bar Track */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                    style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
                  />
                </div>

                {/* Transferred Bit / Byte Metrics */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-1 border-t border-indigo-100 dark:border-indigo-900/50">
                  <span>
                    Data Terkirim: <strong className="text-slate-900 dark:text-slate-100">{formatBytes(transferredBytes)}</strong> / {formatBytes(totalBytes)}
                  </span>
                  <span>
                    Bitrate: <strong className="text-emerald-600 dark:text-emerald-400">{formatBits(transferredBytes)}</strong> ({uploadSpeedMbps} MB/s)
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                disabled={isUploading}
                onClick={handleStartUpload}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sedang Mengunggah... ({uploadProgress}%)</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Mulai Unggah Paket Soal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
