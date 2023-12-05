-----------------------
-- COMPANY_SIMILARITIES

CREATE TYPE company_similaritie_field_type AS ENUM ('full_address', 'domain', 'website', 'name', 'phone', 'facebook_company_page', 'linkedin_company_page', 'twitterhandle');
CREATE TYPE company_similaritie_similarity_score AS ENUM ('exact', 'similar', 'potential', 'unlikely');

CREATE TABLE public.company_similarities (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    company_a_id uuid NOT NULL,
    company_b_id uuid NOT NULL,
    field_type company_similaritie_field_type NOT NULL,
    company_a_value text NOT NULL,
    company_b_value text NOT NULL,
    similarity_score company_similaritie_similarity_score NOT NULL,
    workspace_id uuid NOT NULL
);

ALTER TABLE public.company_similarities OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.company_similarities
    ADD CONSTRAINT company_similarities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.company_similarities
    ADD CONSTRAINT company_similarities_company_a_id_fkey FOREIGN KEY (company_a_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.company_similarities
    ADD CONSTRAINT company_similarities_company_b_id_fkey FOREIGN KEY (company_b_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.company_similarities
    ADD CONSTRAINT company_similarities_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Indexes

CREATE INDEX company_similarities_company_a_id_index ON public.company_similarities USING btree (company_a_id);

CREATE INDEX company_similarities_company_b_id_index ON public.company_similarities USING btree (company_b_id);

CREATE INDEX company_similarities_workspace_id_index ON public.company_similarities USING btree (workspace_id);

-- Access

CREATE POLICY "Allow workspace owners" ON public.company_similarities TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = company_similarities.workspace_id) AND (workspaces.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workspaces
  WHERE ((workspaces.id = company_similarities.workspace_id) AND (workspaces.user_id = auth.uid())))));

ALTER TABLE public.company_similarities ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.company_similarities TO anon;
GRANT ALL ON TABLE public.company_similarities TO authenticated;
GRANT ALL ON TABLE public.company_similarities TO service_role;