import React, { useEffect, useRef } from "react";
import { QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";

export default function QRSection() {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?view=janamail`
    : "https://hcrskerala.org/?view=janamail";

  useEffect(() => {
    if (qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        currentUrl,
        {
          width: 160,
          margin: 1,
          color: {
            dark: "#1e3a8a", // deep blue
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("Error drawing QR code in QRSection:", error);
        }
      );
    }
  }, [currentUrl, qrCanvasRef]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Operation Janamail - HCRS Kerala",
          text: "അധികാരികളിലേക്ക് ജനശബ്ദം എത്തിക്കുന്ന പൊതുപങ്കാളിത്ത ഇമെയിൽ ക്യാമ്പയിൻ. പങ്കെടുക്കൂ!",
          url: currentUrl,
        });
      } catch (err) {
        console.warn("Share failed:", err);
      }
    } else {
      navigator.clipboard.writeText(currentUrl);
      alert("ലിങ്ക് കോപ്പി ചെയ്തിരിക്കുന്നു! (Link copied to clipboard!)");
    }
  };

  return (
    <section className="bg-gradient-to-b from-blue-50/60 to-white py-14 border-t border-slate-200">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-900 text-white px-4 py-1.5 rounded-full text-xs font-black mb-4 border border-blue-800 shadow-xs mx-auto">
          <QrCode className="w-4 h-4 text-amber-300" />
          <span>പങ്കുവെക്കുക / SHARE CAMPAIGN</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">
          മൊബൈലിൽ ക്യാമ്പയിൻ ചെയ്യാം
        </h2>

        <p className="mt-3 text-slate-700 font-semibold text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          ഈ ക്യു.ആർ കോഡ് സ്കാൻ ചെയ്ത് ഈ ക്യാമ്പയിൻ പേജ് നിങ്ങളുടെ സുഹൃത്തുക്കൾക്കും കുടുംബാംഗങ്ങൾക്കും പങ്കുവെക്കുക.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-8 md:flex-row">
          {/* Real Dynamic QR Code Canvas */}
          <div className="relative bg-white p-5 rounded-3xl shadow-xl border border-slate-200 w-56 h-56 flex flex-col items-center justify-center group hover:scale-105 transition-transform duration-300">
            <canvas ref={qrCanvasRef} className="w-40 h-40 block" />
            <div className="absolute inset-0 bg-blue-950/10 opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity flex items-center justify-center pointer-events-none">
              <span className="bg-blue-700 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md uppercase tracking-wider">
                Scan Me
              </span>
            </div>
          </div>

          <div className="text-left space-y-4 max-w-xs">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-black text-slate-900">
                1. ക്യു.ആർ കോഡ് സ്കാൻ ചെയ്യുക
              </p>
              <p className="text-xs text-slate-700 mt-1 leading-normal font-semibold">
                നിങ്ങളുടെ മൊബൈൽ ക്യാമറ ഉപയോഗിച്ച് ക്യു.ആർ കോഡ് സ്കാൻ ചെയ്ത് പേജ് തുറക്കുക.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-black text-slate-900">
                2. ലിങ്ക് ഷെയർ ചെയ്യുക
              </p>
              <p className="text-xs text-slate-700 mt-1 leading-normal font-semibold">
                താഴെയുള്ള ബട്ടൺ ഉപയോഗിച്ച് ലിങ്ക് വാട്സ്ആപ്പിലോ മറ്റോ സുഹൃത്തുക്കൾക്കായി ഷെയർ ചെയ്യാം.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-black px-8 py-4 rounded-2xl transition duration-200 shadow-md shadow-blue-700/20 hover:-translate-y-0.5 cursor-pointer"
          >
            <Share2 className="w-5 h-5" />
            <span>ക്യാമ്പയിൻ ലിങ്ക് ഷെയർ ചെയ്യാം</span>
          </button>
        </div>
      </div>
    </section>
  );
}
