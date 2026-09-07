import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Incoming provider webhook (KYC decisions, ACH/wallet transfer status).
 * Signature is verified before anything is read from the payload.
 */
export const Route = createFileRoute("/api/public/webhooks/payments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYMENTS_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const body = await request.text();
        const signature = request.headers.get("x-webhook-signature") ?? "";
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const got = Buffer.from(signature);
        const want = Buffer.from(expected);
        if (got.length !== want.length || !timingSafeEqual(got, want)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const event = payload as { type?: string; data?: Record<string, unknown> };
        // TODO: branch on event.type and update kyc_verifications /
        // transactions / journal_entries via supabaseAdmin.
        console.log("payments webhook received", event.type ?? "unknown");

        return new Response("ok");
      },
    },
  },
});
