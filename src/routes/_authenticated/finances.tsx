import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import {
  accountQuery,
  downloadTransactionsCsv,
  money,
  relativeTime,
  signedMoney,
  splitBalance,
  transactionsQuery,
  weeklySpend,
} from "@/lib/banking";

export const Route = createFileRoute("/_authenticated/finances")({
  head: () => ({
    meta: [
      { title: "Finances — Vaulta Banking" },
      {
        name: "description",
        content:
          "Balance insights, money in and out, ACH account and routing details, and a CSV export of your Vaulta transaction history.",
      },
      { property: "og:title", content: "Finances — Vaulta Banking" },
      {
        property: "og:description",
        content: "Balance insights, account and routing details, and CSV transaction export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinancesPage,
});

function FinancesPage() {
  const { data: account } = useQuery(accountQuery);
  const { data: transactions } = useQuery(transactionsQuery);

  const list = transactions ?? [];
  const balance = splitBalance(account?.balance_cents ?? 0);
  const spend = weeklySpend(list);
  const inflow = list
    .filter((tx) => tx.direction === "in")
    .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);
  const outflow = list
    .filter((tx) => tx.direction === "out")
    .reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);

  function exportCsv() {
    if (list.length === 0) {
      toast.error("No transactions to export yet");
      return;
    }
    downloadTransactionsCsv(list);
    toast.success(`Exported ${list.length} transactions`);
  }

  return (
    <AppShell>
      <section className="px-5">
        <div className="panel animate-rise p-5">
          <p className="label-caps">Available balance</p>
          <div className="mt-2 flex items-end gap-1">
            <span className="font-display text-[46px] leading-none font-semibold">
              ${balance.whole}
            </span>
            <span className="mb-1 font-display text-[24px] leading-none">.{balance.frac}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="Money in" value={money(inflow)} accent />
            <Stat label="Money out" value={money(outflow)} />
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <div className="panel animate-rise p-4 [animation-delay:120ms]">
          <div className="flex items-center justify-between">
            <p className="label-caps">Spending · 7 days</p>
            <p className="font-mono text-[11px]">{money(spend.total)}</p>
          </div>
          <div className="mt-4 flex h-24 items-end gap-2">
            {spend.days.map((day, index) => (
              <div key={day.key} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`w-full origin-bottom animate-grow rounded-t ${
                    day.isToday ? "bg-accent" : "bg-accent/40"
                  }`}
                  style={{
                    height: `${Math.max(6, (day.cents / spend.max) * 100)}%`,
                    animationDelay: `${160 + index * 40}ms`,
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

      <section className="mt-4 px-5">
        <p className="label-caps mb-2 animate-rise [animation-delay:200ms]">Account details</p>
        <div className="panel animate-rise divide-y divide-border [animation-delay:240ms]">
          <Row label="Account name" value={account?.name ?? "Checking"} />
          <Row label="Account number" value={`•••• ${account?.account_number_last4 ?? "····"}`} />
          <Row label="Routing (ACH)" value={account?.routing_number ?? "—"} />
          <Row label="Currency" value={account?.currency ?? "USD"} />
          <Row label="Status" value={account?.is_frozen ? "Frozen" : "Active"} />
        </div>
      </section>

      <section className="mt-4 px-5">
        <button
          onClick={exportCsv}
          className="w-full animate-rise rounded-xl bg-accent py-3.5 text-[13px] font-semibold text-accent-foreground transition-opacity [animation-delay:280ms] active:opacity-80"
        >
          Download CSV
        </button>
        <p className="mt-2 font-mono text-[10px] text-faint">
          Exports your full transaction history as a spreadsheet-ready file.
        </p>
      </section>

      <section className="mt-5 px-5">
        <p className="label-caps mb-2">Transaction history</p>
        <div className="panel divide-y divide-border overflow-hidden">
          {list.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13px] leading-tight font-semibold">{tx.merchant}</p>
                <p className="text-[11px] text-muted">
                  {relativeTime(tx.occurred_at)} · {tx.method}
                </p>
              </div>
              <span
                className={`font-mono text-[13px] ${tx.direction === "in" ? "text-accent" : ""}`}
              >
                {signedMoney(tx.amount_cents, tx.direction)}
              </span>
            </div>
          ))}
          {list.length === 0 && <p className="px-4 py-6 text-sm text-muted">No transactions yet.</p>}
        </div>
      </section>

      <div className="h-6" />
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-3">
      <p className="label-caps">{label}</p>
      <p className={`mt-1 font-mono text-[13px] ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="label-caps">{label}</span>
      <span className="font-mono text-[13px]">{value}</span>
    </div>
  );
}
