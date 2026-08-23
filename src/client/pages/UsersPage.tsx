import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Save,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Eye,
  GraduationCap,
  Crown,
} from 'lucide-react';
import { User, UserRole } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { Modal } from '../components/Modal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { Badge } from '../components/Badge.js';
import { useToast } from '../context/ToastContext.js';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('TUTOR');
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toast = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<User[]>('/users');
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      toast.error('Gagal Memuat Pengguna', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('TUTOR');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (!editingUser && !password.trim()) {
      toast.warning('Kata Sandi Wajib', 'Pengguna baru harus memiliki kata sandi.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        role,
      };
      if (password.trim()) {
        payload.password = password.trim();
      }

      let res;
      if (editingUser) {
        res = await apiClient.put(`/users/${editingUser.id}`, payload);
      } else {
        res = await apiClient.post('/users', payload);
      }

      if (res.success) {
        toast.success('Pengguna Disimpan', `Akun ${name} berhasil disimpan.`);
        setIsModalOpen(false);
        fetchUsers();
      } else {
        toast.error('Gagal Menyimpan', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Menyimpan', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await apiClient.delete(`/users/${deleteTarget.id}`);
      if (res.success) {
        toast.success('Pengguna Dihapus', `Akun ${deleteTarget.name} telah dihapus.`);
        setDeleteTarget(null);
        fetchUsers();
      } else {
        toast.error('Gagal Menghapus', res.error?.message);
      }
    } catch (err: any) {
      toast.error('Gagal Menghapus', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (r: UserRole) => {
    if (r === 'ADMIN') {
      return (
        <Badge variant="primary" size="sm">
          <Crown className="w-3 h-3 mr-1 inline" />
          ADMINISTRATOR
        </Badge>
      );
    }
    if (r === 'TUTOR') {
      return (
        <Badge variant="success" size="sm">
          <GraduationCap className="w-3 h-3 mr-1 inline" />
          TUTOR / GURU
        </Badge>
      );
    }
    return (
      <Badge variant="default" size="sm">
        <Eye className="w-3 h-3 mr-1 inline" />
        VIEWER
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Manajemen Pengguna & Hak Akses
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola akun pengguna dengan 3 peran utama: <strong>Administrator</strong> (Full), <strong>Tutor</strong> (Upload, Download, Editor LJK), dan <strong>Viewer</strong> (Peninjau).
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Pengguna</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Peran / Hak Akses</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Terdaftar</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Memuat daftar pengguna...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                (users || []).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {u.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                          u.is_active ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {u.is_active ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Pengguna"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Hapus Pengguna"
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
      </div>

      {/* Modal Add / Edit User */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
        subtitle="Atur identitas, kata sandi, dan tingkat hak akses pengguna"
        maxWidth="md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Ahmad Dahlan, S.Pd."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="nama@banksoal.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kata Sandi {editingUser ? '(Kosongkan jika tidak ingin mengubah)' : <span className="text-rose-500">*</span>}
            </label>
            <input
              type="password"
              placeholder="Minimal 8 karakter..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Peran / Tingkat Akses <span className="text-rose-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              aria-label="Pilih Peran Pengguna"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 font-semibold"
            >
              <option value="ADMIN">👑 Administrator (Akses Penuh + Panel Pengaturan)</option>
              <option value="TUTOR">🎓 Tutor / Guru (Upload, Download, Editor LJK & Metadata)</option>
              <option value="VIEWER">👁️ Viewer / Siswa (Pratinjau Dokumen & Download)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Akun'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Akun Pengguna"
        message={`Apakah Anda yakin ingin menghapus akun "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={isDeleting ? 'Menghapus...' : 'Ya, Hapus Pengguna'}
        cancelLabel="Batal"
        isDanger={true}
        icon="danger"
        onConfirm={handleDeleteUser}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
