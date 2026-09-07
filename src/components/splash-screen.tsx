import { useEffect, useState } from "react";

/**
 * Full-screen Vaulta splash shown once per browser session on initial load.
 * Fades out after 1.5s, then unmounts.
 */
export function SplashScreen() {
  const [state, setState] = useState<"hidden" | "visible" | "leaving">("hidden");

  useEffect(() => {
    if (sessionStorage.getItem("vaulta-splash-seen")) return;
    sessionStorage.setItem("vaulta-splash-seen", "1");
    setState("visible");
    const leave = setTimeout(() => setState("leaving"), 1500);
    const done = setTimeout(() => setState("hidden"), 2100);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, []);

  if (state === "hidden") return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-500 ${
        state === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex animate-rise flex-col items-center">
        <div className="grid size-20 place-items-center rounded-3xl bg-brand-soft ring-1 ring-brand/30">
          <span className="font-display text-5xl leading-none font-semibold text-brand">V</span>
        </div>
        <p className="mt-5 font-mono text-[11px] tracking-[0.34em] text-foreground uppercase">
          Vaulta
        </p>
        <p className="mt-2 text-[12px] text-muted">Private USD banking</p>
        <span className="mt-7 size-5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    </div>
  );
}
