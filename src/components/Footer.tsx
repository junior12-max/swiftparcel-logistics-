import { useState } from 'react';
import { Package, Mail, Phone, MapPin, X } from 'lucide-react';

const MODAL_CONTENT = {
  about: {
    title: 'About SwiftParcel',
    body: `SwiftParcel is a technology-driven logistics company founded in 2018 with a mission to make parcel delivery fast, reliable, and accessible to everyone. Headquartered in San Francisco, we operate a nationwide network of fulfillment centers, local courier partnerships, and smart-sorting hubs that process over 40,000 parcels daily.

Our platform combines real-time GPS tracking, automated route optimization, and AI-powered delivery estimates to give customers complete visibility from pickup to doorstep. We serve individual senders, e-commerce businesses, and enterprise clients across all 50 states.

At SwiftParcel, we believe every parcel represents a promise. That's why we invest heavily in our people, our technology, and our infrastructure to ensure each delivery arrives safely, on time, and with care.`,
  },
  careers: {
    title: 'Careers at SwiftParcel',
    body: `Join a team that's redefining last-mile logistics. SwiftParcel employs over 1,200 professionals across operations, engineering, customer experience, and logistics planning.

We're always looking for passionate individuals in roles ranging from delivery drivers and warehouse operators to software engineers, data analysts, and product designers. We offer competitive salaries, comprehensive health benefits, stock options, and tuition reimbursement.

Our culture is built on ownership, transparency, and continuous improvement. Whether you're sorting packages at 5 AM or writing code that optimizes delivery routes, you'll have a direct impact on millions of deliveries.

To apply, send your resume to swiftparcel.support@gmail.com with the subject line "Career Opportunity".`,
  },
  privacy: {
    title: 'Privacy Policy',
    body: `SwiftParcel is committed to protecting your privacy. This policy describes how we collect, use, and safeguard your personal information.

Information We Collect: When you book a shipment, we collect your name, contact details, pickup and delivery addresses, and recipient information. We also collect tracking data including GPS coordinates and delivery timestamps.

How We Use Your Information: Your data is used to process shipments, provide real-time tracking, send delivery notifications, and improve our logistics operations. We do not sell your personal information to third parties.

Data Security: All shipment data is encrypted in transit and at rest. Access to personal information is restricted to authorized personnel and is governed by role-based access controls.

Your Rights: You may request access to, correction of, or deletion of your personal data at any time by contacting us at swiftparcel.support@gmail.com.

This policy may be updated periodically. Last updated: September 2026.`,
  },
  terms: {
    title: 'Terms of Service',
    body: `By using SwiftParcel's services, you agree to the following terms:

1. Shipment Acceptance: SwiftParcel reserves the right to refuse any package that contains prohibited items, exceeds size or weight limits, or poses safety risks during transit.

2. Liability: SwiftParcel provides insurance coverage up to the declared value of each shipment. Claims for lost or damaged packages must be filed within 30 days of the scheduled delivery date.

3. Delivery Estimates: Estimated delivery times are approximate and depend on weather, traffic, and operational conditions. SwiftParcel is not liable for delays outside its direct control.

4. Pricing: All pricing is calculated at the time of booking based on package dimensions, weight, and service type. Prices are subject to change without prior notice.

5. Prohibited Items: Hazardous materials, illegal substances, firearms, and perishable goods are strictly prohibited. Violations may result in account termination and legal action.

6. Account Access: Customers are responsible for maintaining the confidentiality of any account credentials and for all activities under their account.

For questions about these terms, contact us at swiftparcel.support@gmail.com.`,
  },
} as const;

type ModalKey = keyof typeof MODAL_CONTENT;

export default function Footer() {
  const [modal, setModal] = useState<ModalKey | null>(null);

  return (
    <footer id="contact" className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-green-700 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Swift<span className="text-green-500">Parcel</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              Fast, reliable parcel delivery connecting every corner of the country.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#book" className="hover:text-green-400 transition-colors">Book Shipment</a></li>
              <li><a href="#track" className="hover:text-green-400 transition-colors">Track Parcel</a></li>
              <li><a href="#services" className="hover:text-green-400 transition-colors">Express Delivery</a></li>
              <li><a href="#services" className="hover:text-green-400 transition-colors">Business Accounts</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => setModal('about')} className="hover:text-green-400 transition-colors text-left">About Us</button></li>
              <li><button onClick={() => setModal('careers')} className="hover:text-green-400 transition-colors text-left">Careers</button></li>
              <li><button onClick={() => setModal('privacy')} className="hover:text-green-400 transition-colors text-left">Privacy Policy</button></li>
              <li><button onClick={() => setModal('terms')} className="hover:text-green-400 transition-colors text-left">Terms of Service</button></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Get in Touch</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-500" /> 1-800-SWIFT-00
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-500" />
                <a href="mailto:swiftparcel.support@gmail.com" className="hover:text-green-400 transition-colors">
                  swiftparcel.support@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" /> 100 Logistics Way, San Francisco, CA
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 text-center text-sm">
          &copy; {new Date().getFullYear()} SwiftParcel. All rights reserved.
        </div>
      </div>

      {/* Company info modal */}
      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{MODAL_CONTENT[modal].title}</h3>
              <button
                onClick={() => setModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {MODAL_CONTENT[modal].body.split('\n\n').map((para, i) => (
                <p key={i} className="text-sm text-gray-600 leading-relaxed mb-4 last:mb-0 whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
