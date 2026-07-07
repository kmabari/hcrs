import React from "react";

export default function EmailEditor() {
  return (
    <section className="bg-gray-50 py-20">
      <div className="max-w-5xl mx-auto px-6">

        <h2 className="text-4xl font-bold text-center text-blue-900">
          നിങ്ങളുടെ അഭിപ്രായം രേഖപ്പെടുത്തുക
        </h2>

        <p className="mt-4 text-center text-gray-600">
          മാന്യവും വസ്തുതാപരവും ഉത്തരവാദിത്തപരവുമായ ഭാഷയിൽ നിങ്ങളുടെ അഭിപ്രായം
          രേഖപ്പെടുത്തുക.
        </p>

        <div className="mt-10 rounded-3xl bg-white shadow-xl p-8">

          <label className="font-semibold">
            നിങ്ങളുടെ പേര്
          </label>

          <input
            className="w-full mt-2 border rounded-xl p-3"
            placeholder="പേര്"
          />

          <label className="font-semibold mt-6 block">
            നിങ്ങളുടെ ഇമെയിൽ
          </label>

          <input
            className="w-full mt-2 border rounded-xl p-3"
            placeholder="example@gmail.com"
          />

          <label className="font-semibold mt-6 block">
            നിങ്ങളുടെ അഭിപ്രായം
          </label>

          <textarea
            rows={8}
            className="w-full mt-2 border rounded-xl p-3"
            placeholder="ഇവിടെ നിങ്ങളുടെ അഭിപ്രായം എഴുതുക..."
          />

        </div>

      </div>
    </section>
  );
}
