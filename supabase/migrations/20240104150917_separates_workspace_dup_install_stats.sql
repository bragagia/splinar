ALTER TABLE public.workspaces DROP COLUMN installation_dup_total;
ALTER TABLE public.workspaces DROP COLUMN installation_dup_done;

ALTER TABLE public.workspaces ADD COLUMN installation_companies_dup_total integer NOT NULL default 0;
ALTER TABLE public.workspaces ADD COLUMN installation_contacts_dup_total integer NOT NULL default 0;
ALTER TABLE public.workspaces ADD COLUMN installation_companies_dup_done integer NOT NULL default 0;
ALTER TABLE public.workspaces ADD COLUMN installation_contacts_dup_done integer NOT NULL default 0;