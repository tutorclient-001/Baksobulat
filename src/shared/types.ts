export type UserRole = 'ADMIN' | 'TUTOR' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  document_count?: number;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface EducationLevel {
  id: string;
  name: string;
  code: string;
  description?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GradeLevel {
  id: string;
  level_id?: string;
  level_name?: string;
  name: string;
  code: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  category?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SearchTag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export type LevelRecord = EducationLevel;
export type GradeRecord = GradeLevel;
export type SubjectRecord = SubjectItem;
export type TagRecord = SearchTag;

export interface MasterMetadataResponse {
  categories: Category[];
  levels: EducationLevel[];
  grades: GradeLevel[];
  subjects: SubjectItem[];
  tags: SearchTag[];
}

export type DocumentStatus = 'ACTIVE' | 'TRASHED';

export type FileType = 'QUESTION' | 'ANSWER_KEY';

export interface DocumentFile {
  id: string;
  document_id: string;
  google_drive_file_id: string;
  google_drive_folder_id?: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  file_hash: string;
  file_type: FileType;
  created_at: string;
}

export type QuestionType = 'PG' | 'PGK' | 'TF' | 'ESSAY';

export interface LjkOption {
  key: string; // 'A', 'B', 'C', 'D', 'E'
  text?: string;
}

export interface AnswerKeyItem {
  number: number;
  type: QuestionType;
  optionsCount: number; // e.g. 4 for A-D, 5 for A-E, 2 for T/F
  correctAnswers: string[]; // e.g. ['A'] for PG, ['A', 'C'] for PGK, ['T'] for TF, or ['kata kunci'] for Essay
  essayKeywords?: string[];
  essayRubric?: string;
  weight: number; // point weight, default 1 or 2
  explanation?: string;
}

export interface AnswerKey {
  id: string;
  document_id: string;
  total_questions: number;
  passing_score?: number;
  max_score?: number;
  items: AnswerKeyItem[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  document_code: string;
  title: string;
  description: string;
  category_id: string;
  category_name?: string;
  level_id?: string;
  level_name?: string;
  academic_year: string;
  semester: 'GANJIL' | 'GENAP' | 'ALL';
  subject: string;
  grade: string;
  tags?: string[];
  question_count: number;
  status: DocumentStatus;
  has_answer_key?: boolean;
  answer_key_summary?: {
    total_questions: number;
    pg_count: number;
    pgk_count: number;
    tf_count: number;
    essay_count: number;
    max_score: number;
  } | null;
  files?: DocumentFile[];
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface InstitutionSettings {
  id: string;
  institution_name: string;
  institution_logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  academic_year_active?: string;
  semester_active?: 'GANJIL' | 'GENAP';
  max_file_size_mb: number;
  storage_provider: 'google-drive' | 'mock';
  google_drive_folder_id?: string;
  google_service_account_email?: string;
  is_drive_connected?: boolean;
  is_database_connected?: boolean;
  updated_at: string;
  updated_by?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_name?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: Pagination;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface DocumentFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  academicYear?: string;
  semester?: string;
  subject?: string;
  grade?: string;
  status?: DocumentStatus;
  hasAnswerKey?: 'all' | 'yes' | 'no';
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface StatisticsOverview {
  totalActiveDocuments: number;
  totalCategories: number;
  totalUsers: number;
  totalTrashedDocuments: number;
  totalAnswerKeys: number;
  totalDownloads: number;
  totalPreviews: number;
  storageUsageMb: number;
  categoryDistribution: { category_name: string; count: number }[];
  gradeDistribution: { grade: string; count: number }[];
  semesterDistribution: { semester: string; count: number }[];
  yearDistribution: { academic_year: string; count: number }[];
  recentUploads: DocumentRecord[];
  recentActivity: AuditLog[];
}
