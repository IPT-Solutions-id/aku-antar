export type TalentPosition = 'Kurir' | 'DW';

export type TalentStatus = 'Aktif' | 'Non-Aktif';

export type BankType =
  | 'BCA'
  | 'BRI'
  | 'BNI'
  | 'Mandiri'
  | 'CIMB Niaga'
  | 'BSI'
  | 'Permata'
  | 'Danamon'
  | 'Lainnya';

export interface TalentRecord {
  id: string;
  namaLengkap: string;
  nik: string;
  noHp: string;
  alamatDomisili: string;
  noRekening: string;
  namaPenerima: string;
  jenisBank: BankType | string;
  posisi: TalentPosition;
  penempatan: string;
  status: TalentStatus;
  tanggalPenempatan: string;
  updatedAt: string;
}

export interface TalentFormInput {
  namaLengkap: string;
  nik: string;
  noHp: string;
  alamatDomisili: string;
  noRekening: string;
  namaPenerima: string;
  jenisBank: string;
  posisi: TalentPosition;
  penempatan: string;
  status: TalentStatus;
  tanggalPenempatan?: string;
}

export interface TalentFilters {
  search: string;
  status: 'Semua' | TalentStatus;
  posisi: 'Semua' | TalentPosition;
  penempatan: string;
}

export interface TalentStats {
  totalPool: number;
  totalKurir: number;
  totalDw: number;
  activeTotal: number;
  inactiveTotal: number;
  activeKurir: number;
  activeDw: number;
  inactiveKurir: number;
  inactiveDw: number;
  activeRate: number;
}

export interface DailyPlacementMetric {
  date: string;
  label: string;
  kurirPlaced: number;
  dwPlaced: number;
  totalPlaced: number;
  target: number;
  fulfillmentRate: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof TalentFormInput, string>>;
}

export type AttendancePersonStatus = 'Hadir' | 'Backup' | 'Batal';

export interface ShiftAttendee {
  id: string;
  talentId: string;
  namaLengkap: string;
  nik: string;
  noHp: string;
  penempatanAsal: string;
  jenisBank: string;
  noRekening: string;
  status: AttendancePersonStatus;
}

export interface ShiftAttendanceSession {
  id: string;
  posisi: TalentPosition;
  tanggal: string;
  shift: string;
  jamMulai?: string;
  jamSelesai?: string;
  penempatan: string;
  requestMp: number;
  attendees: ShiftAttendee[];
  updatedAt: string;
}

export interface ShiftAttendanceFormInput {
  posisi: TalentPosition;
  tanggal: string;
  shift: string;
  jamMulai: string;
  jamSelesai: string;
  penempatan: string;
  requestMp: number;
}

export interface AttendanceSummary {
  totalSessions: number;
  totalRequestMp: number;
  totalActual: number;
  gap: number;
  fulfillmentRate: number;
}

export type RecapPeriodGrouping = 'daily' | 'weekly' | 'monthly';

export interface AttendanceRecapFilters {
  dateFrom: string;
  dateTo: string;
  posisi: 'Semua' | TalentPosition;
  shift: string;
  penempatan: string;
  search: string;
}

export interface AttendanceRecapSummary extends AttendanceSummary {
  totalHadir: number;
  totalBackup: number;
  totalBatal: number;
}

export interface PersonAttendanceDayDetail {
  tanggal: string;
  shift: string;
  jam: string;
  penempatan: string;
  status: AttendancePersonStatus;
}

export interface PersonAttendanceRecapRow {
  key: string;
  talentId: string;
  namaLengkap: string;
  nik: string;
  noHp: string;
  posisi: TalentPosition;
  penempatanList: string[];
  hadirCount: number;
  backupCount: number;
  batalCount: number;
  totalMasuk: number;
  totalSesi: number;
  uniqueDaysCount: number;
  hadirDaysCount: number;
  backupDaysCount: number;
  details: PersonAttendanceDayDetail[];
}

export interface PeriodAttendanceRecapRow {
  periodKey: string;
  periodLabel: string;
  sessionsCount: number;
  requestMp: number;
  kurirMasuk: number;
  dwMasuk: number;
  hadirCount: number;
  backupCount: number;
  batalCount: number;
  actualMasuk: number;
  gap: number;
  fulfillmentRate: number;
}

export interface DetailedAttendanceRecapRow {
  id: string;
  tanggal: string;
  posisi: TalentPosition;
  shift: string;
  jamShift: string;
  penempatanHub: string;
  namaLengkap: string;
  nik: string;
  noHp: string;
  jenisBank: string;
  noRekening: string;
  status: AttendancePersonStatus;
}
