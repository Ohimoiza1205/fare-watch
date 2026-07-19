// Phone push via ntfy. Subscribe to a private topic in the ntfy app and put
// that topic name in NTFY_TOPIC. No account needed. Priority maps to ntfy's
// scale so a mistake fare breaks through where a routine catch does not.
export type PushPriority = "max" | "high" | "default";

export async function sendPush(
  title: string,
  body: string,
  link: string,
  priority: PushPriority = "high"
): Promise<boolean> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return false; // channel not configured, skip quietly

  await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    headers: {
      Title: title,
      Click: link,
      Priority: priority,
    },
    body,
  });
  return true;
}
