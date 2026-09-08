import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emails the support inbox when a member files a ticket.
 * Sending goes through Lovable's managed email API; until a sender domain is
 * verified this returns { sent: false } instead of throwing, so filing a
 * ticket never fails because of email configuration.
 */
export const sendSupportEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ticketId: string }) => {
    if (!input?.ticketId) throw new Error("ticketId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("support_tickets")
      .select("id, subject, message, category, contact_email, created_at")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (error) throw error;
    if (!ticket) return { sent: false, reason: "ticket_not_found" as const };

    const to = process.env["SUPPORT_INBOX"];
    const from = process.env["SUPPORT_FROM_ADDRESS"];
    if (!to || !from) {
      return { sent: false, reason: "email_not_configured" as const, ticketId: ticket.id };
    }

    try {
      const { sendLovableEmail } = await import("@lovable.dev/email-js");
      await sendLovableEmail({
        from,
        to,
        replyTo: ticket.contact_email ?? undefined,
        subject: `[Vaulta support] ${ticket.subject}`,
        html: `<h2>${ticket.subject}</h2>
<p><strong>Category:</strong> ${ticket.category}</p>
<p><strong>From:</strong> ${ticket.contact_email ?? "unknown"}</p>
<pre style="white-space:pre-wrap;font-family:inherit">${ticket.message}</pre>`,
      });
      return { sent: true as const, ticketId: ticket.id };
    } catch (err) {
      console.error("[support] email send failed", err);
      return { sent: false, reason: "send_failed" as const, ticketId: ticket.id };
    }
  });

/** Admin-only: maps member ids to their sign-in email addresses. */
export const listMemberEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    const emails: Record<string, string> = {};
    for (const user of data.users) if (user.email) emails[user.id] = user.email;
    return emails;
  });
