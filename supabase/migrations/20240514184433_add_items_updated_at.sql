ALTER TABLE items ADD COLUMN updated_at timestamp with time zone DEFAULT now() NOT NULL;
CREATE INDEX idx_items_updated_at ON items (updated_at, id_seq);

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();