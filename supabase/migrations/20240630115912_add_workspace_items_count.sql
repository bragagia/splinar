ALTER TABLE workspaces
ADD COLUMN items_count_on_install INT;

-- Update the "items_count_on_install" column with the count of items for each workspace
UPDATE workspaces
SET items_count_on_install = (
    SELECT COUNT(*)
    FROM items
    WHERE items.workspace_id = workspaces.id AND items.merged_in_distant_id IS NULL
);

