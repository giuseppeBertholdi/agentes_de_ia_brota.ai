-- ============================================================
-- 007: Billing — assinatura Stripe (plano único R$127/mês)
-- Seguro de rodar: usa IF NOT EXISTS
-- ============================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status     text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_subscription_status_check'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_subscription_status_check
      CHECK (subscription_status IN ('inactive', 'active', 'past_due', 'canceled'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS companies_stripe_customer_idx ON public.companies (stripe_customer_id);
