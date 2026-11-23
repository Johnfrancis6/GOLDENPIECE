# JSON Schemas of payloads

Draft 2020-12. Source of the TS (app, functions) and Python (batch) types.
One file per RPC response (`<rpc>.json`) or request (`<rpc>.request.json`);
shared definitions in `common.json` (money `{m, c, r}`, envelope, error,
reason). Each schema carries `examples`, validated in CI
(`batch/tests/test_schemas.py`), which also validates live dev responses
when run with `GP_LIVE=1`.

Later sessions add a schema with every new RPC and keep `docs/API.md` in sync.
