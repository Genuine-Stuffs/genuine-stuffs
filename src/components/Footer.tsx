import { Link } from "react-router-dom";
import { Mail, Phone, Linkedin } from "lucide-react";
import logoFullDark from "@/assets/logo-full-dark.png";
import logoFullLight from "@/assets/logo-full-light.png";

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">
          {/* Company Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center">
              <div className="h-12 w-auto">
                <img src={logoFullDark} alt="Genuine Stuffs Ltd" className="h-full w-auto block dark:hidden object-contain" />
                <img src={logoFullLight} alt="Genuine Stuffs Ltd" className="h-full w-auto hidden dark:block object-contain" />
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed font-medium md:max-w-sm">
              A Data-Driven Construction Operating Ecosystem built to restore confidence, quality, and long-term value in the built environment.
            </p>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h3 className="font-bold text-slate-900 text-base uppercase tracking-wider mb-6">Quick Links</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/services" className="text-sm text-slate-500 font-medium hover:text-primary transition-colors block">
                  Our Services
                </Link>
              </li>
              <li>
                <Link to="/resources" className="text-sm text-slate-500 font-medium hover:text-primary transition-colors block">
                  Resources
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-slate-500 font-medium hover:text-primary transition-colors block">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-slate-500 font-medium hover:text-primary transition-colors block">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Specialties */}
          <div className="lg:col-span-3">
            <h3 className="font-bold text-slate-900 text-base uppercase tracking-wider mb-6">Our Specialties</h3>
            <ul className="space-y-4">
              {[
                "Verified Materials Marketplace",
                "Professionals & Artisans Directory",
                "Supplier & Pro Verification",
                "Construction & Property Advisory",
                "Value Assurance Services",
                "Training & Knowledge Hub"
              ].map((specialty, i) => (
                <li key={i} className="text-sm text-slate-500 font-medium">{specialty}</li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3">
            <h3 className="font-bold text-slate-900 text-base uppercase tracking-wider mb-6">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3 text-sm text-slate-500 font-medium">
                <Mail className="w-5 h-5 text-primary" />
                <span>contact@genuinestuffs.com</span>
              </li>
              <li className="flex items-start space-x-3 text-sm text-slate-500 font-medium">
                <Linkedin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <a href="#" className="hover:text-primary transition-colors block font-semibold text-slate-700">LinkedIn</a>
                  <span className="block mt-1">Ikoyi, Lagos, Nigeria</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Genuine Stuffs Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;