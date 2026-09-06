import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { VirtualCard } from "@/components/virtual-card";
import { supabase } from "@/integrations/supabase/client";
import { cardsQuery, type Card } from "@/lib/banking";

export const Route = createFileRoute("/_authenticated/cards")({
  head: () => ({
    meta: [
      { title: "Card Management — Vaulta Banking" },
      {
        name: "description",
        content:
          "Reveal virtual debit card details, copy the number, and freeze or unfreeze any card instantly.",
      },
      { property: "og:title", content: "Card Management — Vaulta Banking" },
      {
        property: "og:description",
        content: "Reveal details and freeze or unfreeze your virtual debit cards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  const { data: cards } = useQuery(cardsQuery);
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const toggleFreeze = useMutation({
    mutationFn: async (card: Card) => {
      const { error } = await supabase
        .from("cards")
        .update({ is_frozen: !card.is_frozen })
        .eq("id", card.id);
      if (error) throw error;
      return !card.is_frozen;
    },
    onSuccess: async (frozen) => {
      await queryClient.invalidateQueries({ queryKey: cardsQuery.queryKey });
      toast.success(frozen ? "Card frozen" : "Card unfrozen");
    },
    onError: () => toast.error("Could not update the card"),
  });

  return (
    <AppShell>
      <section>
        <p className="label-caps animate-rise">Virtual debit cards</p>
        <div className="mt-3 space-y-4">
          {(cards ?? []).map((card, index) => {
            const isRevealed = Boolean(revealed[card.id]);
            return (
              <div
                key={card.id}
                className="animate-rise"
                style={{ animationDelay: `${80 + index * 80}ms` }}
              >
                <VirtualCard card={card} revealed={isRevealed} />

                <div className="panel mt-2 divide-y divide-border">
                  <Row label="Number">
                    <span className="font-mono text-[13px]">
                      {isRevealed
                        ? card.number_full.replace(/(.{4})/g, "$1 ").trim()
                        : `•••• •••• •••• ${card.last4}`}
                    </span>
                  </Row>
                  <Row label="Expires">
                    <span className="font-mono text-[13px]">
                      {isRevealed
                        ? `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`
                        : "••/••"}
                    </span>
                  </Row>
                  <Row label="Security code">
                    <span className="font-mono text-[13px]">{isRevealed ? card.cvv : "•••"}</span>
                  </Row>
                  <Row label="Status">
                    <span
                      className={`font-mono text-[11px] tracking-[0.14em] uppercase ${
                        card.is_frozen ? "text-danger" : "text-accent"
                      }`}
                    >
                      {card.is_frozen ? "Frozen" : "Active"}
                    </span>
                  </Row>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRevealed((prev) => ({ ...prev, [card.id]: !prev[card.id] }))}
                    className="rounded-xl bg-surface-2 py-3 text-[13px] font-semibold ring-1 ring-border transition-colors hover:bg-surface"
                  >
                    {isRevealed ? "Hide details" : "Reveal details"}
                  </button>
                  <button
                    disabled={toggleFreeze.isPending}
                    onClick={() => toggleFreeze.mutate(card)}
                    className={`rounded-xl py-3 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                      card.is_frozen
                        ? "bg-accent text-accent-foreground"
                        : "bg-danger-soft text-danger ring-1 ring-border"
                    }`}
                  >
                    {card.is_frozen ? "Unfreeze card" : "Freeze card"}
                  </button>
                </div>
              </div>
            );
          })}

          {(cards ?? []).length === 0 && (
            <div className="panel p-5 text-sm text-muted">No virtual cards on this account yet.</div>
          )}
        </div>
      </section>

      <div className="h-6" />
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="label-caps">{label}</span>
      {children}
    </div>
  );
}
