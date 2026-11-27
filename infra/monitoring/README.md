# Monitoring: Grafana at grafana.wapsell.com

Owner decision (2026-11-26): see how the Hetzner server, the API and the chat answer, in Grafana at
`https://grafana.wapsell.com` with a user and password. This complements the «Rendimiento» page of
the platform panel (same per-minute table) with the machine's numbers every 15 seconds.

## What runs

| Container | What it does | Listens on |
|---|---|---|
| `wapsell-node-exporter` | Reads the machine: processors, memory, disk, load | internal network only |
| `wapsell-prometheus` | Keeps those numbers 30 days | internal network only |
| `wapsell-grafana` | The dashboards | `127.0.0.1:3060` (nginx publishes it with HTTPS) |

Memory limits: 128 + 512 + 384 MB. Grafana reads Wapsell's `PerformanceMinute` table with the
`wapsell_metrics` database user, which can only `SELECT` that table, read-only, with a 10 s limit.

Known limit: node-exporter runs in a container, so its network numbers are the container's own
(processors, memory, disk and load are the machine's).

## Install (needs the Owner's OK: it changes the production server)

Prerequisite: the DNS record `grafana.wapsell.com A 89.167.96.239` exists (Namecheap).

1. Copy `infra/monitoring` to `/opt/wapsell/infra/monitoring`.
2. Secrets (mode 600, never printed):
   ```sh
   umask 077
   openssl rand -base64 24 | tr -d '\n' > /opt/wapsell/secrets/grafana_admin_password
   openssl rand -base64 24 | tr -d '\n' > /opt/wapsell/secrets/metrics_db_password
   ```
3. The read-only database user (the password goes through stdin, never on the command line):
   ```sh
   docker cp infra/monitoring/sql/metrics-role.sql wapsell-postgres:/tmp/metrics-role.sql
   docker exec -i wapsell-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1      -v metrics_password="$(cat)" -f /tmp/metrics-role.sql' < /opt/wapsell/secrets/metrics_db_password
   docker exec wapsell-postgres rm /tmp/metrics-role.sql
   ```
4. `cd /opt/wapsell/infra/monitoring && docker compose -p wapsell-monitoring -f docker-compose.monitoring.yml up -d`
5. nginx: copy `infra/nginx/grafana.wapsell.com.conf` with only its port-80 block first, `nginx -t`,
   reload, `certbot certonly --webroot -w /var/www/certbot -d grafana.wapsell.com`, then the full
   file, `nginx -t`, reload.
6. Check: `curl -sI https://grafana.wapsell.com/login` answers 200; the login works; the two
   dashboards (Servidor Hetzner, Wapsell: API y chat) show data.

The user is `wapsell`; the password is read on the server with
`cat /opt/wapsell/secrets/grafana_admin_password` (it is never written in the chat or the repo).

## Roll back

```sh
rm /etc/nginx/sites-enabled/grafana.wapsell.com && nginx -t && systemctl reload nginx
cd /opt/wapsell/infra/monitoring && docker compose -p wapsell-monitoring -f docker-compose.monitoring.yml down
# optional: docker volume rm wapsell-monitoring_prometheus-data wapsell-monitoring_grafana-data
# optional: DROP ROLE wapsell_metrics (after REVOKE) as the database owner
```

Nothing of Wapsell itself changes: the API, the web and the database keep working without these.
