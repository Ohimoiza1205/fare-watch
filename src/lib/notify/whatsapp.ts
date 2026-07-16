// WhatsApp via Meta Cloud API. Needs WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, and
// WHATSAPP_TO. Outside the 24 hour customer-initiated window Meta only allows
// pre-approved templates, so message yourself first to open the window.
export async function sendWhatsApp(text: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  const to = process.env.WHATSAPP_TO;
  if (!token || !id || !to) return false; // channel not configured, skip quietly

  await fetch(`https://graph.facebook.com/v21.0/${id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  return true;
}
