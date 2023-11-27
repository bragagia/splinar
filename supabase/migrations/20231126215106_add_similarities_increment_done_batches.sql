CREATE OR REPLACE FUNCTION similarities_increment_done_batches(workspace_id_arg uuid)
RETURNS VOID AS
$$
BEGIN
    UPDATE workspaces
    SET
        installation_similarity_done_batches = installation_similarity_done_batches + 1
    WHERE
        id = workspace_id_arg;
END;
$$
LANGUAGE plpgsql;