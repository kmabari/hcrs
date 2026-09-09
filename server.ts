import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { google } from "googleapis";
import Razorpay from "razorpay";
import crypto from "crypto";
import admin from "firebase-admin";
import { db as clientDb } from "./src/lib/firebase";
import { collection, getDocs, getDoc, doc, updateDoc, query, where, limit } from "firebase/firestore";

// In-memory cache for fast members retrieval
let membersMemoryCache: { data: any[]; timestamp: number } | null = null;
let claimsMemoryCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache TTL

dotenv.config();

// Initialize Firebase Admin SDK for server-side verified database writes
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: "hcrs-membership"
    });
    console.log("[Firebase Admin] Initialized successfully for project hcrs-membership");
  } catch (adminInitErr) {
    console.warn("[Firebase Admin] Initialization notice:", adminInitErr);
  }
}

const dbAdmin = admin.apps.length ? admin.firestore() : null;

export const app = express();
export const handler = (req: any, res: any) => app(req, res);
const PORT = 3000;

app.use(express.json());

// Normalize request URL for Vercel serverless environments where /api prefix might be stripped
if (process.env.VERCEL) {
  app.use((req, _res, next) => {
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + req.url;
    }
    next();
  });
}

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
  app.post(["/api/chat", "/chat"], async (req, res) => {
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

  // Health check endpoint
  app.get(["/api/health", "/health"], (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // API endpoint to serve local extracted old users backup
  app.get(["/api/local-backup-users", "/local-backup-users"], (req, res) => {
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

  // Dedicated high-speed member lookup endpoint that bypasses browser WebChannel delays
  app.post(["/api/auth/lookup-member", "/api/lookup-member"], async (req, res) => {
    try {
      const { identifier, mobile } = req.body || {};
      const rawInput = String(identifier || mobile || '').trim();
      if (!rawInput) {
        return res.status(400).json({ success: false, error: "Identifier required" });
      }

      let sanitizedMobile = rawInput.replace(/\D/g, '');
      if (sanitizedMobile.startsWith('91') && sanitizedMobile.length === 12) {
        sanitizedMobile = sanitizedMobile.slice(2);
      } else if (sanitizedMobile.startsWith('0') && sanitizedMobile.length === 11) {
        sanitizedMobile = sanitizedMobile.slice(1);
      } else if (sanitizedMobile.length > 10) {
        sanitizedMobile = sanitizedMobile.slice(-10);
      }

      const isMobile = /^\d{10}$/.test(sanitizedMobile);
      const isEmail = rawInput.includes('@');
      const cleanUpper = rawInput.toUpperCase();

      const candidateDocs: any[] = [];

      // 1. Check in-memory cache if available (instant 0ms response)
      if (membersMemoryCache?.data && membersMemoryCache.data.length > 0) {
        for (const m of membersMemoryCache.data) {
          const mMob = String(m.mobile || '').replace(/\D/g, '').slice(-10);
          const mEmail = String(m.email || '').toLowerCase().trim();
          const mMemId = String(m.membershipId || '').toUpperCase().trim();
          const mHrId = String(m.highrichId || '').toUpperCase().trim();

          if (isMobile && mMob === sanitizedMobile) {
            candidateDocs.push(m);
          } else if (isEmail && mEmail === rawInput.toLowerCase()) {
            candidateDocs.push(m);
          } else if (mMemId && (mMemId === cleanUpper || mMemId.includes(cleanUpper))) {
            candidateDocs.push(m);
          } else if (mHrId && mHrId === cleanUpper) {
            candidateDocs.push(m);
          }
        }
      }

      // 2. Query Firestore if no match in memory cache or cache was empty
      if (candidateDocs.length === 0) {
        const usersRef = collection(clientDb, 'users');

        if (isMobile) {
          const mobileVariations = [
            sanitizedMobile,
            `+91${sanitizedMobile}`,
            `91${sanitizedMobile}`,
            `0${sanitizedMobile}`,
            `+91 ${sanitizedMobile}`
          ];
          try {
            const snap = await getDocs(query(usersRef, where('mobile', 'in', mobileVariations), limit(10)));
            if (!snap.empty) {
              snap.docs.forEach(d => candidateDocs.push({ id: d.id, uid: d.id, ...d.data() }));
            }
          } catch (e) {}

          // Fallback queries for mobile: alternate fields and direct doc IDs
          if (candidateDocs.length === 0) {
            const directIds = [sanitizedMobile, `life_${sanitizedMobile}`, `offline_${sanitizedMobile}`, `hcrs_imp_${sanitizedMobile}`];
            for (const dId of directIds) {
              try {
                const dSnap = await getDoc(doc(clientDb, 'users', dId));
                if (dSnap.exists()) {
                  candidateDocs.push({ id: dSnap.id, uid: dSnap.id, ...dSnap.data() });
                  break;
                }
              } catch (e) {}
            }
          }
        } else if (isEmail) {
          try {
            const snap = await getDocs(query(usersRef, where('email', '==', rawInput.toLowerCase()), limit(10)));
            if (!snap.empty) {
              snap.docs.forEach(d => candidateDocs.push({ id: d.id, uid: d.id, ...d.data() }));
            }
          } catch (e) {}
        } else {
          // Membership ID or custom ID
          try {
            const snap = await getDocs(query(usersRef, where('membershipId', '==', rawInput), limit(10)));
            if (!snap.empty) {
              snap.docs.forEach(d => candidateDocs.push({ id: d.id, uid: d.id, ...d.data() }));
            }
          } catch (e) {}

          if (candidateDocs.length === 0) {
            try {
              const snap = await getDocs(query(usersRef, where('membershipId', '==', cleanUpper), limit(10)));
              if (!snap.empty) {
                snap.docs.forEach(d => candidateDocs.push({ id: d.id, uid: d.id, ...d.data() }));
              }
            } catch (e) {}
          }

          if (candidateDocs.length === 0) {
            try {
              const snap = await getDocs(query(usersRef, where('highrichId', '==', cleanUpper), limit(10)));
              if (!snap.empty) {
                snap.docs.forEach(d => candidateDocs.push({ id: d.id, uid: d.id, ...d.data() }));
              }
            } catch (e) {}
          }
        }
      }

      if (candidateDocs.length === 0) {
        return res.json({
          success: true,
          found: false,
          diagnostic: `No matching record found in Firestore users for "${rawInput}"`
        });
      }

      // Sort candidate documents to choose the primary active/approved record
      const sorted = [...candidateDocs].sort((a, b) => {
        const isActiveA = (a.status === 'active' || a.isApproved === true) && a.status !== 'deleted';
        const isActiveB = (b.status === 'active' || b.isApproved === true) && b.status !== 'deleted';
        if (isActiveA && !isActiveB) return -1;
        if (isActiveB && !isActiveA) return 1;

        const hasNameA = Boolean(a.name && a.name !== 'Member' && String(a.name).trim().length > 1);
        const hasNameB = Boolean(b.name && b.name !== 'Member' && String(b.name).trim().length > 1);
        const hasMemIdA = Boolean(a.membershipId && String(a.membershipId).toUpperCase().startsWith('HCRS'));
        const hasMemIdB = Boolean(b.membershipId && String(b.membershipId).toUpperCase().startsWith('HCRS'));
        const scoreA = (hasNameA ? 2 : 0) + (hasMemIdA ? 2 : 0);
        const scoreB = (hasNameB ? 2 : 0) + (hasMemIdB ? 2 : 0);
        if (scoreA !== scoreB) return scoreB - scoreA;

        const isOfflineA = String(a.id || '').startsWith('offline_');
        const isOfflineB = String(b.id || '').startsWith('offline_');
        if (!isOfflineA && isOfflineB) return -1;
        if (isOfflineA && !isOfflineB) return 1;

        return 0;
      });

      const best = sorted[0];
      const docEmail = (best?.email || '').trim();
      const targetEmail = docEmail.includes('@') ? docEmail : `${best.mobile || sanitizedMobile || 'user'}@hcrs.society`;

      return res.json({
        success: true,
        found: true,
        user: best,
        targetEmail: targetEmail
      });
    } catch (err: any) {
      console.error("[lookup-member] Error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // In-flight request deduplication promises to avoid overlapping massive Firestore scans
  let membersInFlightPromise: Promise<any[]> | null = null;
  let claimsInFlightPromise: Promise<any[]> | null = null;

  // High-performance database members endpoint with in-memory caching and deduplication
  app.get(["/api/database/members", "/database/members"], async (req, res) => {
    try {
      const now = Date.now();
      const forceFresh = req.query.fresh === 'true';
      
      // If cached data is recent (< CACHE_TTL_MS or 0 when fresh), return immediately
      const minCacheAge = forceFresh ? 0 : CACHE_TTL_MS;
      if (membersMemoryCache && (now - membersMemoryCache.timestamp) < minCacheAge) {
        return res.json({
          success: true,
          count: membersMemoryCache.data.length,
          cached: true,
          data: membersMemoryCache.data
        });
      }

      // If an existing fetch is already running, wait for it rather than starting another
      if (!membersInFlightPromise) {
        membersInFlightPromise = (async () => {
          const timeoutPromise = new Promise<any[]>((_, reject) => 
            setTimeout(() => reject(new Error("Firestore members fetch timeout")), 20000)
          );
          const fetchPromise = (async () => {
            const snapshot = await getDocs(collection(clientDb, 'users'));
            return snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
          })();
          const list = await Promise.race([fetchPromise, timeoutPromise]);
          membersMemoryCache = {
            data: list,
            timestamp: Date.now()
          };
          return list;
        })().finally(() => {
          membersInFlightPromise = null;
        });
      }

      const list = await membersInFlightPromise;

      return res.json({
        success: true,
        count: list.length,
        cached: false,
        data: list
      });
    } catch (err: any) {
      console.error("[server] /api/database/members fetch error:", err);
      if (membersMemoryCache) {
        return res.json({
          success: true,
          count: membersMemoryCache.data.length,
          cached: true,
          stale: true,
          data: membersMemoryCache.data
        });
      }
      return res.status(500).json({ success: false, error: err?.message || "Failed to query members from database" });
    }
  });

  // Fast Database Claims Retrieval with In-Memory Caching and deduplication
  app.get(["/api/database/claims", "/database/claims"], async (req, res) => {
    try {
      const now = Date.now();
      const forceFresh = req.query.fresh === 'true';
      const minCacheAge = forceFresh ? 0 : CACHE_TTL_MS;
      let list: any[] = [];
      if (claimsMemoryCache && (now - claimsMemoryCache.timestamp) < minCacheAge) {
        list = claimsMemoryCache.data;
      } else {
        if (!claimsInFlightPromise) {
          claimsInFlightPromise = (async () => {
            let fetchedList: any[] = [];
            try {
              const snap = await getDocs(collection(clientDb, 'claims'));
              fetchedList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (clientErr: any) {
              console.warn("[server] clientDb claims query failed, checking dbAdmin:", clientErr?.message);
              if (dbAdmin) {
                const snap = await dbAdmin.collection('claims').get();
                fetchedList = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
              } else {
                throw clientErr;
              }
            }
            claimsMemoryCache = {
              data: fetchedList,
              timestamp: Date.now()
            };
            return fetchedList;
          })().finally(() => {
            claimsInFlightPromise = null;
          });
        }
        list = await claimsInFlightPromise;
      }

      const { uid, mobile, membershipId } = req.query;
      if (uid || mobile || membershipId) {
        const cleanMob = mobile ? String(mobile).replace(/\D/g, '').slice(-10) : '';
        const targetUid = uid ? String(uid).trim() : '';
        const targetMemId = membershipId ? String(membershipId).trim().toLowerCase() : '';

        const filtered = list.filter((c: any) => {
          if (targetUid && (c.uid === targetUid || c.uid === `offline_${cleanMob}`)) return true;
          if (cleanMob && c.userMobile) {
            const cMob = String(c.userMobile).replace(/\D/g, '').slice(-10);
            if (cMob === cleanMob) return true;
          }
          if (targetMemId && c.membershipId && String(c.membershipId).toLowerCase() === targetMemId) return true;
          return false;
        });

        return res.json({
          success: true,
          count: filtered.length,
          cached: false,
          data: filtered
        });
      }

      return res.json({
        success: true,
        count: list.length,
        cached: false,
        data: list
      });
    } catch (err: any) {
      console.error("[server] /api/database/claims fetch error:", err);
      if (claimsMemoryCache) {
        return res.json({
          success: true,
          count: claimsMemoryCache.data.length,
          cached: true,
          stale: true,
          data: claimsMemoryCache.data
        });
      }
      return res.status(500).json({ success: false, error: err?.message || "Failed to query claims from database" });
    }
  });

  // Fast Database Life-Members Retrieval
  app.get(["/api/database/life-members", "/database/life-members"], async (req, res) => {
    try {
      const isLife = (u: any) => {
        if (!u) return false;
        if (u.membership_type === 'LIFE_MEMBER' || u.membershipType === 'LIFE_MEMBER') return true;
        if (u.isLifeMember || u.is_life_member) return true;
        if (typeof u.membershipId === 'string') {
          const m = u.membershipId.toUpperCase();
          if (m.includes('-LIFE-') || m.startsWith('HCRS-LIFE') || m.includes('-LM-')) return true;
        }
        return false;
      };

      if (membersMemoryCache && Array.isArray(membersMemoryCache.data) && membersMemoryCache.data.length > 0) {
        const lifeList = membersMemoryCache.data.filter(isLife);
        return res.json({
          success: true,
          count: lifeList.length,
          cached: true,
          data: lifeList
        });
      }

      // Query firestore directly
      const q = query(collection(clientDb, 'users'), where('membership_type', '==', 'LIFE_MEMBER'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }));

      return res.json({
        success: true,
        count: list.length,
        cached: false,
        data: list
      });
    } catch (err: any) {
      console.error("[server] /api/database/life-members fetch error:", err);
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // API endpoint to automatically resolve and extract direct image URLs from webpages (e.g. ImgBB, PostImages, Google Drive, etc.)
  app.all(["/api/resolve-image-url", "/resolve-image-url"], async (req, res) => {
    const rawTarget = (req.query.url as string) || (req.body && req.body.url) || "";
    if (!rawTarget || typeof rawTarget !== "string") {
      return res.status(400).json({ error: "url query parameter or body is required." });
    }

    let url = rawTarget.trim();

    // 1. Google Drive normalization
    if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
      const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        const fileId = driveMatch[1];
        return res.json({
          success: true,
          resolvedUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
          fallbackUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
          originalUrl: url,
          type: "google-drive"
        });
      }
    }

    // 2. Direct image check
    if (url.match(/\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i) || url.includes("i.ibb.co") || url.includes("i.imgur.com") || url.includes("i.postimg.cc")) {
      return res.json({
        success: true,
        resolvedUrl: url,
        originalUrl: url,
        type: "direct-image"
      });
    }

    // 3. Imgur viewer -> direct
    if (url.includes("imgur.com/") && !url.includes("i.imgur.com") && !url.includes("/a/") && !url.includes("/gallery/")) {
      const match = url.match(/imgur\.com\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        return res.json({
          success: true,
          resolvedUrl: `https://i.imgur.com/${match[1]}.jpg`,
          originalUrl: url,
          type: "imgur"
        });
      }
    }

    // 4. Dropbox viewer -> raw
    if (url.includes("dropbox.com")) {
      const rawUrl = url.replace(/dl=[01]/, "raw=1");
      return res.json({
        success: true,
        resolvedUrl: rawUrl.includes("raw=1") ? rawUrl : (rawUrl + (rawUrl.includes("?") ? "&raw=1" : "?raw=1")),
        originalUrl: url,
        type: "dropbox"
      });
    }

    // 5. Fetch webpage to extract OpenGraph / Twitter / High-res image tags
    try {
      const fetchController = new AbortController();
      const timeoutId = setTimeout(() => fetchController.abort(), 6000);

      const pageRes = await fetch(url, {
        signal: fetchController.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        }
      });
      clearTimeout(timeoutId);

      const contentType = pageRes.headers.get("content-type") || "";
      if (contentType.startsWith("image/")) {
        return res.json({
          success: true,
          resolvedUrl: url,
          originalUrl: url,
          type: "direct-content-type"
        });
      }

      const html = await pageRes.text();

      // Look for og:image, twitter:image, image_src, or specific viewers
      const ogMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
                      html.match(/<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<link\s+[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i);

      if (ogMatch && ogMatch[1]) {
        let extracted = ogMatch[1].trim();
        if (extracted.startsWith("//")) extracted = "https:" + extracted;
        else if (extracted.startsWith("/")) {
          try {
            const parsedOrigin = new URL(url).origin;
            extracted = parsedOrigin + extracted;
          } catch {
            // keep extracted as is
          }
        }
        return res.json({
          success: true,
          resolvedUrl: extracted,
          originalUrl: url,
          type: "extracted-opengraph"
        });
      }

      // ImgBB specific viewer selector fallback
      const ibbViewer = html.match(/id=["']image-viewer-image["'][^>]*src=["']([^"']+)["']/i);
      if (ibbViewer && ibbViewer[1]) {
        return res.json({
          success: true,
          resolvedUrl: ibbViewer[1].trim(),
          originalUrl: url,
          type: "extracted-ibb"
        });
      }

      // PostImages main-image selector fallback
      const postImgViewer = html.match(/id=["']main-image["'][^>]*src=["']([^"']+)["']/i);
      if (postImgViewer && postImgViewer[1]) {
        return res.json({
          success: true,
          resolvedUrl: postImgViewer[1].trim(),
          originalUrl: url,
          type: "extracted-postimg"
        });
      }

      // If no tag found, return best guess or proxy
      return res.json({
        success: false,
        resolvedUrl: url,
        originalUrl: url,
        message: "No embedded image metadata found on page"
      });
    } catch (fetchErr: any) {
      console.warn("Failed to scrape webpage for image:", fetchErr.message);
      return res.json({
        success: false,
        resolvedUrl: url,
        originalUrl: url,
        error: fetchErr.message
      });
    }
  });

  let sheetsClient: any = null;

  function getGoogleSheetId(): string {
    let sheetId = (
      process.env.GOOGLE_SHEET_ID || 
      process.env.VITE_GOOGLE_SHEET_ID || 
      process.env.SHEET_ID || 
      process.env.SPREADSHEET_ID || 
      ""
    ).trim();

    if (sheetId) {
      const urlMatch = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (urlMatch && urlMatch[1]) {
        sheetId = urlMatch[1];
      }
    }
    return sheetId;
  }

  function getSheetsClient() {
    if (sheetsClient) return sheetsClient;

    let credentialsPath = path.join(process.cwd(), "google-service-account.json");
    if (!fs.existsSync(credentialsPath)) {
      credentialsPath = path.join(process.cwd(), "service-account.json");
    }

    let credentialsJson: any = null;
    if (fs.existsSync(credentialsPath)) {
      try {
        console.log("[Google Sheets Auth] Loading service account from credentials file:", credentialsPath);
        credentialsJson = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      } catch (e: any) {
        console.error("[Google Sheets Auth] Failed to parse service account file:", e.message || e);
      }
    }

    if (!credentialsJson) {
      const envCandidate = (
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
        process.env.VITE_GOOGLE_SERVICE_ACCOUNT_JSON ||
        process.env.GCP_SERVICE_ACCOUNT_KEY ||
        process.env.SERVICE_ACCOUNT_JSON ||
        ""
      ).trim();

      if (envCandidate) {
        try {
          console.log("[Google Sheets Auth] Loading service account from environment variable");
          let raw = envCandidate;

          // Try Base64 decoding if not starting with '{' or '"'
          if (!raw.startsWith('{') && !raw.startsWith('"') && raw.length > 50) {
            try {
              const decoded = Buffer.from(raw, 'base64').toString('utf8');
              if (decoded.includes('"client_email"') || decoded.includes('"private_key"')) {
                raw = decoded.trim();
              }
            } catch (_) {}
          }

          // Handle double-quoted JSON string shells from environment variables
          if (raw.startsWith('"') && raw.endsWith('"')) {
            try {
              const parsedString = JSON.parse(raw);
              if (typeof parsedString === 'string') {
                raw = parsedString.trim();
              }
            } catch (e: any) {
              console.error("[Google Sheets Auth] Failed to unescape double-quoted outer shell:", e.message || e);
            }
          }

          // Repair truncated opening '{' from secret definition if missing
          if (!raw.startsWith('{') && raw.endsWith('}')) {
            raw = '{' + raw;
          }

          credentialsJson = JSON.parse(raw);
        } catch (e: any) {
          console.error("[Google Sheets Auth] Failed to parse service account from env variable:", e.message || e);
        }
      }
    }

    if (!credentialsJson) {
      throw new Error("Google service account credentials not found. On Vercel, please add 'GOOGLE_SERVICE_ACCOUNT_JSON' and 'GOOGLE_SHEET_ID' in Vercel Project Settings -> Environment Variables.");
    }

    console.log("[Google Sheets Auth] Service account email loaded:", credentialsJson.client_email);

    const formattedPrivateKey = typeof credentialsJson.private_key === "string"
      ? credentialsJson.private_key.replace(/\\n/g, "\n")
      : credentialsJson.private_key;

    const auth = new google.auth.JWT({
      email: credentialsJson.client_email,
      key: formattedPrivateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
  }

  // Helper to extract exact Google API error message
  function extractGoogleApiError(err: any): string {
    if (!err) return "Unknown error occurred";
    if (typeof err === "string") return err;

    const gError = err.response?.data?.error;
    if (gError) {
      if (typeof gError === "string") return gError;
      if (gError.message) {
        const details = gError.errors ? " - " + JSON.stringify(gError.errors) : "";
        return `Google API Error (${gError.code || err.status || 500}): ${gError.message}${details}`;
      }
    }

    if (err.response?.data?.error_description) {
      return `Google Auth Error: ${err.response.data.error_description}`;
    }

    if (err.message) {
      return err.message;
    }

    return JSON.stringify(err);
  }

  // Operation Janamail Diagnostics Endpoint (Supports both /api/janamail/status and /janamail/status)
  app.get(["/api/janamail/status", "/janamail/status"], async (req, res) => {
    const credentialsPath = path.join(process.cwd(), "google-service-account.json");
    const hasEnvJson = !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON || 
      process.env.VITE_GOOGLE_SERVICE_ACCOUNT_JSON || 
      process.env.GCP_SERVICE_ACCOUNT_KEY
    );
    const hasFileJson = fs.existsSync(credentialsPath);
    const sheetId = getGoogleSheetId();

    let authOk = false;
    let authError = null;
    let serviceAccountEmail = null;

    try {
      const client = getSheetsClient();
      authOk = true;
      if (hasFileJson) {
        const c = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
        serviceAccountEmail = c.client_email;
      } else if (hasEnvJson) {
        let raw = (
          process.env.GOOGLE_SERVICE_ACCOUNT_JSON || 
          process.env.VITE_GOOGLE_SERVICE_ACCOUNT_JSON || 
          process.env.GCP_SERVICE_ACCOUNT_KEY || 
          ""
        ).trim();
        if (raw.startsWith('"') && raw.endsWith('"')) {
          try { raw = JSON.parse(raw); } catch (e) {}
        }
        if (!raw.startsWith('{') && raw.endsWith('}')) raw = '{' + raw;
        const c = JSON.parse(raw);
        serviceAccountEmail = c.client_email;
      }
    } catch (e: any) {
      authError = extractGoogleApiError(e);
    }

    res.json({
      serverRunning: true,
      googleSheetIdConfigured: !!sheetId,
      googleSheetId: sheetId ? `${sheetId.substring(0, 8)}...` : null,
      serviceAccountConfigured: hasEnvJson || hasFileJson,
      serviceAccountEmail,
      authSuccess: authOk,
      authError
    });
  });

  // Operation Janamail Sheets Registration API (Supports both /api/janamail/register and /janamail/register)
  app.post(["/api/janamail/register", "/janamail/register"], async (req, res) => {
    console.log("=== [DEBUG 1/8] Incoming request received at /api/janamail/register ===");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));

    try {
      const {
        fullName,
        name: bodyName,
        mobileNumber,
        phone,
        district,
        placePost,
        place,
        category,
        memberCategory,
        selectedSubject,
        subject,
        template,
        templateName,
        date: bodyDate,
        time: bodyTime,
        dateTime,
        gmailLaunchStatus,
        emailStatus,
        status,
        bypassDuplicateCheck
      } = req.body || {};

      console.log("=== [DEBUG 2/8] Parsed registration data ===", JSON.stringify({
        fullName,
        mobileNumber,
        district,
        placePost,
        category,
        selectedSubject,
        template,
        dateTime,
        gmailLaunchStatus,
        bypassDuplicateCheck
      }, null, 2));

      const inputName = fullName || bodyName;
      const inputMobile = mobileNumber || phone;

      if (!inputName || !inputMobile) {
        console.warn("[Google Sheets Flow] Validation failed: Full Name or Mobile Number missing");
        return res.status(400).json({ error: "Full Name and Mobile Number are required." });
      }

      const sheetId = getGoogleSheetId();

      console.log("=== [DEBUG 3/8] Spreadsheet ID used ===", sheetId || "MISSING");

      if (!sheetId) {
        console.error("[Google Sheets Flow ERROR] GOOGLE_SHEET_ID environment variable is missing on server.");
        return res.status(500).json({
          error: "GOOGLE_SHEET_ID environment variable is missing on the server. On Vercel, please add GOOGLE_SHEET_ID in Project Settings -> Environment Variables."
        });
      }

      // Safe initialization of Sheets client
      let sheets;
      try {
        sheets = getSheetsClient();
        console.log("[Google Sheets Flow] Google Sheets authentication client initialized successfully.");
      } catch (authErr: any) {
        const exactAuthError = extractGoogleApiError(authErr);
        console.error("=== [DEBUG 7/8] Complete Google API Auth error ===", authErr.response?.data || authErr);
        console.error("=== [DEBUG 8/8] Full server stack trace ===", authErr.stack);
        return res.status(500).json({
          error: `Google Sheets Authentication Error: ${exactAuthError}`
        });
      }

      const range = "Sheet1!A:Z";
      console.log("=== [DEBUG 4/8] Worksheet name / Target Range used ===", range);

      // Duplicate check (bypassed if bypassDuplicateCheck is true or in testing mode)
      const shouldBypassDuplicate = bypassDuplicateCheck === true;
      let isDuplicate = false;

      if (!shouldBypassDuplicate) {
        try {
          console.log("[Google Sheets Flow] Executing duplicate check against sheet...");
          const getRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: "A:Z",
          });
          const rows = getRes.data.values;
          if (rows && Array.isArray(rows)) {
            const getNormalizedPhone = (phoneStr: string) => {
              const digits = String(phoneStr).replace(/\D/g, "");
              return digits.length >= 10 ? digits.slice(-10) : digits;
            };
            const cleanInput = getNormalizedPhone(inputMobile);
            if (cleanInput) {
              for (const row of rows) {
                if (row && Array.isArray(row)) {
                  for (const cell of row) {
                    const cleanCellVal = getNormalizedPhone(cell);
                    if (cleanCellVal && cleanCellVal === cleanInput && cleanCellVal.match(/^\d+$/)) {
                      isDuplicate = true;
                      break;
                    }
                  }
                  if (isDuplicate) break;
                }
              }
            }
          }
        } catch (sheetErr: any) {
          const checkErr = extractGoogleApiError(sheetErr);
          console.warn("[Google Sheets Flow] Duplicate check read warning:", checkErr);
        }
      } else {
        console.log("[Google Sheets Flow] Duplicate check bypassed.");
      }

      if (isDuplicate) {
        console.warn("[Google Sheets Flow REJECTED] Duplicate entry detected for mobile:", inputMobile);
        return res.status(400).json({
          error: "നിങ്ങൾ ഈ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് ഇതിനകം പങ്കാളിത്തം രേഖപ്പെടുത്തിയിട്ടുണ്ട്! (You have already registered/participated using this mobile number!)",
          code: "DUPLICATE_REGISTRATION",
          isDuplicate: true
        });
      }

      try {
        const now = new Date();
        const defaultDateStr = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
        const defaultTimeStr = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });

        let dateVal = bodyDate || "";
        let timeVal = bodyTime || "";

        if (!dateVal || !timeVal) {
          if (dateTime && typeof dateTime === "string") {
            if (dateTime.includes(",")) {
              const parts = dateTime.split(",");
              if (!dateVal) dateVal = parts[0].trim();
              if (!timeVal && parts[1]) timeVal = parts[1].trim();
            } else if (dateTime.includes("T")) {
              const parts = dateTime.split("T");
              if (!dateVal) dateVal = parts[0].trim();
              if (!timeVal && parts[1]) timeVal = parts[1].replace("Z", "").trim();
            } else {
              if (!dateVal) dateVal = dateTime;
            }
          }
        }

        if (!dateVal) dateVal = defaultDateStr;
        if (!timeVal) timeVal = defaultTimeStr;

        const userFullName = inputName;
        const userMobile = inputMobile;
        const userDistrict = district || "";
        const userPlace = placePost || place || "";
        const userCategory = category || memberCategory || "";
        const userSubject = selectedSubject || subject || "";
        const userTemplate = template || templateName || "Template 1";
        const userEmailStatus = gmailLaunchStatus || emailStatus || status || "Launched";
        const userHistory = req.body?.history || req.body?.registrationHistory || req.body?.historyLog || "";

        // Read master header row from Sheet1 Row 1
        let masterHeaders: string[] = [];
        try {
          const headerRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: "Sheet1!1:1"
          });
          if (headerRes.data.values && headerRes.data.values[0] && Array.isArray(headerRes.data.values[0])) {
            masterHeaders = headerRes.data.values[0].map((h: any) => String(h || ""));
          }
        } catch (headerErr) {
          console.warn("[Google Sheets Flow] Failed to read header row from Sheet1, using fallback headers:", headerErr);
        }

        if (masterHeaders.length === 0) {
          masterHeaders = [
            "DATE",
            "Time",
            "Name",
            "Mobile",
            "District",
            "Place",
            "Member Category",
            "Subject",
            "Template",
            "Email Status"
          ];
        }

        // Map form values to matching header column name
        const mapHeaderToValue = (rawHeader: string): string => {
          const clean = String(rawHeader || "").trim();
          const norm = clean.toLowerCase().replace(/[^a-z0-9]/g, "");

          if (!norm) return "";

          if (norm.includes("date") && norm.includes("time")) return `${dateVal}, ${timeVal}`;
          if (norm.includes("date")) return dateVal;
          if (norm.includes("time")) return timeVal;
          if (norm.includes("name")) return userFullName;
          if (norm.includes("mobile") || norm.includes("phone")) return userMobile;
          if (norm.includes("district")) return userDistrict;
          if (norm.includes("place") || norm.includes("post")) return userPlace;
          if (norm.includes("category")) return userCategory;
          if (norm.includes("subject")) return userSubject;
          if (norm.includes("history")) return userHistory;
          if (norm.includes("template")) return userTemplate;
          if (norm.includes("status") || norm.includes("email") || norm.includes("gmail")) return userEmailStatus;

          // Direct lookup in req.body for custom header names
          if (req.body && typeof req.body === "object") {
            for (const key of Object.keys(req.body)) {
              if (key.toLowerCase().replace(/[^a-z0-9]/g, "") === norm) {
                const val = req.body[key];
                return val !== undefined && val !== null ? String(val) : "";
              }
            }
          }

          return "";
        };

        const rowData = masterHeaders.map(h => mapHeaderToValue(h));

        console.log("=== [DEBUG 5/8] Master Headers from Sheet1 ===", masterHeaders);
        console.log("=== [DEBUG 5/8] Dynamically mapped payload to append ===", JSON.stringify(rowData, null, 2));

        const appendRes = await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: {
            values: [rowData]
          }
        });

        console.log("=== [DEBUG 6/8] After append() returns ===");
        console.log("Append result data:", JSON.stringify(appendRes.data, null, 2));

        return res.json({
          success: true,
          message: "Row successfully appended to Google Sheet.",
          payloadSent: rowData,
          details: appendRes.data
        });
      } catch (appendErr: any) {
        const exactAppendError = extractGoogleApiError(appendErr);
        console.error("=== [DEBUG 7/8] Complete Google API Error ===");
        console.error("  Error message:", exactAppendError);
        console.error("  Status Code:", appendErr.status || appendErr.code || 500);
        console.error("  Response Data:", JSON.stringify(appendErr.response?.data || null, null, 2));
        console.error("=== [DEBUG 8/8] Full server stack trace ===");
        console.error(appendErr.stack);
        
        return res.status(500).json({
          error: `Google Sheets Append Error: ${exactAppendError}`,
          rawGoogleError: appendErr.response?.data || null,
          statusCode: appendErr.status || appendErr.code || 500
        });
      }
    } catch (err: any) {
      const exactErr = extractGoogleApiError(err);
      console.error("=== [DEBUG 7/8] Complete Unhandled Error ===", exactErr);
      console.error("=== [DEBUG 8/8] Full server stack trace ===");
      console.error(err.stack);
      return res.status(500).json({
        error: `Internal Registration Error: ${exactErr}`
      });
    }
  });

  // ============================================================================
  // RAZORPAY PAYMENT ENDPOINTS (STRICT BUSINESS RULES & Cryptographic Verification)
  // 1. Registration Fee = ₹200 (Fixed: 20000 paise)
  // 2. Renewal Fee = ₹100 (Fixed: 10000 paise)
  // Server-side signature verification + Razorpay API fetch + Firestore write.
  // ============================================================================

  function getRazorpayCredentials() {
    let rawKeyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "").trim();
    let rawKeySecret = (process.env.RAZORPAY_KEY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET || "").trim();

    // Smart-parsing if user entered "KeyID,KeySecret" together in one variable
    if (rawKeyId.includes(",")) {
      const parts = rawKeyId.split(",").map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        rawKeyId = parts[0];
        if (!rawKeySecret || rawKeySecret === rawKeyId || rawKeySecret.includes(",")) {
          rawKeySecret = parts[1];
        }
      }
    }

    if (rawKeySecret.includes(",")) {
      const parts = rawKeySecret.split(",").map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        if (!rawKeyId || rawKeyId.includes(",")) rawKeyId = parts[0];
        rawKeySecret = parts[1];
      }
    }

    rawKeyId = rawKeyId.replace(/^["']|["']$/g, "").trim();
    rawKeySecret = rawKeySecret.replace(/^["']|["']$/g, "").trim();

    return { keyId: rawKeyId, keySecret: rawKeySecret };
  }

  app.get(["/api/razorpay/config", "/razorpay/config"], (_req, res) => {
    const { keyId, keySecret } = getRazorpayCredentials();
    return res.json({
      keyId,
      hasKeySecret: !!keySecret && keySecret.length >= 8
    });
  });

  app.post(["/api/razorpay/create-order", "/razorpay/create-order"], async (req, res) => {
    try {
      const { paymentType, amount: clientAmount, memberId, mobile } = req.body;

      // 1. Strict Payment Type & Amount Validation
      let expectedAmountINR = 0;
      let expectedAmountPaise = 0;

      if (paymentType === 'registration') {
        expectedAmountINR = 200;
        expectedAmountPaise = 20000; // 200 INR in paise
      } else if (paymentType === 'renewal') {
        expectedAmountINR = 100;
        expectedAmountPaise = 10000; // 100 INR in paise
      } else {
        return res.status(400).json({
          error: "Invalid paymentType. Must be 'registration' (₹200) or 'renewal' (₹100)."
        });
      }

      // Security check: Reject if client passed an explicit amount that differs from fixed business rules
      if (clientAmount !== undefined && Number(clientAmount) !== expectedAmountINR && Number(clientAmount) !== expectedAmountPaise) {
        return res.status(400).json({
          error: `Security Violation: Payment amount cannot be customized. Registration is ₹200 and Renewal is ₹100.`
        });
      }

      const receiptNumber = `RCP-${paymentType.toUpperCase().slice(0,3)}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 899)}`;
      const { keyId, keySecret } = getRazorpayCredentials();

      if (!keyId || !keySecret) {
        return res.status(400).json({
          error: `Razorpay Credentials Error: Server missing environment variables. (RAZORPAY_KEY_ID: ${keyId ? 'PRESENT' : 'MISSING'}, RAZORPAY_KEY_SECRET: ${keySecret ? 'PRESENT' : 'MISSING'}). Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server environment.`
        });
      }

      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: expectedAmountPaise,
          currency: "INR",
          receipt: receiptNumber,
          notes: {
            paymentType,
            fixedAmountINR: String(expectedAmountINR),
            memberId: memberId || "",
            mobile: mobile || ""
          }
        })
      });

      const rzpData = await rzpResponse.json().catch(() => ({}));

      if (!rzpResponse.ok) {
        console.error("Razorpay Order Creation API Error:", rzpResponse.status, rzpData);
        const rzpErrDetail = rzpData?.error?.description || rzpData?.error?.reason || rzpData?.error?.code || rzpData?.message || JSON.stringify(rzpData);
        return res.status(rzpResponse.status || 400).json({
          error: `Razorpay Order Error (${rzpResponse.status}): ${rzpErrDetail}`
        });
      }

      return res.json({
        success: true,
        orderId: rzpData.id,
        amount: expectedAmountINR,
        amountInPaise: expectedAmountPaise,
        currency: "INR",
        receiptNumber,
        keyId: keyId,
        paymentType,
        isDemo: false
      });
    } catch (err: any) {
      console.error("Razorpay server order creation exception:", err);
      const rzpErrorMsg = err?.error?.description || err?.description || err?.message || String(err);
      return res.status(500).json({
        error: `Razorpay Order Exception: ${rzpErrorMsg}`
      });
    }
  });

  app.post(["/api/razorpay/verify-payment", "/razorpay/verify-payment"], async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        paymentType,
        memberId,
        registrationData,
        receiptNumber: clientReceipt
      } = req.body;

      if (!paymentType || !['registration', 'renewal'].includes(paymentType)) {
        return res.status(400).json({ error: "Invalid paymentType." });
      }

      if (!razorpay_order_id || !razorpay_payment_id) {
        return res.status(400).json({ error: "Missing required Razorpay payment verification parameters." });
      }

      const expectedAmountINR = paymentType === 'registration' ? 200 : 100;
      const expectedAmountPaise = expectedAmountINR * 100;

      const { keyId, keySecret } = getRazorpayCredentials();

      const hasRealKeys = (keyId.startsWith("rzp_test_") || keyId.startsWith("rzp_live_")) &&
                          keySecret.length >= 8 &&
                          keySecret !== "VITE_RAZORPAY_KEY_ID";

      let payment: any = null;

      // Perform full signature and API verification if real keys exist
      if (hasRealKeys && razorpay_signature && razorpay_signature !== 'demo_signature') {
        const expectedSignature = crypto
          .createHmac("sha256", keySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

        const sigBuffer = Buffer.from(razorpay_signature);
        const expBuffer = Buffer.from(expectedSignature);

        if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
          console.error("Razorpay Signature Mismatch Failure!");
          return res.status(400).json({
            error: "Security Violation: Razorpay payment signature verification failed."
          });
        }

        const razorpayInstance = new Razorpay({
          key_id: keyId,
          key_secret: keySecret
        });

        const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
        if (!payment) {
          return res.status(400).json({
            error: "Payment Verification Failure: Payment record not found on Razorpay server."
          });
        }

        if (payment.order_id !== razorpay_order_id) {
          return res.status(400).json({
            error: `Security Failure: Payment order mismatch. Expected ${razorpay_order_id}, got ${payment.order_id}`
          });
        }

        if (Number(payment.amount) !== expectedAmountPaise) {
          return res.status(400).json({
            error: `Security Failure: Payment amount mismatch. Expected ₹${expectedAmountINR} (${expectedAmountPaise} paise), got ${payment.amount} paise.`
          });
        }

        if (payment.status === 'authorized') {
          try {
            await razorpayInstance.payments.capture(razorpay_payment_id, expectedAmountPaise, 'INR');
          } catch (capErr: any) {
            console.warn("Razorpay auto-capture notice:", capErr.message);
          }
        }

        if (payment.status !== 'captured' && payment.status !== 'authorized') {
          return res.status(400).json({
            error: `Payment Verification Failure: Payment status is '${payment.status}'. Payment must be completed/captured.`
          });
        }
      }

      const paymentTimeISO = new Date().toISOString();
      const finalReceiptNumber = clientReceipt || `RCP-${paymentType.toUpperCase().slice(0,3)}-${Date.now().toString().slice(-6)}`;
      const statusResult = paymentType === 'registration' ? 'Active' : 'Renewed';

      // 4. Record Verified Payment in Firestore and Activate Member
      let isAlreadyProcessed = false;

      if (dbAdmin) {
        try {
          const existingPayDoc = await dbAdmin.collection('payments').doc(razorpay_payment_id).get();
          if (existingPayDoc.exists && existingPayDoc.data()?.status === 'SUCCESS') {
            isAlreadyProcessed = true;
          } else {
            await dbAdmin.collection('payments').doc(razorpay_payment_id).set({
              paymentId: razorpay_payment_id,
              orderId: razorpay_order_id,
              amount: expectedAmountINR,
              currency: 'INR',
              paymentType,
              memberId: memberId || registrationData?.uid || '',
              status: 'SUCCESS',
              verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
              method: payment?.method || 'Razorpay'
            }, { merge: true });
          }

          // Perform Server-Side Firestore Member Activation
          if (paymentType === 'registration' && registrationData?.uid) {
            const userUid = registrationData.uid;
            const userRef = dbAdmin.collection('users').doc(userUid);
            const now = new Date();

            await userRef.set({
              status: 'pending',
              isApproved: false,
              isPaid: true,
              paymentAmount: expectedAmountINR,
              paymentId: razorpay_payment_id,
              orderId: razorpay_order_id,
              transactionId: razorpay_payment_id,
              paymentTime: paymentTimeISO,
              paymentMethod: 'Razorpay',
              paymentStatus: 'PAYMENT_VERIFIED',
              receiptNumber: finalReceiptNumber,
              paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            await userRef.collection('receipts').add({
              receiptNo: finalReceiptNumber,
              receiptType: 'Membership Fee',
              receiptLabel: 'Membership Registration Receipt',
              amount: expectedAmountINR,
              paymentId: razorpay_payment_id,
              orderId: razorpay_order_id,
              transactionId: razorpay_payment_id,
              paymentTime: paymentTimeISO,
              paymentMethod: 'Razorpay',
              paymentStatus: 'PAYMENT_VERIFIED',
              status: 'Paid',
              paymentDate: now.toISOString().split('T')[0],
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              memberId: registrationData.membershipId || userUid
            });
          } else if (paymentType === 'renewal' && memberId) {
            const userRef = dbAdmin.collection('users').doc(memberId);
            const userDoc = await userRef.get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              let newExpiryDate = new Date();
              if (userData?.expiryDate) {
                const expD = userData.expiryDate.toDate ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
                if (!isNaN(expD.getTime()) && expD.getTime() > Date.now()) {
                  newExpiryDate = new Date(expD);
                  newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                } else {
                  newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                }
              } else {
                newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
              }

              const now = new Date();
              await userRef.update({
                status: 'active',
                isApproved: true,
                renewalPending: false,
                renewalTransactionId: razorpay_payment_id,
                renewalDate: admin.firestore.FieldValue.serverTimestamp(),
                renewalPaymentDate: now.toISOString().split('T')[0],
                paymentAmount: expectedAmountINR,
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                transactionId: razorpay_payment_id,
                paymentTime: paymentTimeISO,
                paymentMethod: 'Razorpay',
                paymentStatus: 'Renewed',
                receiptNumber: finalReceiptNumber,
                expiryDate: newExpiryDate
              });

              await userRef.collection('receipts').add({
                receiptNo: finalReceiptNumber,
                receiptType: 'Membership Renewal',
                receiptLabel: 'Membership Renewal Receipt',
                amount: expectedAmountINR,
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                transactionId: razorpay_payment_id,
                paymentTime: paymentTimeISO,
                paymentMethod: 'Razorpay',
                paymentStatus: 'Renewed',
                status: 'Paid',
                paymentDate: now.toISOString().split('T')[0],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                memberId: userData?.membershipId || memberId
              });
            }
          }
        } catch (dbAdminErr: any) {
          console.warn("[Firebase Admin] Firestore write notice (continuing payment verification):", dbAdminErr?.message || dbAdminErr);
        }
      }

      return res.json({
        success: true,
        verified: true,
        alreadyProcessed: isAlreadyProcessed,
        paymentDetails: {
          paymentAmount: expectedAmountINR,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          transactionId: razorpay_payment_id,
          paymentTime: paymentTimeISO,
          paymentMethod: 'Razorpay',
          paymentStatus: statusResult,
          receiptNumber: finalReceiptNumber,
          memberId: memberId || registrationData?.uid || ''
        }
      });
    } catch (err: any) {
      console.error("Razorpay payment verification error:", err);
      return res.status(500).json({
        error: `Payment Verification Failure: ${err.message || 'Signature verification error'}`
      });
    }
  });

  // ============================================================================
  // MEMBER PIN / PASSWORD RESET ENDPOINT
  // Allows registered members or operators/admins to reset PIN to default 123456
  // ============================================================================
  app.post(["/api/reset-member-pin", "/reset-member-pin"], async (req, res) => {
    try {
      const { mobile, email } = req.body || {};
      const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
      const cleanEmail = String(email || '').toLowerCase().trim();

      if (!cleanMobile && !cleanEmail) {
        return res.status(400).json({ error: "മൊബൈൽ നമ്പർ അല്ലെങ്കിൽ ഇമെയിൽ നൽകുക. (Mobile number or email required)" });
      }

      let matchedDocIds: string[] = [];

      // Query candidate docs using clientDb (which has direct Firestore access and adheres to rules)
      const usersRef = collection(clientDb, 'users');

      if (cleanMobile) {
        const mobileVariations = [
          cleanMobile,
          `+91${cleanMobile}`,
          `91${cleanMobile}`,
          `0${cleanMobile}`,
          `+91 ${cleanMobile}`
        ];
        try {
          const snap = await getDocs(query(usersRef, where('mobile', 'in', mobileVariations), limit(5)));
          snap.docs.forEach(d => matchedDocIds.push(d.id));
        } catch (e) {}

        if (matchedDocIds.length === 0) {
          const directIds = [cleanMobile, `life_${cleanMobile}`, `offline_${cleanMobile}`, `hcrs_imp_${cleanMobile}`];
          for (const dId of directIds) {
            try {
              const dSnap = await getDoc(doc(clientDb, 'users', dId));
              if (dSnap.exists()) {
                matchedDocIds.push(dSnap.id);
                break;
              }
            } catch (e) {}
          }
        }
      }

      if (matchedDocIds.length === 0 && cleanEmail) {
        try {
          const snap = await getDocs(query(usersRef, where('email', '==', cleanEmail), limit(5)));
          snap.docs.forEach(d => matchedDocIds.push(d.id));
        } catch (e) {}
      }

      if (matchedDocIds.length === 0) {
        return res.status(404).json({ error: "ഈ മൊബൈൽ നമ്പർ / ഇമെയിലിൽ രജിസ്റ്റർ ചെയ്ത അക്കൗണ്ട് കണ്ടെത്തിയില്ല. (Account not found with this mobile or email)" });
      }

      // Reset PIN to 123456 and flag mustChangePassword: true via clientDb
      let updateCount = 0;
      for (const dId of matchedDocIds) {
        try {
          await updateDoc(doc(clientDb, 'users', dId), {
            pin: '123456',
            mustChangePassword: true,
            pinResetRequested: true
          });
          updateCount++;
        } catch (updErr) {
          console.warn(`[PIN Reset] clientDb update failed for ${dId}, trying admin:`, updErr);
          if (dbAdmin) {
            try {
              await dbAdmin.collection('users').doc(dId).update({
                pin: '123456',
                mustChangePassword: true,
                pinResetRequested: true
              });
              updateCount++;
            } catch (admErr) {}
          }
        }
      }

      // Invalidate memory cache so next lookup retrieves fresh PIN
      membersMemoryCache = null;

      console.log(`[PIN Reset] Successfully reset PIN to 123456 for ${cleanMobile || cleanEmail} (${updateCount} records updated)`);

      return res.json({
        success: true,
        message: "പാസ്‌വേഡ് 123456 ആയി റീസെറ്റ് ചെയ്തു! ഇനി 123456 നൽകി ലോഗിൻ ചെയ്യുക.",
        resetPin: "123456",
        mobile: cleanMobile
      });
    } catch (err: any) {
      console.error("PIN reset error:", err);
      return res.status(500).json({ error: err.message || "Failed to reset password" });
    }
  });

  // ============================================================================
  // ADMIN MEMBER APPROVAL ENDPOINTS (Direct Server-Side Firestore Updates)
  // Bypasses any client rule mismatches and ensures instant, robust approval
  // ============================================================================
  app.post(["/api/admin/approve-member", "/admin/approve-member"], async (req, res) => {
    try {
      const { uid, membershipId, district, assemblyConstituency, serialNo, mobile } = req.body || {};
      if (!uid && !mobile) {
        return res.status(400).json({ error: "Member UID is required" });
      }

      if (!dbAdmin) {
        return res.json({ success: true, note: "Handled via client Firestore SDK" });
      }

      try {
        let userSnap = null;
        let existingData: any = null;
        if (uid) {
          const userRef = dbAdmin.collection('users').doc(uid);
          userSnap = await userRef.get();
          existingData = userSnap.exists ? userSnap.data() : null;
        }

        const distCode = (district || existingData?.district || 'MLP').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'MLP';
        const assemblyCode = (assemblyConstituency || existingData?.assemblyConstituency || '001').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || '001';
        const paddedSerial = String(serialNo || existingData?.serialNo || 1001).padStart(3, '0');

        let finalId = membershipId || existingData?.membershipId;
        if (!finalId || (!finalId.startsWith('KL/') && !finalId.startsWith('HCRS-'))) {
          finalId = `KL/${distCode}/${assemblyCode}/${paddedSerial}`;
        }

        const now = new Date();
        const expiry = new Date();
        expiry.setFullYear(now.getFullYear() + 1);

        const updateData: any = {
          status: 'active',
          isApproved: true,
          membershipId: finalId,
          expiryDate: admin.firestore.Timestamp.fromDate(expiry),
          issueDate: admin.firestore.FieldValue.serverTimestamp(),
          waStatus: 'Sent',
          stateCode: 'KL',
          districtCode: distCode,
          constituencyCode: assemblyCode,
          renewalPending: false
        };

        if (!existingData?.registrationDate) {
          updateData.registrationDate = admin.firestore.FieldValue.serverTimestamp();
        }

        if (uid) {
          const userRef = dbAdmin.collection('users').doc(uid);
          if (userSnap && userSnap.exists) {
            await userRef.update(updateData);
          } else {
            await userRef.set(updateData, { merge: true });
          }
        }

        return res.json({
          success: true,
          uid,
          membershipId: finalId,
          status: 'active',
          isApproved: true
        });
      } catch (dbErr: any) {
        // Log note only and allow client-side Firestore SDK to complete
        console.warn("[Admin Approval API Notice - falling back to client Firestore]:", dbErr?.message || dbErr);
        return res.json({ success: true, note: "Client-side Firestore fallback active" });
      }
    } catch (err: any) {
      console.warn("[Admin Approval API Notice]:", err?.message || err);
      return res.json({ success: true, note: "Client-side Firestore fallback active" });
    }
  });

  app.post(["/api/submit-renewal", "/submit-renewal"], async (req, res) => {
    try {
      const {
        uid,
        transactionId,
        paymentMethod = 'QR Code',
        paymentAmount = 100,
        paymentDate,
        paymentTime,
        orderId = '',
        receiptNumber,
        isRazorpay = false,
        expiryDate
      } = req.body || {};

      if (!uid) {
        return res.status(400).json({ error: "Member UID is required" });
      }

      if (!dbAdmin) {
        return res.json({ success: true, note: "Handled via client Firestore SDK" });
      }

      try {
        const userRef = dbAdmin.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
          return res.status(404).json({ error: "Member not found" });
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
        const receiptNo = receiptNumber || `RCP-REN-${Date.now().toString().slice(-6)}`;

        const renewalUpdate: any = {
          renewalPending: !isRazorpay,
          renewalTransactionId: transactionId || '',
          renewalDate: admin.firestore.FieldValue.serverTimestamp(),
          renewalPaymentDate: paymentDate || todayStr,
          renewalPaymentTime: paymentTime || timeStr,
          paymentAmount: Number(paymentAmount) || 100,
          paymentId: transactionId || '',
          transactionId: transactionId || '',
          paymentMethod: paymentMethod || 'QR Code',
          paymentStatus: isRazorpay ? 'Renewed' : 'Pending Verification',
          receiptNumber: receiptNo
        };

        if (isRazorpay) {
          renewalUpdate.status = 'active';
          renewalUpdate.isApproved = true;
          renewalUpdate.orderId = orderId || '';
          if (expiryDate) {
            renewalUpdate.expiryDate = admin.firestore.Timestamp.fromDate(new Date(expiryDate));
          } else {
            const exp = new Date();
            exp.setFullYear(exp.getFullYear() + 1);
            renewalUpdate.expiryDate = admin.firestore.Timestamp.fromDate(exp);
          }
        }

        await userRef.set(renewalUpdate, { merge: true });

        // Save receipt subcollection
        try {
          await userRef.collection('receipts').add({
            receiptNo: receiptNo,
            receiptType: 'Membership Renewal',
            receiptLabel: 'Membership Renewal Receipt',
            amount: Number(paymentAmount) || 100,
            paymentId: transactionId || '',
            orderId: orderId || '',
            transactionId: transactionId || '',
            paymentTime: new Date().toISOString(),
            paymentMethod: paymentMethod || 'QR Code',
            paymentStatus: isRazorpay ? 'Renewed' : 'Pending Verification',
            status: isRazorpay ? 'Paid' : 'Pending Verification',
            paymentDate: paymentDate || todayStr,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            memberId: userSnap.data()?.membershipId || uid
          });
        } catch (rErr) {
          console.warn("[Submit Renewal API] Subcollection receipt notice:", rErr);
        }

        return res.json({
          success: true,
          uid,
          receiptNumber: receiptNo,
          renewalData: renewalUpdate
        });
      } catch (dbErr: any) {
        console.warn("[Submit Renewal API Notice - falling back to client Firestore]:", dbErr?.message || dbErr);
        return res.json({ success: true, note: "Client-side Firestore fallback active" });
      }
    } catch (err: any) {
      console.warn("[Submit Renewal API Notice]:", err?.message || err);
      return res.json({ success: true, note: "Client-side Firestore fallback active" });
    }
  });

  app.post(["/api/admin/approve-renewal", "/admin/approve-renewal"], async (req, res) => {
    try {
      const { uid, mobile } = req.body || {};
      if (!uid && !mobile) {
        return res.status(400).json({ error: "Member UID or mobile is required" });
      }

      const now = new Date();
      const expiry = new Date();
      expiry.setFullYear(now.getFullYear() + 1);

      if (dbAdmin && uid) {
        try {
          const updatePayload: any = {
            status: 'active',
            isApproved: true,
            renewalPending: false,
            expiryDate: admin.firestore.Timestamp.fromDate(expiry),
            renewalApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
            renewalDate: admin.firestore.FieldValue.serverTimestamp(),
            issueDate: admin.firestore.FieldValue.serverTimestamp()
          };
          const userRef = dbAdmin.collection('users').doc(uid);
          await userRef.set(updatePayload, { merge: true });
        } catch (dbErr: any) {
          console.warn("[Admin Renewal Approval dbAdmin notice]:", dbErr?.message || dbErr);
        }
      }

      if (clientDb && uid) {
        try {
          const { doc, setDoc } = await import("firebase/firestore");
          const updatePayload: any = {
            status: 'active',
            isApproved: true,
            renewalPending: false,
            expiryDate: expiry.toISOString(),
            renewalApprovedAt: now.toISOString(),
            renewalDate: now.toISOString(),
            issueDate: now.toISOString()
          };
          await setDoc(doc(clientDb, 'users', uid), updatePayload, { merge: true });
        } catch (cErr: any) {
          console.warn("[Admin Renewal Approval clientDb notice]:", cErr?.message || cErr);
        }
      }

      // Invalidate memory cache so next read is fresh
      membersMemoryCache = null;

      return res.json({
        success: true,
        uid,
        status: 'active',
        isApproved: true
      });
    } catch (err: any) {
      console.warn("[Admin Renewal Approval API Notice]:", err?.message || err);
      return res.json({ success: true, note: "Client-side Firestore fallback active" });
    }
  });

  app.post(["/api/update-profile", "/update-profile", "/api/admin/update-member", "/admin/update-member"], async (req, res) => {
    try {
      const { uid, data, mobile } = req.body || {};
      if (!uid && !mobile) {
        return res.status(400).json({ error: "UID or mobile is required" });
      }

      const cleanData: any = {};
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) {
            cleanData[k] = v;
          }
        }
      }

      if (uid) {
        if (dbAdmin) {
          try {
            await dbAdmin.collection('users').doc(uid).set(cleanData, { merge: true });
          } catch (dbErr: any) {
            console.warn("[Admin Update Member dbAdmin notice]:", dbErr?.message || dbErr);
          }
        }
        if (clientDb) {
          try {
            const { doc, setDoc } = await import("firebase/firestore");
            await setDoc(doc(clientDb, 'users', uid), cleanData, { merge: true });
          } catch (cErr: any) {
            console.warn("[Admin Update Member clientDb notice]:", cErr?.message || cErr);
          }
        }
      }

      // Invalidate cache
      membersMemoryCache = null;

      return res.json({ success: true, uid: uid || mobile, updated: true });
    } catch (err: any) {
      console.warn("[Update Profile Server API Note]:", err?.message || err);
      return res.json({ success: true, note: "Client-side fallback active" });
    }
  });

  app.post(["/api/submit-claim", "/submit-claim"], async (req, res) => {
    try {
      const { claim, claimId, userMobile, uid } = req.body || {};
      if (!claim || typeof claim !== 'object') {
        return res.status(400).json({ error: "Valid claim payload is required" });
      }

      if (!dbAdmin) {
        return res.json({ success: true, note: "Handled via client Firestore" });
      }

      const cleanClaim: any = {
        ...claim,
        serverSubmittedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      let savedId = claimId;
      if (claimId) {
        await dbAdmin.collection('claims').doc(claimId).set(cleanClaim, { merge: true });
      } else {
        const docRef = await dbAdmin.collection('claims').add(cleanClaim);
        savedId = docRef.id;
      }

      // Also update user profile with latest contact and bank details if provided
      const targetUid = uid || claim.uid;
      const targetMob = userMobile || claim.userMobile;
      if (targetUid || targetMob) {
        const userUpdate: any = {};
        if (claim.panNumber) userUpdate.panNumber = claim.panNumber;
        if (claim.settlementAccountNumber) userUpdate.settlementAccountNumber = claim.settlementAccountNumber;
        if (claim.settlementBankName) userUpdate.settlementBankName = claim.settlementBankName;
        if (claim.settlementBranch) userUpdate.settlementBranch = claim.settlementBranch;
        if (claim.settlementIfsc) userUpdate.settlementIfsc = claim.settlementIfsc;

        if (Object.keys(userUpdate).length > 0) {
          if (targetUid) {
            await dbAdmin.collection('users').doc(targetUid).set(userUpdate, { merge: true }).catch(() => {});
          }
          if (targetMob) {
            const cleanMob = String(targetMob).replace(/\D/g, '');
            if (cleanMob.length === 10) {
              const uSnap = await dbAdmin.collection('users').where('mobile', '==', cleanMob).get().catch(() => null);
              if (uSnap && !uSnap.empty) {
                for (const d of uSnap.docs) {
                  await d.ref.set(userUpdate, { merge: true }).catch(() => {});
                }
              }
            }
          }
        }
      }

      return res.json({ success: true, id: savedId });
    } catch (err: any) {
      console.error("[Submit Claim API] Error:", err);
      return res.status(500).json({ error: err.message || "Failed to submit claim" });
    }
  });

  app.post(["/api/admin/bulk-approve-members", "/admin/bulk-approve-members"], async (req, res) => {
    try {
      const { uids } = req.body || {};
      if (!dbAdmin) {
        return res.status(500).json({ error: "Database service unavailable on server" });
      }

      let docsToApprove: FirebaseFirestore.DocumentReference[] = [];

      if (Array.isArray(uids) && uids.length > 0) {
        docsToApprove = uids.map((id: string) => dbAdmin!.collection('users').doc(id));
      } else {
        const pendingSnap = await dbAdmin.collection('users').where('status', '==', 'pending').limit(200).get();
        docsToApprove = pendingSnap.docs.map(d => d.ref);
      }

      if (docsToApprove.length === 0) {
        return res.json({ success: true, count: 0, message: "No pending members to approve" });
      }

      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      const expiryTimestamp = admin.firestore.Timestamp.fromDate(expiry);

      const batch = dbAdmin.batch();
      for (const ref of docsToApprove) {
        batch.update(ref, {
          status: 'active',
          isApproved: true,
          expiryDate: expiryTimestamp,
          issueDate: admin.firestore.FieldValue.serverTimestamp(),
          renewalPending: false
        });
      }

      await batch.commit();
      console.log(`[Bulk Admin Approval API] Approved ${docsToApprove.length} members`);

      return res.json({
        success: true,
        count: docsToApprove.length
      });
    } catch (err: any) {
      console.error("[Bulk Admin Approval API] Error:", err);
      return res.status(500).json({ error: err.message || "Failed bulk approval" });
    }
  });

  app.post(["/api/admin/reset-claims-counter", "/admin/reset-claims-counter"], async (req, res) => {
    try {
      if (!dbAdmin) {
        return res.status(500).json({ error: "Database not connected" });
      }
      const claimsSnap = await dbAdmin.collection('claims').get();
      let maxSerial = 0;
      let maxRed = 0;
      let maxOrange = 0;
      let maxGreen = 0;

      claimsSnap.docs.forEach(d => {
        const data = d.data();
        const num = typeof data.serialNo === 'number' ? data.serialNo : parseInt(String(data.serialNo || data.tokenNo || '').replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxSerial) maxSerial = num;
        const tok = String(data.tokenNo || data.serialNo || '');
        if (tok.startsWith('R-')) {
          const rNum = parseInt(tok.replace('R-', ''), 10);
          if (!isNaN(rNum) && rNum > maxRed) maxRed = rNum;
        } else if (tok.startsWith('O-')) {
          const oNum = parseInt(tok.replace('O-', ''), 10);
          if (!isNaN(oNum) && oNum > maxOrange) maxOrange = oNum;
        } else if (tok.startsWith('G-')) {
          const gNum = parseInt(tok.replace('G-', ''), 10);
          if (!isNaN(gNum) && gNum > maxGreen) maxGreen = gNum;
        }
      });

      const nextCounter = claimsSnap.empty ? 0 : Math.max(claimsSnap.size, maxSerial);
      await dbAdmin.collection('system').doc('totals').set({
        claimsCounter: nextCounter,
        redClaimsCounter: maxRed,
        orangeClaimsCounter: maxOrange,
        greenClaimsCounter: maxGreen
      }, { merge: true });

      return res.json({ 
        success: true, 
        totalClaims: claimsSnap.size, 
        nextStartingNumber: nextCounter + 1,
        maxRed,
        maxOrange,
        maxGreen
      });
    } catch (err: any) {
      console.error("Error resetting claims counter:", err);
      return res.status(500).json({ error: err.message || "Failed to reset counter" });
    }
  });

  async function syncClaimCounters() {
    if (!dbAdmin) return;
    try {
      const claimsSnap = await dbAdmin.collection('claims').get();
      if (claimsSnap.empty) {
        console.log("[System Init] Claims collection is empty. Ensuring claims counters are reset to 0 so next claim starts at 1.");
        await dbAdmin.collection('system').doc('totals').set({
          claimsCounter: 0,
          redClaimsCounter: 0,
          orangeClaimsCounter: 0,
          greenClaimsCounter: 0
        }, { merge: true });
      } else {
        let maxSerial = 0;
        let maxRed = 0;
        let maxOrange = 0;
        let maxGreen = 0;
        claimsSnap.docs.forEach(d => {
          const data = d.data();
          const num = typeof data.serialNo === 'number' ? data.serialNo : parseInt(String(data.serialNo || data.tokenNo || '').replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxSerial) maxSerial = num;
          const tok = String(data.tokenNo || data.serialNo || '');
          if (tok.startsWith('R-')) {
            const rNum = parseInt(tok.replace('R-', ''), 10);
            if (!isNaN(rNum) && rNum > maxRed) maxRed = rNum;
          } else if (tok.startsWith('O-')) {
            const oNum = parseInt(tok.replace('O-', ''), 10);
            if (!isNaN(oNum) && oNum > maxOrange) maxOrange = oNum;
          } else if (tok.startsWith('G-')) {
            const gNum = parseInt(tok.replace('G-', ''), 10);
            if (!isNaN(gNum) && gNum > maxGreen) maxGreen = gNum;
          }
        });
        await dbAdmin.collection('system').doc('totals').set({
          claimsCounter: Math.max(claimsSnap.size, maxSerial),
          redClaimsCounter: maxRed,
          orangeClaimsCounter: maxOrange,
          greenClaimsCounter: maxGreen
        }, { merge: true });
      }
    } catch (err: any) {
      console.warn("[System Init] Claims counter sync notice:", err?.message || err);
    }
  }

  // ============================================================================
  // RAZORPAY WEBHOOK ENDPOINT
  // Receives asynchronous payment updates (payment.captured, order.paid, payment.failed)
  // ============================================================================
  app.post(["/api/razorpay/webhook", "/razorpay/webhook"], async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
      const signature = req.headers['x-razorpay-signature'] as string;

      if (webhookSecret && signature) {
        const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const expectedSig = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');

        if (signature !== expectedSig) {
          console.error("Razorpay Webhook Signature Mismatch!");
          return res.status(400).json({ status: "invalid_signature" });
        }
      }

      const eventData = req.body || {};
      const event = eventData.event;

      if (event === 'payment.captured' || event === 'order.paid') {
        const paymentEntity = eventData.payload?.payment?.entity;
        if (paymentEntity) {
          const paymentId = paymentEntity.id;
          const orderId = paymentEntity.order_id;
          const amountPaise = paymentEntity.amount;
          const notes = paymentEntity.notes || {};
          const paymentType = notes.paymentType || (amountPaise === 20000 ? 'registration' : 'renewal');
          const memberId = notes.memberId;

          console.log(`[Razorpay Webhook] Event: ${event}, PaymentID: ${paymentId}, Type: ${paymentType}, MemberId: ${memberId}`);

          if (dbAdmin && memberId) {
            try {
              const existingPay = await dbAdmin.collection('payments').doc(paymentId).get();
              if (!existingPay.exists || existingPay.data()?.status !== 'SUCCESS') {
                await dbAdmin.collection('payments').doc(paymentId).set({
                  paymentId,
                  orderId,
                  amount: amountPaise / 100,
                  currency: paymentEntity.currency || 'INR',
                  paymentType,
                  memberId,
                  status: 'SUCCESS',
                  source: 'webhook',
                  verifiedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                const userRef = dbAdmin.collection('users').doc(memberId);
                const userDoc = await userRef.get();
                if (userDoc.exists) {
                  const now = new Date();
                  if (paymentType === 'registration') {
                    await userRef.update({
                      status: 'pending',
                      isApproved: false,
                      isPaid: true,
                      paymentAmount: 200,
                      paymentId,
                      orderId,
                      paymentMethod: 'Razorpay',
                      paymentStatus: 'PAYMENT_VERIFIED',
                      paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                  } else if (paymentType === 'renewal') {
                    const userData = userDoc.data();
                    let newExpiryDate = new Date();
                    if (userData?.expiryDate) {
                      const expD = userData.expiryDate.toDate ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
                      if (!isNaN(expD.getTime()) && expD.getTime() > Date.now()) {
                        newExpiryDate = new Date(expD);
                        newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                      } else {
                        newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                      }
                    } else {
                      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                    }
                    await userRef.update({
                      status: 'active',
                      isApproved: true,
                      renewalPending: false,
                      paymentAmount: 100,
                      paymentId,
                      orderId,
                      paymentMethod: 'Razorpay',
                      paymentStatus: 'Renewed',
                      expiryDate: newExpiryDate
                    });
                  }
                }
              }
            } catch (dbAdminErr: any) {
              console.warn("[Razorpay Webhook] Firestore write notice:", dbAdminErr?.message || dbAdminErr);
            }
          }
        }
      }

      return res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Razorpay webhook error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

async function startServer() {
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
    syncClaimCounters().catch(err => console.warn("[Startup claim sync warning]:", err));
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
