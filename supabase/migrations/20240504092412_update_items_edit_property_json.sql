DROP FUNCTION IF EXISTS items_edit_property_json;

CREATE OR REPLACE FUNCTION items_edit_property_json(workspace_id_arg uuid, item_distant_id_arg text, arg_item_type dup_stack_item_type, json_update JSONB, should_update_similarities BOOLEAN DEFAULT FALSE)
RETURNS VOID AS
$$
BEGIN
    UPDATE items
    SET "value" = "value" || json_update
    WHERE
        distant_id = item_distant_id_arg
        AND item_type = arg_item_type
        AND workspace_id = workspace_id_arg;

    IF should_update_similarities THEN
        UPDATE items
        SET similarity_checked = FALSE
        WHERE
            distant_id = item_distant_id_arg
            AND item_type = arg_item_type
            AND workspace_id = workspace_id_arg;
    END IF;
END;
$$
LANGUAGE plpgsql;