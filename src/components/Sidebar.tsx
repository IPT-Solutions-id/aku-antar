import { useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Globe,
  LayoutDashboard,
  MapPin,
  Store,
  Truck,
  X,
} from 'lucide-react';
import type { TalentStats } from '../types/talent';

export type ActiveNavView =
  | 'overview'
  | 'attendance-kurir'
  | 'attendance-dw'
  | 'attendance-recap'
  | 'dw-portal'
  | 'dw-vendor'
  | 'hubs'
  | 'payroll';

interface SidebarProps {
  activeView: ActiveNavView;
  onSelectView: (view: ActiveNavView) => void;
  stats: TalentStats;
  desktopOpen: boolean;
  onCloseDesktop: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeView,
  onSelectView,
  stats,
  desktopOpen,
  onCloseDesktop,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [attendanceOpen, setAttendanceOpen] = useState(true);
  const [logoSrc, setLogoSrc] = useState('/logo-aku.png');
  const [logoError, setLogoError] = useState(false);

  const handleLogoError = () => {
    if (logoSrc === '/logo-aku.png') {
      setLogoSrc('https://i.imgur.com/eBgojVX.png');
    } else {
      setLogoError(true);
    }
  };

  const navItems: {
    id: ActiveNavView;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
    { id: 'overview', label: 'Database & Performa', icon: LayoutDashboard },
    { id: 'dw-portal', label: 'Portal DW (STR)', icon: Globe },
    { id: 'dw-vendor', label: 'Portal Vendor DW', icon: Store },
    { id: 'hubs', label: 'Sebaran Penempatan', icon: MapPin },
    { id: 'payroll', label: 'Data Bank & Rekening', icon: CreditCard },
  ];

  const attendanceSubItems: {
    id: ActiveNavView;
    label: string;
    icon: typeof Truck;
  }[] = [
    { id: 'attendance-kurir', label: 'Absen Kurir', icon: Truck },
    { id: 'attendance-dw', label: 'Absen DW', icon: Clock },
    { id: 'attendance-recap', label: 'Rekap Absensi', icon: FileSpreadsheet },
  ];

  const isAttendanceActive =
    activeView === 'attendance-kurir' ||
    activeView === 'attendance-dw' ||
    activeView === 'attendance-recap';

  const handleSelect = (id: ActiveNavView) => {
    onSelectView(id);
    onCloseMobile();
  };

  const renderSidebarContent = (collapsed: boolean) => (
    <div
      className={`flex h-full flex-col justify-between bg-white border-r border-slate-200 py-5 ${
        collapsed ? 'px-2 items-center' : 'px-4'
      }`}
    >
      <div className={`space-y-5 w-full ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {/* Brand Identity */}
        <div
          className={`flex items-start justify-between gap-2 w-full ${
            collapsed ? 'justify-center px-0' : 'px-1'
          }`}
        >
          {collapsed ? (
            <div
              title="AKU ANTAR — PT Artha Kreasi Utama (ANTARAJA)"
              className="flex h-10 w-14 items-center justify-center rounded border border-slate-200 bg-white px-1.5 py-1 overflow-hidden shrink-0"
            >
              {!logoError ? (
                <img
                  src={logoSrc}
                  alt="Logo AKU ANTAR"
                  referrerPolicy="no-referrer"
                  onError={handleLogoError}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded bg-[#6E2B8B] text-white text-xs font-bold tracking-tight">
                  AK
                </span>
              )}
            </div>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-[76px] items-center justify-center rounded border border-slate-200 bg-white px-1.5 py-1 overflow-hidden shrink-0">
                  {!logoError ? (
                    <img
                      src={logoSrc}
                      alt="Logo AKU ANTAR"
                      referrerPolicy="no-referrer"
                      onError={handleLogoError}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center rounded bg-[#6E2B8B] text-white text-xs font-bold tracking-tight">
                      AK
                    </span>
                  )}
                </div>
                <span className="text-base font-bold tracking-tight text-slate-900 truncate">
                  AKU ANTAR
                </span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                PT Artha Kreasi Utama
              </p>
            </div>
          )}

          {!collapsed && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onCloseDesktop}
                aria-label="Kecilkan sidebar ke mode ikon"
                title="Perkecil Sidebar"
                className="hidden lg:inline-flex rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Tutup menu navigasi"
                className="lg:hidden rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Client Account Context */}
        {collapsed ? (
          <div
            title="Klien Aktif: ANTARAJA — Operasional Kurir & Daily Worker"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[#6E2B8B]"
          >
            <Building2 className="h-4 w-4" />
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Building2 className="h-3.5 w-3.5 text-[#6E2B8B]" />
              <span>Klien Aktif</span>
            </div>
            <p className="mt-1 text-sm font-bold tracking-tight text-slate-900">
              ANTARAJA
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Operasional Kurir & Daily Worker
            </p>
          </div>
        )}

        {/* Navigation Links */}
        <nav
          aria-label="Menu Utama"
          className={`space-y-1 w-full ${
            collapsed ? 'flex flex-col items-center' : ''
          }`}
        >
          {navItems.slice(0, 1).map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`flex items-center rounded transition-colors whitespace-nowrap ${
                  collapsed
                    ? 'h-10 w-10 justify-center'
                    : 'w-full gap-2.5 px-3 py-2.5 text-left text-sm font-medium'
                } ${
                  isActive
                    ? 'bg-[#6E2B8B] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {/* Menu Absensi + Sub-Menu */}
          {collapsed ? (
            <div className="w-full flex flex-col items-center gap-1 pt-1.5 mt-1.5 border-t border-slate-200">
              {attendanceSubItems.map((sub) => {
                const SubIcon = sub.icon;
                const isActive = activeView === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSelect(sub.id)}
                    title={sub.label}
                    aria-label={sub.label}
                    className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
                      isActive
                        ? 'bg-[#6E2B8B] text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <SubIcon className="h-4 w-4 shrink-0" />
                  </button>
                );
              })}
              <div className="w-8 border-t border-slate-200 my-1" />
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                aria-expanded={attendanceOpen}
                onClick={() => setAttendanceOpen((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  isAttendanceActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <ClipboardCheck
                    className={`h-4 w-4 shrink-0 ${
                      isAttendanceActive ? 'text-[#6E2B8B]' : ''
                    }`}
                  />
                  <span className="truncate">Absensi</span>
                </span>
                {attendanceOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                )}
              </button>

              {attendanceOpen && (
                <div className="ml-4 pl-3 border-l border-slate-200 space-y-1">
                  {attendanceSubItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isActive = activeView === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelect(sub.id)}
                        className={`flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-[#6E2B8B] text-white font-semibold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <SubIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {navItems.slice(1).map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`flex items-center rounded transition-colors whitespace-nowrap ${
                  collapsed
                    ? 'h-10 w-10 justify-center'
                    : 'w-full gap-2.5 px-3 py-2.5 text-left text-sm font-medium'
                } ${
                  isActive
                    ? 'bg-[#6E2B8B] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Live Pool Summary Footer */}
      {collapsed ? (
        <div
          title={`Kurir Aktif: ${stats.activeKurir}/${stats.totalKurir} · DW Aktif: ${stats.activeDw}/${stats.totalDw} (${stats.activeRate}%)`}
          className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-2 text-center w-full"
        >
          <span className="block text-[10px] font-medium text-slate-500">
            Aktif
          </span>
          <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
            {stats.activeRate}%
          </span>
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2 w-full">
          <p className="text-xs font-semibold text-slate-700">
            Ringkasan Talent Pool
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block">Kurir Aktif</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {stats.activeKurir} / {stats.totalKurir}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">DW Aktif</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {stats.activeDw} / {stats.totalDw}
              </span>
            </div>
          </div>
          <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Rasio Aktif</span>
            <span className="font-mono font-semibold text-emerald-700 tabular-nums">
              {stats.activeRate}%
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Expanded w-64 or Icon-Rail w-[72px]) */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 ${
          desktopOpen ? 'lg:w-64' : 'lg:w-[72px]'
        }`}
      >
        <div className="sticky top-0 h-screen w-full">
          {renderSidebarContent(!desktopOpen)}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
}

