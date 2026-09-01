-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ACCOUNTS
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Checking',
  account_number_last4 TEXT NOT NULL DEFAULT '4471',
  routing_number TEXT NOT NULL DEFAULT '021000021',
  balance_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX accounts_user_id_idx ON public.accounts(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_all_own" ON public.accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CARDS
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Platinum',
  brand TEXT NOT NULL DEFAULT 'Meridian',
  cardholder_name TEXT NOT NULL DEFAULT 'CARDHOLDER',
  number_full TEXT NOT NULL,
  last4 TEXT NOT NULL,
  exp_month INT NOT NULL DEFAULT 9,
  exp_year INT NOT NULL DEFAULT 2029,
  cvv TEXT NOT NULL,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  spend_limit_cents BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cards_user_id_idx ON public.cards(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cards_all_own" ON public.cards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  amount_cents BIGINT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'out',
  status TEXT NOT NULL DEFAULT 'completed',
  method TEXT NOT NULL DEFAULT 'card',
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_id_occurred_idx ON public.transactions(user_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_all_own" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER accounts_set_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cards_set_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- new user bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_account_id UUID;
  v_name TEXT;
  v_last4 TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_last4 := lpad((floor(random() * 10000))::int::text, 4, '0');

  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, v_name, NEW.raw_user_meta_data->>'avatar_url');

  INSERT INTO public.accounts (user_id, name, account_number_last4, balance_cents)
  VALUES (NEW.id, 'Checking', v_last4, 4829050)
  RETURNING id INTO v_account_id;

  INSERT INTO public.cards (user_id, account_id, label, cardholder_name, number_full, last4, cvv)
  VALUES (
    NEW.id, v_account_id, 'Platinum', upper(v_name),
    '4' || lpad((floor(random() * 1000000000000000))::bigint::text, 15, '0'),
    v_last4,
    lpad((floor(random() * 1000))::int::text, 3, '0')
  );

  INSERT INTO public.transactions (user_id, account_id, merchant, category, amount_cents, direction, method, occurred_at) VALUES
    (NEW.id, v_account_id, 'Aurora Coffee', 'dining', 450, 'out', 'card', now() - interval '2 hours'),
    (NEW.id, v_account_id, 'Payout · J. Okafor', 'transfer', 120000, 'in', 'ach', now() - interval '1 day'),
    (NEW.id, v_account_id, 'Northwind Grocers', 'groceries', 6210, 'out', 'card', now() - interval '1 day 6 hours'),
    (NEW.id, v_account_id, 'Metro Transit', 'transport', 2800, 'out', 'card', now() - interval '2 days'),
    (NEW.id, v_account_id, 'Lumen Electric', 'bills', 9450, 'out', 'ach', now() - interval '3 days'),
    (NEW.id, v_account_id, 'Halcyon Books', 'shopping', 3199, 'out', 'card', now() - interval '4 days'),
    (NEW.id, v_account_id, 'Ridgeline Gym', 'health', 5500, 'out', 'card', now() - interval '5 days'),
    (NEW.id, v_account_id, 'Ivy Pharmacy', 'health', 1875, 'out', 'card', now() - interval '6 days');

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();