import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { HelpCircle, Plus, Edit3, Trash2, Loader2 } from "lucide-react";
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

      if (data?.content) {
        try {
          const parsed = JSON.parse(data.content);
          setFaqs(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setFaqs([]);
        }
      } else {
        setFaqs([]);
      }
    } catch (err: any) {
      toast.error("Failed to load FAQs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const saveFaqsToSupabase = async (updatedList: any[]) => {
    const payload = {
      section_key: "faqs_data",
      title: "Customer Frequently Asked Questions",
      content: JSON.stringify(updatedList),
    };

    const { error } = await supabase
      .from("cms_content_blocks")
      .upsert(payload, { onConflict: "section_key" });

    if (error) throw error;
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
      let updatedList = [...faqs];
      if (editingFaq) {
        updatedList = updatedList.map((item) =>
          item.id === editingFaq.id
            ? {
                ...item,
                q: question.trim(),
                a: answer.trim(),
                category: category.trim(),
                display_order: Number(displayOrder),
                is_active: isActive,
              }
            : item
        );
        await logAdminAuditAction("UPDATE_FAQ", "faq", editingFaq.id, { question });
        toast.success("FAQ updated in Supabase!");
      } else {
        const newFaq = {
          id: "faq_" + Date.now(),
          q: question.trim(),
          a: answer.trim(),
          category: category.trim(),
          display_order: Number(displayOrder),
          is_active: isActive,
          created_at: new Date().toISOString(),
        };
        updatedList.push(newFaq);
        await logAdminAuditAction("CREATE_FAQ", "faq", newFaq.id, { question });
        toast.success("New FAQ added to Supabase!");
      }

      await saveFaqsToSupabase(updatedList);
      setFaqs(updatedList);
      setModalOpen(false);
    } catch (err: any) {
      toast.error("Failed to save FAQ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleFaqStatus = async (f: any) => {
    try {
      const updatedList = faqs.map((item) =>
        item.id === f.id ? { ...item, is_active: !(item.is_active !== false) } : item
      );
      await saveFaqsToSupabase(updatedList);
      setFaqs(updatedList);
      toast.success("FAQ status toggled!");
    } catch (err: any) {
      toast.error("Failed to toggle FAQ status: " + err.message);
    }
  };

  const handleDeleteFaq = async (id: string, qText: string) => {
    if (!confirm(`Are you sure you want to delete FAQ "${qText}"?`)) return;
    try {
      const updatedList = faqs.filter((item) => item.id !== id);
      await saveFaqsToSupabase(updatedList);
      setFaqs(updatedList);
      await logAdminAuditAction("DELETE_FAQ", "faq", id, { question: qText });
      toast.success("FAQ deleted!");
    } catch (err: any) {
      toast.error("Failed to delete FAQ: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">FAQs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <HelpCircle className="h-7 w-7 text-primary" /> Customer FAQs CMS
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage customer help center questions and delivery guidelines in Supabase.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="rounded-full font-extrabold text-xs gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-white shrink-0"
        >
          <Plus className="h-4 w-4" /> Add FAQ
        </Button>
      </div>

      {/* FAQS LIST */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-bold flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading FAQs from Supabase...
        </div>
      ) : faqs.length === 0 ? (
        <div className="surface-card p-12 text-center rounded-3xl border bg-white space-y-3">
          <HelpCircle className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-base text-foreground">No FAQs Found</h3>
          <p className="text-xs text-muted-foreground">Add common questions for customer help & contact page.</p>
          <Button onClick={openCreateModal} className="rounded-full text-xs font-extrabold gap-1 mt-2">
            <Plus className="h-4 w-4" /> Add First FAQ
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {faqs.map((f) => (
            <div key={f.id || f.q} className="surface-card p-5 rounded-3xl border bg-white space-y-2 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-extrabold text-slate-600">
                    {f.category || "General"}
                  </span>
                  <span className="text-xs font-extrabold text-foreground">{f.q || f.question}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-1">{f.a || f.answer}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <Switch checked={f.is_active !== false} onCheckedChange={() => toggleFaqStatus(f)} />
                <Button onClick={() => openEditModal(f)} variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0">
                  <Edit3 className="h-4 w-4 text-slate-600" />
                </Button>
                <Button onClick={() => handleDeleteFaq(f.id, f.q || f.question)} variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              {editingFaq ? "Edit FAQ" : "Add New FAQ"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="font-bold text-slate-700">Question *</Label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Do you deliver gas cylinders on weekends?"
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>

            <div>
              <Label className="font-bold text-slate-700">Answer *</Label>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                placeholder="Detailed answer text..."
                className="mt-1 rounded-2xl text-xs border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold text-slate-700">Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Deliveries"
                  className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>
              <div>
                <Label className="font-bold text-slate-700">Display Order</Label>
                <Input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button onClick={() => setModalOpen(false)} variant="outline" className="rounded-full text-xs font-bold">
                Cancel
              </Button>
              <Button onClick={handleSaveFaq} disabled={saving} className="rounded-full text-xs font-bold bg-primary text-white">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {editingFaq ? "Save Changes" : "Add FAQ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
