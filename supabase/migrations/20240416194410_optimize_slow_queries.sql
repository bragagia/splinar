CREATE OR REPLACE FUNCTION mark_items_without_similarities_as_dup_checked(workspace_id_arg uuid)
RETURNS VOID AS
$$
BEGIN
    UPDATE items
    SET dup_checked = true
    WHERE
        workspace_id = workspace_id_arg AND
        dup_checked = false AND
        NOT EXISTS (
            SELECT 1
            FROM similarities
            WHERE (similarities.item_a_id = items.id OR similarities.item_b_id = items.id)
        );
END;
$$
LANGUAGE plpgsql;

alter role authenticator set statement_timeout = '120s';

create or replace function get_available_workspaces_for_user(arg_user_id uuid)
returns setof uuid as $$
    SELECT id
    FROM workspaces
    WHERE
        (EXISTS (
            SELECT 1
            FROM user_roles
            WHERE
                user_roles.user_id = arg_user_id
                AND user_roles.role = 'SUPERADMIN'
        ))
        OR workspaces.user_id = arg_user_id
$$ stable language sql security definer;

ALTER POLICY "Allow workspace owners" ON public.items TO authenticated
USING (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))))
WITH CHECK (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))));

ALTER POLICY "Allow workspace owners" ON public.similarities TO authenticated
USING (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))))
WITH CHECK (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))));

ALTER POLICY "Allow workspace owners" ON public.dup_stack_items TO authenticated
USING (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))))
WITH CHECK (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))));

ALTER POLICY "Enable access for owner" ON public.dup_stacks TO authenticated
USING (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))))
WITH CHECK (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))));

ALTER POLICY "Allow workspace owners" ON public.data_cleaning_jobs TO authenticated
USING (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))))
WITH CHECK (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))));

ALTER POLICY "Allow workspace owners to read" ON public.data_cleaning_job_validated TO authenticated
--FOR SELECT -- Cannot be altered
USING (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))));

ALTER POLICY "Allow workspace owners to read" ON public.workspace_subscriptions TO authenticated
--FOR SELECT -- Cannot be altered
USING (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))));

ALTER POLICY "Allow owner read" ON public.user_roles TO authenticated
--FOR SELECT -- Cannot be altered
USING (user_id = (select auth.uid()));

DROP POLICY "(auth.uid() = user_id)" ON public.workspaces;
CREATE POLICY "Allow workspace owners" ON public.workspaces TO authenticated USING (
    ((select auth.uid()) = user_id) OR
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'SUPERADMIN'))
)
WITH CHECK (
    ((select auth.uid()) = user_id) OR
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'SUPERADMIN'))
);

CREATE INDEX dup_stack_items_dup_stacks_id_fkey_idx
    ON public.dup_stack_items
    USING btree (dupstack_id);

CREATE INDEX data_cleaning_job_validated_workspace_id_fkey
    ON public.data_cleaning_job_validated
    USING btree (workspace_id);