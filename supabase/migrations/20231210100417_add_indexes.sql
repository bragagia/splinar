CREATE INDEX companies_workspace_id_idx ON public.companies USING btree (workspace_id);

CREATE INDEX contact_companies_workspace_id_idx ON public.contact_companies USING btree (workspace_id);
CREATE INDEX contact_companies_company_id_idx ON public.contact_companies USING btree (company_id);

CREATE INDEX dup_stack_companies_workspace_id_idx ON public.dup_stack_companies USING btree (workspace_id);
CREATE INDEX dup_stack_companies_company_id_idx ON public.dup_stack_companies USING btree (company_id);
CREATE INDEX dup_stack_companies_dupstack_id_idx ON public.dup_stack_companies USING btree (dupstack_id);

CREATE INDEX dup_stack_contacts_workspace_id_idx ON public.dup_stack_contacts USING btree (workspace_id);
CREATE INDEX dup_stack_contacts_contact_id_idx ON public.dup_stack_contacts USING btree (contact_id);
CREATE INDEX dup_stack_contacts_dupstack_id_idx ON public.dup_stack_contacts USING btree (dupstack_id);

CREATE INDEX dup_stacks_workspace_id_idx ON public.dup_stacks USING btree (workspace_id);

CREATE INDEX workspaces_user_id_idx ON public.workspaces USING btree (user_id);