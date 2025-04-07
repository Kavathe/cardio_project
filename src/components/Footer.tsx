
import { Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-primary-light pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text mb-4">Contact Us</h3>
            <div className="space-y-2">
              <a href="tel:+1234567890" className="flex items-center space-x-2 text-text-light hover:text-primary">
                <Phone className="h-5 w-5" />
                <span>+1 (234) 567-890</span>
              </a>
              <a href="mailto:info@heartcare.com" className="flex items-center space-x-2 text-text-light hover:text-primary">
                <Mail className="h-5 w-5" />
                <span>info@heartcare.com</span>
              </a>
              <div className="flex items-center space-x-2 text-text-light">
                <MapPin className="h-5 w-5" />
                <span>123 Medical Center Dr, Health City, HC 12345</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-text mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/about" className="text-text-light hover:text-primary">About Us</a>
              </li>
              <li>
                <a href="/services" className="text-text-light hover:text-primary">Our Services</a>
              </li>
              <li>
                <a href="/doctors" className="text-text-light hover:text-primary">Find a Doctor</a>
              </li>
              <li>
                <a href="/appointments" className="text-text-light hover:text-primary">Book Appointment</a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold text-text mb-4">Stay Updated</h3>
            <p className="text-text-light mb-4">Subscribe to our newsletter for the latest updates and health tips.</p>
            <form className="space-y-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-200 pt-8 text-center text-text-light">
          <p>&copy; {new Date().getFullYear()} HeartCare. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
