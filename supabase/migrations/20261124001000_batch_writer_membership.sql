-- B1: let the migration owner (postgres) act as batch_writer (tests, ops).
-- PG16+ gives the creator ADMIN but not SET on a role it creates.
grant batch_writer to postgres with set true, inherit false;
