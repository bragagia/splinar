DROP FUNCTION IF EXISTS mark_batch_installed_and_remove_existing_similarities;

CREATE OR REPLACE FUNCTION mark_batch_installed_and_remove_existing_similarities(arg_item_ids uuid[])
RETURNS void AS
$$
BEGIN
	DELETE FROM similarities
	USING items
	WHERE
		(
			similarities.item_a_id = items.id
			OR similarities.item_b_id = items.id
		) AND items.id = ANY(arg_item_ids);

	UPDATE items
	SET
		similarity_checked = true
	WHERE
		items.id = ANY(arg_item_ids);
END;
$$
LANGUAGE plpgsql;