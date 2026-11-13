import { CheckCircle2, Layers, Truck, Users } from 'lucide-react';
import type { TalentStats } from '../types/talent';

interface KpiSummaryStripProps {
  stats: TalentStats;
  activeStatusFilter: 'Semua' | 'Aktif' | 'Non-Aktif';
  onQuickFilterStatus: (status: 'Semua' | 'Aktif' | 'Non-Aktif') => void;
  onQuickFilterPosisi: (posisi: 'Semua' | 'Kurir' | 'DW') => void;
}

export function KpiSummaryStrip({
  stats,
  activeStatusFilter,
  onQuickFilterStatus,
  onQuickFilterPosisi,
}: KpiSummaryStripProps) {
  return (
    <section
      aria-label="Ringkasan Talent Pool"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      {/* Card 1: Total Talent Pool */}
      <button
        type="button"
        onClick={() => {
          onQuickFilterStatus('Semua');
          onQuickFilterPosisi('Semua');
        }}
        className="text-left bg-white border border-slate-200 rounded-md p-4 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E2B8B]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            Total Talent Pool
          </span>
          <Users className="h-4 w-4 text-slate-400 shrink-0" />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span
            data-testid="kpi-total-pool"
            className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums"
          >
            {stats.totalPool}
          </span>
          <span className="text-xs text-slate-500">Personel Terdaftar</span>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600 tabular-nums">
          <span>Kurir {stats.totalKurir}</span>
          <span aria-hidden="true">·</span>
          <span>DW {stats.totalDw}</span>
        </div>
      </button>

      {/* Card 2: Total DW */}
      <button
        type="button"
        onClick={() => onQuickFilterPosisi('DW')}
        className="text-left bg-white border border-slate-200 rounded-md p-4 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E2B8B]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            Total Talent DW
          </span>
          <Layers className="h-4 w-4 text-sky-600 shrink-0" />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span
            data-testid="kpi-total-dw"
            className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums"
          >
            {stats.totalDw}
          </span>
          <span className="text-xs text-slate-500">Daily Worker</span>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600 tabular-nums">
          <span className="text-emerald-700 font-medium">
            Aktif {stats.activeDw}
          </span>
          <span aria-hidden="true">·</span>
          <span>Non-Aktif {stats.inactiveDw}</span>
        </div>
      </button>

      {/* Card 3: Total Kurir */}
      <button
        type="button"
        onClick={() => onQuickFilterPosisi('Kurir')}
        className="text-left bg-white border border-slate-200 rounded-md p-4 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E2B8B]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            Total Talent Kurir
          </span>
          <Truck className="h-4 w-4 text-[#6E2B8B] shrink-0" />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span
            data-testid="kpi-total-kurir"
            className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums"
          >
            {stats.totalKurir}
          </span>
          <span className="text-xs text-slate-500">Kurir ANTARAJA</span>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600 tabular-nums">
          <span className="text-emerald-700 font-medium">
            Aktif {stats.activeKurir}
          </span>
          <span aria-hidden="true">·</span>
          <span>Non-Aktif {stats.inactiveKurir}</span>
        </div>
      </button>

      {/* Card 4: Status Aktif & Non-Aktif */}
      <div
        className={`bg-white border rounded-md p-4 ${
          activeStatusFilter !== 'Semua'
            ? 'border-[#6E2B8B]'
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            Status Operasional
          </span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <div>
            <span
              data-testid="kpi-active-count"
              className="text-2xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums"
            >
              {stats.activeTotal}
            </span>
            <span className="ml-1 text-xs font-medium text-slate-600">
              Aktif
            </span>
          </div>
          <span className="text-slate-300">/</span>
          <div>
            <span
              data-testid="kpi-inactive-count"
              className="text-lg font-semibold tracking-tight text-slate-500 font-mono tabular-nums"
            >
              {stats.inactiveTotal}
            </span>
            <span className="ml-1 text-xs text-slate-500">Non-Aktif</span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickFilterStatus('Aktif')}
            className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
              activeStatusFilter === 'Aktif'
                ? 'bg-emerald-700 text-white'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Lihat Aktif
          </button>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            onClick={() => onQuickFilterStatus('Non-Aktif')}
            className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
              activeStatusFilter === 'Non-Aktif'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Lihat Non-Aktif
          </button>
        </div>
      </div>
    </section>
  );
}
