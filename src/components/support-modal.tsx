import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { createSupportTicket, myTicketsQuery, relativeTime } from "@/lib/banking";
import { sendSupportEmail } from "@/lib/support.functions";

const press = "transition-all duration-150 active:scale-95";

const categories = [
  { id: "general", label: "General" },
  { id: "transfers", label: "Transfers" },
  { id: "cards", label: "Cards" },
  { id: "security", label: "Security" },
] as const;

export function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const notify = useServerFn(sendSupportEmail);
  const { data: tickets } = useQuery({ ...myTicketsQuery, enabled: open });

  const [category, setCategory] = useState<string>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  async function submit() {
    if (subject.trim().length < 3) return toast.error("Add a short subject");
    if (message.trim().length < 10) return toast.error("Tell us a little more");
    setSending(true);
    try {
      const id = await createSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        category,
      });
      await notify({ data: { ticketId: id } }).catch(() => null);
      await queryClient.invalidateQueries({ queryKey: myTicketsQuery.queryKey });
      setSubject("");
      setMessage("");
      toast.success("Request sent — our team will reply by email");
    } catch {
      toast.error("Could not send your request");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl"
        role="dialog"
        aria-label="Help and support"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="label-caps">Help &amp; support</p>
            <p className="mt-1 font-display text-2xl leading-tight font-semibold">
              How can we help?
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`grid size-8 place-items-center rounded-full bg-surface-2 font-mono text-muted ring-1 ring-border hover:text-foreground ${press}`}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-lg px-2 py-2 font-mono text-[10px] tracking-[0.1em] uppercase ring-1 ring-border ${press} ${
                category === c.id ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="label-caps mt-4 block">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Card was declined"
          className="mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-[13px] ring-1 ring-border outline-none focus:ring-accent"
        />

        <label className="label-caps mt-3 block">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Describe what happened…"
          className="mt-1 w-full resize-none rounded-xl bg-surface-2 px-3 py-3 text-[13px] ring-1 ring-border outline-none focus:ring-accent"
        />

        <button
          onClick={submit}
          disabled={sending}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-[13px] font-semibold text-accent-foreground disabled:opacity-60 ${press}`}
        >
          {sending && (
            <span className="size-3.5 animate-spin rounded-full border-2 border-accent-foreground/40 border-t-accent-foreground" />
          )}
          {sending ? "Sending…" : "Send request"}
        </button>

        {(tickets ?? []).length > 0 && (
          <div className="mt-5">
            <p className="label-caps mb-2">Your requests</p>
            <div className="divide-y divide-border rounded-xl ring-1 ring-border">
              {(tickets ?? []).slice(0, 6).map((t) => (
                <div key={t.id} className="px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold">{t.subject}</p>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase text-muted ring-1 ring-border">
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-faint">
                    {relativeTime(t.created_at)}
                  </p>
                  {t.admin_note && (
                    <p className="mt-1.5 text-[12px] text-muted">Reply: {t.admin_note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
