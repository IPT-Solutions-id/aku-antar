import {
  CheckCircle2,
  Edit3,
  Eye,
  MessageCircle,
  Plus,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { TalentRecord } from '../types/talent';
import { buildWhatsAppUrl, maskSensitiveNumber } from '../utils/talentLogic';

interface TalentTableProps {
  talents: TalentRecord[];
  loading: boolean;
  showFullSensitive: boolean;
  togglingId: string | null;
  onToggleStatus: (talent: TalentRecord) => void;
  onSelectDetail: (talent: TalentRecord) => void;
  onEditTalent: (talent: TalentRecord) => void;
  onResetFilters: () => void;
  onAddNew: () => void;
}

export function TalentTable({
  talents,
  loading,
  showFullSensitive,
  togglingId,
  onToggleStatus,
  onSelectDetail,
  onEditTalent,
  onResetFilters,
  onAddNew,
}: TalentTableProps) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-11 w-full rounded bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (talents.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-10 text-center">
        <p className="text-sm font-semibold text-slate-900">
          Tidak ada data Kurir atau DW yang sesuai filter
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Ubah kata kunci pencarian, filter status Aktif/Non-Aktif, atau tambahkan
          talent baru ke database ANTARAJA.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filter</span>
          </button>
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 rounded bg-[#6E2B8B] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#5B2174]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Talent</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
      <div
        data-testid="talent-table-scroll-container"
        className="max-h-[560px] overflow-auto"
      >
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead className="sticky top-0 z-20 bg-slate-50">
            <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 tracking-wide shadow-[inset_0_-1px_0_#e2e8f0]">
              <th className="sticky top-0 left-0 z-20 bg-slate-50 py-2.5 pl-4 pr-2.5 border-r border-slate-200/80 shadow-[inset_0_-1px_0_#e2e8f0]">
                Nama Lengkap & NIK
              </th>
              <th className="sticky top-0 z-10 bg-slate-50 py-2.5 px-2.5 shadow-[inset_0_-1px_0_#e2e8f0]">
                No HP
              </th>
              <th className="sticky top-0 z-10 bg-slate-50 py-2.5 px-2.5 shadow-[inset_0_-1px_0_#e2e8f0]">
                Alamat Domisili
              </th>
              <th className="sticky top-0 z-10 bg-slate-50 py-2.5 px-2.5 shadow-[inset_0_-1px_0_#e2e8f0]">
                Posisi
              </th>
              <th className="sticky top-0 z-10 bg-slate-50 py-2.5 px-2.5 shadow-[inset_0_-1px_0_#e2e8f0]">
                Penempatan
              </th>
              <th className="sticky top-0 z-10 bg-slate-50 py-2.5 px-2.5 shadow-[inset_0_-1px_0_#e2e8f0]">
                Status
              </th>
              <th className="sticky top-0 z-10 bg-slate-50 py-2.5 pl-2.5 pr-4 text-right shadow-[inset_0_-1px_0_#e2e8f0]">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {talents.map((item) => {
              const isActive = item.status === 'Aktif';
              const isToggling = togglingId === item.id;
              const displayedNik = showFullSensitive
                ? item.nik
                : maskSensitiveNumber(item.nik, 4);

              return (
                <tr
                  key={item.id}
                  data-testid={`talent-row-${item.id}`}
                  className="group hover:bg-slate-50/80 transition-colors align-top"
                >
                  {/* Nama Lengkap & NIK */}
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors py-3 pl-4 pr-2.5 border-r border-slate-100">
                    <button
                      type="button"
                      onClick={() => onSelectDetail(item)}
                      className="text-left font-semibold text-slate-900 hover:text-[#6E2B8B] transition-colors"
                    >
                      {item.namaLengkap}
                    </button>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                      NIK: {displayedNik}
                    </div>
                  </td>

                  {/* No HP & Direct WhatsApp */}
                  <td className="py-3 px-2.5 whitespace-nowrap">
                    <div className="font-mono text-slate-700 tabular-nums">
                      {item.noHp}
                    </div>
                    {(() => {
                      const waUrl = buildWhatsAppUrl(item.noHp);
                      if (!waUrl) return null;
                      return (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Chat WhatsApp ${item.namaLengkap}`}
                          title={`Buka WhatsApp ${item.namaLengkap} (${item.noHp})`}
                          className="mt-1 inline-flex items-center gap-1 rounded-[3px] border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>Chat WA</span>
                        </a>
                      );
                    })()}
                  </td>

                  {/* Alamat Domisili */}
                  <td className="py-3 px-2.5 max-w-[220px]">
                    <p
                      className="text-slate-600 line-clamp-2 leading-relaxed"
                      title={item.alamatDomisili}
                    >
                      {item.alamatDomisili}
                    </p>
                  </td>

                  {/* Posisi */}
                  <td className="py-3 px-2.5 whitespace-nowrap">
                    <span
                      className={`inline-block rounded-[3px] px-2 py-0.5 text-[11px] font-semibold ${
                        item.posisi === 'Kurir'
                          ? 'bg-[#6E2B8B]/10 text-[#6E2B8B]'
                          : 'bg-sky-50 text-sky-700'
                      }`}
                    >
                      {item.posisi}
                    </span>
                  </td>

                  {/* Penempatan */}
                  <td className="py-3 px-2.5 max-w-[165px]">
                    <span className="text-slate-700 font-medium leading-snug block">
                      {item.penempatan}
                    </span>
                  </td>

                  {/* Status Real-Time Toggle */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => onToggleStatus(item)}
                      aria-label={`Ubah status ${item.namaLengkap} dari ${item.status}`}
                      title="Klik untuk ubah status Aktif / Non-Aktif secara real-time"
                      className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap disabled:opacity-60 ${
                        isActive
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-slate-500 shrink-0" />
                      )}
                      <span>{item.status}</span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectDetail(item)}
                        aria-label={`Lihat detail ${item.namaLengkap}`}
                        className="rounded border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditTalent(item)}
                        aria-label={`Edit data ${item.namaLengkap}`}
                        className="rounded border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-[#6E2B8B]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
