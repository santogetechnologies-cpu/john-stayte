import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { HelpCircle, Plus, Edit3, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export const ALL_EXISTING_FAQS = [
  {
    q: "Do you deliver to my area?",
    a: "We cover Gloucestershire and surrounding counties within a 40-mile radius of our Whitminster depot, including Stroud, Dursley, Gloucester, Cheltenham, Cirencester, Tewkesbury, and the Forest of Dean.",
    category: "Delivery",
    is_active: true,
    display_order: 1,
  },
  {
    q: "How fast is delivery?",
    a: "Orders placed before 2pm on working days are delivered next working day across our core route schedule.",
    category: "Delivery",
    is_active: true,
    display_order: 2,
  },
  {
    q: "Can I exchange an empty cylinder?",
    a: "Yes — simply hand over your matching empty cylinder to our driver on delivery or swap it immediately at any of our three filling stations in Fromebridge, Cambridge, or Frampton on Severn.",
    category: "Cylinders",
    is_active: true,
    display_order: 3,
  },
  {
    q: "Do you offer trade and commercial accounts?",
    a: "Yes. We supply pubs, restaurants, holiday parks, farms, roofers, and industrial workshops with volume discounts, automated replenishment schedules, and 30-day credit invoicing.",
    category: "Commercial",
    is_active: true,
    display_order: 4,
  },
  {
    q: "What if I don't have an empty cylinder to exchange?",
    a: "New cylinder agreements incur a standard one-off cylinder refill agreement fee. Once you have a bottle, you only pay for the gas refill upon future exchanges.",
    category: "Cylinders",
    is_active: true,
    display_order: 5,
  },
  {
    q: "Are your smokeless fuels Defra Ready to Burn approved?",
    a: "Yes, 100% of our domestic coals and manufactured ovals are fully certified Ready to Burn and compliant with UK clean air legislation for Smoke Control Areas.",
    category: "Fuel",
    is_active: true,
    display_order: 6,
  },
];

export function AdminFaqsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [faqs, setFaqs] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");
  const [displayOrder, setDisplayOrder] = useState("1");
  const [isActive, setIsActive] = useState(true);

  const loadFaqs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("cms_content_blocks")
        .select("content")
        .eq("section_key", "faqs_data")
        .maybeSingle();

      let parsed: any[] = [];
      if (data?.content) {
        try {
          const res = JSON.parse(data.content);
          if (Array.isArray(res) && res.length > 0) parsed = res;
        } catch {}
      }

      const map = new Map<string, any>();
      ALL_EXISTING_FAQS.forEach((f) => map.set((f.q || "").toLowerCase(), f));
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((f) => map.set((f.q || f.question || "").toLowerCase(), f));
      }

      setFaqs(Array.from(map.values()));
    } catch (err: any) {
      console.error("Failed to load FAQs:", err);
      setFaqs(ALL_EXISTING_FAQS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const saveFaqsToSupabase = async (updatedList: any[]) => {
    try {
      window.dispatchEvent(new CustomEvent("cms_faqs_updated", { detail: updatedList }));

      const payload = {
        section_key: "faqs_data",
        title: "Customer Frequently Asked Questions",
        content: JSON.stringify(updatedList),
      };

      await supabase
        .from("cms_content_blocks")
        .upsert(payload, { onConflict: "section_key" });
    } catch (err) {
      console.warn("FAQ sync notice:", err);
    }
  };

  const openCreateModal = () => {
    setEditingFaq(null);
    setQuestion("");
    setAnswer("");
    setCategory("General");
    setDisplayOrder(String(faqs.length + 1));
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (f: any) => {
    setEditingFaq(f);
    setQuestion(f.q || f.question || "");
    setAnswer(f.a || f.answer || "");
    setCategory(f.category || "General");
    setDisplayOrder(String(f.display_order || 1));
    setIsActive(f.is_active !== false);
    setModalOpen(true);
  };

  const handleSaveFaq = async () => {
    if (!question.trim()) return toast.error("FAQ question is required.");
    if (!answer.trim()) return toast.error("FAQ answer is required.");

    setSaving(true);
    try {
      const faqItem = {
        q: question.trim(),
        question: question.trim(),
        a: answer.trim(),
        answer: answer.trim(),
        category: category.trim() || "General",
        display_order: parseInt(displayOrder) || 1,
        is_active: isActive,
      };

      let updatedList: any[] = [];
      if (editingFaq) {
        const oldQ = (editingFaq.q || editingFaq.question || "").toLowerCase();
        updatedList = faqs.map((f) => ((f.q || f.question || "").toLowerCase() === oldQ ? faqItem : f));
      } else {
        updatedList = [...faqs, faqItem];
      }

      setFaqs(updatedList);
      await saveFaqsToSupabase(updatedList);

      await logAdminAuditAction(editingFaq ? "UPDATE_FAQ" : "CREATE_FAQ", "faqs", faqItem.q, { question: faqItem.q });
      toast.success(editingFaq ? "FAQ updated successfully!" : "New FAQ added successfully!");
      setModalOpen(false);
    } catch (err: any) {
      toast.error("Failed to save FAQ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActiveStatus = async (f: any) => {
    try {
      const currentQ = (f.q || f.question || "").toLowerCase();
      const updatedList = faqs.map((item) => {
        if ((item.q || item.question || "").toLowerCase() === currentQ) {
          return { ...item, is_active: !item.is_active };
        }
        return item;
      });

      setFaqs(updatedList);
      await saveFaqsToSupabase(updatedList);
      toast.success("FAQ visibility status toggled!");
    } catch (err: any) {
      toast.error("Failed to toggle FAQ status: " + err.message);
    }
  };

  const handleDeleteFaq = async (f: any) => {
    const currentQ = (f.q || f.question || "");
    if (!confirm(`Are you sure you want to delete FAQ "${currentQ}"?`)) return;

    try {
      const qLower = currentQ.toLowerCase();
      const updatedList = faqs.filter((item) => (item.q || item.question || "").toLowerCase() !== qLower);
      setFaqs(updatedList);
      await saveFaqsToSupabase(updatedList);

      await logAdminAuditAction("DELETE_FAQ", "faqs", currentQ, { question: currentQ });
      toast.success("FAQ deleted!");
    } catch (err: any) {
      toast.error("Failed to delete FAQ: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">FAQ Management</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage customer frequently asked questions, delivery coverage notes, and fuel advice ({faqs.length} active questions).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateModal} className="rounded-full shadow-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs">
            <Plus className="h-4 w-4" /> Add FAQ
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="surface-card rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-4">Question & Answer</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {faqs.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 max-w-md">
                      <p className="font-bold text-slate-900">
                        {typeof (f.q || f.question) === "string" ? (f.q || f.question) : String(f.q || f.question || "")}
                      </p>
                      <p className="text-slate-500 text-[11px] line-clamp-2 mt-1 leading-relaxed">
                        {typeof (f.a || f.answer) === "string" ? (f.a || f.answer) : String(f.a || f.answer || "")}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {typeof f.category === "string" ? f.category : "General"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-mono">
                      #{f.display_order || i + 1}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleActiveStatus(f)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          f.is_active !== false
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${f.is_active !== false ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {f.is_active !== false ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(f)} className="h-7 w-7 p-0 rounded-full text-slate-600 hover:text-slate-900">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteFaq(f)} className="h-7 w-7 p-0 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-7">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {editingFaq ? "Edit FAQ" : "Add FAQ Question"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-xs font-bold">Question</Label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Do you deliver to my area?"
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Answer</Label>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                placeholder="Provide detailed, clear customer response..."
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Delivery / Cylinders / Fuel"
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Display Order</Label>
                <Input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  className="mt-1 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-slate-700">Display on Website</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSaveFaq} disabled={saving} className="rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingFaq ? "Save Changes" : "Create FAQ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
