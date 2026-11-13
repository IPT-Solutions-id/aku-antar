import { useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  MessageCircle,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import type { TalentRecord } from '../types/talent';
import { buildWhatsAppUrl } from '../utils/talentLogic';

interface TalentDetailDrawerProps {
  talent: TalentRecord | null;
  onClose: () => void;
  onEdit: (talent: TalentRecord) => void;
  onToggleStatus: (talent: TalentRecord) => void;
  onDelete: (id: string) => Promise<void>;
}

export function TalentDetailDrawer({
  talent,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
}: TalentDetailDrawerProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!talent) {
    return null;
  }

  const isActive = talent.status === 'Aktif';

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(talent.id);
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail talent ${talent.namaLengkap}`}
    >
      <div
        className="fixed inset-0 bg-slate-900/35"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white border-l border-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Profil Talent · Client ANTARAJA
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">
              {talent.namaLengkap}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail"
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Status & Position Strip */}
          <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3.5">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">
                Posisi & Status
              </span>
              <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-900">
                <span>{talent.posisi}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={isActive ? 'text-emerald-700' : 'text-slate-600'}
                >
                  {talent.status}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleStatus(talent)}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold border transition-colors ${
                isActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isActive ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>
                {isActive ? 'Non-Aktifkan' : 'Aktifkan'}
              </span>
            </button>
          </div>

          {/* Identitas & Kontak */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              Identitas & Domisili
            </h3>
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Nama Lengkap</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {talent.namaLengkap}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">NIK (KTP)</dt>
                <dd className="font-mono font-medium text-slate-900 tabular-nums text-right">
                  {talent.nik}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">No HP</dt>
                <dd className="flex items-center gap-2 text-right">
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    {talent.noHp}
                  </span>
                  {(() => {
                    const waUrl = buildWhatsAppUrl(talent.noHp);
                    if (!waUrl) return null;
                    return (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Buka WhatsApp ${talent.namaLengkap}`}
                        className="inline-flex items-center gap-1 rounded-[3px] border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        <MessageCircle className="h-3 w-3 text-emerald-600" />
                        <span>WA</span>
                      </a>
                    );
                  })()}
                </dd>
              </div>
              <div className="pt-1">
                <dt className="text-slate-500">Alamat Domisili</dt>
                <dd className="mt-1 rounded border border-slate-200 bg-slate-50 p-2.5 text-slate-800 leading-relaxed">
                  {talent.alamatDomisili}
                </dd>
              </div>
            </dl>
          </div>

          {/* Data Bank & Payroll */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              Informasi Rekening Pembayaran
            </h3>
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Jenis Bank</dt>
                <dd className="font-semibold text-slate-900 text-right">
                  {talent.jenisBank}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">No Rekening</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums text-right">
                  {talent.noRekening}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Nama Penerima</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {talent.namaPenerima}
                </dd>
              </div>
            </dl>
          </div>

          {/* Penempatan Kerja */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              Penempatan Operasional
            </h3>
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Klien</dt>
                <dd className="font-semibold text-slate-900 text-right">
                  ANTARAJA
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Lokasi Penempatan</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {talent.penempatan}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Tanggal Penempatan</dt>
                <dd className="font-mono text-slate-700 tabular-nums text-right">
                  {talent.tanggalPenempatan}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 px-5 py-4 bg-slate-50">
          {confirmingDelete ? (
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-red-700">
                Hapus permanen data <strong>{talent.namaLengkap}</strong>?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? 'Menghapus...' : 'Ya, Hapus Data'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus</span>
              </button>
              <button
                type="button"
                onClick={() => onEdit(talent)}
                className="inline-flex items-center gap-1.5 rounded bg-[#6E2B8B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B2174]"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Data Talent</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
