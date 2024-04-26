ALTER TABLE workspaces ADD COLUMN first_installed_at timestamp with time zone DEFAULT now();
ALTER TABLE workspaces ALTER COLUMN first_installed_at DROP DEFAULT;