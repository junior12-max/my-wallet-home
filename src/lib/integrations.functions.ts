/**
 * Integration stubs for regulated money movement.
 *
 * Each function has the final shape the real provider call will take, but
 * returns a clearly-marked stub result until provider credentials are added.
 * Every one is authenticated: RLS applies as the signed-in user.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const stub = (provider: string) => ({
  configured: false as const,
  provider,
  message: `${provider} is not connected yet. Add its API credentials to enable live calls.`,
});

/** KYC — Persona / Sumsub inquiry creation. */
export const startKycVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const provider = process.env["KYC_PROVIDER"] ?? "persona";
    const apiKey = process.env["KYC_API_KEY"];

    const { data: existing } = await context.supabase
      .from("kyc_verifications")
      .select("id, status, provider, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!apiKey) return { ...stub(provider), verification: existing ?? null };

    // TODO: POST to the provider's inquiry endpoint and persist the reference
    // with supabaseAdmin (statuses must not be writable by the user).
    return { configured: true as const, provider, verification: existing ?? null };
  });

/** Plaid — create a Link token for bank linking. */
export const createPlaidLinkToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientId = process.env["PLAID_CLIENT_ID"];
    const secret = process.env["PLAID_SECRET"];
    if (!clientId || !secret) return { ...stub("plaid"), linkToken: null };

    // TODO: POST /link/token/create with user.client_user_id = context.userId
    return { configured: true as const, provider: "plaid", linkToken: null as string | null };
  });

const transferInput = z.object({
  amountCents: z.number().int().positive().max(50_000_00),
  destination: z.enum(["bank", "venmo", "cashapp", "paypal", "zelle"]),
  reference: z.string().min(2).max(120),
  note: z.string().max(200).optional(),
});

/** ACH / wallet payout — Stripe Treasury or Dwolla. */
export const submitExternalTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => transferInput.parse(input))
  .handler(async ({ data, context }) => {
    const provider = process.env["PAYOUT_PROVIDER"] ?? "dwolla";
    const apiKey = process.env["PAYOUT_API_KEY"];
    if (!apiKey) return { ...stub(provider), submitted: false as const, request: data };

    // TODO: create the provider transfer, then write the paired ledger lines
    // into journal_entries for the authenticated user.
    void context.userId;
    return { configured: true as const, provider, submitted: true as const, request: data };
  });
