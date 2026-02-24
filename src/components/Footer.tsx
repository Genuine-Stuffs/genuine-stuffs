import { Link } from "react-router-dom";
import { Mail, Phone, Linkedin } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img src={logoIcon} alt="Genuine Stuffs Ltd" className="w-30 h-24" />
              <span className="font-bold text-xl">Genuine Stuffs Ltd</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Expert advisory and consultancy for building materials marketplace, quality assessment, and industry guidance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link to="/resources" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Resources
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              <li className="text-sm text-muted-foreground">Materials Audit</li>
              <li className="text-sm text-muted-foreground">Lifecycle Modeling</li>
              <li className="text-sm text-muted-foreground">Compliance Review</li>
              <li className="text-sm text-muted-foreground">Training & Workshops</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>contact@genuinestuffs.com</span>
              </li>
              {/* <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>+234 81 89 675 921</span>
              </li> */}
              <li className="flex items-start space-x-2 text-sm text-muted-foreground">
                <Linkedin className="w-4 h-4 mt-0.5" />
                <div>
                  <a href="#" className="hover:text-primary transition-colors block">LinkedIn</a>
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