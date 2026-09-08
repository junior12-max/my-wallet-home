import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  adminAccountsQuery,
  adminProfilesQuery,
  adminTicketsQuery,
  adminTransactionsQuery,
  isAdminQuery,
  money,
  relativeTime,
  setAccountBalance,
  setMemberStatus,
  setTicketStatus,
  signedMoney,
  type AdminAccount,
} from "@/lib/banking";
import { listMemberEmails } from "@/lib/support.functions";

const press = "transition-all duration-150 active:scale-95";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Vaulta Banking" },
      {
        name: "description",
        content:
          "Vaulta administration: manage members, adjust balances, suspend accounts and work the support ticket queue.",
      },
      { property: "og:title", content: "Admin Dashboard — Vaulta Banking" },
      {
        property: "og:description",
        content: "Manage members, balances, suspensions and support tickets.",
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAdmin === false) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, isLoading, navigate]);

  if (isLoading || !isAdmin) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Checking permissions…</p>
      </AppShell>
    );
  }

  return <AdminConsole />;
}

function AdminConsole() {
  const [tab, setTab] = useState<"users" | "tickets" | "activity">("users");

  return (
    <AppShell>
      <Overview />

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(["users", "tickets", "activity"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-3 py-2.5 font-mono text-[10px] tracking-[0.14em] uppercase ring-1 ring-border ${press} ${
              tab === t ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "tickets" && <TicketsTab />}
      {tab === "activity" && <ActivityTab />}

      <div className="h-6" />
    </AppShell>
  );
}

function Overview() {
  const { data: accounts } = useQuery(adminAccountsQuery);
  const { data: profiles } = useQuery(adminProfilesQuery);
  const { data: tickets } = useQuery(adminTicketsQuery);
  const totalHeld = (accounts ?? []).reduce((sum, a) => sum + a.balance_cents, 0);
  const openTickets = (tickets ?? []).filter((t) => t.status === "open").length;

  return (
    <section>
      <div className="panel animate-rise p-5">
        <p className="label-caps">Admin console</p>
        <p className="mt-2 font-display text-[38px] leading-none font-semibold">
          {money(totalHeld)}
        </p>
        <p className="mt-2 font-mono text-[11px] text-faint">
          {(profiles ?? []).length} members · {(accounts ?? []).length} accounts · {openTickets} open
          tickets
        </p>
      </div>
    </section>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const { data: accounts } = useQuery(adminAccountsQuery);
  const { data: profiles } = useQuery(adminProfilesQuery);
  const fetchEmails = useServerFn(listMemberEmails);
  const { data: emails } = useQuery({
    queryKey: ["admin", "emails"],
    queryFn: () => fetchEmails({}),
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const profileFor = (userId: string) => (profiles ?? []).find((p) => p.id === userId);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: adminAccountsQuery.queryKey });
    await queryClient.invalidateQueries({ queryKey: adminProfilesQuery.queryKey });
    await queryClient.invalidateQueries({ queryKey: ["account"] });
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

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
      await refresh();
      toast.success(frozen ? "Account frozen" : "Account unfrozen");
    },
    onError: () => toast.error("Could not update the account"),
  });

  const toggleStatus = useMutation({
    mutationFn: async (input: { userId: string; suspended: boolean }) => {
      await setMemberStatus(input.userId, input.suspended ? "active" : "suspended");
      return !input.suspended;
    },
    onSuccess: async (suspended) => {
      await refresh();
      toast.success(suspended ? "Member suspended" : "Member reactivated");
    },
    onError: () => toast.error("Could not update the member"),
  });

  const saveBalance = useMutation({
    mutationFn: async (input: { accountId: string; value: string }) => {
      const parsed = Number(input.value.replace(/[^0-9.\-]/g, ""));
      if (!Number.isFinite(parsed)) throw new Error("Invalid amount");
      await setAccountBalance(input.accountId, Math.round(parsed * 100));
    },
    onSuccess: async () => {
      setEditing(null);
      setAmount("");
      await refresh();
      toast.success("Balance updated");
    },
    onError: () => toast.error("Enter a valid amount"),
  });

  return (
    <section className="mt-4">
      <p className="label-caps mb-2">Members</p>
      <div className="panel divide-y divide-border">
        {(accounts ?? []).map((account) => {
          const profile = profileFor(account.user_id);
          const suspended = profile?.status === "suspended";
          return (
            <div key={account.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">
                    {profile?.full_name ?? "Unnamed member"}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted">
                    {emails?.[account.user_id] ?? "—"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-faint">
                    {account.name} •••• {account.account_number_last4} · joined{" "}
                    {new Date(account.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase ring-1 ring-border ${
                    suspended ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"
                  }`}
                >
                  {suspended ? "Suspended" : "Active"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {editing === account.id ? (
                  <>
                    <input
                      autoFocus
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={(account.balance_cents / 100).toFixed(2)}
                      className="w-28 rounded-lg bg-surface-2 px-2 py-2 font-mono text-[12px] ring-1 ring-border outline-none focus:ring-accent"
                    />
                    <button
                      disabled={saveBalance.isPending}
                      onClick={() => saveBalance.mutate({ accountId: account.id, value: amount })}
                      className={`rounded-lg bg-accent px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase text-accent-foreground disabled:opacity-50 ${press}`}
                    >
                      {saveBalance.isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(null);
                        setAmount("");
                      }}
                      className={`rounded-lg bg-surface-2 px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase text-muted ring-1 ring-border ${press}`}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditing(account.id);
                      setAmount((account.balance_cents / 100).toFixed(2));
                    }}
                    className={`rounded-lg bg-surface-2 px-3 py-2 font-mono text-[11px] text-foreground ring-1 ring-border hover:bg-surface ${press}`}
                  >
                    {money(account.balance_cents)} · edit
                  </button>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  disabled={toggleStatus.isPending}
                  onClick={() =>
                    toggleStatus.mutate({ userId: account.user_id, suspended: !!suspended })
                  }
                  className={`rounded-lg px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase disabled:opacity-50 ${press} ${
                    suspended
                      ? "bg-accent text-accent-foreground"
                      : "bg-danger-soft text-danger ring-1 ring-border"
                  }`}
                >
                  {suspended ? "Reactivate" : "Suspend"}
                </button>
                <button
                  disabled={toggleFreeze.isPending}
                  onClick={() => toggleFreeze.mutate(account)}
                  className={`rounded-lg bg-surface-2 px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase text-muted ring-1 ring-border disabled:opacity-50 ${press}`}
                >
                  {account.is_frozen ? "Unfreeze account" : "Freeze account"}
                </button>
              </div>
            </div>
          );
        })}
        {(accounts ?? []).length === 0 && (
          <p className="px-4 py-6 text-sm text-muted">No accounts found.</p>
        )}
      </div>
    </section>
  );
}

const ticketFilters = [
  { id: "open", label: "Open" },
  { id: "pending", label: "Pending" },
  { id: "resolved", label: "Resolved" },
] as const;

function TicketsTab() {
  const queryClient = useQueryClient();
  const { data: tickets } = useQuery(adminTicketsQuery);
  const { data: profiles } = useQuery(adminProfilesQuery);
  const [filter, setFilter] = useState<"open" | "pending" | "resolved">("open");

  const move = useMutation({
    mutationFn: async (input: { id: string; status: string }) =>
      setTicketStatus(input.id, input.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminTicketsQuery.queryKey });
      toast.success("Ticket updated");
    },
    onError: () => toast.error("Could not update the ticket"),
  });

  const visible = (tickets ?? []).filter((t) => t.status === filter);
  const nameFor = (userId: string) =>
    (profiles ?? []).find((p) => p.id === userId)?.full_name ?? "Unnamed member";

  return (
    <section className="mt-4">
      <div className="mb-2 flex gap-2">
        {ticketFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase ring-1 ring-border ${press} ${
              filter === f.id ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted"
            }`}
          >
            {f.label} ({(tickets ?? []).filter((t) => t.status === f.id).length})
          </button>
        ))}
      </div>

      <div className="panel divide-y divide-border">
        {visible.map((ticket) => (
          <div key={ticket.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{ticket.subject}</p>
                <p className="truncate font-mono text-[10px] text-muted">
                  {nameFor(ticket.user_id)} · {ticket.category} · {relativeTime(ticket.created_at)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[12px] whitespace-pre-wrap text-muted">{ticket.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["open", "pending", "resolved"] as const)
                .filter((s) => s !== ticket.status)
                .map((s) => (
                  <button
                    key={s}
                    disabled={move.isPending}
                    onClick={() => move.mutate({ id: ticket.id, status: s })}
                    className={`rounded-lg bg-surface-2 px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase text-muted ring-1 ring-border disabled:opacity-50 ${press}`}
                  >
                    Mark {s}
                  </button>
                ))}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted">No {filter} tickets.</p>
        )}
      </div>
    </section>
  );
}

function ActivityTab() {
  const { data: transactions } = useQuery(adminTransactionsQuery);
  const { data: profiles } = useQuery(adminProfilesQuery);
  const nameFor = (userId: string) =>
    (profiles ?? []).find((p) => p.id === userId)?.full_name ?? "Unnamed member";

  return (
    <section className="mt-4">
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
  );
}
