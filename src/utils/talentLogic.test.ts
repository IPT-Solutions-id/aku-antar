import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  aggregatePeriodAttendanceRecap,
  aggregatePersonAttendanceRecap,
  buildAnterajaDwPortalUrl,
  buildAnterajaVendorPortalUrl,
  buildAttendanceRecapWhatsAppText,
  buildAttendeeFromTalent,
  buildWhatsAppUrl,
  computeAttendanceSummary,
  computeDailyPlacementTrend,
  computeRecapSummary,
  computeShiftActual,
  computeTalentStats,
  filterAttendanceSessionsForRecap,
  filterTalents,
  findActiveAttendanceConflict,
  flattenDetailedAttendanceRecap,
  formatShiftTimeRange,
  formatWhatsAppNumber,
  generateAttendanceRecapCsv,
  generateCsvContent,
  generateShiftAttendanceCsv,
  getMonthInfoFromDate,
  getWeekBoundsFromDate,
  maskSensitiveNumber,
  matchesShiftFilter,
  normalizeHubCode,
  validateSessionAttendanceConflicts,
  validateTalentInput,
} from './talentLogic';
import { buildAttendanceRecapWorkbook } from './excelExport';
import {
  isServerlessRuntime,
  resolveDatabasePaths,
} from '../server/createApiApp.ts';
import apiApp from '../../api/index.ts';
import type {
  DailyPlacementMetric,
  ShiftAttendanceSession,
  TalentRecord,
} from '../types/talent';

const sampleTalents: TalentRecord[] = [
  {
    id: 't-1',
    namaLengkap: 'Ahmad Fauzi',
    nik: '3174011205940001',
    noHp: '081234567890',
    alamatDomisili: 'Jl. Raya Pasar Minggu No. 14, Jakarta Selatan',
    noRekening: '5220394810',
    namaPenerima: 'Ahmad Fauzi',
    jenisBank: 'BCA',
    posisi: 'Kurir',
    penempatan: 'Hub Pasar Minggu - ANTARAJA',
    status: 'Aktif',
    tanggalPenempatan: '2026-11-10',
    updatedAt: '2026-11-10T08:00:00Z',
  },
  {
    id: 't-2',
    namaLengkap: 'Siti Rahmawati',
    nik: '3275024508960003',
    noHp: '085611223344',
    alamatDomisili: 'Perum Harapan Indah Blok C2, Bekasi',
    noRekening: '012938475612345',
    namaPenerima: 'Siti Rahmawati',
    jenisBank: 'BRI',
    posisi: 'DW',
    penempatan: 'Hub Bekasi Barat - ANTARAJA',
    status: 'Aktif',
    tanggalPenempatan: '2026-11-11',
    updatedAt: '2026-11-11T08:00:00Z',
  },
  {
    id: 't-3',
    namaLengkap: 'Budi Santoso',
    nik: '3671031903920007',
    noHp: '087899001122',
    alamatDomisili: 'Jl. Daan Mogot Km 12, Tangerang',
    noRekening: '1400099887766',
    namaPenerima: 'Budi Santoso',
    jenisBank: 'Mandiri',
    posisi: 'Kurir',
    penempatan: 'Hub Cipondoh - ANTARAJA',
    status: 'Non-Aktif',
    tanggalPenempatan: '2026-11-05',
    updatedAt: '2026-11-09T08:00:00Z',
  },
];

test('computeTalentStats accurately counts total pool, Kurir, DW, Aktif, and Non-Aktif', () => {
  const stats = computeTalentStats(sampleTalents);
  assert.equal(stats.totalPool, 3);
  assert.equal(stats.totalKurir, 2);
  assert.equal(stats.totalDw, 1);
  assert.equal(stats.activeTotal, 2);
  assert.equal(stats.inactiveTotal, 1);
  assert.equal(stats.activeKurir, 1);
  assert.equal(stats.inactiveKurir, 1);
  assert.equal(stats.activeDw, 1);
  assert.equal(stats.inactiveDw, 0);
  assert.equal(stats.activeRate, 67);
});

test('filterTalents filters by status Aktif / Non-Aktif, posisi, penempatan, and search in real time', () => {
  const activeOnly = filterTalents(sampleTalents, {
    search: '',
    status: 'Aktif',
    posisi: 'Semua',
    penempatan: 'Semua',
  });
  assert.equal(activeOnly.length, 2);

  const inactiveOnly = filterTalents(sampleTalents, {
    search: '',
    status: 'Non-Aktif',
    posisi: 'Semua',
    penempatan: 'Semua',
  });
  assert.equal(inactiveOnly.length, 1);
  assert.equal(inactiveOnly[0].id, 't-3');

  const searchByNik = filterTalents(sampleTalents, {
    search: '3275024508960003',
    status: 'Semua',
    posisi: 'DW',
    penempatan: 'Semua',
  });
  assert.equal(searchByNik.length, 1);
  assert.equal(searchByNik[0].namaLengkap, 'Siti Rahmawati');
});

test('validateTalentInput enforces 16-digit NIK, valid phone, bank account, and required fields', () => {
  const invalid = validateTalentInput({
    namaLengkap: 'AB',
    nik: '12345',
    noHp: '1234',
    alamatDomisili: 'Pendek',
    noRekening: 'abc',
    namaPenerima: '',
    jenisBank: '',
    posisi: 'Kurir',
    penempatan: '',
    status: 'Aktif',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.namaLengkap);
  assert.ok(invalid.errors.nik);
  assert.ok(invalid.errors.noHp);
  assert.ok(invalid.errors.alamatDomisili);
  assert.ok(invalid.errors.noRekening);
  assert.ok(invalid.errors.namaPenerima);
  assert.ok(invalid.errors.jenisBank);
  assert.ok(invalid.errors.penempatan);

  const valid = validateTalentInput({
    namaLengkap: 'Rizky Pratama',
    nik: '3175041102950002',
    noHp: '081388776655',
    alamatDomisili: 'Jl. Kemang Timur No. 45, Jakarta Selatan',
    noRekening: '8870123456',
    namaPenerima: 'Rizky Pratama',
    jenisBank: 'BCA',
    posisi: 'DW',
    penempatan: 'Hub Pasar Minggu - ANTARAJA',
    status: 'Aktif',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('maskSensitiveNumber preserves trailing digits and masks prefix', () => {
  assert.equal(maskSensitiveNumber('3174011205940001', 4), '••••••••0001');
  assert.equal(maskSensitiveNumber('5220394810', 4), '••••••4810');
});

test('computeDailyPlacementTrend adds live non-seed active placements to matching dates', () => {
  const base: DailyPlacementMetric[] = [
    {
      date: '2026-11-11',
      label: '11 Nov',
      kurirPlaced: 8,
      dwPlaced: 6,
      totalPlaced: 14,
      target: 15,
      fulfillmentRate: 93,
    },
    {
      date: '2026-11-12',
      label: '12 Nov',
      kurirPlaced: 10,
      dwPlaced: 5,
      totalPlaced: 15,
      target: 16,
      fulfillmentRate: 94,
    },
  ];
  const seedIds = new Set(['t-1', 't-2', 't-3']);
  const updatedTalents: TalentRecord[] = [
    ...sampleTalents,
    {
      ...sampleTalents[0],
      id: 'live-1',
      posisi: 'DW',
      status: 'Aktif',
      tanggalPenempatan: '2026-11-12',
    },
  ];

  const trend = computeDailyPlacementTrend(updatedTalents, base, 7, seedIds);
  assert.equal(trend.length, 2);
  assert.equal(trend[1].dwPlaced, 6);
  assert.equal(trend[1].totalPlaced, 16);
  assert.equal(trend[1].fulfillmentRate, 100);
});

test('generateCsvContent properly escapes commas and quotes across all 11 columns', () => {
  const csv = generateCsvContent([
    {
      ...sampleTalents[0],
      alamatDomisili: 'Jl. Mawar No. 10, RT 02/03, "Blok A"',
    },
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('Nama Lengkap,NIK,No HP,Alamat Domisili'));
  assert.ok(lines[1].includes('"Jl. Mawar No. 10, RT 02/03, ""Blok A"""'));
});

test('formatWhatsAppNumber and buildWhatsAppUrl normalize Indonesian phone numbers', () => {
  assert.equal(formatWhatsAppNumber('0812-8844-1021'), '6281288441021');
  assert.equal(formatWhatsAppNumber('+62 856 9102 3488'), '6285691023488');
  assert.equal(formatWhatsAppNumber('6281319204451'), '6281319204451');
  assert.equal(formatWhatsAppNumber('12345'), null);

  assert.equal(
    buildWhatsAppUrl('081288441021'),
    'https://wa.me/6281288441021',
  );
  assert.equal(buildWhatsAppUrl('invalid'), null);
});

test('shift attendance helpers auto-fill from talent, count Actual excluding Batal, and compute gap', () => {
  const att1 = buildAttendeeFromTalent(sampleTalents[0], 'Hadir');
  const att2 = buildAttendeeFromTalent(sampleTalents[1], 'Backup');
  const att3 = buildAttendeeFromTalent(sampleTalents[2], 'Batal');

  assert.equal(att1.nik, sampleTalents[0].nik);
  assert.equal(att1.noHp, sampleTalents[0].noHp);
  assert.equal(att1.penempatanAsal, sampleTalents[0].penempatan);
  assert.equal(computeShiftActual([att1, att2, att3]), 2);

  const sessions: ShiftAttendanceSession[] = [
    {
      id: 's-1',
      posisi: 'Kurir',
      tanggal: '2026-11-12',
      shift: 'Shift 1',
      jamMulai: '07:00',
      jamSelesai: '15:00',
      penempatan: 'Hub Pasar Minggu - ANTARAJA',
      requestMp: 3,
      attendees: [att1, att2, att3],
      updatedAt: '2026-11-12T08:00:00Z',
    },
  ];

  const summary = computeAttendanceSummary(sessions);
  assert.equal(summary.totalSessions, 1);
  assert.equal(summary.totalRequestMp, 3);
  assert.equal(summary.totalActual, 2);
  assert.equal(summary.gap, -1);
  assert.equal(summary.fulfillmentRate, 67);

  const csv = generateShiftAttendanceCsv(sessions);
  const lines = csv.split('\n');
  assert.equal(lines.length, 4);
  assert.ok(lines[0].includes('Tanggal,Posisi,Shift,Jam Shift,Penempatan Hub,Request MP,Actual,Selisih'));
  assert.ok(lines[1].includes('07:00 - 15:00'));

  assert.equal(formatShiftTimeRange('07:00', '15:00'), '07:00 - 15:00');
  assert.equal(formatShiftTimeRange('', ''), '');
  assert.equal(matchesShiftFilter('Shift 1', 'Shift 1'), true);
  assert.equal(matchesShiftFilter('Shift 1 (Pagi)', 'Shift 1'), true);
  assert.equal(matchesShiftFilter('Shift 2', 'Shift 1'), false);
  assert.equal(matchesShiftFilter('Shift 3', 'Semua'), true);
});

test('normalizeHubCode and buildAnterajaDwPortalUrl default to HUBCODE=STR and sanitize custom codes', () => {
  assert.equal(normalizeHubCode(), 'STR');
  assert.equal(normalizeHubCode('  '), 'STR');
  assert.equal(normalizeHubCode(' str '), 'STR');
  assert.equal(
    buildAnterajaDwPortalUrl(),
    'https://dw.anteraja.id/?HUBCODE=STR',
  );
  assert.equal(
    buildAnterajaDwPortalUrl('jkt-01'),
    'https://dw.anteraja.id/?HUBCODE=JKT-01',
  );
  assert.equal(
    buildAnterajaVendorPortalUrl(),
    'https://dw.anteraja.id/vendor',
  );
});

test('anti-double absen blocks two active shifts on the same date but allows assignment if existing record is Batal', () => {
  const attHadir = buildAttendeeFromTalent(sampleTalents[0], 'Hadir');
  const attBatal = buildAttendeeFromTalent(sampleTalents[1], 'Batal');

  const sessions: ShiftAttendanceSession[] = [
    {
      id: 'sess-1',
      posisi: 'Kurir',
      tanggal: '2026-11-12',
      shift: 'Shift 1',
      jamMulai: '07:00',
      jamSelesai: '15:00',
      penempatan: 'Hub Pasar Minggu - ANTARAJA',
      requestMp: 2,
      attendees: [attHadir, attBatal],
      updatedAt: '2026-11-12T08:00:00Z',
    },
    {
      id: 'sess-2',
      posisi: 'Kurir',
      tanggal: '2026-11-12',
      shift: 'Shift 2',
      jamMulai: '14:00',
      jamSelesai: '22:00',
      penempatan: 'Hub Tebet - ANTARAJA',
      requestMp: 2,
      attendees: [],
      updatedAt: '2026-11-12T08:00:00Z',
    },
  ];

  // Ahmad Fauzi (t-1) is Hadir in sess-1 -> conflict in sess-2 on 2026-11-12
  const conflictActive = findActiveAttendanceConflict(
    sessions,
    '2026-11-12',
    'sess-2',
    sampleTalents[0].id,
    sampleTalents[0].nik,
  );
  assert.ok(conflictActive);
  assert.equal(conflictActive.session.id, 'sess-1');

  // Siti Rahmawati (t-2) is Batal in sess-1 -> NOT locked, allowed in sess-2 on 2026-11-12
  const conflictBatal = findActiveAttendanceConflict(
    sessions,
    '2026-11-12',
    'sess-2',
    sampleTalents[1].id,
    sampleTalents[1].nik,
  );
  assert.equal(conflictBatal, null);

  // Different date -> no conflict
  const conflictOtherDate = findActiveAttendanceConflict(
    sessions,
    '2026-11-13',
    'sess-other',
    sampleTalents[0].id,
    sampleTalents[0].nik,
  );
  assert.equal(conflictOtherDate, null);

  // Full session validation rejects double active absen, accepts Batal-unlocked assignment
  const rejected = validateSessionAttendanceConflicts(sessions, {
    ...sessions[1],
    attendees: [buildAttendeeFromTalent(sampleTalents[0], 'Backup')],
  });
  assert.equal(rejected.valid, false);
  assert.ok(rejected.message?.includes('Double absen ditolak'));

  const allowedBecauseBatal = validateSessionAttendanceConflicts(sessions, {
    ...sessions[1],
    attendees: [buildAttendeeFromTalent(sampleTalents[1], 'Hadir')],
  });
  assert.equal(allowedBecauseBatal.valid, true);
});

test('attendance recap helpers compute daily/weekly/monthly periods, unique work days per person, and exports', () => {
  const attKurirDay1 = buildAttendeeFromTalent(sampleTalents[0], 'Hadir');
  const attKurirDay2 = buildAttendeeFromTalent(sampleTalents[0], 'Backup');
  const attBatalDay1 = buildAttendeeFromTalent(sampleTalents[2], 'Batal');
  const attDwDay2 = buildAttendeeFromTalent(sampleTalents[1], 'Hadir');

  const sessions: ShiftAttendanceSession[] = [
    {
      id: 'rec-1',
      posisi: 'Kurir',
      tanggal: '2026-11-12',
      shift: 'Shift 1',
      jamMulai: '07:00',
      jamSelesai: '15:00',
      penempatan: 'Hub Pasar Minggu - ANTARAJA',
      requestMp: 3,
      attendees: [attKurirDay1, attBatalDay1],
      updatedAt: '2026-11-12T08:00:00Z',
    },
    {
      id: 'rec-2',
      posisi: 'DW',
      tanggal: '2026-11-13',
      shift: 'Shift 2',
      jamMulai: '14:00',
      jamSelesai: '22:00',
      penempatan: 'Hub Bekasi Barat - ANTARAJA',
      requestMp: 2,
      attendees: [attDwDay2],
      updatedAt: '2026-11-13T14:00:00Z',
    },
    {
      id: 'rec-3',
      posisi: 'Kurir',
      tanggal: '2026-11-19',
      shift: 'Shift 1',
      jamMulai: '07:00',
      jamSelesai: '15:00',
      penempatan: 'Hub Pasar Minggu - ANTARAJA',
      requestMp: 2,
      attendees: [attKurirDay2],
      updatedAt: '2026-11-19T08:00:00Z',
    },
  ];

  // Week bounds (Mon-Sun), including Sunday edge case
  const weekThu = getWeekBoundsFromDate('2026-11-12');
  assert.equal(weekThu.startDate, '2026-11-09');
  assert.equal(weekThu.endDate, '2026-11-15');
  const weekSun = getWeekBoundsFromDate('2026-11-15');
  assert.equal(weekSun.startDate, '2026-11-09');
  assert.equal(weekSun.endDate, '2026-11-15');

  const monthInfo = getMonthInfoFromDate('2026-11-12');
  assert.equal(monthInfo.monthKey, '2026-11');
  assert.equal(monthInfo.label, 'November 2026');

  // Period aggregation: daily (3 days), weekly (2 weeks), monthly (1 month)
  const dailyRows = aggregatePeriodAttendanceRecap(sessions, 'daily');
  assert.equal(dailyRows.length, 3);
  const weeklyRows = aggregatePeriodAttendanceRecap(sessions, 'weekly');
  assert.equal(weeklyRows.length, 2);
  const monthlyRows = aggregatePeriodAttendanceRecap(sessions, 'monthly');
  assert.equal(monthlyRows.length, 1);
  assert.equal(monthlyRows[0].kurirMasuk, 2);
  assert.equal(monthlyRows[0].dwMasuk, 1);
  assert.equal(monthlyRows[0].actualMasuk, 3);
  assert.equal(monthlyRows[0].batalCount, 1);

  const allSummary = computeRecapSummary(sessions);
  assert.equal(allSummary.totalSessions, 3);
  assert.equal(allSummary.totalRequestMp, 7);
  assert.equal(allSummary.totalHadir, 2);
  assert.equal(allSummary.totalBackup, 1);
  assert.equal(allSummary.totalBatal, 1);
  assert.equal(allSummary.totalActual, 3);
  assert.equal(allSummary.gap, -4);

  const filteredDw = filterAttendanceSessionsForRecap(sessions, {
    dateFrom: '2026-11-13',
    dateTo: '2026-11-13',
    posisi: 'DW',
    shift: 'Shift 2',
    penempatan: 'Semua',
    search: 'Siti',
  });
  assert.equal(filteredDw.length, 1);
  assert.equal(filteredDw[0].id, 'rec-2');

  const personRows = aggregatePersonAttendanceRecap(sessions);
  assert.equal(personRows.length, 3);
  assert.equal(personRows[0].namaLengkap, 'Ahmad Fauzi');
  assert.equal(personRows[0].uniqueDaysCount, 2);
  assert.equal(personRows[0].hadirDaysCount, 1);
  assert.equal(personRows[0].backupDaysCount, 1);
  assert.equal(personRows[0].details.length, 2);

  const waText = buildAttendanceRecapWhatsAppText(sessions, {
    dateFrom: '2026-11-12',
    dateTo: '2026-11-19',
    posisi: 'Semua',
    shift: 'Semua',
    penempatan: 'Semua',
    search: '',
  });
  assert.ok(waText.includes('REKAP ABSENSI KURIR & DW'));
  assert.ok(waText.includes('Total Hari Kerja: 3 hari (Kurir: 2 hari, DW: 1 hari)'));
  assert.ok(waText.includes('Ahmad Fauzi: 2 hari masuk'));

  const shiftCsv = generateAttendanceRecapCsv(sessions, 'shift');
  assert.ok(shiftCsv.includes('Actual Masuk,Selisih,Pemenuhan (%)'));
  const personCsv = generateAttendanceRecapCsv(sessions, 'person');
  assert.ok(personCsv.includes('Total Hari Masuk,Hari Hadir,Hari Backup,Batal,Total Shift Masuk,Rincian Tanggal'));
  const periodCsv = generateAttendanceRecapCsv(sessions, 'period', 'weekly');
  assert.ok(periodCsv.includes('Periode,Jumlah Sesi,Request MP,Kurir Masuk,DW Masuk'));
  const detailCsv = generateAttendanceRecapCsv(sessions, 'detail');
  assert.ok(detailCsv.includes('Jenis Bank,No Rekening,Status Kehadiran'));

  const detailRows = flattenDetailedAttendanceRecap(sessions);
  assert.equal(detailRows.length, 4);
  assert.equal(detailRows[0].jenisBank, 'BCA');
  assert.equal(detailRows[0].noRekening, '5220394810');

  // Multi-sheet Excel workbook (4 sheets)
  const wb = buildAttendanceRecapWorkbook(sessions, 'weekly');
  assert.deepEqual(wb.SheetNames, [
    'Rekap per Personel',
    'Detail Absensi',
    'Rekap Periode',
    'Rekap Shift & Hub',
  ]);

  const detailSheet = wb.Sheets['Detail Absensi'];
  // Row 2 (index 1), column H (index 7 = NIK) & K (index 10 = No Rekening) must be string type 's'
  assert.equal(detailSheet['H2'].t, 's');
  assert.equal(detailSheet['K2'].t, 's');
  const detailJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(detailSheet);
  assert.equal(detailJson.length, 4);
  assert.equal(detailJson[0]['Jenis Bank'], 'BCA');
  assert.equal(detailJson[0]['No Rekening'], '5220394810');
});

test('Vercel serverless storage resolver uses tmp directory on Vercel and local data file otherwise', () => {
  assert.equal(isServerlessRuntime({}), false);
  assert.equal(isServerlessRuntime({ VERCEL: '1' }), true);
  assert.equal(isServerlessRuntime({ VERCEL_ENV: 'production' }), true);

  const localPaths = resolveDatabasePaths('/app/applet', {});
  assert.equal(localPaths.mode, 'local-file');
  assert.equal(localPaths.primaryPath, '/app/applet/data/talent-pool.json');

  const vercelPaths = resolveDatabasePaths('/var/task', { VERCEL: '1' });
  assert.equal(vercelPaths.mode, 'tmp-serverless');
  assert.ok(vercelPaths.primaryPath.endsWith('aku-antar-data/talent-pool.json'));
  assert.equal(vercelPaths.seedFallbackPath, '/var/task/data/talent-pool.json');

  // Verify Vercel API entrypoint exports a callable Express handler
  assert.equal(typeof apiApp, 'function');
});

