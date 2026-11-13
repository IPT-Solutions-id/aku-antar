import { Fragment, useMemo, useState } from 'react';
import {
  CalendarRange,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Download,
  FileSpreadsheet,
  ListChecks,
  MessageCircle,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import { ANTARAJA_HUBS, SHIFT_OPTIONS } from '../data/seedData';
import type {
  AttendanceRecapFilters,
  RecapPeriodGrouping,
  ShiftAttendanceSession,
} from '../types/talent';
import { downloadAttendanceRecapExcel } from '../utils/excelExport';
import {
  aggregatePeriodAttendanceRecap,
  aggregatePersonAttendanceRecap,
  buildAttendanceRecapWhatsAppText,
  buildWhatsAppUrl,
  computeRecapSummary,
  computeShiftActual,
  filterAttendanceSessionsForRecap,
  flattenDetailedAttendanceRecap,
  formatIndonesianShortDate,
  formatShiftTimeRange,
  generateAttendanceRecapCsv,
  getMonthInfoFromDate,
  getWeekBoundsFromDate,
} from '../utils/talentLogic';

interface AttendanceRecapViewProps {
  sessions: ShiftAttendanceSession[];
  loading: boolean;
  onShowToast: (msg: string) => void;
}

type PeriodQuickMode = 'custom' | 'daily' | 'weekly' | 'monthly';

const DEFAULT_RECAP_FILTERS: AttendanceRecapFilters = {
  dateFrom: '',
  dateTo: '',
  posisi: 'Semua',
  shift: 'Semua',
  penempatan: 'Semua',
  search: '',
};

function getMonthBounds(monthValue: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthValue.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) {
    return { start: '', end: '' };
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const paddedMonth = String(month).padStart(2, '0');
  return {
    start: `${year}-${paddedMonth}-01`,
    end: `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function AttendanceRecapView({
  sessions,
  loading,
  onShowToast,
}: AttendanceRecapViewProps) {
  const [filters, setFilters] = useState<AttendanceRecapFilters>(
    DEFAULT_RECAP_FILTERS,
  );
  const [periodMode, setPeriodMode] = useState<PeriodQuickMode>('custom');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedWeekRef, setSelectedWeekRef] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [periodGrouping, setPeriodGrouping] =
    useState<RecapPeriodGrouping>('daily');

  const [activeTab, setActiveTab] = useState<
    'shift' | 'period' | 'person' | 'detail'
  >('shift');
  const [expandedPersonKeys, setExpandedPersonKeys] = useState<
    Record<string, boolean>
  >({});
  const [copiedWa, setCopiedWa] = useState(false);
  const [showWaPreview, setShowWaPreview] = useState(false);

  const defaultReferenceDate = useMemo(() => {
    if (sessions.length === 0) {
      return new Date().toISOString().slice(0, 10);
    }
    return sessions
      .map((s) => s.tanggal)
      .sort((a, b) => b.localeCompare(a))[0];
  }, [sessions]);

  const hubOptions = useMemo(() => {
    const set = new Set<string>(ANTARAJA_HUBS);
    for (const s of sessions) {
      if (s.penempatan) set.add(s.penempatan);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [sessions]);

  const filteredSessions = useMemo(
    () => filterAttendanceSessionsForRecap(sessions, filters),
    [sessions, filters],
  );

  const summary = useMemo(
    () => computeRecapSummary(filteredSessions),
    [filteredSessions],
  );

  const periodRows = useMemo(
    () => aggregatePeriodAttendanceRecap(filteredSessions, periodGrouping),
    [filteredSessions, periodGrouping],
  );

  const personRows = useMemo(
    () => aggregatePersonAttendanceRecap(filteredSessions),
    [filteredSessions],
  );

  const detailRows = useMemo(
    () => flattenDetailedAttendanceRecap(filteredSessions),
    [filteredSessions],
  );

  const workDaysBreakdown = useMemo(() => {
    let kurirDays = 0;
    let dwDays = 0;
    let kurirPeople = 0;
    let dwPeople = 0;
    for (const row of personRows) {
      if (row.posisi === 'Kurir') {
        kurirDays += row.uniqueDaysCount;
        if (row.uniqueDaysCount > 0) kurirPeople += 1;
      } else {
        dwDays += row.uniqueDaysCount;
        if (row.uniqueDaysCount > 0) dwPeople += 1;
      }
    }
    return {
      kurirDays,
      dwDays,
      totalDays: kurirDays + dwDays,
      kurirPeople,
      dwPeople,
    };
  }, [personRows]);

  const whatsappText = useMemo(
    () => buildAttendanceRecapWhatsAppText(filteredSessions, filters),
    [filteredSessions, filters],
  );

  const hasActiveFilters =
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.posisi !== 'Semua' ||
    filters.shift !== 'Semua' ||
    filters.penempatan !== 'Semua' ||
    filters.search.trim() !== '' ||
    periodMode !== 'custom';

  const handleSelectPeriodMode = (mode: PeriodQuickMode) => {
    setPeriodMode(mode);
    if (mode === 'custom') {
      setFilters((prev) => ({ ...prev, dateFrom: '', dateTo: '' }));
      return;
    }
    const refDate = selectedDay || defaultReferenceDate;
    if (mode === 'daily') {
      setSelectedDay(refDate);
      setPeriodGrouping('daily');
      setFilters((prev) => ({
        ...prev,
        dateFrom: refDate,
        dateTo: refDate,
      }));
      return;
    }
    if (mode === 'weekly') {
      const target = selectedWeekRef || refDate;
      setSelectedWeekRef(target);
      setPeriodGrouping('weekly');
      const bounds = getWeekBoundsFromDate(target);
      setFilters((prev) => ({
        ...prev,
        dateFrom: bounds.startDate,
        dateTo: bounds.endDate,
      }));
      return;
    }
    if (mode === 'monthly') {
      const monthVal = selectedMonth || refDate.slice(0, 7);
      setSelectedMonth(monthVal);
      setPeriodGrouping('monthly');
      const bounds = getMonthBounds(monthVal);
      setFilters((prev) => ({
        ...prev,
        dateFrom: bounds.start,
        dateTo: bounds.end,
      }));
    }
  };

  const handleResetFilters = () => {
    setPeriodMode('custom');
    setSelectedDay('');
    setSelectedWeekRef('');
    setSelectedMonth('');
    setFilters(DEFAULT_RECAP_FILTERS);
  };

  const togglePersonDetail = (key: string) => {
    setExpandedPersonKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyWaReport = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopiedWa(true);
      onShowToast('Format laporan WA rekapan berhasil disalin ke clipboard.');
      window.setTimeout(() => setCopiedWa(false), 2500);
    } catch {
      setShowWaPreview(true);
      onShowToast('Silakan salin teks rekapan WA dari kotak pratinjau.');
    }
  };

  const handleExportRecapCsv = () => {
    const csv = generateAttendanceRecapCsv(
      filteredSessions,
      activeTab,
      periodGrouping,
    );
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename =
      activeTab === 'shift'
        ? 'rekap-absensi-shift-antaraja.csv'
        : activeTab === 'period'
          ? `rekap-absensi-periode-${periodGrouping}-antaraja.csv`
          : activeTab === 'detail'
            ? 'rekap-detail-absensi-antaraja.csv'
            : 'rekap-absensi-personel-hari-masuk-antaraja.csv';
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast(
      activeTab === 'shift'
        ? `Berhasil mengekspor ${filteredSessions.length} sesi rekapan ke CSV.`
        : activeTab === 'period'
          ? `Berhasil mengekspor ${periodRows.length} baris rekapan periode ke CSV.`
          : activeTab === 'detail'
            ? `Berhasil mengekspor ${detailRows.length} baris detail absensi ke CSV.`
            : `Berhasil mengekspor rekapan hari masuk ${personRows.length} personel ke CSV.`,
    );
  };

  const handleExportExcelMultiSheet = () => {
    const suffix =
      filters.dateFrom && filters.dateTo
        ? `${filters.dateFrom}_sd_${filters.dateTo}`
        : 'semua-periode';
    downloadAttendanceRecapExcel(
      filteredSessions,
      periodGrouping,
      `rekap-absensi-antaraja-${suffix}.xlsx`,
    );
    onShowToast(
      `Berhasil mengunduh Excel Multi-Sheet (4 Sheet: Rekap per Personel, Detail Absensi, Rekap Periode, Rekap Shift & Hub).`,
    );
  };

  const activePeriodBadgeText = useMemo(() => {
    if (periodMode === 'daily' && filters.dateFrom) {
      return `Harian: ${formatIndonesianShortDate(filters.dateFrom)}`;
    }
    if (periodMode === 'weekly' && filters.dateFrom && filters.dateTo) {
      return `Mingguan (Sen–Min): ${formatIndonesianShortDate(filters.dateFrom)} – ${formatIndonesianShortDate(filters.dateTo)}`;
    }
    if (periodMode === 'monthly' && filters.dateFrom) {
      return `Bulanan: ${getMonthInfoFromDate(filters.dateFrom).label}`;
    }
    if (filters.dateFrom && filters.dateTo) {
      return `${filters.dateFrom} s/d ${filters.dateTo}`;
    }
    return null;
  }, [periodMode, filters.dateFrom, filters.dateTo]);

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip */}
      <section
        aria-label="Ringkasan Rekapan Absensi Kurir & DW"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <span className="text-xs font-semibold text-slate-500 block">
            Total Request MP
          </span>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              data-testid="recap-total-request"
              className="text-2xl font-bold font-mono text-slate-900 tabular-nums"
            >
              {summary.totalRequestMp}
            </span>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {summary.totalSessions} Sesi Shift
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <span className="text-xs font-semibold text-slate-500 block">
            Total Actual Masuk
          </span>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              data-testid="recap-total-actual"
              className="text-2xl font-bold font-mono text-emerald-700 tabular-nums"
            >
              {summary.totalActual}
            </span>
            <span className="text-xs text-slate-600 font-mono tabular-nums">
              Hadir {summary.totalHadir} · Backup {summary.totalBackup}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <span className="text-xs font-semibold text-slate-500 block">
            Total Hari Kerja (Kurir &amp; DW)
          </span>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              data-testid="recap-total-workdays"
              className="text-2xl font-bold font-mono text-[#6E2B8B] tabular-nums"
            >
              {workDaysBreakdown.totalDays} hari
            </span>
            <span className="text-xs font-mono text-slate-600 tabular-nums">
              Kurir {workDaysBreakdown.kurirDays}h · DW{' '}
              {workDaysBreakdown.dwDays}h
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <span className="text-xs font-semibold text-slate-500 block">
            Selisih MP &amp; Pemenuhan
          </span>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              data-testid="recap-gap"
              className={`text-2xl font-bold font-mono tabular-nums ${
                summary.gap >= 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {summary.gap > 0 ? `+${summary.gap}` : summary.gap}
            </span>
            <span
              data-testid="recap-rate"
              className="text-xs font-mono font-semibold text-slate-700 tabular-nums"
            >
              {summary.fulfillmentRate}% · {summary.totalBatal} Batal
            </span>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
        {/* Period Quick Selector Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
              Periode Rekapan:
            </span>
            <div
              role="group"
              aria-label="Mode periode rekapan"
              className="inline-flex items-center bg-slate-100 p-0.5 rounded border border-slate-200"
            >
              {(
                [
                  { id: 'custom', label: 'Semua / Custom' },
                  { id: 'daily', label: 'Per Hari' },
                  { id: 'weekly', label: 'Per Minggu' },
                  { id: 'monthly', label: 'Per Bulan' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPeriodMode(item.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap ${
                    periodMode === item.id
                      ? 'bg-white text-slate-900 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {activePeriodBadgeText && (
            <span className="rounded-[3px] border border-[#6E2B8B]/20 bg-[#6E2B8B]/5 px-2.5 py-1 text-xs font-medium text-[#6E2B8B] font-mono tabular-nums">
              {activePeriodBadgeText}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {periodMode === 'custom' && (
            <>
              <div>
                <label
                  htmlFor="recap-date-from"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Dari Tanggal
                </label>
                <input
                  id="recap-date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-[#6E2B8B] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="recap-date-to"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Sampai Tanggal
                </label>
                <input
                  id="recap-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateTo: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-[#6E2B8B] focus:outline-none"
                />
              </div>
            </>
          )}

          {periodMode === 'daily' && (
            <div className="sm:col-span-2">
              <label
                htmlFor="recap-single-day"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Pilih Tanggal (Rekap Harian)
              </label>
              <input
                id="recap-single-day"
                type="date"
                value={selectedDay}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDay(val);
                  setFilters((prev) => ({
                    ...prev,
                    dateFrom: val,
                    dateTo: val,
                  }));
                }}
                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-[#6E2B8B] focus:outline-none"
              />
            </div>
          )}

          {periodMode === 'weekly' && (
            <div className="sm:col-span-2">
              <label
                htmlFor="recap-week-ref"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Pilih Tanggal di Minggu (Senin – Minggu)
              </label>
              <input
                id="recap-week-ref"
                type="date"
                value={selectedWeekRef}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedWeekRef(val);
                  if (!val) {
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: '',
                      dateTo: '',
                    }));
                    return;
                  }
                  const bounds = getWeekBoundsFromDate(val);
                  setFilters((prev) => ({
                    ...prev,
                    dateFrom: bounds.startDate,
                    dateTo: bounds.endDate,
                  }));
                }}
                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-[#6E2B8B] focus:outline-none"
              />
            </div>
          )}

          {periodMode === 'monthly' && (
            <div className="sm:col-span-2">
              <label
                htmlFor="recap-month-ref"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Pilih Bulan (Rekap Bulanan)
              </label>
              <input
                id="recap-month-ref"
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMonth(val);
                  if (!val) {
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: '',
                      dateTo: '',
                    }));
                    return;
                  }
                  const bounds = getMonthBounds(val);
                  setFilters((prev) => ({
                    ...prev,
                    dateFrom: bounds.start,
                    dateTo: bounds.end,
                  }));
                }}
                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-[#6E2B8B] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="recap-posisi"
              className="block text-[11px] font-medium text-slate-600 mb-1"
            >
              Posisi
            </label>
            <select
              id="recap-posisi"
              value={filters.posisi}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  posisi: e.target.value as 'Semua' | 'Kurir' | 'DW',
                }))
              }
              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#6E2B8B] focus:outline-none"
            >
              <option value="Semua">Semua (Kurir &amp; DW)</option>
              <option value="Kurir">Kurir</option>
              <option value="DW">DW</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="recap-shift"
              className="block text-[11px] font-medium text-slate-600 mb-1"
            >
              Shift
            </label>
            <select
              id="recap-shift"
              value={filters.shift}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, shift: e.target.value }))
              }
              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#6E2B8B] focus:outline-none"
            >
              <option value="Semua">Semua Shift</option>
              {SHIFT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="recap-hub"
              className="block text-[11px] font-medium text-slate-600 mb-1"
            >
              Penempatan Hub
            </label>
            <select
              id="recap-hub"
              value={filters.penempatan}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, penempatan: e.target.value }))
              }
              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#6E2B8B] focus:outline-none"
            >
              <option value="Semua">Semua Hub</option>
              {hubOptions.map((hub) => (
                <option key={hub} value={hub}>
                  {hub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="recap-search"
              className="block text-[11px] font-medium text-slate-600 mb-1"
            >
              Cari Nama / NIK / Hub
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                id="recap-search"
                type="search"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Nama, NIK, Hub..."
                className="w-full rounded border border-slate-200 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:border-[#6E2B8B] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sub-bar: Tabs + Reset + Actions (Salin WA, Export CSV & Export Excel 4 Sheet) */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Jenis tampilan rekapan"
              className="inline-flex flex-wrap items-center bg-slate-100 p-0.5 rounded border border-slate-200"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'shift'}
                onClick={() => setActiveTab('shift')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap ${
                  activeTab === 'shift'
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#6E2B8B]" />
                <span>Shift &amp; Hub ({filteredSessions.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'period'}
                onClick={() => setActiveTab('period')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap ${
                  activeTab === 'period'
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5 text-[#6E2B8B]" />
                <span>Rekap Periode ({periodRows.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'person'}
                onClick={() => setActiveTab('person')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap ${
                  activeTab === 'person'
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="h-3.5 w-3.5 text-[#6E2B8B]" />
                <span>Per Personel ({personRows.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'detail'}
                onClick={() => setActiveTab('detail')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap ${
                  activeTab === 'detail'
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListChecks className="h-3.5 w-3.5 text-[#6E2B8B]" />
                <span>Detail Absensi ({detailRows.length})</span>
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#6E2B8B] hover:underline whitespace-nowrap"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWaPreview((prev) => !prev)}
              className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              {showWaPreview ? 'Tutup WA' : 'Pratinjau WA'}
            </button>

            <button
              type="button"
              onClick={handleCopyWaReport}
              className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
            >
              {copiedWa ? (
                <Check className="h-3.5 w-3.5 text-emerald-700" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5 text-emerald-700" />
              )}
              <span>{copiedWa ? 'Tersalin!' : 'Salin WA'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportRecapCsv}
              className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcelMultiSheet}
              data-testid="export-excel-multisheet"
              className="inline-flex items-center gap-1.5 rounded bg-[#6E2B8B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5B2174] whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel (4 Sheet)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Optional WhatsApp Copy Preview Box */}
      {showWaPreview && (
        <div className="bg-white border border-emerald-200 rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900">
              Pratinjau Teks Rekapan WhatsApp
            </span>
            <button
              type="button"
              onClick={handleCopyWaReport}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Salin Ulang
            </button>
          </div>
          <pre
            data-testid="recap-wa-preview"
            className="rounded border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto"
          >
            {whatsappText}
          </pre>
        </div>
      )}

      {/* Content Tables */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
          <div className="h-10 rounded bg-slate-100 animate-pulse" />
          <div className="h-24 rounded bg-slate-100 animate-pulse" />
        </div>
      ) : activeTab === 'shift' ? (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          {filteredSessions.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Tidak ada data absensi Kurir atau DW yang sesuai dengan filter
              rekapan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 pl-4 pr-2.5">Tanggal</th>
                    <th className="py-2.5 px-2.5">Posisi</th>
                    <th className="py-2.5 px-2.5">Shift &amp; Jam</th>
                    <th className="py-2.5 px-2.5">Penempatan Hub</th>
                    <th className="py-2.5 px-2.5 text-right">Req MP</th>
                    <th className="py-2.5 px-2.5 text-right">Hadir</th>
                    <th className="py-2.5 px-2.5 text-right">Backup</th>
                    <th className="py-2.5 px-2.5 text-right">Batal</th>
                    <th className="py-2.5 px-2.5 text-right">Actual</th>
                    <th className="py-2.5 px-2.5 text-right">Selisih</th>
                    <th className="py-2.5 pl-2.5 pr-4 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSessions.map((s) => {
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
                    const rate =
                      s.requestMp > 0
                        ? Math.round((actual / s.requestMp) * 100)
                        : 0;
                    const jam = formatShiftTimeRange(s.jamMulai, s.jamSelesai);

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/70 transition-colors align-top"
                      >
                        <td className="py-3 pl-4 pr-2.5 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          {s.tanggal}
                        </td>
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          <span
                            className={`inline-block rounded-[3px] px-2 py-0.5 text-[11px] font-semibold ${
                              s.posisi === 'Kurir'
                                ? 'bg-[#6E2B8B]/10 text-[#6E2B8B]'
                                : 'bg-sky-50 text-sky-700'
                            }`}
                          >
                            {s.posisi}
                          </span>
                        </td>
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {s.shift}
                          </div>
                          {jam && (
                            <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                              {jam}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2.5">
                          <div className="font-medium text-slate-900">
                            {s.penempatan}
                          </div>
                          {s.attendees.length > 0 && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              {s.attendees
                                .map((p) => `${p.namaLengkap} (${p.status})`)
                                .join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {s.requestMp}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono text-emerald-700 tabular-nums">
                          {hadir}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono text-sky-700 tabular-nums">
                          {backup}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono text-red-600 tabular-nums">
                          {batal}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {actual}
                        </td>
                        <td
                          className={`py-3 px-2.5 text-right font-mono font-semibold tabular-nums ${
                            gap >= 0 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {gap > 0 ? `+${gap}` : gap}
                        </td>
                        <td
                          className={`py-3 pl-2.5 pr-4 text-right font-mono font-semibold tabular-nums ${
                            rate >= 100 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {rate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'period' ? (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
            <div>
              <h2 className="text-xs font-bold text-slate-900">
                Ringkasan Kehadiran Berdasarkan Periode
              </h2>
              <p className="text-[11px] text-slate-500">
                Pengelompokan otomatis Harian, Mingguan (Senin–Minggu), atau
                Bulanan untuk Kurir &amp; DW.
              </p>
            </div>
            <div
              role="group"
              aria-label="Pengelompokan periode"
              className="inline-flex items-center bg-slate-100 p-0.5 rounded border border-slate-200"
            >
              {(
                [
                  { id: 'daily', label: 'Per Hari' },
                  { id: 'weekly', label: 'Per Minggu' },
                  { id: 'monthly', label: 'Per Bulan' },
                ] as const
              ).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setPeriodGrouping(g.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap ${
                    periodGrouping === g.id
                      ? 'bg-white text-slate-900 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {periodRows.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Tidak ada data absensi untuk ditampilkan pada periode yang
              dipilih.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 pl-4 pr-2.5">Periode</th>
                    <th className="py-2.5 px-2.5 text-right">Jml Sesi</th>
                    <th className="py-2.5 px-2.5 text-right">Req MP</th>
                    <th className="py-2.5 px-2.5 text-right">Kurir Masuk</th>
                    <th className="py-2.5 px-2.5 text-right">DW Masuk</th>
                    <th className="py-2.5 px-2.5 text-right">Hadir</th>
                    <th className="py-2.5 px-2.5 text-right">Backup</th>
                    <th className="py-2.5 px-2.5 text-right">Batal</th>
                    <th className="py-2.5 px-2.5 text-right">Total Actual</th>
                    <th className="py-2.5 px-2.5 text-right">Selisih</th>
                    <th className="py-2.5 pl-2.5 pr-4 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {periodRows.map((row) => (
                    <tr
                      key={row.periodKey}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 pl-4 pr-2.5 font-semibold text-slate-900 whitespace-nowrap">
                        {row.periodLabel}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono text-slate-600 tabular-nums">
                        {row.sessionsCount}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {row.requestMp}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-semibold text-[#6E2B8B] tabular-nums">
                        {row.kurirMasuk}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-semibold text-sky-700 tabular-nums">
                        {row.dwMasuk}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono text-emerald-700 tabular-nums">
                        {row.hadirCount}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono text-sky-700 tabular-nums">
                        {row.backupCount}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono text-red-600 tabular-nums">
                        {row.batalCount}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {row.actualMasuk}
                      </td>
                      <td
                        className={`py-3 px-2.5 text-right font-mono font-semibold tabular-nums ${
                          row.gap >= 0 ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {row.gap > 0 ? `+${row.gap}` : row.gap}
                      </td>
                      <td
                        className={`py-3 pl-2.5 pr-4 text-right font-mono font-semibold tabular-nums ${
                          row.fulfillmentRate >= 100
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {row.fulfillmentRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'detail' ? (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
            <div>
              <h2 className="text-xs font-bold text-slate-900">
                Detail Catatan Absensi Per Tanggal &amp; Shift
              </h2>
              <p className="text-[11px] text-slate-500">
                Menampilkan rincian lengkap per baris (Tanggal, Shift, Hub,
                Nama, NIK, Bank &amp; Rekening, dan Status) — sama dengan sheet{' '}
                <span className="font-semibold text-slate-700">
                  Detail Absensi
                </span>{' '}
                pada file Excel.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
              {detailRows.length} baris detail
            </span>
          </div>

          {detailRows.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Belum ada rincian absensi untuk filter yang dipilih.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                    <th className="py-2.5 px-2.5">Tanggal</th>
                    <th className="py-2.5 px-2.5">Posisi</th>
                    <th className="py-2.5 px-2.5">Shift &amp; Jam</th>
                    <th className="py-2.5 px-2.5">Penempatan Hub</th>
                    <th className="py-2.5 px-2.5">Nama Lengkap &amp; NIK</th>
                    <th className="py-2.5 px-2.5">No HP &amp; WA</th>
                    <th className="py-2.5 px-2.5">Bank &amp; Rekening</th>
                    <th className="py-2.5 pl-2.5 pr-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {detailRows.map((d, idx) => {
                    const waUrl = buildWhatsAppUrl(d.noHp);
                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-2.5 pl-4 pr-2 font-mono text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          {d.tanggal}
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span
                            className={`inline-block rounded-[3px] px-2 py-0.5 text-[11px] font-semibold ${
                              d.posisi === 'Kurir'
                                ? 'bg-[#6E2B8B]/10 text-[#6E2B8B]'
                                : 'bg-sky-50 text-sky-700'
                            }`}
                          >
                            {d.posisi}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {d.shift}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                            {d.jamShift}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-700">
                          {d.penempatanHub}
                        </td>
                        <td className="py-2.5 px-2.5">
                          <div className="font-semibold text-slate-900">
                            {d.namaLengkap}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                            NIK: {d.nik}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-700 tabular-nums">
                              {d.noHp}
                            </span>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Chat WhatsApp ${d.namaLengkap}`}
                                className="inline-flex items-center gap-1 rounded-[3px] border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                              >
                                <MessageCircle className="h-3 w-3 text-emerald-600" />
                                <span>WA</span>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          <span className="font-sans font-semibold text-slate-800">
                            {d.jenisBank}
                          </span>{' '}
                          · {d.noRekening}
                        </td>
                        <td className="py-2.5 pl-2.5 pr-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-block rounded-[3px] px-2 py-0.5 text-[11px] font-semibold ${
                              d.status === 'Hadir'
                                ? 'bg-emerald-50 text-emerald-700'
                                : d.status === 'Backup'
                                  ? 'bg-sky-50 text-sky-700'
                                  : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
            <div className="text-xs text-slate-700">
              Total Hari Kerja Akumulatif:{' '}
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {workDaysBreakdown.totalDays} hari
              </span>{' '}
              <span className="text-slate-500">
                (Kurir:{' '}
                <span className="font-mono font-semibold text-[#6E2B8B] tabular-nums">
                  {workDaysBreakdown.kurirDays} hari
                </span>{' '}
                dari {workDaysBreakdown.kurirPeople} orang · DW:{' '}
                <span className="font-mono font-semibold text-sky-700 tabular-nums">
                  {workDaysBreakdown.dwDays} hari
                </span>{' '}
                dari {workDaysBreakdown.dwPeople} orang)
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Klik &ldquo;Detail&rdquo; untuk melihat tanggal &amp; shift masuk
              masing-masing personel
            </span>
          </div>

          {personRows.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Belum ada data personel terinput pada sesi absensi yang sesuai
              filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                    <th className="py-2.5 px-2.5">Nama Lengkap &amp; NIK</th>
                    <th className="py-2.5 px-2.5">Posisi</th>
                    <th className="py-2.5 px-2.5">No HP &amp; WA</th>
                    <th className="py-2.5 px-2.5">Hub Penempatan</th>
                    <th className="py-2.5 px-2.5 text-right">
                      Total Hari Masuk
                    </th>
                    <th className="py-2.5 px-2.5 text-right">Hadir</th>
                    <th className="py-2.5 px-2.5 text-right">Backup</th>
                    <th className="py-2.5 px-2.5 text-right">Batal</th>
                    <th className="py-2.5 px-2.5 text-right">Total Shift</th>
                    <th className="py-2.5 pl-2.5 pr-4 text-right">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {personRows.map((row, idx) => {
                    const waUrl = buildWhatsAppUrl(row.noHp);
                    const isExpanded = Boolean(expandedPersonKeys[row.key]);
                    return (
                      <Fragment key={row.key}>
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 pl-4 pr-2 font-mono text-slate-400 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <div className="font-semibold text-slate-900">
                              {row.namaLengkap}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                              NIK: {row.nik}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span
                              className={`inline-block rounded-[3px] px-2 py-0.5 text-[11px] font-semibold ${
                                row.posisi === 'Kurir'
                                  ? 'bg-[#6E2B8B]/10 text-[#6E2B8B]'
                                  : 'bg-sky-50 text-sky-700'
                              }`}
                            >
                              {row.posisi}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-700 tabular-nums">
                                {row.noHp}
                              </span>
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Chat WhatsApp ${row.namaLengkap}`}
                                  className="inline-flex items-center gap-1 rounded-[3px] border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                                >
                                  <MessageCircle className="h-3 w-3 text-emerald-600" />
                                  <span>WA</span>
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-600">
                            {row.penempatanList.join(', ')}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-[#6E2B8B] tabular-nums whitespace-nowrap">
                            {row.uniqueDaysCount} hari
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                            {row.hadirDaysCount}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-sky-700 tabular-nums">
                            {row.backupDaysCount}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-red-600 tabular-nums">
                            {row.batalCount}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                            {row.totalMasuk} shift
                          </td>
                          <td className="py-2.5 pl-2.5 pr-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => togglePersonDetail(row.key)}
                              aria-expanded={isExpanded}
                              aria-label={`Detail hari masuk ${row.namaLengkap}`}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <span>Detail</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={11} className="px-6 py-3">
                              <div className="text-[11px] font-semibold text-slate-600 mb-2">
                                Rincian Tanggal Masuk — {row.namaLengkap} (
                                {row.uniqueDaysCount} hari aktif /{' '}
                                {row.details.length} catatan shift)
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {row.details.map((d, dIdx) => (
                                  <div
                                    key={`${row.key}-${d.tanggal}-${d.shift}-${dIdx}`}
                                    className="rounded border border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-2 text-[11px]"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-mono font-semibold text-slate-800 tabular-nums">
                                        {d.tanggal} · {d.shift}
                                        {d.jam ? ` (${d.jam})` : ''}
                                      </div>
                                      <div className="text-slate-500 truncate">
                                        {d.penempatan}
                                      </div>
                                    </div>
                                    <span
                                      className={`shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold ${
                                        d.status === 'Hadir'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : d.status === 'Backup'
                                            ? 'bg-sky-50 text-sky-700'
                                            : 'bg-red-50 text-red-700'
                                      }`}
                                    >
                                      {d.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

