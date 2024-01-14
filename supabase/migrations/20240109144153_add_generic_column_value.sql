
-- ITEMS

CREATE TABLE public.items (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid NOT NULL,
    item_type dup_stack_item_type NOT NULL,
    distant_id text NOT NULL,
    merged_in_distant_id text DEFAULT NULL,
    merged_at timestamp DEFAULT NULL,
    similarity_checked boolean NOT NULL,
    dup_checked boolean NOT NULL,
    filled_score bigint NOT NULL,
    "value" jsonb NOT NULL
);

ALTER TABLE public.items OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_workspace_id_item_type_distant_id UNIQUE (workspace_id, item_type, distant_id);

-- Indexes

CREATE INDEX items_filled_score_index ON public.items USING btree (filled_score);

CREATE INDEX items_similarity_checked_idx ON public.items USING btree (similarity_checked);

CREATE INDEX items_dup_checked_idx ON public.items USING btree (dup_checked);

CREATE INDEX items_workspace_id_idx ON public.items USING btree (workspace_id);

CREATE INDEX items_item_type_idx ON public.items USING btree (item_type);

CREATE INDEX items_distant_id_idx ON public.items USING btree (distant_id);

CREATE INDEX items_merged_in_distant_id_idx ON public.items USING btree (merged_in_distant_id);

CREATE INDEX items_merged_at_idx ON public.items USING btree (merged_at);

-- Access

CREATE POLICY "Allow workspace owners" ON public.items TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = items.workspace_id) AND
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
                (workspaces.id = items.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.items TO anon;
GRANT ALL ON TABLE public.items TO authenticated;
GRANT ALL ON TABLE public.items TO service_role;


-----------------------
-- SIMILARITIES

CREATE TYPE similarities_similarity_score AS ENUM ('exact', 'similar', 'potential', 'unlikely');

CREATE TABLE public.similarities (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    item_a_id uuid NOT NULL,
    item_b_id uuid NOT NULL,
    field_type TEXT NOT NULL,
    item_a_value text NOT NULL,
    item_b_value text NOT NULL,
    similarity_score similarities_similarity_score NOT NULL,
    workspace_id uuid NOT NULL
);

ALTER TABLE public.similarities OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.similarities
    ADD CONSTRAINT similarities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.similarities
    ADD CONSTRAINT similarities_item_a_id_fkey FOREIGN KEY (item_a_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.similarities
    ADD CONSTRAINT similarities_item_b_id_fkey FOREIGN KEY (item_b_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.similarities
    ADD CONSTRAINT similarities_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Indexes

CREATE INDEX similarities_item_a_id_index ON public.similarities USING btree (item_a_id);

CREATE INDEX similarities_item_b_id_index ON public.similarities USING btree (item_b_id);

CREATE INDEX similarities_workspace_id_index ON public.similarities USING btree (workspace_id);

-- Access

CREATE POLICY "Allow workspace owners" ON public.similarities TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = similarities.workspace_id) AND
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
                (workspaces.id = similarities.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

ALTER TABLE public.similarities ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.similarities TO anon;
GRANT ALL ON TABLE public.similarities TO authenticated;
GRANT ALL ON TABLE public.similarities TO service_role;

-----------------------
-- DUP_STACK_ITEMS

CREATE TABLE
    public.dup_stack_items (
        dupstack_id uuid NOT NULL,
        item_id uuid NOT NULL,
        created_at timestamp with time zone DEFAULT now () NOT NULL,
        workspace_id uuid NOT NULL,
        dup_type dup_stack_item_dup_type NOT NULL
    );

ALTER TABLE public.dup_stack_items OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.dup_stack_items ADD CONSTRAINT dup_stack_items_pkey PRIMARY KEY (dupstack_id, item_id);

ALTER TABLE ONLY public.dup_stack_items ADD CONSTRAINT dup_stack_items_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.dup_stack_items ADD CONSTRAINT dup_stack_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items (id); -- note: we do not want a delete cascade here, it must be handled with code

ALTER TABLE ONLY public.dup_stack_items ADD CONSTRAINT dup_stack_items_dup_stacks_id_fkey FOREIGN KEY (dupstack_id) REFERENCES public.dup_stacks (id) ON DELETE CASCADE;

-- Access

CREATE POLICY "Allow workspace owners" ON public.dup_stack_items TO authenticated USING
(EXISTS
    (
        SELECT 1
        FROM public.workspaces
        left join public.user_roles on user_roles.user_id = auth.uid()
        WHERE
            user_roles.role = 'SUPERADMIN' or
            (
                (workspaces.id = dup_stack_items.workspace_id) AND
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
                (workspaces.id = dup_stack_items.workspace_id) AND
                (workspaces.user_id = auth.uid())
            )
    ));

ALTER TABLE public.dup_stack_items ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.dup_stack_items TO anon;

GRANT ALL ON TABLE public.dup_stack_items TO authenticated;

GRANT ALL ON TABLE public.dup_stack_items TO service_role;


------------

CREATE OR REPLACE FUNCTION mark_items_without_similarities_as_dup_checked(workspace_id_arg uuid)
RETURNS VOID AS
$$
BEGIN
    UPDATE items
    SET
        dup_checked = true
    WHERE
        id IN (
            SELECT
                items.id
            FROM
                items
                LEFT JOIN similarities ON similarities.item_a_id = items.id
                OR similarities.item_b_id = items.id
            WHERE
                similarities.item_a_id IS NULL
                AND similarities.item_b_id IS NULL
                AND items.workspace_id = workspace_id_arg
            GROUP BY
                items.id
        );
END;
$$
LANGUAGE plpgsql;


----------

CREATE OR REPLACE FUNCTION similarities_increment_done_batches(workspace_id_arg uuid)
RETURNS BOOLEAN AS
$$
DECLARE
    cur_done INTEGER;
    total_batches INTEGER;
BEGIN
    SELECT
        installation_similarities_done_batches,
        installation_similarities_total_batches
    INTO
        cur_done, total_batches
    FROM
        workspaces
    WHERE
        id = workspace_id_arg
    FOR UPDATE;

    UPDATE workspaces
    SET
        installation_similarities_done_batches = cur_done + 1
    WHERE
        id = workspace_id_arg;

    RETURN (cur_done + 1 = total_batches);
END;
$$
LANGUAGE plpgsql;

---- MERGED BY MONTHS

CREATE OR REPLACE FUNCTION get_merged_items_by_months(workspace_id_arg UUID)
RETURNS TABLE(
    month TIMESTAMP,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CAST(DATE_TRUNC('month', merged_at) AS TIMESTAMP) AS month,
        COUNT(*)
    FROM items
    WHERE workspace_id = workspace_id_arg AND merged_at is not null
    GROUP BY
        month;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION get_merged_companies_by_months;
DROP FUNCTION get_merged_contacts_by_months;

---- WORKSPACE

------ ! TODO: Merged items

DROP FUNCTION companies_similarities_increment_done_batches;
DROP FUNCTION contacts_similarities_increment_done_batches;
DROP FUNCTION mark_companies_without_similarities_as_dup_checked;
DROP FUNCTION mark_contacts_without_similarities_as_dup_checked;

DROP TABLE contact_similarities;
DROP TABLE dup_stack_contacts;
DROP TABLE merged_contacts;
DROP TABLE contact_companies;
DROP TABLE contacts;

DROP TABLE company_similarities;
DROP TABLE dup_stack_companies;
DROP TABLE merged_companies;
DROP TABLE companies;

ALTER TABLE public.workspaces DROP COLUMN installation_companies_dup_total;
ALTER TABLE public.workspaces DROP COLUMN installation_contacts_dup_total;
ALTER TABLE public.workspaces DROP COLUMN installation_companies_dup_done;
ALTER TABLE public.workspaces DROP COLUMN installation_contacts_dup_done;

ALTER TABLE public.workspaces ADD COLUMN installation_dup_total integer NOT NULL default 0;
ALTER TABLE public.workspaces ADD COLUMN installation_dup_done integer NOT NULL default 0;

ALTER TABLE public.workspaces DROP COLUMN installation_contacts_similarities_total_batches;
ALTER TABLE public.workspaces DROP COLUMN installation_contacts_similarities_done_batches;
ALTER TABLE public.workspaces DROP COLUMN installation_companies_similarities_total_batches;
ALTER TABLE public.workspaces DROP COLUMN installation_companies_similarities_done_batches;

ALTER TABLE public.workspaces ADD COLUMN installation_similarities_total_batches integer NOT NULL default 0;
ALTER TABLE public.workspaces ADD COLUMN installation_similarities_done_batches integer NOT NULL default 0;

ALTER TABLE public.workspaces DROP COLUMN installation_contacts_count;
ALTER TABLE public.workspaces DROP COLUMN installation_contacts_total;
ALTER TABLE public.workspaces DROP COLUMN installation_companies_count;
ALTER TABLE public.workspaces DROP COLUMN installation_companies_total;

ALTER TABLE public.workspaces ADD COLUMN installation_items_count integer NOT NULL default 0;
ALTER TABLE public.workspaces ADD COLUMN installation_items_total integer NOT NULL default 0;