import { useState } from 'react';
import { MapPin, Package, Plus, Minus, Calendar, Truck, CheckCircle2, User, Search, ArrowRight, Box, Feather, Layers, Building2, Mail, Ruler, Weight, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendBookingEmail } from '@/lib/email';
import { useCurrency } from '@/lib/currency';
import RouteMap from './RouteMap';

type Props = {
  onTrackRequest: (code: string) => void;
};

const cityCoords: Record<string, { lat: number; lng: number }> = {
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'new york': { lat: 40.7128, lng: -74.006 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  miami: { lat: 25.7617, lng: -80.1918 },
  boston: { lat: 42.3601, lng: -71.0589 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  denver: { lat: 39.7392, lng: -104.9903 },
  austin: { lat: 30.2672, lng: -97.7431 },
  london: { lat: 51.5074, lng: -0.1278 },
  manchester: { lat: 53.4808, lng: -2.2426 },
  paris: { lat: 48.8566, lng: 2.3522 },
  berlin: { lat: 52.52, lng: 13.405 },
  rome: { lat: 41.9028, lng: 12.4964 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
};

function findCoords(address: string): { lat: number; lng: number } | null {
  const lower = address.toLowerCase();
  for (const [city, coords] of Object.entries(cityCoords)) {
    if (lower.includes(city)) return coords;
  }
  return null;
}

const packageTypes = [
  { id: 'standard', label: 'Standard', icon: Box, multiplier: 1, desc: '3-5 days' },
  { id: 'express', label: 'Express', icon: Feather, multiplier: 1.5, desc: '1-2 days · Priority' },
  { id: 'bulk', label: 'Bulk', icon: Layers, multiplier: 2.2, desc: '5-7 days · Large items' },
  { id: 'corporate', label: 'Corporate', icon: Building2, multiplier: 1.8, desc: '2-3 days · Business' },
] as const;

const BASE_PRICE = 2500;
const VOLUMETRIC_DIVISOR = 5000;
const PRICE_PER_KG = 300;

export default function BookShipment({ onTrackRequest }: Props) {
  const { formatPrice } = useCurrency();
  const [senderName, setSenderName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [packageCount, setPackageCount] = useState(1);
  const [packageType, setPackageType] = useState<string>('standard');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailToast, setEmailToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [booking, setBooking] = useState<{
    code: string;
    senderName: string;
    pickupAddress: string;
    recipientName: string;
    deliveryAddress: string;
    packageCount: number;
    packageType: string;
    estimatedCost: number;
    chargeableWeight: number;
  } | null>(null);

  const selectedType = packageTypes.find((t) => t.id === packageType) ?? packageTypes[0];

  // DHL-style volumetric weight: L × W × H / 5000
  const lNum = parseFloat(length) || 0;
  const wNum = parseFloat(width) || 0;
  const hNum = parseFloat(height) || 0;
  const actualWeight = parseFloat(weight) || 0;
  const volumetricWeight = lNum > 0 && wNum > 0 && hNum > 0
    ? (lNum * wNum * hNum) / VOLUMETRIC_DIVISOR
    : 0;
  const chargeableWeight = Math.max(volumetricWeight, actualWeight);

  const estimatedCost = chargeableWeight > 0
    ? Math.round((BASE_PRICE + chargeableWeight * PRICE_PER_KG * packageCount) * selectedType.multiplier)
    : Math.round(BASE_PRICE * selectedType.multiplier);

  const originPreview = findCoords(pickupAddress);
  const destPreview = findCoords(deliveryAddress);
  const showPreviewMap = originPreview && destPreview;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (!senderName || !pickupAddress || !recipientName || !recipientEmail || !deliveryAddress) {
      setError('Please fill in all fields including recipient email.');
      setSubmitting(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setError('Please enter a valid recipient email address.');
      setSubmitting(false);
      return;
    }

    if (!length || !width || !height || !weight) {
      setError('Please enter all package dimensions and weight.');
      setSubmitting(false);
      return;
    }

    if (lNum <= 0 || wNum <= 0 || hNum <= 0 || actualWeight <= 0) {
      setError('Dimensions and weight must be greater than zero.');
      setSubmitting(false);
      return;
    }

    const code = 'SP-' + Math.floor(1000 + Math.random() * 9000);
    const origin = findCoords(pickupAddress);
    const dest = findCoords(deliveryAddress);

    const { data, error: insertError } = await supabase
      .from('shipments')
      .insert({
        tracking_code: code,
        sender_name: senderName,
        sender_address: pickupAddress,
        recipient_name: recipientName,
        recipient_address: deliveryAddress,
        recipient_email: recipientEmail,
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress,
        package_count: packageCount,
        package_type: packageType,
        length_cm: lNum,
        width_cm: wNum,
        height_cm: hNum,
        weight_kg: actualWeight,
        volumetric_weight_kg: Math.round(volumetricWeight * 100) / 100,
        status: 'pending',
        current_location: pickupAddress,
        origin_coords: origin,
        destination_coords: dest,
        current_coords: origin,
        route_progress: 0,
      })
      .select()
      .single();

    if (insertError || !data) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    const events = [
      { shipment_id: data.id, step: 1, label: 'Order Received', description: 'Shipment booked and confirmed', location: pickupAddress, completed: true },
      { shipment_id: data.id, step: 2, label: 'Picked Up', description: 'Package collected from sender', location: pickupAddress, completed: false },
      { shipment_id: data.id, step: 3, label: 'In Transit', description: 'Package on the move to destination', location: 'In transit', completed: false },
      { shipment_id: data.id, step: 4, label: 'Out for Delivery', description: 'Package handed to local courier', location: deliveryAddress, completed: false },
      { shipment_id: data.id, step: 5, label: 'Delivered', description: 'Package delivered to recipient', location: deliveryAddress, completed: false },
    ];

    const { error: eventsError } = await supabase.from('tracking_events').insert(events);
    if (eventsError) console.warn('Failed to create tracking events:', eventsError);

    try {
      await sendBookingEmail({
        to_email: recipientEmail,
        to_name: recipientName,
        tracking_code: code,
        reply_to: 'swiftparcel.support@gmail.com',
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress,
        package_count: packageCount,
        package_type: selectedType.label,
        weight: Math.round(chargeableWeight * 100) / 100,
        total_cost: formatPrice(estimatedCost),
        hubs: ['Local Sorting Office', 'Export Customs', 'Airport Cargo Terminal', 'Import Customs', 'Regional Hub', 'Destination Delivery'],
      });
          setEmailToast({ type: 'success', msg: 'Email Sent Successfully' });
      } catch (emailErr) {
        const message = emailErr instanceof Error ? emailErr.message : 'Confirmation email failed';
        console.warn('Failed to send confirmation email:', message);
        setEmailToast({ type: 'error', msg: message });
      }

    setBooking({
      code,
      senderName,
      pickupAddress,
      recipientName,
      deliveryAddress,
      packageCount,
      packageType,
      estimatedCost,
      chargeableWeight: Math.round(chargeableWeight * 100) / 100,
    });
    setSubmitting(false);
  };

  const handleBookAnother = () => {
    setBooking(null);
    setEmailToast(null);
    setSenderName('');
    setPickupAddress('');
    setRecipientName('');
    setRecipientEmail('');
    setDeliveryAddress('');
    setPackageCount(1);
    setPackageType('standard');
    setLength('');
    setWidth('');
    setHeight('');
    setWeight('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const bookedTypeLabel = booking ? packageTypes.find((t) => t.id === booking.packageType)?.label : '';

  if (booking) {
    return (
      <section id="book" className="py-16 bg-white">
        {emailToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4" role="alert">
            <div className={`flex items-start gap-3 rounded-xl shadow-lg p-4 ${emailToast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {emailToast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm flex-1 ${emailToast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{emailToast.msg}</p>
              <button onClick={() => setEmailToast(null)} className={`hover:opacity-70 ${emailToast.type === 'success' ? 'text-green-600' : 'text-red-600'}`} aria-label="Dismiss email notification">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-green-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-700 to-green-800 px-6 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-9 h-9 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Pickup Scheduled!</h3>
              <p className="text-green-100 mt-1 text-sm">Your shipment has been booked successfully.</p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your Tracking Code</div>
                <div className="text-3xl font-bold text-green-700">{booking.code}</div>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">From</span>
                  <span className="font-medium text-gray-900 text-right">{booking.senderName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">To</span>
                  <span className="font-medium text-gray-900 text-right">{booking.recipientName}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-green-700 flex-shrink-0" />
                    <span className="truncate">{booking.pickupAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="truncate">{booking.deliveryAddress}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs text-gray-400">Packages</div>
                    <div className="font-bold text-gray-900">{booking.packageCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Chargeable Weight</div>
                    <div className="font-bold text-gray-900">{booking.chargeableWeight} kg</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Type</div>
                    <div className="font-bold text-gray-900">{bookedTypeLabel}</div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3 text-center">
                  <div className="text-xs text-gray-400">Estimated Cost</div>
                  <div className="font-bold text-green-700 text-lg">{formatPrice(booking.estimatedCost)}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => onTrackRequest(booking.code)}
                  className="flex-1 px-5 py-3.5 rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Track This Shipment
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleBookAnother}
                  className="flex-1 px-5 py-3.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  <Calendar className="w-5 h-5" />
                  Book Another Parcel
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="book" className="py-16 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold mb-3">
            <Truck className="w-4 h-4" />
            Book a Shipment
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Schedule a Pickup</h2>
          <p className="text-gray-600 mt-2">Fill in the details below and we'll handle the rest.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 sm:p-8 space-y-6">
          {/* Sender */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-700 text-white text-xs flex items-center justify-center">1</span>
              Pickup Details
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sender Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pickup Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="123 Market St, San Francisco, CA"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-700 text-white text-xs flex items-center justify-center">2</span>
              Delivery Details
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Emily Watson"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="456 Fifth Ave, New York, NY"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="emily.watson@example.com"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">Confirmation and tracking updates will be sent here.</p>
            </div>
          </div>

          {/* Package details */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-700 text-white text-xs flex items-center justify-center">3</span>
              Package Details
            </h3>

            {/* Package type selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {packageTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setPackageType(type.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    packageType === type.id
                      ? 'border-green-700 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <type.icon className={`w-5 h-5 mx-auto mb-1.5 ${packageType === type.id ? 'text-green-700' : 'text-gray-400'}`} />
                  <div className={`text-sm font-semibold ${packageType === type.id ? 'text-green-700' : 'text-gray-700'}`}>
                    {type.label}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{type.desc}</div>
                </button>
              ))}
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Length (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number" min="1" step="0.1"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    placeholder="30"
                    className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Width (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number" min="1" step="0.1"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="20"
                    className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Height (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number" min="1" step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="15"
                    className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Weight (kg)</label>
                <div className="relative">
                  <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number" min="0.1" step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="2.5"
                    className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Package count */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPackageCount((c) => Math.max(1, c - 1))}
                className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label="Decrease package count"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-50 border border-gray-200">
                <Package className="w-5 h-5 text-green-700" />
                <span className="text-2xl font-bold text-gray-900 tabular-nums">{packageCount}</span>
                <span className="text-sm text-gray-500">{packageCount === 1 ? 'package' : 'packages'}</span>
              </div>
              <button
                type="button"
                onClick={() => setPackageCount((c) => Math.min(99, c + 1))}
                className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label="Increase package count"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Volumetric weight breakdown */}
          {chargeableWeight > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Weight className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Standard Volumetric Pricing</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Actual Weight</span>
                    <span className="font-medium text-gray-700">{actualWeight.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Volumetric (L×W×H÷{VOLUMETRIC_DIVISOR})</span>
                    <span className="font-medium text-gray-700">{volumetricWeight.toFixed(2)} kg</span>
                  </div>
                </div>
                <div className="flex flex-col justify-center items-end">
                  <div className="text-xs text-gray-400">Chargeable Weight</div>
                  <div className="text-lg font-bold text-blue-700">{Math.round(chargeableWeight * 100) / 100} kg</div>
                  <div className="text-[10px] text-gray-400">
                    {volumetricWeight > actualWeight ? 'Volumetric applied' : 'Actual weight applied'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Route preview map */}
          {showPreviewMap && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-700" /> Route Preview
              </h4>
              <RouteMap
                origin={originPreview!}
                destination={destPreview!}
                current={originPreview}
                progress={0}
                status="pending"
              />
            </div>
          )}

          {/* Price estimate */}
          <div className="rounded-xl bg-gradient-to-r from-green-50 to-yellow-50 border border-green-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Estimated Cost</div>
                <div className="text-3xl font-bold text-green-700 mt-1">{formatPrice(estimatedCost)}</div>
              </div>
              <div className="text-right text-xs text-gray-400 space-y-0.5">
                <div>Base: {formatPrice(BASE_PRICE)}</div>
                {chargeableWeight > 0 && (
                  <div>+ {formatPrice(PRICE_PER_KG)}/kg × {Math.round(chargeableWeight * 100) / 100}kg × {packageCount}</div>
                )}
                <div>× {selectedType.multiplier}× {selectedType.label}</div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-green-700 text-white font-bold uppercase tracking-wide hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            {submitting ? 'Scheduling...' : 'Schedule Pickup'}
          </button>
        </form>
      </div>
    </section>
  );
}
