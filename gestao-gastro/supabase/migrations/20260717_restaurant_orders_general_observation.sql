-- Persist general waiter notes captured before confirming an order.
ALTER TABLE public.restaurant_orders
  ADD COLUMN IF NOT EXISTS general_observation text;
