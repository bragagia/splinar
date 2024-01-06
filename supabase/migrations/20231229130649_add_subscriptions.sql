-----------
-- Workspace subscription

CREATE TYPE workspace_subscriptions_type AS ENUM ('STRIPE', 'CUSTOM');
CREATE TYPE workspace_subscriptions_custom_type AS ENUM ('BETA');

CREATE TABLE public.workspace_subscriptions (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid NOT NULL,
    sub_type workspace_subscriptions_type NOT NULL,
    sub_custom_type workspace_subscriptions_custom_type, -- nullable
    stripe_customer_id text, -- nullable
    stripe_subscription_id text, -- nullable
    stripe_subscription_item_id text, -- nullable
    canceled_at timestamp with time zone -- nullable
);

ALTER TABLE public.workspace_subscriptions OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.workspace_subscriptions
    ADD CONSTRAINT workspace_subscriptions_pkey
    PRIMARY KEY (id);

ALTER TABLE ONLY public.workspace_subscriptions
    ADD CONSTRAINT workspace_subscriptions_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.workspace_subscriptions
    ADD CONSTRAINT workspace_subscriptions_stripe_subscription_id_ud
    UNIQUE (stripe_subscription_id);

ALTER TABLE ONLY public.workspace_subscriptions
    ADD CONSTRAINT workspace_subscriptions_stripe_subscription_item_id_ud
    UNIQUE (stripe_subscription_item_id);

-- Indexes

CREATE INDEX workspace_subscriptions_workspace_id_idx
    ON public.workspace_subscriptions
    USING btree (workspace_id);

-- Access

CREATE POLICY "Allow workspace owners to read"
    ON public.workspace_subscriptions
    FOR SELECT
    TO authenticated
    USING ((EXISTS ( SELECT 1 FROM public.workspaces
        WHERE ((workspaces.id = workspace_subscriptions.workspace_id)
        AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.workspace_subscriptions TO anon;
GRANT ALL ON TABLE public.workspace_subscriptions TO authenticated;
GRANT ALL ON TABLE public.workspace_subscriptions TO service_role;