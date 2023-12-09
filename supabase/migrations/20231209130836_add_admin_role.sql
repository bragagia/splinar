-----------
-- WORKSPACE_USERS

CREATE TYPE user_role AS ENUM ('SUPERADMIN');

CREATE TABLE public.user_roles (
    user_id uuid DEFAULT auth.uid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role user_role NOT NULL
);

ALTER TABLE public.user_roles OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Access

CREATE POLICY "Allow owner read" ON public.user_roles for select TO authenticated USING ((auth.uid() = user_id));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

------------
--- Update existing policies

-- Workspace
ALTER POLICY "(auth.uid() = user_id)" ON public.workspaces TO authenticated USING
(
    (auth.uid() = user_id) OR
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'SUPERADMIN'))
)
WITH CHECK
(
    (auth.uid() = user_id) OR
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'SUPERADMIN'))
);

-- Contacts
ALTER POLICY "Allow workspace owners" ON public.contacts TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = contacts.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ))
WITH CHECK
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = contacts.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));


-- Companies
ALTER POLICY "Allow workspace owners" ON public.companies TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = companies.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ))
WITH CHECK
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = companies.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

-- Contact companies
ALTER POLICY "Allow workspace owner" ON public.contact_companies TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = contact_companies.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ))
WITH CHECK
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = contact_companies.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

-- Contact similarities
ALTER POLICY "Allow workspace owners" ON public.contact_similarities TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = contact_similarities.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ))
WITH CHECK
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = contact_similarities.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

-- Dup stacks
ALTER POLICY "Enable access for owner" ON public.dup_stacks TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = dup_stacks.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ))
WITH CHECK
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = dup_stacks.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

-- Dup stacks contacts
ALTER POLICY "Enable access for owner" ON public.dup_stack_contacts TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = dup_stack_contacts.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ))
WITH CHECK
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = dup_stack_contacts.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

-- Merged contacts
ALTER POLICY "Allow workspace owners" ON public.merged_contacts TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = merged_contacts.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ))
WITH CHECK
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = merged_contacts.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

-- Company similarities
ALTER POLICY "Allow workspace owners" ON public.company_similarities TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = company_similarities.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ))
WITH CHECK
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = company_similarities.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

-- Dup stack companies
ALTER POLICY "Enable access for owner" ON public.dup_stack_companies TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = dup_stack_companies.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ))
WITH CHECK
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = dup_stack_companies.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

-- Merged companies
ALTER POLICY "Allow workspace owners" ON public.merged_companies TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = merged_companies.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ))
WITH CHECK
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = merged_companies.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));