# Home Vault

Household appliance and warranty vault for **[home address], Millersville MD** — manuals, filter sizes, and service dates in one offline board. TokenMax burn build.

EXAMPLE appliances (HVAC, water heater, fridge, washer, dryer, optional Powerwall/solar). Filter next-due and service log in `localStorage`.

## Screens

1. **Appliances** — EXAMPLE model/serial cards  
2. **Filters** — size reminder + next-due  
3. **Warranties** — expiry timeline  
4. **Service log** — localStorage entries  
5. **About** — export / reset

Hash routes: `#appliances` · `#filters` · `#warranties` · `#service` · `#about`

## Run

```bash
./run.sh          # build + serve http://127.0.0.1:4327/
./run.sh --shots  # + screenshots/
```

Offline single file: `dist/home-vault.html`

## Layout

- `web/` — index.html, app.css, app.js  
- `data/appliances.json` — EXAMPLE appliances, filters, warranties (embedded into dist)  
- `build.py` / `server.py` / `tests/screenshot.sh`


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/home-vault` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
- Personal details (emails, phone numbers, home street address) were replaced with `[redacted-…]` placeholders.
