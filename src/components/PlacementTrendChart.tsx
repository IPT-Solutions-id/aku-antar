import { useMemo, useState } from 'react';
import type { DailyPlacementMetric } from '../types/talent';

interface PlacementTrendChartProps {
  metrics: DailyPlacementMetric[];
  timeframe: 7 | 14 | 30;
  onChangeTimeframe: (days: 7 | 14 | 30) => void;
}

export function PlacementTrendChart({
  metrics,
  timeframe,
  onChangeTimeframe,
}: PlacementTrendChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const summary = useMemo(() => {
    if (metrics.length === 0) {
      return { avgDaily: 0, avgFulfillment: 0, peakDay: null as DailyPlacementMetric | null };
    }
    const total = metrics.reduce((acc, m) => acc + m.totalPlaced, 0);
    const totalTarget = metrics.reduce((acc, m) => acc + m.target, 0);
    let peak = metrics[0];
    for (const m of metrics) {
      if (m.totalPlaced > peak.totalPlaced) {
        peak = m;
      }
    }
    return {
      avgDaily: Math.round((total / metrics.length) * 10) / 10,
      avgFulfillment: totalTarget > 0 ? Math.round((total / totalTarget) * 100) : 0,
      peakDay: peak,
    };
  }, [metrics]);

  const activeMetric =
    selectedIndex !== null && metrics[selectedIndex]
      ? metrics[selectedIndex]
      : metrics[metrics.length - 1] ?? null;

  const maxValue = useMemo(() => {
    const rawMax = metrics.reduce(
      (max, m) => Math.max(max, m.totalPlaced, m.target),
      10,
    );
    return Math.ceil(rawMax / 5) * 5 + 5;
  }, [metrics]);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    Math.round(maxValue * ratio),
  );

  // SVG dimensions
  const chartWidth = 860;
  const chartHeight = 220;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 30;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const stepWidth = metrics.length > 0 ? plotWidth / metrics.length : plotWidth;
  const barGap = timeframe === 30 ? 1.5 : 3;
  const barWidth = Math.max(
    4,
    Math.min(18, Math.floor((stepWidth * 0.64 - barGap) / 2)),
  );
  const groupWidth = barWidth * 2 + barGap;

  const targetPoints = metrics
    .map((m, idx) => {
      const cx = padLeft + idx * stepWidth + stepWidth / 2;
      const cy = padTop + plotHeight - (m.target / maxValue) * plotHeight;
      return `${cx.toFixed(1)},${cy.toFixed(1)}`;
    })
    .join(' ');

  const totalPoints = metrics
    .map((m, idx) => {
      const cx = padLeft + idx * stepWidth + stepWidth / 2;
      const cy = padTop + plotHeight - (m.totalPlaced / maxValue) * plotHeight;
      return `${cx.toFixed(1)},${cy.toFixed(1)}`;
    })
    .join(' ');

  return (
    <section
      aria-label="Grafik Tren Harian Performa Penempatan Kerja"
      className="bg-white border border-slate-200 rounded-md p-5"
    >
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Tren Harian Performa Penempatan Kerja
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
            <span>Rata-rata {summary.avgDaily} penempatan/hari</span>
            <span aria-hidden="true">·</span>
            <span>Pemenuhan target {summary.avgFulfillment}%</span>
            {summary.peakDay && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Puncak {summary.peakDay.label} ({summary.peakDay.totalPlaced}{' '}
                  personel)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Controls: Legend + Timeframe Buttons */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-4">
          <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#6E2B8B]" />
              <span>Kurir</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-sky-500" />
              <span>DW</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3.5 bg-slate-900" />
              <span>Total</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3.5 border-t-2 border-dashed border-amber-600" />
              <span>Target</span>
            </span>
          </div>

          <div
            role="group"
            aria-label="Rentang waktu grafik"
            className="inline-flex items-center bg-slate-100 p-0.5 rounded border border-slate-200"
          >
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  onChangeTimeframe(days);
                  setSelectedIndex(null);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-[3px] transition-colors whitespace-nowrap ${
                  timeframe === days
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days} Hari
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected / Hovered Day Readout Strip */}
      {activeMetric && (
        <div
          data-testid="chart-active-readout"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded bg-slate-50 border border-slate-200 px-3 py-2 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2 text-slate-700">
            <span className="font-semibold text-slate-900">
              {activeMetric.label} ({activeMetric.date})
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Total: <strong>{activeMetric.totalPlaced}</strong> personel
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#6E2B8B]">
              Kurir: <strong>{activeMetric.kurirPlaced}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-sky-700">
              DW: <strong>{activeMetric.dwPlaced}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span className="text-slate-500">Target: {activeMetric.target}</span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-semibold ${
                activeMetric.fulfillmentRate >= 100
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              Pencapaian {activeMetric.fulfillmentRate}%
            </span>
          </div>
        </div>
      )}

      {/* SVG Grouped Bar Chart + Continuous Target & Total Lines */}
      <div className="mt-4 w-full overflow-x-auto">
        <div className="min-w-[620px]">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-60 select-none"
            role="img"
            aria-label="Grafik batang berdampingan jumlah penempatan harian Kurir dan DW beserta garis target"
          >
            {/* Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map((tick) => {
              const y = padTop + plotHeight - (tick / maxValue) * plotHeight;
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartWidth - padRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Grouped Side-by-Side Bars */}
            {metrics.map((m, idx) => {
              const centerX = padLeft + idx * stepWidth + stepWidth / 2;
              const groupStartX = centerX - groupWidth / 2;
              const kurirX = groupStartX;
              const dwX = groupStartX + barWidth + barGap;

              const kurirH = (m.kurirPlaced / maxValue) * plotHeight;
              const dwH = (m.dwPlaced / maxValue) * plotHeight;

              const kurirY = padTop + plotHeight - kurirH;
              const dwY = padTop + plotHeight - dwH;

              const isHighlighted =
                selectedIndex === idx ||
                (selectedIndex === null && idx === metrics.length - 1);

              const showXLabel =
                timeframe === 7 ||
                timeframe === 14 ||
                idx % 3 === 0 ||
                idx === metrics.length - 1;

              return (
                <g
                  key={m.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => setSelectedIndex(idx)}
                >
                  {/* Hover column backdrop */}
                  <rect
                    x={padLeft + idx * stepWidth}
                    y={padTop}
                    width={stepWidth}
                    height={plotHeight}
                    fill={isHighlighted ? '#F1F5F9' : 'transparent'}
                    rx="2"
                  />

                  {/* Kurir Bar (Left) */}
                  {kurirH > 0 && (
                    <rect
                      x={kurirX}
                      y={kurirY}
                      width={barWidth}
                      height={kurirH}
                      rx="2"
                      fill={isHighlighted ? '#581C87' : '#6E2B8B'}
                    />
                  )}

                  {/* DW Bar (Right) */}
                  {dwH > 0 && (
                    <rect
                      x={dwX}
                      y={dwY}
                      width={barWidth}
                      height={dwH}
                      rx="2"
                      fill={isHighlighted ? '#0284C7' : '#0EA5E9'}
                    />
                  )}

                  {/* Per-bar value labels on 7 and 14 day views */}
                  {timeframe !== 30 && (
                    <>
                      <text
                        x={kurirX + barWidth / 2}
                        y={kurirY - 4}
                        textAnchor="middle"
                        className="fill-[#581C87] text-[9px] font-mono font-medium"
                      >
                        {m.kurirPlaced}
                      </text>
                      <text
                        x={dwX + barWidth / 2}
                        y={dwY - 4}
                        textAnchor="middle"
                        className="fill-sky-700 text-[9px] font-mono font-medium"
                      >
                        {m.dwPlaced}
                      </text>
                    </>
                  )}

                  {/* X-Axis Label */}
                  {showXLabel && (
                    <text
                      x={centerX}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      className={`text-[10px] font-mono ${
                        isHighlighted
                          ? 'fill-slate-900 font-semibold'
                          : 'fill-slate-400'
                      }`}
                    >
                      {m.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Continuous Dashed Target Line */}
            {metrics.length > 1 && (
              <polyline
                fill="none"
                stroke="#D97706"
                strokeWidth="1.75"
                strokeDasharray="5 3"
                points={targetPoints}
                className="pointer-events-none"
              />
            )}

            {/* Continuous Total Placement Trend Line */}
            {metrics.length > 1 && (
              <polyline
                fill="none"
                stroke="#0F172A"
                strokeWidth="1.75"
                points={totalPoints}
                className="pointer-events-none"
              />
            )}

            {/* Total Trend Nodes */}
            {metrics.map((m, idx) => {
              const cx = padLeft + idx * stepWidth + stepWidth / 2;
              const totalY =
                padTop + plotHeight - (m.totalPlaced / maxValue) * plotHeight;
              const isHighlighted =
                selectedIndex === idx ||
                (selectedIndex === null && idx === metrics.length - 1);

              return (
                <circle
                  key={`node-${m.date}`}
                  cx={cx}
                  cy={totalY}
                  r={isHighlighted ? 3.5 : 2.2}
                  fill={m.totalPlaced >= m.target ? '#0F172A' : '#DC2626'}
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  className="pointer-events-none"
                />
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}
