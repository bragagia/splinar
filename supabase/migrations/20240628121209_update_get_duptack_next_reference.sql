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