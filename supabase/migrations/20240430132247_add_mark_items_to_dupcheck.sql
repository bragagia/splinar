CREATE OR REPLACE FUNCTION mark_items_to_dupcheck(arg_workspace_id UUID, arg_item_ids uuid[])
RETURNS void AS
$$
BEGIN
	UPDATE items
	SET
		dup_checked = false
	WHERE
		workspace_id = arg_workspace_id
		AND id = ANY(arg_item_ids);
END;
$$
LANGUAGE plpgsql;

ALTER TABLE items ALTER COLUMN dup_checked SET DEFAULT true;

DROP FUNCTION similarities_increment_done_batches;

-- Adds missing clause on merged_in_distant_id:

CREATE OR REPLACE FUNCTION mark_items_without_similarities_as_dup_checked(workspace_id_arg uuid)
RETURNS VOID AS
$$
BEGIN
    UPDATE items
    SET dup_checked = true
    WHERE
        workspace_id = workspace_id_arg AND
        dup_checked = false AND
        merged_in_distant_id IS NULL AND
        NOT EXISTS (
            SELECT 1
            FROM similarities
            WHERE (similarities.item_a_id = items.id OR similarities.item_b_id = items.id)
        );
END;
$$
LANGUAGE plpgsql;