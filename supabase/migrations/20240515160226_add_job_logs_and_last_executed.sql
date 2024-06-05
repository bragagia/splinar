
-- DATA_CLEANING_JOBS
ALTER TABLE data_cleaning_jobs ADD COLUMN deleted_at timestamp with time zone;

ALTER TABLE public.data_cleaning_jobs DROP COLUMN target_item_types;
ALTER TABLE public.data_cleaning_jobs ADD COLUMN target_item_type dup_stack_item_type DEFAULT 'CONTACTS'::dup_stack_item_type NOT NULL;

CREATE INDEX data_cleaning_jobs_deleted_at_index ON data_cleaning_jobs (deleted_at);



-- DATA_CLEANING_JOB_VALIDATED
ALTER TABLE public.data_cleaning_job_validated DROP CONSTRAINT data_cleaning_job_validated_pkey;
ALTER TABLE data_cleaning_job_validated ADD COLUMN id uuid DEFAULT uuid_generate_v4() PRIMARY KEY;

ALTER TABLE data_cleaning_job_validated ADD COLUMN deleted_at timestamp with time zone;
ALTER TABLE data_cleaning_job_validated ADD COLUMN auto_accept_changes boolean DEFAULT false NOT NULL;

ALTER TABLE public.data_cleaning_job_validated DROP COLUMN target_item_types;
ALTER TABLE public.data_cleaning_job_validated ADD COLUMN target_item_type dup_stack_item_type DEFAULT 'CONTACTS'::dup_stack_item_type NOT NULL;

-- Note: Adding status on data_cleaning_job instead of data_cleaning_job_validated because we want to keep the logs even if the job is deleted
ALTER TABLE data_cleaning_job_validated ADD COLUMN errored_timeout_or_fatal boolean DEFAULT false NOT NULL;
ALTER TABLE data_cleaning_job_validated ADD COLUMN errored_message text;
ALTER TABLE data_cleaning_job_validated ADD COLUMN errored_on_item_id uuid;

CREATE INDEX data_cleaning_job_validated_deleted_at_index ON data_cleaning_job_validated (deleted_at);




-- DATA_CLEANING_JOB_LOGS
CREATE TABLE data_cleaning_job_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4 (),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  workspace_id uuid NOT NULL,
  data_cleaning_job_id uuid NOT NULL,
  data_cleaning_job_validated_id uuid NOT NULL,
  item_type dup_stack_item_type NOT NULL,
  item_id uuid NOT NULL,
  prev_value jsonb NOT NULL,
  new_value jsonb NOT NULL,
  accepted_at timestamp with time zone
);

-- Constraints
ALTER TABLE ONLY public.data_cleaning_job_logs
    ADD CONSTRAINT data_cleaning_job_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.data_cleaning_job_logs ADD CONSTRAINT data_cleaning_job_logs_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items (id) ON DELETE CASCADE;
ALTER TABLE public.data_cleaning_job_logs ADD CONSTRAINT data_cleaning_job_logs_data_cleaning_job_id_fkey FOREIGN KEY (data_cleaning_job_id) REFERENCES public.data_cleaning_jobs (id) ON DELETE CASCADE;
ALTER TABLE public.data_cleaning_job_logs ADD CONSTRAINT data_cleaning_job_logs_data_cleaning_job_validated_id_fkey FOREIGN KEY (data_cleaning_job_validated_id) REFERENCES public.data_cleaning_job_validated (id) ON DELETE CASCADE;
ALTER TABLE public.data_cleaning_job_logs ADD CONSTRAINT data_cleaning_job_logs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;

-- Index
CREATE INDEX data_cleaning_job_logs_workspace_id_accepted_at_created_at_id_index ON data_cleaning_job_logs (workspace_id, accepted_at, created_at, id);

-- Access
CREATE POLICY "Allow workspace owners to read" ON public.data_cleaning_job_logs
FOR SELECT TO authenticated
USING (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))));

ALTER TABLE public.data_cleaning_job_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.data_cleaning_job_logs TO anon;
GRANT ALL ON TABLE public.data_cleaning_job_logs TO authenticated;
GRANT ALL ON TABLE public.data_cleaning_job_logs TO service_role;




-- ITEMS

ALTER TABLE items ADD COLUMN jobs_creation_executed boolean DEFAULT false NOT NULL;
ALTER TABLE items ADD COLUMN jobs_update_executed boolean DEFAULT false NOT NULL;

-- Index
CREATE INDEX items_jobs_creation_executed_index ON items (jobs_creation_executed);
CREATE INDEX items_jobs_update_executed_index ON items (jobs_update_executed);

CREATE OR REPLACE FUNCTION items_edit_property_json(workspace_id_arg uuid, item_distant_id_arg text, arg_item_type dup_stack_item_type, json_update JSONB, should_update_similarities BOOLEAN DEFAULT FALSE)
RETURNS VOID AS
$$
BEGIN
    UPDATE items
    SET "value" = "value" || json_update, jobs_update_executed = FALSE
    WHERE
        distant_id = item_distant_id_arg
        AND item_type = arg_item_type
        AND workspace_id = workspace_id_arg;

    IF should_update_similarities THEN
        UPDATE items
        SET similarity_checked = FALSE
        WHERE
            distant_id = item_distant_id_arg
            AND item_type = arg_item_type
            AND workspace_id = workspace_id_arg;
    END IF;
END;
$$
LANGUAGE plpgsql;