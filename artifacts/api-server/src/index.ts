import app from "./app";
import { logger } from "./lib/logger";
import { getAllTokens, markDigestSent } from "./lib/pushTokenStore";
import { sendPushNotifications } from "./lib/expoPush";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

const DIGEST_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function runWeeklyDigest(): Promise<void> {
  const tokens = getAllTokens();
  if (tokens.size === 0) return;

  const now = Date.now();
  const messages: {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: "default" | null;
  }[] = [];
  const userIds: string[] = [];

  for (const [userId, record] of tokens) {
    if (!record.weeklyDigest) continue;
    const lastDigest = record.lastDigestAt?.getTime() ?? 0;
    if (now - lastDigest < SEVEN_DAYS_MS) continue;

    let obsCount = 0;
    try {
      const d1 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const url =
        `https://api.inaturalist.org/v1/observations?` +
        `lat=${record.lat}&lng=${record.lng}&radius=${record.radiusKm}` +
        `&quality_grade=research&per_page=1&d1=${d1}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = (await res.json()) as { total_results?: number };
        obsCount = data.total_results ?? 0;
      }
    } catch {
      /* iNaturalist unavailable */
    }

    const body =
      obsCount > 0
        ? `${obsCount} observations recorded near ${record.city} this week.`
        : `Check what's been spotted near ${record.city} recently.`;

    userIds.push(userId);
    messages.push({
      to: record.token,
      title: "🌿 Your weekly life web digest",
      body,
      sound: "default",
      data: { type: "weekly_digest" },
    });
  }

  if (messages.length === 0) return;

  logger.info({ count: messages.length }, "sending scheduled weekly digest");
  const tickets = await sendPushNotifications(messages);

  for (let i = 0; i < tickets.length; i++) {
    if (tickets[i]?.status === "ok") {
      markDigestSent(userIds[i]!);
    }
  }
}

setInterval(() => {
  void runWeeklyDigest().catch((err) => {
    logger.error({ err }, "weekly digest scheduler threw");
  });
}, DIGEST_CHECK_INTERVAL_MS).unref();
