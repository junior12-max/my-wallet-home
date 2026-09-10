ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

UPDATE public.profiles
SET first_name = COALESCE(first_name, split_part(COALESCE(full_name, ''), ' ', 1)),
    last_name = COALESCE(last_name, NULLIF(substring(COALESCE(full_name, '') from position(' ' in COALESCE(full_name, '')) + 1), COALESCE(full_name, '')))
WHERE first_name IS NULL OR last_name IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_id UUID;
  v_name TEXT;
  v_last4 TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_last4 := lpad((floor(random() * 10000))::int::text, 4, '0');

  INSERT INTO public.profiles (id, full_name, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    v_name,
    split_part(v_name, ' ', 1),
    NULLIF(substring(v_name from position(' ' in v_name) + 1), v_name),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.accounts (user_id, name, account_number_last4, balance_cents)
  VALUES (NEW.id, 'Checking', v_last4, 0)
  RETURNING id INTO v_account_id;

  INSERT INTO public.cards (user_id, account_id, label, cardholder_name, number_full, last4, cvv)
  VALUES (
    NEW.id, v_account_id, 'Platinum', upper(v_name),
    '4' || lpad((floor(random() * 1000000000000000))::bigint::text, 15, '0'),
    v_last4,
    lpad((floor(random() * 1000))::int::text, 3, '0')
  );

  RETURN NEW;
END; $function$