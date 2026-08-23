import React, { useState, useEffect } from 'react';
import { History, RefreshCw, ShieldCheck, User, Clock, FileText } from 'lucide-react';
import { AuditLog } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { Badge } from '../components/Badge.js';
import { useToast } from '../context/ToastContext.js';

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<AuditLog[]>('/audit-logs?limit=100');
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err: any) {
      toast.error('Gagal Memuat Audit Log', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE') || action.includes('UPLOAD')) {
      return <Badge variant="success" size="sm">{action}</Badge>;
    }
    if (action.includes('UPDATE') || action.includes('RESTORE')) {
      return <Badge variant="primary" size="sm">{action}</Badge>;
    }
    if (action.includes('DELETE') || action.includes('TRASH')) {
      return <Badge variant="danger" size="sm">{action}</Badge>;
    }
    return <Badge variant="default" size="sm">{action}</Badge>;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Audit Log Aktivitas Sistem
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Jejak rekaman mutasi data, pengunggahan berkas, pembaruan kunci jawaban, dan aksi keamanan pengguna.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-3">Pengguna</th>
                <th className="py-3 px-3">Aksi</th>
                <th className="py-3 px-3">Entitas</th>
                <th className="py-3 px-4">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    Belum ada rekaman audit log.
                  </td>
                </tr>
              ) : (
                (logs || []).map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                    <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                      {log.user_name || log.user_id || 'System'}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-3 text-zinc-500">
                      {log.entity_type} {log.entity_id ? `(${log.entity_id.substring(0, 10)}...)` : ''}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 max-w-xs truncate font-mono text-[10px]">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
