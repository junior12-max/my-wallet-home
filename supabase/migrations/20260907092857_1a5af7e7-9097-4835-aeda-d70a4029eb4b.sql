-- 1. Member status on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Helper: is this user suspended? (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_suspended(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND status = 'suspended'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_suspended(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_suspended(uuid) TO authenticated;

-- 2. Admins can update any profile (balances live on accounts, status here)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Suspended members cannot move money
DROP POLICY IF EXISTS transactions_all_own ON public.transactions;

CREATE POLICY transactions_select_own
ON public.transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY transactions_insert_own
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

CREATE POLICY transactions_update_own
ON public.transactions FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()))
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

CREATE POLICY transactions_delete_own
ON public.transactions FOR DELETE TO authenticated
USING (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- Suspended members cannot change their own balance either
DROP POLICY IF EXISTS accounts_all_own ON public.accounts;

CREATE POLICY accounts_select_own
ON public.accounts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY accounts_insert_own
ON public.accounts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

CREATE POLICY accounts_update_own
ON public.accounts FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()))
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- 4. Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  admin_note TEXT,
  contact_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_tickets_select_own
ON public.support_tickets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY support_tickets_insert_own
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);

CREATE TRIGGER support_tickets_set_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();