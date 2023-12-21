DROP FUNCTION contacts_similarities_increment_done_batches;
DROP FUNCTION companies_similarities_increment_done_batches;

CREATE OR REPLACE FUNCTION contacts_similarities_increment_done_batches(workspace_id_arg uuid)
RETURNS BOOLEAN AS
$$
DECLARE
    cur_done INTEGER;
    total_batches INTEGER;
BEGIN
    SELECT
        installation_contacts_similarities_done_batches,
        installation_contacts_similarities_total_batches
    INTO
        cur_done, total_batches
    FROM
        workspaces
    WHERE
        id = workspace_id_arg
    FOR UPDATE;

    UPDATE workspaces
    SET
        installation_contacts_similarities_done_batches = cur_done + 1
    WHERE
        id = workspace_id_arg;

    RETURN (cur_done + 1 = total_batches);
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION companies_similarities_increment_done_batches(workspace_id_arg uuid)
RETURNS BOOLEAN AS
$$
DECLARE
    cur_done INTEGER;
    total_batches INTEGER;
BEGIN
    SELECT
        installation_companies_similarities_done_batches,
        installation_companies_similarities_total_batches
    INTO
        cur_done, total_batches
    FROM
        workspaces
    WHERE
        id = workspace_id_arg
    FOR UPDATE;

    UPDATE workspaces
    SET
        installation_companies_similarities_done_batches = cur_done + 1
    WHERE
        id = workspace_id_arg;

    RETURN (cur_done + 1 = total_batches);
END;
$$
LANGUAGE plpgsql;