import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronsLeft,
  ChevronsRight,
  Download,
  Menu,
  Plus,
} from 'lucide-react';
import { AnterajaPortalView } from './components/AnterajaPortalView';
import { AttendanceRecapView } from './components/AttendanceRecapView';
import { AttendanceShiftView } from './components/AttendanceShiftView';
import { KpiSummaryStrip } from './components/KpiSummaryStrip';
import {
  BankVerificationView,
  HubDistributionView,
} from './components/OperationalViews';
import { PlacementTrendChart } from './components/PlacementTrendChart';
import { Sidebar, type ActiveNavView } from './components/Sidebar';
import { TalentDetailDrawer } from './components/TalentDetailDrawer';
import { TalentFilterBar } from './components/TalentFilterBar';
import { TalentFormModal } from './components/TalentFormModal';
import { TalentTable } from './components/TalentTable';
import {
  BASE_DAILY_PLACEMENT_METRICS,
  INITIAL_ATTENDANCE_SESSIONS,
  INITIAL_TALENTS,
  SEED_TALENT_IDS,
} from './data/seedData';
import type {
  DailyPlacementMetric,
  ShiftAttendanceFormInput,
  ShiftAttendanceSession,
  TalentFilters,
  TalentFormInput,
  TalentRecord,
} from './types/talent';
import {
  computeDailyPlacementTrend,
  computeTalentStats,
  extractUniquePlacements,
  filterTalents,
  generateCsvContent,
  generateShiftAttendanceCsv,
} from './utils/talentLogic';

const DEFAULT_FILTERS: TalentFilters = {
  search: '',
  status: 'Semua',
  posisi: 'Semua',
  penempatan: 'Semua',
};

export default function App() {
  const [talents, setTalents] = useState<TalentRecord[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<
    ShiftAttendanceSession[]
  >([]);
  const [baseMetrics, setBaseMetrics] = useState<DailyPlacementMetric[]>(
    BASE_DAILY_PLACEMENT_METRICS,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<ActiveNavView>('overview');
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [filters, setFilters] = useState<TalentFilters>(DEFAULT_FILTERS);
  const [timeframe, setTimeframe] = useState<7 | 14 | 30>(14);
  const [showFullSensitive, setShowFullSensitive] = useState(true);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<TalentRecord | null>(
    null,
  );
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTalent, setEditingTalent] = useState<TalentRecord | null>(null);

  const tableSectionRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [talentRes, attRes] = await Promise.all([
        fetch('/api/talents'),
        fetch('/api/attendance'),
      ]);

      if (!talentRes.ok) {
        throw new Error('Gagal memuat data talent dari server.');
      }

      const talentData = (await talentRes.json()) as {
        talents: TalentRecord[];
        dailyMetrics?: DailyPlacementMetric[];
      };
      setTalents(talentData.talents);
      if (talentData.dailyMetrics && talentData.dailyMetrics.length > 0) {
        setBaseMetrics(talentData.dailyMetrics);
      }

      if (attRes.ok) {
        const attData = (await attRes.json()) as {
          sessions: ShiftAttendanceSession[];
        };
        setAttendanceSessions(attData.sessions);
      } else {
        setAttendanceSessions(INITIAL_ATTENDANCE_SESSIONS);
      }
    } catch {
      setTalents(INITIAL_TALENTS);
      setAttendanceSessions(INITIAL_ATTENDANCE_SESSIONS);
      setLoadError(
        'Koneksi server terganggu; menampilkan salinan data operasional terakhir.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stats = useMemo(() => computeTalentStats(talents), [talents]);

  const hubOptions = useMemo(
    () => extractUniquePlacements(talents),
    [talents],
  );

  const filteredTalents = useMemo(
    () => filterTalents(talents, filters),
    [talents, filters],
  );

  const chartMetrics = useMemo(
    () =>
      computeDailyPlacementTrend(
        talents,
        baseMetrics,
        timeframe,
        SEED_TALENT_IDS,
      ),
    [talents, baseMetrics, timeframe],
  );

  const showToastBanner = (msg: string) => {
    setBannerMessage(msg);
    window.setTimeout(() => {
      setBannerMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleToggleStatus = async (talent: TalentRecord) => {
    const nextStatus = talent.status === 'Aktif' ? 'Non-Aktif' : 'Aktif';
    setTogglingId(talent.id);

    // Optimistic update for real-time responsiveness
    const previousTalents = talents;
    const optimistic: TalentRecord = {
      ...talent,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    setTalents((prev) =>
      prev.map((item) => (item.id === talent.id ? optimistic : item)),
    );
    if (selectedTalent?.id === talent.id) {
      setSelectedTalent(optimistic);
    }

    try {
      const response = await fetch(`/api/talents/${talent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error('Gagal mengubah status.');
      }

      const saved = (await response.json()) as TalentRecord;
      setTalents((prev) =>
        prev.map((item) => (item.id === saved.id ? saved : item)),
      );
      if (selectedTalent?.id === saved.id) {
        setSelectedTalent(saved);
      }
      showToastBanner(
        `Status ${saved.namaLengkap} diperbarui menjadi ${saved.status}.`,
      );
    } catch {
      setTalents(previousTalents);
      if (selectedTalent?.id === talent.id) {
        setSelectedTalent(talent);
      }
      setLoadError('Gagal memperbarui status talent ke database.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmitForm = async (
    payload: TalentFormInput,
    editingId?: string,
  ) => {
    const isEdit = Boolean(editingId);
    const url = isEdit ? `/api/talents/${editingId}` : '/api/talents';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as TalentRecord & {
        message?: string;
        errors?: Partial<Record<keyof TalentFormInput, string>>;
      };

      if (!response.ok) {
        return {
          ok: false,
          errors: body.errors,
          message: body.message || 'Gagal menyimpan data talent.',
        };
      }

      if (isEdit) {
        setTalents((prev) =>
          prev.map((item) => (item.id === body.id ? body : item)),
        );
        if (selectedTalent?.id === body.id) {
          setSelectedTalent(body);
        }
        showToastBanner(`Data ${body.namaLengkap} berhasil diperbarui.`);
      } else {
        setTalents((prev) => [body, ...prev]);
        showToastBanner(
          `${body.namaLengkap} (${body.posisi}) berhasil ditambahkan ke database.`,
        );
      }

      setFormModalOpen(false);
      setEditingTalent(null);
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: 'Tidak dapat menghubungi server. Periksa koneksi Anda.',
      };
    }
  };

  const handleDeleteTalent = async (id: string) => {
    try {
      const response = await fetch(`/api/talents/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Gagal menghapus data.');
      }
      const deletedName =
        talents.find((t) => t.id === id)?.namaLengkap ?? 'Talent';
      setTalents((prev) => prev.filter((item) => item.id !== id));
      setSelectedTalent(null);
      showToastBanner(`Data ${deletedName} telah dihapus dari database.`);
    } catch {
      setLoadError('Gagal menghapus data talent.');
    }
  };

  const handleExportCsv = () => {
    const csv = generateCsvContent(filteredTalents);
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'database-kurir-dw-antaraja.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToastBanner(
      `Berhasil mengekspor ${filteredTalents.length} data ke CSV.`,
    );
  };

  const handleCreateAttendanceSession = async (
    payload: ShiftAttendanceFormInput,
  ): Promise<{ ok: boolean; message?: string }> => {
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ShiftAttendanceSession & {
        message?: string;
      };
      if (!response.ok) {
        return {
          ok: false,
          message: body.message || 'Gagal membuat sesi absensi.',
        };
      }
      setAttendanceSessions((prev) => [body, ...prev]);
      showToastBanner(
        `Sesi ${body.shift} (${body.penempatan}) berhasil dibuat.`,
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: 'Tidak dapat menghubungi server.',
      };
    }
  };

  const handleUpdateAttendanceSession = async (
    id: string,
    patch: Partial<ShiftAttendanceSession>,
  ): Promise<{ ok: boolean; message?: string }> => {
    const previous = attendanceSessions;
    setAttendanceSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
      ),
    );
    try {
      const response = await fetch(`/api/attendance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        let message = 'Gagal menyimpan perubahan absensi shift ke server.';
        try {
          const errBody = (await response.json()) as { message?: string };
          if (errBody?.message) {
            message = errBody.message;
          }
        } catch {
          // ignore invalid json
        }
        setAttendanceSessions(previous);
        return { ok: false, message };
      }
      const saved = (await response.json()) as ShiftAttendanceSession;
      setAttendanceSessions((prev) =>
        prev.map((s) => (s.id === saved.id ? saved : s)),
      );
      return { ok: true };
    } catch {
      setAttendanceSessions(previous);
      const message = 'Gagal menyimpan perubahan absensi shift ke server.';
      setLoadError(message);
      return { ok: false, message };
    }
  };

  const handleDeleteAttendanceSession = async (id: string) => {
    try {
      const response = await fetch(`/api/attendance/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Gagal menghapus sesi absensi.');
      }
      setAttendanceSessions((prev) => prev.filter((s) => s.id !== id));
      showToastBanner('Sesi absensi shift berhasil dihapus.');
    } catch {
      setLoadError('Gagal menghapus sesi absensi.');
    }
  };

  const handleExportAttendanceCsv = (
    filteredSessions: ShiftAttendanceSession[],
    posisiLabel: string,
  ) => {
    const csv = generateShiftAttendanceCsv(filteredSessions);
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `absensi-shift-${posisiLabel.toLowerCase()}-antaraja.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToastBanner(
      `Berhasil mengekspor ${filteredSessions.length} sesi absensi ${posisiLabel} ke CSV.`,
    );
  };

  const handleInspectHub = (hubName: string) => {
    setFilters({ ...DEFAULT_FILTERS, penempatan: hubName });
    setActiveView('overview');
    window.setTimeout(() => {
      tableSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const openAddModal = () => {
    setEditingTalent(null);
    setFormModalOpen(true);
  };

  const openEditModal = (talent: TalentRecord) => {
    setEditingTalent(talent);
    setFormModalOpen(true);
  };

  return (
    <div className="min-h-screen flex bg-[#F4F6F9] text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        stats={stats}
        desktopOpen={desktopSidebarOpen}
        onCloseDesktop={() => setDesktopSidebarOpen(false)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Buka atau tutup menu navigasi"
                className="lg:hidden rounded border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
              >
                <Menu className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDesktopSidebarOpen((prev) => !prev)}
                aria-label={
                  desktopSidebarOpen ? 'Tutup sidebar menu' : 'Buka sidebar menu'
                }
                aria-expanded={desktopSidebarOpen}
                title={
                  desktopSidebarOpen
                    ? 'Perkecil Sidebar (Mode Ikon)'
                    : 'Buka Sidebar Penuh'
                }
                className="hidden lg:inline-flex items-center justify-center rounded border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
              >
                {desktopSidebarOpen ? (
                  <ChevronsLeft className="h-4 w-4" />
                ) : (
                  <ChevronsRight className="h-4 w-4 text-[#6E2B8B]" />
                )}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                  <span>PT Artha Kreasi Utama</span>
                  <span aria-hidden="true">/</span>
                  <span className="font-semibold text-[#6E2B8B]">ANTARAJA</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                  {activeView === 'overview' &&
                    'Dashboard Database Kurir & DW'}
                  {activeView === 'attendance-kurir' &&
                    'Absensi Per Shift — Kurir'}
                  {activeView === 'attendance-dw' &&
                    'Absensi Per Shift — DW (Daily Worker)'}
                  {activeView === 'attendance-recap' &&
                    'Rekap Absensi Kurir & DW'}
                  {activeView === 'dw-portal' &&
                    'Portal DW ANTARAJA (HUBCODE: STR)'}
                  {activeView === 'dw-vendor' &&
                    'Portal Vendor DW ANTARAJA'}
                  {activeView === 'hubs' && 'Sebaran Penempatan Hub ANTARAJA'}
                  {activeView === 'payroll' &&
                    'Verifikasi Data Bank & Rekening'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 rounded bg-[#6E2B8B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#5B2174] whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Talent</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 px-4 sm:px-6 py-5">
          <div className="max-w-[1400px] mx-auto space-y-5">
            {loadError && (
              <div
                role="alert"
                className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-between gap-2"
              >
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={() => setLoadError(null)}
                  className="font-semibold hover:underline"
                >
                  Tutup
                </button>
              </div>
            )}

            {bannerMessage && (
              <div
                role="status"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 flex items-center justify-between gap-2"
              >
                <span>{bannerMessage}</span>
                <button
                  type="button"
                  onClick={() => setBannerMessage(null)}
                  className="font-semibold hover:underline"
                >
                  Tutup
                </button>
              </div>
            )}

            {activeView === 'overview' && (
              <>
                <KpiSummaryStrip
                  stats={stats}
                  activeStatusFilter={filters.status}
                  onQuickFilterStatus={(status) =>
                    setFilters((prev) => ({ ...prev, status }))
                  }
                  onQuickFilterPosisi={(posisi) =>
                    setFilters((prev) => ({ ...prev, posisi }))
                  }
                />

                <PlacementTrendChart
                  metrics={chartMetrics}
                  timeframe={timeframe}
                  onChangeTimeframe={setTimeframe}
                />

                <div ref={tableSectionRef} className="space-y-3">
                  <TalentFilterBar
                    filters={filters}
                    stats={stats}
                    hubOptions={hubOptions}
                    filteredCount={filteredTalents.length}
                    showFullSensitive={showFullSensitive}
                    onToggleSensitive={() =>
                      setShowFullSensitive((prev) => !prev)
                    }
                    onChangeFilters={setFilters}
                    onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                  />

                  <TalentTable
                    talents={filteredTalents}
                    loading={loading}
                    showFullSensitive={showFullSensitive}
                    togglingId={togglingId}
                    onToggleStatus={handleToggleStatus}
                    onSelectDetail={setSelectedTalent}
                    onEditTalent={openEditModal}
                    onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                    onAddNew={openAddModal}
                  />
                </div>
              </>
            )}

            {activeView === 'attendance-kurir' && (
              <AttendanceShiftView
                posisi="Kurir"
                sessions={attendanceSessions}
                talents={talents}
                loading={loading}
                onCreateSession={handleCreateAttendanceSession}
                onUpdateSession={handleUpdateAttendanceSession}
                onDeleteSession={handleDeleteAttendanceSession}
                onExportCsv={(filtered) =>
                  handleExportAttendanceCsv(filtered, 'Kurir')
                }
              />
            )}

            {activeView === 'attendance-dw' && (
              <AttendanceShiftView
                posisi="DW"
                sessions={attendanceSessions}
                talents={talents}
                loading={loading}
                onCreateSession={handleCreateAttendanceSession}
                onUpdateSession={handleUpdateAttendanceSession}
                onDeleteSession={handleDeleteAttendanceSession}
                onExportCsv={(filtered) =>
                  handleExportAttendanceCsv(filtered, 'DW')
                }
              />
            )}

            {activeView === 'attendance-recap' && (
              <AttendanceRecapView
                sessions={attendanceSessions}
                loading={loading}
                onShowToast={showToastBanner}
              />
            )}

            {activeView === 'dw-portal' && <AnterajaPortalView mode="hub" />}

            {activeView === 'dw-vendor' && (
              <AnterajaPortalView mode="vendor" />
            )}

            {activeView === 'hubs' && (
              <HubDistributionView
                talents={talents}
                onInspectHub={handleInspectHub}
              />
            )}

            {activeView === 'payroll' && (
              <BankVerificationView
                talents={talents}
                onEditTalent={openEditModal}
              />
            )}
          </div>
        </main>

        {/* Application Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 py-3">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-slate-500">
            <p className="font-medium text-slate-600">
              © 2026 Developed by PT Iskandar Pratama Teknologi
            </p>
            <span className="text-[11px] text-slate-400">
              AKU ANTAR · PT Artha Kreasi Utama
            </span>
          </div>
        </footer>
      </div>

      <TalentDetailDrawer
        talent={selectedTalent}
        onClose={() => setSelectedTalent(null)}
        onEdit={(talent) => {
          setSelectedTalent(null);
          openEditModal(talent);
        }}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDeleteTalent}
      />

      <TalentFormModal
        isOpen={formModalOpen}
        editingTalent={editingTalent}
        onClose={() => {
          setFormModalOpen(false);
          setEditingTalent(null);
        }}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
}
