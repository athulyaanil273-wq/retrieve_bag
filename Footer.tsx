import { Mail, MapPin, Phone } from 'lucide-react';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterProps {
  links?: FooterLink[];
  onNavigate?: (href: string) => void;
}

export function Footer({ links = [], onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-lavender-300/12 bg-navy-950/75 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Logo & Brand Summary */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <a
              href="#home"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('#home');
                }
              }}
              className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-50 font-display w-fit"
            >
              <span
                className="w-8 h-8 rounded-xl bg-pink-400 text-navy-950 inline-flex items-center justify-center shadow-sm shrink-0"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5">
                  <path
                    d="M9 6V4.5C9 3.67 9.67 3 10.5 3H13.5C14.33 3 15 3.67 15 4.5V6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <rect
                    x="5"
                    y="6"
                    width="14"
                    height="14"
                    rx="4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path d="M9 11V15M15 11V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span>Retrieve Bag</span>
            </a>
            <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
              Airport baggage retrieval platform helping travelers report lost, found, or
              accidentally exchanged luggage and confirm potential matches with clarity.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Navigation</h2>
            <nav aria-label="Footer navigation" className="flex flex-col gap-2">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    if (onNavigate) {
                      e.preventDefault();
                      onNavigate(link.href);
                    }
                  }}
                  className="text-sm text-slate-400 hover:text-pink-300 transition-colors w-fit"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Contact Information */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Passenger Support</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-slate-300">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-lavender-300 shrink-0" aria-hidden="true" />
                <a
                  href="mailto:support@retrievebag.app"
                  className="hover:text-pink-300 transition-colors"
                >
                  support@retrievebag.app
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-lavender-300 shrink-0" aria-hidden="true" />
                <span className="tabular-nums-mono text-xs sm:text-sm">+1 (800) 555-0194</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-lavender-300 shrink-0" aria-hidden="true" />
                <span>Terminal Baggage Help Desk · 24/7 Assistance</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-lavender-300/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Retrieve Bag · Airport Baggage Retrieval System</span>
          <span>Privacy-first passenger verification</span>
        </div>
      </div>
    </footer>
  );
}
