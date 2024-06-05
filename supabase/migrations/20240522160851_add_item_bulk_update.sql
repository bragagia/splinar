CREATE OR REPLACE FUNCTION public.items_bulk_edit_properties_json(
    workspace_id_arg uuid,
    items_updates jsonb[],
    should_update_similarities boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    item jsonb;
BEGIN
    FOREACH item IN ARRAY items_updates
    LOOP
        UPDATE items
        SET "value" = "value" || item->'json_update', jobs_update_executed = FALSE
        WHERE
            id = item->>'id'
            AND workspace_id = workspace_id_arg;

        IF should_update_similarities THEN
            UPDATE items
            SET similarity_checked = FALSE
            WHERE
                id = item->>'id'
                AND workspace_id = workspace_id_arg;
        END IF;
    END LOOP;
END;
$function$;