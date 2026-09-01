import type { Card } from "@/lib/banking";

export function VirtualCard({
  card,
  revealed = false,
  className = "",
}: {
  card: Card;
  revealed?: boolean;
  className?: string;
}) {
  const grouped = card.number_full.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div
      className={`group relative h-36 overflow-hidden rounded-[18px] bg-gradient-to-br from-[hsl(260_24%_20%)] via-[hsl(258_28%_15%)] to-[hsl(262_30%_11%)] p-4 ring-1 ring-border ${
        card.is_frozen ? "opacity-60 saturate-50" : ""
      } ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-gradient-to-r from-transparent via-[hsl(38_72%_58%_/_0.12)] to-transparent group-hover:animate-sheen" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <p className="font-display text-lg italic">{card.brand}</p>
          <span className="font-mono text-[10px] tracking-[0.2em] text-accent uppercase">
            {card.is_frozen ? "Frozen" : card.label}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <span className="font-mono text-sm tracking-[0.18em] text-foreground/90">
            {revealed ? grouped : `•••• ${card.last4}`}
          </span>
          <span className="font-mono text-[10px] text-muted">{card.cardholder_name}</span>
        </div>
      </div>
    </div>
  );
}
