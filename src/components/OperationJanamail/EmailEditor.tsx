import React, { useState } from "react";
import { JANAMAIL_TO_EMAIL, JANAMAIL_CC_EMAIL, JANAMAIL_SUBJECT } from "./janamailConfig";

export default function EmailEditor() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleApply = () => {
    if (!name.trim() || !message.trim()) {
      alert("ദയവായി പേരും അഭിപ്രായവും നൽകുക");
      return;
    }

    const body =
      `പേര്: ${name}\n` +
      `ഇമെയിൽ: ${email}\n\n` +
      `അഭിപ്രായം:\n${message}`;

    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(JANAMAIL_TO_EMAIL)}` +
      (JANAMAIL_CC_EMAIL ? `&cc=${encodeURIComponent(JANAMAIL_CC_EMAIL)}` : "") +
      `&su=${encodeURIComponent(JANAMAIL_SUBJECT)}` +
      `&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, "_blank");
  };

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
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="font-semibold mt-6 block">
            നിങ്ങളുടെ ഇമെയിൽ
          </label>

          <input
            className="w-full mt-2 border rounded-xl p-3"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="font-semibold mt-6 block">
            നിങ്ങളുടെ അഭിപ്രായം
          </label>

          <textarea
            rows={8}
            className="w-full mt-2 border rounded-xl p-3"
            placeholder="ഇവിടെ നിങ്ങളുടെ അഭിപ്രായം എഴുതുക..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="text-center mt-8">
            <button
              onClick={handleApply}
              className="inline-block rounded-xl bg-blue-900 px-10 py-4 text-white text-lg font-bold hover:bg-blue-800 transition"
            >
              Apply / അയക്കുക
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}