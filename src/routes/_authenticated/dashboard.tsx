import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
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

function Dashboard() {
  const { data: account } = useQuery(accountQuery);
  const { data: cards } = useQuery(cardsQuery);
  const { data: transactions } = useQuery(transactionsQuery);

  const balance = splitBalance(account?.balance_cents ?? 0);
  const spend = weeklySpend(transactions ?? []);

  return (
    <AppShell>
      {/* balance hero */}
      <section className="px-5">
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
      <section className="mt-4 grid grid-cols-3 gap-2 px-5">
        <QuickAction to="/transfer" glyph="→" label="Send" delay="120ms" />
        <QuickAction to="/transfer" glyph="↓" label="Receive" delay="180ms" />
        <QuickAction to="/transfer" glyph="◈" label="Pay Bills" delay="240ms" />
      </section>

      {/* spending chart */}
      <section className="mt-5 px-5">
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
      <section className="mt-5 px-5">
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
      <section className="mt-5 px-5">
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

      <div className="h-6" />
    </AppShell>
  );
}

function QuickAction({
  to,
  glyph,
  label,
  delay,
}: {
  to: "/transfer";
  glyph: string;
  label: string;
  delay: string;
}) {
  return (
    <Link
      to={to}
      className="panel animate-rise px-3 py-3 transition-colors hover:bg-surface-2 active:translate-y-px"
      style={{ animationDelay: delay }}
    >
      <span className="font-mono text-xs text-accent">{glyph}</span>
      <p className="mt-2 text-[13px] font-semibold">{label}</p>
    </Link>
  );
}
