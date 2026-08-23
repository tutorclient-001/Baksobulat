import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { userRepository } from '../repositories/userRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { masterDataRepository } from '../repositories/masterDataRepository.js';
import { documentRepository } from '../repositories/documentRepository.js';
import { answerKeyRepository } from '../repositories/answerKeyRepository.js';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { googleDriveService, generateValidPdfBuffer } from '../services/googleDriveService.js';
import { AnswerKeyItem } from '../../shared/types.js';

export async function seedDatabase(): Promise<void> {
  console.log('Starting seed process...');

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

  // 2. Seed Users (Admin, Tutor, Viewer)
  const adminEmail = config.SEED_ADMIN_EMAIL || 'admin@banksoal.sch.id';
  let admin = await userRepository.findByEmail(adminEmail);
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(config.SEED_ADMIN_PASSWORD || 'Admin#2026!', salt);
    admin = await userRepository.create({
      id: 'usr_admin_default',
      name: 'Administrator Bank Soal',
      email: adminEmail,
      password_hash: hash,
      role: 'ADMIN',
      is_active: true,
    }) as any;
    console.log(`Created default Admin: ${adminEmail}`);
  }

  const tutorEmail = config.SEED_USER_EMAIL || 'tutor@banksoal.sch.id';
  let tutor = await userRepository.findByEmail(tutorEmail);
  if (!tutor) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(config.SEED_USER_PASSWORD || 'Tutor#2026!', salt);
    tutor = await userRepository.create({
      id: 'usr_tutor_default',
      name: 'Budi Santoso, S.Pd. (Tutor)',
      email: tutorEmail,
      password_hash: hash,
      role: 'TUTOR',
      is_active: true,
    }) as any;
    console.log(`Created default Tutor: ${tutorEmail}`);
  }

  const viewerEmail = 'viewer@banksoal.sch.id';
  let viewer = await userRepository.findByEmail(viewerEmail);
  if (!viewer) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Viewer#2026!', salt);
    viewer = await userRepository.create({
      id: 'usr_viewer_default',
      name: 'Siti Rahma (Viewer / Siswa)',
      email: viewerEmail,
      password_hash: hash,
      role: 'VIEWER',
      is_active: true,
    }) as any;
    console.log(`Created default Viewer: ${viewerEmail}`);
  }

  // Also seed current user account if specified
  const clientUserEmail = 'tutorclient001@gmail.com';
  let clientUser = await userRepository.findByEmail(clientUserEmail);
  if (!clientUser) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Tutor#2026!', salt);
    clientUser = await userRepository.create({
      id: 'usr_client_tutor',
      name: 'Tutor Client (Guru Pengampu)',
      email: clientUserEmail,
      password_hash: hash,
      role: 'TUTOR',
      is_active: true,
    }) as any;
    console.log(`Created Tutor Client account: ${clientUserEmail}`);
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
    const existing = await categoryRepository.findById(cat.id);
    if (!existing) {
      await categoryRepository.create(cat);
    }
  }

  // 4. Seed Education Levels (Jenjang)
  const defaultLevels = [
    { id: 'lvl_sd', name: 'SD / MI (Sekolah Dasar)', code: 'SD', description: 'Tingkat pendidikan dasar kelas 1 s.d 6', order_index: 1 },
    { id: 'lvl_smp', name: 'SMP / MTs (Menengah Pertama)', code: 'SMP', description: 'Tingkat pendidikan menengah pertama kelas 7 s.d 9', order_index: 2 },
    { id: 'lvl_sma', name: 'SMA / MA (Menengah Atas)', code: 'SMA', description: 'Tingkat pendidikan menengah atas kelas 10 s.d 12', order_index: 3 },
    { id: 'lvl_smk', name: 'SMK / MAK (Kejuruan)', code: 'SMK', description: 'Tingkat kejuruan kelas 10 s.d 12', order_index: 4 },
    { id: 'lvl_pt', name: 'Perguruan Tinggi', code: 'PT', description: 'Jenjang perguruan tinggi / universitas', order_index: 5 },
    { id: 'lvl_umum', name: 'Umum / Kedinasan / CPNS', code: 'UMUM', description: 'Soal umum, kedinasan, dan pelatihan', order_index: 6 },
  ];

  for (const lvl of defaultLevels) {
    const existing = await masterDataRepository.findEducationLevelById(lvl.id);
    if (!existing) {
      await masterDataRepository.createEducationLevel(lvl);
    }
  }

  // 5. Seed Grade Levels (Kelas)
  const defaultGrades = [
    // SD
    { id: 'grd_sd_1', level_id: 'lvl_sd', level_name: 'SD / MI (Sekolah Dasar)', name: 'Kelas 1 (Satu)', code: '1', order_index: 1 },
    { id: 'grd_sd_2', level_id: 'lvl_sd', level_name: 'SD / MI (Sekolah Dasar)', name: 'Kelas 2 (Dua)', code: '2', order_index: 2 },
    { id: 'grd_sd_3', level_id: 'lvl_sd', level_name: 'SD / MI (Sekolah Dasar)', name: 'Kelas 3 (Tiga)', code: '3', order_index: 3 },
    { id: 'grd_sd_4', level_id: 'lvl_sd', level_name: 'SD / MI (Sekolah Dasar)', name: 'Kelas 4 (Empat)', code: '4', order_index: 4 },
    { id: 'grd_sd_5', level_id: 'lvl_sd', level_name: 'SD / MI (Sekolah Dasar)', name: 'Kelas 5 (Lima)', code: '5', order_index: 5 },
    { id: 'grd_sd_6', level_id: 'lvl_sd', level_name: 'SD / MI (Sekolah Dasar)', name: 'Kelas 6 (Enam)', code: '6', order_index: 6 },
    // SMP
    { id: 'grd_smp_7', level_id: 'lvl_smp', level_name: 'SMP / MTs (Menengah Pertama)', name: 'Kelas 7 (VII)', code: '7', order_index: 7 },
    { id: 'grd_smp_8', level_id: 'lvl_smp', level_name: 'SMP / MTs (Menengah Pertama)', name: 'Kelas 8 (VIII)', code: '8', order_index: 8 },
    { id: 'grd_smp_9', level_id: 'lvl_smp', level_name: 'SMP / MTs (Menengah Pertama)', name: 'Kelas 9 (IX)', code: '9', order_index: 9 },
    // SMA
    { id: 'grd_sma_10', level_id: 'lvl_sma', level_name: 'SMA / MA (Menengah Atas)', name: 'Kelas 10 (X)', code: '10', order_index: 10 },
    { id: 'grd_sma_11', level_id: 'lvl_sma', level_name: 'Kelas 11 (XI)', name: 'Kelas 11 (XI)', code: '11', order_index: 11 },
    { id: 'grd_sma_12', level_id: 'lvl_sma', level_name: 'Kelas 12 (XII)', name: 'Kelas 12 (XII)', code: '12', order_index: 12 },
    // SMK
    { id: 'grd_smk_10', level_id: 'lvl_smk', level_name: 'SMK / MAK (Kejuruan)', name: 'Kelas 10 SMK (X)', code: '10-SMK', order_index: 13 },
    { id: 'grd_smk_11', level_id: 'lvl_smk', level_name: 'SMK / MAK (Kejuruan)', name: 'Kelas 11 SMK (XI)', code: '11-SMK', order_index: 14 },
    { id: 'grd_smk_12', level_id: 'lvl_smk', level_name: 'SMK / MAK (Kejuruan)', name: 'Kelas 12 SMK (XII)', code: '12-SMK', order_index: 15 },
    // Umum
    { id: 'grd_all', level_id: 'lvl_umum', level_name: 'Umum / Kedinasan / CPNS', name: 'Semua Tingkat / Umum', code: 'ALL', order_index: 20 },
  ];

  for (const grd of defaultGrades) {
    const existing = await masterDataRepository.findGradeLevelById(grd.id);
    if (!existing) {
      await masterDataRepository.createGradeLevel(grd);
    }
  }

  // 6. Seed Subjects (Mata Pelajaran)
  const defaultSubjects = [
    { id: 'sbj_mat_wajib', name: 'Matematika Wajib', code: 'MAT-W', category: 'MIPA', description: 'Matematika umum kurikulum nasional' },
    { id: 'sbj_mat_minat', name: 'Matematika Peminatan', code: 'MAT-P', category: 'MIPA', description: 'Matematika tingkat lanjut/peminatan' },
    { id: 'sbj_fisika', name: 'Fisika', code: 'FIS', category: 'MIPA', description: 'Fisika sains dan rekayasa' },
    { id: 'sbj_kimia', name: 'Kimia', code: 'KIM', category: 'MIPA', description: 'Kimia struktur materi & reaksi' },
    { id: 'sbj_biologi', name: 'Biologi', code: 'BIO', category: 'MIPA', description: 'Biologi dan ilmu hayati' },
    { id: 'sbj_indo', name: 'Bahasa Indonesia', code: 'IND', category: 'Bahasa', description: 'Bahasa dan sastra Indonesia' },
    { id: 'sbj_inggris', name: 'Bahasa Inggris', code: 'ING', category: 'Bahasa', description: 'Bahasa Inggris aktif dan pasif' },
    { id: 'sbj_ipa', name: 'Ilmu Pengetahuan Alam (IPA Terpadu)', code: 'IPA', category: 'MIPA', description: 'IPA terpadu jenjang SMP/SD' },
    { id: 'sbj_ips', name: 'Ilmu Pengetahuan Sosial (IPS Terpadu)', code: 'IPS', category: 'IPS', description: 'IPS terpadu jenjang SMP/SD' },
    { id: 'sbj_ekonomi', name: 'Ekonomi / Akuntansi', code: 'EKO', category: 'IPS', description: 'Ekonomi bisnis dan keuangan' },
    { id: 'sbj_geografi', name: 'Geografi', code: 'GEO', category: 'IPS', description: 'Geografi fisik dan sosial' },
    { id: 'sbj_sosiologi', name: 'Sosiologi', code: 'SOS', category: 'IPS', description: 'Sosiologi masyarakat dan budaya' },
    { id: 'sbj_sejarah', name: 'Sejarah Indonesia', code: 'SEJ', category: 'Sosial', description: 'Sejarah nasional dan peradaban dunia' },
    { id: 'sbj_informatika', name: 'Informatika & Komputer', code: 'INF', category: 'Teknologi', description: 'Logika pemrograman dan sistem komputer' },
    { id: 'sbj_pai', name: 'Pendidikan Agama Islam (PAI)', code: 'PAI', category: 'Agama', description: 'Pendidikan Agama Islam dan Budi Pekerti' },
    { id: 'sbj_pkn', name: 'Pendidikan Pancasila (PPKn)', code: 'PKN', category: 'Umum', description: 'Kewarganegaraan dan nilai-nilai konstitusi' },
    { id: 'sbj_pjok', name: 'PJOK / Olahraga', code: 'PJK', category: 'Kesehatan', description: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
  ];

  for (const sbj of defaultSubjects) {
    const existing = await masterDataRepository.findSubjectById(sbj.id);
    if (!existing) {
      await masterDataRepository.createSubject(sbj);
    }
  }

  // 7. Seed Search Tags (Tags Pencarian)
  const defaultTags = [
    { id: 'tag_kurikulum_merdeka', name: 'Kurikulum Merdeka', slug: 'kurikulum-merdeka', color: 'indigo', description: 'Sesuai capaian pembelajaran Kurikulum Merdeka' },
    { id: 'tag_k13', name: 'Kurikulum 2013 Revisi', slug: 'k13-revisi', color: 'sky', description: 'Standar kompetensi Kurikulum 2013' },
    { id: 'tag_pas', name: 'Penilaian Akhir Semester (PAS)', slug: 'pas', color: 'emerald', description: 'Evaluasi sumatif akhir semester' },
    { id: 'tag_pts', name: 'Penilaian Tengah Semester (PTS)', slug: 'pts', color: 'amber', description: 'Evaluasi sumatif tengah semester' },
    { id: 'tag_us', name: 'Ujian Sekolah (US/SAJ)', slug: 'ujian-sekolah', color: 'rose', description: 'Ujian kelulusan tingkat akhir' },
    { id: 'tag_utbk', name: 'UTBK / SNBT / Kedinasan', slug: 'utbk-snbt', color: 'violet', description: 'Tes Potensi Skolastik dan Literasi' },
    { id: 'tag_akm', name: 'Asesmen Nasional / AKM', slug: 'akm-an', color: 'teal', description: 'Literasi membaca dan numerasi' },
    { id: 'tag_osn', name: 'Olimpiade Sains (OSN)', slug: 'olimpiade-osn', color: 'amber', description: 'Soal seleksi olimpiade sains berstandar nasional' },
    { id: 'tag_hots', name: 'Tipe Soal HOTS', slug: 'hots', color: 'rose', description: 'High Order Thinking Skills dengan stimulus kontekstual' },
    { id: 'tag_kisi_kisi', name: 'Disertai Kisi-Kisi & Pembahasan', slug: 'kisi-kisi', color: 'blue', description: 'Lengkap rubrik, kisi-kisi dan kunci' },
  ];

  for (const tg of defaultTags) {
    const existing = await masterDataRepository.findSearchTagById(tg.id);
    if (!existing) {
      await masterDataRepository.createSearchTag(tg);
    }
  }

  // 8. Seed Sample Documents if empty
  const existingDocs = await documentRepository.list({ limit: 5 });
  if (existingDocs.data.length === 0 && admin) {
    console.log('Seeding initial bank soal documents...');

    const sampleDocs = [
      {
        id: 'doc_sample_matematika_12',
        code: 'BS-2026-MAT12-001',
        title: 'Naskah Soal PAS Matematika Wajib Kelas XII MIPA',
        description: 'Materi: Dimensi Tiga, Statistika Data Berkelompok, Kaidah Pencacahan, dan Peluang Kejadian.',
        category_id: 'cat_pas',
        level_id: 'lvl_sma',
        level_name: 'SMA / MA (Menengah Atas)',
        academic_year: '2025/2026',
        semester: 'GENAP' as const,
        subject: 'Matematika Wajib',
        grade: 'Kelas 12 (XII)',
        tags: ['Kurikulum Merdeka', 'Penilaian Akhir Semester (PAS)', 'Tipe Soal HOTS'],
        question_count: 40,
        questions: generateSampleAnswerKeys(40, 30, 5, 5),
      },
      {
        id: 'doc_sample_fisika_11',
        code: 'BS-2026-FIS11-002',
        title: 'Naskah Ujian Tengah Semester Fisika Kelas XI',
        description: 'Materi: Dinamika Rotasi, Fluida Statis, Termodinamika, dan Gelombang Mekanik.',
        category_id: 'cat_pts',
        level_id: 'lvl_sma',
        level_name: 'SMA / MA (Menengah Atas)',
        academic_year: '2025/2026',
        semester: 'GENAP' as const,
        subject: 'Fisika',
        grade: 'Kelas 11 (XI)',
        tags: ['Penilaian Tengah Semester (PTS)', 'Kurikulum 2013 Revisi', 'Tipe Soal HOTS'],
        question_count: 35,
        questions: generateSampleAnswerKeys(35, 25, 5, 5),
      },
      {
        id: 'doc_sample_biologi_10',
        code: 'BS-2026-BIO10-003',
        title: 'Bank Soal Asesmen Sumatif Biologi Kelas X',
        description: 'Materi: Keanekaragaman Hayati, Virus & Bakteri, dan Perubahan Lingkungan.',
        category_id: 'cat_tryout',
        level_id: 'lvl_sma',
        level_name: 'SMA / MA (Menengah Atas)',
        academic_year: '2025/2026',
        semester: 'GENAP' as const,
        subject: 'Biologi',
        grade: 'Kelas 10 (X)',
        tags: ['Kurikulum Merdeka', 'Asesmen Nasional / AKM'],
        question_count: 30,
        questions: generateSampleAnswerKeys(30, 20, 5, 5),
      },
      {
        id: 'doc_sample_bina_12',
        code: 'BS-2026-IND12-004',
        title: 'Naskah Ujian Sekolah Bahasa Indonesia Kelas XII',
        description: 'Materi: Teks Editorial, Surat Lamaran Pekerjaan, Artikel Ilmiah, dan Kritik Sastra.',
        category_id: 'cat_us',
        level_id: 'lvl_sma',
        level_name: 'SMA / MA (Menengah Atas)',
        academic_year: '2025/2026',
        semester: 'GENAP' as const,
        subject: 'Bahasa Indonesia',
        grade: 'Kelas 12 (XII)',
        tags: ['Ujian Sekolah (US/SAJ)', 'Disertai Kisi-Kisi & Pembahasan'],
        question_count: 45,
        questions: generateSampleAnswerKeys(45, 35, 5, 5),
      },
    ];

    for (const d of sampleDocs) {
      // Create PDF buffer and save
      const qPdfBuffer = generateValidPdfBuffer(d.title, {
        documentCode: d.code,
        subject: d.subject,
        grade: d.grade,
        academicYear: d.academic_year,
        semester: d.semester,
        fileType: 'QUESTION',
      });
      const akPdfBuffer = generateValidPdfBuffer(`KUNCI JAWABAN: ${d.title}`, {
        documentCode: d.code,
        subject: d.subject,
        grade: d.grade,
        academicYear: d.academic_year,
        semester: d.semester,
        fileType: 'ANSWER_KEY',
      });

      const qUpload = await googleDriveService.uploadFile({
        buffer: qPdfBuffer,
        filename: `${d.code}_Soal.pdf`,
        mimeType: 'application/pdf',
      });

      const akUpload = await googleDriveService.uploadFile({
        buffer: akPdfBuffer,
        filename: `${d.code}_Kunci_Jawaban.pdf`,
        mimeType: 'application/pdf',
      });

      await documentRepository.create({
        id: d.id,
        document_code: d.code,
        title: d.title,
        description: d.description,
        category_id: d.category_id,
        level_id: d.level_id,
        level_name: d.level_name,
        academic_year: d.academic_year,
        semester: d.semester,
        subject: d.subject,
        grade: d.grade,
        tags: d.tags,
        question_count: d.question_count,
        created_by: admin.id,
      });

      await documentRepository.addFile({
        id: `file_q_${d.id}`,
        document_id: d.id,
        google_drive_file_id: qUpload.fileId,
        original_filename: `${d.code}_Soal.pdf`,
        mime_type: 'application/pdf',
        file_size: qPdfBuffer.length,
        file_hash: 'sha256_mock_hash_q_' + d.id,
        file_type: 'QUESTION',
        created_at: new Date().toISOString(),
      });

      await documentRepository.addFile({
        id: `file_ak_${d.id}`,
        document_id: d.id,
        google_drive_file_id: akUpload.fileId,
        original_filename: `${d.code}_Kunci.pdf`,
        mime_type: 'application/pdf',
        file_size: akPdfBuffer.length,
        file_hash: 'sha256_mock_hash_ak_' + d.id,
        file_type: 'ANSWER_KEY',
        created_at: new Date().toISOString(),
      });

      // Save Answer Key
      await answerKeyRepository.upsert({
        id: `ak_${d.id}`,
        document_id: d.id,
        total_questions: d.question_count,
        passing_score: 75,
        max_score: 100,
        items: d.questions,
        updated_by: admin.id,
      });
    }
  }

  console.log('Database seed completed successfully.');
}

function generateSampleAnswerKeys(
  total: number,
  pgCount: number,
  pgkCount: number,
  essayCount: number
): AnswerKeyItem[] {
  const items: AnswerKeyItem[] = [];
  const options = ['A', 'B', 'C', 'D', 'E'];

  // PG
  for (let i = 1; i <= pgCount; i++) {
    const choice = options[(i - 1) % 5];
    items.push({
      number: i,
      type: 'PG',
      optionsCount: 5,
      correctAnswers: [choice],
      weight: 2,
      explanation: `Jawaban nomor ${i} adalah opsi ${choice} berdasarkan konsep dasar materi.`,
    });
  }

  // PGK
  for (let i = pgCount + 1; i <= pgCount + pgkCount; i++) {
    const choices = [options[(i - 1) % 5], options[(i + 1) % 5]].sort();
    items.push({
      number: i,
      type: 'PGK',
      optionsCount: 5,
      correctAnswers: choices,
      weight: 3,
      explanation: `Pilihan ganda kompleks nomor ${i} memiliki pernyataan benar pada opsi ${choices.join(' dan ')}.`,
    });
  }

  // Essay / TrueFalse
  let curr = pgCount + pgkCount + 1;
  const tfCount = total - curr - essayCount + 1;

  for (let i = 0; i < tfCount && curr <= total - essayCount; i++) {
    const isTrue = curr % 2 === 1;
    items.push({
      number: curr,
      type: 'TF',
      optionsCount: 2,
      correctAnswers: [isTrue ? 'T' : 'F'],
      weight: 2,
      explanation: isTrue ? 'Pernyataan bernilai Benar.' : 'Pernyataan bernilai Salah.',
    });
    curr++;
  }

  // Essay
  while (curr <= total) {
    items.push({
      number: curr,
      type: 'ESSAY',
      optionsCount: 0,
      correctAnswers: ['Jawaban Konseptual'],
      essayKeywords: ['definisi', 'rumus utama', 'kesimpulan'],
      essayRubric: 'Skor 5: Langkah runtut & benar. Skor 3: Rumus benar hasil salah. Skor 1: Menulis diketahui.',
      weight: 5,
      explanation: 'Uraikan penjelasan langkah perhitungan secara sistematis.',
    });
    curr++;
  }

  return items;
}
