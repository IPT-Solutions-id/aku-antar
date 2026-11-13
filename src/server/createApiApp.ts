import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BASE_DAILY_PLACEMENT_METRICS,
  INITIAL_ATTENDANCE_SESSIONS,
  INITIAL_TALENTS,
} from '../data/seedData.ts';
import type {
  DailyPlacementMetric,
  ShiftAttendanceFormInput,
  ShiftAttendanceSession,
  ShiftAttendee,
  TalentFormInput,
  TalentRecord,
} from '../types/talent.ts';
import {
  validateSessionAttendanceConflicts,
  validateTalentInput,
} from '../utils/talentLogic.ts';

export interface PersistedDatabase {
  talents: TalentRecord[];
  dailyMetrics: DailyPlacementMetric[];
  attendanceSessions: ShiftAttendanceSession[];
}

export function isServerlessRuntime(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    env.VERCEL ||
      env.VERCEL_ENV ||
      env.NOW_REGION ||
      env.AWS_LAMBDA_FUNCTION_NAME,
  );
}

export function resolveDatabasePaths(
  cwd: string = process.cwd(),
  env: Record<string, string | undefined> = process.env,
): { primaryPath: string; seedFallbackPath: string; mode: 'local-file' | 'tmp-serverless' } {
  const localPath = path.resolve(cwd, 'data', 'talent-pool.json');
  if (isServerlessRuntime(env)) {
    return {
      primaryPath: path.join(os.tmpdir(), 'aku-antar-data', 'talent-pool.json'),
      seedFallbackPath: localPath,
      mode: 'tmp-serverless',
    };
  }
  return {
    primaryPath: localPath,
    seedFallbackPath: localPath,
    mode: 'local-file',
  };
}

let memoryFallbackDb: PersistedDatabase | null = null;

function createSeedDatabase(): PersistedDatabase {
  return {
    talents: [...INITIAL_TALENTS],
    dailyMetrics: [...BASE_DAILY_PLACEMENT_METRICS],
    attendanceSessions: [...INITIAL_ATTENDANCE_SESSIONS],
  };
}

function normalizeParsedDatabase(
  parsed: Partial<PersistedDatabase>,
): PersistedDatabase {
  return {
    talents: Array.isArray(parsed.talents) ? parsed.talents : [...INITIAL_TALENTS],
    dailyMetrics: Array.isArray(parsed.dailyMetrics)
      ? parsed.dailyMetrics
      : [...BASE_DAILY_PLACEMENT_METRICS],
    attendanceSessions: Array.isArray(parsed.attendanceSessions)
      ? parsed.attendanceSessions
      : [...INITIAL_ATTENDANCE_SESSIONS],
  };
}

function ensureDatabase(): PersistedDatabase {
  const { primaryPath, seedFallbackPath } = resolveDatabasePaths();
  const primaryDir = path.dirname(primaryPath);

  if (fs.existsSync(primaryPath)) {
    try {
      const raw = fs.readFileSync(primaryPath, 'utf-8');
      const parsed = normalizeParsedDatabase(
        JSON.parse(raw) as Partial<PersistedDatabase>,
      );
      memoryFallbackDb = parsed;
      return parsed;
    } catch {
      // Fall through to seed/fallback
    }
  }

  let initialDb = createSeedDatabase();
  if (seedFallbackPath !== primaryPath && fs.existsSync(seedFallbackPath)) {
    try {
      const rawSeed = fs.readFileSync(seedFallbackPath, 'utf-8');
      initialDb = normalizeParsedDatabase(
        JSON.parse(rawSeed) as Partial<PersistedDatabase>,
      );
    } catch {
      initialDb = createSeedDatabase();
    }
  }

  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    fs.writeFileSync(primaryPath, JSON.stringify(initialDb, null, 2), 'utf-8');
  } catch {
    // Keep memoryFallbackDb if disk is completely non-writable
  }

  memoryFallbackDb = initialDb;
  return initialDb;
}

function saveDatabase(db: PersistedDatabase): void {
  memoryFallbackDb = db;
  const { primaryPath } = resolveDatabasePaths();
  const primaryDir = path.dirname(primaryPath);

  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    fs.writeFileSync(primaryPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // Graceful fallback in memory if environment blocks disk writes
  }
}

export function createApiApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const { mode } = resolveDatabasePaths();
    res.json({
      status: 'ok',
      app: 'AKU ANTAR',
      storageMode: mode,
    });
  });

  app.get('/api/talents', (_req, res) => {
    const db = memoryFallbackDb && isServerlessRuntime() ? memoryFallbackDb : ensureDatabase();
    res.json({
      talents: db.talents,
      dailyMetrics: db.dailyMetrics,
    });
  });

  app.post('/api/talents', (req, res) => {
    const payload = req.body as TalentFormInput;
    const validation = validateTalentInput(payload);
    if (!validation.valid) {
      res.status(400).json({
        message: 'Data tidak valid. Periksa kembali field yang wajib diisi.',
        errors: validation.errors,
      });
      return;
    }

    const db = ensureDatabase();
    const cleanNik = payload.nik.replace(/\s+/g, '');
    if (db.talents.some((item) => item.nik === cleanNik)) {
      res.status(409).json({
        message: 'NIK sudah terdaftar pada database talent pool.',
        errors: { nik: 'NIK ini sudah terdaftar dalam sistem.' },
      });
      return;
    }

    const latestMetricDate =
      db.dailyMetrics[db.dailyMetrics.length - 1]?.date ?? '2026-11-12';

    const newRecord: TalentRecord = {
      id: `aku-ant-${Date.now()}`,
      namaLengkap: payload.namaLengkap.trim(),
      nik: cleanNik,
      noHp: payload.noHp.replace(/[\s-]/g, ''),
      alamatDomisili: payload.alamatDomisili.trim(),
      noRekening: payload.noRekening.replace(/[\s-]/g, ''),
      namaPenerima: payload.namaPenerima.trim(),
      jenisBank: payload.jenisBank.trim(),
      posisi: payload.posisi,
      penempatan: payload.penempatan.trim(),
      status: payload.status,
      tanggalPenempatan: payload.tanggalPenempatan?.trim() || latestMetricDate,
      updatedAt: new Date().toISOString(),
    };

    db.talents = [newRecord, ...db.talents];
    saveDatabase(db);
    res.status(201).json(newRecord);
  });

  app.patch('/api/talents/:id', (req, res) => {
    const { id } = req.params;
    const db = ensureDatabase();
    const index = db.talents.findIndex((item) => item.id === id);

    if (index === -1) {
      res.status(404).json({ message: 'Data talent tidak ditemukan.' });
      return;
    }

    const existing = db.talents[index];
    const body = req.body as Partial<TalentFormInput>;

    const merged: TalentFormInput = {
      namaLengkap: body.namaLengkap ?? existing.namaLengkap,
      nik: body.nik ?? existing.nik,
      noHp: body.noHp ?? existing.noHp,
      alamatDomisili: body.alamatDomisili ?? existing.alamatDomisili,
      noRekening: body.noRekening ?? existing.noRekening,
      namaPenerima: body.namaPenerima ?? existing.namaPenerima,
      jenisBank: body.jenisBank ?? existing.jenisBank,
      posisi: body.posisi ?? existing.posisi,
      penempatan: body.penempatan ?? existing.penempatan,
      status: body.status ?? existing.status,
      tanggalPenempatan: body.tanggalPenempatan ?? existing.tanggalPenempatan,
    };

    const validation = validateTalentInput(merged);
    if (!validation.valid) {
      res.status(400).json({
        message: 'Perubahan data tidak valid.',
        errors: validation.errors,
      });
      return;
    }

    const cleanNik = merged.nik.replace(/\s+/g, '');
    if (db.talents.some((item) => item.id !== id && item.nik === cleanNik)) {
      res.status(409).json({
        message: 'NIK sudah digunakan oleh talent lain.',
        errors: { nik: 'NIK ini sudah terdaftar pada talent lain.' },
      });
      return;
    }

    const updatedRecord: TalentRecord = {
      ...existing,
      namaLengkap: merged.namaLengkap.trim(),
      nik: cleanNik,
      noHp: merged.noHp.replace(/[\s-]/g, ''),
      alamatDomisili: merged.alamatDomisili.trim(),
      noRekening: merged.noRekening.replace(/[\s-]/g, ''),
      namaPenerima: merged.namaPenerima.trim(),
      jenisBank: merged.jenisBank.trim(),
      posisi: merged.posisi,
      penempatan: merged.penempatan.trim(),
      status: merged.status,
      tanggalPenempatan: merged.tanggalPenempatan || existing.tanggalPenempatan,
      updatedAt: new Date().toISOString(),
    };

    db.talents[index] = updatedRecord;
    saveDatabase(db);
    res.json(updatedRecord);
  });

  app.delete('/api/talents/:id', (req, res) => {
    const { id } = req.params;
    const db = ensureDatabase();
    const exists = db.talents.some((item) => item.id === id);

    if (!exists) {
      res.status(404).json({ message: 'Data talent tidak ditemukan.' });
      return;
    }

    db.talents = db.talents.filter((item) => item.id !== id);
    saveDatabase(db);
    res.json({ deleted: true, id });
  });

  app.get('/api/attendance', (_req, res) => {
    const db = memoryFallbackDb && isServerlessRuntime() ? memoryFallbackDb : ensureDatabase();
    res.json({ sessions: db.attendanceSessions });
  });

  app.post('/api/attendance', (req, res) => {
    const body = req.body as Partial<ShiftAttendanceFormInput>;
    if (body.posisi !== 'Kurir' && body.posisi !== 'DW') {
      res.status(400).json({ message: 'Posisi wajib Kurir atau DW.' });
      return;
    }
    if (
      !body.tanggal?.trim() ||
      !body.shift?.trim() ||
      !body.jamMulai?.trim() ||
      !body.jamSelesai?.trim() ||
      !body.penempatan?.trim()
    ) {
      res.status(400).json({
        message:
          'Tanggal, Shift, Jam Mulai, Jam Selesai, dan Lokasi Penempatan Hub wajib diisi.',
      });
      return;
    }
    const requestMp = Number(body.requestMp);
    if (!Number.isFinite(requestMp) || requestMp < 1) {
      res.status(400).json({ message: 'Request MP minimal 1 personel.' });
      return;
    }

    const db = ensureDatabase();
    const newSession: ShiftAttendanceSession = {
      id: `att-sess-${Date.now()}`,
      posisi: body.posisi,
      tanggal: body.tanggal.trim(),
      shift: body.shift.trim(),
      jamMulai: body.jamMulai.trim(),
      jamSelesai: body.jamSelesai.trim(),
      penempatan: body.penempatan.trim(),
      requestMp: Math.round(requestMp),
      attendees: [],
      updatedAt: new Date().toISOString(),
    };

    db.attendanceSessions = [newSession, ...db.attendanceSessions];
    saveDatabase(db);
    res.status(201).json(newSession);
  });

  app.patch('/api/attendance/:id', (req, res) => {
    const { id } = req.params;
    const db = ensureDatabase();
    const index = db.attendanceSessions.findIndex((item) => item.id === id);

    if (index === -1) {
      res.status(404).json({ message: 'Sesi absensi tidak ditemukan.' });
      return;
    }

    const existing = db.attendanceSessions[index];
    const body = req.body as Partial<ShiftAttendanceSession>;

    const nextRequestMp =
      body.requestMp !== undefined
        ? Math.max(1, Math.round(Number(body.requestMp) || 1))
        : existing.requestMp;

    const nextAttendees: ShiftAttendee[] = Array.isArray(body.attendees)
      ? body.attendees
      : existing.attendees;

    const updated: ShiftAttendanceSession = {
      ...existing,
      tanggal: body.tanggal?.trim() || existing.tanggal,
      shift: body.shift?.trim() || existing.shift,
      jamMulai:
        body.jamMulai !== undefined ? body.jamMulai.trim() : existing.jamMulai,
      jamSelesai:
        body.jamSelesai !== undefined
          ? body.jamSelesai.trim()
          : existing.jamSelesai,
      penempatan: body.penempatan?.trim() || existing.penempatan,
      requestMp: nextRequestMp,
      attendees: nextAttendees,
      updatedAt: new Date().toISOString(),
    };

    const conflictCheck = validateSessionAttendanceConflicts(
      db.attendanceSessions,
      updated,
    );
    if (!conflictCheck.valid) {
      res.status(409).json({
        message:
          conflictCheck.message ||
          'Terjadi double absen pada tanggal yang sama.',
      });
      return;
    }

    db.attendanceSessions[index] = updated;
    saveDatabase(db);
    res.json(updated);
  });

  app.delete('/api/attendance/:id', (req, res) => {
    const { id } = req.params;
    const db = ensureDatabase();
    const exists = db.attendanceSessions.some((item) => item.id === id);

    if (!exists) {
      res.status(404).json({ message: 'Sesi absensi tidak ditemukan.' });
      return;
    }

    db.attendanceSessions = db.attendanceSessions.filter(
      (item) => item.id !== id,
    );
    saveDatabase(db);
    res.json({ deleted: true, id });
  });

  return app;
}
