import { Eye, EyeOff, RotateCcw, Search } from 'lucide-react';
import type { TalentFilters, TalentStats } from '../types/talent';

interface TalentFilterBarProps {
  filters: TalentFilters;
  stats: TalentStats;
  hubOptions: string[];
  filteredCount: number;
  showFullSensitive: boolean;
  onToggleSensitive: () => void;
  onChangeFilters: (next: TalentFilters) => void;
  onResetFilters: () => void;
}

export function TalentFilterBar({
  filters,
  stats,
  hubOptions,
  filteredCount,
  showFullSensitive,
  onToggleSensitive,
  onChangeFilters,
  onResetFilters,
}: TalentFilterBarProps) {
  const hasActiveFilter =
    filters.search.trim().length > 0 ||
    filters.status !== 'Semua' ||
    filters.posisi !== 'Semua' ||
    filters.penempatan !== 'Semua';

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Real-Time Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Filter status operasional real-time"
            className="inline-flex items-center bg-slate-100 p-0.5 rounded border border-slate-200"
          >
            {(
              [
                { value: 'Semua', label: `Semua (${stats.totalPool})` },
                { value: 'Aktif', label: `Aktif (${stats.activeTotal})` },
                {
                  value: 'Non-Aktif',
                  label: `Non-Aktif (${stats.inactiveTotal})`,
                },
              ] as const
            ).map((tab) => {
              const isSelected = filters.status === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() =>
                    onChangeFilters({ ...filters, status: tab.value })
                  }
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap tabular-nums ${
                    isSelected
                      ? tab.value === 'Aktif'
                        ? 'bg-emerald-700 text-white'
                        : tab.value === 'Non-Aktif'
                          ? 'bg-slate-800 text-white'
                          : 'bg-white text-slate-900 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Position Filter */}
          <div
            role="group"
            aria-label="Filter posisi talent"
            className="inline-flex items-center bg-slate-100 p-0.5 rounded border border-slate-200"
          >
            {(
              [
                { value: 'Semua', label: 'Semua Posisi' },
                { value: 'Kurir', label: 'Kurir' },
                { value: 'DW', label: 'DW' },
              ] as const
            ).map((pos) => {
              const isSelected = filters.posisi === pos.value;
              return (
                <button
                  key={pos.value}
                  type="button"
                  onClick={() =>
                    onChangeFilters({ ...filters, posisi: pos.value })
                  }
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-[3px] transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-slate-900 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {pos.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search + Hub Selector + Privacy Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              aria-label="Cari nama, NIK, no HP, rekening, atau alamat"
              value={filters.search}
              onChange={(e) =>
                onChangeFilters({ ...filters, search: e.target.value })
              }
              placeholder="Cari nama, NIK, HP, rekening..."
              className="w-full rounded border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#6E2B8B] focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter lokasi penempatan Hub ANTARAJA"
            value={filters.penempatan}
            onChange={(e) =>
              onChangeFilters({ ...filters, penempatan: e.target.value })
            }
            className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-[#6E2B8B] focus:outline-none"
          >
            <option value="Semua">Semua Penempatan Hub</option>
            {hubOptions.map((hub) => (
              <option key={hub} value={hub}>
                {hub}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onToggleSensitive}
            className="inline-flex items-center justify-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            {showFullSensitive ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                <span>Samarkan NIK</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-slate-500" />
                <span>Tampilkan Penuh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Result Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
        <span data-testid="filtered-result-summary" className="tabular-nums">
          Menampilkan <strong className="text-slate-900">{filteredCount}</strong>{' '}
          dari <strong className="text-slate-900">{stats.totalPool}</strong>{' '}
          data talent
          {filters.status !== 'Semua' ? ` · Status: ${filters.status}` : ''}
          {filters.posisi !== 'Semua' ? ` · Posisi: ${filters.posisi}` : ''}
        </span>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#6E2B8B] hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>
    </div>
  );
}
