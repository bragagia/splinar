-- Make it concurent ready

CREATE OR REPLACE FUNCTION similarities_increment_done_batches(workspace_id_arg uuid)
RETURNS VOID AS
$$
BEGIN
    PERFORM
        installation_similarity_done_batches
    FROM
        workspaces
    WHERE
        id = workspace_id_arg
    FOR UPDATE;

    UPDATE workspaces
    SET
        installation_similarity_done_batches = installation_similarity_done_batches + 1
    WHERE
        id = workspace_id_arg;

    COMMIT;
END;
$$
LANGUAGE plpgsql;