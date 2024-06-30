CREATE OR REPLACE FUNCTION update_items_on_new_similarity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items
    SET dup_checked = false
    WHERE id IN (NEW.item_a_id, NEW.item_b_id);

    -- Return the new row to finish the trigger execution
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_items_on_new_similarity_trigger
AFTER INSERT ON similarities
FOR EACH ROW
EXECUTE FUNCTION update_items_on_new_similarity();