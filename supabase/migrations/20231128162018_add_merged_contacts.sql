-----------
-- MERGED CONTACTS

CREATE TABLE public.merged_contacts (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid NOT NULL,
    hs_id bigint NOT NULL,
    merged_in_hs_id bigint NOT NULL,
    first_name text,
    last_name text,
    emails text[],
    phones text[],
    companies_hs_id bigint[],
    company_name text
);

ALTER TABLE public.merged_contacts OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.merged_contacts
    ADD CONSTRAINT merged_contacts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.merged_contacts
    ADD CONSTRAINT merged_contacts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Indexes

CREATE INDEX merged_contacts_workspace_id_idx ON public.merged_contacts USING btree (workspace_id);

-- Access

CREATE POLICY "Allow workspace owners" ON public.merged_contacts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = merged_contacts.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = merged_contacts.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.merged_contacts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.merged_contacts TO anon;
GRANT ALL ON TABLE public.merged_contacts TO authenticated;
GRANT ALL ON TABLE public.merged_contacts TO service_role;

-----------
--- VIEW

CREATE OR REPLACE FUNCTION get_merged_contacts_by_months(workspace_id_arg UUID)
RETURNS TABLE(
    month TIMESTAMP,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CAST(DATE_TRUNC('month', created_at) AS TIMESTAMP) AS month,
        COUNT(*)
    FROM merged_contacts
    WHERE workspace_id_arg = workspace_id
    GROUP BY
        month;
END;
$$ LANGUAGE plpgsql;