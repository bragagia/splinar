-- Note: This is pre-beta so no need to migrate data
DROP TABLE public.dup_stacks;

-- export type _DupStackType = {
--   id: string;
--   created_at?: string | undefined;
--   workspace_id: string;
-- };
-- DUP_STACKS
CREATE TABLE
    public.dup_stacks (
        id uuid NOT NULL DEFAULT uuid_generate_v4 (),
        created_at timestamp with time zone DEFAULT now () NOT NULL,
        workspace_id uuid NOT NULL
    );

ALTER TABLE public.dup_stacks OWNER TO postgres;

ALTER TABLE ONLY public.dup_stacks ADD CONSTRAINT dup_stacks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.dup_stacks ADD CONSTRAINT dup_stacks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;

CREATE POLICY "Enable access for owner" ON public.dup_stacks TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = dup_stacks.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = dup_stacks.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.dup_stacks ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.dup_stacks TO anon;

GRANT ALL ON TABLE public.dup_stacks TO authenticated;

GRANT ALL ON TABLE public.dup_stacks TO service_role;

-- DUP_STACK_CONTACTS

-- export type _DupStackContactType = {
--   dupstack_id: string; // PRIMARY
--   contact_id: string; // PRIMARY + UNIQUE
--   created_at?: string | undefined;
--   workspace_id: string;
--   type: "reference" | "confident" | "potential";
-- };

CREATE TYPE dup_stack_contact_type AS ENUM ('REFERENCE', 'CONFIDENT', 'POTENTIAL');

CREATE TABLE
    public.dup_stack_contacts (
        dupstack_id uuid NOT NULL,
        contact_id uuid NOT NULL,
        created_at timestamp with time zone DEFAULT now () NOT NULL,
        workspace_id uuid NOT NULL,
        dup_type dup_stack_contact_type NOT NULL
    );

ALTER TABLE public.dup_stack_contacts OWNER TO postgres;

ALTER TABLE ONLY public.dup_stack_contacts ADD CONSTRAINT dup_stack_contacts_pkey PRIMARY KEY (dupstack_id, contact_id);

ALTER TABLE ONLY public.dup_stack_contacts ADD CONSTRAINT dup_stack_contacts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.dup_stack_contacts ADD CONSTRAINT dup_stack_contacts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts (id); -- note: we do not want a delete cascade here, it must be handled with code

ALTER TABLE ONLY public.dup_stack_contacts ADD CONSTRAINT dup_stack_contacts_dup_stacks_id_fkey FOREIGN KEY (dupstack_id) REFERENCES public.dup_stacks (id) ON DELETE CASCADE;

CREATE POLICY "Enable access for owner" ON public.dup_stack_contacts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = dup_stack_contacts.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = dup_stack_contacts.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.dup_stack_contacts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.dup_stack_contacts TO anon;

GRANT ALL ON TABLE public.dup_stack_contacts TO authenticated;

GRANT ALL ON TABLE public.dup_stack_contacts TO service_role;