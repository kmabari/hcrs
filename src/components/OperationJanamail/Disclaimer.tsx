import React from "react";
import { JanamailConfig } from "../../lib/cms";

interface DisclaimerProps {
  config?: JanamailConfig | null;
}

export default function Disclaimer({ config }: DisclaimerProps) {
  const disclaimerText = config?.disclaimer || "ഈ ക്യാമ്പയിൻ പൊതുജനങ്ങൾക്ക് വിവരങ്ങൾ നൽകുന്നതിനായുള്ളതാണ്. എല്ലാ ഇമെയിലുകളും നിയമപരമായും ഉത്തരവാദിത്തത്തോടെയും മാത്രം ഉപയോഗിക്കണം. സ്പാം സന്ദേശങ്ങൾ അയയ്ക്കരുത്.";

  return (
    <section className="bg-yellow-50 border border-yellow-300 rounded-2xl p-8 my-10">
      <h2 className="text-2xl font-bold text-yellow-800 text-left">
        Disclaimer
      </h2>

      <p className="mt-4 text-gray-700 leading-8 text-left whitespace-pre-wrap">
        {disclaimerText}
      </p>
    </section>
  );
}
