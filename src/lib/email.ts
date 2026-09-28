const SERVICE_ID = 'service_677u65p';
const TEMPLATE_ID = 'template_31bosch';
const PUBLIC_KEY = '7ZBTQ6bfuRBc2b06s';
const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

export type BookingEmailParams = {
  to_email: string;
  to_name: string;
  tracking_code: string;
  shipment_details: string;
  reply_to: string;
  sender_name: string;
  recipient_name: string;
  pickup_address: string;
  delivery_address: string;
  package_count: number;
  package_type: string;
  estimated_cost: string;
};

export async function sendBookingEmail(params: BookingEmailParams): Promise<void> {
  const response = await fetch(EMAILJS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      template_params: {
        to_email: params.to_email,
        to_name: params.to_name,
        tracking_code: params.tracking_code,
        shipment_details: params.shipment_details,
        reply_to: params.reply_to,
        sender_name: params.sender_name,
        recipient_name: params.recipient_name,
        pickup_address: params.pickup_address,
        delivery_address: params.delivery_address,
        package_count: params.package_count,
        package_type: params.package_type,
        estimated_cost: params.estimated_cost,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`EmailJS API returned ${response.status}: ${text}`);
  }
}
