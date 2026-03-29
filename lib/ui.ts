const buttonTransition = "transition duration-200 hover:-translate-y-0.5";
const buttonFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]";
const darkPrimaryButtonSurface =
  "border border-white/14 bg-[linear-gradient(180deg,rgba(13,15,22,0.98),rgba(5,6,10,0.98))] text-white visited:text-white shadow-[0_18px_40px_rgba(0,0,0,0.34)]";
const darkPrimaryButtonInteractive =
  "hover:border-orange-300/55 hover:bg-[linear-gradient(180deg,rgba(28,31,43,0.98),rgba(10,11,17,0.98))] hover:text-white active:border-orange-300/65 active:bg-[linear-gradient(180deg,rgba(34,37,51,0.98),rgba(12,13,19,0.98))] active:text-white focus-visible:text-white";
const darkSecondaryButtonSurface = "border border-white/14 bg-white/[0.05] text-white/92 visited:text-white/92";
const darkSecondaryButtonInteractive =
  "hover:border-orange-300/45 hover:bg-orange-500/14 hover:text-white active:border-orange-300/55 active:bg-orange-500/18 active:text-white focus-visible:text-white";

export const navLinkClassName = "transition hover:text-orange-100";

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
