CREATE TYPE workspace_operation_status AS ENUM ('NONE', 'PENDING');

ALTER TABLE public.workspaces ADD COLUMN contacts_operation_status workspace_operation_status NOT NULL default 'NONE';
ALTER TABLE public.workspaces ADD COLUMN companies_operation_status workspace_operation_status NOT NULL default 'NONE';