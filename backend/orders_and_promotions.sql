-- Migration script to support orders, commissions, and sponsored listings.
-- Run all of this in your Supabase SQL Editor.

-- 1. Extend the materials table to support promotions
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMP WITH TIME ZONE;

-- 2. Create the orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id),
    subtotal DECIMAL NOT NULL,
    delivery_fee DECIMAL DEFAULT 0,
    platform_fee DECIMAL DEFAULT 0,  -- Fixed maintenance fee
    total_amount DECIMAL NOT NULL,
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed')) DEFAULT 'pending',
    payment_reference TEXT UNIQUE,
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_state TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL NOT NULL,
    total_price DECIMAL NOT NULL,
    vendor_id UUID REFERENCES auth.users(id),
    commission_rate DECIMAL DEFAULT 0.05, -- 5% commission rate
    commission_amount DECIMAL NOT NULL,    -- Captured commission cut
    escrow_status TEXT CHECK (escrow_status IN ('held', 'released', 'refunded')) DEFAULT 'held',
    fulfillment_status TEXT CHECK (fulfillment_status IN ('processing', 'shipped', 'delivered', 'canceled')) DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 5. Establish RLS Policies
-- Clients can select and insert their own orders
CREATE POLICY "Clients can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can place their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Vendors and clients can select their order items
CREATE POLICY "Clients can view their own order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE public.orders.id = public.order_items.order_id 
            AND public.orders.client_id = auth.uid()
        )
    );

CREATE POLICY "Vendors can view their listed order items" ON public.order_items
    FOR SELECT USING (auth.uid() = vendor_id);

-- Vendors can update fulfillment status for their order items
CREATE POLICY "Vendors can update fulfillment on their items" ON public.order_items
    FOR UPDATE USING (auth.uid() = vendor_id);

-- Allow order insertions during checkout
CREATE POLICY "Clients can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE public.orders.id = public.order_items.order_id 
            AND public.orders.client_id = auth.uid()
        )
    );
