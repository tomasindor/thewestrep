interface ComboBadgeProps {
  comboEligible?: boolean;
  pairedProductName?: string;
}

export function ComboBadge({ comboEligible, pairedProductName }: ComboBadgeProps) {
  if (!comboEligible) {
    return null;
  }

  return (
    <span
      className="rounded-full border border-[rgba(210,138,163,0.35)] bg-[rgba(210,138,163,0.12)] px-3 py-1 text-[11px] font-medium tracking-[0.16em] text-[#f6dbe4] uppercase"
      title={pairedProductName ? `Ahorrá 30% combinando con ${pairedProductName}` : "Ahorrá 30% combinando con su par del look"}
    >
      Combo disponible
    </span>
  );
}
