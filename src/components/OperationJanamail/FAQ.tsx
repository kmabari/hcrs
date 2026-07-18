import React from "react";
import { JanamailConfig } from "../../lib/cms";

interface FAQProps {
  config?: JanamailConfig | null;
}

export default function FAQ({ config }: FAQProps) {
  const faqItems = config?.faqItems || [
    { question: "ഈ ക്യാമ്പയിൻ എന്തിനാണ്?", answer: "പൊതുജനങ്ങളുടെ അഭിപ്രായം ബന്ധപ്പെട്ട അധികാരികൾക്ക് ഇമെയിൽ വഴി അറിയിക്കാനാണ്." },
    { question: "ഇത് നിയമപരമാണോ?", answer: "നിയമപരവും ഉത്തരവാദിത്തത്തോടെയും മാത്രമേ ഈ സംവിധാനം ഉപയോഗിക്കാവൂ." },
    { question: "സ്പാം അയക്കാമോ?", answer: "ഇല്ല. ഒരേ സന്ദേശം ആവർത്തിച്ച് അയക്കുന്നത് ഒഴിവാക്കണം." }
  ];

  return (
    <section className="bg-white py-10">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center">
          Frequently Asked Questions
        </h2>

        <div className="mt-8 space-y-6">
          {faqItems.map((item, index) => (
            <div key={index} className="border rounded-xl p-5 text-left">
              <h3 className="font-bold">
                {item.question}
              </h3>
              <p className="mt-2 text-gray-700">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
