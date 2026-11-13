import * as XLSX from 'xlsx';
import type {
  RecapPeriodGrouping,
  ShiftAttendanceSession,
} from '../types/talent';
import {
  aggregatePeriodAttendanceRecap,
  aggregatePersonAttendanceRecap,
  computeShiftActual,
  flattenDetailedAttendanceRecap,
  formatShiftTimeRange,
} from './talentLogic';

function forceTextColumns(
  sheet: XLSX.WorkSheet,
  colIndices: number[],
  startRow = 1,
): void {
  if (!sheet['!ref']) return;
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let r = startRow; r <= range.e.r; r += 1) {
    for (const c of colIndices) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        cell.t = 's';
        cell.v = String(cell.v);
        cell.z = '@';
      }
    }
  }
}

export function buildAttendanceRecapWorkbook(
  sessions: ShiftAttendanceSession[],
  periodGrouping: RecapPeriodGrouping = 'daily',
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekap per Personel
  const personRows = aggregatePersonAttendanceRecap(sessions);
  const kurirDays = personRows
    .filter((r) => r.posisi === 'Kurir')
    .reduce((acc, r) => acc + r.uniqueDaysCount, 0);
  const dwDays = personRows
    .filter((r) => r.posisi === 'DW')
    .reduce((acc, r) => acc + r.uniqueDaysCount, 0);

  const personAoA: Array<Array<string | number>> = [
    [
      'No',
      'Nama Lengkap',
      'NIK',
      'No HP',
      'Posisi',
      'Hub Penempatan Shift',
      'Total Hari Masuk',
      'Hari Hadir',
      'Hari Backup',
      'Batal',
      'Total Shift Masuk',
    ],
    ...personRows.map((row, idx) => [
      idx + 1,
      row.namaLengkap,
      row.nik,
      row.noHp,
      row.posisi,
      row.penempatanList.join(' | '),
      row.uniqueDaysCount,
      row.hadirDaysCount,
      row.backupDaysCount,
      row.batalCount,
      row.totalMasuk,
    ]),
    [],
    ['RINGKASAN TOTAL HARI KERJA', '', '', '', '', '', kurirDays + dwDays],
    ['Total Hari Kerja Kurir', '', '', '', '', '', kurirDays],
    ['Total Hari Kerja DW', '', '', '', '', '', dwDays],
  ];

  const wsPerson = XLSX.utils.aoa_to_sheet(personAoA);
  forceTextColumns(wsPerson, [2, 3], 1);
  wsPerson['!cols'] = [
    { wch: 5 },
    { wch: 26 },
    { wch: 20 },
    { wch: 16 },
    { wch: 10 },
    { wch: 32 },
    { wch: 16 },
    { wch: 12 },
    { wch: 13 },
    { wch: 10 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPerson, 'Rekap per Personel');

  // Sheet 2: Detail Absensi (including Jenis Bank & No Rekening)
  const detailRows = flattenDetailedAttendanceRecap(sessions);
  const detailAoA: Array<Array<string | number>> = [
    [
      'No',
      'Tanggal',
      'Posisi',
      'Shift',
      'Jam Shift',
      'Penempatan Hub',
      'Nama Lengkap',
      'NIK',
      'No HP',
      'Jenis Bank',
      'No Rekening',
      'Status Kehadiran',
    ],
    ...detailRows.map((d, idx) => [
      idx + 1,
      d.tanggal,
      d.posisi,
      d.shift,
      d.jamShift,
      d.penempatanHub,
      d.namaLengkap,
      d.nik,
      d.noHp,
      d.jenisBank,
      d.noRekening,
      d.status,
    ]),
  ];

  const wsDetail = XLSX.utils.aoa_to_sheet(detailAoA);
  forceTextColumns(wsDetail, [7, 8, 10], 1);
  wsDetail['!cols'] = [
    { wch: 5 },
    { wch: 13 },
    { wch: 9 },
    { wch: 10 },
    { wch: 16 },
    { wch: 30 },
    { wch: 26 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 17 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Absensi');

  // Sheet 3: Rekap Periode
  const periodRows = aggregatePeriodAttendanceRecap(sessions, periodGrouping);
  const periodAoA: Array<Array<string | number>> = [
    [
      'Periode',
      'Jumlah Sesi',
      'Request MP',
      'Kurir Masuk',
      'DW Masuk',
      'Hadir',
      'Backup',
      'Batal',
      'Total Actual',
      'Selisih',
      'Pemenuhan (%)',
    ],
    ...periodRows.map((r) => [
      r.periodLabel,
      r.sessionsCount,
      r.requestMp,
      r.kurirMasuk,
      r.dwMasuk,
      r.hadirCount,
      r.backupCount,
      r.batalCount,
      r.actualMasuk,
      r.gap,
      `${r.fulfillmentRate}%`,
    ]),
  ];

  const wsPeriod = XLSX.utils.aoa_to_sheet(periodAoA);
  wsPeriod['!cols'] = [
    { wch: 34 },
    { wch: 12 },
    { wch: 12 },
    { wch: 13 },
    { wch: 11 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 13 },
    { wch: 10 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPeriod, 'Rekap Periode');

  // Sheet 4: Rekap Shift & Hub
  const shiftAoA: Array<Array<string | number>> = [
    [
      'Tanggal',
      'Posisi',
      'Shift',
      'Jam Shift',
      'Penempatan Hub',
      'Request MP',
      'Hadir',
      'Backup',
      'Batal',
      'Actual Masuk',
      'Selisih',
      'Pemenuhan (%)',
    ],
    ...sessions.map((s) => {
      let hadir = 0;
      let backup = 0;
      let batal = 0;
      for (const p of s.attendees) {
        if (p.status === 'Hadir') hadir += 1;
        else if (p.status === 'Backup') backup += 1;
        else if (p.status === 'Batal') batal += 1;
      }
      const actual = computeShiftActual(s.attendees);
      const gap = actual - s.requestMp;
      const rate = s.requestMp > 0 ? Math.round((actual / s.requestMp) * 100) : 0;
      const jam = formatShiftTimeRange(s.jamMulai, s.jamSelesai) || '-';
      return [
        s.tanggal,
        s.posisi,
        s.shift,
        jam,
        s.penempatan,
        s.requestMp,
        hadir,
        backup,
        batal,
        actual,
        gap,
        `${rate}%`,
      ];
    }),
  ];

  const wsShift = XLSX.utils.aoa_to_sheet(shiftAoA);
  wsShift['!cols'] = [
    { wch: 13 },
    { wch: 9 },
    { wch: 10 },
    { wch: 16 },
    { wch: 30 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 10 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsShift, 'Rekap Shift & Hub');

  return wb;
}

export function generateAttendanceRecapExcelBytes(
  sessions: ShiftAttendanceSession[],
  periodGrouping: RecapPeriodGrouping = 'daily',
): Uint8Array {
  const wb = buildAttendanceRecapWorkbook(sessions, periodGrouping);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

export function downloadAttendanceRecapExcel(
  sessions: ShiftAttendanceSession[],
  periodGrouping: RecapPeriodGrouping,
  filename = 'rekap-absensi-lengkap-antaraja.xlsx',
): void {
  const wb = buildAttendanceRecapWorkbook(sessions, periodGrouping);
  XLSX.writeFile(wb, filename);
}
