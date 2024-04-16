CREATE OR REPLACE VIEW get_dupstack_next_reference AS
SELECT
    json_agg(DISTINCT item) as item,
    json_agg(similarities) AS similarities
FROM
    (
        SELECT *
        FROM items
        WHERE
            merged_in_distant_id IS NULL
            AND workspace_id = '6a96d8e3-2fee-48c0-ac4d-8bcc7796f126'
            AND similarity_checked = TRUE
            AND dup_checked = FALSE
        ORDER BY filled_score DESC
        LIMIT 1
    ) AS item
LEFT JOIN similarities ON
	item.id = similarities.item_a_id OR
	item.id = similarities.item_b_id;