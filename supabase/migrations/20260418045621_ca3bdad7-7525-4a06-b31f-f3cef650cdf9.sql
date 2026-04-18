-- 1. Add owner_id to tenant-scoped tables
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS owner_id UUID;

-- 2. Backfill existing data to the original admin
UPDATE public.products SET owner_id = '0f83a118-1810-4fab-9979-fa2f013e52a5' WHERE owner_id IS NULL;
UPDATE public.transactions SET owner_id = '0f83a118-1810-4fab-9979-fa2f013e52a5' WHERE owner_id IS NULL;
UPDATE public.orders SET owner_id = '0f83a118-1810-4fab-9979-fa2f013e52a5' WHERE owner_id IS NULL;
UPDATE public.appointments SET owner_id = '0f83a118-1810-4fab-9979-fa2f013e52a5' WHERE owner_id IS NULL;
UPDATE public.plans SET owner_id = '0f83a118-1810-4fab-9979-fa2f013e52a5' WHERE owner_id IS NULL;

-- 3. Replace RLS: admins see only their own; clients see active products and all plans
-- PRODUCTS
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Admins view own products" ON public.products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins insert own products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins update own products" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins delete own products" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Public view active products" ON public.products FOR SELECT
  USING (active = true);

-- TRANSACTIONS
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;

CREATE POLICY "Admins view own transactions" ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins insert own transactions" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins update own transactions" ON public.transactions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins delete own transactions" ON public.transactions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

-- ORDERS
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

CREATE POLICY "Admins view own orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins update own orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

-- APPOINTMENTS
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;

CREATE POLICY "Admins view own appointments" ON public.appointments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins update own appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins delete own appointments" ON public.appointments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

-- PLANS: keep public readable; admins manage their own
DROP POLICY IF EXISTS "Admins can insert plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can update plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can delete plans" ON public.plans;

CREATE POLICY "Admins insert own plans" ON public.plans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins update own plans" ON public.plans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "Admins delete own plans" ON public.plans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());