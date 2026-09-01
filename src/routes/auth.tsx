import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in to Meridian — Private USD Banking" },
      {
        name: "description",
        content:
          "Sign in or create your Meridian account to manage your USD balance, virtual debit cards, and ACH transfers.",
      },
      { property: "og:title", content: "Sign in to Meridian" },
      {
        property: "og:description",
        content: "Access your USD balance, virtual cards, and transfers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  if (checkEmail) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center px-6">
        <div className="panel animate-rise p-6">
          <p className="label-caps">Almost there</p>
          <h1 className="mt-3 font-display text-3xl font-semibold">Check your email</h1>
          <p className="mt-3 text-sm text-muted">
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Open it
            to activate your account, then come back and sign in.
          </p>
          <button
            onClick={() => {
              setCheckEmail(false);
              setMode("signin");
            }}
            className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center px-5 py-10">
      <div className="animate-rise">
        <p className="font-mono text-[10px] tracking-[0.28em] text-faint uppercase">Meridian</p>
        <h1 className="mt-2 font-display text-4xl leading-tight font-semibold">
          {mode === "signin" ? "Welcome back." : "Open your account."}
        </h1>
        <p className="mt-2 text-sm text-muted">
          USD balances, virtual cards and ACH transfers in one place.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="panel mt-6 animate-rise space-y-3 p-5">
        {mode === "signup" && (
          <Field
            label="Full name"
            value={fullName}
            onChange={setFullName}
            placeholder="Elena Marlow"
            required
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground transition-opacity disabled:opacity-50"
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full rounded-xl bg-surface-2 py-3 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-surface disabled:opacity-50"
        >
          Continue with Google
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-5 font-mono text-[11px] tracking-[0.14em] text-accent uppercase"
      >
        {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block rounded-xl bg-surface-2 px-4 py-3 ring-1 ring-border focus-within:ring-accent/50">
      <span className="label-caps block text-[10px]">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
      />
    </label>
  );
}
