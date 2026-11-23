-- B5 part 2: `api.ops_metrics().ingest_to_alert_ms_24h` measured `alerts.created_at - transactions.ingested_at`,
-- both `now()` = the start of the same ingest transaction → always 0. The alert row now records the wall
-- clock when it is inserted, so the metric is the real time from the start of ingest to the alert row
-- (scoring included; the row is visible at commit, a few ms later).
alter table core.alerts alter column created_at set default clock_timestamp();
