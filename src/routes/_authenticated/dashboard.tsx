import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { SendMoneyModal } from "@/components/send-money-modal";
import { VirtualCard } from "@/components/virtual-card";
import {
  accountQuery,
  cardsQuery,
  money,
  relativeTime,
  signedMoney,
  splitBalance,
  transactionsQuery,
  weeklySpend,
} from "@/lib/banking";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vaulta Banking" },
      {
        name: "description",
        content:
          "Your USD balance, weekly spending, recent transactions and virtual debit cards in one view.",
      },
      { property: "og:title", content: "Dashboard — Vaulta Banking" },
      {
        property: "og:description",
        content: "USD balance, weekly spending and virtual cards at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const press = "transition-all duration-150 active:scale-95";

function Dashboard() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<null | "out" | "in">(null);
  const [pending, setPending] = useState<null | "send" | "receive" | "cash">(null);
  const { data: account } = useQuery(accountQuery);
  const { data: cards } = useQuery(cardsQuery);
  const { data: transactions } = useQuery(transactionsQuery);

  const balance = splitBalance(account?.balance_cents ?? 0);
  const spend = weeklySpend(transactions ?? []);

  return (
    <AppShell>
      {/* balance hero */}
      <section>
        <div className="panel relative animate-rise overflow-hidden p-5">
          <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="label-caps">Total balance</p>
              <span className="rounded-full bg-accent-soft px-2 py-1 font-mono text-[10px] text-accent">
                {account?.currency ?? "USD"}
              </span>
            </div>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-display text-[56px] leading-none font-semibold">$</span>
              <span className="font-display text-[56px] leading-none font-semibold">
                {balance.whole}
              </span>
              <span className="mb-1 font-display text-[28px] leading-none font-medium">
                .{balance.frac}
              </span>
            </div>
            <p className="mt-3 font-mono text-[11px] text-faint">
              USD · {account?.name ?? "Checking"} {account?.account_number_last4 ?? "····"}
            </p>
          </div>
        </div>
      </section>

      {/* quick actions */}
      <section className="mt-4 grid grid-cols-3 gap-2">
        <QuickAction
          glyph="→"
          label="Send"
          delay="120ms"
          loading={pending === "send"}
          onClick={() => {
            setPending("send");
            window.setTimeout(() => {
              setPending(null);
              setModal("out");
            }, 350);
          }}
        />
        <QuickAction
          glyph="↓"
          label="Receive"
          delay="180ms"
          loading={pending === "receive"}
          onClick={() => {
            setPending("receive");
            window.setTimeout(() => {
              setPending(null);
              navigate({ to: "/finances" });
            }, 350);
          }}
        />
        <QuickAction
          glyph="+"
          label="Add Cash"
          delay="240ms"
          loading={pending === "cash"}
          onClick={() => {
            setPending("cash");
            window.setTimeout(() => {
              setPending(null);
              setModal("in");
            }, 350);
          }}
        />
      </section>

      {/* spending chart */}
      <section className="mt-5">
        <div className="panel animate-rise p-4 [animation-delay:300ms]">
          <div className="flex items-center justify-between">
            <p className="label-caps">Spending · 7 days</p>
            <p className="font-mono text-[11px]">{money(spend.total)}</p>
          </div>
          <div className="mt-4 flex h-28 items-end gap-2">
            {spend.days.map((day, index) => (
              <div key={day.key} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`w-full origin-bottom animate-grow rounded-t ${
                    day.isToday ? "bg-accent" : "bg-accent/40"
                  }`}
                  style={{
                    height: `${Math.max(6, (day.cents / spend.max) * 100)}%`,
                    animationDelay: `${320 + index * 40}ms`,
                  }}
                />
                <span
                  className={`font-mono text-[9px] ${day.isToday ? "text-accent" : "text-faint"}`}
                >
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* virtual card */}
      <section className="mt-5">
        <div className="mb-2 flex animate-rise items-center justify-between [animation-delay:600ms]">
          <p className="label-caps">Your card</p>
          <Link to="/cards" className="font-mono text-[11px] text-accent">
            Manage
          </Link>
        </div>
        {cards?.[0] ? (
          <VirtualCard card={cards[0]} className="animate-rise [animation-delay:640ms]" />
        ) : (
          <div className="panel p-4 text-sm text-muted">No virtual cards yet.</div>
        )}
      </section>

      {/* transactions */}
      <section className="mt-5">
        <p className="label-caps mb-2 animate-rise [animation-delay:700ms]">Recent activity</p>
        <div className="panel divide-y divide-border overflow-hidden">
          {(transactions ?? []).slice(0, 8).map((tx, index) => (
            <div
              key={tx.id}
              className="flex animate-rise items-center justify-between px-4 py-3"
              style={{ animationDelay: `${720 + index * 40}ms` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-9 place-items-center rounded-lg font-mono text-xs text-accent ${
                    tx.direction === "in" ? "bg-accent-soft" : "bg-surface-2"
                  }`}
                >
                  {tx.direction === "in" ? "↓" : tx.merchant.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-[13px] leading-tight font-semibold">{tx.merchant}</p>
                  <p className="text-[11px] text-muted">
                    {relativeTime(tx.occurred_at)}
                    {tx.status !== "completed" ? ` · ${tx.status}` : ""}
                  </p>
                </div>
              </div>
              <span
                className={`font-mono text-[13px] ${tx.direction === "in" ? "text-accent" : ""}`}
              >
                {signedMoney(tx.amount_cents, tx.direction)}
              </span>
            </div>
          ))}
          {(transactions ?? []).length === 0 && (
            <p className="px-4 py-6 text-sm text-muted">No transactions yet.</p>
          )}
        </div>
      </section>

      <SendMoneyModal
        open={modal !== null}
        direction={modal ?? "out"}
        onClose={() => setModal(null)}
      />

      <div className="h-6" />
    </AppShell>
  );
}

function QuickAction({
  glyph,
  label,
  delay,
  loading,
  onClick,
}: {
  glyph: string;
  label: string;
  delay: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`panel animate-rise px-3 py-3 text-left hover:bg-surface-2 disabled:opacity-70 ${press}`}
      style={{ animationDelay: delay }}
    >
      {loading ? (
        <span className="block size-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      ) : (
        <span className="font-mono text-xs text-accent">{glyph}</span>
      )}
      <p className="mt-2 text-[13px] font-semibold">{loading ? "Opening…" : label}</p>
    </button>
  );
}
