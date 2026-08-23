import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Tag, GraduationCap } from 'lucide-react';
import { Category, DocumentFilterParams, LevelRecord, GradeRecord, TagRecord } from '../../shared/types.js';
import { apiClient } from '../api/apiClient.js';

interface FilterBarProps {
  filters: DocumentFilterParams;
  categories: Category[];
  onFilterChange: (newFilters: Partial<DocumentFilterParams>) => void;
  onReset: () => void;
}

export function FilterBar({ filters, categories, onFilterChange, onReset }: FilterBarProps) {
  const [levels, setLevels] = useState<LevelRecord[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [popularTags, setPopularTags] = useState<TagRecord[]>([]);

  useEffect(() => {
    async function loadMaster() {
      try {
        const res = await apiClient.get<{
          levels: LevelRecord[];
          grades: GradeRecord[];
          tags: TagRecord[];
        }>('/master/all');
        if (res.success && res.data) {
          setLevels(res.data.levels || []);
          setGrades(res.data.grades || []);
          setPopularTags(res.data.tags || []);
        }
      } catch (e) {
        console.error('Failed to load filter bar master data', e);
      }
    }
    loadMaster();
  }, []);

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.categoryId ||
    filters.academicYear ||
    (filters.semester && filters.semester !== 'ALL') ||
    filters.grade ||
    (filters.hasAnswerKey && filters.hasAnswerKey !== 'all')
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex flex-col gap-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari judul soal, kode dokumen, mata pelajaran, materi, jenjang, atau #tag..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={filters.categoryId || ''}
            onChange={(e) => onFilterChange({ categoryId: e.target.value || undefined, page: 1 })}
            aria-label="Pilih Kategori Dokumen"
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-600"
          >
            <option value="">Semua Kategori</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Tingkat / Kelas Dropdown (Master Data) */}
          <select
            value={filters.grade || ''}
            onChange={(e) => onFilterChange({ grade: e.target.value || undefined, page: 1 })}
            aria-label="Pilih Tingkat atau Kelas"
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-600"
          >
            <option value="">Semua Kelas</option>
            {grades && grades.length > 0 ? (
              grades.map((g) => (
                <option key={g.id} value={g.name}>
                  Kelas {g.name}
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
              </>
            )}
          </select>

          {/* Semester */}
          <select
            value={filters.semester || 'ALL'}
            onChange={(e) => onFilterChange({ semester: e.target.value || 'ALL', page: 1 })}
            aria-label="Pilih Semester"
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-600"
          >
            <option value="ALL">Semua Semester</option>
            <option value="GANJIL">Semester Ganjil</option>
            <option value="GENAP">Semester Genap</option>
          </select>

          {/* Status Kunci Jawaban */}
          <select
            value={filters.hasAnswerKey || 'all'}
            onChange={(e) => onFilterChange({ hasAnswerKey: (e.target.value as any) || 'all', page: 1 })}
            aria-label="Filter Ketersediaan Kunci Jawaban"
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-600"
          >
            <option value="all">Semua Status KJ</option>
            <option value="yes">✓ Kunci Jawaban Ada</option>
            <option value="no">✗ Belum Ada Kunci</option>
          </select>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Popular Tags Quick Filters */}
      {popularTags && popularTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Tag className="w-3 h-3 text-indigo-500" />
            Filter Cepat Tag:
          </span>
          {popularTags.slice(0, 7).map((tag) => {
            const isFilterActive = filters.search === tag.name;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  onFilterChange({
                    search: isFilterActive ? '' : tag.name,
                    page: 1,
                  })
                }
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors ${
                  isFilterActive
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                #{tag.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
