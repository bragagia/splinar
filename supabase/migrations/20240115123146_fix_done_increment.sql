DROP FUNCTION similarities_increment_done_batches;

CREATE OR REPLACE FUNCTION similarities_increment_done_batches(workspace_id_arg uuid)
RETURNS INTEGER AS
$$
DECLARE
    cur_done INTEGER;
    total_batches INTEGER;
BEGIN
    SELECT
        installation_similarities_done_batches,
        installation_similarities_total_batches
    INTO
        cur_done, total_batches
    FROM
        workspaces
    WHERE
        id = workspace_id_arg
    FOR UPDATE;

    UPDATE workspaces
    SET
        installation_similarities_done_batches = installation_similarities_done_batches + 1
    WHERE
        id = workspace_id_arg;

    RETURN (total_batches - cur_done - 1);
END;
$$
LANGUAGE plpgsql;