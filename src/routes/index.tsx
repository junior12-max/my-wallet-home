import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meridian — USD Banking, Virtual Cards & ACH Transfers" },
      {
        name: "description",
        content:
          "Meridian is a private USD account with virtual debit cards, weekly spending insight, US bank ACH transfers and email or phone payments.",
      },
      { property: "og:title", content: "Meridian — USD Banking & Virtual Cards" },
      {
        property: "og:description",
        content:
          "A private USD account with virtual debit cards, ACH transfers and instant email or phone payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col px-5 py-10">
      <p className="animate-rise font-mono text-[10px] tracking-[0.28em] text-faint uppercase">
        Meridian
      </p>

      <h1 className="mt-8 animate-rise font-display text-[52px] leading-[0.95] font-semibold [animation-delay:60ms]">
        Money that
        <br />
        <span className="italic">holds its shape.</span>
      </h1>

      <p className="mt-5 max-w-[30ch] animate-rise text-sm text-muted [animation-delay:120ms]">
        A private USD account with virtual debit cards, ACH transfers and payments by email or phone.
      </p>

      <div className="panel mt-8 animate-rise divide-y divide-border [animation-delay:180ms]">
        {[
          ["01", "USD balance", "Weekly spending, tracked to the day"],
          ["02", "Virtual cards", "Reveal details or freeze in one tap"],
          ["03", "Transfers", "US bank ACH, email, phone, PayPal payouts"],
        ].map(([index, title, copy]) => (
          <div key={index} className="flex gap-4 px-4 py-4">
            <span className="font-mono text-[11px] text-accent">{index}</span>
            <div>
              <p className="text-[13px] font-semibold">{title}</p>
              <p className="mt-1 text-[12px] text-muted">{copy}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 animate-rise [animation-delay:240ms]">
        <Link
          to="/auth"
          className="block rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-accent-foreground"
        >
          Open your account
        </Link>
        <p className="mt-4 text-center font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
          Bank-grade row-level data isolation
        </p>
      </div>
    </div>
  );
}
