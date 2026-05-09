import { logger } from "./logger.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
}

export interface PushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Sends batched push notifications via the Expo Push API.
 * Returns an array of tickets in the same order as the input messages.
 * Failed chunks produce error tickets for each message in that chunk.
 */
export async function sendPushNotifications(
  messages: PushMessage[],
): Promise<PushTicket[]> {
  if (messages.length === 0) return [];

  const allTickets: PushTicket[] = [];
  const CHUNK_SIZE = 100;

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        logger.error(
          { status: response.status, statusText: response.statusText },
          "expo push request failed",
        );
        allTickets.push(...chunk.map(() => ({ status: "error" as const, message: "http_error" })));
        continue;
      }

      const data = (await response.json()) as { data?: PushTicket[] };
      const tickets = data.data ?? [];

      if (tickets.length !== chunk.length) {
        logger.warn(
          { expected: chunk.length, got: tickets.length },
          "expo push ticket count mismatch",
        );
      }

      const failures = tickets.filter((r) => r.status !== "ok");
      if (failures.length > 0) {
        logger.warn({ failures }, "some expo push notifications failed to deliver");
      } else {
        logger.info({ count: chunk.length }, "expo push notifications sent");
      }

      allTickets.push(...tickets);
    } catch (err) {
      logger.error({ err }, "expo push send threw");
      allTickets.push(...chunk.map(() => ({ status: "error" as const, message: "exception" })));
    }
  }

  return allTickets;
}
