import React from "react";
import { JanamailConfig } from "../../lib/cms";

interface CampaignInfoProps {
  config?: JanamailConfig | null;
}

export default function CampaignInfo({ config }: CampaignInfoProps) {
  return (
    <section className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-blue-900">
            {config?.whyCampaignHeading || "എന്തുകൊണ്ടാണ് Operation Janamail?"}
          </h2>

          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed whitespace-pre-wrap">
            {config?.whyThisCampaign || "ജനങ്ങളുടെ ശബ്ദം മാന്യമായും ഉത്തരവാദിത്തപരമായും ബന്ധപ്പെട്ട അധികാരികളിലേക്ക് എത്തിക്കുന്ന ഒരു പൊതുപങ്കാളിത്ത സംരംഭം."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">

          <div className="rounded-2xl shadow-lg p-8 border">
            <h3 className="text-2xl font-bold text-blue-800">
              പൊതുപങ്കാളിത്തം
            </h3>

            <p className="mt-4 text-gray-700 leading-7">
              ഓരോ പൗരനും അവരുടെ അഭിപ്രായം നിയമപരവും
              മാന്യവുമായ ഭാഷയിൽ അറിയിക്കാനുള്ള അവസരം.
            </p>
          </div>

          <div className="rounded-2xl shadow-lg p-8 border">
            <h3 className="text-2xl font-bold text-blue-800">
              ഉത്തരവാദിത്തം
            </h3>

            <p className="mt-4 text-gray-700 leading-7">
              അധിക്ഷേപമോ ഭീഷണിയോ ഇല്ലാതെ
              ഉത്തരവാദിത്തത്തോടെ ആശയവിനിമയം നടത്തുക.
            </p>
          </div>

          <div className="rounded-2xl shadow-lg p-8 border">
            <h3 className="text-2xl font-bold text-blue-800">
              ജനശബ്ദം
            </h3>

            <p className="mt-4 text-gray-700 leading-7">
              കൂടുതൽ ആളുകളുടെ യഥാർത്ഥ അനുഭവങ്ങൾ
              ബന്ധപ്പെട്ട അധികാരികളുടെ ശ്രദ്ധയിൽ എത്തിക്കുക.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
