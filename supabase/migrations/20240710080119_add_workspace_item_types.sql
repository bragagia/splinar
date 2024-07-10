ALTER TABLE workspaces ADD COLUMN item_types jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE INDEX data_cleaning_job_logs_item_id_idx
    ON public.data_cleaning_job_logs
    USING btree (item_id);