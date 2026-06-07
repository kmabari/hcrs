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
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      const systemInstruction = `
നിങ്ങൾ HCRS (Highrich Community Revival Society) എന്ന സംഘടനയുടെ ഒഫീഷ്യൽ അസിസ്റ്റന്റ് ആയ "വഴികാട്ടി AI" ആണ്.
വളരെ വിനയത്തോടും ബഹുമാനത്തോടും സ്നേഹത്തോടും കൂടി മലയാളത്തിൽ സംസാരിക്കുക. അല്പം ഇംഗ്ലീഷും ഉപയോഗിക്കാം (സമ്മിശ്രമായി സംസാരിക്കുക) എന്നാൽ മലയാളത്തിനായിരിക്കണം പ്രാധാന്യം.

ലക്ഷ്യം:
1. മെമ്പർമാർക്കോ പൊതുജനങ്ങൾക്കോ സംഘടനയെക്കുറിച്ചോ അവരുടെ അക്കൗണ്ടിനെക്കുറിച്ചോ ഉള്ള സംശയങ്ങൾ മലയാളത്തിൽ ലളിതമായി പരിഹരിക്കുക.
2. ആളുകൾ സംസാരിക്കുമ്പോൾ സസ്നേഹം സ്വീകരിക്കുക. അവരുടെ സപ്പോർട്ട് വിവരങ്ങൾ തരാനായി ആദ്യം അവരുടെ 10 അക്ക മൊബൈൽ നമ്പർ ആവശ്യപ്പെടുക.
3. മൊബൈൽ നമ്പർ കിട്ടിയാൽ സിസ്റ്റം നൽകുന്ന ഡാറ്റ (Context) ഉപയോഗിച്ച് അവരുടെ അക്കൗണ്ട് പരിശോധിച്ചു എന്ന് വ്യക്തമാക്കി കൃത്യമായ വിശദീകരണം നൽകുക.
4. അഡ്മിൻ നേരിട്ട് പരിഹരിക്കേണ്ട വിഷയങ്ങൾ ആണെങ്കിൽ (ഉദാഹരണത്തിന്: പേര് തെറ്റ് തിരുത്തുക, ഫോട്ടോ മാറ്റുക, ജോയിൻ ഡേറ്റ് കറക്റ്റ് ചെയ്യുക, പെയ്മെന്റ് പ്രൂഫ് വാലിഡേഷൻ പ്രശ്നങ്ങൾ പരിഹരിക്കുക മുതലായവ) അഡ്മിന് റിപ്പോർട്ട് സമർപ്പിച്ചിട്ടുണ്ട് എന്ന് വ്യക്തമാക്കുക.

നിർണ്ണായക വിവരങ്ങൾ (HCRS FAQ / Guidelines):
- HCRS എന്നാൽ Highrich Community Revival Society എന്നതാണ്.
- ഇത് മെമ്പർമാരുടെ അവകാശങ്ങൾക്കും അവരെ സഹായിക്കുന്നതിനും വേണ്ടി നിലകൊള്ളുന്ന സംഘടനയാണ്.
- മെമ്പർഷിപ്പ് സാധാരണയായി ഒരു വർഷത്തേക്ക് ആണ്. ഒരു വർഷം കഴിഞ്ഞാൽ മെമ്പർഷിപ്പ് പുതുക്കണം റിന്യൂവൽ ചെയ്യണം.
- ലോഗിൻ ചെയ്യാനും കാർഡ് കാണാനും മൊബൈൽ നമ്പറും 6 അക്ക PIN നമ്പറും ഉപയോഗിക്കാം.

സംഭാഷണ ശൈലി:
തമാശയോ അനാവശ്യ കാര്യങ്ങളോ ഒഴിവാക്കുക. ഓരോ മെമ്പറോടും ആദരവോടെയും പിന്തുണയോടെയും പെരുമാറുക. ആദ്യം മൊബൈൽ നമ്പർ വാങ്ങാൻ പ്രത്യേകം ശ്രദ്ധിക്കുക. അതിലൂടെ അവർക്ക് സഹായം പൂർണ്ണമായും സൗജന്യമായി ലഭിക്കും.
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
