-- CreateTable
CREATE TABLE "api_rate_limits" (
    "scope" TEXT NOT NULL,
    "visitor_hash" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_rate_limits_pkey"
      PRIMARY KEY ("scope", "visitor_hash", "window_start")
);

-- CreateIndex
CREATE INDEX "api_rate_limits_window_start_idx"
ON "api_rate_limits"("window_start");
