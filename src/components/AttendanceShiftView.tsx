import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { ANTARAJA_HUBS, SHIFT_OPTIONS } from '../data/seedData';
import type {
  AttendancePersonStatus,
  ShiftAttendanceFormInput,
  ShiftAttendanceSession,
  TalentPosition,
  TalentRecord,
} from '../types/talent';
import {
  buildAttendeeFromTalent,
  buildWhatsAppUrl,
  computeAttendanceSummary,
  computeShiftActual,
  findActiveAttendanceConflict,
  formatShiftTimeRange,
  matchesShiftFilter,
  validateSessionAttendanceConflicts,
} from '../utils/talentLogic';

interface AttendanceShiftViewProps {
  posisi: TalentPosition;
  sessions: ShiftAttendanceSession[];
  talents: TalentRecord[];
  loading: boolean;
  onCreateSession: (
    payload: ShiftAttendanceFormInput,
  ) => Promise<{ ok: boolean; message?: string }>;
  onUpdateSession: (
    id: string,
    patch: Partial<ShiftAttendanceSession>,
  ) => Promise<{ ok: boolean; message?: string }>;
  onDeleteSession: (id: string) => Promise<void>;
  onExportCsv: (filteredSessions: ShiftAttendanceSession[]) => void;
}

export function AttendanceShiftView({
  posisi,
  sessions,
  talents,
  loading,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onExportCsv,
}: AttendanceShiftViewProps) {
  const [dateFilter, setDateFilter] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<string>('Semua');
  const [hubFilter, setHubFilter] = useState<string>('Semua');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create Shift Session Form state (Tanggal & Jam input mandiri)
  const [newTanggal, setNewTanggal] = useState('');
  const [newShift, setNewShift] = useState(SHIFT_OPTIONS[0]);
  const [newJamMulai, setNewJamMulai] = useState('');
  const [newJamSelesai, setNewJamSelesai] = useState('');
  const [newPenempatan, setNewPenempatan] = useState(ANTARAJA_HUBS[0]);
  const [newRequestMp, setNewRequestMp] = useState('4');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Inline schedule edit state per session
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null,
  );
  const [editTanggal, setEditTanggal] = useState('');
  const [editShift, setEditShift] = useState(SHIFT_OPTIONS[0]);
  const [editJamMulai, setEditJamMulai] = useState('');
  const [editJamSelesai, setEditJamSelesai] = useState('');

  // Per-session auto-fill search query, conflict alerts, and delete confirmation
  const [queryBySession, setQueryBySession] = useState<Record<string, string>>(
    {},
  );
  const [sessionErrorById, setSessionErrorById] = useState<
    Record<string, string | null>
  >({});
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const positionSessions = useMemo(
    () => sessions.filter((s) => s.posisi === posisi),
    [sessions, posisi],
  );

  const filteredSessions = useMemo(() => {
    return positionSessions.filter((s) => {
      if (dateFilter && s.tanggal !== dateFilter) return false;
      if (!matchesShiftFilter(s.shift, shiftFilter)) return false;
      if (hubFilter !== 'Semua' && s.penempatan !== hubFilter) return false;
      return true;
    });
  }, [positionSessions, dateFilter, shiftFilter, hubFilter]);

  const summary = useMemo(
    () => computeAttendanceSummary(filteredSessions),
    [filteredSessions],
  );

  const availableHubs = useMemo(() => {
    const set = new Set<string>(ANTARAJA_HUBS);
    for (const s of positionSessions) {
      if (s.penempatan) set.add(s.penempatan);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [positionSessions]);

  const positionTalents = useMemo(() => {
    return talents
      .filter((t) => t.posisi === posisi)
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'Aktif' ? -1 : 1;
        }
        return a.namaLengkap.localeCompare(b.namaLengkap, 'id');
      });
  }, [talents, posisi]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const reqNum = Number(newRequestMp);
    if (
      !newTanggal.trim() ||
      !newShift.trim() ||
      !newJamMulai.trim() ||
      !newJamSelesai.trim() ||
      !newPenempatan.trim()
    ) {
      setCreateError(
        'Tanggal, Shift, Jam Mulai, Jam Selesai, dan Penempatan Hub wajib diisi.',
      );
      return;
    }
    if (!Number.isFinite(reqNum) || reqNum < 1) {
      setCreateError('Request MP minimal 1 personel.');
      return;
    }

    setCreating(true);
    try {
      const res = await onCreateSession({
        posisi,
        tanggal: newTanggal.trim(),
        shift: newShift.trim(),
        jamMulai: newJamMulai.trim(),
        jamSelesai: newJamSelesai.trim(),
        penempatan: newPenempatan.trim(),
        requestMp: Math.round(reqNum),
      });
      if (!res.ok) {
        setCreateError(res.message || 'Gagal membuat sesi shift.');
        return;
      }
      setNewTanggal('');
      setNewJamMulai('');
      setNewJamSelesai('');
      setShowCreateForm(false);
    } finally {
      setCreating(false);
    }
  };

  const openScheduleEditor = (session: ShiftAttendanceSession) => {
    const matchedOption =
      SHIFT_OPTIONS.find((opt) => matchesShiftFilter(session.shift, opt)) ??
      SHIFT_OPTIONS[0];
    setEditingScheduleId(session.id);
    setEditTanggal(session.tanggal);
    setEditShift(matchedOption);
    setEditJamMulai(session.jamMulai ?? '');
    setEditJamSelesai(session.jamSelesai ?? '');
  };

  const setSessionError = (sessionId: string, msg: string | null) => {
    setSessionErrorById((prev) => ({ ...prev, [sessionId]: msg }));
  };

  const handleSaveScheduleEdit = async (session: ShiftAttendanceSession) => {
    if (
      !editTanggal.trim() ||
      !editShift.trim() ||
      !editJamMulai.trim() ||
      !editJamSelesai.trim()
    ) {
      return;
    }
    const patch = {
      tanggal: editTanggal.trim(),
      shift: editShift.trim(),
      jamMulai: editJamMulai.trim(),
      jamSelesai: editJamSelesai.trim(),
    };
    const conflictCheck = validateSessionAttendanceConflicts(sessions, {
      ...session,
      ...patch,
    });
    if (!conflictCheck.valid) {
      setSessionError(
        session.id,
        conflictCheck.message ||
          'Perubahan jadwal menyebabkan double absen pada tanggal tersebut.',
      );
      return;
    }

    const res = await onUpdateSession(session.id, patch);
    if (!res.ok) {
      setSessionError(
        session.id,
        res.message || 'Gagal memperbarui jadwal sesi shift.',
      );
      return;
    }
    setSessionError(session.id, null);
    setEditingScheduleId(null);
  };

  const handleAddAttendee = async (
    session: ShiftAttendanceSession,
    talent: TalentRecord,
  ) => {
    if (session.attendees.some((a) => a.talentId === talent.id)) {
      return;
    }
    const conflict = findActiveAttendanceConflict(
      sessions,
      session.tanggal,
      session.id,
      talent.id,
      talent.nik,
    );
    if (conflict) {
      setSessionError(
        session.id,
        `Double absen ditolak: ${talent.namaLengkap} sudah berstatus ${conflict.attendee.status} di ${conflict.session.shift} (${conflict.session.penempatan}) pada tanggal ${session.tanggal}.`,
      );
      return;
    }

    const newAttendee = buildAttendeeFromTalent(talent, 'Hadir');
    const nextAttendees = [...session.attendees, newAttendee];
    setQueryBySession((prev) => ({ ...prev, [session.id]: '' }));
    setFocusedSessionId(null);
    const res = await onUpdateSession(session.id, { attendees: nextAttendees });
    if (!res.ok) {
      setSessionError(
        session.id,
        res.message || 'Gagal menambahkan personel ke sesi shift.',
      );
      return;
    }
    setSessionError(session.id, null);
  };

  const handleUpdateAttendeeStatus = async (
    session: ShiftAttendanceSession,
    attendeeId: string,
    status: AttendancePersonStatus,
  ) => {
    const targetPerson = session.attendees.find((a) => a.id === attendeeId);
    if (targetPerson && status !== 'Batal') {
      const conflict = findActiveAttendanceConflict(
        sessions,
        session.tanggal,
        session.id,
        targetPerson.talentId,
        targetPerson.nik,
      );
      if (conflict) {
        setSessionError(
          session.id,
          `Tidak dapat mengubah status menjadi ${status}: ${targetPerson.namaLengkap} sudah aktif (${conflict.attendee.status}) di ${conflict.session.shift} (${conflict.session.penempatan}) pada ${session.tanggal}.`,
        );
        return;
      }
    }

    const nextAttendees = session.attendees.map((a) =>
      a.id === attendeeId ? { ...a, status } : a,
    );
    const res = await onUpdateSession(session.id, { attendees: nextAttendees });
    if (!res.ok) {
      setSessionError(
        session.id,
        res.message || 'Gagal memperbarui status kehadiran.',
      );
      return;
    }
    setSessionError(session.id, null);
  };

  const handleRemoveAttendee = async (
    session: ShiftAttendanceSession,
    attendeeId: string,
  ) => {
    const nextAttendees = session.attendees.filter((a) => a.id !== attendeeId);
    const res = await onUpdateSession(session.id, { attendees: nextAttendees });
    if (!res.ok) {
      setSessionError(
        session.id,
        res.message || 'Gagal menghapus personel dari shift.',
      );
      return;
    }
    setSessionError(session.id, null);
  };

  const handleUpdateRequestMp = async (
    session: ShiftAttendanceSession,
    nextVal: number,
  ) => {
    const clamped = Math.max(1, Math.round(nextVal));
    if (clamped === session.requestMp) return;
    await onUpdateSession(session.id, { requestMp: clamped });
  };

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip */}
      <section
        aria-label={`Ringkasan Absensi ${posisi}`}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Total Sesi Shift ({posisi})
            </span>
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              data-testid="attendance-total-sessions"
              className="text-2xl font-bold font-mono text-slate-900 tabular-nums"
            >
              {summary.totalSessions}
            </span>
            <span className="text-xs text-slate-500">Sesi Terjadwal</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Total Request MP
            </span>
            <Users className="h-4 w-4 text-[#6E2B8B] shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              data-testid="attendance-total-request"
              className="text-2xl font-bold font-mono text-slate-900 tabular-nums"
            >
              {summary.totalRequestMp}
            </span>
            <span className="text-xs text-slate-500">Kebutuhan Klien</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Total Actual Hadir
            </span>
            <UserPlus className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              data-testid="attendance-total-actual"
              className="text-2xl font-bold font-mono text-emerald-700 tabular-nums"
            >
              {summary.totalActual}
            </span>
            <span className="text-xs text-slate-500">Personel Terealisasi</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Selisih & Pemenuhan
            </span>
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              data-testid="attendance-gap"
              className={`text-2xl font-bold font-mono tabular-nums ${
                summary.gap >= 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {summary.gap > 0 ? `+${summary.gap}` : summary.gap}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
              {summary.fulfillmentRate}% Terpenuhi
            </span>
          </div>
        </div>
      </section>

      {/* Filter & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="att-filter-date"
              className="text-xs font-medium text-slate-600"
            >
              Tanggal:
            </label>
            <input
              id="att-filter-date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-[#6E2B8B] focus:outline-none"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-xs font-medium text-[#6E2B8B] hover:underline px-1"
              >
                Semua Tanggal
              </button>
            )}
          </div>

          <select
            aria-label="Filter shift absensi"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-[#6E2B8B] focus:outline-none"
          >
            <option value="Semua">Semua Shift</option>
            {SHIFT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter penempatan Hub absensi"
            value={hubFilter}
            onChange={(e) => setHubFilter(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-[#6E2B8B] focus:outline-none"
          >
            <option value="Semua">Semua Penempatan Hub</option>
            {availableHubs.map((hub) => (
              <option key={hub} value={hub}>
                {hub}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onExportCsv(filteredSessions)}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV Absensi</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded bg-[#6E2B8B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#5B2174] whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Buat Sesi Shift {posisi}</span>
          </button>
        </div>
      </div>

      {/* Create Shift Session Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white border border-[#6E2B8B]/40 rounded-md p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Buat Sesi Absensi Shift {posisi}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih Shift (1–3), isi tanggal &amp; jam secara mandiri, dan
                tentukan jumlah Request MP.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Tutup
            </button>
          </div>

          {createError && (
            <div
              role="alert"
              className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
            <div>
              <label
                htmlFor="shift-ke"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Shift *
              </label>
              <select
                id="shift-ke"
                value={newShift}
                onChange={(e) => setNewShift(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
              >
                {SHIFT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="shift-tanggal"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Tanggal *
              </label>
              <input
                id="shift-tanggal"
                type="date"
                value={newTanggal}
                onChange={(e) => setNewTanggal(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="shift-jam-mulai"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Jam Mulai *
              </label>
              <input
                id="shift-jam-mulai"
                type="time"
                value={newJamMulai}
                onChange={(e) => setNewJamMulai(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="shift-jam-selesai"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Jam Selesai *
              </label>
              <input
                id="shift-jam-selesai"
                type="time"
                value={newJamSelesai}
                onChange={(e) => setNewJamSelesai(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="shift-hub"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Penempatan Hub *
              </label>
              <input
                id="shift-hub"
                type="text"
                list="att-hub-options-list"
                value={newPenempatan}
                onChange={(e) => setNewPenempatan(e.target.value)}
                placeholder="Pilih Hub ANTARAJA"
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
              />
              <datalist id="att-hub-options-list">
                {availableHubs.map((hub) => (
                  <option key={hub} value={hub} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="shift-request-mp"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Request MP *
              </label>
              <input
                id="shift-request-mp"
                type="number"
                min={1}
                value={newRequestMp}
                onChange={(e) => setNewRequestMp(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded bg-[#6E2B8B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B2174] disabled:opacity-60"
            >
              {creating ? 'Menyimpan...' : 'Simpan Sesi Shift'}
            </button>
          </div>
        </form>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
          <div className="h-10 rounded bg-slate-100 animate-pulse" />
          <div className="h-24 rounded bg-slate-100 animate-pulse" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            Belum ada sesi absensi shift untuk {posisi}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Klik tombol &ldquo;Buat Sesi Shift {posisi}&rdquo; untuk mencatat
            Shift, Tanggal, Jam, Request MP, dan nama personel.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const actual = computeShiftActual(session.attendees);
            const gap = actual - session.requestMp;
            const rate =
              session.requestMp > 0
                ? Math.round((actual / session.requestMp) * 100)
                : 0;
            const timeRange = formatShiftTimeRange(
              session.jamMulai,
              session.jamSelesai,
            );
            const isEditingSchedule = editingScheduleId === session.id;

            const query = queryBySession[session.id] ?? '';
            const normalizedQuery = query.trim().toLowerCase();
            const existingIds = new Set(
              session.attendees.map((a) => a.talentId),
            );

            const suggestions = positionTalents
              .filter((t) => {
                if (existingIds.has(t.id)) return false;
                if (!normalizedQuery) return true;
                return (
                  t.namaLengkap.toLowerCase().includes(normalizedQuery) ||
                  t.nik.includes(normalizedQuery) ||
                  t.penempatan.toLowerCase().includes(normalizedQuery) ||
                  t.noHp.includes(normalizedQuery)
                );
              })
              .slice(0, 6);

            const showDropdown =
              focusedSessionId === session.id && suggestions.length > 0;

            return (
              <article
                key={session.id}
                data-testid={`attendance-session-${session.id}`}
                className="bg-white border border-slate-200 rounded-md"
              >
                {/* Session Header */}
                <div className="p-4 flex flex-col gap-3 border-b border-slate-100">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-block rounded-[3px] bg-[#6E2B8B]/10 px-2 py-0.5 text-xs font-bold text-[#6E2B8B]">
                        {session.shift}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-slate-600 tabular-nums">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{session.tanggal}</span>
                      </span>
                      {timeRange && (
                        <span className="inline-flex items-center gap-1 rounded-[3px] border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-medium text-slate-700 tabular-nums">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{timeRange}</span>
                        </span>
                      )}
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {session.penempatan}
                      </h3>
                    </div>

                    {/* Request MP vs Actual Strip */}
                    <div className="flex flex-wrap items-center gap-3.5 text-xs tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor={`req-mp-${session.id}`}
                          className="text-slate-500 font-medium"
                        >
                          Request MP:
                        </label>
                        <input
                          id={`req-mp-${session.id}`}
                          type="number"
                          min={1}
                          defaultValue={session.requestMp}
                          onBlur={(e) =>
                            handleUpdateRequestMp(
                              session,
                              Number(e.target.value),
                            )
                          }
                          className="w-14 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono font-bold text-slate-900 focus:border-[#6E2B8B] focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">
                          Actual:
                        </span>
                        <span
                          data-testid={`session-actual-${session.id}`}
                          className="font-mono font-bold text-emerald-700 text-sm"
                        >
                          {actual}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">
                          Selisih:
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            gap >= 0 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {gap > 0 ? `+${gap}` : gap}
                        </span>
                      </div>

                      <span
                        className={`font-mono font-semibold ${
                          rate >= 100 ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {rate}%
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          isEditingSchedule
                            ? setEditingScheduleId(null)
                            : openScheduleEditor(session)
                        }
                        aria-label={`Ubah jadwal ${session.shift} ${session.penempatan}`}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Ubah Jadwal</span>
                      </button>

                      {confirmDeleteId === session.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteSession(session.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(session.id)}
                          aria-label={`Hapus sesi ${session.shift} ${session.penempatan}`}
                          className="rounded border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Schedule Editor (Shift dropdown + Tanggal + Jam input mandiri) */}
                  {isEditingSchedule && (
                    <div className="rounded border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-end gap-3">
                      <div>
                        <label
                          htmlFor={`edit-shift-${session.id}`}
                          className="block text-[11px] font-medium text-slate-600 mb-1"
                        >
                          Shift
                        </label>
                        <select
                          id={`edit-shift-${session.id}`}
                          value={editShift}
                          onChange={(e) => setEditShift(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                        >
                          {SHIFT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={`edit-tanggal-${session.id}`}
                          className="block text-[11px] font-medium text-slate-600 mb-1"
                        >
                          Tanggal
                        </label>
                        <input
                          id={`edit-tanggal-${session.id}`}
                          type="date"
                          value={editTanggal}
                          onChange={(e) => setEditTanggal(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`edit-jam-mulai-${session.id}`}
                          className="block text-[11px] font-medium text-slate-600 mb-1"
                        >
                          Jam Mulai
                        </label>
                        <input
                          id={`edit-jam-mulai-${session.id}`}
                          type="time"
                          value={editJamMulai}
                          onChange={(e) => setEditJamMulai(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`edit-jam-selesai-${session.id}`}
                          className="block text-[11px] font-medium text-slate-600 mb-1"
                        >
                          Jam Selesai
                        </label>
                        <input
                          id={`edit-jam-selesai-${session.id}`}
                          type="time"
                          value={editJamSelesai}
                          onChange={(e) => setEditJamSelesai(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setEditingScheduleId(null)}
                          className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveScheduleEdit(session)}
                          disabled={
                            !editTanggal.trim() ||
                            !editJamMulai.trim() ||
                            !editJamSelesai.trim()
                          }
                          className="rounded bg-[#6E2B8B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5B2174] disabled:opacity-50"
                        >
                          Simpan Jadwal
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline Anti-Double Absen / Session Alert */}
                {sessionErrorById[session.id] && (
                  <div
                    role="alert"
                    data-testid={`session-conflict-alert-${session.id}`}
                    className="mx-4 mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start justify-between gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{sessionErrorById[session.id]}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSessionError(session.id, null)}
                      className="text-xs font-semibold text-amber-800 hover:underline shrink-0"
                    >
                      Tutup
                    </button>
                  </div>
                )}

                {/* Auto-Fill Talent Input Bar */}
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100">
                  <div className="relative max-w-xl">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      aria-label={`Input nama ${posisi} auto-fill untuk ${session.shift} ${session.penempatan}`}
                      value={query}
                      onFocus={() => setFocusedSessionId(session.id)}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setFocusedSessionId((prev) =>
                            prev === session.id ? null : prev,
                          );
                        }, 180);
                      }}
                      onChange={(e) => {
                        setQueryBySession((prev) => ({
                          ...prev,
                          [session.id]: e.target.value,
                        }));
                        setFocusedSessionId(session.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && suggestions.length > 0) {
                          e.preventDefault();
                          const available = suggestions.find(
                            (talent) =>
                              !findActiveAttendanceConflict(
                                sessions,
                                session.tanggal,
                                session.id,
                                talent.id,
                                talent.nik,
                              ),
                          );
                          if (available) {
                            handleAddAttendee(session, available);
                          } else {
                            handleAddAttendee(session, suggestions[0]);
                          }
                        }
                      }}
                      placeholder={`Ketik nama atau NIK ${posisi} untuk auto-fill dari database...`}
                      className="w-full rounded border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#6E2B8B] focus:outline-none"
                    />

                    {showDropdown && (
                      <div
                        role="listbox"
                        aria-label={`Saran ${posisi} dari database`}
                        className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm"
                      >
                        {suggestions.map((talent) => {
                          const conflict = findActiveAttendanceConflict(
                            sessions,
                            session.tanggal,
                            session.id,
                            talent.id,
                            talent.nik,
                          );
                          return (
                            <button
                              key={talent.id}
                              type="button"
                              disabled={Boolean(conflict)}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (!conflict) {
                                  handleAddAttendee(session, talent);
                                }
                              }}
                              className={`w-full px-3 py-2 text-left flex items-center justify-between gap-3 text-xs ${
                                conflict
                                  ? 'bg-amber-50/70 cursor-not-allowed opacity-75'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate">
                                  {talent.namaLengkap}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500 font-mono tabular-nums truncate">
                                  NIK {talent.nik} · {talent.noHp} ·{' '}
                                  <span className="font-sans">
                                    {talent.penempatan}
                                  </span>
                                </div>
                                {conflict && (
                                  <div className="mt-0.5 text-[11px] font-medium text-amber-800 truncate">
                                    Sudah {conflict.attendee.status} di{' '}
                                    {conflict.session.shift} (
                                    {conflict.session.penempatan})
                                  </div>
                                )}
                              </div>
                              <span
                                className={`shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold ${
                                  conflict
                                    ? 'bg-amber-100 text-amber-800'
                                    : talent.status === 'Aktif'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {conflict ? 'Sudah Masuk' : talent.status}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Shift Roster Table */}
                {session.attendees.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500">
                    Belum ada nama {posisi} diinput pada shift ini. Gunakan
                    kolom pencarian di atas untuk memilih nama dari database.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                          <th className="py-2 pl-4 pr-2 w-10">#</th>
                          <th className="py-2 px-2.5">Nama Lengkap & NIK</th>
                          <th className="py-2 px-2.5">No HP & WhatsApp</th>
                          <th className="py-2 px-2.5">Asal Penempatan (DB)</th>
                          <th className="py-2 px-2.5">Rekening</th>
                          <th className="py-2 px-2.5">Status Kehadiran</th>
                          <th className="py-2 pl-2.5 pr-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {session.attendees.map((person, idx) => {
                          const waUrl = buildWhatsAppUrl(person.noHp);
                          return (
                            <tr
                              key={person.id}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="py-2.5 pl-4 pr-2 font-mono text-slate-400 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-2.5">
                                <div className="font-semibold text-slate-900">
                                  {person.namaLengkap}
                                </div>
                                <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                                  NIK: {person.nik}
                                </div>
                              </td>
                              <td className="py-2.5 px-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-slate-700 tabular-nums">
                                    {person.noHp}
                                  </span>
                                  {waUrl && (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={`Chat WhatsApp ${person.namaLengkap}`}
                                      className="inline-flex items-center gap-1 rounded-[3px] border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                                    >
                                      <MessageCircle className="h-3 w-3 text-emerald-600" />
                                      <span>WA</span>
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-2.5 text-slate-600">
                                {person.penempatanAsal}
                              </td>
                              <td className="py-2.5 px-2.5 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                                <span className="font-sans font-semibold text-slate-800">
                                  {person.jenisBank}
                                </span>{' '}
                                · {person.noRekening}
                              </td>
                              <td className="py-2.5 px-2.5">
                                <select
                                  aria-label={`Status kehadiran ${person.namaLengkap}`}
                                  value={person.status}
                                  onChange={(e) =>
                                    handleUpdateAttendeeStatus(
                                      session,
                                      person.id,
                                      e.target.value as AttendancePersonStatus,
                                    )
                                  }
                                  className={`rounded border px-2 py-1 text-[11px] font-semibold focus:outline-none ${
                                    person.status === 'Hadir'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                      : person.status === 'Backup'
                                        ? 'border-sky-200 bg-sky-50 text-sky-800'
                                        : 'border-red-200 bg-red-50 text-red-700'
                                  }`}
                                >
                                  <option value="Hadir">Hadir</option>
                                  <option value="Backup">Backup</option>
                                  <option value="Batal">Batal</option>
                                </select>
                              </td>
                              <td className="py-2.5 pl-2.5 pr-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveAttendee(session, person.id)
                                  }
                                  aria-label={`Hapus ${person.namaLengkap} dari shift`}
                                  className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
