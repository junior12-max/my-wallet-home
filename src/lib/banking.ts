import { supabase } from "@/integrations/supabase/client";

export type Account = {
  id: string;
  name: string;
  account_number_last4: string;
  routing_number: string;
  balance_cents: number;
  currency: string;
  is_frozen: boolean;
};

export type Card = {
  id: string;
  label: string;
  brand: string;
  cardholder_name: string;
  number_full: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
  is_frozen: boolean;
};

export type Transaction = {
  id: string;
  merchant: string;
  category: string;
  amount_cents: number;
  direction: string;
  status: string;
  method: string;
  occurred_at: string;
};

export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export const signedMoney = (cents: number, direction: string) =>
  `${direction === "in" ? "+" : "\u2212"}${money(Math.abs(cents))}`;

export function splitBalance(cents: number) {
  const whole = Math.trunc(Math.abs(cents) / 100);
  const frac = String(Math.abs(cents) % 100).padStart(2, "0");
  return { whole: whole.toLocaleString("en-US"), frac };
}

export function relativeTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) return `Today · ${time}`;
  if (days === 1) return `Yesterday · ${time}`;
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${time}`;
}

export const accountQuery = {
  queryKey: ["account"],
  queryFn: async (): Promise<Account | null> => {
    const { data, error } = await supabase
      .from("accounts")
      .select("id, name, account_number_last4, routing_number, balance_cents, currency, is_frozen")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as Account | null;
  },
};

export const cardsQuery = {
  queryKey: ["cards"],
  queryFn: async (): Promise<Card[]> => {
    const { data, error } = await supabase
      .from("cards")
      .select(
        "id, label, brand, cardholder_name, number_full, last4, exp_month, exp_year, cvv, is_frozen",
      )
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Card[];
  },
};

export const transactionsQuery = {
  queryKey: ["transactions"],
  queryFn: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, merchant, category, amount_cents, direction, status, method, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data ?? []) as Transaction[];
  },
};

export const profileQuery = {
  queryKey: ["profile"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, status")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};

/** Buckets outgoing spend into the last 7 days, oldest first. */
export function weeklySpend(transactions: Transaction[]) {
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  const days: { key: string; label: string; cents: number; isToday: boolean }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      key: d.toDateString(),
      label: labels[d.getDay()]!,
      cents: 0,
      isToday: i === 0,
    });
  }
  for (const tx of transactions) {
    if (tx.direction !== "out") continue;
    const key = new Date(tx.occurred_at).toDateString();
    const bucket = days.find((d) => d.key === key);
    if (bucket) bucket.cents += Math.abs(tx.amount_cents);
  }
  const max = Math.max(1, ...days.map((d) => d.cents));
  return { days, max, total: days.reduce((sum, d) => sum + d.cents, 0) };
}

export const initials = (name?: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "··";

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Records a money movement and adjusts the account balance.
 * RLS keeps both writes scoped to the signed-in user.
 */
export async function recordTransfer(input: {
  accountId: string;
  balanceCents: number;
  merchant: string;
  amountCents: number;
  direction: "in" | "out";
  method: string;
  status?: string;
  note?: string;
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Not signed in");

  const { error: txError } = await supabase.from("transactions").insert({
    account_id: input.accountId,
    merchant: input.merchant,
    amount_cents: input.amountCents,
    direction: input.direction,
    method: input.method,
    category: "transfer",
    status: input.status ?? "completed",
    note: input.note ?? null,
    user_id: userData.user.id,
  });
  if (txError) throw txError;

  const delta = input.direction === "in" ? input.amountCents : -input.amountCents;
  const { error: balError } = await supabase
    .from("accounts")
    .update({ balance_cents: input.balanceCents + delta })
    .eq("id", input.accountId);
  if (balError) throw balError;
}

/** True when the signed-in user holds the admin role. */
export const isAdminQuery = {
  queryKey: ["is-admin"],
  queryFn: async (): Promise<boolean> => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("role", "admin");
    if (error) throw error;
    return (data ?? []).length > 0;
  },
};

export type AdminAccount = Account & { user_id: string; created_at: string };

export const adminAccountsQuery = {
  queryKey: ["admin", "accounts"],
  queryFn: async (): Promise<AdminAccount[]> => {
    const { data, error } = await supabase
      .from("accounts")
      .select(
        "id, name, account_number_last4, routing_number, balance_cents, currency, is_frozen, user_id, created_at",
      )
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as AdminAccount[];
  },
};

export const adminProfilesQuery = {
  queryKey: ["admin", "profiles"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, status, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};

export const adminTransactionsQuery = {
  queryKey: ["admin", "transactions"],
  queryFn: async (): Promise<(Transaction & { user_id: string })[]> => {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, merchant, category, amount_cents, direction, status, method, occurred_at, user_id",
      )
      .order("occurred_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as (Transaction & { user_id: string })[];
  },
};

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

/** Builds and downloads a CSV of the given transactions in the browser. */
export function downloadTransactionsCsv(transactions: Transaction[]) {
  const header = ["Date", "Merchant", "Category", "Method", "Direction", "Status", "Amount (USD)"];
  const rows = transactions.map((tx) => [
    new Date(tx.occurred_at).toISOString(),
    tx.merchant,
    tx.category,
    tx.method,
    tx.direction === "in" ? "credit" : "debit",
    tx.status,
    ((tx.direction === "in" ? 1 : -1) * (Math.abs(tx.amount_cents) / 100)).toFixed(2),
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `vaulta-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------- support */

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  admin_note: string | null;
  contact_email: string | null;
  created_at: string;
};

export const myTicketsQuery = {
  queryKey: ["support-tickets", "mine"],
  queryFn: async (): Promise<SupportTicket[]> => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, user_id, subject, message, category, status, admin_note, contact_email, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as SupportTicket[];
  },
};

export const adminTicketsQuery = {
  queryKey: ["admin", "support-tickets"],
  queryFn: async (): Promise<SupportTicket[]> => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, user_id, subject, message, category, status, admin_note, contact_email, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as SupportTicket[];
  },
};

export async function createSupportTicket(input: {
  subject: string;
  message: string;
  category: string;
  contactEmail?: string | null;
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Not signed in");
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: userData.user.id,
      subject: input.subject,
      message: input.message,
      category: input.category,
      contact_email: input.contactEmail ?? userData.user.email ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function setTicketStatus(id: string, status: string) {
  const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------- admin: members */

export async function setMemberStatus(userId: string, status: "active" | "suspended") {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) throw error;
}

export async function setAccountBalance(accountId: string, balanceCents: number) {
  const { error } = await supabase
    .from("accounts")
    .update({ balance_cents: balanceCents })
    .eq("id", accountId);
  if (error) throw error;
}
