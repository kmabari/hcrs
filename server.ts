import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { google } from "googleapis";

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
  function generateServerFallbackResponse(userQuery: string, member: any, orgSettings?: any): string {
    const query = (userQuery || "").toLowerCase().trim();
    const isMatch = (keywords: string[]) => keywords.some(k => query.includes(k));

    // Exact and approximate matched Q&A pairs requested by user
    if (query.includes('how can i become a member') || query.includes('how to join') || query.includes('become a member')) {
      return `You can apply through the official HCRS website membership registration page.`;
    }
    if (query.includes('എങ്ങനെ മെമ്പർ ആകാം') || query.includes('എങ്ങനെ അംഗമാകാം') || query.includes('എങ്ങനെ ചേരാം')) {
      return `ഔദ്യോഗിക HCRS വെബ്സൈറ്റിലെ Membership Registration വഴി അപേക്ഷിക്കാം.`;
    }
    if (query.includes('ഫീസ് എത്രയാണ്') || query.includes('മെമ്പർഷിപ്പ് ഫീസ്') || query.includes('membership fee') || query.includes('registration fee')) {
      return `HCRS മെമ്പർഷിപ്പ് രജിസ്ട്രേഷൻ ഫീസ് ₹200 ആണ്.`;
    }
    if (query.includes('ആർക്കെല്ലാം കഴിയും') || query.includes('മെമ്പർഷിപ്പ് എടുക്കാൻ ആർക്കെല്ലാം') || query.includes('who can join')) {
      return `ഹൈക്കുറിച്ച് കമ്മ്യൂണിറ്റിയുമായി ബന്ധപ്പെട്ട ആർക്കും HCRS മെമ്പർഷിപ്പ് എടുക്കാവുന്നതാണ്.`;
    }
    if (query.includes('കാലത്തേക്ക് സാധുവാണ്') || query.includes('കാലാവധി എത്ര') || query.includes('ഹൗ ലോങ്ങ് ഈസ് മെമ്പർഷിപ്പ്') || query.includes('how long is membership valid')) {
      return `മെമ്പർഷിപ്പ് ഒരു വർഷത്തേക്കാണ്. ഓരോ വർഷവും ₹100 നൽകി Renewal ചെയ്യേണ്ടതാണ്.`;
    }
    if (query.includes('എന്തൊക്കെ വിവരങ്ങൾ വേണം') || query.includes('രജിസ്റ്റർ ചെയ്യാൻ എന്തൊക്കെ വേണം') || query.includes('what details are needed to register') || query.includes('requirements for membership')) {
      return `പേര്, മൊബൈൽ നമ്പർ, ജില്ല, മണ്ഡലം എന്നീ വിവരങ്ങൾ മാത്രം നൽകുക.`;
    }
    if (query.includes('ഫീസ് എങ്ങനെ അടയ്ക്കാം') || query.includes('എങ്ങനെ ഫീസ് അടയ്ക്കാം') || query.includes('how to pay membership fee') || query.includes('how to pay fee')) {
      return `Registration Form-ൽ കാണുന്ന QR Code Scan ചെയ്ത് Payment നടത്തുക.`;
    }
    if (query.includes('ചെയ്ത ശേഷം എന്താണ് ചെയ്യേണ്ടത്') || query.includes('രസീത് നൽകിയ ശേഷം') || query.includes('what to do after payment') || query.includes('after paying fee')) {
      return `Transaction ID, Date, Time എന്നിവ ഫോമിൽ നൽകി Submit ചെയ്യണം.`;
    }
    if (query.includes('ഉടനെ മെമ്പർഷിപ്പ് ലഭിക്കുമോ') || query.includes('പെട്ടെന്ന് അപ്രൂവ് ആകുമോ') || query.includes('will i get membership immediately')) {
      return `ഇല്ല. ആദ്യം അഡ്മിൻ പരിശോധനയും Approval-വും പൂർത്തിയാകണം.`;
    }
    if (query.includes('എങ്ങനെ ലോഗിൻ ചെയ്യാം') || query.includes('എങ്ങനെ login ചെയ്യാം') || query.includes('how to login after approval')) {
      return `നിങ്ങളുടെ Mobile Number Username ആയി ഉപയോഗിക്കുക.\n\nPassword:\n123456`;
    }
    if (query.includes('എങ്ങനെ ഐഡി കാർഡ് കാണാം') || query.includes('ഐഡി കാർഡ് എങ്ങനെ ലഭിക്കും') || query.includes('how to view membership card') || query.includes('how to download id card') || query.includes('എനിക്ക് മെമ്പർഷിപ്പ് കാർഡ് എങ്ങനെ ലഭിക്കും')) {
      return `Mobile Number, Password ഉപയോഗിച്ച് Login ചെയ്താൽ Digital Membership Card കാണാം.`;
    }
    if (query.includes('website address') || query.includes('വെബ്സൈറ്റ് അഡ്രസ്') || query.includes('hcrs website link') || query.includes('വെബ്‌സൈറ്റ് എന്താണ്')) {
      return `Website സന്ദർശിക്കാൻ:\nwww.hcrs.in`;
    }
    if (query.includes('കേസുമായി ബന്ധപ്പെട്ട') || query.includes('കേസ് വിവരങ്ങൾ എവിടെ') || query.includes('where to see case updates') || query.includes('where to find court updates')) {
      return `Website Home Page-ൽ പ്രധാനപ്പെട്ട Updates പ്രസിദ്ധീകരിക്കുന്നതാണ്.`;
    }
    if (query.includes('revival updates') || query.includes('റിവൈവൽ അപ്ഡേറ്റ്') || query.includes('where to find revival updates')) {
      return `Home Page, Official Announcements Section, News Updates Section എന്നിവ പരിശോധിക്കുക.`;
    }
    if (query.includes('member financial information registry എന്താണ്') || query.includes('ഫിനാൻഷ്യൽ ഇൻഫർമേഷൻ രജിസ്ട്രി എന്താണ്') || query.includes('what is member financial information registry')) {
      return `Highrich Community അംഗങ്ങളുടെ സാമ്പത്തിക വിവരങ്ങൾ ശേഖരിക്കുന്ന സംവിധാനമാണ്.`;
    }
    if (query.includes('എന്തിനാണ് ഈ വിവരങ്ങൾ ശേഖരിക്കുന്നത്') || query.includes('എന്തിനാണ് സാമ്പത്തിക വിവരങ്ങൾ') || query.includes('why collect financial data')) {
      return `ഭാവിയിൽ സാഹചര്യം അനുകൂലമായാൽ അംഗങ്ങളുടെ സാമ്പത്തിക സ്ഥിതിയും ആവശ്യകതകളും മുൻഗണനകളും മനസ്സിലാക്കുന്നതിനായാണ് വിവരശേഖരണം.`;
    }
    if (query.includes('financial information registry എവിടെ') || query.includes('രജിസ്ട്രി എവിടെയാണ്') || query.includes('where is financial registry')) {
      return `Website-ൽ "Member Financial Information Registry" എന്ന Menu-ൽ ലഭ്യമാണ്.`;
    }
    if (query.includes('എന്തൊക്കെ വിവരങ്ങൾ നൽകാം') || query.includes('ഫിനാൻഷ്യൽ വിവരങ്ങൾ എന്തൊക്കെ നൽകണം') || query.includes('what info can be submitted in financial registry')) {
      return `നിങ്ങളുടെ Highrich സംബന്ധമായ സാമ്പത്തിക വിവരങ്ങളും കുടുംബത്തിലെ പരമാവധി മൂന്ന് അംഗങ്ങളുടെ വിവരങ്ങളും ചേർക്കാം.`;
    }
    if (query.includes('വിവരങ്ങൾ നൽകുന്നത് നിർബന്ധമാണോ') || query.includes('നിർബന്ധമാണോ') || query.includes('is it compulsory to submit financial data')) {
      return `നിർബന്ധമല്ല. എന്നാൽ കൃത്യമായ ഡാറ്റ ലഭിക്കുന്നത് ഭാവി ആസൂത്രണങ്ങൾക്ക് സഹায়കരമാണ്.`;
    }
    if (query.includes('പണം ലഭിക്കുമോ') || query.includes('സബ്മിറ്റ് ചെയ്താൽ പണം തിരികെ കിട്ടുമോ') || query.includes('will i get money back') || query.includes('will i receive payments after registry')) {
      return `ഇല്ല. ഇത് വിവരശേഖരണ സംവിധാനം മാത്രമാണ്. ഇത് ഒരു Payment Guarantee അല്ല.`;
    }
    if (query.includes('is hcrs a company') || query.includes('hcrs a company')) {
      return `No. HCRS is a registered society and not a company.`;
    }
    if (query.includes('hcrs ഒരു കമ്പനിയാണോ') || query.includes('കമ്പനിയാണോ')) {
      return `അല്ല. HCRS ഒരു രജിസ്റ്റർ ചെയ്ത സൊസൈറ്റിയാണ്.`;
    }
    if (query.includes('what are the benefits of membership') || query.includes('benefits of membership') || query.includes('membership benefits')) {
      return `Members receive access to community programs, welfare initiatives, digital ID cards, and society activities.`;
    }
    if (query.includes('മെമ്പർഷിപ്പിന്റെ ഗുണങ്ങൾ') || query.includes('ഗുണങ്ങൾ എന്തൊക്കെയാണ്') || query.includes('ഗുണങ്ങൾ എന്ത്')) {
      return `വെൽഫെയർ പദ്ധതികൾ, കമ്മューണിറ്റി പ്രവർത്തനങ്ങൾ, ഡിജിറ്റൽ ഐഡി കാർഡ്, സൊസൈറ്റി പ്രവർത്തനങ്ങളിൽ പങ്കാളിത്തം എന്നിവ ലഭിക്കും.`;
    }
    if (query.includes('can i change my mobile number') || query.includes('change my mobile number') || query.includes('change mobile number')) {
      return `No. Mobile numbers can only be changed by authorized administrators.`;
    }
    if (query.includes('മൊബൈൽ നമ്പർ എനിക്ക് മാറ്റാനാകുമോ') || query.includes('മൊബൈൽ നമ്പർ മാറ്റാൻ') || query.includes('ഫോൺ നമ്പർ മാറ്റാൻ')) {
      return `ഇല്ല. അധികൃത അഡ്മിന്മാർക്ക് മാത്രമേ മാറ്റാൻ കഴിയൂ.`;
    }
    if (query.includes('can i change my name') || query.includes('change my name') || query.includes('can i change name')) {
      return `No. Name changes require administrator verification.`;
    }
    if (query.includes('പേര് മാറ്റാനാകുമോ') || query.includes('പേര് മാറ്റാൻ') || query.includes('പേര് തിരുത്താൻ')) {
      return `ഇല്ല. അഡ്മിൻ പരിശോധനയ്ക്ക് ശേഷമേ മാറ്റം സാധ്യമാകൂ.`;
    }
    if (query.includes('member financial information registry') || query.includes('financial information registry') || query.includes('information registry')) {
      return `It is a data collection system used to understand member financial situations and welfare requirements.`;
    }
    if (query.includes('is it a claim settlement system') || query.includes('is it a claim settlement') || query.includes('claim settlement system')) {
      return `No. It is only an information registry and not a payment settlement platform.`;
    }
    if (query.includes('ഇത് ക്ലെയം സെറ്റിൽമെന്റ് സംവിധാനമാണോ') || query.includes('ഇത് ക്ലെയിം സെറ്റിൽമെന്റ്') || query.includes('ക്ലെയിം സെറ്റിൽമെന്റ് സംവിധാനം')) {
      return `അല്ല. ഇത് വിവര ശേഖരണ സംവിധാനം മാത്രമാണ്.`;
    }
    if (query.includes('does hcrs guarantee any payment') || query.includes('guarantee any payment') || query.includes('guarantee payment')) {
      return `No. HCRS does not guarantee any payment or financial recovery.`;
    }
    if (query.includes('hcrs പണം ഉറപ്പ് നൽകുമോ') || query.includes('പണം ഉറപ്പ് നൽകുമോ') || query.includes('തുക ഉറപ്പ് നൽകുമോ')) {
      return `ഇല്ല. HCRS ഒരു സാമ്പത്തിക തിരിച്ചടവും ഉറപ്പ് നൽകുന്നില്ല.`;
    }
    if (query.includes('role of district committees') || query.includes('district committee role') || query.includes('district committees')) {
      return `District Committees coordinate membership, welfare activities, and local programs.`;
    }
    if (query.includes('ജില്ലാ കമ്മിറ്റിയുടെ ചുമതല') || query.includes('ജില്ലാ കമ്മിറ്റി')) {
      return `മെമ്പർഷിപ്പ്, വെൽഫെയർ പ്രവർത്തനങ്ങൾ, പ്രാദേശിക പരിപാടികൾ എന്നിവ ഏകോപിപ്പിക്കുന്നു.`;
    }
    if (query.includes('role of mandalam committees') || query.includes('mandalam committee role') || query.includes('mandalam committees')) {
      return `Mandalam Committees coordinate local members and field-level activities.`;
    }
    if (query.includes('മണ്ഡലം കമ്മിറ്റിയുടെ ചുമതല') || query.includes('മണ്ഡലം കമ്മിറ്റി')) {
      return `പ്രാദേശിക അംഗങ്ങളെയും പ്രവർത്തനങ്ങളെയും ഏകോപിപ്പിക്കുന്നു.`;
    }
    if (query.includes('does hcrs provide legal advice') || query.includes('provide legal advice') || query.includes('legal advice')) {
      return `No. Please consult a qualified advocate for legal advice.`;
    }
    if (query.includes('hcrs നിയമോപദേശം നൽകുമോ') || query.includes('നിയമോപദേശം')) {
      return `ഇല്ല. നിയമോപദേശത്തിന് യോഗ്യനായ അഭിഭാഷകനെ സമീപിക്കുക.`;
    }
    if (query.includes('how can i contact hcrs') || query.includes('how to contact hcrs') || query.includes('contact hcrs')) {
      return `Contact your District Committee or use the official website contact page.`;
    }
    if (query.includes('hcrs-നെ എങ്ങനെ ബന്ധപ്പെടാം') || query.includes('എങ്ങനെ ബന്ധപ്പെടാം')) {
      return `ജില്ലാ കമ്മിറ്റിയെയോ ഔദ്യോഗിക വെബ്സൈറ്റിലെ Contact Page-യെയോ ഉപയോഗിക്കുക.`;
    }
    if (query.includes('does hcrs conduct welfare activities') || query.includes('conduct welfare activities') || query.includes('welfare activities')) {
      return `Yes. HCRS supports welfare, education, medical assistance, and community service initiatives.`;
    }
    if (query.includes('hcrs വെൽഫെയർ പ്രവർത്തനങ്ങൾ നടത്തുന്നുണ്ടോ') || query.includes('വെൽഫെയർ പ്രവർത്തനം')) {
      return `ഉണ്ട്. വിദ്യാഭ്യാസം, ആരോഗ്യസഹായം, വെൽഫെയർ പ്രവർത്തനങ്ങൾ എന്നിവ നടത്തുന്നു.`;
    }
    if (query.includes('what is the mission of hcrs') || query.includes('mission of hcrs') || query.includes('mission')) {
      return `To support affected families, strengthen the community, and promote lawful community development.`;
    }
    if (query.includes('hcrs-ന്റെ ദൗത്യം') || query.includes('ദൗത്യം എന്താണ്')) {
      return `ബാധിത കുടുംബങ്ങളെ പിന്തുണയ്ക്കുകയും സമൂഹത്തെ ശക്തിപ്പെടുത്തുകയും ചെയ്യുക.`;
    }
    if (query.includes('എനിക്ക് എന്ത് ചെയ്യണം') || query.includes('എനിക്ക് എന്ത് ചെയ്യണം?') || query.includes('എന്ത് ചെയ്യണം') || query.includes('what should i do')) {
      return `നിങ്ങളുടെ ആവശ്യത്തിനനുസരിച്ച് താഴെ പറയുന്ന സ്റ്റെപ്പുകൾ പിന്തുടരുക:\n\n1. **മെമ്പർഷിപ്പ് എടുക്കുന്നതിന് (Registration):** വെബ്‌സൈറ്റിലെ 'Register' ഓപ്ഷൻ തുറന്ന് നിങ്ങളുടെ പേര്, ജില്ല, മണ്ഡലം എന്നിവ നൽകി രജിസ്റ്റർ ചെയ്യുക. അപേക്ഷ സമർപ്പിച്ചതിന് ശേഷം അഡ്മിൻ അപ്രൂവ് ചെയ്യുന്നതോടെ നിങ്ങളുടെ ലോഗിൻ പിൻ ലഭിക്കും.\n2. **മെമ്പർഷിപ്പ് പുതുക്കുന്നതിന് (Renewal):** വെബ്‌സൈറ്റിൽ 'Renewal' മെനു സന്ദർശിച്ച് മുൻപ് ചെയ്ത അതേ രീതിയിൽ പെയ്മെന്റ് പ്രൂഫ് സമർപ്പിച്ചു പുതുക്കാം.\n3. **ലോഗിൻ ചെയ്യുന്നതിന് (Login):** ലോഗിൻ പേജിൽ നിങ്ങളുടെ മൊബൈൽ നമ്പറും പാസ്‌വേഡും (123456) നൽകി ലോഗിൻ ചെയ്യുക. അപ്രൂവലിന് ശേഷം നിങ്ങൾക്ക് ലോഗിൻ ചെയ്യാം.\n4. **അപ്ഡേറ്റുകൾ അറിയാൻ (Case/News updates):** കേസുമായി ബന്ധപ്പെട്ട വിവരങ്ങൾക്ക് ഹോം പേജ് നേരിട്ട് സന്ദർശിക്കുക.\n5. **സാമ്പത്തിക വിവരങ്ങൾ നൽകാൻ (Financial registry):** വെബ്‌സൈറ്റിൽ കാണുന്ന 'Member Financial Information Registry' എന്ന മെനു മുഖേന വിവരങ്ങൾ നൽകാം.`;
    }

    if (isMatch(['ലക്ഷ്യം', 'ലക്ഷ്യങ്ങൾ', 'ഉദ്ദേശം', 'ഉദ്ദേശങ്ങൾ', 'purpose', 'aim', 'objectives', 'society', 'എന്താണ്', 'എന്താ'])) {
      return `🎯 **HCRS സൊസൈറ്റിയുടെ ലക്ഷ്യങ്ങളും ഉദ്ദേശങ്ങളും:**\n\nഹൈക്കുറിച്ച് കമ്മ്യൂണിറ്റിക്ക് ശാക്തീകരണവും കൈത്താങ്ങും നൽകുക, മുൻകാലങ്ങളിലുള്ള കമ്മ്യൂണിറ്റി മെമ്പർമാരുടെ ഡിജിറ്റൽ ക്ലൈമുകൾ ചിട്ടയോടെ പരിഹരിക്കാനുള്ള സുതാര്യമായ ഒരു വേദി ഒരുക്കുക എന്നിവയാണ് **ഹൈക്കുറിച്ച് കമ്മ്യൂണിറ്റി റിവൈവൽ സൊസൈറ്റി (HCRS)** യുടെ പ്രധാന ലക്ഷ്യം.\n\n* **കൂപ്പൺ റീഡീമിംഗ് സപ്പോർട്ട്:** മുൻകാലങ്ങളിൽ കുടുങ്ങിക്കിടക്കുന്ന മെമ്പർമാരുടെ റെഡീം കൂപ്പണുകൾ, OTT അഡ്വാൻസുകൾ, മറ്റു കോൺസൈൻമെന്റ് തുകകൾ എന്നിവ കൃത്യമായി ഇൻവെന്ററി ചെയ്യുകയും റിവൈവൽ ആനുകൂല്യങ്ങളും പെയ്‌മെന്റുകളും ലഭ്യമാക്കുകയുമാണ് ഇതിന്റെ പ്രധാന ഉദ്ദേശം.`;
    }
    
    if (isMatch(['സർവീസ്', 'സർവീസുകൾ', 'സേവനം', 'സേവനങ്ങൾ', 'services', 'service', 'സൌകര്യം', 'സൗകര്യം', 'സൗകര്യങ്ങൾ'])) {
      return `💼 **HCRS-ലൂടെ ലഭിക്കുന്ന പ്രധാന സേവനങ്ങൾ (Key Services):**\n\n1. **ഡിപെൻഡന്റ് ക്ലൈം ഫെസിലിറ്റി (Dependent Claims):** ഒരൊറ്റ ലോഗിൻ സെഷനിലൂടെ തന്റെ കുടുംബാംഗങ്ങളായ പരമാവധി 3 ഡിപെൻഡന്റ് മെമ്പർമാരെക്കൂടി (അച്ഛൻ, അമ്മ, ഭാര്യ, മക്കൾ) ആഡ് ചെയ്യാനും ഒന്നിച്ച് വളരെ വേഗത്തിൽ ക്ലൈം ഇൻഫർമേഷൻ സമർപ്പിക്കാനുമുള്ള സൗകര്യം.\n2. **ഡിജിറ്റൽ മെമ്പർഷിപ്പ് ഐഡന്റിറ്റി കാർഡ്:** ഫുൾ കളർ ഡിസൈനിൽ ഉള്ള നിങ്ങളുടെ ഡിജിറ്റൽ മെമ്പർഷിപ്പ് ഐഡന്റിറ്റി കാർഡ് ലൈവായി കാണാനും നിങ്ങളുടെ മൊബൈലിലേക്ക് ഡൗൺലോഡ് ചെയ്യാനും പ്രിന്റ് ചെയ്യാനുമുള്ള ലോഗിൻ സൗകര്യം.\n3. **ഓൺലൈൻ പ്രൊഫൈൽ തിരുത്തൽ (Support Tickets):** അക്കൗണ്ടിലുള്ള നിങ്ങളുടെ വിവരങ്ങൾ തെറ്റിയാൽ നേരിട്ട് ജില്ലാ മാനേജർക്കോ അഡ്മിനോ ടിക്കറ്റ് സമർപ്പിക്കാനും അതിന്റെ മുൻഗണന ഓൺലൈനായി ട്രാക്ക് ചെയ്യാനുമുള്ള സംവിധാനം.\n4. **റിന്യൂവൽ പെയ്മെന്റ് സിസ്റ്റം:** കാലഹരണപ്പെടുന്ന മെമ്പർഷിപ്പുകൾ ലളിതമായി റിന്യൂ ചെയ്യാനും തത്സമയ പെയ്മെന്റ് പ്രൂഫ് അപ്‌ലോഡ് ചെയ്യാനുമുള്ള സൗകര്യം.`;
    }

    if (query.includes('മെമ്പർഷിപ്പ് പുതുക്കൽ') || query.includes('മെമ്പർഷിപ്പ് renewal') || query.includes('membership renewal എങ്ങനെ') || query.includes('how to do membership renewal')) {
      return `🔄 **മെമ്പർഷിപ്പ് പുതുക്കൽ (Membership Renewal):**\n\nHCRS മെമ്പർഷിപ്പ് കാലാവധി കഴിഞ്ഞ ആളുകൾക്ക് അവരുടെ അക്കൗണ്ട് ഹോംപേജിലുള്ള **'അംഗത്വം പുതുക്കുക ₹100' (Renew Now)** ഓപ്ഷൻ സന്ദർശിച്ചു വളരെ സിമ്പിളായി ₹100 അക്കൗണ്ടിലേക്ക് ട്രാൻസാക്ഷൻ നടത്തിയ രസീത് സമർപ്പിച്ച് ഐഡി പുതുക്കാവുന്നതാണ്. ഇത് അഡ്മിൻ പരിശോധിച്ച് അപ്രൂവ് ചെയ്യുന്നതോടെ ആക്റ്റീവ് ആകും.`;
    }

    if (member) {
      return `പ്രിയ ${member.name}, താങ്കളുടെ ചോദ്യത്തിന് മറുപടി തരാൻ ഞാൻ ശ്രമിക്കുകയാണ്. സൊസൈറ്റിയുടെ ലൈവ് വിവരങ്ങൾക്ക് താഴെ പറയുന്ന വിഭാഗങ്ങളിൽ അന്വേഷിച്ചാൽ എനിക്ക് വളരെ പെട്ടെന്ന് ഡീറ്റെയിൽസ് തരാൻ കഴിയും:

1. 📅 **കോടതി കേസ് വിവരങ്ങൾ അറിയാൻ:** 'കേസ്' അല്ലെങ്കിൽ 'കോടതി' എന്ന് ചോദിക്കുക.
2. 📋 **സാമ്പത്തിക വിവര ശേഖരണ ഫോമിനെക്കുറിച്ച് കൂടുതൽ അറിയാൻ:** 'ക്ലൈം' അല്ലെങ്കിൽ 'രജിസ്ട്രി' എന്ന് ചോദിക്കുക.
3. 💳 **ഡിജിറ്റൽ ഐഡി കാർഡ് എങ്ങനെ ഡൗൺലോഡ് ചെയ്യാം എന്നറിയാൻ:** 'കാർഡ്' എന്ന് ചോദിക്കുക.
4. ✏️ **നിങ്ങളുടെ വിവരങ്ങളിൽ എന്തെങ്കിലും തിരുത്തൽ വരുത്താൻ:** 'തിരുത്താൻ' അല്ലെങ്കിൽ 'പ്രൊഫൈൽ' എന്ന് ചോദിക്കുക.
5. 🔄 **മെമ്പർഷിപ്പ് പുതുക്കാൻ (Renewal):** 'പുതുക്കാൻ' എന്ന് ചോദിക്കുക.
6. 📞 **സൊസൈറ്റി വിലാസവും ഹെഡ് ഓഫീസും:** 'ബന്ധപ്പെടാൻ' എന്ന് ചോദിക്കുക.

മറ്റു പൊതുവായ വിവരങ്ങൾ തത്സമയം ഈ ചാറ്റ് ഹെൽപ്പിലൂടെ ചോദിച്ചറിയാവുന്നതാണ് സുഹൃത്തേ! 😊`;
    }

    return `ഹലോ സുഹൃത്തേ, വഴികാട്ടി AI തത്സമയ ചോദ്യോത്തരങ്ങൾ തയ്യാറാക്കുകയാണ്. 🤝\n\nസംഘടനയെക്കുറിച്ചുള്ള പൊതുവായ സംശയങ്ങൾ (മെമ്പർഷിപ്പ് ന്യൂ രജിസ്ട്രേഷൻ രീതികൾ, സൊസൈറ്റിയുടെ ഉദ്ദേശങ്ങൾ, സപ്പോർട്ട് ക്ലൈം കാര്യങ്ങൾ, കേസ് തീയതി) താഴെയുള്ള ഓപ്ഷനുകൾ ക്ലിക്ക് വഴിയോ അല്ലെങ്കിൽ നേരിട്ടോ ചോദിച്ചറിയാം. 😊`;
  }

  /*
  --- OFFICIAL Q&A FAQ DATABASE (YOU MUST ALWAYS ADHERE TO THESE ANSWERS EXACTLY) ---

  Q: What is HCRS?
  A: Highrich Community Revival Society (HCRS) is a registered non-profit society established in 2025 to support the Highrich community through welfare, community development, and revival initiatives.

  Q: HCRS എന്താണ്?
  A: ഹൈക്കുറിച്ച് കമ്മ്യൂണിറ്റി റിവൈവൽ സൊസൈറ്റി (HCRS) 2025-ൽ രൂപീകരിക്കപ്പെട്ട ഒരു രജിസ്റ്റർ ചെയ്ത ലാഭേച്ഛയില്ലാത്ത സൊസൈറ്റിയാണ്. (ഹൈക്കുറിച്ച് കമ്മ്യൂണിറ്റി റിവൈവൽ സൊസൈറ്റി (HCRS) 2025-ൽ രൂപീകരിക്കപ്പെട്ട ഒരു രജിസ്റ്റർ ചെയ്ത ലാഭേച്ഛയില്ലാത്ത സൊസൈറ്റിയാണ്.)

  Q: Is HCRS a company?
  A: No. HCRS is a registered society and not a company.

  Q: HCRS ഒരു കമ്പനിയാണോ?
  A: അല്ല. HCRS ഒരു രജിസ്റ്റർ ചെയ്ത സൊസൈറ്റിയാണ്.

  Q: How can I become a member?
  A: You can apply through the official HCRS website membership registration page.

  Q: എങ്ങനെ മെമ്പർ ആകാം?
  A: ഔദ്യോഗിക HCRS വെബ്സൈറ്റിലെ Membership Registration വഴി അപേക്ഷിക്കാം.

  Q: HCRS മെമ്പർഷിപ്പ് ഫീസ് എത്രയാണ്?
  A: HCRS മെമ്പർഷിപ്പ് രജിസ്ട്രേഷൻ ഫീസ് ₹200 ആണ്.

  Q: മെമ്പർഷിപ്പ് എടുക്കാൻ ആർക്കെല്ലാം can join?
  A: ഹൈക്കുറിച്ച് കമ്മ്യൂണിറ്റിയുമായി ബന്ധപ്പെട്ട ആർക്കും HCRS മെമ്പർഷിപ്പ് എടുക്കാവുന്നതാണ്.

  Q: മെമ്പർഷിപ്പ് എത്ര കാലത്തേക്ക് സാധുവാണ്?
  A: മെമ്പർഷിപ്പ് ഒരു വർഷത്തേക്കാണ്. ഓരോ വർഷവും ₹100 നൽകി Renewal ചെയ്യേണ്ടതാണ്.

  Q: മെമ്പർഷിപ്പ് എടുക്കാൻ എന്തൊക്കെ വിവരങ്ങൾ വേണം?
  A: പേര്, മൊബൈൽ നമ്പർ, ജില്ല, മണ്ഡലം എന്നീ വിവരങ്ങൾ മാത്രം നൽകുക.

  Q: മെമ്പർഷിപ്പ് ഫീസ് എങ്ങനെ അടയ്ക്കാം?
  A: Registration Form-ൽ കാണുന്ന QR Code Scan ചെയ്ത് Payment നടത്തുക.

  Q: Payment ചെയ്ത ശേഷം എന്താണ് ചെയ്യേണ്ടത്?
  A: Transaction ID, Date, Time എന്നിവ ഫോമിൽ നൽകി Submit ചെയ്യണം.

  Q: Submit ചെയ്താൽ ഉടനെ മെമ്പർഷിപ്പ് ലഭിക്കുമോ?
  A: ഇല്ല. ആദ്യം അഡ്മിൻ പരിശോധനയും Approval-വും പൂർത്തിയാകണം.

  Q: Approval കഴിഞ്ഞാൽ എങ്ങനെ Login ചെയ്യാം?
  A: നിങ്ങളുടെ Mobile Number Username ആയി ഉപയോഗിക്കുക.
  Password:
  123456

  Q: Approval കഴിഞ്ഞാൽ എങ്ങനെ ID Card കാണാം?
  A: Mobile Number, Password ഉപയോഗിച്ച് Login ചെയ്താൽ Digital Membership Card കാണാം.

  Q: Membership Renewal എങ്ങനെ ചെയ്യാം?
  A: Website-ൽ Renewal എന്ന Menu-ൽ Click ചെയ്ത് Registration സമയത്ത് ചെയ്ത അതേ നടപടിക്രമം പിന്തുടരുക.

  Q: HCRS Website Address എന്താണ്?
  A: Website സന്ദർശിക്കാൻ:
  www.hcrs.in

  Q: Website-ൽ എങ്ങനെ Login ചെയ്യാം?
  A: Website-ൽ Login Page തുറന്ന് Mobile Number, Password നൽകി Login ചെയ്യുക.

  Q: കേസുമായി ബന്ധപ്പെട്ട ഏറ്റവും പുതിയ വിവരങ്ങൾ എവിടെ കാണാം?
  A: Website Home Page-ൽ പ്രധാനപ്പെട്ട Updates പ്രസിദ്ധീകരിക്കുന്നതാണ്.

  Q: Revival Updates എവിടെ ലഭിക്കും?
  A: Home Page, Official Announcements Section, News Updates Section എന്നിവ പരിശോധിക്കുക.

  Q: Member Financial Information Registry എന്താണ്?
  A: Highrich Community അംഗങ്ങളുടെ സാമ്പത്തിക വിവരങ്ങൾ ശേഖരിക്കുന്ന സംവിധാനമാണ്.

  Q: എന്തിനാണ് ഈ വിവരങ്ങൾ ശേഖരിക്കുന്നത്?
  A: ഭാവിയിൽ സാഹചര്യം അനുകൂലമായാൽ അംഗങ്ങളുടെ സാമ്പത്തിക സ്ഥിതിയും ആവശ്യകതകളും മുൻഗണനകളും മനസ്സിലാക്കുന്നതിനായാണ് വിവരശേഖരണം.

  Q: Financial Information Registry എവിടെയാണ്?
  A: Website-ൽ "Member Financial Information Registry" എന്ന Menu-ൽ ലഭ്യമാണ്.

  Q: എന്തൊക്കെ വിവരങ്ങൾ നൽകാം?
  A: നിങ്ങളുടെ Highrich സംബന്ധമായ സാമ്പത്തിക വിവരങ്ങളും കുടുംബത്തിലെ പരമാവധി മൂന്ന് അംഗങ്ങളുടെ വിവരങ്ങളും ചേർക്കാം.

  Q: ഈ വിവരങ്ങൾ നൽകുന്നത് നിർബന്ധമാണോ?
  A: നിർബന്ധമല്ല. എന്നാൽ കൃത്യമായ ഡാറ്റ ലഭിക്കുന്നത് ഭാവി ആസൂത്രണങ്ങൾക്ക് സഹായകരമാണ്.

  Q: Financial Registry Submission ചെയ്താൽ പണം ലഭിക്കുമോ?
  A: ഇല്ല. ഇത് വിവരശേഖരണ സംവിധാനം മാത്രമാണ്. ഇത് ഒരു Payment Guarantee അല്ല.

  Q: What are the benefits of membership?
  A: Members receive access to community programs, welfare initiatives, digital ID cards, and society activities.

  Q: മെമ്പർഷിപ്പിന്റെ ഗുണങ്ങൾ എന്തൊക്കെയാണ്?
  A: വെൽഫെയർ പദ്ധതികൾ, കമ്മ്യൂണിറ്റി പ്രവർത്തനങ്ങൾ, ഡിജിറ്റൽ ഐഡി കാർഡ്, സൊസൈറ്റി പ്രവർത്തനങ്ങളിൽ പങ്കാളിത്തം എന്നിവ ലഭിക്കും.

  Q: Can I change my mobile number?
  A: No. Mobile numbers can only be changed by authorized administrators.

  Q: മൊബൈൽ നമ്പർ എനിക്ക് മാറ്റാനാകുമോ?
  A: ഇല്ല. അധികൃത അഡ്മിന്മാർക്ക് മാത്രമേ മാറ്റാൻ കഴിയൂ.

  Q: Can I change my name?
  A: No. Name changes require administrator verification.

  Q: പേര് മാറ്റാനാകുമോ?
  A: ഇല്ല. അഡ്മിൻ പരിശോധനയ്ക്ക് ശേഷമേ മാറ്റം സാധ്യമാകൂ.

  Q: What is the Role of District Committees?
  A: District Committees coordinate membership, welfare activities, and local programs.

  Q: ജില്ലാ കമ്മിറ്റിയുടെ ചുമതല എന്താണ്?
  A: മെമ്പർഷിപ്പ്, വെൽഫെയർ പ്രവർത്തനങ്ങൾ, പ്രാദേശിക പരിപാടികൾ എന്നിവ ഏകോപിപ്പിക്കുന്നു.

  Q: What is the Role of Mandalam Committees?
  A: Mandalam Committees coordinate local members and field-level activities.

  Q: मണ്ഡലം കമ്മിറ്റിയുടെ ചുമതല എന്താണ്?
  A: പ്രാദേശിക അംഗങ്ങളെയും പ്രവർത്തനങ്ങളെയും ഏകോപിപ്പിക്കുന്നു.

  Q: Does HCRS provide legal advice?
  A: No. Please consult a qualified advocate for legal advice.

  Q: HCRS നിയമോപദേശം നൽകുമോ?
  A: ഇല്ല. നിയമോപദേശത്തിന് യോഗ്യനായ അഭിഭാഷകനെ സമീപിക്കുക.

  Q: How can I contact HCRS?
  A: Contact your District Committee or use the official website contact page.

  Q: HCRS-നെ എങ്ങനെ ബന്ധപ്പെടാം?
  A: ജില്ലാ കമ്മിറ്റിയെയോ ഔദ്യോഗിക വെബ്സൈറ്റിലെ Contact Page-യെയോ ഉപയോഗിക്കുക.

  Q: Does HCRS conduct welfare activities?
  A: Yes. HCRS supports welfare, education, medical assistance, and community service initiatives.

  Q: HCRS വെൽഫെയർ പ്രവർത്തനങ്ങൾ നടത്തുന്നുണ്ടോ?
  A: ഉണ്ട്. വിദ്യാഭ്യാസം, ആരോഗ്യസഹായം, വെൽഫെയർ പ്രവർത്തനങ്ങൾ എന്നിവ നടത്തുന്നു.

  Q: What is the mission of HCRS?
  A: To support affected families, strengthen the community, and promote lawful community development.

  Q: HCRS-ന്റെ ദൗത്യം എന്താണ്?
  A: ബാധിത കുടുംബങ്ങളെ പിന്തുണയ്ക്കുകയും സമൂഹത്തെ ശക്തിപ്പെടുത്തുകയും ചെയ്യുക.

  Q: What should I do? / എനിക്ക് എന്ത് ചെയ്യണം?
  A: Guide them step-by-step based on their issue:
  - If the user is confused about membership: Guide them through Registration (Register button -> details -> submit -> receive PIN).
  - If the user is confused about renewal: Guide them through Renewal (Renewal menu -> pay ₹100 -> upload receipt).
  - If the user is confused about login: Guide them through Login (User Mobile Number + PW: 123456).
  - If the user asks about updates: Direct them to website Home Page.
  - If the user asks about financial data: Direct them to Member Financial Information Registry page. Always provide clear step-by-step instructions.
  */

  // API endpoint for chatbot communication
  app.post("/api/chat", async (req, res) => {
    const { message, history, verifiedMember, orgSettings } = req.body;
    try {
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      let verifiedCtx = "";
      if (verifiedMember) {
        verifiedCtx = `
[അതിപ്രധാനമായ കറന്റ് സെഷൻ വിവരങ്ങൾ (Verified Member Session Profile):
ഈ മെമ്പർ ഇപ്പോൾത്തന്നെ വിജയകരമായി ലോഗിൻ ചെയ്യപ്പെടുകയും ഫോൺ നമ്പർ വെരിഫൈ ചെയ്യപ്പെടുകയും ചെയ്തിട്ടുണ്ട്! അതിനാൽ ഇവരോട് വീണ്ടും ദയവായി മൊബൈൽ നമ്പർ ചോദിക്കരുത്! 
പേര് (Name): ${verifiedMember.name || 'N/A'}
മെമ്പർഷിപ്പ് നമ്പർ (ID): ${verifiedMember.membershipId || 'അംഗീകാരം കാത്തിരിക്കുന്നു (Pending Verification)'}
മൊബൈൽ നമ്പർ (Mobile): ${verifiedMember.mobile || verifiedMember.phone || 'N/A'}
സ്റ്റാറ്റസ് (Status): ${verifiedMember.status || 'Active'}
ജില്ല (District): ${verifiedMember.district || 'N/A'}
മണ്ഡലം (Mandalam/Assembly): ${verifiedMember.assembly || verifiedMember.constituency || 'N/A'}
വിലാസം (Address): ${verifiedMember.address || 'N/A'}
മെയിൽ (Email): ${verifiedMember.email || 'N/A'}
കാലാവധി എക്സ്പെയറി തീയതി (Expiry/Renewal Date): ${verifiedMember.expiryDate || verifiedMember.renewalDate || '31-Dec-2026'}
ഫോട്ടോ സ്റ്റാറ്റസ്: ${verifiedMember.photoUrl ? 'ലഭ്യമാണ് (Uploaded - Active photo)' : 'ലഭ്യമല്ല (Missing)'}
റസീപ്റ്റ് സ്റ്റാറ്റസ്: ${verifiedMember.paymentProofUrl ? 'ലഭ്യമാണ് (Uploaded)' : 'ലഭ്യമല്ല (Missing - Payment proof verified)'}

മെമ്പർക്ക് ഇവരുടെ സ്വന്തം അക്കൗണ്ടിനെക്കുറിച്ചോ സ്റ്റാറ്റസിനെക്കുറിച്ചോ അറിയാൻ ഈ വെരിഫൈഡ് വിവരങ്ങൾ വെച്ച് കൃത്യമായി പറഞ്ഞു കൊടുക്കുക. വീണ്ടും ഫോൺ നമ്പർ ഒരിക്കലും ചോദിക്കരുത്.];
`;
      } else {
        verifiedCtx = `
[യൂസർ പ്രൊഫൈൽ വെരിഫൈ ചെയ്തിട്ടില്ല. അവരുടെ വ്യക്തിഗത അക്കൗണ്ട് വിവരങ്ങളോ കാർഡോ ലോഡ് ചെയ്യാൻ താല്പര്യപ്പെടുന്നെങ്കിൽ ആദ്യം അവരുടെ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് മെയിൻ അക്കൗണ്ടിൽ ലോഗിൻ ചെയ്യാൻ പറയുക. അല്ലെങ്കിൽ പൊതുവായ വിവരങ്ങൾക്കോ സംശയങ്ങൾക്കോ ആണെങ്കിൽ ഇത്തരത്തിൽ വിവരങ്ങൾ ചോദിക്കാതെ നേരിട്ട് ആ ചോദ്യങ്ങൾക്ക് മറുപടി കൊടുക്കാം.];
`;
      }

      let currentUpdatesCtx = "";
      if (orgSettings) {
        currentUpdatesCtx = `
[അതിപ്രധാനമായ സൊസൈറ്റി ഒഫീഷ്യൽ അപ്ഡേഷനുകളും കോടതി കേസ് വിവരങ്ങളും (Society Live Updates & Court Case Details):
ഈ വിവരങ്ങൾ വെബ്സൈറ്റിന്റെ ഹോംപേജിൽ സൊസൈറ്റി ഒഫീഷ്യലായി നൽകിയിട്ടുള്ളതാണ്. ഈ കാര്യങ്ങൾ മെമ്പർമാർ ചോദിക്കുമ്പോൾ കൃത്യമായും നേരിട്ടും താഴെ കാണുന്ന ഡാറ്റ അടിസ്ഥാനമാക്കി മറുപടി നൽകണം:
- അറിയിപ്പ് അല്ലെങ്കിൽ അപ്ഡേഷൻ (Announcement/Latest Update): ${orgSettings.announcementText || "സംഘടനയിൽ നിന്നുള്ള പുതിയ അറിയിപ്പുകൾ ഒന്നും ലഭ്യമല്ല"}
- അടുത്ത കേസ് തീയതി (Next Case Date/Court Hearing Date): ${orgSettings.announcementCaseDate || "ലഭ്യമല്ല/നിശ്ചയിച്ചിട്ടില്ല"}
- കേസ് നമ്പർ (Case No): ${orgSettings.announcementCaseNo || "N/A"}
- കേസ് പേര് (Case Name): ${orgSettings.announcementCaseName || "N/A"}
- കോടതി (Court): ${orgSettings.announcementCourt || "N/A"}
- വക്കാലത്ത് അഡ്വക്കേറ്റ് (Advocate): ${orgSettings.announcementAdvocate || "N/A"}
- ജഡ്ജ് ബെഞ്ച് (Judge Bench): ${orgSettings.announcementJudgeBench || "N/A"}
- അറിയിപ്പ് ശീർഷകം (Title): ${orgSettings.announcementTitle || "N/A"}
];
`;
      } else {
        currentUpdatesCtx = `
[സൊസൈറ്റി ഒഫീഷ്യൽ അപ്ഡേഷനുകൾ:
- അടുത്ത കേസ് തീയതി: ലഭ്യമായിട്ടില്ല
- അറിയിപ്പുകൾ: ലഭ്യമല്ല
]`;
      }

      const systemInstruction = `
You are the official AI Assistant of the Highrich Community Revival Society (HCRS).
Your role is to assist visitors, members, office bearers, and the public by providing accurate information about HCRS, membership, committees, welfare activities, legal support initiatives, petitions, claims, revival efforts, and society services.

LANGUAGE RULES:
1. If the user asks a question in Malayalam, reply COMPLETELY in Malayalam.
2. If the user asks in English, reply COMPLETELY in English.
3. Never mix languages unless the user mixes them.
4. Be exceptionally polite, professional, and helpful.
5. If information is unavailable, politely direct the user to contact HCRS officials.

--- IMPORTANT HCRS DIRECTIVES ---

ABOUT HCRS:
- Name: Highrich Community Revival Society (HCRS)
- Registration Number: TSR/TC/93/2025
- Location: Thrissur, Kerala, India
- Nature: Legally registered non-profit society.
- Purpose: HCRS was formed in 2025 to support members of the Highrich community and to work for their welfare, legal support, livelihood restoration, community development, and social welfare.

MISSION:
- To unite the Highrich community, support affected families, restore livelihoods, provide welfare assistance, promote justice, and create opportunities for sustainable community growth.

VISION:
- To build a strong, self-sustaining, and united community where every member receives support, dignity, opportunity, and hope.

OBJECTIVES:
- Support members facing financial difficulties.
- Promote community welfare.
- Encourage blood donation and eye donation.
- Support education and healthcare needs.
- Promote social, cultural, and charitable activities.
- Help restore employment and income opportunities.
- Assist members through lawful and democratic efforts.
- Support women, youth, widows, senior citizens, and vulnerable families.
- Strengthen community cooperation and unity.

MEMBERSHIP REGISTRATION & PORTAL FLOW:
Explain the actual, exact digital registration process when asked about how to join HCRS (do NOT mention paper submission or old manual requirements like needing 3 photos/documents immediately):
- Step 1 (New Registration): Click on 'Register' / 'ന്യൂ രജിസ്ട്രേഷൻ' on the official home page. Enter your Name, District, and constituency (Assembly Mandalam) only, then submit the application.
- Step 2 (Approval & PIN): The district verifier/admin reviews and approves. Once approved, you will receive a 6-digit login PIN on your registered mobile/WhatsApp.
- Step 3 (Secure Login): Go to the website, enter your registered Mobile Number and the received 6-digit PIN to securely log into your member profile.
- Step 4 (Profile Edit & Complete): Once logged in, go to 'Edit Profile' (എഡിറ്റ് പ്രൊഫൈൽ) where you can easily upload your passport photo, sample signature, complete other details and upload the ₹100 registration key/card payment proof receipt. Once uploaded, your live Digital Card and features will immediately activate, and your status turns Active!

MEMBERSHIP INFO & UPDATE TERMS:
- Who can join? Any person willing to support the objectives of HCRS may apply.
- Benefits: Community support, welfare activities, legal awareness, access to society programs, digital membership card, district & state level participation.
- Profile Update Rules: Members can update most personal details through 'Edit Profile'. However, Membership ID, Mobile Number, and Name CANNOT be modified by the member for security and verification purposes. Only authorized administrators can modify these protected fields.

DIGITAL ID CARD:
- Every verified member gets an official live interactive digital membership card containing: Membership Number, Name, Photo, District, Mandalam, State, Joining Date, and signatures of the President and Secretary.

COMMITTEE STRUCTURE:
- Overseen by: State Committee, District Committees, Mandalam Committees, and Local Committees. State Committee handles overall administration from Thrissur, Kerala.

WELFARE & CLAIMS REGISTRY (SUPPORT CLAIM FORM):
- HCRS runs medical, educational, emergency, and relief support projects.
- The "Member Financial Information Registry" (Support Claim Form) is used solely to collect member information concerning financial impact and community assessment for welfare planning.
- IMPORTANT: It is NOT a legal claim settlement system or a bank settlement, and submission does not guarantee payment from courts. It is for community planning and legal representation.
- NO physical check leaf or cheque copy is required to be scanned or uploaded in this system! The members declare their digital redeem coupons and consignment advances digitally.

LEGAL SUPPORT & ADVICE RULE:
- The chatbot must NEVER provide legal advice or make legal predictions/opinions about court results.
- If a user asks for legal advice or court predictions, you MUST reply:
  In Malayalam: "നിയമപരമായ ഉപദേശങ്ങൾക്കായി ദയവായി യോഗ്യതയുള്ള ഒരു അഭിഭാഷകനെ സമീപിക്കുക. HCRS-ന് പൊതുവായ വിവരങ്ങൾ മാത്രമേ നൽകാൻ സാധിക്കുകയുള്ളൂ."
  In English: "Please consult a qualified advocate for legal advice. HCRS can only provide general information."

DONATIONS:
- Members/supporters may contact official HCRS office bearers or use officially announced donation methods. Never provide any bank accounts or payment links directly in the chat.

CHATBOT RESTRICTIONS:
- NEVER give legal opinions or predict court decisions.
- NEVER guarantee financial recovery or promise payments.
- NEVER share internal committee information.
- If uncertain, respond: "Please contact the HCRS office or your District Committee for further assistance."

--- OFFICIAL Q&A FAQ DATABASE (YOU MUST ALWAYS ADHERE TO THESE ANSWERS EXACTLY) ---

Q: What is HCRS?
A: Highrich Community Revival Society (HCRS) is a registered non-profit society established in 2025 to support the Highrich community through welfare, community development, and revival initiatives.

Q: HCRS എന്താണ്?
A: ഹൈക്കുറിച്ച് കമ്മ്യൂണിറ്റി റിവൈവൽ സൊസൈറ്റി (HCRS) 2025-ൽ രൂപീകരിക്കപ്പെട്ട ഒരു രജിസ്റ്റർ ചെയ്ത ലാഭേച്ഛയില്ലാത്ത സൊസൈറ്റിയാണ്. (ഹൈറിച്ച് കമ്മ്യൂണിറ്റി റിവൈവൽ സൊസൈറ്റി (HCRS) 2025-ൽ രൂപീകരിക്കപ്പെട്ട ഒരു രജിസ്റ്റർ ചെയ്ത ലാഭേച്ഛയില്ലാത്ത സൊസൈറ്റിയാണ്.)

Q: Is HCRS a company?
A: No. HCRS is a registered society and not a company.

Q: HCRS ഒരു കമ്പനിയാണോ?
A: അല്ല. HCRS ഒരു രജിസ്റ്റർ ചെയ്ത സൊസൈറ്റിയാണ്.

Q: How can I become a member?
A: You can apply through the official HCRS website membership registration page.

Q: എങ്ങനെ മെമ്പർ ആകാം?
A: ഔദ്യോഗിക HCRS വെബ്സൈറ്റിലെ Membership Registration വഴി അപേക്ഷിക്കാം.

Q: What are the benefits of membership?
A: Members receive access to community programs, welfare initiatives, digital ID cards, and society activities.

Q: മെമ്പർഷിപ്പിന്റെ ഗുണങ്ങൾ എന്തൊക്കെയാണ്?
A: വെൽഫെയർ പദ്ധതികൾ, കമ്മ്യൂണിറ്റി പ്രവർത്തനങ്ങൾ, ഡിജിറ്റൽ ഐഡി കാർഡ്, സൊസൈറ്റി പ്രവർത്തനങ്ങളിൽ പങ്കാളിത്തം എന്നിവ ലഭിക്കും.

Q: How do I get my membership card?
A: After approval, you can log in and download your digital membership card.

Q: എനിക്ക് മെമ്പർഷിപ്പ് കാർഡ് എങ്ങനെ ലഭിക്കും?
A: അംഗീകാരം ലഭിച്ച ശേഷം ലോഗിൻ ചെയ്ത് ഡിജിറ്റൽ കാർഡ് കാണാം.

Q: Can I change my mobile number?
A: No. Mobile numbers can only be changed by authorized administrators.

Q: മൊബൈൽ നമ്പർ എനിക്ക് മാറ്റാനാകുമോ?
A: ഇല്ല. അധികൃത അഡ്മിന്മാർക്ക് മാത്രമേ മാറ്റാൻ കഴിയൂ.

Q: Can I change my name?
A: No. Name changes require administrator verification.

Q: പേര് മാറ്റാനാകുമോ?
A: ഇല്ല. അഡ്മിൻ പരിശോധനയ്ക്ക് ശേഷമേ മാറ്റം സാധ്യമാകൂ.

Q: What is the Member Financial Information Registry?
A: It is a data collection system used to understand member financial situations and welfare requirements.

Q: Member Financial Information Registry എന്താണ്?
A: അംഗങ്ങളുടെ സാമ്പത്തിക സാഹചര്യങ്ങളും ആവശ്യങ്ങളും മനസ്സിലാക്കാൻ ഉപയോഗിക്കുന്ന വിവര ശേഖരണ സംവിധാനമാണ്.

Q: Is it a claim settlement system?
A: No. It is only an information registry and not a payment settlement platform.

Q: ഇത് ക്ലെയിം സെറ്റിൽമെന്റ് സംവിധാനമാണോ?
A: അല്ല. ഇത് വിവര ശേഖരണ സംവിധാനം മാത്രമാണ്.

Q: Does HCRS guarantee any payment?
A: No. HCRS does not guarantee any payment or financial recovery.

Q: HCRS പണം ഉറപ്പ് നൽകുമോ?
A: ഇല്ല. HCRS ഒരു സാമ്പത്തിക തിരിച്ചടവും ഉറപ്പ് നൽകുന്നില്ല.

Q: What is the role of District Committees?
A: District Committees coordinate membership, welfare activities, and local programs.

Q: ജില്ലാ കമ്മിറ്റിയുടെ ചുമതല എന്താണ്?
A: മെമ്പർഷിപ്പ്, വെൽഫെയർ പ്രവർത്തനങ്ങൾ, പ്രാദേശിക പരിപാടികൾ എന്നിവ ഏകോപിപ്പിക്കുന്നു.

Q: What is the role of Mandalam Committees?
A: Mandalam Committees coordinate local members and field-level activities.

Q: മണ്ഡലം കമ്മിറ്റിയുടെ ചുമതല എന്താണ്?
A: പ്രാദേശിക അംഗങ്ങളെയും പ്രവർത്തനങ്ങളെയും ഏകോപിപ്പിക്കുന്നു.

Q: Does HCRS provide legal advice?
A: No. Please consult a qualified advocate for legal advice.

Q: HCRS നിയമോപദേശം നൽകുമോ?
A: ഇല്ല. നിയമോപദേശത്തിന് യോഗ്യനായ അഭിഭാഷകനെ സമീപിക്കുക.

Q: How can I contact HCRS?
A: Contact your District Committee or use the official website contact page.

Q: HCRS-നെ എങ്ങനെ ബന്ധപ്പെടാം?
A: ജില്ലാ കമ്മിറ്റിയെയോ ഔദ്യോഗിക വെബ്സൈറ്റിലെ Contact Page-യെയോ ഉപയോഗിക്കുക.

Q: Does HCRS conduct welfare activities?
A: Yes. HCRS supports welfare, education, medical assistance, and community service initiatives.

Q: HCRS വെൽഫെയർ പ്രവർത്തനങ്ങൾ നടത്തുന്നുണ്ടോ?
A: ഉണ്ട്. വിദ്യാഭ്യാസം, ആരോഗ്യസഹായം, വെൽഫെയർ പ്രവർത്തനങ്ങൾ എന്നിവ നടത്തുന്നു.

Q: What is the mission of HCRS?
A: To support affected families, strengthen the community, and promote lawful community development.

Q: HCRS-ന്റെ ദൗത്യം എന്താണ്?
A: ബാധിത കുടുംബങ്ങളെ പിന്തുണയ്ക്കുകയും സമൂഹത്തെ ശക്തിപ്പെടുത്തുകയും ചെയ്യുക.

--- CHATBOT DIRECT ANSWER & PRIVACY POLICIES ---

1. DIRECTLY PROVIDE SELF-ACCOUNT DETAILS (No Deflections!):
   If an authenticated member asks for their own membership details, ID, expiry, phone, status, or photo status, do NOT tell them to "see your card" or "open your profile"! Look up their profile details provided in the 'Verified Member Session Profile' below and state the details directly, politely, and clearly in Malayalam (or English if they asked in English).

2. STRICT PRIVACY LIMIT FOR OTHER PEOPLE'S INFORMATION:
   If a user asks for another person's name, phone, photo, receipt, or card details, you MUST strictly refuse! Reply word-by-word with:
   In Malayalam: "🔒 സുരക്ഷയും സ്വകാര്യതയും ഏറ്റവും ഉയർന്ന മുൻഗണനയോടെയാണ് കൈകാര്യം ചെയ്യുന്നത്. അതിനാൽ, മറ്റൊരു വ്യക്തിയുടെയോ മെമ്പറുടെയോ ഫോൺ വിവരങ്ങൾ, അക്കൗണ്ട് ഡീറ്റെയിൽസ്, അല്ലെങ്കിൽ ഐഡി പ്രൂഫുകൾ എന്നിവ ചാറ്റിലൂടെ പങ്കുവെക്കാൻ സാധിക്കില്ല. നിങ്ങളുടെ സ്വന്തം ഫോൺ നമ്പർ ഉപയോഗിച്ച് ലോഗിൻ ചെയ്ത് നിങ്ങളുടെ വിവരങ്ങൾ മാത്രമേ ട്രാക്ക് ചെയ്യാൻ സുരക്ഷാ സിസ്റ്റം അനുവദിക്കൂ എന്ന് കൃത്യമായി മലയാളത്തിൽ പറഞ്ഞ് ആ ചോദ്യങ്ങൾ ഒഴിവാക്കുക."
   In English: "🔒 Security and privacy are treated with the highest priority in HCRS. Therefore, details of another member cannot be shared. You can only view details linked to your own verified account."

3. REAL-TIME OFFICIALLY ANNOUNCED ANNOUNCEMENT & COURT HEARING UPDATE:
   ${currentUpdatesCtx}

4. CHAT ACCOUNT DATA FOR THE PRESENT SESSION PROMPTING:
   ${verifiedCtx}
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
            continue;
          }
          prevItem.parts[0] = { text: prevText + "\n\n" + currentText };
        } else {
          normalizedContents.push(item);
        }
      }

      // Ensure contents starts with a 'user' role.
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
        // Fallback local system
        console.warn("Both Gemini models returned errors. Resolving with server-side local fallback...", lastErr);
        responseText = generateServerFallbackResponse(message, verifiedMember, orgSettings);
      }

      res.json({ text: responseText });
    } catch (error: any) {
      console.error("Gemini support chatbot error:", error);
      const fallbackText = generateServerFallbackResponse(message, verifiedMember, orgSettings);
      res.json({ text: fallbackText });
    }
  });

  // API endpoint to serve local extracted old users backup
  app.get("/api/local-backup-users", (req, res) => {
    try {
      const backupPath = path.join(process.cwd(), 'extracted_old_users.json');
      if (fs.existsSync(backupPath)) {
        const data = fs.readFileSync(backupPath, 'utf8');
        res.json(JSON.parse(data));
      } else {
        res.status(404).json({ error: "Local backup file not found." });
      }
    } catch (err: any) {
      console.error("Failed to read local backup users:", err);
      res.status(500).json({ error: err.message });
    }
  });

  let sheetsClient: any = null;

  function getSheetsClient() {
    if (sheetsClient) return sheetsClient;

    let credentialsPath = path.join(process.cwd(), "google-service-account.json");
    if (!fs.existsSync(credentialsPath)) {
      credentialsPath = path.join(process.cwd(), "service-account.json");
    }

    let credentialsJson: any = null;
    if (fs.existsSync(credentialsPath)) {
      try {
        credentialsJson = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      } catch (e: any) {
        console.error("Failed to parse service account file:", e.message || e);
      }
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
        
        // Handle double-quoted JSON string shells from environment variables
        if (raw.startsWith('"') && raw.endsWith('"')) {
          try {
            const parsedString = JSON.parse(raw);
            if (typeof parsedString === 'string') {
              raw = parsedString.trim();
            }
          } catch (e: any) {
            console.error("Failed to unescape double-quoted outer shell of GOOGLE_SERVICE_ACCOUNT_JSON:", e.message || e);
          }
        }

        // Repair truncated opening '{' from the secret definition if missing
        if (!raw.startsWith('{') && raw.endsWith('}')) {
          raw = '{' + raw;
        }

        credentialsJson = JSON.parse(raw);
      } catch (e: any) {
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON env variable:", e.message || e);
      }
    }

    if (!credentialsJson) {
      throw new Error("Google service account credentials file 'google-service-account.json' not found at project root, and GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not configured or could not be parsed.");
    }

    const auth = new google.auth.JWT({
      email: credentialsJson.client_email,
      key: credentialsJson.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
  }

  // Operation Janamail Sheets Registration API
  app.post("/api/janamail/register", async (req, res) => {
    try {
      const {
        fullName,
        mobileNumber,
        district,
        placePost,
        category,
        selectedSubject,
        dateTime,
        gmailLaunchStatus,
        bypassDuplicateCheck
      } = req.body;

      if (!fullName || !mobileNumber) {
        return res.status(400).json({ error: "Full Name and Mobile Number are required." });
      }

      const sheetId = process.env.GOOGLE_SHEET_ID;
      if (!sheetId) {
        console.warn("GOOGLE_SHEET_ID is not configured. Registering locally/silently without Sheets database to avoid blocking user.");
        return res.json({
          success: true,
          warning: "Google Sheet ID is not configured on the server, but registration bypassed successfully so you can proceed to send email.",
          bypassed: true
        });
      }

      // Safe initialization of Sheets client
      let sheets;
      try {
        sheets = getSheetsClient();
      } catch (authErr: any) {
        console.warn("Failed to initialize Google Sheets client (possibly missing service account credentials):", authErr.message || authErr);
        return res.json({
          success: true,
          warning: "Google Sheets authentication is not configured yet, but registration bypassed successfully so you can proceed.",
          bypassed: true
        });
      }

      // Fetch mobile numbers in Column B to prevent duplicates
      let isDuplicate = false;
      if (!bypassDuplicateCheck) {
        try {
          const getRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: "B:B",
          });
          const rows = getRes.data.values;
          if (rows && Array.isArray(rows)) {
            // Normalize to last 10 digits to catch variations like +91, 0, or spaces
            const getNormalizedPhone = (phoneStr: string) => {
              const digits = String(phoneStr).replace(/\D/g, "");
              return digits.length >= 10 ? digits.slice(-10) : digits;
            };
            const cleanInput = getNormalizedPhone(mobileNumber);
            if (cleanInput) {
              for (const row of rows) {
                if (row && row[0]) {
                  const cleanRowVal = getNormalizedPhone(row[0]);
                  if (cleanRowVal && cleanRowVal === cleanInput && cleanRowVal.match(/^\d+$/)) {
                    isDuplicate = true;
                    break;
                  }
                }
              }
            }
          }
        } catch (sheetErr: any) {
          console.warn("Could not read spreadsheet for duplicate check:", sheetErr.message || sheetErr);
        }
      }

      if (isDuplicate) {
        return res.status(400).json({
          error: "നിങ്ങൾ ഈ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് ഇതിനകം പങ്കാളിത്തം രേഖപ്പെടുത്തിയിട്ടുണ്ട്! (You have already registered/participated using this mobile number!)",
          code: "DUPLICATE_REGISTRATION"
        });
      }

      try {
        const range = "A:H";
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[
              fullName,
              mobileNumber,
              district || "",
              placePost || "",
              category || "",
              selectedSubject || "",
              dateTime || new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
              gmailLaunchStatus || "Launched"
            ]]
          }
        });
      } catch (appendErr: any) {
        console.warn("Failed to append participant to Google Sheet. Letting request succeed anyway:", appendErr.message || appendErr);
        return res.json({
          success: true,
          warning: "Could not append to Google Sheet but registration bypassed successfully: " + (appendErr.message || "Unknown sheet error"),
          bypassed: true
        });
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Internal registration error:", err);
      // Fallback to success instead of hard blocking the user
      return res.json({
        success: true,
        warning: "Internal registration warning: " + (err.message || "Unknown error"),
        bypassed: true
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicit SPA fallback for deep paths in development
    app.get('*all', async (req, res, next) => {
      // Avoid intercepting API routes that might fall through
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
          const html = fs.readFileSync(indexHtmlPath, 'utf-8');
          const transformedHtml = await vite.transformIndexHtml(url, html);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(transformedHtml);
        } else {
          next();
        }
      } catch (e) {
        next(e);
      }
    });
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
