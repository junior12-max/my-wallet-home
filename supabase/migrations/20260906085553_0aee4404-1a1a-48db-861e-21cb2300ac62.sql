-- Double-entry ledger lines
CREATE TABLE public.journal_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'debit',
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX journal_entries_user_idx ON public.journal_entries (user_id, created_at DESC);
CREATE INDEX journal_entries_txn_idx ON public.journal_entries (transaction_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY journal_entries_all_own ON public.journal_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all journal entries" ON public.journal_entries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Identity verification (KYC)
CREATE TABLE public.kyc_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'persona',
  provider_reference text,
  status text NOT NULL DEFAULT 'pending',
  details jsonb,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY kyc_select_own ON public.kyc_verifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all kyc" ON public.kyc_verifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER kyc_set_updated_at BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Linked external destinations (banks and wallets)
CREATE TABLE public.external_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'bank',
  label text NOT NULL DEFAULT 'Linked account',
  routing_number_last4 text,
  account_number_last4 text,
  wallet_handle text,
  provider text,
  provider_reference text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX external_accounts_user_idx ON public.external_accounts (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_accounts TO authenticated;
GRANT ALL ON public.external_accounts TO service_role;
ALTER TABLE public.external_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY external_accounts_all_own ON public.external_accounts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all external accounts" ON public.external_accounts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER external_accounts_set_updated_at BEFORE UPDATE ON public.external_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();