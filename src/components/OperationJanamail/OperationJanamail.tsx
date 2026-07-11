import React from "react";
import CampaignInfo from "./CampaignInfo";
export default function OperationJanamail() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 text-white">

        <div className="mx-auto max-w-7xl px-6 py-20 text-center">

          <div className="inline-flex items-center rounded-full bg-white/15 px-5 py-2 text-sm backdrop-blur">
            Public Email Campaign
          </div>

          <h1 className="mt-8 text-5xl font-extrabold tracking-wide md:text-7xl">
            OPERATION
          </h1>

          <h2 className="text-6xl font-black text-yellow-300 md:text-8xl">
            JANAMAIL
          </h2>

          <p className="mt-10 text-2xl font-bold md:text-4xl">
            ജനങ്ങൾ ഉണർന്നു...
          </p>

          <p className="mt-2 text-3xl font-extrabold text-yellow-300 md:text-5xl">
            അധികാരികളേ, ഉണരൂ.
          </p>

          <div className="mx-auto mt-12 max-w-4xl rounded-3xl bg-white/10 p-8 backdrop-blur">

            <p className="text-lg leading-8 md:text-xl">
              ഓരോ പൗരനും അവരുടെ അഭിപ്രായങ്ങളും ആവശ്യങ്ങളും
              ബന്ധപ്പെട്ട സർക്കാർ അധികാരികളെ
              മാന്യവും ഉത്തരവാദിത്തപരവുമായി
              അറിയിക്കാൻ സഹായിക്കുന്ന
              ഒരു പൊതുപങ്കാളിത്ത ഇ-മെയിൽ ക്യാമ്പയിനാണ്
              <strong> Operation Janamail.</strong>
            </p>

          </div>

        </div>

      </section>

      {/* Placeholder */}

      <CampaignInfo />

    </main>
  );
}
