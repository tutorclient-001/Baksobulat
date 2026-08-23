import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  Upload,
  FileText,
  Key,
  AlertCircle,
  Tag,
  GraduationCap,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from './Modal.js';
import {
  Category,
  DocumentRecord,
  LevelRecord,
  GradeRecord,
  SubjectRecord,
  TagRecord,
} from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { useToast } from '../context/ToastContext.js';

interface DocumentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord;
  categories: Category[];
  onSuccess: (updatedDoc: DocumentRecord) => void;
}

export function DocumentEditModal({
  isOpen,
  onClose,
  document,
  categories,
  onSuccess,
}: DocumentEditModalProps) {
  // Master Data state
  const [masterLevels, setMasterLevels] = useState<LevelRecord[]>([]);
  const [masterGrades, setMasterGrades] = useState<GradeRecord[]>([]);
  const [masterSubjects, setMasterSubjects] = useState<SubjectRecord[]>([]);
  const [masterTags, setMasterTags] = useState<TagRecord[]>([]);

  // Form states
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description || '');
  const [categoryId, setCategoryId] = useState(document.category_id);
  const [levelId, setLevelId] = useState(document.level_id || '');
  const [levelName, setLevelName] = useState(document.level_name || '');
  const [academicYear, setAcademicYear] = useState(document.academic_year);
  const [semester, setSemester] = useState<'GANJIL' | 'GENAP' | 'ALL'>(document.semester);
  const [subject, setSubject] = useState(document.subject);
  const [grade, setGrade] = useState(document.grade);
  const [questionCount, setQuestionCount] = useState<number>(document.question_count || 40);
  const [selectedTags, setSelectedTags] = useState<string[]>(document.tags || []);
  const [customTagInput, setCustomTagInput] = useState('');

  // File replacement
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementType, setReplacementType] = useState<'QUESTION' | 'ANSWER_KEY'>('QUESTION');
  const [isReplacingFile, setIsReplacingFile] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    async function loadMasterData() {
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
        }
      } catch (e) {
        console.error('Failed to load master data in edit modal:', e);
      }
    }

    if (isOpen) {
      loadMasterData();
    }
  }, [isOpen]);

  useEffect(() => {
    setTitle(document.title);
    setDescription(document.description || '');
    setCategoryId(document.category_id);
    setLevelId(document.level_id || '');
    setLevelName(document.level_name || '');
    setAcademicYear(document.academic_year);
    setSemester(document.semester);
    setSubject(document.subject);
    setGrade(document.grade);
    setQuestionCount(document.question_count || 40);
    setSelectedTags(document.tags || []);
  }, [document]);

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

  const handleUpdateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.put<DocumentRecord>(`/documents/${document.id}`, {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        level_id: levelId || undefined,
        level_name: levelName || undefined,
        academic_year: academicYear,
        semester,
        subject: subject.trim(),
        grade: grade.trim(),
        tags: selectedTags,
        question_count: questionCount,
      });

      if (res.success && res.data) {
        toast.success('Metadata Diperbarui', 'Perubahan metadata dokumen berhasil disimpan.');
        onSuccess(res.data);
        onClose();
      } else {
        setErrorMessage(res.error?.message || 'Gagal memperbarui metadata.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReplaceFileSubmit = async () => {
    if (!replacementFile) {
      toast.warning('Pilih File', 'Silakan pilih file PDF baru terlebih dahulu.');
      return;
    }

    setIsReplacingFile(true);
    const formData = new FormData();
    formData.append('file_type', replacementType);
    formData.append('file', replacementFile);

    try {
      const res = await apiClient.post<DocumentRecord>(
        `/documents/${document.id}/replace-file`,
        formData
      );

      if (res.success && res.data) {
        toast.success(
          'File Diganti',
          `File PDF ${replacementType === 'QUESTION' ? 'Soal' : 'Kunci Jawaban'} berhasil diperbarui di Google Drive.`
        );
        onSuccess(res.data);
        setReplacementFile(null);
      } else {
        toast.error('Gagal Mengganti File', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Mengganti File', err.message);
    } finally {
      setIsReplacingFile(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Dokumen Bank Soal (Full CRUD)"
      subtitle={`Kode: ${document.document_code}`}
      maxWidth="4xl"
    >
      <div className="flex flex-col gap-5">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleUpdateMetadata} className="flex flex-col gap-3.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Judul Dokumen <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* Jenjang */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jenjang Pendidikan
              </label>
              <select
                value={levelId}
                onChange={(e) => handleLevelChange(e.target.value)}
                aria-label="Pilih Jenjang Pendidikan"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              >
                <option value="">Pilih Jenjang</option>
                {masterLevels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} - {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Kategori */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Dokumen <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                aria-label="Pilih Kategori"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              >
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mata Pelajaran */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mata Pelajaran <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  list="edit-master-subjects-list"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
                <datalist id="edit-master-subjects-list">
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
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              >
                {masterGrades && masterGrades.length > 0 ? (
                  masterGrades.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                    <option value="VII">Kelas VII</option>
                    <option value="VIII">Kelas VIII</option>
                    <option value="IX">Kelas IX</option>
                    <option value="UMUM">Umum</option>
                  </>
                )}
              </select>
            </div>

            {/* Tahun Pelajaran */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tahun Ajaran <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* Semester */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as any)}
                aria-label="Pilih Semester"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              >
                <option value="GENAP">Semester Genap</option>
                <option value="GANJIL">Semester Ganjil</option>
                <option value="ALL">Semua / Tahunan</option>
              </select>
            </div>

            {/* Jumlah Soal */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Butir Soal
              </label>
              <input
                type="number"
                min="0"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* Deskripsi */}
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi / Catatan
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* Tags Management */}
            <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Tags Pencarian (Full CURD):
              </label>

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
                  placeholder="Tambah tag..."
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

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan Metadata'}</span>
            </button>
          </div>
        </form>

        {/* ------------------------------------------------------------- */}
        {/* SAFE FILE REPLACEMENT SECTION */}
        {/* ------------------------------------------------------------- */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
            Ganti / Perbarui Berkas PDF (Safe Storage Replacement)
          </h4>
          <p className="text-[11px] text-slate-500 mb-3">
            File baru akan diunggah dan divalidasi ke Google Drive sebelum menggantikan file lama.
          </p>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <select
                value={replacementType}
                onChange={(e) => setReplacementType(e.target.value as any)}
                aria-label="Pilih Berkas yang Akan Diganti"
                className="px-2.5 py-1.5 font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
              >
                <option value="QUESTION">PDF Naskah Soal</option>
                <option value="ANSWER_KEY">PDF Kunci Jawaban</option>
              </select>

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setReplacementFile(e.target.files?.[0] || null)}
                aria-label="Pilih File PDF Pengganti"
                className="text-xs text-slate-500 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-200 dark:file:bg-slate-700 file:text-xs cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleReplaceFileSubmit}
              disabled={!replacementFile || isReplacingFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            >
              {isReplacingFile ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>Unggah Pengganti</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
