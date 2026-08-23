import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { ensureDatabaseConnected } from '../config/database.js';
import { userRepository } from '../repositories/userRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { masterDataRepository } from '../repositories/masterDataRepository.js';
import { documentRepository } from '../repositories/documentRepository.js';
import { answerKeyRepository } from '../repositories/answerKeyRepository.js';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { googleDriveService } from '../services/googleDriveService.js';
import { AnswerKeyItem } from '../../shared/types.js';

export async function seedDatabase(): Promise<void> {
  console.log('🌱 Menjalankan proses seeding data database...');
  await ensureDatabaseConnected();

  // 1. Seed Institution Settings
  await settingsRepository.updateSettings({
    institution_name: 'SMA Negeri Unggulan Bangsa',
    institution_logo: '',
    address: 'Jl. Pemuda Pendidikan No. 12, Jakarta',
    phone: '(021) 555-0199',
    email: 'info@smanunggulan.sch.id',
    academic_year_active: '2025/2026',
    semester_active: 'GENAP',
    max_file_size_mb: 25,
    storage_provider: googleDriveService.getIsConfigured() ? 'google-drive' : 'mock',
  });

  // 2. Seed Users with Bcrypt Hashing (Admin, Tutor, Viewer)
  const adminEmail = config.SEED_ADMIN_EMAIL || 'admin@banksoal.sch.id';
  let admin = await userRepository.findByEmail(adminEmail);
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(config.SEED_ADMIN_PASSWORD || 'Admin#2026!', salt);
    admin = (await userRepository.create({
      id: 'usr_admin_default',
      name: 'Administrator Bank Soal',
      email: adminEmail,
      password_hash: hash,
      role: 'ADMIN',
      is_active: true,
    })) as any;
    console.log(`✅ Default Admin terdaftar: ${adminEmail}`);
  }

  const tutorEmail = config.SEED_USER_EMAIL || 'guru@banksoal.sch.id';
  let tutor = await userRepository.findByEmail(tutorEmail);
  if (!tutor) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(config.SEED_USER_PASSWORD || 'Tutor#2026!', salt);
    tutor = (await userRepository.create({
      id: 'usr_tutor_default',
      name: 'Budi Santoso, S.Pd. (Tutor)',
      email: tutorEmail,
      password_hash: hash,
      role: 'TUTOR',
      is_active: true,
    })) as any;
    console.log(`✅ Default Tutor terdaftar: ${tutorEmail}`);
  }

  const viewerEmail = 'viewer@banksoal.sch.id';
  let viewer = await userRepository.findByEmail(viewerEmail);
  if (!viewer) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Viewer#2026!', salt);
    viewer = (await userRepository.create({
      id: 'usr_viewer_default',
      name: 'Siti Rahma (Viewer / Siswa)',
      email: viewerEmail,
      password_hash: hash,
      role: 'VIEWER',
      is_active: true,
    })) as any;
    console.log(`✅ Default Viewer terdaftar: ${viewerEmail}`);
  }

  const clientUserEmail = 'tutorclient001@gmail.com';
  let clientUser = await userRepository.findByEmail(clientUserEmail);
  if (!clientUser) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Tutor#2026!', salt);
    clientUser = (await userRepository.create({
      id: 'usr_client_tutor',
      name: 'Tutor Client (Guru Pengampu)',
      email: clientUserEmail,
      password_hash: hash,
      role: 'TUTOR',
      is_active: true,
    })) as any;
    console.log(`✅ User Akun Client terdaftar: ${clientUserEmail}`);
  }

  // 3. Seed Categories
  const defaultCategories = [
    { id: 'cat_pas', name: 'Penilaian Akhir Semester (PAS)', slug: 'pas', description: 'Arsip naskah soal PAS ganjil & genap' },
    { id: 'cat_pts', name: 'Penilaian Tengah Semester (PTS)', slug: 'pts', description: 'Arsip naskah soal PTS' },
    { id: 'cat_us', name: 'Ujian Sekolah (US)', slug: 'ujian-sekolah', description: 'Naskah ujian akhir tingkat kelulusan' },
    { id: 'cat_tryout', name: 'Try Out & Latihan Ujian', slug: 'try-out', description: 'Simulasi ujian mandiri dan pembahasan' },
    { id: 'cat_osn', name: 'Olimpiade Sains (OSN)', slug: 'olimpiade-sains', description: 'Kumpulan soal seleksi olimpiade sains' },
  ];

  for (const cat of defaultCategories) {
    const existing = await categoryRepository.findBySlug(cat.slug);
    if (!existing) {
      await categoryRepository.create(cat);
    }
  }

  // 4. Seed Master Data (Levels, Grades, Subjects, Search Tags)
  const existingLevels = await masterDataRepository.listLevels();
  if (existingLevels.length === 0) {
    const levels = [
      { id: 'lvl_sma', name: 'SMA / MA (Sekolah Menengah Atas)', code: 'SMA', description: 'Tingkat SMA/MA sederajat', order_index: 1 },
      { id: 'lvl_smp', name: 'SMP / MTs (Sekolah Menengah Pertama)', code: 'SMP', description: 'Tingkat SMP/MTs sederajat', order_index: 2 },
      { id: 'lvl_sd', name: 'SD / MI (Sekolah Dasar)', code: 'SD', description: 'Tingkat SD/MI sederajat', order_index: 3 },
      { id: 'lvl_umum', name: 'Umum & Pelatihan Guru', code: 'UMUM', description: 'Bahan ajar & seleksi umum', order_index: 4 },
    ];
    for (const l of levels) {
      await masterDataRepository.createLevel(l);
    }
  }

  const existingGrades = await masterDataRepository.listGrades();
  if (existingGrades.length === 0) {
    const grades = [
      { id: 'grd_x', level_id: 'lvl_sma', level_name: 'SMA / MA', name: 'X', code: 'X', order_index: 1 },
      { id: 'grd_xi', level_id: 'lvl_sma', level_name: 'SMA / MA', name: 'XI', code: 'XI', order_index: 2 },
      { id: 'grd_xii', level_id: 'lvl_sma', level_name: 'SMA / MA', name: 'XII', code: 'XII', order_index: 3 },
      { id: 'grd_vii', level_id: 'lvl_smp', level_name: 'SMP / MTs', name: 'VII', code: 'VII', order_index: 4 },
      { id: 'grd_viii', level_id: 'lvl_smp', level_name: 'SMP / MTs', name: 'VIII', code: 'VIII', order_index: 5 },
      { id: 'grd_ix', level_id: 'lvl_smp', level_name: 'SMP / MTs', name: 'IX', code: 'IX', order_index: 6 },
    ];
    for (const g of grades) {
      await masterDataRepository.createGrade(g);
    }
  }

  const existingSubjects = await masterDataRepository.listSubjects();
  if (existingSubjects.length === 0) {
    const subjects = [
      { id: 'sbj_mat', name: 'Matematika Peminatan', code: 'MAT-MINAT', category: 'MIPA', description: 'Kalkulus, Trigonometri, Aljabar' },
      { id: 'sbj_mat_w', name: 'Matematika Wajib', code: 'MAT-WAJIB', category: 'MIPA', description: 'Matematika Dasar & Logika' },
      { id: 'sbj_fis', name: 'Fisika Terapan', code: 'FIS-1', category: 'MIPA', description: 'Mekanika & Termodinamika' },
      { id: 'sbj_kim', name: 'Kimia Analitik & Organik', code: 'KIM-1', category: 'MIPA', description: 'Stoikiometri & Ikatan Kimia' },
      { id: 'sbj_bio', name: 'Biologi Sel & Genetika', code: 'BIO-1', category: 'MIPA', description: 'Anatomi & Fisiologi Makhluk Hidup' },
      { id: 'sbj_bind', name: 'Bahasa Indonesia', code: 'BIND', category: 'Bahasa', description: 'Literasi & Tata Bahasa' },
      { id: 'sbj_bing', name: 'Bahasa Inggris', code: 'BING', category: 'Bahasa', description: 'Reading & Grammar' },
    ];
    for (const s of subjects) {
      await masterDataRepository.createSubject(s);
    }
  }

  const existingTags = await masterDataRepository.listTags();
  if (existingTags.length === 0) {
    const tags = [
      { id: 'tag_kalkulus', name: 'Kalkulus', slug: 'kalkulus', color: 'indigo', description: 'Turunan dan Integral' },
      { id: 'tag_mekanika', name: 'Mekanika', slug: 'mekanika', color: 'blue', description: 'Kinematika & Dinamika Gerak' },
      { id: 'tag_stoikiometri', name: 'Stoikiometri', slug: 'stoikiometri', color: 'emerald', description: 'Perhitungan Mol & Senyawa' },
      { id: 'tag_genetika', name: 'Genetika', slug: 'genetika', color: 'amber', description: 'Hukum Mendel & DNA' },
      { id: 'tag_kurikulum_merdeka', name: 'KurikulumMerdeka', slug: 'kurikulum-merdeka', color: 'violet', description: 'Modul Capaian Pembelajaran' },
    ];
    for (const t of tags) {
      await masterDataRepository.createTag(t);
    }
  }

  // 5. Seed Initial Sample Documents if table is empty
  const docCount = await documentRepository.countAll();
  if (docCount === 0) {
    const sampleDocs = [
      {
        id: 'doc_sample_mat_xii',
        document_code: 'BS-2026-MAT12-PAS',
        title: 'Penilaian Akhir Semester Matematika Peminatan Kelas XII',
        description: 'Naskah ujian resmi PAS Semester Genap 2025/2026 materi Integral, Matriks, dan Dimensi Tiga.',
        category_id: 'cat_pas',
        level_id: 'lvl_sma',
        level_name: 'SMA / MA',
        academic_year: '2025/2026',
        semester: 'GENAP' as const,
        subject: 'Matematika Peminatan',
        grade: 'XII',
        tags: ['Kalkulus', 'KurikulumMerdeka', 'UjianResmi'],
        question_count: 40,
        status: 'ACTIVE' as const,
        created_by: admin ? admin.id : 'usr_admin_default',
      },
      {
        id: 'doc_sample_fis_xi',
        document_code: 'BS-2026-FIS11-PTS',
        title: 'Penilaian Tengah Semester Fisika Terapan Kelas XI',
        description: 'Ujian komprehensif PTS topik Termodinamika, Fluida Dinamis, dan Gelombang Mekanik.',
        category_id: 'cat_pts',
        level_id: 'lvl_sma',
        level_name: 'SMA / MA',
        academic_year: '2025/2026',
        semester: 'GENAP' as const,
        subject: 'Fisika Terapan',
        grade: 'XI',
        tags: ['Mekanika', 'Fluida', 'PTS'],
        question_count: 35,
        status: 'ACTIVE' as const,
        created_by: tutor ? tutor.id : 'usr_tutor_default',
      },
    ];

    for (const docData of sampleDocs) {
      await documentRepository.create(docData);

      // Add Sample Answer Keys (40 items)
      const sampleItems: AnswerKeyItem[] = Array.from({ length: docData.question_count }).map((_, i) => {
        const num = i + 1;
        const options: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
        return {
          question_number: num,
          type: 'PG',
          correct_answer: options[i % 5],
          options,
          weight: 2.5,
          explanation: `Pembahasan rinci dan kunci jawaban butir nomor ${num}`,
        };
      });

      await answerKeyRepository.upsert({
        document_id: docData.id,
        total_questions: docData.question_count,
        passing_score: 75,
        max_score: 100,
        items: sampleItems,
        updated_by: admin ? admin.id : 'usr_admin_default',
      });
    }
  }

  console.log('✅ Seeding database selesai.');
}

// Auto-run if executed directly as a CLI script
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding error:', err);
      process.exit(1);
    });
}
