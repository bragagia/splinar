DROP FUNCTION similarities_increment_done_batches;

ALTER TABLE public.workspaces RENAME COLUMN installation_similarity_total_batches TO installation_contacts_similarities_total_batches;
ALTER TABLE public.workspaces RENAME COLUMN installation_similarity_done_batches TO installation_contacts_similarities_done_batches;

ALTER TABLE public.workspaces ADD COLUMN installation_companies_similarities_total_batches bigint NOT NULL default 0;
ALTER TABLE public.workspaces ADD COLUMN installation_companies_similarities_done_batches bigint NOT NULL default 0;
ALTER TABLE public.workspaces ALTER COLUMN installation_companies_similarities_total_batches DROP DEFAULT;
ALTER TABLE public.workspaces ALTER COLUMN installation_companies_similarities_done_batches DROP DEFAULT;

CREATE OR REPLACE FUNCTION contacts_similarities_increment_done_batches(workspace_id_arg uuid)
RETURNS VOID AS
$$
BEGIN
    UPDATE workspaces
    SET
        installation_contacts_similarities_done_batches = installation_contacts_similarities_done_batches + 1
    WHERE
        id = workspace_id_arg;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION companies_similarities_increment_done_batches(workspace_id_arg uuid)
RETURNS VOID AS
$$
BEGIN
    UPDATE workspaces
    SET
        installation_companies_similarities_done_batches = installation_companies_similarities_done_batches + 1
    WHERE
        id = workspace_id_arg;
END;
$$
LANGUAGE plpgsql;