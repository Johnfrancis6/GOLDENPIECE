-- B3: Twelve Data free plan refuses XAG/USD ("not available with your plan", 2026-11-23);
-- XAU/USD is served. Silver stays visible through the SLV ETF. Row kept inactive.
update mkt.instruments set active = false where id = 'XAG';
