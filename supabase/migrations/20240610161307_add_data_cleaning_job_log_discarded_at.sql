ALTER TABLE data_cleaning_job_logs ADD COLUMN discarded_at TIMESTAMP WITH TIME ZONE;

DROP INDEX IF EXISTS data_cleaning_job_logs_workspace_id_data_cleaning_job_id_item_id_index;
CREATE UNIQUE INDEX data_cleaning_job_logs_workspace_id_data_cleaning_job_id_item_id_index ON data_cleaning_job_logs (workspace_id, data_cleaning_job_id, item_id, accepted_at, discarded_at) WHERE accepted_at IS NULL AND discarded_at IS NULL;