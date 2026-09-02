import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  adminAccountsQuery,
  adminProfilesQuery,
  adminTransactionsQuery,
  isAdminQuery,
  money,
  relativeTime,
  signedMoney,
  type AdminAccount,
} from "@/lib/banking";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Vaulta Banking" },
      {
        name: "description",
        content:
          "Vaulta administration: manage members, review every transaction, and freeze or unfreeze accounts.",
      },
      { property: "og:title", content: "Admin Dashboard — Vaulta Banking" },
      {
        property: "og:description",
        content: "Manage members, review global transactions and toggle account freezes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: isAdmin, isLoading } = useQuery(isAdminQuery);

  if (isLoading) {
    return (
      <AppShell>
        <p className="px-5 text-sm text-muted">Checking permissions…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <section className="px-5">
          <div className="panel p-5">
            <p className="label-caps">Restricted</p>
            <p className="mt-2 text-sm text-muted">
              This area is limited to Vaulta administrators.
            </p>
            <Link to="/dashboard" className="mt-4 inline-block font-mono text-[12px] text-accent">
              ← Back to home
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return <AdminConsole />;
}

function AdminConsole() {
  const queryClient = useQueryClient();
  const { data: accounts } = useQuery(adminAccountsQuery);
  const { data: profiles } = useQuery(adminProfilesQuery);
  const { data: transactions } = useQuery(adminTransactionsQuery);

  const nameFor = (userId: string) =>
    (profiles ?? []).find((p) => p.id === userId)?.full_name ?? "Unnamed member";

  const toggleFreeze = useMutation({
    mutationFn: async (account: AdminAccount) => {
      const { error } = await supabase
        .from("accounts")
        .update({ is_frozen: !account.is_frozen })
        .eq("id", account.id);
      if (error) throw error;
      return !account.is_frozen;
    },
    onSuccess: async (frozen) => {
      await queryClient.invalidateQueries({ queryKey: adminAccountsQuery.queryKey });
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success(frozen ? "Account frozen" : "Account unfrozen");
    },
    onError: () => toast.error("Could not update the account"),
  });

  const totalHeld = (accounts ?? []).reduce((sum, a) => sum + a.balance_cents, 0);

  return (
    <AppShell>
      <section className="px-5">
        <div className="panel animate-rise p-5">
          <p className="label-caps">Admin console</p>
          <p className="mt-2 font-display text-[38px] leading-none font-semibold">
            {money(totalHeld)}
          </p>
          <p className="mt-2 font-mono text-[11px] text-faint">
            {(profiles ?? []).length} members · {(accounts ?? []).length} accounts ·{" "}
            {(transactions ?? []).length} transactions
          </p>
        </div>
      </section>

      <section className="mt-4 px-5">
        <p className="label-caps mb-2">Members & accounts</p>
        <div className="panel divide-y divide-border">
          {(accounts ?? []).map((account) => (
            <div key={account.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{nameFor(account.user_id)}</p>
                  <p className="font-mono text-[10px] text-muted">
                    {account.name} •••• {account.account_number_last4} ·{" "}
                    {money(account.balance_cents)}
                  </p>
                </div>
                <button
                  disabled={toggleFreeze.isPending}
                  onClick={() => toggleFreeze.mutate(account)}
                  className={`shrink-0 rounded-lg px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase disabled:opacity-50 ${
                    account.is_frozen
                      ? "bg-accent text-accent-foreground"
                      : "bg-danger-soft text-danger ring-1 ring-border"
                  }`}
                >
                  {account.is_frozen ? "Unfreeze" : "Freeze"}
                </button>
              </div>
            </div>
          ))}
          {(accounts ?? []).length === 0 && (
            <p className="px-4 py-6 text-sm text-muted">No accounts found.</p>
          )}
        </div>
      </section>

      <section className="mt-4 px-5">
        <p className="label-caps mb-2">Global transactions</p>
        <div className="panel divide-y divide-border">
          {(transactions ?? []).slice(0, 40).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{tx.merchant}</p>
                <p className="truncate font-mono text-[10px] text-muted">
                  {nameFor(tx.user_id)} · {relativeTime(tx.occurred_at)}
                </p>
              </div>
              <span
                className={`shrink-0 font-mono text-[13px] ${tx.direction === "in" ? "text-accent" : ""}`}
              >
                {signedMoney(tx.amount_cents, tx.direction)}
              </span>
            </div>
          ))}
          {(transactions ?? []).length === 0 && (
            <p className="px-4 py-6 text-sm text-muted">No transactions recorded.</p>
          )}
        </div>
      </section>

      <div className="h-6" />
    </AppShell>
  );
}
