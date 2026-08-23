import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Eye, FileText, Key, RefreshCw } from 'lucide-react';
import { StatisticsOverview } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';
import { useToast } from '../context/ToastContext.js';

export function StatisticsPage() {
  const [stats, setStats] = useState<StatisticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<StatisticsOverview>('/statistics/overview');
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      toast.error('Gagal Memuat Statistik', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-zinc-500">Memuat analisis statistik repositori...</p>
      </div>
    );
  }

  const maxCatCount = Math.max(...(stats?.categoryDistribution?.map((c) => c.count) || [1]));
  const maxYearCount = Math.max(...(stats?.academicYearDistribution?.map((y) => y.count) || [1]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Statistik & Analisis Bank Soal
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Ikhtisar metrik repositori naskah soal, kelengkapan kunci jawaban LJK, dan aktivitas akses berkas.
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 flex items-center gap-1.5 mb-1">
            <FileText className="w-4 h-4 text-indigo-500" /> Total Soal
          </span>
          <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {stats?.totalActiveDocuments || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 flex items-center gap-1.5 mb-1">
            <Key className="w-4 h-4 text-emerald-500" /> Kunci LJK Ada
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {stats?.totalAnswerKeys || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 flex items-center gap-1.5 mb-1">
            <Download className="w-4 h-4 text-violet-500" /> Total Unduhan
          </span>
          <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {stats?.totalDownloads || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 flex items-center gap-1.5 mb-1">
            <Eye className="w-4 h-4 text-sky-500" /> Total Pratinjau
          </span>
          <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {stats?.totalPreviews || 0}
          </p>
        </div>
      </div>

      {/* Distribution Charts Visuals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown Bars */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-500" />
            Distribusi Berdasarkan Kategori
          </h3>
          <div className="space-y-3">
            {(stats?.categoryDistribution || []).map((c) => {
              const pct = maxCatCount > 0 ? (c.count / maxCatCount) * 100 : 0;
              return (
                <div key={c.category_name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-700 dark:text-zinc-300">{c.category_name}</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {c.count} naskah
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Academic Year Breakdown */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Distribusi Tahun Pelajaran
          </h3>
          <div className="space-y-3">
            {(stats?.academicYearDistribution || []).map((y) => {
              const pct = maxYearCount > 0 ? (y.count / maxYearCount) * 100 : 0;
              return (
                <div key={y.academic_year} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-700 dark:text-zinc-300">Tahun {y.academic_year}</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {y.count} naskah
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
