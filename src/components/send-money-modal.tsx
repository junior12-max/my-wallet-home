import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { accountQuery, money, recordTransfer } from "@/lib/banking";

type Destination = "bank" | "venmo" | "cashapp" | "paypal" | "zelle";

const destinations: {
  id: Destination;
  title: string;
  hint: string;
  glyph: string;
  group: "bank" | "wallet";
}[] = [
  {
    id: "bank",
    title: "US bank account",
    hint: "ACH · routing & account number",
    glyph: "⌗",
    group: "bank",
  },
  { id: "venmo", title: "Venmo", hint: "@handle", glyph: "V", group: "wallet" },
  { id: "cashapp", title: "Cash App", hint: "$cashtag", glyph: "$", group: "wallet" },
  { id: "paypal", title: "PayPal", hint: "Email address", glyph: "P", group: "wallet" },
  { id: "zelle", title: "Zelle", hint: "Phone or email", glyph: "Z", group: "wallet" },
];

const press = "transition-all duration-150 active:scale-95";

export function SendMoneyModal({
  open,
  onClose,
  direction = "out",
}: {
  open: boolean;
  onClose: () => void;
  direction?: "in" | "out";
}) {
  const { data: account } = useQuery(accountQuery);
  const queryClient = useQueryClient();

  const [destination, setDestination] = useState<Destination | null>(null);
  const [beneficiary, setBeneficiary] = useState("");
  const [routing, setRouting] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [handle, setHandle] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestination(null);
    setBeneficiary("");
    setRouting("");
    setAccountNumber("");
    setHandle("");
    setAmount("");
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const active = destinations.find((item) => item.id === destination);

  const walletLabel: Record<Exclude<Destination, "bank">, string> = {
    venmo: "Venmo handle",
    cashapp: "Cash App cashtag",
    paypal: "PayPal email",
    zelle: "Zelle phone or email",
  };
  const walletPlaceholder: Record<Exclude<Destination, "bank">, string> = {
    venmo: "@jordan-okafor",
    cashapp: "$jordanokafor",
    paypal: "jordan@example.com",
    zelle: "+1 415 555 0134",
  };

  const ready =
    destination === "bank"
      ? beneficiary.trim().length > 1 && routing.length >= 9 && accountNumber.length >= 4
      : handle.trim().length >= 3;

  async function submit() {
    if (!account || !destination) return;
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (direction === "out" && amountCents > account.balance_cents) {
      toast.error("Insufficient balance");
      return;
    }
    const label =
      destination === "bank"
        ? `ACH · ${beneficiary.trim()}`
        : `${active?.title} · ${handle.trim()}`;

    setBusy(true);
    try {
      await recordTransfer({
        accountId: account.id,
        balanceCents: account.balance_cents,
        merchant: label,
        amountCents,
        direction,
        method: destination === "bank" ? "ach" : destination,
      });
      await queryClient.invalidateQueries();
      toast.success(
        direction === "out"
          ? `Sent ${money(amountCents)} to ${active?.title}`
          : `Added ${money(amountCents)} from ${active?.title}`,
      );
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-150"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={direction === "out" ? "Send money" : "Add cash"}
        className="panel relative z-10 max-h-[88vh] w-full max-w-md animate-rise overflow-y-auto rounded-b-none px-4 py-6 sm:rounded-b-[18px]"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="label-caps">{direction === "out" ? "Send money" : "Add cash"}</p>
            <p className="mt-1 font-display text-2xl leading-tight font-semibold">
              {active ? active.title : "Choose a destination"}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-xs text-muted ring-1 ring-border hover:bg-surface-2/80 hover:text-foreground ${press}`}
          >
            ✕
          </button>
        </div>

        {!active && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="label-caps mb-2 text-[10px]">Bank transfer</p>
              <div className="space-y-2">
                {destinations
                  .filter((item) => item.group === "bank")
                  .map((item) => (
                    <DestinationButton
                      key={item.id}
                      item={item}
                      onClick={() => setDestination(item.id)}
                    />
                  ))}
              </div>
            </div>
            <div>
              <p className="label-caps mb-2 text-[10px]">Digital wallet</p>
              <div className="space-y-2">
                {destinations
                  .filter((item) => item.group === "wallet")
                  .map((item) => (
                    <DestinationButton
                      key={item.id}
                      item={item}
                      onClick={() => setDestination(item.id)}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}

        {active && (
          <div className="mt-4 space-y-3">
            <button
              onClick={() => setDestination(null)}
              className={`font-mono text-[10px] tracking-[0.16em] text-faint uppercase hover:text-accent ${press}`}
            >
              ← Change destination
            </button>

            {destination === "bank" ? (
              <>
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
              </>
            ) : (
              <Field
                label={walletLabel[destination as Exclude<Destination, "bank">]}
                value={handle}
                onChange={setHandle}
                placeholder={walletPlaceholder[destination as Exclude<Destination, "bank">]}
              />
            )}

            <Field
              label="Amount (USD)"
              value={amount}
              onChange={setAmount}
              placeholder="120.00"
              inputMode="decimal"
            />

            <p className="font-mono text-[10px] text-faint">
              Available {money(account?.balance_cents ?? 0)}
            </p>

            <button
              disabled={busy || !ready}
              onClick={submit}
              className={`flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground hover:bg-accent/80 disabled:opacity-40 ${press}`}
            >
              {busy && (
                <span className="size-3.5 animate-spin rounded-full border-2 border-accent-foreground/40 border-t-accent-foreground" />
              )}
              {busy
                ? "Processing…"
                : direction === "out"
                  ? `Send to ${active.title}`
                  : `Add from ${active.title}`}
            </button>
          </div>
        )}

        <div className="h-2" />
      </div>
    </div>
  );
}

function DestinationButton({
  item,
  onClick,
}: {
  item: { title: string; hint: string; glyph: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 text-left ring-1 ring-border hover:bg-surface-2/80 hover:ring-accent/40 ${press}`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft font-mono text-xs text-accent">
        {item.glyph}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold">{item.title}</span>
        <span className="block truncate text-[11px] text-muted">{item.hint}</span>
      </span>
      <span className="ml-auto font-mono text-faint">›</span>
    </button>
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
    <label className="block rounded-xl bg-surface-2 px-4 py-3 ring-1 ring-border transition-all duration-150 focus-within:ring-accent/50">
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
