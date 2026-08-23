import { query, isDbPostgres, memoryStore } from '../config/database.js';
import { StatisticsOverview, DocumentRecord, AuditLog } from '../../shared/types.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';

export class StatisticsService {
  async getOverview(): Promise<StatisticsOverview> {
    if (isDbPostgres()) {
      // 1. Basic counts
      const countsSql = `
        SELECT 
          (SELECT COUNT(*) FROM documents WHERE status = 'ACTIVE')::int as active_docs,
          (SELECT COUNT(*) FROM documents WHERE status = 'TRASHED')::int as trashed_docs,
          (SELECT COUNT(*) FROM categories WHERE is_deleted = false)::int as categories_count,
          (SELECT COUNT(*) FROM users WHERE is_active = true)::int as users_count,
          (SELECT COUNT(*) FROM answer_keys)::int as ak_count,
          (SELECT COALESCE(SUM(file_size), 0) FROM document_files)::bigint as total_bytes,
          (SELECT COUNT(*) FROM audit_logs WHERE action = 'DOWNLOAD_DOCUMENT')::int as total_downloads,
          (SELECT COUNT(*) FROM audit_logs WHERE action = 'PREVIEW_DOCUMENT')::int as total_previews
      `;
      const countsRes = await query(countsSql);
      const c = countsRes.rows[0] || {};

      // 2. Category distribution
      const catSql = `
        SELECT c.name as category_name, COUNT(d.id)::int as count
        FROM categories c
        LEFT JOIN documents d ON c.id = d.category_id AND d.status = 'ACTIVE'
        WHERE c.is_deleted = false
        GROUP BY c.name
        ORDER BY count DESC
      `;
      const catRes = await query(catSql);

      // 3. Grade distribution
      const gradeSql = `
        SELECT grade, COUNT(id)::int as count
        FROM documents
        WHERE status = 'ACTIVE'
        GROUP BY grade
        ORDER BY grade ASC
      `;
      const gradeRes = await query(gradeSql);

      // 4. Semester distribution
      const semSql = `
        SELECT semester, COUNT(id)::int as count
        FROM documents
        WHERE status = 'ACTIVE'
        GROUP BY semester
        ORDER BY semester ASC
      `;
      const semRes = await query(semSql);

      // 5. Year distribution
      const yearSql = `
        SELECT academic_year, COUNT(id)::int as count
        FROM documents
        WHERE status = 'ACTIVE'
        GROUP BY academic_year
        ORDER BY academic_year DESC
      `;
      const yearRes = await query(yearSql);

      // 6. Recent uploads
      const recentDocsSql = `
        SELECT d.*, c.name as category_name, u.name as created_by_name
        FROM documents d
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.status = 'ACTIVE'
        ORDER BY d.created_at DESC
        LIMIT 6
      `;
      const recentDocsRes = await query<DocumentRecord>(recentDocsSql);

      // 7. Recent activity
      const recentActivity = await auditLogRepository.listRecent(15);

      return {
        totalActiveDocuments: c.active_docs || 0,
        totalTrashedDocuments: c.trashed_docs || 0,
        totalCategories: c.categories_count || 0,
        totalUsers: c.users_count || 0,
        totalAnswerKeys: c.ak_count || 0,
        totalDownloads: c.total_downloads || 0,
        totalPreviews: c.total_previews || 0,
        storageUsageMb: Math.round(((Number(c.total_bytes) || 0) / (1024 * 1024)) * 100) / 100,
        categoryDistribution: catRes.rows,
        gradeDistribution: gradeRes.rows,
        semesterDistribution: semRes.rows,
        yearDistribution: yearRes.rows,
        recentUploads: recentDocsRes.rows,
        recentActivity,
      };
    }

    // Memory Store Aggregations
    const activeDocs = memoryStore.documents.filter((d) => d.status === 'ACTIVE');
    const trashedDocs = memoryStore.documents.filter((d) => d.status === 'TRASHED');
    const activeCategories = memoryStore.categories.filter((c) => !c.is_deleted);
    const activeUsers = memoryStore.users.filter((u) => u.is_active);

    const totalBytes = memoryStore.documentFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);
    const totalDownloads = memoryStore.auditLogs.filter((l) => l.action === 'DOWNLOAD_DOCUMENT').length;
    const totalPreviews = memoryStore.auditLogs.filter((l) => l.action === 'PREVIEW_DOCUMENT').length;

    // Categories
    const categoryDistribution = activeCategories.map((c) => ({
      category_name: c.name,
      count: activeDocs.filter((d) => d.category_id === c.id).length,
    }));

    // Grades
    const gradeMap: Record<string, number> = {};
    activeDocs.forEach((d) => {
      gradeMap[d.grade] = (gradeMap[d.grade] || 0) + 1;
    });
    const gradeDistribution = Object.entries(gradeMap).map(([grade, count]) => ({ grade, count }));

    // Semester
    const semMap: Record<string, number> = {};
    activeDocs.forEach((d) => {
      semMap[d.semester] = (semMap[d.semester] || 0) + 1;
    });
    const semesterDistribution = Object.entries(semMap).map(([semester, count]) => ({ semester, count }));

    // Academic Year
    const yearMap: Record<string, number> = {};
    activeDocs.forEach((d) => {
      yearMap[d.academic_year] = (yearMap[d.academic_year] || 0) + 1;
    });
    const yearDistribution = Object.entries(yearMap).map(([academic_year, count]) => ({ academic_year, count }));

    // Recent uploads
    const recentUploads: DocumentRecord[] = activeDocs.slice(0, 6).map((doc) => {
      const cat = memoryStore.categories.find((c) => c.id === doc.category_id);
      const user = memoryStore.users.find((u) => u.id === doc.created_by);
      return {
        ...doc,
        category_name: cat?.name,
        created_by_name: user?.name,
      };
    });

    const recentActivity = await auditLogRepository.listRecent(15);

    return {
      totalActiveDocuments: activeDocs.length,
      totalTrashedDocuments: trashedDocs.length,
      totalCategories: activeCategories.length,
      totalUsers: activeUsers.length,
      totalAnswerKeys: memoryStore.answerKeys.length,
      totalDownloads,
      totalPreviews,
      storageUsageMb: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
      categoryDistribution,
      gradeDistribution,
      semesterDistribution,
      yearDistribution,
      recentUploads,
      recentActivity,
    };
  }
}

export const statisticsService = new StatisticsService();
