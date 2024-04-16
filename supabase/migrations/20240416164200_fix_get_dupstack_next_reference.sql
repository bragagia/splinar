DROP VIEW get_dupstack_next_reference;

CREATE OR REPLACE FUNCTION get_dupstack_next_reference(arg_workspace_id UUID)
RETURNS TABLE(item JSON, similarities JSON) AS
$$
BEGIN
    RETURN QUERY
	SELECT
	    json_agg(DISTINCT item_res) as item,
	    json_agg(sims) AS similarities
	FROM
	    (
	        SELECT * -- Converts entire row to JSON, excluding the ID if you don't want it doubled
	        FROM items
	        WHERE
	            merged_in_distant_id IS NULL
	            AND workspace_id = arg_workspace_id
	            AND similarity_checked = TRUE
	            AND dup_checked = FALSE
	        ORDER BY filled_score DESC
	        LIMIT 1
	    ) AS item_res
	LEFT JOIN similarities as sims ON
		item_res.id = sims.item_a_id OR
		item_res.id = sims.item_b_id;
END;
$$
LANGUAGE plpgsql STABLE;