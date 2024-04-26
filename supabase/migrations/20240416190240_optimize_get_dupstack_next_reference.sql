CREATE INDEX IF NOT EXISTS idx_items_composite ON items (
    workspace_id,
    filled_score,
    similarity_checked,
    dup_checked,
    merged_in_distant_id
);