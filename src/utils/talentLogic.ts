import type {
  AttendancePersonStatus,
  AttendanceRecapFilters,
  AttendanceRecapSummary,
  AttendanceSummary,
  DailyPlacementMetric,
  DetailedAttendanceRecapRow,
  PeriodAttendanceRecapRow,
  PersonAttendanceDayDetail,
  PersonAttendanceRecapRow,
  RecapPeriodGrouping,
  ShiftAttendanceSession,
  ShiftAttendee,
  TalentFilters,
  TalentFormInput,
  TalentRecord,
  TalentStats,
  ValidationResult,
} from '../types/talent';

export function computeTalentStats(talents: TalentRecord[]): TalentStats {
  let totalKurir = 0;
  let totalDw = 0;
  let activeKurir = 0;
  let activeDw = 0;
  let inactiveKurir = 0;
  let inactiveDw = 0;

  for (const item of talents) {
    if (item.posisi === 'Kurir') {
      totalKurir += 1;
      if (item.status === 'Aktif') {
        activeKurir += 1;
      } else {
        inactiveKurir += 1;
      }
    } else {
      totalDw += 1;
      if (item.status === 'Aktif') {
        activeDw += 1;
      } else {
        inactiveDw += 1;
      }
    }
  }

  const totalPool = talents.length;
  const activeTotal = activeKurir + activeDw;
  const inactiveTotal = inactiveKurir + inactiveDw;
  const activeRate = totalPool > 0 ? Math.round((activeTotal / totalPool) * 100) : 0;

  return {
    totalPool,
    totalKurir,
    totalDw,
    activeTotal,
    inactiveTotal,
    activeKurir,
    activeDw,
    inactiveKurir,
    inactiveDw,
    activeRate,
  };
}

export function filterTalents(
  talents: TalentRecord[],
  filters: TalentFilters,
): TalentRecord[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return talents.filter((item) => {
    if (filters.status !== 'Semua' && item.status !== filters.status) {
      return false;
    }
    if (filters.posisi !== 'Semua' && item.posisi !== filters.posisi) {
      return false;
    }
    if (
      filters.penempatan &&
      filters.penempatan !== 'Semua' &&
      item.penempatan !== filters.penempatan
    ) {
      return false;
    }
    if (normalizedSearch.length > 0) {
      const haystack = [
        item.namaLengkap,
        item.nik,
        item.noHp,
        item.alamatDomisili,
        item.noRekening,
        item.namaPenerima,
        item.jenisBank,
        item.posisi,
        item.penempatan,
        item.status,
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }
    return true;
  });
}

export function extractUniquePlacements(talents: TalentRecord[]): string[] {
  const set = new Set<string>();
  for (const t of talents) {
    if (t.penempatan.trim()) {
      set.add(t.penempatan.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
}

export function validateTalentInput(input: TalentFormInput): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  if (!input.namaLengkap || input.namaLengkap.trim().length < 3) {
    errors.namaLengkap = 'Nama lengkap minimal 3 karakter.';
  }

  const cleanNik = (input.nik || '').replace(/\s+/g, '');
  if (!/^\d{16}$/.test(cleanNik)) {
    errors.nik = 'NIK wajib 16 digit angka sesuai KTP.';
  }

  const cleanHp = (input.noHp || '').replace(/[\s-]/g, '');
  if (!/^(\+62|62|0)8\d{7,12}$/.test(cleanHp)) {
    errors.noHp = 'No HP tidak valid (contoh: 081234567890).';
  }

  if (!input.alamatDomisili || input.alamatDomisili.trim().length < 8) {
    errors.alamatDomisili = 'Alamat domisili wajib diisi lengkap (min. 8 karakter).';
  }

  const cleanRekening = (input.noRekening || '').replace(/[\s-]/g, '');
  if (!/^\d{6,20}$/.test(cleanRekening)) {
    errors.noRekening = 'No rekening wajib 6–20 digit angka.';
  }

  if (!input.namaPenerima || input.namaPenerima.trim().length < 3) {
    errors.namaPenerima = 'Nama penerima rekening wajib diisi.';
  }

  if (!input.jenisBank || input.jenisBank.trim().length === 0) {
    errors.jenisBank = 'Jenis bank wajib dipilih.';
  }

  if (input.posisi !== 'Kurir' && input.posisi !== 'DW') {
    errors.posisi = 'Posisi harus Kurir atau DW.';
  }

  if (!input.penempatan || input.penempatan.trim().length < 3) {
    errors.penempatan = 'Lokasi penempatan ANTARAJA wajib diisi.';
  }

  if (input.status !== 'Aktif' && input.status !== 'Non-Aktif') {
    errors.status = 'Status harus Aktif atau Non-Aktif.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function maskSensitiveNumber(value: string, visibleEnd = 4): string {
  const clean = value.trim();
  if (clean.length <= visibleEnd) {
    return clean;
  }
  const hiddenLen = clean.length - visibleEnd;
  const maskedPart = '•'.repeat(Math.min(hiddenLen, 8));
  return `${maskedPart}${clean.slice(-visibleEnd)}`;
}

export function computeDailyPlacementTrend(
  talents: TalentRecord[],
  baseMetrics: DailyPlacementMetric[],
  days: 7 | 14 | 30,
  seedIds: ReadonlySet<string>,
): DailyPlacementMetric[] {
  const sliced = baseMetrics.slice(-days);

  // Count non-seed (newly added or live) active placements by date
  const addedByDate = new Map<string, { kurir: number; dw: number }>();
  for (const t of talents) {
    if (!seedIds.has(t.id) && t.status === 'Aktif') {
      const entry = addedByDate.get(t.tanggalPenempatan) ?? { kurir: 0, dw: 0 };
      if (t.posisi === 'Kurir') {
        entry.kurir += 1;
      } else {
        entry.dw += 1;
      }
      addedByDate.set(t.tanggalPenempatan, entry);
    }
  }

  return sliced.map((metric) => {
    const delta = addedByDate.get(metric.date);
    const kurirPlaced = metric.kurirPlaced + (delta?.kurir ?? 0);
    const dwPlaced = metric.dwPlaced + (delta?.dw ?? 0);
    const totalPlaced = kurirPlaced + dwPlaced;
    const fulfillmentRate =
      metric.target > 0 ? Math.round((totalPlaced / metric.target) * 100) : 0;

    return {
      ...metric,
      kurirPlaced,
      dwPlaced,
      totalPlaced,
      fulfillmentRate,
    };
  });
}

export function formatCsvCell(value: string): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsvContent(talents: TalentRecord[]): string {
  const headers = [
    'Nama Lengkap',
    'NIK',
    'No HP',
    'Alamat Domisili',
    'No Rekening',
    'Nama Penerima',
    'Jenis Bank',
    'Posisi',
    'Penempatan',
    'Status',
    'Tanggal Penempatan',
  ];

  const rows = talents.map((t) =>
    [
      t.namaLengkap,
      t.nik,
      t.noHp,
      t.alamatDomisili,
      t.noRekening,
      t.namaPenerima,
      t.jenisBank,
      t.posisi,
      t.penempatan,
      t.status,
      t.tanggalPenempatan,
    ]
      .map(formatCsvCell)
      .join(','),
  );

  return [headers.map(formatCsvCell).join(','), ...rows].join('\n');
}

export function formatWhatsAppNumber(phone: string): string | null {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  let normalized = digits;
  if (normalized.startsWith('0')) {
    normalized = `62${normalized.slice(1)}`;
  } else if (normalized.startsWith('8')) {
    normalized = `62${normalized}`;
  }

  if (!/^628\d{7,12}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

export function buildWhatsAppUrl(phone: string): string | null {
  const normalized = formatWhatsAppNumber(phone);
  if (!normalized) {
    return null;
  }
  return `https://wa.me/${normalized}`;
}

export function computeShiftActual(attendees: ShiftAttendee[]): number {
  let count = 0;
  for (const person of attendees) {
    if (person.status === 'Hadir' || person.status === 'Backup') {
      count += 1;
    }
  }
  return count;
}

export function computeAttendanceSummary(
  sessions: ShiftAttendanceSession[],
): AttendanceSummary {
  let totalRequestMp = 0;
  let totalActual = 0;

  for (const session of sessions) {
    totalRequestMp += session.requestMp;
    totalActual += computeShiftActual(session.attendees);
  }

  const gap = totalActual - totalRequestMp;
  const fulfillmentRate =
    totalRequestMp > 0 ? Math.round((totalActual / totalRequestMp) * 100) : 0;

  return {
    totalSessions: sessions.length,
    totalRequestMp,
    totalActual,
    gap,
    fulfillmentRate,
  };
}

export function buildAttendeeFromTalent(
  talent: TalentRecord,
  status: AttendancePersonStatus = 'Hadir',
): ShiftAttendee {
  return {
    id: `att-${talent.id}-${Date.now()}`,
    talentId: talent.id,
    namaLengkap: talent.namaLengkap,
    nik: talent.nik,
    noHp: talent.noHp,
    penempatanAsal: talent.penempatan,
    jenisBank: talent.jenisBank,
    noRekening: talent.noRekening,
    status,
  };
}

export function formatShiftTimeRange(
  jamMulai?: string,
  jamSelesai?: string,
): string {
  const start = String(jamMulai ?? '').trim();
  const end = String(jamSelesai ?? '').trim();
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end || '';
}

export function matchesShiftFilter(
  sessionShift: string,
  filterShift: string,
): boolean {
  if (!filterShift || filterShift === 'Semua') {
    return true;
  }
  const normalizedSession = sessionShift.trim().toLowerCase();
  const normalizedFilter = filterShift.trim().toLowerCase();
  return (
    normalizedSession === normalizedFilter ||
    normalizedSession.startsWith(`${normalizedFilter} `)
  );
}

export function generateShiftAttendanceCsv(
  sessions: ShiftAttendanceSession[],
): string {
  const headers = [
    'Tanggal',
    'Posisi',
    'Shift',
    'Jam Shift',
    'Penempatan Hub',
    'Request MP',
    'Actual',
    'Selisih',
    'Nama Lengkap',
    'NIK',
    'No HP',
    'Status Kehadiran',
  ];

  const rows: string[] = [];
  for (const session of sessions) {
    const actual = computeShiftActual(session.attendees);
    const gap = actual - session.requestMp;
    const jamShift =
      formatShiftTimeRange(session.jamMulai, session.jamSelesai) || '-';

    if (session.attendees.length === 0) {
      rows.push(
        [
          session.tanggal,
          session.posisi,
          session.shift,
          jamShift,
          session.penempatan,
          String(session.requestMp),
          String(actual),
          String(gap),
          '-',
          '-',
          '-',
          'Belum Ada Personel',
        ]
          .map(formatCsvCell)
          .join(','),
      );
      continue;
    }

    for (const person of session.attendees) {
      rows.push(
        [
          session.tanggal,
          session.posisi,
          session.shift,
          jamShift,
          session.penempatan,
          String(session.requestMp),
          String(actual),
          String(gap),
          person.namaLengkap,
          person.nik,
          person.noHp,
          person.status,
        ]
          .map(formatCsvCell)
          .join(','),
      );
    }
  }

  return [headers.map(formatCsvCell).join(','), ...rows].join('\n');
}

export function normalizeHubCode(hubCode?: string): string {
  const cleaned = String(hubCode ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
  return cleaned.length > 0 ? cleaned : 'STR';
}

export function buildAnterajaDwPortalUrl(hubCode?: string): string {
  const code = normalizeHubCode(hubCode);
  return `https://dw.anteraja.id/?HUBCODE=${encodeURIComponent(code)}`;
}

export function buildAnterajaVendorPortalUrl(): string {
  return 'https://dw.anteraja.id/vendor';
}

export function filterAttendanceSessionsForRecap(
  sessions: ShiftAttendanceSession[],
  filters: AttendanceRecapFilters,
): ShiftAttendanceSession[] {
  const query = filters.search.trim().toLowerCase();

  return sessions.filter((s) => {
    if (filters.dateFrom && s.tanggal < filters.dateFrom) return false;
    if (filters.dateTo && s.tanggal > filters.dateTo) return false;
    if (filters.posisi !== 'Semua' && s.posisi !== filters.posisi) return false;
    if (!matchesShiftFilter(s.shift, filters.shift)) return false;
    if (filters.penempatan !== 'Semua' && s.penempatan !== filters.penempatan) {
      return false;
    }

    if (query.length > 0) {
      const sessionMatch =
        s.penempatan.toLowerCase().includes(query) ||
        s.shift.toLowerCase().includes(query) ||
        s.tanggal.includes(query) ||
        s.attendees.some(
          (a) =>
            a.namaLengkap.toLowerCase().includes(query) ||
            a.nik.includes(query) ||
            a.noHp.includes(query),
        );
      if (!sessionMatch) return false;
    }

    return true;
  });
}

export function computeRecapSummary(
  sessions: ShiftAttendanceSession[],
): AttendanceRecapSummary {
  let totalRequestMp = 0;
  let totalHadir = 0;
  let totalBackup = 0;
  let totalBatal = 0;

  for (const session of sessions) {
    totalRequestMp += session.requestMp;
    for (const person of session.attendees) {
      if (person.status === 'Hadir') totalHadir += 1;
      else if (person.status === 'Backup') totalBackup += 1;
      else if (person.status === 'Batal') totalBatal += 1;
    }
  }

  const totalActual = totalHadir + totalBackup;
  const gap = totalActual - totalRequestMp;
  const fulfillmentRate =
    totalRequestMp > 0 ? Math.round((totalActual / totalRequestMp) * 100) : 0;

  return {
    totalSessions: sessions.length,
    totalRequestMp,
    totalActual,
    totalHadir,
    totalBackup,
    totalBatal,
    gap,
    fulfillmentRate,
  };
}

export function findActiveAttendanceConflict(
  allSessions: ShiftAttendanceSession[],
  targetDate: string,
  excludeSessionId: string,
  talentId: string,
  nik?: string,
): { session: ShiftAttendanceSession; attendee: ShiftAttendee } | null {
  const cleanDate = targetDate.trim();
  const cleanNik = String(nik ?? '').trim();

  for (const session of allSessions) {
    if (session.id === excludeSessionId) continue;
    if (session.tanggal !== cleanDate) continue;

    for (const attendee of session.attendees) {
      if (attendee.status === 'Batal') {
        continue;
      }
      const sameId =
        Boolean(talentId) &&
        Boolean(attendee.talentId) &&
        attendee.talentId === talentId;
      const sameNik =
        Boolean(cleanNik) &&
        Boolean(attendee.nik) &&
        attendee.nik.trim() === cleanNik;

      if (sameId || sameNik) {
        return { session, attendee };
      }
    }
  }

  return null;
}

export function validateSessionAttendanceConflicts(
  allSessions: ShiftAttendanceSession[],
  candidateSession: ShiftAttendanceSession,
): { valid: boolean; message?: string } {
  const seenKeys = new Set<string>();

  for (const person of candidateSession.attendees) {
    const key = person.talentId || person.nik.trim();
    if (key && seenKeys.has(key)) {
      return {
        valid: false,
        message: `${person.namaLengkap} sudah tercatat di sesi shift ini.`,
      };
    }
    if (key) {
      seenKeys.add(key);
    }

    if (person.status === 'Batal') {
      continue;
    }

    const conflict = findActiveAttendanceConflict(
      allSessions,
      candidateSession.tanggal,
      candidateSession.id,
      person.talentId,
      person.nik,
    );

    if (conflict) {
      return {
        valid: false,
        message: `Double absen ditolak: ${person.namaLengkap} sudah berstatus ${conflict.attendee.status} di ${conflict.session.shift} (${conflict.session.penempatan}) pada tanggal ${candidateSession.tanggal}.`,
      };
    }
  }

  return { valid: true };
}

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function formatIndonesianShortDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return dateStr;
  }
  const [year, month, day] = parts;
  const monthName = SHORT_MONTHS[month - 1] ?? String(month);
  return `${String(day).padStart(2, '0')} ${monthName} ${year}`;
}

export function getWeekBoundsFromDate(dateStr: string): {
  weekKey: string;
  startDate: string;
  endDate: string;
  label: string;
} {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return {
      weekKey: dateStr,
      startDate: dateStr,
      endDate: dateStr,
      label: dateStr,
    };
  }
  const [year, month, day] = parts;
  const utc = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utc.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(utc);
  monday.setUTCDate(utc.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const startDate = toIso(monday);
  const endDate = toIso(sunday);

  return {
    weekKey: `${startDate}_${endDate}`,
    startDate,
    endDate,
    label: `Minggu (${formatIndonesianShortDate(startDate)} – ${formatIndonesianShortDate(endDate)})`,
  };
}

export function getMonthInfoFromDate(dateStr: string): {
  monthKey: string;
  label: string;
} {
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 2 || parts.slice(0, 2).some((n) => Number.isNaN(n))) {
    return { monthKey: dateStr, label: dateStr };
  }
  const [year, month] = parts;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = INDONESIAN_MONTHS[month - 1] ?? String(month);
  return { monthKey, label: `${monthName} ${year}` };
}

export function aggregatePeriodAttendanceRecap(
  sessions: ShiftAttendanceSession[],
  grouping: RecapPeriodGrouping,
): PeriodAttendanceRecapRow[] {
  const map = new Map<string, PeriodAttendanceRecapRow>();

  for (const s of sessions) {
    let periodKey = s.tanggal;
    let periodLabel = formatIndonesianShortDate(s.tanggal);

    if (grouping === 'weekly') {
      const w = getWeekBoundsFromDate(s.tanggal);
      periodKey = w.weekKey;
      periodLabel = w.label;
    } else if (grouping === 'monthly') {
      const m = getMonthInfoFromDate(s.tanggal);
      periodKey = m.monthKey;
      periodLabel = m.label;
    }

    let entry = map.get(periodKey);
    if (!entry) {
      entry = {
        periodKey,
        periodLabel,
        sessionsCount: 0,
        requestMp: 0,
        kurirMasuk: 0,
        dwMasuk: 0,
        hadirCount: 0,
        backupCount: 0,
        batalCount: 0,
        actualMasuk: 0,
        gap: 0,
        fulfillmentRate: 0,
      };
      map.set(periodKey, entry);
    }

    entry.sessionsCount += 1;
    entry.requestMp += s.requestMp;

    for (const p of s.attendees) {
      if (p.status === 'Hadir') {
        entry.hadirCount += 1;
        entry.actualMasuk += 1;
        if (s.posisi === 'Kurir') entry.kurirMasuk += 1;
        else entry.dwMasuk += 1;
      } else if (p.status === 'Backup') {
        entry.backupCount += 1;
        entry.actualMasuk += 1;
        if (s.posisi === 'Kurir') entry.kurirMasuk += 1;
        else entry.dwMasuk += 1;
      } else if (p.status === 'Batal') {
        entry.batalCount += 1;
      }
    }
  }

  const rows = Array.from(map.values()).map((row) => {
    const gap = row.actualMasuk - row.requestMp;
    const fulfillmentRate =
      row.requestMp > 0 ? Math.round((row.actualMasuk / row.requestMp) * 100) : 0;
    return { ...row, gap, fulfillmentRate };
  });

  return rows.sort((a, b) => b.periodKey.localeCompare(a.periodKey));
}

export function aggregatePersonAttendanceRecap(
  sessions: ShiftAttendanceSession[],
): PersonAttendanceRecapRow[] {
  const map = new Map<
    string,
    {
      row: PersonAttendanceRecapRow;
      activeDates: Set<string>;
      hadirDates: Set<string>;
      backupDates: Set<string>;
    }
  >();

  for (const session of sessions) {
    const jam = formatShiftTimeRange(session.jamMulai, session.jamSelesai);
    for (const person of session.attendees) {
      const key =
        person.talentId || `${person.nik}-${person.namaLengkap}`.toLowerCase();
      let bucket = map.get(key);
      if (!bucket) {
        bucket = {
          row: {
            key,
            talentId: person.talentId,
            namaLengkap: person.namaLengkap,
            nik: person.nik,
            noHp: person.noHp,
            posisi: session.posisi,
            penempatanList: [],
            hadirCount: 0,
            backupCount: 0,
            batalCount: 0,
            totalMasuk: 0,
            totalSesi: 0,
            uniqueDaysCount: 0,
            hadirDaysCount: 0,
            backupDaysCount: 0,
            details: [],
          },
          activeDates: new Set<string>(),
          hadirDates: new Set<string>(),
          backupDates: new Set<string>(),
        };
        map.set(key, bucket);
      }

      if (!bucket.row.penempatanList.includes(session.penempatan)) {
        bucket.row.penempatanList.push(session.penempatan);
      }
      bucket.row.totalSesi += 1;

      const detail: PersonAttendanceDayDetail = {
        tanggal: session.tanggal,
        shift: session.shift,
        jam,
        penempatan: session.penempatan,
        status: person.status,
      };
      bucket.row.details.push(detail);

      if (person.status === 'Hadir') {
        bucket.row.hadirCount += 1;
        bucket.row.totalMasuk += 1;
        bucket.activeDates.add(session.tanggal);
        bucket.hadirDates.add(session.tanggal);
      } else if (person.status === 'Backup') {
        bucket.row.backupCount += 1;
        bucket.row.totalMasuk += 1;
        bucket.activeDates.add(session.tanggal);
        bucket.backupDates.add(session.tanggal);
      } else if (person.status === 'Batal') {
        bucket.row.batalCount += 1;
      }
    }
  }

  return Array.from(map.values())
    .map(({ row, activeDates, hadirDates, backupDates }) => ({
      ...row,
      uniqueDaysCount: activeDates.size,
      hadirDaysCount: hadirDates.size,
      backupDaysCount: backupDates.size,
      details: [...row.details].sort((a, b) =>
        b.tanggal.localeCompare(a.tanggal),
      ),
    }))
    .sort((a, b) => {
      if (b.uniqueDaysCount !== a.uniqueDaysCount) {
        return b.uniqueDaysCount - a.uniqueDaysCount;
      }
      if (b.totalMasuk !== a.totalMasuk) {
        return b.totalMasuk - a.totalMasuk;
      }
      return a.namaLengkap.localeCompare(b.namaLengkap, 'id');
    });
}

export function buildAttendanceRecapWhatsAppText(
  sessions: ShiftAttendanceSession[],
  filters: AttendanceRecapFilters,
): string {
  const summary = computeRecapSummary(sessions);
  const personRows = aggregatePersonAttendanceRecap(sessions);
  const kurirDays = personRows
    .filter((r) => r.posisi === 'Kurir')
    .reduce((acc, r) => acc + r.uniqueDaysCount, 0);
  const dwDays = personRows
    .filter((r) => r.posisi === 'DW')
    .reduce((acc, r) => acc + r.uniqueDaysCount, 0);

  const periodLabel =
    filters.dateFrom && filters.dateTo
      ? `${filters.dateFrom} s/d ${filters.dateTo}`
      : filters.dateFrom
        ? `Mulai ${filters.dateFrom}`
        : filters.dateTo
          ? `Sampai ${filters.dateTo}`
          : 'Semua Tanggal';

  const lines: string[] = [
    '*REKAP ABSENSI KURIR & DW*',
    '*PT Artha Kreasi Utama — Client ANTARAJA*',
    `Periode: ${periodLabel}`,
    `Filter: Posisi ${filters.posisi} | Shift ${filters.shift} | Hub ${filters.penempatan}`,
    '',
    '*RINGKASAN TOTAL:*',
    `- Total Sesi: ${summary.totalSessions}`,
    `- Request MP: ${summary.totalRequestMp}`,
    `- Actual Masuk: ${summary.totalActual} (Hadir: ${summary.totalHadir}, Backup: ${summary.totalBackup})`,
    `- Total Hari Kerja: ${kurirDays + dwDays} hari (Kurir: ${kurirDays} hari, DW: ${dwDays} hari)`,
    `- Batal: ${summary.totalBatal}`,
    `- Selisih: ${summary.gap > 0 ? `+${summary.gap}` : summary.gap} (${summary.fulfillmentRate}% Terpenuhi)`,
  ];

  if (personRows.length > 0) {
    lines.push('', '*REKAP HARI MASUK PER PERSONEL:*');
    personRows.forEach((p, idx) => {
      lines.push(
        `${idx + 1}. [${p.posisi}] ${p.namaLengkap}: ${p.uniqueDaysCount} hari masuk (Hadir ${p.hadirDaysCount}, Backup ${p.backupDaysCount}, Batal ${p.batalCount})`,
      );
    });
  }

  if (sessions.length > 0) {
    lines.push('', '*RINCIAN PER SHIFT:*');
    sessions.forEach((s, idx) => {
      const actual = computeShiftActual(s.attendees);
      const timeRange = formatShiftTimeRange(s.jamMulai, s.jamSelesai);
      const timeText = timeRange ? ` (${timeRange})` : '';
      lines.push(
        `${idx + 1}. [${s.posisi}] ${s.tanggal} · ${s.shift}${timeText} · ${s.penempatan}`,
      );
      lines.push(`   MP: ${actual}/${s.requestMp} (Actual/Request)`);
      if (s.attendees.length === 0) {
        lines.push('   - Belum ada personel terinput');
      } else {
        s.attendees.forEach((p, pIdx) => {
          lines.push(`   ${pIdx + 1}) ${p.namaLengkap} — ${p.status}`);
        });
      }
    });
  }

  return lines.join('\n');
}

export function flattenDetailedAttendanceRecap(
  sessions: ShiftAttendanceSession[],
): DetailedAttendanceRecapRow[] {
  const rows: DetailedAttendanceRecapRow[] = [];

  for (const session of sessions) {
    const jamShift =
      formatShiftTimeRange(session.jamMulai, session.jamSelesai) || '-';
    for (const person of session.attendees) {
      rows.push({
        id: `${session.id}-${person.id}`,
        tanggal: session.tanggal,
        posisi: session.posisi,
        shift: session.shift,
        jamShift,
        penempatanHub: session.penempatan,
        namaLengkap: person.namaLengkap,
        nik: person.nik,
        noHp: person.noHp,
        jenisBank: person.jenisBank,
        noRekening: person.noRekening,
        status: person.status,
      });
    }
  }

  return rows.sort((a, b) => {
    const dateDiff = b.tanggal.localeCompare(a.tanggal);
    if (dateDiff !== 0) return dateDiff;
    const shiftDiff = a.shift.localeCompare(b.shift, 'id');
    if (shiftDiff !== 0) return shiftDiff;
    return a.namaLengkap.localeCompare(b.namaLengkap, 'id');
  });
}

export function generateAttendanceRecapCsv(
  sessions: ShiftAttendanceSession[],
  mode: 'shift' | 'person' | 'period' | 'detail',
  periodGrouping: RecapPeriodGrouping = 'daily',
): string {
  if (mode === 'detail') {
    const headers = [
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
    ];
    const rows = flattenDetailedAttendanceRecap(sessions).map((d) =>
      [
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
      ]
        .map(formatCsvCell)
        .join(','),
    );
    return [headers.map(formatCsvCell).join(','), ...rows].join('\n');
  }

  if (mode === 'period') {
    const headers = [
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
    ];
    const rows = aggregatePeriodAttendanceRecap(sessions, periodGrouping).map(
      (r) =>
        [
          r.periodLabel,
          String(r.sessionsCount),
          String(r.requestMp),
          String(r.kurirMasuk),
          String(r.dwMasuk),
          String(r.hadirCount),
          String(r.backupCount),
          String(r.batalCount),
          String(r.actualMasuk),
          String(r.gap),
          `${r.fulfillmentRate}%`,
        ]
          .map(formatCsvCell)
        .join(','),
    );
    return [headers.map(formatCsvCell).join(','), ...rows].join('\n');
  }

  if (mode === 'person') {
    const headers = [
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
      'Rincian Tanggal',
    ];
    const personRows = aggregatePersonAttendanceRecap(sessions).map((row) =>
      [
        row.namaLengkap,
        row.nik,
        row.noHp,
        row.posisi,
        row.penempatanList.join(' | '),
        String(row.uniqueDaysCount),
        String(row.hadirDaysCount),
        String(row.backupDaysCount),
        String(row.batalCount),
        String(row.totalMasuk),
        row.details
          .map((d) => `${d.tanggal} (${d.shift} - ${d.status})`)
          .join('; '),
      ]
        .map(formatCsvCell)
        .join(','),
    );
    return [headers.map(formatCsvCell).join(','), ...personRows].join('\n');
  }

  const headers = [
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
    'Daftar Personel',
  ];

  const rows = sessions.map((s) => {
    let hadir = 0;
    let backup = 0;
    let batal = 0;
    for (const p of s.attendees) {
      if (p.status === 'Hadir') hadir += 1;
      else if (p.status === 'Backup') backup += 1;
      else if (p.status === 'Batal') batal += 1;
    }
    const actual = hadir + backup;
    const gap = actual - s.requestMp;
    const rate = s.requestMp > 0 ? Math.round((actual / s.requestMp) * 100) : 0;
    const jam = formatShiftTimeRange(s.jamMulai, s.jamSelesai) || '-';
    const names =
      s.attendees.length > 0
        ? s.attendees.map((p) => `${p.namaLengkap} (${p.status})`).join('; ')
        : '-';

    return [
      s.tanggal,
      s.posisi,
      s.shift,
      jam,
      s.penempatan,
      String(s.requestMp),
      String(hadir),
      String(backup),
      String(batal),
      String(actual),
      String(gap),
      `${rate}%`,
      names,
    ]
      .map(formatCsvCell)
      .join(',');
  });

  return [headers.map(formatCsvCell).join(','), ...rows].join('\n');
}



