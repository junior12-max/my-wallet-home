import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { SupportModal } from "@/components/support-modal";
import { supabase } from "@/integrations/supabase/client";
import {
  accountQuery,
  initials,
  isAdminQuery,
  money,
  profileQuery,
  sendPasswordReset,
  updateProfileName,
} from "@/lib/banking";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — Vaulta Banking" },
      {
        name: "description",
        content:
          "Manage your Vaulta profile, review account details and security settings, and open the admin dashboard.",
      },
      { property: "og:title", content: "Profile & Settings — Vaulta Banking" },
      {
        property: "og:description",
        content: "Profile, account details, security settings and admin access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useQuery(profileQuery);
  const { data: account } = useQuery(accountQuery);
  const { data: isAdmin } = useQuery(isAdminQuery);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string>("");
  const [supportOpen, setSupportOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function requestReset() {
    setResetting(true);
    try {
      const to = await sendPasswordReset();
      toast.success(`Reset link sent to ${to}`);
    } catch {
      toast.error("Could not send the reset link");
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <section>
        <div className="panel flex animate-rise items-center gap-4 p-5">
          <span className="grid size-14 place-items-center rounded-full bg-accent-soft font-mono text-sm text-accent ring-1 ring-border">
            {initials(profile?.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-2xl leading-tight font-semibold">
                {profile?.full_name ?? "Vaulta member"}
              </p>
              <button
                onClick={() => setNameOpen(true)}
                aria-label="Edit your name"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-[11px] text-muted ring-1 ring-border transition-all duration-150 hover:text-foreground active:scale-95"
              >
                ✎
              </button>
            </div>
            <p className="truncate font-mono text-[11px] text-muted">{email || "—"}</p>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <p className="label-caps mb-2">Account</p>
        <div className="panel animate-rise divide-y divide-border [animation-delay:120ms]">
          <Row label="Account" value={account?.name ?? "Checking"} />
          <Row label="Number" value={`•••• ${account?.account_number_last4 ?? "····"}`} />
          <Row label="Balance" value={money(account?.balance_cents ?? 0)} />
            <Row
            label="Status"
            value={
              profile?.status === "suspended"
                ? "Suspended"
                : account?.is_frozen
                  ? "Frozen"
                  : "Active"
            }
          />
        </div>
      </section>

      <section className="mt-4">
        <p className="label-caps mb-2">Settings</p>
        <div className="panel animate-rise divide-y divide-border [animation-delay:180ms]">
          <NavRow to="/cards" label="Card security" hint="Freeze, reveal, limits" />
          <NavRow to="/finances" label="Statements & export" hint="Download CSV" />
          <NavRow to="/transfer" label="Transfers" hint="ACH, email, PayPal" />
          <button
            onClick={requestReset}
            disabled={resetting}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-all duration-150 hover:bg-surface-2 active:scale-95 disabled:opacity-60"
          >
            <div>
              <p className="text-[13px] font-semibold">Security &amp; password reset</p>
              <p className="text-[11px] text-muted">
                {resetting ? "Sending reset link…" : "Email me a password reset link"}
              </p>
            </div>
            <span className="font-mono text-faint">›</span>
          </button>
          <button
            onClick={() => setSupportOpen(true)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-all duration-150 hover:bg-surface-2 active:scale-95"
          >
            <div>
              <p className="text-[13px] font-semibold">Help &amp; customer support</p>
              <p className="text-[11px] text-muted">Contact our team, track requests</p>
            </div>
            <span className="font-mono text-faint">›</span>
          </button>
        </div>
      </section>

      {isAdmin && (
        <section className="mt-4">
          <p className="label-caps mb-2">Administration</p>
          <Link
            to="/admin"
            className="panel flex animate-rise items-center justify-between px-4 py-4 [animation-delay:220ms] transition-all duration-150 active:scale-95"
          >
            <div>
              <p className="text-[13px] font-semibold">Admin dashboard</p>
              <p className="text-[11px] text-muted">Users, global transactions, freezes</p>
            </div>
            <span className="font-mono text-accent">→</span>
          </Link>
        </section>
      )}

      <section className="mt-4">
        <button
          onClick={signOut}
          className="w-full rounded-xl bg-danger-soft py-3.5 text-[13px] font-semibold text-danger ring-1 ring-border transition-all duration-150 hover:bg-danger-soft/80 active:scale-95"
        >
          Sign out
        </button>
      </section>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />

      <div className="h-6" />
    </AppShell>
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

function NavRow({
  to,
  label,
  hint,
}: {
  to: "/cards" | "/finances" | "/transfer";
  label: string;
  hint: string;
}) {
  return (
    <Link to={to} className="flex items-center justify-between px-4 py-3.5 transition-all duration-150 hover:bg-surface-2 active:scale-95">
      <div>
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="text-[11px] text-muted">{hint}</p>
      </div>
      <span className="font-mono text-faint">›</span>
    </Link>
  );
}
