ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspace_hub_id_unique UNIQUE (hub_id);