-- CREATE TYPE workspace_operations_type AS ENUM ('WORKSPACE_INSTALL', 'WORKSPACE_UPDATE', 'MERGE_ALL');

ALTER TYPE workspace_operations_type ADD VALUE 'JOB_EXEC_ON_ALL';