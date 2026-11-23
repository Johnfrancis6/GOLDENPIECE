-- B1: fixes found by the RLS pgTAP run.
-- Users read their own analytics rows (policies exist; schema usage was missing).
grant usage on schema analytics to authenticated;
