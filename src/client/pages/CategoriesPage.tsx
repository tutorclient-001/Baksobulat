import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  GraduationCap,
  Layers,
  BookOpen,
  Tag as TagIcon,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  Category,
  EducationLevel,
  GradeLevel,
  SubjectItem,
  SearchTag,
  MasterMetadataResponse,
} from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { Modal } from '../components/Modal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { useToast } from '../context/ToastContext.js';
import { Badge } from '../components/Badge.js';

interface CategoriesPageProps {
  onCategoriesUpdated?: () => void;
}

type TabKey = 'levels' | 'grades' | 'subjects' | 'tags' | 'categories';

export function CategoriesPage({ onCategoriesUpdated }: CategoriesPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('levels');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Master Data States
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [tags, setTags] = useState<SearchTag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Modals & Forms State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSaving, setIsSaving] = useState(false);

  // Active Editing Item
  const [editingLevel, setEditingLevel] = useState<EducationLevel | null>(null);
  const [editingGrade, setEditingGrade] = useState<GradeLevel | null>(null);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [editingTag, setEditingTag] = useState<SearchTag | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<any>({});

  // Delete Target & State
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: TabKey;
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'levels',
    id: '',
    name: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const toast = useToast();

  const fetchMasterData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<MasterMetadataResponse>('/master/all');
      if (res.success && res.data) {
        setLevels(res.data.levels || []);
        setGrades(res.data.grades || []);
        setSubjects(res.data.subjects || []);
        setTags(res.data.tags || []);
        setCategories(res.data.categories || []);
      }
    } catch (err: any) {
      toast.error('Gagal Memuat Metadata Master', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  // Open Create Modal for Current Tab
  const handleOpenAdd = () => {
    setModalMode('create');
    setFormData({});
    if (activeTab === 'levels') {
      setEditingLevel(null);
      setFormData({ name: '', code: '', description: '', order_index: levels.length + 1 });
    } else if (activeTab === 'grades') {
      setEditingGrade(null);
      setFormData({
        level_id: levels[0]?.id || '',
        name: '',
        code: '',
        order_index: grades.length + 1,
      });
    } else if (activeTab === 'subjects') {
      setEditingSubject(null);
      setFormData({ name: '', code: '', category: 'MIPA', description: '' });
    } else if (activeTab === 'tags') {
      setEditingTag(null);
      setFormData({ name: '', slug: '', color: 'indigo', description: '' });
    } else if (activeTab === 'categories') {
      setEditingCategory(null);
      setFormData({ name: '', slug: '', description: '' });
    }
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: any) => {
    setModalMode('edit');
    if (activeTab === 'levels') {
      setEditingLevel(item);
      setFormData({ ...item });
    } else if (activeTab === 'grades') {
      setEditingGrade(item);
      setFormData({ ...item });
    } else if (activeTab === 'subjects') {
      setEditingSubject(item);
      setFormData({ ...item });
    } else if (activeTab === 'tags') {
      setEditingTag(item);
      setFormData({ ...item });
    } else if (activeTab === 'categories') {
      setEditingCategory(item);
      setFormData({ ...item });
    }
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let endpoint = '';
      let payload = { ...formData };

      if (activeTab === 'levels') {
        endpoint = modalMode === 'create' ? '/levels' : `/levels/${editingLevel?.id}`;
      } else if (activeTab === 'grades') {
        // match level name
        const selLvl = levels.find((l) => l.id === payload.level_id);
        if (selLvl) payload.level_name = selLvl.name;
        endpoint = modalMode === 'create' ? '/grades' : `/grades/${editingGrade?.id}`;
      } else if (activeTab === 'subjects') {
        endpoint = modalMode === 'create' ? '/subjects' : `/subjects/${editingSubject?.id}`;
      } else if (activeTab === 'tags') {
        endpoint = modalMode === 'create' ? '/tags' : `/tags/${editingTag?.id}`;
      } else if (activeTab === 'categories') {
        endpoint = modalMode === 'create' ? '/categories' : `/categories/${editingCategory?.id}`;
      }

      let res;
      if (modalMode === 'create') {
        res = await apiClient.post(endpoint, payload);
      } else {
        res = await apiClient.put(endpoint, payload);
      }

      if (res.success) {
        toast.success('Data Tersimpan', 'Perubahan metadata master berhasil disimpan ke database.');
        setIsModalOpen(false);
        fetchMasterData();
        if (onCategoriesUpdated) onCategoriesUpdated();
      } else {
        toast.error('Gagal Menyimpan', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Menyimpan', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);

    try {
      let endpoint = '';
      if (deleteDialog.type === 'levels') endpoint = `/levels/${deleteDialog.id}`;
      else if (deleteDialog.type === 'grades') endpoint = `/grades/${deleteDialog.id}`;
      else if (deleteDialog.type === 'subjects') endpoint = `/subjects/${deleteDialog.id}`;
      else if (deleteDialog.type === 'tags') endpoint = `/tags/${deleteDialog.id}`;
      else if (deleteDialog.type === 'categories') endpoint = `/categories/${deleteDialog.id}`;

      const res = await apiClient.delete(endpoint);
      if (res.success) {
        toast.success('Data Terhapus', `"${deleteDialog.name}" berhasil dihapus.`);
        setDeleteDialog({ isOpen: false, type: 'levels', id: '', name: '' });
        fetchMasterData();
        if (onCategoriesUpdated) onCategoriesUpdated();
      } else {
        toast.error('Gagal Menghapus', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Menghapus', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered List based on Search Query
  const q = searchQuery.toLowerCase().trim();

  const filteredLevels = levels.filter(
    (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
  );

  const filteredGrades = grades.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.code.toLowerCase().includes(q) ||
      (g.level_name && g.level_name.toLowerCase().includes(q))
  );

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q))
  );

  const filteredTags = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
  );

  const filteredCategories = categories.filter(
    (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Kategori & Metadata Bank Soal
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pusat master data naskah: Jenjang Pendidikan, Tingkat Kelas, Mata Pelajaran, Tags Pencarian, dan Jenis Evaluasi.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchMasterData}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>
              Tambah{' '}
              {activeTab === 'levels'
                ? 'Jenjang'
                : activeTab === 'grades'
                ? 'Kelas'
                : activeTab === 'subjects'
                ? 'Mata Pelajaran'
                : activeTab === 'tags'
                ? 'Tag Pencarian'
                : 'Kategori'}
            </span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('levels');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'levels'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>1. Jenjang ({levels.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('grades');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'grades'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Kelas ({grades.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('subjects');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'subjects'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>3. Mata Pelajaran ({subjects.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tags');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'tags'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TagIcon className="w-4 h-4" />
            <span>4. Tags Pencarian ({tags.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('categories');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'categories'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>5. Kategori Ujian ({categories.length})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari dalam daftar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Main Content Table for Active Tab */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* TAB 1: JENJANG PENDIDIKAN */}
        {activeTab === 'levels' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">Urutan</th>
                  <th className="py-3 px-4">Nama Jenjang</th>
                  <th className="py-3 px-3">Kode Singkat</th>
                  <th className="py-3 px-3">Deskripsi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
                    </td>
                  </tr>
                ) : filteredLevels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Tidak ada data jenjang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredLevels.map((lvl, idx) => (
                    <tr key={lvl.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {lvl.order_index ?? idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{lvl.name}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant="primary" size="sm">
                          {lvl.code}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                        {lvl.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(lvl)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Jenjang"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                type: 'levels',
                                id: lvl.id,
                                name: lvl.name,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Hapus Jenjang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: TINGKAT / KELAS */}
        {activeTab === 'grades' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">Urutan</th>
                  <th className="py-3 px-4">Nama Kelas</th>
                  <th className="py-3 px-3">Kode</th>
                  <th className="py-3 px-3">Jenjang Pendidikan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
                    </td>
                  </tr>
                ) : filteredGrades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Tidak ada data kelas ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredGrades.map((grd, idx) => (
                    <tr key={grd.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {grd.order_index ?? idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {grd.name}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {grd.code}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant="default" size="sm">
                          {grd.level_name || 'Semua Jenjang'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(grd)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Kelas"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                type: 'grades',
                                id: grd.id,
                                name: grd.name,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Hapus Kelas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: MATA PELAJARAN */}
        {activeTab === 'subjects' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Nama Mata Pelajaran</th>
                  <th className="py-3 px-3">Kode Singkat</th>
                  <th className="py-3 px-3">Rumpun / Kategori</th>
                  <th className="py-3 px-3">Keterangan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
                    </td>
                  </tr>
                ) : filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Tidak ada mata pelajaran ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((sbj) => (
                    <tr key={sbj.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{sbj.name}</span>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {sbj.code}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant="default" size="sm">
                          {sbj.category || 'Umum'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                        {sbj.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(sbj)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Mapel"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                type: 'subjects',
                                id: sbj.id,
                                name: sbj.name,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Hapus Mapel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: TAGS PENCARIAN */}
        {activeTab === 'tags' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Nama Tag</th>
                  <th className="py-3 px-3">Preview Badge</th>
                  <th className="py-3 px-3">Slug Filter</th>
                  <th className="py-3 px-3">Deskripsi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
                    </td>
                  </tr>
                ) : filteredTags.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Tidak ada tag pencarian ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredTags.map((tg) => (
                    <tr key={tg.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {tg.name}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          #{tg.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                        {tg.slug}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                        {tg.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(tg)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Tag"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                type: 'tags',
                                id: tg.id,
                                name: tg.name,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Hapus Tag"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: KATEGORI UJIAN */}
        {activeTab === 'categories' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Nama Kategori</th>
                  <th className="py-3 px-3">Slug URL</th>
                  <th className="py-3 px-3">Deskripsi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Tidak ada kategori terdaftar.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {cat.name}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                        {cat.slug}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                        {cat.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Kategori"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                type: 'categories',
                                id: cat.id,
                                name: cat.name,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Hapus Kategori"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Add / Edit Modal for Current Entity */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create'
            ? `Tambah ${
                activeTab === 'levels'
                  ? 'Jenjang Pendidikan'
                  : activeTab === 'grades'
                  ? 'Tingkat Kelas'
                  : activeTab === 'subjects'
                  ? 'Mata Pelajaran'
                  : activeTab === 'tags'
                  ? 'Tag Pencarian'
                  : 'Kategori Ujian'
              } Baru`
            : `Edit ${
                activeTab === 'levels'
                  ? 'Jenjang Pendidikan'
                  : activeTab === 'grades'
                  ? 'Tingkat Kelas'
                  : activeTab === 'subjects'
                  ? 'Mata Pelajaran'
                  : activeTab === 'tags'
                  ? 'Tag Pencarian'
                  : 'Kategori Ujian'
              }`
        }
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
          {/* TAB 1: FORM JENJANG */}
          {activeTab === 'levels' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Jenjang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMA / MA (Menengah Atas)"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Singkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SMA"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    value={formData.order_index ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, order_index: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan cakupan jenjang..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </>
          )}

          {/* TAB 2: FORM KELAS */}
          {activeTab === 'grades' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jenjang Pendidikan
                </label>
                <select
                  value={formData.level_id || ''}
                  onChange={(e) => setFormData({ ...formData, level_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                >
                  <option value="">-- Pilih Jenjang (Opsional) --</option>
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name} ({lvl.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas 12 (XII)"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Singkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 12"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Urutan
                  </label>
                  <input
                    type="number"
                    value={formData.order_index ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, order_index: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </>
          )}

          {/* TAB 3: FORM MATA PELAJARAN */}
          {activeTab === 'subjects' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Fisika"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Singkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: FIS"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rumpun / Kelompok
                  </label>
                  <select
                    value={formData.category || 'MIPA'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="MIPA">MIPA / Sains</option>
                    <option value="IPS">IPS / Sosial</option>
                    <option value="Bahasa">Bahasa & Sastra</option>
                    <option value="Teknologi">Teknologi & Informatika</option>
                    <option value="Agama">Pendidikan Agama</option>
                    <option value="Kesehatan">Kesehatan & Olahraga</option>
                    <option value="Umum">Umum / Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Catatan
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan kurikulum atau materi mapel..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </>
          )}

          {/* TAB 4: FORM TAGS PENCARIAN */}
          {activeTab === 'tags' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Tag Pencarian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kurikulum Merdeka, HOTS, UTBK"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Slug URL (Otomatis dibuat jika kosong)
                </label>
                <input
                  type="text"
                  placeholder="contoh: kurikulum-merdeka"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Kegunaan
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tag ini..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </>
          )}

          {/* TAB 5: FORM KATEGORI UJIAN */}
          {activeTab === 'categories' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penilaian Akhir Semester (PAS)"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Slug URL (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="contoh: pas"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Kategori
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan peruntukan kategori..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Data'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, type: 'levels', id: '', name: '' })}
        onConfirm={handleDeleteConfirm}
        title="Hapus Data Master?"
        message={`Apakah Anda yakin ingin menghapus data "${deleteDialog.name}"? Data dokumen yang telah tersimpan tidak akan hilang.`}
        confirmLabel="Hapus Data"
        isDanger={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
