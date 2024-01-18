ALTER POLICY "Allow workspace owners to read"
    ON public.workspace_subscriptions
    -- FOR SELECT <- This cannot be altered but keeping in in case of copy paste of this policy in the future
    TO authenticated USING
    (EXISTS
        (
            SELECT 1
            FROM public.workspaces
            left join public.user_roles on user_roles.user_id = auth.uid()
            WHERE
                user_roles.role = 'SUPERADMIN' or
                (
                    (workspaces.id = workspace_subscriptions.workspace_id) AND
                    (workspaces.user_id = auth.uid())
                )
        ))