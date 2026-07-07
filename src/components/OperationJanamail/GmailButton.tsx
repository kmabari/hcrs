import React from "react";

export default function GmailButton() {
  return (
    <div className="text-center py-10">
      <a
        href="https://mail.google.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-xl bg-red-600 px-8 py-4 text-white text-lg font-bold hover:bg-red-700 transition"
      >
        📧 Gmail തുറക്കുക
      </a>
    </div>
  );
}
