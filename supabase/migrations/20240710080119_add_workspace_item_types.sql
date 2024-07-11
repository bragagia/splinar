ALTER TABLE workspaces ADD COLUMN item_types jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE INDEX data_cleaning_job_logs_item_id_idx
    ON public.data_cleaning_job_logs
    USING btree (item_id);

-- Retroadded to that migration because forgotten
SET statement_timeout = 300000;

delete from similarities where id in (select MIN(id::text)::uuid from similarities group by (workspace_id, item_a_id, item_b_id, field_type) having count(id) > 1);

CREATE UNIQUE INDEX idx_unique_similarities ON similarities (
    workspace_id,
    item_a_id,
    item_b_id,
    field_type
);