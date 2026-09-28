export type BookingEmailParams = {
  to_email: string;
  to_name: string;
  tracking_code: string;
  reply_to?: string;
  pickup_address: string;
  delivery_address: string;
  package_count: number;
  package_type: string;
  weight: number;
  total_cost: string;
  hubs: string[];
};

export async function sendBookingEmail(params: BookingEmailParams): Promise<void> {
  const response = await fetch('/api/send-confirmation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = typeof payload.error === 'string' ? payload.error : `Confirmation email failed (${response.status})`;
    throw new Error(detail);
  }
}
