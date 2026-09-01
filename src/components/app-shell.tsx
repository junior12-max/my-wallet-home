import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { greeting, initials, profileQuery } from "@/lib/banking";

const tabs = [
  { to: "/dashboard", glyph: "▣", label: "Home" },
  { to: "/transfer", glyph: "⇄", label: "Transfer" },
  { to: "/cards", glyph: "▤", label: "Cards" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useQuery(profileQuery);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col">
        <header className="flex animate-rise items-start justify-between px-5 pt-6 pb-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.28em] text-faint uppercase">Vaulta</p>
            <p className="mt-1 text-sm text-muted">
              {greeting()},{" "}
              <span className="text-foreground">
                {profile?.full_name?.split(" ")[0] ?? "there"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-surface-2 font-mono text-[11px] text-accent ring-1 ring-border">
              {initials(profile?.full_name)}
            </span>
            <button
              onClick={signOut}
              className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase transition-colors hover:text-accent"
            >
              Exit
            </button>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <nav className="sticky bottom-0 bg-surface/95 ring-1 ring-border backdrop-blur">
          <div className="grid grid-cols-3">
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center gap-1 py-3.5 text-muted transition-colors"
                activeProps={{ className: "text-accent" }}
              >
                <span className="font-mono text-sm">{tab.glyph}</span>
                <span className="font-mono text-[10px] tracking-wider uppercase">{tab.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
