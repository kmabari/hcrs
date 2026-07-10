import React, { useState, useEffect } from "react";
import { 
  Plus, Trash2, Edit2, ArrowUp, ArrowDown, Check, X, 
  AlertTriangle, Mail, Layers, Power, PowerOff, Info, Save,
  Image as ImageIcon, FileText, Settings, HelpCircle, Eye, Archive, RotateCcw
} from "lucide-react";
import { 
  CampaignTemplate, addCampaignTemplate, updateCampaignTemplate, 
  deleteCampaignTemplate, subscribeToCampaignTemplates,
  JanamailConfig, subscribeToJanamailConfig, updateJanamailConfig
} from "../lib/cms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CampaignTemplateManager() {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation Sub Tabs state
  const [subTab, setSubTab] = useState<"details" | "templates">("templates");

  // Global Campaign Settings State
  const [config, setConfig] = useState<JanamailConfig | null>(null);
  const [configRecipients, setConfigRecipients] = useState("");
  const [configCc, setConfigCc] = useState("");
  const [configActive, setConfigActive] = useState(true);

  // Remaining Campaign Management Sections State
  const [artworkUrl, setArtworkUrl] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignTagline, setCampaignTagline] = useState("");
  const [campaignIntroduction, setCampaignIntroduction] = useState("");
  const [whyThisCampaign, setWhyThisCampaign] = useState("");
  const [importantNotice, setImportantNotice] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [confirmations, setConfirmations] = useState<string[]>(["", "", "", ""]);
  const [faqItems, setFaqItems] = useState<{ question: string; answer: string }[]>([]);
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [writeMyOwnEnabled, setWriteMyOwnEnabled] = useState(true);
  const [campaignStatus, setCampaignStatus] = useState<"draft" | "live" | "completed" | "disabled">("live");
  const [emailMode, setEmailMode] = useState<"templates" | "custom" | "both">("both");
  const [mainNoticeTitle, setMainNoticeTitle] = useState("");
  const [whyCampaignHeading, setWhyCampaignHeading] = useState("");
  const [confirmationSectionTitle, setConfirmationSectionTitle] = useState("");
  const [confirmationSectionDescription, setConfirmationSectionDescription] = useState("");

  // Section saving states
  const [savingBannerSettings, setSavingBannerSettings] = useState(false);
  const [savingCampaignTitle, setSavingCampaignTitle] = useState(false);
  const [savingCampaignIntroduction, setSavingCampaignIntroduction] = useState(false);
  const [savingImportantNotice, setSavingImportantNotice] = useState(false);
  const [savingTermsAndConditions, setSavingTermsAndConditions] = useState(false);
  const [savingDisclaimer, setSavingDisclaimer] = useState(false);
  const [savingFAQ, setSavingFAQ] = useState(false);

  // Inline templates editor state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tempSubject, setTempSubject] = useState("");
  const [tempBody, setTempBody] = useState("");
  const [tempName, setTempName] = useState("");
  const [savingInlineTemplateId, setSavingInlineTemplateId] = useState<string | null>(null);

  // Inline Add New Pair form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSubject, setAddSubject] = useState("");
  const [addBody, setAddBody] = useState("");
  const [addName, setAddName] = useState("");
  const [savingNewPair, setSavingNewPair] = useState(false);

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // State for FAQ Manager inline operations
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [editingFaqIdx, setEditingFaqIdx] = useState<number | null>(null);
  const [editingFaqQuestion, setEditingFaqQuestion] = useState("");
  const [editingFaqAnswer, setEditingFaqAnswer] = useState("");

  // Status message state
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showStatus = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  useEffect(() => {
    const unsubscribeTemplates = subscribeToCampaignTemplates((items) => {
      // Sort items by priority
      const sorted = [...items].sort((a, b) => (a.priority || 0) - (b.priority || 0));
      setTemplates(sorted);
      setLoading(false);
    });
    
    const unsubscribeConfig = subscribeToJanamailConfig((conf) => {
      setConfig(conf);
      setConfigRecipients(conf.recipients || "");
      setConfigCc(conf.cc || "");
      setConfigActive(conf.active !== undefined ? conf.active : true);
      
      setCampaignName(conf.campaignName || "Operation Janamail");
      setCampaignTagline(conf.campaignTagline || "");
      setArtworkUrl(conf.artworkUrl || "");
      setCampaignIntroduction(conf.campaignIntroduction || "");
      setWhyThisCampaign(conf.whyThisCampaign || "");
      setImportantNotice(conf.importantNotice || "");
      setTermsAndConditions(conf.termsAndConditions || "");
      setDisclaimer(conf.disclaimer || "");
      setThankYouMessage(conf.thankYouMessage || "");
      setWriteMyOwnEnabled(conf.writeMyOwnEnabled !== undefined ? conf.writeMyOwnEnabled : true);
      const statusFromConf = conf.campaignStatus || "live";
      setCampaignStatus(statusFromConf === "disabled" ? "completed" : statusFromConf);
      setEmailMode(conf.emailMode || "both");
      setMainNoticeTitle(conf.mainNoticeTitle || "Operation Janamail – പ്രധാന അറിയിപ്പ്");
      setWhyCampaignHeading(conf.whyCampaignHeading || "എന്തുകൊണ്ടാണ് Operation Janamail?");
      setConfirmationSectionTitle(conf.confirmationSectionTitle || "സ്ഥിരീകരണം (Mandatory)");
      setConfirmationSectionDescription(conf.confirmationSectionDescription || "");

      const confTexts = conf.confirmations || ["", "", "", ""];
      const paddedConf = [...confTexts];
      while (paddedConf.length < 4) paddedConf.push("");
      setConfirmations(paddedConf);
      setFaqItems(conf.faqItems || []);
    });

    return () => {
      unsubscribeTemplates();
      unsubscribeConfig();
    };
  }, []);

  // Artwork Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showStatus("Only image files are supported.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showStatus("Image is too large. Keep it under 2MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setArtworkUrl(event.target.result as string);
        showStatus("Artwork uploaded. Remember to click Save Banner Settings!", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showStatus("Image is too large. Keep it under 2MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setArtworkUrl(event.target.result as string);
        showStatus("Artwork uploaded. Remember to click Save Banner Settings!", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  // FAQ CRUD handlers
  const handleAddFaq = () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      showStatus("Please fill in both Question and Answer fields.", "error");
      return;
    }
    setFaqItems([...faqItems, { question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() }]);
    setNewFaqQuestion("");
    setNewFaqAnswer("");
    showStatus("FAQ item added. Remember to click Save FAQs!", "success");
  };

  const handleStartEditFaq = (idx: number) => {
    setEditingFaqIdx(idx);
    setEditingFaqQuestion(faqItems[idx].question);
    setEditingFaqAnswer(faqItems[idx].answer);
  };

  const handleSaveEditFaq = (idx: number) => {
    if (!editingFaqQuestion.trim() || !editingFaqAnswer.trim()) {
      showStatus("FAQ Question and Answer cannot be empty.", "error");
      return;
    }
    const updated = [...faqItems];
    updated[idx] = { question: editingFaqQuestion.trim(), answer: editingFaqAnswer.trim() };
    setFaqItems(updated);
    setEditingFaqIdx(null);
    showStatus("FAQ updated. Remember to click Save FAQs!", "success");
  };

  const handleDeleteFaq = (idx: number) => {
    const updated = faqItems.filter((_, i) => i !== idx);
    setFaqItems(updated);
    showStatus("FAQ deleted. Remember to click Save FAQs!", "success");
  };

  const handleMoveFaqUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...faqItems];
    const temp = updated[idx];
    updated[idx] = updated[idx - 1];
    updated[idx - 1] = temp;
    setFaqItems(updated);
  };

  const handleMoveFaqDown = (idx: number) => {
    if (idx === faqItems.length - 1) return;
    const updated = [...faqItems];
    const temp = updated[idx];
    updated[idx] = updated[idx + 1];
    updated[idx + 1] = temp;
    setFaqItems(updated);
  };

  // Section Save Handlers
  const handleSaveBannerSettings = async () => {
    setSavingBannerSettings(true);
    try {
      await updateJanamailConfig({
        campaignStatus,
        active: configActive,
        emailMode,
        artworkUrl,
      });
      showStatus("Banner Settings saved successfully!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to save Banner Settings.", "error");
    } finally {
      setSavingBannerSettings(false);
    }
  };

  const handleSaveCampaignTitle = async () => {
    setSavingCampaignTitle(true);
    try {
      await updateJanamailConfig({
        campaignName: campaignName.trim(),
        campaignTagline: campaignTagline.trim(),
        recipients: configRecipients.trim(),
        cc: configCc.trim(),
      });
      showStatus("Campaign Title & Settings saved successfully!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to save Campaign Title & Settings.", "error");
    } finally {
      setSavingCampaignTitle(false);
    }
  };

  const handleSaveCampaignIntroduction = async () => {
    setSavingCampaignIntroduction(true);
    try {
      await updateJanamailConfig({
        campaignIntroduction: campaignIntroduction.trim(),
        whyCampaignHeading: whyCampaignHeading.trim(),
        whyThisCampaign: whyThisCampaign.trim(),
      });
      showStatus("Campaign Introduction saved successfully!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to save Campaign Introduction.", "error");
    } finally {
      setSavingCampaignIntroduction(false);
    }
  };

  const handleSaveImportantNotice = async () => {
    setSavingImportantNotice(true);
    try {
      await updateJanamailConfig({
        mainNoticeTitle: mainNoticeTitle.trim(),
        importantNotice: importantNotice.trim(),
        thankYouMessage: thankYouMessage.trim(),
      });
      showStatus("Important Notice & Thank You message saved!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to save Important Notice.", "error");
    } finally {
      setSavingImportantNotice(false);
    }
  };

  const handleSaveTermsAndConditions = async () => {
    setSavingTermsAndConditions(true);
    try {
      await updateJanamailConfig({
        termsAndConditions: termsAndConditions.trim(),
        confirmationSectionTitle: confirmationSectionTitle.trim(),
        confirmationSectionDescription: confirmationSectionDescription.trim(),
        confirmations: confirmations.map(c => c.trim()),
      });
      showStatus("Terms & Confirmation Checklist saved!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to save Terms & Confirmation.", "error");
    } finally {
      setSavingTermsAndConditions(false);
    }
  };

  const handleSaveDisclaimer = async () => {
    setSavingDisclaimer(true);
    try {
      await updateJanamailConfig({
        disclaimer: disclaimer.trim(),
      });
      showStatus("Disclaimer saved successfully!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to save Disclaimer.", "error");
    } finally {
      setSavingDisclaimer(false);
    }
  };

  const handleSaveFAQ = async () => {
    setSavingFAQ(true);
    try {
      await updateJanamailConfig({
        faqItems,
      });
      showStatus("FAQ items saved successfully!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to save FAQ items.", "error");
    } finally {
      setSavingFAQ(false);
    }
  };

  // Inline template actions
  const handleStartEditTemplate = (template: CampaignTemplate) => {
    if (!template.id) return;
    setEditingTemplateId(template.id);
    setTempSubject(template.subject || "");
    setTempBody(template.body || "");
    setTempName(template.name || "");
  };

  const handleSaveInlineTemplate = async (id: string) => {
    if (!tempSubject.trim() || !tempBody.trim()) {
      showStatus("Subject and Email Body cannot be empty.", "error");
      return;
    }
    setSavingInlineTemplateId(id);
    try {
      await updateCampaignTemplate(id, {
        name: tempName.trim() || tempSubject.trim().substring(0, 40),
        subject: tempSubject.trim(),
        body: tempBody.trim()
      });
      setEditingTemplateId(null);
      showStatus("Subject & Email pair updated successfully!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to update template.", "error");
    } finally {
      setSavingInlineTemplateId(null);
    }
  };

  const handleToggleArchiveTemplate = async (template: CampaignTemplate) => {
    if (!template.id) return;
    try {
      const newStatus = !template.active;
      await updateCampaignTemplate(template.id, {
        active: newStatus
      });
      showStatus(newStatus ? "Template restored and activated!" : "Template archived/disabled!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to change template status.", "error");
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name || "this pair"}"?`)) {
      return;
    }
    try {
      await deleteCampaignTemplate(id);
      showStatus("Template deleted successfully!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to delete template.", "error");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const t1 = templates[index];
    const t2 = templates[index - 1];
    if (!t1.id || !t2.id) return;
    try {
      const tempPriority = t1.priority;
      await updateCampaignTemplate(t1.id, { priority: t2.priority });
      await updateCampaignTemplate(t2.id, { priority: tempPriority });
    } catch (error) {
      console.error(error);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === templates.length - 1) return;
    const t1 = templates[index];
    const t2 = templates[index + 1];
    if (!t1.id || !t2.id) return;
    try {
      const tempPriority = t1.priority;
      await updateCampaignTemplate(t1.id, { priority: t2.priority });
      await updateCampaignTemplate(t2.id, { priority: tempPriority });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateNewPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSubject.trim() || !addBody.trim()) {
      showStatus("Subject and Body are required to create a pair.", "error");
      return;
    }
    setSavingNewPair(true);
    try {
      const nextPriority = templates.length > 0 
        ? Math.max(...templates.map(t => t.priority || 0)) + 1 
        : 1;

      const templateLabel = addName.trim() || addSubject.trim().substring(0, 40);

      await addCampaignTemplate({
        name: templateLabel,
        subject: addSubject.trim(),
        body: addBody.trim(),
        active: true,
        priority: nextPriority
      });

      setAddSubject("");
      setAddBody("");
      setAddName("");
      setShowAddForm(false);
      showStatus("New Subject + Body pair added successfully!", "success");
    } catch (error) {
      console.error(error);
      showStatus("Failed to create new template pair.", "error");
    } finally {
      setSavingNewPair(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {statusMessage && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl border text-xs font-black text-left flex items-center justify-between shadow-lg max-w-sm ${
          statusMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
        </div>
      )}
      
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-xs">
        <div className="space-y-2 text-left">
          <div className="inline-flex items-center gap-2 bg-brand-magenta/10 text-brand-magenta px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-brand-magenta/10">
            <Layers className="w-3.5 h-3.5" />
            Janamail Operations Desk
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            OPERATION JANAMAIL CMS
          </h2>
          <p className="text-xs text-slate-500 font-semibold max-w-xl">
            Configure global narrative settings, and manage subject/email body pairs instantly. Use the sub-tabs below to toggle between views.
          </p>
        </div>

        {/* Sub Navigation Segmented Control */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto shrink-0 border border-slate-200/50">
          <button
            onClick={() => setSubTab("templates")}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              subTab === "templates"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ✉️ Subject Management ({templates.length})
          </button>
          <button
            onClick={() => setSubTab("details")}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              subTab === "details"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ⚙️ Campaign Settings
          </button>
        </div>
      </div>

      {/* RENDER CAMPAIGN SETTINGS SUB-TAB */}
      {subTab === "details" && (
        <div className="space-y-8 text-left">
          
          {/* 1. Banner Settings Card */}
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white border border-slate-100">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-brand-magenta" />
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Banner Settings & Status
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 font-semibold">
                Set campaign status, global availability, and edit official artwork illustration.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campaign Status */}
                <div className="space-y-3">
                  <Label className="font-black text-slate-700 text-xs uppercase tracking-wider block">
                    Campaign Status (ക്യാമ്പയിൻ്റെ നിലവിലെ നില)
                  </Label>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    Set state: Draft restricts users, Active / Live opens the petition, and Completed concludes the operation.
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { value: "draft", label: "Draft", desc: "നിർമ്മാണത്തിൽ", activeColor: "bg-amber-500 border-amber-500 text-white" },
                      { value: "live", label: "Active / Live", desc: "സജീവം", activeColor: "bg-emerald-600 border-emerald-600 text-white" },
                      { value: "completed", label: "Completed", desc: "പൂർത്തിയായി", activeColor: "bg-red-600 border-red-600 text-white" }
                    ].map((statusObj) => (
                      <button
                        key={statusObj.value}
                        type="button"
                        onClick={() => setCampaignStatus(statusObj.value as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          campaignStatus === statusObj.value
                            ? statusObj.activeColor + " shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-wider">{statusObj.label}</span>
                        <span className={`text-[8px] font-bold mt-0.5 uppercase ${campaignStatus === statusObj.value ? "text-white/90" : "text-slate-400"}`}>
                          {statusObj.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Mode Dropdown */}
                <div className="space-y-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                  <div>
                    <Label className="font-black text-slate-700 text-xs uppercase tracking-wide cursor-pointer select-none">
                      Email Compose Mode (ഇമെയിൽ സമർപ്പണ രീതി)
                    </Label>
                    <p className="text-[11px] text-slate-500 leading-normal font-semibold mt-1">
                      Determine if users must use templates, write their own custom emails from scratch, or get both options.
                    </p>
                  </div>
                  <select
                    value={emailMode}
                    onChange={(e) => setEmailMode(e.target.value as any)}
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-brand-magenta/10 font-bold text-slate-700 leading-normal cursor-pointer"
                  >
                    <option value="templates">Option A: Reference Templates (Default)</option>
                    <option value="custom">Option B: Write My Own Email</option>
                    <option value="both">Option C: Both (Select template OR write custom)</option>
                  </select>
                </div>
              </div>

              {/* Artwork Section Inline */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                <div className="space-y-3">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider block">
                    Upload/Replace Banner Image File
                  </Label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-[20px] p-6 text-center flex flex-col items-center justify-center min-h-[160px] transition-all cursor-pointer ${
                      isDragOver 
                        ? "border-brand-magenta bg-brand-magenta/5 text-brand-magenta" 
                        : "border-slate-200 bg-slate-50/50 hover:border-slate-300 text-slate-500"
                    }`}
                    onClick={() => document.getElementById("artwork-file-input")?.click()}
                  >
                    <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                    <span className="text-xs font-black uppercase tracking-wide text-slate-700">Drag & Drop Image Here</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">or click to browse files</span>
                    <input
                      id="artwork-file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="artwork-url-fallback" className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">
                      Or Paste External Image URL
                    </Label>
                    <Input
                      id="artwork-url-fallback"
                      placeholder="https://example.com/banner.jpg"
                      value={artworkUrl}
                      onChange={e => setArtworkUrl(e.target.value)}
                      className="bg-slate-50 border-slate-200 h-10 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Banner Preview */}
                <div className="space-y-2 flex flex-col justify-between">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Artwork Preview</Label>
                  <div className="border border-slate-200 bg-slate-50 rounded-[20px] p-3 flex items-center justify-center min-h-[140px] relative overflow-hidden">
                    {artworkUrl ? (
                      <img src={artworkUrl} alt="Artwork Preview" className="max-h-[110px] object-contain rounded-lg" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Banner Uploaded</span>
                    )}
                  </div>
                  {artworkUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setArtworkUrl("")}
                      className="h-8 text-[10px] font-black uppercase text-red-500 hover:bg-red-50"
                    >
                      Clear Image
                    </Button>
                  )}
                </div>
              </div>

              {/* Enable Globally Toggle */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <input 
                  type="checkbox"
                  id="config-active-check"
                  checked={configActive}
                  onChange={e => setConfigActive(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-magenta focus:ring-brand-magenta/20 cursor-pointer"
                />
                <label htmlFor="config-active-check" className="text-xs font-black text-slate-700 uppercase tracking-wide cursor-pointer select-none">
                  Enable Campaign Globally (പൊതു ഹർജി സജീവം ആക്കുക - Active)
                </label>
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSaveBannerSettings}
                  disabled={savingBannerSettings}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4.5 h-auto rounded-xl flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  {savingBannerSettings ? "Saving Banner Settings..." : "Save Banner Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. Campaign Identity Card */}
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white border border-slate-100">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-brand-magenta" />
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Campaign Title & Targets
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 font-semibold">
                Set the main brand title, Malayalam subtext, and recipient targets.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Campaign Title</Label>
                  <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} className="bg-slate-50 h-11 rounded-xl text-xs font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Campaign Tagline</Label>
                  <Input value={campaignTagline} onChange={e => setCampaignTagline(e.target.value)} className="bg-slate-50 h-11 rounded-xl text-xs font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Default Target Recipients</Label>
                  <Input value={configRecipients} onChange={e => setConfigRecipients(e.target.value)} className="bg-slate-50 h-11 rounded-xl text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">CC Emails</Label>
                  <Input value={configCc} onChange={e => setConfigCc(e.target.value)} className="bg-slate-50 h-11 rounded-xl text-xs font-mono" />
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSaveCampaignTitle}
                  disabled={savingCampaignTitle}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4.5 h-auto rounded-xl flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  {savingCampaignTitle ? "Saving..." : "Save Campaign Title"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 3. Campaign Narrative Card */}
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white border border-slate-100">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-brand-magenta" />
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Campaign Introduction & Narrative
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 font-semibold">
                Manage Malayalam narrative panels detailing why this campaign exists.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Campaign Introduction (ക്യാമ്പയിൻ ആമുഖം)</Label>
                <textarea rows={3} value={campaignIntroduction} onChange={e => setCampaignIntroduction(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium focus:bg-white outline-none transition-all" />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">"Why Operation Janamail?" Heading</Label>
                <Input value={whyCampaignHeading} onChange={e => setWhyCampaignHeading(e.target.value)} className="bg-slate-50 h-11 rounded-xl text-xs font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Why This Campaign Narrative Content</Label>
                <textarea rows={4} value={whyThisCampaign} onChange={e => setWhyThisCampaign(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium focus:bg-white outline-none transition-all" />
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSaveCampaignIntroduction}
                  disabled={savingCampaignIntroduction}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4.5 h-auto rounded-xl flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  {savingCampaignIntroduction ? "Saving..." : "Save Campaign Introduction"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 4. Important Notice Card */}
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white border border-slate-100">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <div className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-brand-magenta" />
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Important Notice & Thank You Message
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 font-semibold">
                Set up urgent safety alerts and custom final completion text.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Main Notice Title (പ്രധാന അറിയിപ്പ് തലക്കെട്ട്)</Label>
                <Input value={mainNoticeTitle} onChange={e => setMainNoticeTitle(e.target.value)} className="bg-slate-50 h-11 rounded-xl text-xs font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Important Notice Narrative Content (അടിയന്തര നിർദ്ദേശം)</Label>
                <textarea rows={3} value={importantNotice} onChange={e => setImportantNotice(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium focus:bg-white outline-none transition-all" />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Thank You Message (നന്ദി അറിയിപ്പ് സന്ദേശം)</Label>
                <textarea rows={2} value={thankYouMessage} onChange={e => setThankYouMessage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:bg-white outline-none transition-all" />
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSaveImportantNotice}
                  disabled={savingImportantNotice}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4.5 h-auto rounded-xl flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  {savingImportantNotice ? "Saving..." : "Save Important Notice"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 5. Terms & Confirmations Card */}
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white border border-slate-100">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <div className="flex items-center gap-2.5">
                <Check className="w-5 h-5 text-brand-magenta" />
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Terms & Confirmation Checklist
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 font-semibold">
                Configure explicit consent validation messages that users must checklist tick.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Terms & Conditions Text (ഉപയോഗ നിബന്ധനകൾ)</Label>
                <textarea rows={4} value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium focus:bg-white outline-none transition-all" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Confirmation Section Title</Label>
                  <Input value={confirmationSectionTitle} onChange={e => setConfirmationSectionTitle(e.target.value)} className="bg-slate-50 h-11 rounded-xl text-xs font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Confirmation Section Description (optional)</Label>
                  <textarea rows={2} value={confirmationSectionDescription} onChange={e => setConfirmationSectionDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:bg-white outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">Mandatory Consent Checkbox Labels (Ticked by users before Submit)</Label>
                {confirmations.map((confText, index) => (
                  <div key={index} className="space-y-1.5">
                    <Label className="text-[10px] text-slate-500 font-semibold">Checkbox {index + 1} Label {index === 3 && "(Optional)"}</Label>
                    <Input
                      value={confText}
                      placeholder={`Enter custom checkbox message ${index + 1}`}
                      onChange={e => {
                        const updated = [...confirmations];
                        updated[index] = e.target.value;
                        setConfirmations(updated);
                      }}
                      className="bg-slate-50 h-11 rounded-xl text-xs font-semibold"
                    />
                  </div>
                ))}
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSaveTermsAndConditions}
                  disabled={savingTermsAndConditions}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4.5 h-auto rounded-xl flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  {savingTermsAndConditions ? "Saving..." : "Save Terms & Conditions"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 6. Disclaimer Card */}
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white border border-slate-100">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-brand-magenta" />
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Disclaimer Settings
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 font-semibold">
                Set up disclaimers ensuring responsible petition delivery.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Disclaimer Text (നിയമപരമായ ഡീക്ലെയിമർ)</Label>
                <textarea rows={4} value={disclaimer} onChange={e => setDisclaimer(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium focus:bg-white outline-none transition-all" />
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSaveDisclaimer}
                  disabled={savingDisclaimer}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4.5 h-auto rounded-xl flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  {savingDisclaimer ? "Saving Disclaimer..." : "Save Disclaimer"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 7. FAQ Manager Card */}
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white border border-slate-100">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-brand-magenta" />
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800">
                  FAQ Manager
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 font-semibold">
                Manage, add, and reorder guide questions for user validation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-250 pb-1.5">Create New FAQ Item</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Question (ചോദ്യം)</Label>
                    <Input placeholder="Enter FAQ Question" value={newFaqQuestion} onChange={e => setNewFaqQuestion(e.target.value)} className="bg-white h-10.5 rounded-xl text-xs font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Answer (ഉത്തരം)</Label>
                    <Input placeholder="Enter FAQ Answer" value={newFaqAnswer} onChange={e => setNewFaqAnswer(e.target.value)} className="bg-white h-10.5 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={handleAddFaq} className="bg-slate-800 hover:bg-slate-950 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 h-auto rounded-xl flex items-center gap-1.5 cursor-pointer">
                    <Plus className="w-4 h-4 stroke-[2.5]" /> Add FAQ Item
                  </Button>
                </div>
              </div>

              {/* FAQ List */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">FAQ List ({faqItems.length})</h5>
                {faqItems.length === 0 ? (
                  <div className="text-center py-10 text-slate-300 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-[10px] font-black uppercase">No FAQ items defined</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {faqItems.map((item, idx) => (
                      <div key={idx} className="border border-slate-150 bg-slate-50/50 p-4 rounded-xl flex items-start gap-4 justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          {editingFaqIdx === idx ? (
                            <div className="space-y-3 bg-white p-3 border rounded-xl">
                              <Input value={editingFaqQuestion} onChange={e => setEditingFaqQuestion(e.target.value)} className="h-9 text-xs font-bold" />
                              <textarea value={editingFaqAnswer} onChange={e => setEditingFaqAnswer(e.target.value)} rows={2} className="w-full bg-slate-50 border p-2 text-xs rounded-lg outline-none" />
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" onClick={() => setEditingFaqIdx(null)} className="h-7 text-[9px] uppercase">Cancel</Button>
                                <Button size="sm" onClick={() => handleSaveEditFaq(idx)} className="h-7 text-[9px] uppercase bg-brand-magenta text-white">Save</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-slate-200 text-slate-700 text-[8px] font-black">Q{idx + 1}</Badge>
                                <p className="text-xs font-black text-slate-800 uppercase">{item.question}</p>
                              </div>
                              <p className="text-[11px] text-slate-500 pl-8 font-semibold">{item.answer}</p>
                            </>
                          )}
                        </div>

                        {editingFaqIdx !== idx && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button type="button" onClick={() => handleMoveFaqUp(idx)} disabled={idx === 0} className="p-1 bg-white border border-slate-200 text-slate-400 disabled:opacity-30 rounded-md"><ArrowUp className="w-3 h-3" /></button>
                            <button type="button" onClick={() => handleMoveFaqDown(idx)} disabled={idx === faqItems.length - 1} className="p-1 bg-white border border-slate-200 text-slate-400 disabled:opacity-30 rounded-md"><ArrowDown className="w-3 h-3" /></button>
                            <button type="button" onClick={() => handleStartEditFaq(idx)} className="p-1 bg-white border border-slate-200 text-slate-600 hover:text-brand-magenta rounded-md"><Edit2 className="w-3 h-3" /></button>
                            <button type="button" onClick={() => handleDeleteFaq(idx)} className="p-1 bg-white border border-red-100 text-red-500 hover:bg-red-50 rounded-md"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSaveFAQ}
                  disabled={savingFAQ}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4.5 h-auto rounded-xl flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  {savingFAQ ? "Saving FAQs..." : "Save FAQs"}
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* RENDER DYNAMIC TEMPLATES SUB-TAB (Unified Pairs Manager) */}
      {subTab === "templates" && (
        <div className="space-y-8 text-left">
          
          {/* Add New Subject Form Switcher Card */}
          <Card className="border-none shadow-sm rounded-[32px] bg-white border border-slate-100 p-6 md:p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand-magenta" />
                  Subject Management System
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                  Add and configure unlimited email subjects, each mapped to its own dynamic email body.
                </p>
              </div>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-brand-magenta hover:bg-brand-magenta/90 text-white font-black text-xs uppercase tracking-widest px-6 py-4 h-auto rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
              >
                {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 animate-pulse" />}
                {showAddForm ? "Cancel" : "+ Add Subject"}
              </Button>
            </div>

            {showAddForm && (
              <form onSubmit={handleCreateNewPair} className="border-t border-slate-100 pt-6 space-y-5 animate-in slide-in-from-top-4 duration-200">
                <div className="space-y-1.5">
                  <Label htmlFor="add-pair-subject" className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Email Subject (വിഷയം) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="add-pair-subject"
                    required
                    placeholder="Enter email subject line (e.g., ഹൈറിച്ച് തട്ടിപ്പ് കേസ്: ഇരകൾക്ക് നീതി ആവശ്യപ്പെട്ട് ഹർജി)"
                    value={addSubject}
                    onChange={e => setAddSubject(e.target.value)}
                    className="bg-slate-50 border-slate-200 h-11 rounded-xl text-xs font-bold leading-normal"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-9 space-y-1.5">
                    <Label htmlFor="add-pair-body" className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                      Email Body Template (കത്തിന്റെ ഉള്ളടക്കം) <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="add-pair-body"
                      required
                      rows={8}
                      placeholder="Type the main Malayalam petition content here..."
                      value={addBody}
                      onChange={e => setAddBody(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium focus:bg-white focus:ring-1 focus:ring-brand-magenta outline-none transition-all resize-y font-sans leading-relaxed"
                    />
                  </div>
                  <div className="lg:col-span-3 space-y-3 bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-brand-magenta" /> Dynamic Fields
                    </span>
                    <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                      Use these placeholders inside the email body text. They will automatically fill in on the petition:
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex flex-col"><code className="text-[9px] bg-brand-magenta/10 text-brand-magenta font-black px-1.5 py-0.5 rounded self-start">{"{name}"}</code><span className="text-[8px] text-slate-400 font-bold">User's Name</span></div>
                      <div className="flex flex-col"><code className="text-[9px] bg-brand-magenta/10 text-brand-magenta font-black px-1.5 py-0.5 rounded self-start">{"{phone}"}</code><span className="text-[8px] text-slate-400 font-bold">User's Phone</span></div>
                      <div className="flex flex-col"><code className="text-[9px] bg-brand-magenta/10 text-brand-magenta font-black px-1.5 py-0.5 rounded self-start">{"{address}"}</code><span className="text-[8px] text-slate-400 font-bold">User's Location</span></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="add-pair-label" className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Template Admin Label (optional - if left empty, will use Subject)
                  </Label>
                  <Input
                    id="add-pair-label"
                    placeholder="e.g. Demand Action Template"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    className="bg-slate-50 border-slate-200 h-11 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="h-11 px-5 rounded-xl border-slate-200 text-xs font-black uppercase"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingNewPair}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider px-6 py-4.5 h-11 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {savingNewPair ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Unified Scalable List of Pairs */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8 min-h-[400px]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Registered Email Subjects ({templates.length})
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Each subject maps directly to its own linked email body
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <span className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-brand-magenta animate-spin mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Loading Templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 text-center">
                <AlertTriangle className="w-12 h-12 mb-3 opacity-20 text-brand-magenta" />
                <p className="font-black uppercase tracking-widest text-[10px]">No Subject + Body Pairs Found</p>
                <Button onClick={() => setShowAddForm(true)} className="mt-4 bg-slate-100 hover:bg-slate-250 text-slate-700 h-10 px-4 rounded-lg font-bold text-xs uppercase">
                  Add First Pair
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {templates.map((template, idx) => {
                  const isEditingInline = editingTemplateId === template.id;
                  const isArchived = !template.active;

                  return (
                    <div 
                      key={template.id} 
                      className={`bg-slate-50/40 border border-slate-150 p-6 md:p-8 rounded-[24px] flex flex-col gap-5 transition-all hover:border-brand-magenta/15 relative ${
                        isArchived ? "opacity-60 bg-slate-100/30" : ""
                      }`}
                    >
                      {/* Card Header Info */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-150/70 pb-3">
                        <div className="flex items-center gap-2.5">
                          <Badge className="bg-slate-200 hover:bg-slate-200 text-slate-700 font-mono text-[9px] font-bold px-2.5 py-1">
                            Pair #{idx + 1} (Priority {template.priority})
                          </Badge>
                          {template.name && template.name !== template.subject && (
                            <span className="text-xs font-bold text-slate-400 uppercase truncate max-w-[200px]">
                              [{template.name}]
                            </span>
                          )}
                          {isArchived ? (
                            <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Archived / Disabled
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Active / Enabled
                            </Badge>
                          )}
                        </div>

                        {/* Priority Shift / Move buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 disabled:opacity-30 rounded-lg cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === templates.length - 1}
                            className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 disabled:opacity-30 rounded-lg cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* INLINE EDIT MODE */}
                      {isEditingInline ? (
                        <div className="space-y-4 animate-in fade-in duration-150">
                          {/* Label input */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Admin Label (for internal search)</Label>
                            <Input
                              value={tempName}
                              onChange={e => setTempName(e.target.value)}
                              className="h-10 text-xs font-bold bg-white"
                            />
                          </div>

                          {/* Subject Line Input */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Subject Line (വിഷയം)</Label>
                            <Input
                              value={tempSubject}
                              onChange={e => setTempSubject(e.target.value)}
                              className="h-10 text-xs font-black bg-white leading-normal"
                            />
                          </div>

                          {/* Arrow down separator icon */}
                          <div className="flex justify-center my-1 text-slate-400">
                            <ArrowDown className="w-4 h-4 animate-pulse stroke-[3.5]" />
                          </div>

                          {/* Email Body textarea */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Email Body Template (കത്തിന്റെ ഉള്ളടക്കം)</Label>
                            <textarea
                              rows={8}
                              value={tempBody}
                              onChange={e => setTempBody(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-medium focus:ring-1 focus:ring-brand-magenta outline-none transition-all font-sans leading-relaxed"
                            />
                          </div>

                          {/* Inline Action Save / Cancel buttons */}
                          <div className="flex gap-2.5 justify-end pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEditingTemplateId(null)}
                              className="h-10 text-xs font-black uppercase rounded-lg px-4 border-slate-200 text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              disabled={savingInlineTemplateId === template.id}
                              onClick={() => template.id && handleSaveInlineTemplate(template.id)}
                              className="h-10 text-xs font-black uppercase rounded-lg px-6 bg-slate-800 text-white hover:bg-slate-900 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5 mr-1" />
                              {savingInlineTemplateId === template.id ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* INLINE VIEW MODE */
                        <div className="space-y-4">
                          {/* Subject display */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 text-left shadow-xs">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-brand-magenta" />
                              Subject Line Line
                            </p>
                            <p className="text-xs md:text-sm font-extrabold text-slate-700 leading-normal">
                              {template.subject}
                            </p>
                          </div>

                          {/* Arrow separator icon */}
                          <div className="flex justify-center text-slate-400">
                            <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                          </div>

                          {/* Body preview (truncated) */}
                          <div className="bg-amber-50/25 p-5 rounded-xl border border-slate-150 text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <FileText className="w-3 h-3 text-amber-600" />
                              Email Body Template Preview
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap">
                              {template.body}
                            </p>
                          </div>

                          {/* View Mode Action Triggers */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-150/70">
                            <div className="flex items-center gap-2">
                              {/* Edit triggers inline form right on the card */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEditTemplate(template)}
                                className="h-9 px-3 gap-1 rounded-lg border-slate-200 text-slate-600 hover:text-brand-magenta hover:bg-slate-50 text-[10px] font-black uppercase cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </Button>

                              {/* Toggle active / archive state */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleArchiveTemplate(template)}
                                className={`h-9 px-3 gap-1.5 rounded-lg text-[10px] font-black uppercase ${
                                  template.active 
                                    ? "border-amber-200 text-amber-700 hover:bg-amber-50" 
                                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                }`}
                              >
                                {template.active ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                {template.active ? "Archive" : "Restore / Activate"}
                              </Button>
                            </div>

                            {/* Delete Pair */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => template.id && handleDeleteTemplate(template.id, template.name)}
                              className="h-9 px-3 gap-1 rounded-lg border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 text-[10px] font-black uppercase"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
