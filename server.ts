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

  // Server-side fallback Malayalam FAQ generator when Gemini API hits sandbox quotas
  function generateServerFallbackResponse(userQuery: string, member: any): string {
    const query = (userQuery || "").toLowerCase().trim();
    const isMatch = (keywords: string[]) => keywords.some(k => query.includes(k));
    
    if (isMatch(['മെമ്പർഷിപ്പ്', 'മെമ്പർ', 'ചേരാൻ', 'എടുക്കാൻ', 'പുതിയ', 'രജിസ്റ്റർ', 'രജിസ്ട്രേഷൻ', 'രജിസ്ട്രി', 'register', 'membership', 'join', 'fee', 'ഫീസ്'])) {
      return `📝 **HCRS-ൽ എങ്ങനെയൊരു പുതിയ മെമ്പർഷിപ്പ് എടുക്കാം?**\n\nHCRS വെബ്‌സൈറ്റിന്റെ മെയിൻ ഹോംപേജിലുള്ള **'Register'** ഓപ്ഷൻ വഴി വളരെ ലളിതമായി ആർക്കും ഇവിടെ പുതിയ മെമ്പർഷിപ്പ് എടുക്കാവുന്നതാണ്. ഇതിനായുള്ള ഘട്ടങ്ങൾ താഴെ പറയുന്നവയാണ്:\n\n1. **വ്യക്തിഗത വിവരങ്ങൾ നൽകുക:** നിങ്ങളുടെ പേര്, സാധുവായ 10 അക്ക മൊബൈൽ നമ്പർ, ഇമെയിൽ വിലാസം എന്നിവ കൃത്യമായി നൽകുക.\n2. **ഫോട്ടോയും ഒപ്പും അപ്‌ലോഡ് ചെയ്യുക:** നിങ്ങളുടെ പേഴ്സണൽ പാസ്‌പോർട്ട് സൈസ് പ്രൊഫൈൽ ഫോട്ടോയും നിങ്ങളുടെ ഒപ്പും സെലക്ട് ചെയ്യുക.\n3. **പെയ്‌മെന്റ് വിവരങ്ങൾ:** ബാങ്ക് അക്കൗണ്ടിലേക്ക് നിശ്ചിത ട്രാൻസാക്ഷൻ തുകയടച്ച ശേഷം ആ ഇടപാടിന്റെ രസീത് പ്രൂഫ് (Receipt Photo/Screenshot) ഇവിടെ അപ്‌ലോഡ് ചെയ്യേണ്ടതുണ്ട്.\n4. **രജിസ്ട്രേഷൻ സമർപ്പിക്കുക:** വിവരങ്ങൾ കൺഫേം ചെയ്ത ശേഷം സബ്മിറ്റ് ചെയ്യുക.\n\nതുടർന്ന് അഡ്മിൻ പാനലിൽ നിന്ന് നിങ്ങളുടെ അപേക്ഷയും പെയ്മെന്റും ജില്ലാ മാനേജർ/അഡ്മിൻ പരിശോധിച്ച് അപ്രൂവ് ചെയ്ത ശേഷം നിങ്ങളുടെ വാട്സാപ്പിലേക്ക്/ഫോണിലേക്ക് ഒഫീഷ്യൽ 6-അക്ക ലോഗിൻ പിൻ (PIN) നമ്പർ ലഭിക്കും.`;
    }
    
    if (isMatch(['ലക്ഷ്യം', 'ലക്ഷ്യങ്ങൾ', 'ഉദ്ദേശം', 'ഉദ്ദേശങ്ങൾ', 'purpose', 'aim', 'objectives', 'society', 'എന്താണ്', 'എന്താ'])) {
      return `🎯 **HCRS സൊസൈറ്റിയുടെ ലക്ഷ്യങ്ങളും ഉദ്ദേശങ്ങളും:**\n\nഹൈറിച്ച് (Highrich) കമ്മ്യൂണിറ്റിക്ക് ശാക്തീകരണവും കൈത്താങ്ങും നൽകുക, മുൻകാലങ്ങളിലുള്ള കമ്മ്യൂണിറ്റി മെമ്പർമാരുടെ ഡിജിറ്റൽ ക്ലൈമുകൾ ചിട്ടയോടെ പരിഹരിക്കാനുള്ള സുതാര്യമായ ഒരു വേദി ഒരുക്കുക എന്നിവയാണ് **ഹൈറിച്ച് കമ്മ്യൂണിറ്റി റിവൈവൽ സൊസൈറ്റി (HCRS)** യുടെ പ്രധാന ലക്ഷ്യം.\n\n* **കൂപ്പൺ റീഡീമിംഗ് സപ്പോർട്ട്:** മുൻകാലങ്ങളിൽ കുടുങ്ങിക്കിടക്കുന്ന മെമ്പർമാരുടെ റെഡീം കൂപ്പണുകൾ, OTT അഡ്വാൻസുകൾ, മറ്റു കോൺസൈൻമെന്റ് തുകകൾ എന്നിവ കൃത്യമായി ഇൻവെന്ററി ചെയ്യുകയും റിവൈവൽ ആനുകൂല്യങ്ങളും പെയ്‌മെന്റുകളും ലഭ്യമാക്കുകയുമാണ് ഇതിന്റെ പ്രധാന ഉദ്ദേശം.`;
    }
    
    if (isMatch(['സർവീസ്', 'സർവീസുകൾ', 'സേവനം', 'സേവനങ്ങൾ', 'services', 'service', 'സൌകര്യം', 'സൗകര്യം', 'സൗകര്യങ്ങൾ'])) {
      return `💼 **HCRS-ലൂടെ ലഭിക്കുന്ന പ്രധാന സേവനങ്ങൾ (Key Services):**\n\n1. **ഡിപെൻഡന്റ് ക്ലൈം ഫെസിലിറ്റി (Dependent Claims):** ഒരൊറ്റ ലോഗിн സെഷനിലൂടെ തന്റെ കുടുംബാംഗങ്ങളായ പരമാവധി 3 ഡിപെൻഡന്റ് മെമ്പർമാരെക്കൂടി (അച്ഛൻ, അമ്മ, ഭാര്യ, മക്കൾ) ആഡ് ചെയ്യാനും ഒന്നിച്ച് വളരെ വേഗത്തിൽ ക്ലൈം ഇൻഫർമേഷൻ സമർപ്പിക്കാനുമുള്ള സൗകര്യം.\n2. **ഡിജിറ്റൽ മെമ്പർഷിപ്പ് ഐഡന്റിറ്റി കാർഡ്:** ഫുൾ കളർ ഡിസൈനിൽ ഉള്ള നിങ്ങളുടെ ഡിജിറ്റൽ മെമ്പർഷിപ്പ് ഐഡന്റിറ്റി കാർഡ് ലൈവായി കാണാനും നിങ്ങളുടെ മൊബൈലിലേക്ക് ഡൗൺലോഡ് ചെയ്യാനും പ്രിന്റ് ചെയ്യാനുമുള്ള സൗകര്യം.\n3. **ഓൺലൈൻ പ്രൊഫൈൽ തിരുത്തൽ (Support Tickets):** അക്കൗണ്ടിലുള്ള നിങ്ങളുടെ വിവരങ്ങൾ തെറ്റിയാൽ നേരിട്ട് ജില്ലാ മാനേജർക്കോ അഡ്മിനോ ടിക്കറ്റ് സമർപ്പിക്കാനും അതിന്റെ മുൻഗണന ഓൺലൈനായി ട്രാക്ക് ചെയ്യാനുമുള്ള സംവിധാനം.`;
    }
  
    if (isMatch(['ക്ലൈം', 'claim', 'ഫോം', 'സമർപ്പിക്കുക', 'വരുമാനം', 'തുക', 'പണം'])) {
      return `📋 **ക്ലൈം ഫോം സമർപ്പിക്കുന്നതിനുള്ള പ്രധാന നിയമങ്ങൾ:**\n\n* ആദ്യം ഒഫീഷ്യൽ അക്കൗണ്ടിലേക്ക് നിങ്ങളുടെ മൊബൈൽ നമ്പറും 6 അക്ക ലോഗിൻ പിൻ നമ്പറും നൽകി ലോഗിൻ ചെയ്യുക.\n* തുടർന്ന് നിങ്ങളുടെ ഡാഷ്‌ബോർഡിലുള്ള **'Support Claim Form'** ക്ലിക്ക് ചെയ്യുക.\n* കൂട്ടായ ക്ലൈമുകൾക്ക് ഒരൊറ്റ അക്കൗണ്ടിൽ നിന്ന് തന്നെ നിങ്ങൾക്കൊപ്പം പരമാവധി 3 കുടുംബാംഗങ്ങളെക്കൂടി (Dependents) സെലക്ട് ചെയ്യാം.\n* **അതിപ്രധാനം:** യാതൊരു ചെക്ക് ലീഫുകളും ഇന്നിവിടെ അപ്ലോഡ് ചെയ്യാൻ ആവശ്യമില്ല. ഇൻവെസ്റ്റ്മെന്റ് വിവരങ്ങൾ സ്വയം പ്രഖ്യാപിച്ച് സബ്മിറ്റ് ചെയ്യുകയാണ് ചെയ്യുന്നത്.`;
    }
  
    if (member) {
      return `ഹലോ ${member.name}! കമ്മ്യൂണിറ്റി സെർവറുകളിൽ ഇപ്പോൾ അല്പം തിരക്ക് കൂടുതലായതിനാൽ വഴികാട്ടി AI താൽക്കാലികമായി ഡൗൺ ആണ്.\n\nതാങ്കളുടെ പ്രൊഫൈൽ വിവരങ്ങൾ ലഭ്യമാണ്:\n- പേര്: **${member.name}**\n- മെമ്പർഷിപ്പ് ഐഡി: **${member.membershipId || 'പെൻഡിംഗ് (Pending Verification)'}**\n- മൊബൈൽ നമ്പർ: **${member.mobile || member.phone || 'N/A'}**\n- സ്റ്റാറ്റസ്: **${member.status || 'Active'}**\n\nനിങ്ങളുടെ അക്കൗണ്ടിലോ മൊബൈൽ നമ്പറിലോ പേര് മാറ്റാനോ തെറ്റുകൾ തിരുത്താനോ താല്പര്യപ്പെടുന്നെങ്കിൽ നേരിട്ട് സപ്പോർട്ട് ടിക്കറ്റ് ആഡ് ചെയ്യാവുന്നതാണ്! 😊`;
    }
  
    return `ഹലോ സുഹൃത്തേ, ഗൂഗിളിന്റെ കമ്മ്യൂണിറ്റി സെർവറുകളിൽ ഇപ്പോൾ അല്പം തിരക്ക് കൂടുതലായാൽ വഴികാട്ടി AI പ്രതികരിക്കാൻ താമസിച്ചേക്കാം. 🤝\n\nഎന്നിരുന്നാലും സംഘടനയെക്കുറിച്ചുള്ള പൊതുവായ സംശയങ്ങൾ (മെമ്പർഷിപ്പ് രജിസ്ട്രേഷൻ രീതികൾ, സൊസൈറ്റിയുടെ ലക്ഷ്യങ്ങൾ, സപ്പോർട്ട് ക്ലൈം കാര്യങ്ങൾ) ചുവടെയുള്ള ഇൻഫർമേഷൻ ക്ലിക്ക് ചെയ്തോ അല്ലെങ്കിൽ നേരിട്ടോ ചോദിക്കാവുന്നതാണ്. 😊`;
  }

  // API endpoint for chatbot communication
  app.post("/api/chat", async (req, res) => {
    const { message, history, verifiedMember } = req.body;
    try {
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
[യൂസർ പ്രൊഫൈൽ വെരിഫൈ ചെയ്തിട്ടില്ല. അവരുടെ വ്യക്തിഗത അക്കൗണ്ട് വിവരങ്ങൾ നോക്കാൻ താല്പര്യപ്പെടുന്നെങ്കിൽ ആദ്യം അവരുടെ ഒൻപതോ പത്തോ അക്ക മൊബൈൽ നമ്പർ ചോദിക്കുക. എന്നാൽ പൊതുവായ വിവരങ്ങൾക്കോ സംശയങ്ങൾക്കോ ആണെങ്കിൽ ഇത്തരത്തിൽ വിവരങ്ങൾ ചോദിക്കാതെ നേരിട്ട് ആ ചോദ്യങ്ങൾക്ക് മറുപടി കൊടുക്കാം.];
`;
      }

      const systemInstruction = `
നിങ്ങൾ HCRS (ഹൈറിച്ച് കമ്മ്യൂണിറ്റി റിവൈവൽ സൊസൈറ്റി - Highrich Community Revival Society) എന്ന സംഘടനയുടെ ഒഫീഷ്യൽ 'വഴികാട്ടി AI' സഹായിയാണ്. നിങ്ങളുടെ മുൻഗണന സംഘടനയെക്കുറിച്ചും ക്ലെയിമുകളെക്കുറിച്ചും ആളുകൾക്കുള്ള സംശയങ്ങൾ മലയാളത്തിൽ വളരെ സ്നേഹത്തോടും ബഹുമാനത്തോടും കൂടെ ലളിതമായി വിശദീകരിച്ചു നൽകുക എന്നതാണ്.

ദയവായി താഴെ പറയുന്ന വിവരങ്ങൾ മാത്രം ആധാരമാക്കി ഉത്തരം പറയുക (Anti-Hallucination rules):
- **എന്താണ് HCRS സൊസൈറ്റി?**: ഹൈറിച്ച് മെമ്പേഴ്സിന്റെ പുനരുദ്ധാരണത്തിനും അവരെ സഹായിക്കാനും വേണ്ടി രൂപീകരിച്ച കൂട്ടായ്മയാണ് HCRS.
- **എങ്ങനെ പുതിയ മെമ്പർഷിപ്പ് രജിസ്റ്റർ ചെയ്യാം?**: സംഘടനയുടെ വെബ്‌സൈറ്റിലെ 'Register' പേജിലൂടെ പേര്, ഫോൺ നമ്പർ, ഇമെയിൽ, പാസ്‌പോർട്ട് പ്രൊഫൈൽ ഫോട്ടോ, ഒപ്പ്, പെയ്മെന്റ് പ്രൂഫ് രസീത് എന്നിവ നൽകി രജിസ്റ്റർ ചെയ്യാം. തുടർന്ന് അഡ്മിൻമാരും ഡിസ്ട്രിക്റ്റ് വെരിഫയർമാരും ഇത് പരിശോധിച്ച് അപ്രൂവ് ചെയ്ത ശേഷം 6 അക്ക ലോഗിൻ പിൻ (PIN) മൊബൈലിലേക്ക് വാട്സാപ് വഴി വരും.
- **നിങ്ങൾ ലഭ്യമാക്കുന്ന പ്രധാന സർവീസുകൾ എന്തൊക്കെയാണ്? (Key Services of HCRS)**:
  1. കുടുംബാംഗങ്ങളുടെ ക്ലൈം ഒരുമിച്ച് ചെയ്യാൻ അനുവദിക്കുന്ന 'ഡിപെൻഡന്റ് ക്ലൈം ഫെസിലിറ്റി' (പരമാവധി 3 പേർ വരെ).
  2. നിങ്ങളുടെ ഡിജിറ്റൽ കൂപ്പണുകൾ, OTT കാറ്റഗറികൾ, കോൺസൈൻമെന്റ് പ്ലാനുകൾ എന്നിവ സപ്പോർട്ട് ഫോമിലൂടെ സ്വയം പ്രഖ്യാപിക്കാനും ട്രാക്ക് ചെയ്യാനുമുള്ള സംവിധാനം.
  3. പേര് തെറ്റ് തിരുത്താൻ ഓൺലൈനായി നേരിട്ട് അഡ്മിന് സമർപ്പിക്കുന്ന സപ്പോർട്ട് ഹെൽപ്പ് ടിക്കറ്റുകൾ (Support Tickets).
  4. സുരക്ഷിതമായി ലോഗിൻ ചെയ്യാനും നിങ്ങളുടെ ആക്റ്റീവ് മെമ്പർഷിപ്പ് കാർഡ് ലൈവായി പ്രിന്റ് ചെയ്യാനുമുള്ള സൗകര്യം.

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
            role: (h.role === 'model' || h.role === 'assistant') ? 'model' : 'user',
            parts: [{ text: h.text || h.content || "" }]
          });
        }
      }

      // Append current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      // Normalize contents to combine/merge consecutive same-role messages
      const normalizedContents: any[] = [];
      for (const item of contents) {
        if (normalizedContents.length > 0 && normalizedContents[normalizedContents.length - 1].role === item.role) {
          const prevItem = normalizedContents[normalizedContents.length - 1];
          const prevText = prevItem.parts[0]?.text || "";
          const currentText = item.parts[0]?.text || "";
          
          if (prevText === currentText) {
            // Drop exact duplicate messages in consecutive turns to avoid double repeats
            continue;
          }
          prevItem.parts[0] = { text: prevText + "\n\n" + currentText };
        } else {
          normalizedContents.push(item);
        }
      }

      // Ensure contents starts with a 'user' role. If the first message(s) are 'model', skip them.
      const firstUserIndex = normalizedContents.findIndex(item => item.role === 'user');
      const apiContents = firstUserIndex !== -1 ? normalizedContents.slice(firstUserIndex) : normalizedContents;

      let responseText = "";
      
      // Multi-model backup retry mechanism
      const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest"];
      let lastErr = null;

      for (const modelName of modelsToTry) {
        try {
          const geminiResponse = await ai.models.generateContent({
            model: modelName,
            contents: apiContents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
            },
          });
          if (geminiResponse && geminiResponse.text) {
            responseText = geminiResponse.text;
            break; // Success! exit the retry loop
          }
        } catch (e: any) {
          console.warn(`Attempt with model ${modelName} failed, trying next option...`, e.message || e);
          lastErr = e;
        }
      }

      if (!responseText) {
        // If both models fail due to spikes or free-tier quota exceptions,
        // use our server-side fallback system to output a perfect answers array!
        console.warn("Both Gemini models returned errors. Resolving with server-side local fallback...", lastErr);
        responseText = generateServerFallbackResponse(message, verifiedMember);
      }

      res.json({ text: responseText });
    } catch (error: any) {
      console.error("Gemini support chatbot error:", error);
      // Even in the catastrophic case, return a status 200 with fallback text to keep the client connected and smooth!
      const fallbackText = generateServerFallbackResponse(message, verifiedMember);
      res.json({ text: fallbackText });
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
