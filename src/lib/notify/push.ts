// Phone push via ntfy. Subscribe to a private topic in the ntfy app and put
// that topic name in NTFY_TOPIC. No account needed.
export async function sendPush(title: string, body: string, link: string): Promise<boolean> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return false; // channel not configured, skip quietly

  await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    headers: {
      Title: title,
      Click: link,
      Priority: "high",
    },
    body,
  });
  return true;
}
