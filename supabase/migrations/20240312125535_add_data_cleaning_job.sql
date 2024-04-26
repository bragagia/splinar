------- DATA CLEANING JOBS

CREATE TYPE data_cleaning_jobs_mode AS ENUM ('standard', 'expert');

CREATE TYPE data_cleaning_jobs_recurrence AS ENUM ('each-new', 'each-new-and-updated', 'every-day', 'every-week', 'every-month');

CREATE TABLE public.data_cleaning_jobs (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    target_item_types text[] NOT NULL,
    recurrence data_cleaning_jobs_recurrence NOT NULL,
    mode data_cleaning_jobs_mode NOT NULL,
    code text NOT NULL,
    last_execution timestamp with time zone
);

ALTER TABLE public.data_cleaning_jobs OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.data_cleaning_jobs
    ADD CONSTRAINT data_cleaning_jobs_pkey
    PRIMARY KEY (id);

ALTER TABLE ONLY public.data_cleaning_jobs
    ADD CONSTRAINT data_cleaning_jobs_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- Indexes

CREATE INDEX data_cleaning_jobs_workspace_id_idx
    ON public.data_cleaning_jobs
    USING btree (workspace_id);

-- Access

CREATE POLICY "Allow workspace owners" ON public.data_cleaning_jobs USING (
    EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'SUPERADMIN'
    )
    OR
    workspace_id IN (
        SELECT id
        FROM public.workspaces
        WHERE workspaces.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'SUPERADMIN'
    )
    OR
    workspace_id IN (
        SELECT id
        FROM public.workspaces
        WHERE workspaces.user_id = auth.uid()
    )
);

ALTER TABLE public.data_cleaning_jobs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.data_cleaning_jobs TO anon;
GRANT ALL ON TABLE public.data_cleaning_jobs TO authenticated;
GRANT ALL ON TABLE public.data_cleaning_jobs TO service_role;








------- DATA CLEANING JOB VALIDATED

CREATE TABLE public.data_cleaning_job_validated (
    data_cleaning_job_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    target_item_types text[] NOT NULL,
    recurrence data_cleaning_jobs_recurrence NOT NULL,
    mode data_cleaning_jobs_mode NOT NULL,
    code text NOT NULL
);

ALTER TABLE public.data_cleaning_job_validated OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.data_cleaning_job_validated
    ADD CONSTRAINT data_cleaning_job_validated_pkey
    PRIMARY KEY (data_cleaning_job_id);

ALTER TABLE ONLY public.data_cleaning_job_validated
    ADD CONSTRAINT data_cleaning_job_validated_data_cleaning_job_id_fkey
    FOREIGN KEY (data_cleaning_job_id) REFERENCES public.data_cleaning_jobs(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.data_cleaning_job_validated
    ADD CONSTRAINT data_cleaning_job_validated_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- Indexes

CREATE INDEX data_cleaning_job_validated_data_cleaning_job_id_idx
    ON public.data_cleaning_job_validated
    USING btree (data_cleaning_job_id);

-- Access

CREATE POLICY "Allow workspace owners to read" ON public.data_cleaning_job_validated
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'SUPERADMIN'
        )
        OR
        workspace_id IN (
            SELECT id
            FROM public.workspaces
            WHERE workspaces.user_id = auth.uid()
        )
    );

ALTER TABLE public.data_cleaning_job_validated ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.data_cleaning_job_validated TO anon;
GRANT ALL ON TABLE public.data_cleaning_job_validated TO authenticated;
GRANT ALL ON TABLE public.data_cleaning_job_validated TO service_role;