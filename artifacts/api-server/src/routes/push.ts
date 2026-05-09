import { Router, type IRouter } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { z } from "zod";
import {
  upsertToken,
  removeToken,
  getAllTokens,
  markDigestSent,
} from "../lib/pushTokenStore.js";
import { sendPushNotifications, type PushMessage } from "../lib/expoPush.js";

const router: IRouter = Router();

const RegisterTokenBody = z.object({
  token: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(200),
  city: z.string().min(1).max(200),
  weeklyDigest: z.boolean().default(false),
});

const SendNotificationBody = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  data: z.record(z.string(), z.unknown()).optional(),
});

router.post("/push/token", requireAuth(), (req, res) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = RegisterTokenBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ err: parsed.error.flatten() }, "invalid push token body");
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  upsertToken(userId, parsed.data);
  req.log.info({ userId, weeklyDigest: parsed.data.weeklyDigest }, "push token registered");
  res.json({ ok: true });
});

router.delete("/push/token", requireAuth(), (req, res) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  removeToken(userId);
  req.log.info({ userId }, "push token removed");
  res.json({ ok: true });
});

router.post("/push/send", (req, res) => {
  const secret = process.env.PUSH_ADMIN_SECRET;
  if (!secret || req.headers["x-push-secret"] !== secret) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const parsed = SendNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const { userId, title, body, data } = parsed.data;
  const tokens = getAllTokens();
  const record = tokens.get(userId);
  if (!record) {
    res.status(404).json({ error: "no_token", message: "User has no registered push token." });
    return;
  }

  const message: PushMessage = {
    to: record.token,
    title,
    body,
    sound: "default",
    data,
  };

  void sendPushNotifications([message]);
  res.json({ ok: true });
});

router.post("/push/weekly-digest", async (req, res) => {
  const secret = process.env.PUSH_ADMIN_SECRET;
  if (!secret || req.headers["x-push-secret"] !== secret) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const tokens = getAllTokens();
  const messages: PushMessage[] = [];
  const userIds: string[] = [];
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
      const inatRes = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (inatRes.ok) {
        const data = (await inatRes.json()) as { total_results?: number };
        obsCount = data.total_results ?? 0;
      }
    } catch {
      /* iNaturalist unavailable — send generic digest */
    }

    const bodyText =
      obsCount > 0
        ? `${obsCount} observations recorded near ${record.city} this week.`
        : `Check what's been spotted near ${record.city} recently.`;

    userIds.push(userId);
    messages.push({
      to: record.token,
      title: `🌿 Your weekly life web digest`,
      body: bodyText,
      sound: "default",
      data: { type: "weekly_digest" },
    });
  }

  req.log.info({ count: messages.length }, "sending weekly digest notifications");
  const tickets = await sendPushNotifications(messages);

  let sent = 0;
  for (let i = 0; i < tickets.length; i++) {
    if (tickets[i]?.status === "ok") {
      markDigestSent(userIds[i]!);
      sent++;
    }
  }

  res.json({ ok: true, attempted: messages.length, sent });
});

export default router;
