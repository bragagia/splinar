ALTER TABLE public.workspaces ADD COLUMN installation_companies_count integer NOT NULL default 0;
ALTER TABLE public.workspaces ADD COLUMN installation_contacts_count integer NOT NULL default 0;
ALTER TABLE public.workspaces ADD COLUMN installation_companies_total integer NOT NULL default 0;
ALTER TABLE public.workspaces ADD COLUMN installation_contacts_total integer NOT NULL default 0;