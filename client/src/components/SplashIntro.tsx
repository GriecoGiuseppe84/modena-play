import React, { useEffect, useMemo, useState } from "react";

type Props = {
  onDone?: () => void;
  once?: boolean;
  totalMs?: number;
  logoSrc?: string;
};

const LS_KEY = "modenaplay_splash_seen_v1";

export default function SplashIntro({
  onDone,
  once = true,
  totalMs = 3600,
  logoSrc = "/logos/modenaplay_logo.png",
}: Props) {
  const [visible, setVisible] = useState(true);

  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (once && localStorage.getItem(LS_KEY) === "1") {
      setVisible(false);
      onDone?.();
      return;
    }

    if (reduceMotion) {
      const t = setTimeout(() => {
        if (once) localStorage.setItem(LS_KEY, "1");
        setVisible(false);
        onDone?.();
      }, 400);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      if (once) localStorage.setItem(LS_KEY, "1");
      setVisible(false);
      onDone?.();
    }, totalMs);

    return () => clearTimeout(t);
  }, [once, totalMs, onDone, reduceMotion]);

  if (!visible) return null;

  return (
    <div className="mp-splash">
      <div className="mp-splash__bg" />
      <div className="mp-splash__stars" />

      <div className="mp-splash__stage">
        <div className="mp-splash__piece mp-splash__piece--d20"><D20 /></div>
        <div className="mp-splash__piece mp-splash__piece--sword"><Sword /></div>
        <div className="mp-splash__piece mp-splash__piece--hat"><Hat /></div>
        <div className="mp-splash__piece mp-splash__piece--d6"><D6 /></div>
        <div className="mp-splash__piece mp-splash__piece--meeple"><Meeple /></div>

        <div className="mp-splash__logoWrap">
          <img src={logoSrc} alt="Modena Play" className="mp-splash__logo" />
        </div>

        <div className="mp-splash__tag">Modena Play</div>
      </div>

      <button
        className="mp-splash__skip"
        onClick={() => {
          if (once) localStorage.setItem(LS_KEY, "1");
          setVisible(false);
          onDone?.();
        }}
      >
        Skip
      </button>
    </div>
  );
}

/* ---------------- ICONS (SVG inline, ultra leggeri) ---------------- */

const D20 = () => (
  <svg viewBox="0 0 64 64" className="mp-ico">
    <path d="M32 6 56 20 52 46 32 58 12 46 8 20 32 6Z" className="mp-ico__stroke"/>
    <path d="M32 6 32 58" className="mp-ico__stroke" opacity=".5"/>
    <path d="M8 20 56 20" className="mp-ico__stroke" opacity=".5"/>
  </svg>
);

const D6 = () => (
  <svg viewBox="0 0 64 64" className="mp-ico">
    <rect x="14" y="14" width="36" height="36" rx="6" className="mp-ico__stroke"/>
    <circle cx="24" cy="24" r="2.4" className="mp-ico__dot"/>
    <circle cx="40" cy="40" r="2.4" className="mp-ico__dot"/>
  </svg>
);

const Sword = () => (
  <svg viewBox="0 0 64 64" className="mp-ico">
    <path d="M40 10 54 24 32 46 26 40 40 10Z" className="mp-ico__stroke"/>
    <path d="M26 40 10 54" className="mp-ico__stroke"/>
  </svg>
);

const Hat = () => (
  <svg viewBox="0 0 64 64" className="mp-ico">
    <path d="M22 44 32 10 42 44" className="mp-ico__stroke"/>
    <path d="M18 46c10 6 18 6 28 0" className="mp-ico__stroke"/>
  </svg>
);

const Meeple = () => (
  <svg viewBox="0 0 64 64" className="mp-ico">
    <path d="M32 16c4 0 7 3 7 7 0 2-1 4-2 5l6 6c2 2 2 5 0 7l-2 2-5-5-4 8h-8l-4-8-5 5-2-2c-2-2-2-5 0-7l6-6c-1-1-2-3-2-5 0-4 3-7 7-7Z" className="mp-ico__stroke"/>
  </svg>
);
