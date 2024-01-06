ALTER TYPE workspace_installation_status ADD VALUE 'INSTALLING';

-- workspace_installation_status -> ('FRESH', 'PENDING', 'INSTALLING', 'DONE', 'ERROR');
-- FRESH -> Just created, name and subscription are yet to define
-- PENDING -> Installation is asked
-- INSTALLING -> Installating in progress
-- DONE -> Fully ready to use (Should be named 'READY')
-- ERROR -> There was an error during installation, not used currently