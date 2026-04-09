const buttonTransition = "transition duration-200 hover:-translate-y-0.5";
const buttonFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.62)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]";
const darkPrimaryButtonSurface =
  "border border-white/14 bg-[linear-gradient(180deg,rgba(13,15,22,0.98),rgba(5,6,10,0.98))] text-white visited:text-white shadow-[0_18px_40px_rgba(0,0,0,0.34)]";
const darkPrimaryButtonInteractive =
  "hover:border-[rgba(210,138,163,0.56)] hover:bg-[linear-gradient(180deg,rgba(36,28,36,0.98),rgba(12,10,16,0.98))] hover:text-white active:border-[rgba(210,138,163,0.68)] active:bg-[linear-gradient(180deg,rgba(42,31,40,0.98),rgba(14,11,18,0.98))] active:text-white focus-visible:text-white";
const darkSecondaryButtonSurface = "border border-white/14 bg-white/[0.05] text-white/92 visited:text-white/92";
const darkSecondaryButtonInteractive =
  "hover:border-[rgba(210,138,163,0.42)] hover:bg-[rgba(210,138,163,0.12)] hover:text-white active:border-[rgba(210,138,163,0.54)] active:bg-[rgba(210,138,163,0.16)] active:text-white focus-visible:text-white";

// ─── Input styles ────────────────────────────────────────────────
export const inputClassName =
  "w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-[rgba(210,138,163,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(210,138,163,0.24)]";

// ─── Surface variants ────────────────────────────────────────────
export const surfaceClassName =
  "rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6";
export const modalSurfaceClassName =
  "rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-7";
export const heroSurfaceClassName =
  "rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,23,0.96),rgba(6,7,11,0.96))] p-6 sm:p-8";

// ─── Eyebrow typography ─────────────────────────────────────────
export const eyebrowClassName =
  "text-xs font-medium tracking-[0.32em] uppercase";
export const eyebrowAccentClassName =
  `${eyebrowClassName} text-[#f1d2dc]/72`;

// ─── Error/feedback ─────────────────────────────────────────────
export const errorInputClassName =
  "border-red-300/30 bg-red-500/10 text-red-100";
export const feedbackSuccessClassName =
  "border-emerald-300/30 bg-emerald-500/10 text-emerald-100";

export const navLinkClassName = "transition hover:text-[#f4d7e0]";

export const solidCtaClassName = [
  "inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold",
  darkPrimaryButtonSurface,
  buttonTransition,
  buttonFocusRing,
  darkPrimaryButtonInteractive,
].join(" ");

export const compactSolidCtaClassName = [
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium",
  darkPrimaryButtonSurface,
  buttonTransition,
  buttonFocusRing,
  darkPrimaryButtonInteractive,
].join(" ");

export const ghostCtaClassName = [
  "inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold",
  darkSecondaryButtonSurface,
  buttonTransition,
  buttonFocusRing,
  darkSecondaryButtonInteractive,
].join(" ");

export const compactGhostCtaClassName = [
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium",
  darkSecondaryButtonSurface,
  buttonTransition,
  buttonFocusRing,
  darkSecondaryButtonInteractive,
].join(" ");

export const filterGhostCtaClassName = [
  darkSecondaryButtonSurface,
  buttonTransition,
  buttonFocusRing,
  darkSecondaryButtonInteractive,
].join(" ");

export const filterSolidCtaClassName = [
  darkPrimaryButtonSurface,
  buttonTransition,
  buttonFocusRing,
  darkPrimaryButtonInteractive,
].join(" ");
