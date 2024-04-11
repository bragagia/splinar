CREATE OR REPLACE FUNCTION items_edit_property_json(workspace_id_arg uuid, item_distant_id_arg text, json_update JSONB)
RETURNS VOID AS
$$
BEGIN
    UPDATE items
    SET "value" = "value" || json_update
    WHERE distant_id = item_distant_id_arg AND workspace_id = workspace_id_arg;
END;
$$
LANGUAGE plpgsql;