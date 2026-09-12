import { useEffect, useState } from "react";

/**
 * Full-screen Vaulta splash rendered on initial load (server-rendered so there
 * is no flash of the page beneath it). Fades out after 1.5s, then unmounts.
 */
export function SplashScreen() {
  const [state, setState] = useState<"visible" | "leaving" | "hidden">("visible");

  useEffect(() => {
    const leave = setTimeout(() => setState("leaving"), 1500);
    const done = setTimeout(() => setState("hidden"), 2050);
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
      <div className="flex flex-col items-center">
        <div className="grid size-20 animate-rise place-items-center rounded-3xl bg-[#E5A93C]/15 ring-1 ring-[#E5A93C]/30">
          <span className="font-display text-5xl leading-none font-semibold text-[#E5A93C]">
            V
          </span>
        </div>
        <p className="mt-5 animate-rise font-mono text-[11px] tracking-[0.34em] text-foreground uppercase [animation-delay:80ms]">
          Vaulta
        </p>
        <p className="mt-2 animate-rise text-[12px] text-muted [animation-delay:140ms]">
          Private USD banking
        </p>
        <span className="mt-7 size-5 animate-spin rounded-full border-2 border-[#E5A93C]/25 border-t-[#E5A93C]" />
      </div>
    </div>
  );
            }
