import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { TalentRecord } from '../types/talent';

interface HubDistributionViewProps {
  talents: TalentRecord[];
  onInspectHub: (hubName: string) => void;
}

export function HubDistributionView({
  talents,
  onInspectHub,
}: HubDistributionViewProps) {
  const hubMap = new Map<
    string,
    {
      hub: string;
      total: number;
      kurir: number;
      dw: number;
      aktif: number;
      nonAktif: number;
    }
  >();

  for (const t of talents) {
    const entry = hubMap.get(t.penempatan) ?? {
      hub: t.penempatan,
      total: 0,
      kurir: 0,
      dw: 0,
      aktif: 0,
      nonAktif: 0,
    };
    entry.total += 1;
    if (t.posisi === 'Kurir') entry.kurir += 1;
    else entry.dw += 1;
    if (t.status === 'Aktif') entry.aktif += 1;
    else entry.nonAktif += 1;
    hubMap.set(t.penempatan, entry);
  }

  const rows = Array.from(hubMap.values()).sort((a, b) => b.total - a.total);
  const maxHubTotal = rows.reduce((m, r) => Math.max(m, r.total), 1);

  return (
    <section className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-md p-5">
        <h2 className="text-base font-bold text-slate-900">
          Sebaran Penempatan per Hub ANTARAJA
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Klik tombol lihat pada masing-masing Hub untuk memfilter daftar Kurir
          dan DW di lokasi tersebut.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-3">Lokasi Penempatan Hub</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-right">Kurir</th>
                <th className="py-2.5 px-3 text-right">DW</th>
                <th className="py-2.5 px-3 text-right">Aktif</th>
                <th className="py-2.5 px-3 text-right">Non-Aktif</th>
                <th className="py-2.5 px-3 w-44">Kepadatan Pool</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.map((r) => {
                const widthPct = Math.round((r.total / maxHubTotal) * 100);
                return (
                  <tr key={r.hub} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-900">
                      {r.hub}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {r.total}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#6E2B8B] tabular-nums">
                      {r.kurir}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sky-700 tabular-nums">
                      {r.dw}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 tabular-nums">
                      {r.aktif}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500 tabular-nums">
                      {r.nonAktif}
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-2 w-full rounded-[2px] bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#6E2B8B] rounded-[2px]"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectHub(r.hub)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#6E2B8B] hover:underline"
                      >
                        <span>Lihat Talent</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

interface BankVerificationViewProps {
  talents: TalentRecord[];
  onEditTalent: (talent: TalentRecord) => void;
}

export function BankVerificationView({
  talents,
  onEditTalent,
}: BankVerificationViewProps) {
  const bankCounts = new Map<string, number>();
  for (const t of talents) {
    bankCounts.set(t.jenisBank, (bankCounts.get(t.jenisBank) ?? 0) + 1);
  }
  const bankSummary = Array.from(bankCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <section className="space-y-4">
      {/* Bank Summary Strip */}
      <div className="bg-white border border-slate-200 rounded-md p-5">
        <h2 className="text-base font-bold text-slate-900">
          Distribusi Jenis Bank Talent Pool
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Ringkasan rekening bank terdaftar untuk keperluan administrasi dan
          pembayaran upah Kurir & DW.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {bankSummary.map(([bank, count]) => (
            <div
              key={bank}
              className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <span className="text-xs font-medium text-slate-600 block">
                {bank}
              </span>
              <span className="mt-1 text-lg font-bold font-mono text-slate-900 tabular-nums block">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rekening Table */}
      <div className="bg-white border border-slate-200 rounded-md p-5">
        <h3 className="text-sm font-bold text-slate-900">
          Daftar Kesesuaian Nama Pemilik Rekening
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-3">Nama Talent</th>
                <th className="py-2.5 px-3">Posisi</th>
                <th className="py-2.5 px-3">Jenis Bank</th>
                <th className="py-2.5 px-3">No Rekening</th>
                <th className="py-2.5 px-3">Nama Penerima</th>
                <th className="py-2.5 px-3">Validasi Nama</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {talents.map((t) => {
                const isSameName =
                  t.namaLengkap.trim().toLowerCase() ===
                  t.namaPenerima.trim().toLowerCase();
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {t.namaLengkap}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{t.posisi}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {t.jenisBank}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-800 tabular-nums">
                      {t.noRekening}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {t.namaPenerima}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isSameName ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Sesuai KTP</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Rekening Keluarga / Berbeda</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onEditTalent(t)}
                        className="text-xs font-semibold text-[#6E2B8B] hover:underline"
                      >
                        Perbarui
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
