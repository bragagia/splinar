
-- Process:

-- # Start polling
-- Create op (workspace, "PENDING", "UPDATE", {"steps": [{"name": "poll_data", "count": 2}]})

-- # Poll data
-- % Process the step
-- steps = Increase steps_done
-- if (steps == steps_total) then
--   Add step to op (total + 1, {"steps": [..., {"name": "similarities_update", "count": 1}]})
--   start next step


-- # Update similarities
-- Add steps to op (total + 15, {"steps": [..., {"name": "similarity_batch", "count": 15}]})
-- start all steps

-- # Similarity batch
-- % Process the step
-- steps = Increase steps_done
-- if (steps == steps_total) then
--   Add step to op (total + 1, {"steps": [..., {"name": "dup_check_start", "count": 1}]})
--   start next step

-- # Dup check init
-- Count items to check
-- Update op (total + count, {"steps": [..., {"name": "dup_check", "count": count}]})
-- Increase steps done of 1
-- Start dup check

-- # Dup check
-- % Process the step
-- steps = Increase steps_done
-- if (steps == steps_total) then
--   Mark op as done
--   Update workspace as ready


CREATE TYPE workspace_operations_status AS ENUM ('QUEUED', 'PENDING', 'DONE', 'ERROR');
CREATE TYPE workspace_operations_type AS ENUM ('WORKSPACE_INSTALL', 'WORKSPACE_UPDATE', 'MERGE_ALL');

CREATE TABLE public.workspace_operations (
    id uuid NOT NULL DEFAULT uuid_generate_v4 (),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid NOT NULL,

    started_at timestamp with time zone,
    done_at timestamp with time zone,

    ope_status workspace_operations_status NOT NULL,
    ope_type workspace_operations_type NOT NULL,

    steps_done integer NOT NULL,
    steps_total integer NOT NULL,

    metadata jsonb NOT NULL
);

ALTER TABLE public.workspace_operations OWNER TO postgres;

-- Constraints

ALTER TABLE ONLY public.workspace_operations
    ADD CONSTRAINT workspace_operations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workspace_operations
    ADD CONSTRAINT workspace_operations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Indexes

CREATE INDEX workspace_operations_workspace_id_idx ON public.workspace_operations USING btree (workspace_id);

-- Access

CREATE POLICY "Allow workspace owners to read" ON public.workspace_operations
FOR SELECT TO authenticated
USING (workspace_id in (select get_available_workspaces_for_user((select auth.uid()))));

ALTER TABLE public.workspace_operations ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.workspace_operations TO anon;
GRANT ALL ON TABLE public.workspace_operations TO authenticated;
GRANT ALL ON TABLE public.workspace_operations TO service_role;



-- Function to increase steps_done

CREATE OR REPLACE FUNCTION workspace_operations_increment_steps_done(operation_id_arg uuid)
RETURNS INTEGER AS
$$
DECLARE
    cur_steps_done INTEGER;
    cur_steps_total INTEGER;
BEGIN
    SELECT
        steps_done,
        steps_total
    INTO
        cur_steps_done, cur_steps_total
    FROM
        workspace_operations
    WHERE
        id = operation_id_arg
    FOR UPDATE;

    UPDATE workspace_operations
    SET
        steps_done = steps_done + 1
    WHERE
        id = operation_id_arg;

    RETURN (cur_steps_total - cur_steps_done - 1);
END;
$$
LANGUAGE plpgsql;