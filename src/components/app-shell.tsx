import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { greeting, initials, profileQuery } from "@/lib/banking";

const tabs = [
  { to: "/dashboard", glyph: "⌂", label: "Home" },
  { to: "/finances", glyph: "◵", label: "Finances" },
  { to: "/cards", glyph: "▤", label: "Cards" },
  { to: "/profile", glyph: "◍", label: "Profile" },
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
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="flex animate-rise items-start justify-between px-4 pt-6 pb-4">
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
            <Link
              to="/profile"
              className="grid size-8 place-items-center rounded-full bg-surface-2 font-mono text-[11px] text-accent ring-1 ring-border"
            >
              {initials(profile?.full_name)}
            </Link>
            <button
              onClick={signOut}
              className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase transition-colors hover:text-accent"
            >
              Exit
            </button>
          </div>
        </header>

        {/* pb reserves room for the fixed tab bar */}
        <main className="flex-1 px-4 pb-24">{children}</main>

        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
          <div className="grid grid-cols-4">
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                className="group flex flex-col items-center gap-1 py-3 text-faint transition-all duration-150 hover:text-foreground active:scale-95"
                activeProps={{ className: "text-accent" }}
              >
                <span className="text-base leading-none">{tab.glyph}</span>
                <span className="font-mono text-[9px] tracking-[0.16em] uppercase">{tab.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
