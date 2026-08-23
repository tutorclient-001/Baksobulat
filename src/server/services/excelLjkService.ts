import * as XLSX from 'xlsx';
import { DocumentRecord, AnswerKey, AnswerKeyItem } from '../../shared/types.js';
import { settingsRepository } from '../repositories/settingsRepository.js';

export class ExcelLjkService {
  async generateLjkWorkbook(
    doc: DocumentRecord,
    answerKey?: AnswerKey | null,
    mode: 'BLANK_LJK' | 'MASTER_KEY' | 'GRADING_TEMPLATE' = 'BLANK_LJK'
  ): Promise<Buffer> {
    const settings = await settingsRepository.getSettings();
    const wb = XLSX.utils.book_new();

    const items: AnswerKeyItem[] = answerKey?.items || [];
    const totalQuestions = items.length > 0 ? items.length : (doc.question_count || 40);

    // 1. Sheet: Identitas Ujian & Header
    const headerInfo = [
      ['LEMBAR JAWAB KOMPUTER & FORMAT UJIAN'],
      ['NAMA INSTITUSI', settings.institution_name],
      ['KODE DOKUMEN', doc.document_code],
      ['MATA PELAJARAN', doc.subject],
      ['KELAS / TINGKAT', doc.grade],
      ['SEMESTER / TAHUN', `${doc.semester} - ${doc.academic_year}`],
      ['TOTAL BUTIR SOAL', totalQuestions],
      ['DIBUAT PADA', new Date().toLocaleDateString('id-ID')],
      [],
    ];

    if (mode === 'BLANK_LJK') {
      // -------------------------------------------------------------
      // SHEET 1: FORM LJK PESERTA
      // -------------------------------------------------------------
      const ljkRows: any[][] = [
        ...headerInfo,
        ['PETUNJUK PENGISIAN:'],
        ['1. Isilah identitas peserta dengan huruf kapital.'],
        ['2. Berikan tanda silang (X) atau hitamkan pada bulatan pilihan jawaban yang benar.'],
        ['3. Untuk soal Essay, tuliskan jawaban pada kolom isian yang telah disediakan.'],
        [],
        ['DATA PESERTA UJIAN'],
        ['NOMOR PESERTA', '...................................................'],
        ['NAMA LENGKAP', '...................................................'],
        ['KELAS / RUANG', '...................................................'],
        ['TANDA TANGAN', '...................................................'],
        [],
        ['LEMBAR JAWABAN PILIHAN GANDA & KOMPLEKS & T/F'],
        ['NO', 'TIPE SOAL', 'OPSI PILIHAN / BUBBLE LJK', 'PILIHAN SISWA', 'PARAF'],
      ];

      for (let i = 1; i <= totalQuestions; i++) {
        const item = items.find((it) => it.number === i);
        const type = item ? item.type : (i <= 35 ? 'PG' : 'ESSAY');

        let bubbleDisplay = '';
        if (type === 'PG') {
          bubbleDisplay = '[ A ]   [ B ]   [ C ]   [ D ]   [ E ]';
        } else if (type === 'PGK') {
          bubbleDisplay = '[ ] A   [ ] B   [ ] C   [ ] D   [ ] E (Bisa > 1)';
        } else if (type === 'TF') {
          bubbleDisplay = '[ B - Benar ]     [ S - Salah ]';
        } else {
          bubbleDisplay = '[ KOLOM URAIAN / JAWABAN SINGKAT ]';
        }

        ljkRows.push([i, type, bubbleDisplay, '', '']);
      }

      const wsLjk = XLSX.utils.aoa_to_sheet(ljkRows);
      wsLjk['!cols'] = [
        { wch: 8 },  // No
        { wch: 14 }, // Tipe
        { wch: 45 }, // Bubble
        { wch: 20 }, // Pilihan Siswa
        { wch: 12 }, // Paraf
      ];
      XLSX.utils.book_append_sheet(wb, wsLjk, 'LJK Ujian Siswa');

      // -------------------------------------------------------------
      // SHEET 2: DAFTAR NILAI / REKAP NILAI KELAS (BLANK)
      // -------------------------------------------------------------
      const rekapHeaders: any[][] = [
        ['REKAP DAFTAR HADIR & NILAI KELAS'],
        ['Mata Pelajaran:', doc.subject, 'Kelas:', doc.grade, 'Kode:', doc.document_code],
        [],
        ['NO', 'NIS / NO PESERTA', 'NAMA LENGKAP SISWA', 'BENAR PG', 'BENAR PGK', 'BENAR T/F', 'SKOR ESSAY', 'TOTAL NILAI', 'STATUS (T/BT)'],
      ];

      for (let s = 1; s <= 36; s++) {
        rekapHeaders.push([s, '', `Siswa Contoh ${s}`, '', '', '', '', '', '']);
      }

      const wsRekap = XLSX.utils.aoa_to_sheet(rekapHeaders);
      wsRekap['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, wsRekap, 'Format Rekap Nilai');
    }

    if (mode === 'MASTER_KEY' || mode === 'BLANK_LJK') {
      // -------------------------------------------------------------
      // SHEET: MASTER KUNCI JAWABAN & BOBOT
      // -------------------------------------------------------------
      const keyRows: any[][] = [
        ['MASTER KUNCI JAWABAN DAN PEMBOBOTAN'],
        ['Dokumen:', doc.title, 'Kode:', doc.document_code],
        ['Mata Pelajaran:', doc.subject, 'KKM/Passing Score:', answerKey?.passing_score || 75],
        [],
        ['NO', 'TIPE SOAL', 'KUNCI JAWABAN', 'BOBOT NILAI', 'KATA KUNCI / RUBRIK ESSAY', 'PEMBAHASAN / KETERANGAN'],
      ];

      if (items.length > 0) {
        items.forEach((it) => {
          keyRows.push([
            it.number,
            it.type,
            it.correctAnswers.join(', '),
            it.weight,
            it.essayKeywords?.join('; ') || it.essayRubric || '-',
            it.explanation || '-',
          ]);
        });
      } else {
        for (let i = 1; i <= totalQuestions; i++) {
          keyRows.push([i, i <= 35 ? 'PG' : 'ESSAY', i <= 35 ? 'A' : '-', 1, '-', '-']);
        }
      }

      const wsKey = XLSX.utils.aoa_to_sheet(keyRows);
      wsKey['!cols'] = [
        { wch: 8 },
        { wch: 12 },
        { wch: 22 },
        { wch: 14 },
        { wch: 35 },
        { wch: 40 },
      ];
      XLSX.utils.book_append_sheet(wb, wsKey, 'Kunci Jawaban Master');
    }

    if (mode === 'GRADING_TEMPLATE') {
      // -------------------------------------------------------------
      // SHEET: TEMPLATE KOREKSI OTOMATIS
      // -------------------------------------------------------------
      const gradeHeader: any[][] = [
        ['SISTEM KOREKSI OTOMATIS & ANALISIS BUTIR SOAL'],
        ['Dokumen:', doc.title, 'Kode:', doc.document_code],
        [],
      ];

      // Build column titles: No, NIS, Nama, [Q1, Q2, ..., Qn], Skor Total, Nilai Akhir
      const qCols: string[] = [];
      const keyRowArray: string[] = ['KUNCI JAWABAN', '-', 'MASTER KEY'];
      const weightRowArray: any[] = ['BOBOT SOAL', '-', 'BOBOT'];

      for (let i = 1; i <= totalQuestions; i++) {
        qCols.push(`Soal ${i}`);
        const it = items.find((item) => item.number === i);
        keyRowArray.push(it ? it.correctAnswers.join(',') : 'A');
        weightRowArray.push(it ? it.weight : 1);
      }

      gradeHeader.push(['NO', 'NIS/NO UJIAN', 'NAMA SISWA', ...qCols, 'SKOR DIPEROLEH', 'SKOR MAKSIMAL', 'NILAI 100']);
      gradeHeader.push(keyRowArray);
      gradeHeader.push(weightRowArray);

      // Add dummy student rows with ready formula structure
      for (let s = 1; s <= 20; s++) {
        const studentRow: any[] = [s, `2026${1000 + s}`, `Nama Siswa Peserta ${s}`];
        for (let i = 1; i <= totalQuestions; i++) {
          studentRow.push(''); // placeholder student answers
        }
        studentRow.push('');
        studentRow.push(answerKey?.max_score || totalQuestions);
        studentRow.push('');
        gradeHeader.push(studentRow);
      }

      const wsGrade = XLSX.utils.aoa_to_sheet(gradeHeader);
      wsGrade['!cols'] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 28 },
        ...Array(totalQuestions).fill({ wch: 10 }),
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, wsGrade, 'Koreksi Otomatis');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }
}

export const excelLjkService = new ExcelLjkService();
