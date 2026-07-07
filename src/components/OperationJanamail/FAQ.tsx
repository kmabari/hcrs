import React from "react";

export default function FAQ() {
  return (
    <section className="bg-white py-10">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center">
          Frequently Asked Questions
        </h2>

        <div className="mt-8 space-y-6">

          <div className="border rounded-xl p-5">
            <h3 className="font-bold">
              ഈ ക്യാമ്പയിൻ എന്തിനാണ്?
            </h3>
            <p className="mt-2 text-gray-700">
              പൊതുജനങ്ങളുടെ അഭിപ്രായം ബന്ധപ്പെട്ട അധികാരികൾക്ക് ഇമെയിൽ വഴി അറിയിക്കാനാണ്.
            </p>
          </div>

          <div className="border rounded-xl p-5">
            <h3 className="font-bold">
              ഇത് നിയമപരമാണോ?
            </h3>
            <p className="mt-2 text-gray-700">
              നിയമപരവും ഉത്തരവാദിത്തത്തോടെയും മാത്രമേ ഈ സംവിധാനം ഉപയോഗിക്കാവൂ.
            </p>
          </div>

          <div className="border rounded-xl p-5">
            <h3 className="font-bold">
              സ്പാം അയക്കാമോ?
            </h3>
            <p className="mt-2 text-gray-700">
              ഇല്ല. ഒരേ സന്ദേശം ആവർത്തിച്ച് അയക്കുന്നത് ഒഴിവാക്കണം.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
