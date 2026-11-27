-- Rendimiento (Owner, 2026-11-26) — one row per minute of how the platform answered, kept 30
-- days. Platform-wide: no business column, no personal data. Additive only.

-- CreateTable
CREATE TABLE "PerformanceMinute" (
    "at" TIMESTAMP(3) NOT NULL,
    "requests" INTEGER NOT NULL,
    "errors4xx" INTEGER NOT NULL,
    "errors5xx" INTEGER NOT NULL,
    "p50Ms" DOUBLE PRECISION NOT NULL,
    "p95Ms" DOUBLE PRECISION NOT NULL,
    "p99Ms" DOUBLE PRECISION NOT NULL,
    "maxMs" DOUBLE PRECISION NOT NULL,
    "cpuPct" DOUBLE PRECISION NOT NULL,
    "rssMb" DOUBLE PRECISION NOT NULL,
    "loopP99Ms" DOUBLE PRECISION NOT NULL,
    "load1" DOUBLE PRECISION NOT NULL,
    "memPct" DOUBLE PRECISION NOT NULL,
    "diskPct" DOUBLE PRECISION NOT NULL,
    "dbPingMs" DOUBLE PRECISION NOT NULL,
    "dbConns" INTEGER NOT NULL,
    "messages" INTEGER NOT NULL,
    "replyP50Ms" DOUBLE PRECISION,
    "replyP95Ms" DOUBLE PRECISION,
    "online" INTEGER NOT NULL,
    "pushOk" INTEGER NOT NULL,
    "pushFailed" INTEGER NOT NULL,
    "routes" JSONB NOT NULL,

    CONSTRAINT "PerformanceMinute_pkey" PRIMARY KEY ("at")
);

