-- B4: risk_metrics also stores the "excluded" rows (instrument or real estate left out
-- of the risk figures, with its value and reason in `method`). API.md §2.7 `excluded`.
alter table analytics.risk_metrics drop constraint risk_metrics_metric_check;
alter table analytics.risk_metrics add constraint risk_metrics_metric_check check (metric in
  ('vol_ann','beta','var95_1d','cvar95_1d','var95_1m','cvar95_1m','var95_1m_hist','max_drawdown','excluded'));
