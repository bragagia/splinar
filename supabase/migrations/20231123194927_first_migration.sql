-------------
-- WORKSPACES

CREATE TYPE workspace_installation_status AS ENUM ('FRESH', 'PENDING', 'DONE', 'ERROR');

CREATE TABLE public.workspaces (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    refresh_token text NOT NULL,
    domain text NOT NULL,
    user_mail text NOT NULL,
    display_name text NOT NULL,
    hub_id text NOT NULL,
    installation_status workspace_installation_status DEFAULT 'FRESH' NOT NULL,
    installation_fetched boolean NOT NULL,
    installation_similarity_total_batches bigint NOT NULL,
    installation_similarity_done_batches bigint NOT NULL,
    installation_dup_total bigint NOT NULL,
    installation_dup_done bigint NOT NULL
);

ALTER TABLE public.workspaces OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_user_id_refresh_token_key UNIQUE (user_id, refresh_token);

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Access

CREATE POLICY "(auth.uid() = user_id)" ON public.workspaces TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.workspaces TO anon;
GRANT ALL ON TABLE public.workspaces TO authenticated;
GRANT ALL ON TABLE public.workspaces TO service_role;

-- TODO: There is a missing instruction to make workspaces accessible in realtime. It seems hard so no prio for now








-----------
-- CONTACTS

CREATE TABLE public.contacts (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid NOT NULL,
    hs_id bigint NOT NULL,
    first_name text,
    last_name text,
    emails text[],
    phones text[],
    company_name text,
    similarity_checked boolean NOT NULL,
    dup_checked boolean NOT NULL,
    filled_score bigint NOT NULL
);

ALTER TABLE public.contacts OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contact_workspace_id_hs_ud UNIQUE (workspace_id, hs_id);

-- Indexes

CREATE INDEX contacts_filled_score_index ON public.contacts USING btree (filled_score);

CREATE INDEX contacts_similarity_checked_idx ON public.contacts USING btree (similarity_checked);

CREATE INDEX contacts_dup_checked_idx ON public.contacts USING btree (dup_checked);

CREATE INDEX contacts_workspace_id_idx ON public.contacts USING btree (workspace_id);

-- Access

CREATE POLICY "Allow workspace owners" ON public.contacts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = contacts.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = contacts.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.contacts TO anon;
GRANT ALL ON TABLE public.contacts TO authenticated;
GRANT ALL ON TABLE public.contacts TO service_role;








------------
-- COMPANIES

CREATE TABLE public.companies (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid NOT NULL,
    hs_id bigint NOT NULL,
    name text
);

ALTER TABLE public.companies OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_workspace_id_hs_ud UNIQUE (workspace_id, hs_id);

-- Access

CREATE POLICY "Allow workspace owners" ON public.companies TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = companies.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = companies.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.companies TO anon;
GRANT ALL ON TABLE public.companies TO authenticated;
GRANT ALL ON TABLE public.companies TO service_role;








--------------------
-- CONTACT_COMPANIES

CREATE TABLE public.contact_companies (
    contact_id uuid NOT NULL,
    company_id uuid NOT NULL,
    workspace_id uuid NOT NULL
);


ALTER TABLE public.contact_companies OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.contact_companies
    ADD CONSTRAINT contact_companies_pkey PRIMARY KEY (contact_id, company_id);

ALTER TABLE ONLY public.contact_companies
    ADD CONSTRAINT contact_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.contact_companies
    ADD CONSTRAINT contact_companies_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.contact_companies
    ADD CONSTRAINT contact_companies_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Indexes

CREATE INDEX contact_companies_contact_id_idx ON public.contact_companies USING btree (contact_id);

-- Access

CREATE POLICY "Allow workspace owner" ON public.contact_companies TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = contact_companies.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = contact_companies.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.contact_companies ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.contact_companies TO anon;
GRANT ALL ON TABLE public.contact_companies TO authenticated;
GRANT ALL ON TABLE public.contact_companies TO service_role;









-----------------------
-- CONTACT_SIMILARITIES

CREATE TYPE contact_similaritie_field_type AS ENUM ('fullname', 'phone', 'email', 'company');
CREATE TYPE contact_similaritie_similarity_score AS ENUM ('exact', 'similar', 'potential', 'unlikely');

CREATE TABLE public.contact_similarities (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    contact_a_id uuid NOT NULL,
    contact_b_id uuid NOT NULL,
    field_type contact_similaritie_field_type NOT NULL,
    contact_a_value text NOT NULL,
    contact_b_value text NOT NULL,
    similarity_score contact_similaritie_similarity_score NOT NULL,
    workspace_id uuid NOT NULL
);

ALTER TABLE public.contact_similarities OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.contact_similarities
    ADD CONSTRAINT contact_similarities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.contact_similarities
    ADD CONSTRAINT contact_similarities_contact_a_id_fkey FOREIGN KEY (contact_a_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.contact_similarities
    ADD CONSTRAINT contact_similarities_contact_b_id_fkey FOREIGN KEY (contact_b_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.contact_similarities
    ADD CONSTRAINT contact_similarities_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Indexes

CREATE INDEX contact_similarities_contact_a_id_index ON public.contact_similarities USING btree (contact_a_id);

CREATE INDEX contact_similarities_contact_b_id_index ON public.contact_similarities USING btree (contact_b_id);

CREATE INDEX contact_similarities_workspace_id_index ON public.contact_similarities USING btree (workspace_id);

-- Access

CREATE POLICY "Allow workspace owners" ON public.contact_similarities TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = contact_similarities.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = contact_similarities.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.contact_similarities ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.contact_similarities TO anon;
GRANT ALL ON TABLE public.contact_similarities TO authenticated;
GRANT ALL ON TABLE public.contact_similarities TO service_role;








-------------
-- DUP_STACKS

CREATE TABLE public.dup_stacks (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid NOT NULL,
    confident_contact_ids uuid[] NOT NULL,
    potential_contact_ids uuid[]
);


ALTER TABLE public.dup_stacks OWNER TO postgres;

ALTER TABLE ONLY public.dup_stacks
    ADD CONSTRAINT dup_stacks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.dup_stacks
    ADD CONSTRAINT dup_stacks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE POLICY "Enable access for owner" ON public.dup_stacks TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = dup_stacks.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = dup_stacks.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.dup_stacks ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.dup_stacks TO anon;
GRANT ALL ON TABLE public.dup_stacks TO authenticated;
GRANT ALL ON TABLE public.dup_stacks TO service_role;