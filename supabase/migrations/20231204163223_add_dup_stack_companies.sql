CREATE TYPE dup_stack_item_type AS ENUM ('CONTACTS', 'COMPANIES');

ALTER TABLE public.dup_stacks ADD COLUMN item_type dup_stack_item_type NOT NULL default 'CONTACTS';
ALTER TABLE public.dup_stacks ALTER COLUMN item_type DROP DEFAULT;

-----------------------
-- DUP_STACK_COMPANIES

CREATE TABLE
    public.dup_stack_companies (
        dupstack_id uuid NOT NULL,
        company_id uuid NOT NULL,
        created_at timestamp with time zone DEFAULT now () NOT NULL,
        workspace_id uuid NOT NULL,
        dup_type dup_stack_contact_type NOT NULL -- note: dup_stack_contact_type should be renamed to generic name in the future
    );

ALTER TABLE public.dup_stack_companies OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.dup_stack_companies ADD CONSTRAINT dup_stack_companies_pkey PRIMARY KEY (dupstack_id, company_id);

ALTER TABLE ONLY public.dup_stack_companies ADD CONSTRAINT dup_stack_companies_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.dup_stack_companies ADD CONSTRAINT dup_stack_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id); -- note: we do not want a delete cascade here, it must be handled with code

ALTER TABLE ONLY public.dup_stack_companies ADD CONSTRAINT dup_stack_companies_dup_stacks_id_fkey FOREIGN KEY (dupstack_id) REFERENCES public.dup_stacks (id) ON DELETE CASCADE;

-- Access

CREATE POLICY "Enable access for owner" ON public.dup_stack_companies TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = dup_stack_companies.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = dup_stack_companies.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.dup_stack_companies ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.dup_stack_companies TO anon;

GRANT ALL ON TABLE public.dup_stack_companies TO authenticated;

GRANT ALL ON TABLE public.dup_stack_companies TO service_role;