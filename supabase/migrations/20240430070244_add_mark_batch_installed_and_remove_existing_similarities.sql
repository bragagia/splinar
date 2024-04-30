CREATE OR REPLACE FUNCTION mark_batch_installed_and_remove_existing_similarities(arg_workspace_id UUID, arg_item_type dup_stack_item_type, arg_id_seq_start integer, arg_id_seq_end integer)
RETURNS void AS
$$
BEGIN
	DELETE FROM similarities
	USING items
	WHERE
		(
			similarities.item_a_id = items.id
			OR similarities.item_b_id = items.id
		) AND items.merged_in_distant_id IS NULL
        AND items.workspace_id = arg_workspace_id
		AND items.item_type = arg_item_type
		AND items.id_seq >= arg_id_seq_start
		AND items.id_seq <= arg_id_seq_end;

	UPDATE items
	SET
		similarity_checked = true
	WHERE
		items.merged_in_distant_id IS NULL
        AND items.workspace_id = arg_workspace_id
		AND items.item_type = arg_item_type
		AND items.id_seq >= arg_id_seq_start
		AND items.id_seq <= arg_id_seq_end;
END;
$$
LANGUAGE plpgsql;


-- This migration removes the "stable" from this function:

CREATE OR REPLACE FUNCTION get_dupstack_next_reference(arg_workspace_id UUID)
RETURNS TABLE(item JSON, similarities JSON, dup_stack_items JSON) AS
$$
BEGIN
    RETURN QUERY
	SELECT
	    json_agg(DISTINCT item_res) as item,
	    json_agg(sims) AS similarities,
        json_agg(dsi) AS dup_stack_items
	FROM
	    (
	        SELECT * -- Converts entire row to JSON, excluding the ID if you don't want it doubled
	        FROM items
	        WHERE
	            merged_in_distant_id IS NULL
	            AND workspace_id = arg_workspace_id
	            AND similarity_checked = TRUE
	            AND dup_checked = FALSE
	        ORDER BY filled_score DESC, id_seq ASC
	        LIMIT 1
	    ) AS item_res
	LEFT JOIN similarities as sims ON
		item_res.id = sims.item_a_id OR
		item_res.id = sims.item_b_id
    LEFT JOIN dup_stack_items as dsi ON
		item_res.id = dsi.item_id;
END;
$$
LANGUAGE plpgsql;