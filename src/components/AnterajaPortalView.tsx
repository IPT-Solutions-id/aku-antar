import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Globe,
  RefreshCw,
  RotateCcw,
  Store,
} from 'lucide-react';
import {
  buildAnterajaDwPortalUrl,
  buildAnterajaVendorPortalUrl,
  normalizeHubCode,
} from '../utils/talentLogic';

interface AnterajaPortalViewProps {
  mode?: 'hub' | 'vendor';
}

export function AnterajaPortalView({ mode = 'hub' }: AnterajaPortalViewProps) {
  const [hubCodeInput, setHubCodeInput] = useState('STR');
  const [activeHubCode, setActiveHubCode] = useState('STR');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);

  const isVendor = mode === 'vendor';
  const portalUrl = isVendor
    ? buildAnterajaVendorPortalUrl()
    : buildAnterajaDwPortalUrl(activeHubCode);

  const handleApplyHubCode = (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeHubCode(hubCodeInput);
    setHubCodeInput(normalized);
    setActiveHubCode(normalized);
    setFrameLoaded(false);
    setReloadNonce((prev) => prev + 1);
  };

  const handleResetDefault = () => {
    setHubCodeInput('STR');
    setActiveHubCode('STR');
    setFrameLoaded(false);
    setReloadNonce((prev) => prev + 1);
  };

  const handleReloadFrame = () => {
    setFrameLoaded(false);
    setReloadNonce((prev) => prev + 1);
  };

  return (
    <section className="space-y-4">
      {/* Control & Fallback Header Card */}
      <div className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              {isVendor ? (
                <Store className="h-4 w-4 text-[#6E2B8B] shrink-0" />
              ) : (
                <Globe className="h-4 w-4 text-[#6E2B8B] shrink-0" />
              )}
              <h2 className="text-sm font-bold text-slate-900">
                {isVendor
                  ? 'Portal Vendor DW ANTARAJA'
                  : 'Portal DW ANTARAJA'}
              </h2>
              <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                {isVendor ? 'VENDOR' : `HUBCODE=${activeHubCode}`}
              </span>
            </div>
            <p className="font-mono text-xs text-slate-500 break-all">
              {portalUrl}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!isVendor && (
              <form
                onSubmit={handleApplyHubCode}
                className="flex items-center gap-1.5"
              >
                <label
                  htmlFor="portal-hubcode"
                  className="text-xs font-medium text-slate-600 whitespace-nowrap"
                >
                  HUBCODE:
                </label>
                <input
                  id="portal-hubcode"
                  type="text"
                  value={hubCodeInput}
                  onChange={(e) =>
                    setHubCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="STR"
                  maxLength={16}
                  className="w-24 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-[#6E2B8B] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                >
                  Terapkan
                </button>
                {activeHubCode !== 'STR' && (
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    title="Kembalikan ke HUBCODE=STR"
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>STR</span>
                  </button>
                )}
              </form>
            )}

            <button
              type="button"
              onClick={handleReloadFrame}
              className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Muat Ulang</span>
            </button>

            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded bg-[#6E2B8B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5B2174] whitespace-nowrap"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Buka di Tab Baru</span>
            </a>
          </div>
        </div>

        {/* Embedded Restriction Fallback Info */}
        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-start sm:items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-[#6E2B8B] shrink-0 mt-0.5 sm:mt-0" />
            <span>
              Jika halaman portal tidak tampil di dalam frame atau meminta login
              akun Anteraja, gunakan tombol{' '}
              <strong className="font-semibold text-slate-800">
                Buka di Tab Baru
              </strong>{' '}
              di kanan atas.
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
            {frameLoaded ? 'Frame dimuat' : 'Memuat frame...'}
          </span>
        </div>
      </div>

      {/* Embedded Portal Frame */}
      <div className="relative rounded-md border border-slate-200 bg-white overflow-hidden">
        {!frameLoaded && (
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            <span>Menghubungkan ke {portalUrl}...</span>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#6E2B8B] hover:underline"
            >
              Buka langsung →
            </a>
          </div>
        )}
        <iframe
          key={`${portalUrl}-${reloadNonce}`}
          src={portalUrl}
          title={
            isVendor
              ? 'Portal Vendor DW ANTARAJA'
              : `Portal DW ANTARAJA (${activeHubCode})`
          }
          onLoad={() => setFrameLoaded(true)}
          className="w-full h-[calc(100vh-320px)] min-h-[500px] border-0 bg-white block"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
