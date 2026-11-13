import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ANTARAJA_HUBS, BANK_OPTIONS } from '../data/seedData';
import type { TalentFormInput, TalentRecord } from '../types/talent';
import { validateTalentInput } from '../utils/talentLogic';

interface TalentFormModalProps {
  isOpen: boolean;
  editingTalent: TalentRecord | null;
  onClose: () => void;
  onSubmit: (
    payload: TalentFormInput,
    editingId?: string,
  ) => Promise<{ ok: boolean; errors?: Partial<Record<keyof TalentFormInput, string>>; message?: string }>;
}

const emptyForm: TalentFormInput = {
  namaLengkap: '',
  nik: '',
  noHp: '',
  alamatDomisili: '',
  noRekening: '',
  namaPenerima: '',
  jenisBank: 'BCA',
  posisi: 'Kurir',
  penempatan: ANTARAJA_HUBS[0],
  status: 'Aktif',
  tanggalPenempatan: '2026-11-12',
};

export function TalentFormModal({
  isOpen,
  editingTalent,
  onClose,
  onSubmit,
}: TalentFormModalProps) {
  const [form, setForm] = useState<TalentFormInput>(emptyForm);
  const [sameAsApplicant, setSameAsApplicant] = useState(true);
  const [errors, setErrors] = useState<
    Partial<Record<keyof TalentFormInput, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setServerError(null);
    if (editingTalent) {
      setForm({
        namaLengkap: editingTalent.namaLengkap,
        nik: editingTalent.nik,
        noHp: editingTalent.noHp,
        alamatDomisili: editingTalent.alamatDomisili,
        noRekening: editingTalent.noRekening,
        namaPenerima: editingTalent.namaPenerima,
        jenisBank: editingTalent.jenisBank,
        posisi: editingTalent.posisi,
        penempatan: editingTalent.penempatan,
        status: editingTalent.status,
        tanggalPenempatan: editingTalent.tanggalPenempatan,
      });
      setSameAsApplicant(
        editingTalent.namaPenerima.trim() === editingTalent.namaLengkap.trim(),
      );
    } else {
      setForm(emptyForm);
      setSameAsApplicant(true);
    }
  }, [isOpen, editingTalent]);

  if (!isOpen) {
    return null;
  }

  const updateField = <K extends keyof TalentFormInput>(
    key: K,
    value: TalentFormInput[K],
  ) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'namaLengkap' && sameAsApplicant) {
        next.namaPenerima = String(value);
      }
      return next;
    });
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleToggleSameName = (checked: boolean) => {
    setSameAsApplicant(checked);
    if (checked) {
      setForm((prev) => ({ ...prev, namaPenerima: prev.namaLengkap }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateTalentInput(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit(form, editingTalent?.id);
      if (!result.ok) {
        if (result.errors) {
          setErrors(result.errors);
        }
        if (result.message) {
          setServerError(result.message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={
        editingTalent ? 'Edit Data Talent' : 'Tambah Data Talent Baru'
      }
    >
      <div
        className="fixed inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editingTalent
                ? 'Edit Data Kurir / DW'
                : 'Tambah Talent Kurir / DW'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              PT Artha Kreasi Utama · Penempatan Klien ANTARAJA
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form"
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5">
          {serverError && (
            <div
              role="alert"
              className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {serverError}
            </div>
          )}

          {/* Section 1: Data Pribadi */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              1. Identitas & Domisili
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="field-nama"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Nama Lengkap *
                </label>
                <input
                  id="field-nama"
                  type="text"
                  value={form.namaLengkap}
                  onChange={(e) => updateField('namaLengkap', e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi Hidayat"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                />
                {errors.namaLengkap && (
                  <p className="mt-1 text-[11px] text-red-600">
                    {errors.namaLengkap}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-nik"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  NIK (16 Digit) *
                </label>
                <input
                  id="field-nik"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={form.nik}
                  onChange={(e) =>
                    updateField('nik', e.target.value.replace(/\D/g, ''))
                  }
                  placeholder="3174041205940001"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                />
                {errors.nik && (
                  <p className="mt-1 text-[11px] text-red-600">{errors.nik}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-hp"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  No HP (WhatsApp Aktif) *
                </label>
                <input
                  id="field-hp"
                  type="text"
                  inputMode="tel"
                  value={form.noHp}
                  onChange={(e) => updateField('noHp', e.target.value)}
                  placeholder="081234567890"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                />
                {errors.noHp && (
                  <p className="mt-1 text-[11px] text-red-600">{errors.noHp}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-tanggal"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Tanggal Penempatan
                </label>
                <input
                  id="field-tanggal"
                  type="date"
                  value={form.tanggalPenempatan || '2026-11-12'}
                  onChange={(e) =>
                    updateField('tanggalPenempatan', e.target.value)
                  }
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="field-alamat"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Alamat Domisili *
              </label>
              <textarea
                id="field-alamat"
                rows={2}
                value={form.alamatDomisili}
                onChange={(e) => updateField('alamatDomisili', e.target.value)}
                placeholder="Jl. Nama Jalan, No. Rumah, Kecamatan, Kota"
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
              />
              {errors.alamatDomisili && (
                <p className="mt-1 text-[11px] text-red-600">
                  {errors.alamatDomisili}
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Rekening Bank */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-xs font-bold text-slate-900">
                2. Data Rekening Pembayaran
              </h3>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAsApplicant}
                  onChange={(e) => handleToggleSameName(e.target.checked)}
                  className="rounded border-slate-300 text-[#6E2B8B]"
                />
                <span>Nama penerima sama dengan nama lengkap</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label
                  htmlFor="field-bank"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Jenis Bank *
                </label>
                <select
                  id="field-bank"
                  value={form.jenisBank}
                  onChange={(e) => updateField('jenisBank', e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                >
                  {BANK_OPTIONS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
                {errors.jenisBank && (
                  <p className="mt-1 text-[11px] text-red-600">
                    {errors.jenisBank}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-rekening"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  No Rekening *
                </label>
                <input
                  id="field-rekening"
                  type="text"
                  inputMode="numeric"
                  value={form.noRekening}
                  onChange={(e) =>
                    updateField('noRekening', e.target.value.replace(/\D/g, ''))
                  }
                  placeholder="5220481920"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                />
                {errors.noRekening && (
                  <p className="mt-1 text-[11px] text-red-600">
                    {errors.noRekening}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-penerima"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Nama Penerima *
                </label>
                <input
                  id="field-penerima"
                  type="text"
                  value={form.namaPenerima}
                  onChange={(e) => {
                    setSameAsApplicant(false);
                    updateField('namaPenerima', e.target.value);
                  }}
                  placeholder="Sesuai buku tabungan"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                />
                {errors.namaPenerima && (
                  <p className="mt-1 text-[11px] text-red-600">
                    {errors.namaPenerima}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Penempatan & Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              3. Posisi, Penempatan & Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label
                  htmlFor="field-posisi"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Posisi *
                </label>
                <select
                  id="field-posisi"
                  value={form.posisi}
                  onChange={(e) =>
                    updateField('posisi', e.target.value as 'Kurir' | 'DW')
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                >
                  <option value="Kurir">Kurir</option>
                  <option value="DW">DW (Daily Worker)</option>
                </select>
                {errors.posisi && (
                  <p className="mt-1 text-[11px] text-red-600">
                    {errors.posisi}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-penempatan"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Penempatan (Hub ANTARAJA) *
                </label>
                <input
                  id="field-penempatan"
                  type="text"
                  list="antaraja-hub-list"
                  value={form.penempatan}
                  onChange={(e) => updateField('penempatan', e.target.value)}
                  placeholder="Pilih atau ketik nama Hub"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                />
                <datalist id="antaraja-hub-list">
                  {ANTARAJA_HUBS.map((hub) => (
                    <option key={hub} value={hub} />
                  ))}
                </datalist>
                {errors.penempatan && (
                  <p className="mt-1 text-[11px] text-red-600">
                    {errors.penempatan}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-status"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Status *
                </label>
                <select
                  id="field-status"
                  value={form.status}
                  onChange={(e) =>
                    updateField(
                      'status',
                      e.target.value as 'Aktif' | 'Non-Aktif',
                    )
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Non-Aktif">Non-Aktif</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-[11px] text-red-600">
                    {errors.status}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-[#6E2B8B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B2174] disabled:opacity-60"
            >
              {submitting
                ? 'Menyimpan...'
                : editingTalent
                  ? 'Simpan Perubahan'
                  : 'Simpan Data Talent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
