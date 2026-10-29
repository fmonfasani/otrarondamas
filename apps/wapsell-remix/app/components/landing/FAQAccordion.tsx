import { useState } from 'react';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  title: string;
  items: FAQItem[];
}

export function FAQAccordion({ title, items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
          {title}
        </h2>
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition"
                aria-expanded={openIndex === idx}
              >
                <span className="font-semibold text-gray-900">{item.question}</span>
                <span className="text-blue-600 font-bold text-xl">
                  {openIndex === idx ? '−' : '+'}
                </span>
              </button>
              {openIndex === idx && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
