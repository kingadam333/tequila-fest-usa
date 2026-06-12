"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Share, Plus } from "lucide-react";

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [iosInstructions, setIosInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already installed as standalone — never show
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Dismissed within 7 days — skip
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
    setIsIos(ios);

    // Show immediately on iOS
    if (ios) {
      setVisible(true);
      return;
    }

    // Android/desktop Chrome — listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Also show on non-mobile so you can see it — button just opens instructions
    setVisible(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setIosInstructions(false);
    localStorage.setItem("pwa-banner-dismissed", String(Date.now()));
  };

  const handleInstall = async () => {
    if (isIos) {
      setIosInstructions(true);
      return;
    }
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setVisible(false);
      setInstalling(false);
      setDeferredPrompt(null);
      return;
    }
    // Desktop/unsupported — show instructions
    setIosInstructions(true);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop when instructions open */}
      {iosInstructions && (
        <div
          className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm"
          onClick={() => setIosInstructions(false)}
        />
      )}

      {/* iOS / Desktop instructions sheet */}
      {iosInstructions && (
        <div className="fixed bottom-0 left-0 right-0 z-[999] mx-auto max-w-sm pb-4 px-3">
          <div className="rounded-3xl bg-[#1a0a00] border border-yellow-500/30 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <p className="text-yellow-400 font-black text-base uppercase tracking-wider">Add to Home Screen</p>
              <button onClick={() => setIosInstructions(false)} className="text-white/40 hover:text-white/80 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <ol className="space-y-4">
              <li className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-yellow-400 font-bold text-sm">1</span>
                </div>
                <div className="flex items-center gap-2 text-white/70 text-sm flex-wrap">
                  Tap the{" "}
                  <span className="inline-flex items-center gap-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs font-semibold">
                    <Share size={11} /> Share
                  </span>{" "}
                  button in Safari
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-yellow-400 font-bold text-sm">2</span>
                </div>
                <div className="flex items-center gap-2 text-white/70 text-sm flex-wrap">
                  Tap{" "}
                  <span className="inline-flex items-center gap-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs font-semibold">
                    <Plus size={11} /> Add to Home Screen
                  </span>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-yellow-400 font-bold text-sm">3</span>
                </div>
                <p className="text-white/70 text-sm">
                  Tap <strong className="text-white">Add</strong> — you&apos;re in! 🎉
                </p>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Main banner */}
      {!iosInstructions && (
        <div className="fixed bottom-0 left-0 right-0 z-[997] px-3 pb-4 pointer-events-none">
          <div
            className="relative max-w-lg mx-auto rounded-2xl overflow-hidden pointer-events-auto shadow-2xl animate-slide-up"
            style={{
              background: "linear-gradient(135deg, #1a0800 0%, #2d1200 40%, #1a0800 100%)",
              border: "1px solid rgba(245,166,35,0.35)",
              boxShadow: "0 0 40px rgba(245,166,35,0.15), 0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            {/* Gold shimmer top line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #F5A623, #ff8c00, #F5A623, transparent)",
              }}
            />

            <div className="flex items-center gap-3 px-4 py-3.5">
              {/* Logo with glow */}
              <div className="relative flex-shrink-0">
                <div
                  className="absolute inset-0 rounded-xl blur-md opacity-50"
                  style={{ background: "radial-gradient(circle, #F5A623, transparent)" }}
                />
                <Image
                  src="/icons/icon-96x96.png"
                  alt="Tequila Fest"
                  width={50}
                  height={50}
                  className="relative rounded-xl"
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm leading-tight">
                  🌵 Take the Fest with you!
                </p>
                <p className="text-white/50 text-xs mt-0.5 leading-snug">
                  Install the app — tickets, lineup &amp; more
                </p>
              </div>

              {/* Install CTA */}
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex-shrink-0 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-150 active:scale-95 hover:brightness-110 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #F5A623, #ff8c00)",
                  color: "#000",
                  boxShadow: "0 4px 15px rgba(245,166,35,0.4)",
                }}
              >
                {installing ? "..." : "Install"}
              </button>

              {/* Dismiss */}
              <button
                onClick={dismiss}
                className="flex-shrink-0 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
