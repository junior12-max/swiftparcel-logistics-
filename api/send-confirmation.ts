import { Resend } from 'resend';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'Email service is not configured' }, { status: 503 });

  try {
    const body = await request.json();
    if (!body.to_email || !body.tracking_code) return Response.json({ error: 'Missing recipient or tracking code' }, { status: 400 });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const hubs = Array.isArray(body.hubs) ? body.hubs : [];
    const hubList = hubs.map((hub: string) => `<li style="margin:6px 0">${escapeHtml(hub)}</li>`).join('');
    const trackUrl = `${process.env.PUBLIC_APP_URL ?? 'https://swiftparcel-logistics.vercel.app'}/?tracking=${encodeURIComponent(body.tracking_code)}`;
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [body.to_email],
      replyTo: 'swiftparcel.support@gmail.com',
      subject: `Shipment confirmed · ${body.tracking_code}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17201b"><h2 style="color:#15803d">Shipment confirmed</h2><p>Hi ${escapeHtml(body.to_name ?? '')}, your SwiftParcel shipment is booked.</p><p><strong>Tracking ID:</strong> ${escapeHtml(body.tracking_code)}</p><p><strong>Route:</strong><br>${escapeHtml(body.pickup_address)} → ${escapeHtml(body.delivery_address)}</p><p><strong>Parcel:</strong> ${escapeHtml(String(body.package_count))} × ${escapeHtml(body.package_type)} · ${escapeHtml(String(body.weight))} kg · ${escapeHtml(body.total_cost)}</p><h3>Estimated logistics hubs</h3><ul>${hubList}</ul><a href="${trackUrl}" style="display:inline-block;background:#15803d;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Track My Package</a></div>`,
    }, { idempotencyKey: `booking-confirmation/${body.tracking_code}` });
    if (error) return Response.json({ error: error.message }, { status: 502 });
    return Response.json({ id: data?.id });
  } catch {
    return Response.json({ error: 'Invalid email request' }, { status: 400 });
  }
}
