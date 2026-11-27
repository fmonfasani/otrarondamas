# Chat capacity test

Owner decision (2026-11-26): find out how many customers the chat holds at once, on the real
Hetzner machine but on an **isolated copy**, at night, announced before running. Production data
is never read nor touched.

## What it does (`run.sh`)

1. Creates a throwaway copy on its own network (`wapsell-lt`): an empty Postgres 16, Redis, and
   the **same API image production runs** (only on `127.0.0.1:8700`). Roles and migrations are
   applied exactly like the deploy, with the recipe of the same commit (from the tools image).
2. Fills it with fake stores (10), team members (2 per store) and customers (1,600) — `seed.mjs`.
3. Simulates them chatting in steps — `load.mjs`: 50, 100, 200, 400, 800, 1,600 customers at
   once, 2 minutes each. Every customer keeps the realtime connection open (like a person with the
   screen open), writes a message every ~30 s and reloads the chat; team members read the inbox,
   open the chat, mark it read and answer.
4. A step is **too slow** when 95 % of the answers take over 1 s or over 1 % fail: that is the
   limit. The capacity is the last step under it.
5. **Guards production**: every 10 s it checks the real API's health and the server's load; two
   slow checks in a row (over 1 s) or the server saturated stop everything.
6. Removes everything it created (containers, network, data, throwaway secrets), whatever happens.

The load generator runs on the same server, limited to 2 processors: the number is a
conservative floor (in real life the customers' phones do that work).

## Results

`/opt/wapsell/loadtest-results/<UTC time>/`:
- `resumen.txt` — the sentence for the Owner and one line per step;
- `results.json` — every step by operation (send, open chat, inbox, answer…);
- `stats.txt` — CPU and memory of the test API and database every 10 s;
- `run.log` — what happened.

Grafana (grafana.wapsell.com, «Servidor Hetzner») shows how the machine reacted second by second.

## Run

```sh
# now (as root on the server):
bash /opt/wapsell/tools/loadtest/run.sh
# scheduled (03:30 Argentina = 06:30 UTC):
systemd-run --unit=wapsell-loadtest --on-calendar='2026-11-27 06:30:00 UTC' \
  /bin/bash /opt/wapsell/tools/loadtest/run.sh
systemctl list-timers wapsell-loadtest*      # check it is scheduled
systemctl stop wapsell-loadtest.timer        # cancel before it starts
```

Smaller runs: `LT_STEPS=10,20 LT_STEP_SECONDS=30 LT_CUSTOMERS=40 LT_BUSINESSES=2`.
