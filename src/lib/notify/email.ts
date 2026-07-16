// Email via Resend. Needs RESEND_API_KEY, plus the from and to addresses.
export async function sendEmail(subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.RESEND_TO;
  if (!key || !from || !to) return false; // channel not configured, skip quietly

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });
  return true;
}
