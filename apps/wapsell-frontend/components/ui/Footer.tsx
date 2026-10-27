'use client';

import React from 'react';
import Link from 'next/link';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title?: string;
  links: FooterLink[];
}

interface FooterProps {
  sections?: FooterSection[];
  copyright?: string;
  socialLinks?: Array<{
    icon: React.ReactNode;
    href: string;
    label: string;
  }>;
  className?: string;
  variant?: 'default' | 'minimal';
}

const Footer: React.FC<FooterProps> = ({
  sections = [],
  copyright,
  socialLinks = [],
  className = '',
  variant = 'default',
}) => {
  const variantClasses = {
    default: 'bg-[#1A1815] text-white',
    minimal: 'bg-white border-t border-[#E8E5E0] text-[#1A1815]',
  };

  const isDarkVariant = variant === 'default';

  return (
    <footer className={`${variantClasses[variant]} ${className}`}>
      {variant === 'default' && sections.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {sections.map((section, index) => (
              <div key={index}>
                {section.title && (
                  <h3 className="font-bold text-lg mb-4 text-[#D97757]">
                    {section.title}
                  </h3>
                )}
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="hover:text-[#D97757] transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 border-t border-opacity-20 border-current">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            {copyright || `© ${new Date().getFullYear()} Wapsell. All rights reserved.`}
          </p>

          {socialLinks.length > 0 && (
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  aria-label={social.label}
                  className={`transition-opacity hover:opacity-80 ${isDarkVariant ? 'text-white' : 'text-[#1A1815]'}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
