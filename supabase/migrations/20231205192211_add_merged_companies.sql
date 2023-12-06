-----------
-- MERGED COMPANIES

CREATE TABLE public.merged_companies (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid NOT NULL,
    hs_id bigint NOT NULL,
    merged_in_hs_id bigint NOT NULL,

    name TEXT,

    address TEXT,
    zip TEXT,
    city TEXT,
    state TEXT,
    country TEXT,

    domain TEXT,
    website TEXT,
    owner_hs_id BIGINT,
    phone TEXT,

    facebook_company_page TEXT,
    linkedin_company_page TEXT,
    twitterhandle TEXT
);

ALTER TABLE public.merged_companies OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.merged_companies
    ADD CONSTRAINT merged_companies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.merged_companies
    ADD CONSTRAINT merged_companies_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Indexes

CREATE INDEX merged_companies_workspace_id_idx ON public.merged_companies USING btree (workspace_id);

-- Access

CREATE POLICY "Allow workspace owners" ON public.merged_companies TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = merged_companies.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = merged_companies.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.merged_companies ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.merged_companies TO anon;
GRANT ALL ON TABLE public.merged_companies TO authenticated;
GRANT ALL ON TABLE public.merged_companies TO service_role;

-----------
--- VIEW

CREATE OR REPLACE FUNCTION get_merged_companies_by_months(workspace_id_arg UUID)
RETURNS TABLE(
    month TIMESTAMP,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CAST(DATE_TRUNC('month', created_at) AS TIMESTAMP) AS month,
        COUNT(*)
    FROM merged_companies
    WHERE workspace_id_arg = workspace_id
    GROUP BY
        month;
END;
$$ LANGUAGE plpgsql;