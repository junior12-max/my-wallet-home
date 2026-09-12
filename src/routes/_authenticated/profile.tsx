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
      {nameOpen && (
        <NameModal
          firstName={profile?.first_name ?? ""}
          lastName={profile?.last_name ?? ""}
          onClose={() => setNameOpen(false)}
          onSaved={async () => {
            await queryClient.invalidateQueries({ queryKey: profileQuery.queryKey });
            setNameOpen(false);
          }}
        />
      )}

      <div className="h-6" />
    </AppShell>
  );
}


function NameModal({
  firstName,
  lastName,
  onClose,
  onSaved,
}: {
  firstName: string;
  lastName: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  async function save() {
    if (first.trim().length < 2) {
      toast.error("Enter your first name");
      return;
    }
    setSaving(true);
    try {
      await updateProfileName(first, last);
      await queryClient.refetchQueries({ queryKey: profileQuery.queryKey });
      toast.success("Name updated");
      await onSaved();
    } catch (err: any) {
      const msg = err?.message || err?.error_description || JSON.stringify(err);
      alert(`Update Error: ${msg}`);
      toast.error("Could not update your name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl"
        role="dialog"
        aria-label="Edit your name"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="label-caps">Your name</p>
            <p className="mt-1 font-display text-2xl leading-tight font-semibold">Edit name</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full bg-surface-2 font-mono text-muted ring-1 ring-border transition-all duration-150 hover:text-foreground active:scale-95"
          >
            ✕
          </button>
        </div>

        <label className="label-caps mt-4 block">First name</label>
        <input
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder="Ndunagum"
          className="mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-[13px] ring-1 ring-border outline-none focus:ring-accent"
        />

        <label className="label-caps mt-3 block">Last name</label>
        <input
          value={last}
          onChange={(e) => setLast(e.target.value)}
          placeholder="Joshua"
          className="mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-[13px] ring-1 ring-border outline-none focus:ring-accent"
        />

        <button
          onClick={save}
          disabled={saving}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-[13px] font-semibold text-accent-foreground transition-all duration-150 active:scale-95 disabled:opacity-60"
        >
          {saving && (
            <span className="size-3.5 animate-spin rounded-full border-2 border-accent-foreground/40 border-t-accent-foreground" />
          )}
          {saving ? "Saving…" : "Save name"}
        </button>
      </div>
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
