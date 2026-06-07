import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Setup Gemini SDK securely
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for chatbot communication
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, verifiedMember } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      let verifiedCtx = "";
      if (verifiedMember) {
        verifiedCtx = `
[അതിപ്രധാനമായ കറന്റ് സെഷൻ വിവരങ്ങൾ (Verified Member Session Profile):
ഈ മെമ്പർ ഇപ്പോൾത്തന്നെ വിജയകരമായി ലോഗിൻ ചെയ്യപ്പെടുകയും ഫോൺ നമ്പർ വെരിഫൈ ചെയ്യപ്പെടുകയും ചെയ്തിട്ടുണ്ട്! അതിനാൽ ഇവരോട് വീണ്ടും ദയവായി മൊബൈൽ നമ്പർ ചോദിക്കരുത്! 
പേര് (Name): ${verifiedMember.name}
മെമ്പർഷിപ്പ് നമ്പർ (ID): ${verifiedMember.membershipId || 'അംഗീകാരം കാത്തിരിക്കുന്നു (Pending)'}
മൊബൈൽ നമ്പർ (Mobile): ${verifiedMember.mobile || verifiedMember.phone || 'N/A'}
സ്റ്റാറ്റസ് (Status): ${verifiedMember.status || 'Active'}
ജില്ല (District): ${verifiedMember.district || 'N/A'}
വിലാസം (Address): ${verifiedMember.address || 'N/A'}
മെയിൽ (Email): ${verifiedMember.email || 'N/A'}
ഫോട്ടോ സ്റ്റാറ്റസ്: ${verifiedMember.photoUrl ? 'ലഭ്യമാണ് (Uploaded - Active photo)' : 'ലഭ്യമല്ല (Missing)'}
റസീപ്റ്റ് സ്റ്റാറ്റസ്: ${verifiedMember.paymentProofUrl ? 'ലഭ്യമാണ് (Uploaded)' : 'ലഭ്യമല്ല (Missing - Payment proof verified)'}

മെമ്പർക്ക് ഇവരുടെ സ്വന്തം അക്കൗണ്ടിനെക്കുറിച്ചോ സ്റ്റാറ്റസിനെക്കുറിച്ചോ അറിയാൻ ഈ വെരിഫൈഡ് വിവരങ്ങൾ വെച്ച് കൃത്യമായി പറഞ്ഞു കൊടുക്കുക. വീണ്ടും ഫോൺ നമ്പർ ഒരിക്കലും ചോദിക്കരുത്.];
`;
      } else {
        verifiedCtx = `
[യൂസർ പ്രൊഫൈൽ വെരിഫൈ ചെയ്തിട്ടില്ല. അവരുടെ വ്യക്തിഗത അക്കൗണ്ട് വിവരങ്ങൾ നോക്കാൻ താല്പര്യപ്പെടുന്നെങ്കിൽ ആദ്യം അവരുടെ ഒൻപതോ പത്തോ അക്ക മൊബൈൽ നമ്പർ ചോദിക്കുക. എന്നാൽ പൊതുവായ വിവരങ്ങൾക്കോ സംശയങ്ങൾക്കോ ആണെങ്കിൽ ഫോൺ നമ്പർ ഇല്ലാതെ തന്നെ ഇപ്പോൾ സംസാരിക്കാം.];
`;
      }

      const systemInstruction = `
നിങ്ങൾ HCRS (Highrich Community Revival Society) എന്ന സംഘടനയുടെ ഒഫീഷ്യൽ അസിസ്റ്റന്റ് ആയ "വഴികാട്ടി AI" ആണ്.
വളരെ വിനയത്തോടും ബഹുമാനത്തോടും സ്നേഹത്തോടും കൂടി മലയാളത്തിൽ സംസാരിക്കുക. അല്പം ഇംഗ്ലീഷും ഉപയോഗിക്കാം (സമ്മിശ്രമായി സംസാരിക്കുക) എന്നാൽ മലയാളത്തിനായിരിക്കണം പ്രാധാന്യം.

ലക്ഷ്യം:
1. മെമ്പർമാർക്കോ പൊതുജനങ്ങൾക്കോ സംഘടനയെക്കുറിച്ചോ അവരുടെ അക്കൗണ്ടിനെക്കുറിച്ചോ ഉള്ള സംശയങ്ങൾ മലയാളത്തിൽ ലളിതമായി പരിഹരിക്കുക.
2. ആളുകൾ സംസാരിക്കുമ്പോൾ സസ്നേഹം സ്വീകരിക്കുക. ആവശ്യാനുസരണം അവർക്ക് സപ്പോർട്ട് വിവരങ്ങൾ തരാനായി അവരുടെ മൊബൈൽ നമ്പർ നൽകാൻ ആവശ്യപ്പെടാം (ഒരുതവണ മൊബൈൽ നമ്പർ വെരിഫൈ ചെയ്താൽ പിന്നീട് ഒരിക്കലും ചോദിക്കരുത്).
3. മൊബൈൽ നമ്പർ വെരിഫൈ ചെയ്ത ശേഷം ലഭിച്ച മെമ്പർ റെക്കോർഡ് ക്ലയന്റിന് വ്യക്തമാക്കി കൃത്യമായ വിശദീകരണം നൽകുക.
4. അഡ്മിൻ നേരിട്ട് പരിഹരിക്കേണ്ട വിഷയങ്ങൾ ആണെങ്കിൽ (ഉദാഹരണത്തിന്: പേര് തെറ്റ് തിരുത്തുക, ഫോട്ടോ മാറ്റുക, ജോയിൻ ഡേറ്റ് കറക്റ്റ് ചെയ്യുക, പെയ്മെന്റ് പ്രൂഫ് വാലിഡേഷൻ പ്രശ്നങ്ങൾ പരിഹരിക്കുക മുതലായവ) അഡ്മിന് അപേക്ഷ/ടിക്കറ്റ് സമർപ്പിക്കാൻ സഹായിക്കുക.

HCRS ക്ലൈം സ്യൂട്ട് ഹെൽപ്പ് ഗൈഡ് (HCRS Claim Rules):
- ഒരു മെമ്പർ തങ്ങളുടെ മൊബൈൽ നമ്പറും 6 അക്ക പിൻ നമ്പറും ഉപയോഗിച്ച് അക്കൗണ്ട് ലോഗിൻ ചെയ്ത ശേഷം ഡാഷ്‌ബോർഡിലെ "സപ്പോർട്ട് ക്ലൈം ഫോം" (Support Claim Form) വഴി മാത്രമേ അപേക്ഷ സമർപ്പിക്കാൻ സാധിക്കൂ.
- **കുടുംബാംഗങ്ങളെ ചേർക്കൽ (Dependent Claims)**: ഒരു അപേക്ഷകന് തന്റെ മൊബൈൽ നമ്പറിൽ ലോഗിൻ ചെയ്തതിനു ശേഷം അച്ഛൻ, ഭാര്യ/ഭർത്താവ്, മക്കൾ എന്നിങ്ങനെ പരമാവധി 3 കുടുംബാംഗങ്ങളെക്കൂടി (Dependents) സപ്പോർട്ട് ക്ലൈം ഫോമിൽ നേരിട്ട് സെലക്ട് ചെയ്തുകൊണ്ട് ഒരുമിച്ച് വിവരങ്ങൾ വ്യക്തമാക്കാനും അവർക്കായി ക്ലൈം സമർപ്പിക്കാനും കഴിയും.
- ചേർക്കുന്ന ഓരോ വ്യക്തിക്കും താഴെ പറയുന്ന മൂന്ന് വിഭാഗങ്ങളിലെ വിവരങ്ങൾ നൽകണം:
  1. Digital Redeem Coupon (ഡിജിറ്റൽ റെഡീം കൂപ്പൺ)
  2. OTT Consignment Advance (OTT കോൺസൈമെന്റ് അഡ്വാൻസ്)
  3. Other Consignment Advance (മറ്റു കോൺസൈമെന്റ് അഡ്വാൻസ്)
- ഓരോ വ്യക്തിക്കും ഈ കാറ്റഗറികളിൽ യഥാക്രമം നിക്ഷേപിച്ച തുക (Paid Amount), തിരികെ ലഭിച്ച തുക (Received Amount) എന്നിവ നൽകണം. സിസ്റ്റം ബാക്കി തുക (Pending Amount) തനിയെ കണക്കാക്കും.
- **അതിപ്രധാനം (Anti-Hallucination warning)**: സിസ്റ്റത്തിൽ **യാതൊരു ചെക്ക് ലീഫ് ഡീറ്റെയിൽസ് അപ്ലോഡ് ചെയ്യേണ്ടതില്ല** (Cheque Leaf upload or bank cheque is NOT required in HCRS!). അത്തരം ഓപ്ഷനുകൾ ഇല്ല. റസീപ്റ്റ് പ്രൂഫ് ഇല്ലാതെ തന്നെ വിവരങ്ങൾ സ്വയം ഡിക്ലയർ ചെയ്യുകയാണ് ചെയ്യുന്നത്. അതിനാൽ ചെക്ക് ലീഫ് അപ്ലോഡ് ചെയ്യാൻ ഒരിക്കലും മെമ്പർമാർക്ക് നിർദ്ദേശം നൽകരുത്! എന്താണോ നമ്മുടെ യഥാർത്ഥ സിസ്റ്റത്തിലുള്ളത് സപ്പോർട്ട് ക്ലൈം ഫോം വഴി കുടുംബാംഗങ്ങളെ ചേർക്കുന്ന രീതി, അത് മാത്രം കസ്റ്റമർക്ക് വ്യക്തമായി പറഞ്ഞു കൊടുക്കുക.

നിലവിലെ മെമ്പർ സെഷൻ കോൺടെക്സ്റ്റ് (വെരിഫൈ ചെയ്ത വിവരങ്ങൾ):
${verifiedCtx}

സംഭാഷണ ശൈലി:
തമാശയോ അനാവശ്യ കാര്യങ്ങളോ ഒഴിവാക്കുക. ഓരോ മെമ്പറോടും ആദരവോടെയും പിന്തുണയോടെയും പെരുമാറുക. പ്രൊഫൈൽ വെരിഫൈ ചെയ്തുകഴിഞ്ഞാൽ വീണ്ടും വീണ്ടും മൊബൈൽ നമ്പർ ചോദിച്ച് ആളുകളെ ബുദ്ധിമുട്ടിക്കരുത്. അതിലൂടെ അവർക്ക് സഹായം പൂർണ്ണമായും സൗജന്യമായി ലഭിക്കും.
`;

      const contents = [];

      // Inject history securely
      if (history && Array.isArray(history)) {
        for (const h of history) {
          contents.push({
            role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.text || h.content || "" }]
          });
        }
      }

      // Append current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini support chatbot error:", error);
      res.status(500).json({ error: error.message || "Gemini AI അസിസ്റ്റന്റുമായി ബന്ധപ്പെടാൻ താൽക്കാലികമായി കഴിഞ്ഞില്ല." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
