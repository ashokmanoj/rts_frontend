import { useState, useEffect } from "react";
import { get } from "../../services/api";
import allowedEmails from "../../data/appEarlyAccessEmails.json";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.appsndevices.rts";

const ALLOWED_SET = new Set(allowedEmails.map(e => e.toLowerCase()));

const steps = [
  {
    n: 1,
    title: "Sign in to Play Store with your registered email",
    detail: (email) => (
      <>
        Open <strong>Google Play Store</strong> on your Android phone and make sure you are signed in with{" "}
        <span className="font-black text-indigo-600 break-all">{email}</span>.
        The app is visible <em>only</em> to invited accounts.
      </>
    ),
  },
  {
    n: 2,
    title: "Tap the Install button below",
    detail: () => (
      <>
        Click <strong>Install Now</strong> at the bottom of this popup. It will open Play Store directly on the TeleRTS app page.
      </>
    ),
  },
  {
    n: 3,
    title: "Install & open the app",
    detail: () => (
      <>
        Tap <strong>Install</strong> in Play Store and wait for the download. Once done, open the app and log in with your TeleRTS credentials.
      </>
    ),
  },
];

export default function AppInstallBanner({ currentUser }) {
  const [visible,  setVisible]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const [checked,  setChecked]  = useState(false);

  useEffect(() => {
    if (!currentUser?.email) { setChecked(true); return; }
    const emailLower = currentUser.email.toLowerCase();
    if (!ALLOWED_SET.has(emailLower)) { setChecked(true); return; }

    get("/analytics/has-app")
      .then(data => {
        if (!data.hasApp) setVisible(true);
      })
      .catch(() => {
        // API unavailable — show the button (assume not installed)
        setVisible(true);
      })
      .finally(() => setChecked(true));
  }, [currentUser?.email]);

  if (!checked || !visible) return null;

  return (
    <>
      {/* ── Floating animated button ──────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-3 z-40 flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-2xl shadow-2xl text-white select-none focus:outline-none max-w-[calc(100vw-24px)]"
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
          animation: "rts-pulse-btn 2.4s ease-in-out infinite",
        }}
      >
        {/* Logo with ping ring */}
        <span className="relative flex-shrink-0 flex items-center justify-center w-9 h-9">
          <span
            className="absolute inline-flex h-full w-full rounded-full bg-white opacity-40"
            style={{ animation: "rts-ping 1.4s cubic-bezier(0,0,0.2,1) infinite" }}
          />
          <span className="relative inline-flex rounded-full w-9 h-9 bg-white/95 items-center justify-center overflow-hidden shadow-sm">
            <img src="/rtsLogo.png" alt="RTS" className="w-8 h-8 object-cover"/>
          </span>
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-black text-[12px] whitespace-nowrap">App is Available Now</span>
          <span className="text-white/75 text-[9px] font-bold">Tap to install →</span>
        </span>
      </button>

      {/* ── Install popup ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            style={{ animation: "rts-slide-up 0.28s cubic-bezier(0.34,1.56,0.64,1)" }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/95 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden">
                  <img src="/rtsLogo.png" alt="RTS" className="w-9 h-9 object-contain"/>
                </div>
                <div>
                  <h2 className="text-white font-black text-[16px] leading-tight">TeleRTS Mobile App</h2>
                  <p className="text-white/80 text-[11px] font-bold mt-0.5">Follow these steps to install</p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="px-6 py-5 space-y-4">
              {steps.map(s => (
                <div key={s.n} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[12px] mt-0.5">
                    {s.n}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-[12px] leading-snug">{s.title}</p>
                    <p className="text-slate-500 text-[11px] font-medium mt-0.5 leading-relaxed">
                      {s.detail(currentUser?.email)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Note */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px]">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <p className="text-amber-700 font-medium leading-relaxed">
                  The app is <strong>invite-only</strong>. Play Store will show it only when you&apos;re signed in with your registered TeleRTS email address.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-[12px] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-xl text-white font-black text-[12px] flex items-center justify-center gap-1.5 shadow-lg transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)" }}
              >
                <span>Install Now</span>
                <span className="text-[14px]">→</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyframe animations (injected once) ───────────────────────────── */}
      <style>{`
        @keyframes rts-pulse-btn {
          0%, 100% { transform: scale(1); box-shadow: 0 10px 40px rgba(79,70,229,0.45); }
          50%       { transform: scale(1.04); box-shadow: 0 14px 48px rgba(6,182,212,0.55); }
        }
        @keyframes rts-ping {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes rts-slide-up {
          from { transform: translateY(32px) scale(0.96); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
