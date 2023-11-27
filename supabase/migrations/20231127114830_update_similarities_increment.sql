-- Make it concurent ready

CREATE OR REPLACE FUNCTION similarities_increment_done_batches(workspace_id_arg uuid)
RETURNS VOID AS
$$
declare
  cur_done integer;
BEGIN
    SELECT
        installation_similarity_done_batches
    INTO
    	cur_done
    FROM
        workspaces
    WHERE
        id = workspace_id_arg
    FOR UPDATE;

    UPDATE workspaces
    SET
        installation_similarity_done_batches = cur_done + 1
    WHERE
        id = workspace_id_arg;
END;
$$
LANGUAGE plpgsql;