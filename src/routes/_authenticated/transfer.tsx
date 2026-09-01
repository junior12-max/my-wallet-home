import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { accountQuery, money, recordTransfer } from "@/lib/banking";

export const Route = createFileRoute("/_authenticated/transfer")({
  head: () => ({
    meta: [
      { title: "Send & Receive — Vaulta Banking" },
      {
        name: "description",
        content:
          "Move USD by US bank ACH transfer, send to an email or phone number, or start a PayPal payout.",
      },
      { property: "og:title", content: "Send & Receive — Vaulta Banking" },
      {
        property: "og:description",
        content: "ACH transfers, email and phone payments, and PayPal payouts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransferPage,
});

type Tab = "ach" | "contact" | "paypal";

const tabs: { id: Tab; label: string }[] = [
  { id: "ach", label: "ACH" },
  { id: "contact", label: "Email / Phone" },
  { id: "paypal", label: "PayPal" },
];

function TransferPage() {
  const { data: account } = useQuery(accountQuery);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("ach");
  const [busy, setBusy] = useState(false);

  // ACH
  const [beneficiary, setBeneficiary] = useState("");
  const [routing, setRouting] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [achAmount, setAchAmount] = useState("");

  // Email / phone
  const [handle, setHandle] = useState("");
  const [contactAmount, setContactAmount] = useState("");
  const [contactDirection, setContactDirection] = useState<"in" | "out">("out");

  // PayPal
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalAmount, setPaypalAmount] = useState("");

  async function submit(
    merchant: string,
    amountRaw: string,
    method: string,
    direction: "in" | "out",
    status = "completed",
  ) {
    if (!account) return;
    const amountCents = Math.round(Number(amountRaw) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (direction === "out" && amountCents > account.balance_cents) {
      toast.error("Insufficient balance");
      return;
    }
    setBusy(true);
    try {
      await recordTransfer({
        accountId: account.id,
        balanceCents: account.balance_cents,
        merchant,
        amountCents,
        direction,
        method,
        status,
      });
      await queryClient.invalidateQueries();
      toast.success(
        status === "pending"
          ? `Payout of ${money(amountCents)} queued`
          : `${direction === "in" ? "Request" : "Transfer"} of ${money(amountCents)} recorded`,
      );
      setAchAmount("");
      setContactAmount("");
      setPaypalAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <section className="px-5">
        <div className="panel animate-rise p-5">
          <p className="label-caps">Available to send</p>
          <p className="mt-2 font-display text-4xl leading-none font-semibold">
            {money(account?.balance_cents ?? 0)}
          </p>
          <p className="mt-2 font-mono text-[11px] text-faint">
            Routing {account?.routing_number ?? "—"} · Account ····
            {account?.account_number_last4 ?? "····"}
          </p>
        </div>
      </section>

      <section className="mt-4 px-5">
        <div className="flex gap-1 rounded-full bg-surface p-1 ring-1 ring-border">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-full py-2 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors ${
                tab === item.id ? "bg-accent text-accent-foreground" : "text-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 px-5">
        {tab === "ach" && (
          <div className="panel animate-rise space-y-3 p-5">
            <p className="label-caps">US bank ACH transfer</p>
            <Field
              label="Beneficiary name"
              value={beneficiary}
              onChange={setBeneficiary}
              placeholder="Jordan Okafor"
            />
            <Field
              label="Routing number"
              value={routing}
              onChange={setRouting}
              placeholder="021000021"
              inputMode="numeric"
            />
            <Field
              label="Account number"
              value={accountNumber}
              onChange={setAccountNumber}
              placeholder="000123456789"
              inputMode="numeric"
            />
            <Field
              label="Amount (USD)"
              value={achAmount}
              onChange={setAchAmount}
              placeholder="1200.00"
              inputMode="decimal"
            />
            <button
              disabled={busy || !beneficiary || routing.length < 9 || accountNumber.length < 4}
              onClick={() => submit(`ACH · ${beneficiary}`, achAmount, "ach", "out")}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-40"
            >
              Send ACH transfer
            </button>
            <p className="font-mono text-[10px] text-faint">
              Same-day ACH cut-off 16:30 ET · no fee on standard transfers
            </p>
          </div>
        )}

        {tab === "contact" && (
          <div className="panel animate-rise space-y-3 p-5">
            <p className="label-caps">Send or request by email / phone</p>
            <div className="flex gap-1 rounded-full bg-surface-2 p-1">
              {(["out", "in"] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setContactDirection(dir)}
                  className={`flex-1 rounded-full py-2 text-[12px] font-semibold transition-colors ${
                    contactDirection === dir ? "bg-accent text-accent-foreground" : "text-muted"
                  }`}
                >
                  {dir === "out" ? "Send" : "Request"}
                </button>
              ))}
            </div>
            <Field
              label="Email or phone"
              value={handle}
              onChange={setHandle}
              placeholder="elena@example.com or +1 415 555 0134"
            />
            <Field
              label="Amount (USD)"
              value={contactAmount}
              onChange={setContactAmount}
              placeholder="45.00"
              inputMode="decimal"
            />
            <button
              disabled={busy || handle.length < 5}
              onClick={() =>
                submit(
                  `${contactDirection === "out" ? "Sent to" : "Requested from"} ${handle}`,
                  contactAmount,
                  handle.includes("@") ? "email" : "phone",
                  contactDirection,
                )
              }
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-40"
            >
              {contactDirection === "out" ? "Send money" : "Request money"}
            </button>
          </div>
        )}

        {tab === "paypal" && (
          <div className="panel animate-rise space-y-3 p-5">
            <p className="label-caps">PayPal payout</p>
            <p className="text-sm text-muted">
              Payouts are queued as pending activity. Connect PayPal credentials later to settle them
              automatically.
            </p>
            <Field
              label="PayPal email"
              value={paypalEmail}
              onChange={setPaypalEmail}
              placeholder="payouts@example.com"
            />
            <Field
              label="Amount (USD)"
              value={paypalAmount}
              onChange={setPaypalAmount}
              placeholder="250.00"
              inputMode="decimal"
            />
            <button
              disabled={busy || !paypalEmail.includes("@")}
              onClick={() =>
                submit(`PayPal payout · ${paypalEmail}`, paypalAmount, "paypal", "out", "pending")
              }
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-40"
            >
              Queue PayPal payout
            </button>
          </div>
        )}
      </section>

      <div className="h-6" />
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <label className="block rounded-xl bg-surface-2 px-4 py-3 ring-1 ring-border focus-within:ring-accent/50">
      <span className="label-caps block text-[10px]">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-faint"
      />
    </label>
  );
}
