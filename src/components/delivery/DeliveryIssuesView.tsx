import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  Clock,
  MapPin,
  Flame,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getAgentAssignedDeliveries } from "@/lib/delivery-agent-service";
import { DeliveryWorkflowModal } from "./DeliveryWorkflowModal";
import { cn } from "@/lib/utils";

export function DeliveryIssuesView() {
  const { user } = useStore();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAgentAssignedDeliveries({
        email: user?.email,
        name: user?.name,
        id: user?.id,
      });
      setDeliveries(data || []);
    } catch (err: any) {
      console.error("Failed to load delivery exceptions:", err);
      toast.error("Failed to load exceptions log");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const issuesList = useMemo(() => {
    return deliveries.filter((d) => {
      const s = (d.status || "").toLowerCase();
      const notes = (d.notes || "").toLowerCase();
      return s === "exception" || notes.includes("[exception:") || notes.includes("exception");
    });
  }, [deliveries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight">
            Delivery Issues & Exceptions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Monitor and resolve road delivery exceptions, cylinder damage, and customer
            discrepancies.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadIssues}
          className="rounded-full text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-3.5 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Refresh Exceptions
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 space-y-3 animate-pulse shadow-xs"
            >
              <div className="h-4 bg-slate-100 rounded-md w-1/3" />
              <div className="h-5 bg-slate-100 rounded-md w-2/3" />
              <div className="h-8 bg-slate-100 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : issuesList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200/60">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-900">
            No active delivery exceptions logged
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
            All your assigned routes and customer handovers are proceeding smoothly without recorded
            exceptions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issuesList.map((d) => {
            const o = d.orders || {};
            const notes = d.notes || "";

            return (
              <div
                key={d.id}
                className="bg-white rounded-3xl border border-rose-200 p-5 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-xs text-slate-900">
                      #{o.order_number || d.id.slice(0, 8)}
                    </span>
                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow-none">
                      Exception Logged
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-display font-extrabold text-sm text-slate-900">
                      {o.customer_name || "Customer"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Assigned Driver: {d.driver_name || "Dave Jenkins"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs text-rose-950 font-medium space-y-1">
                    <p className="font-bold text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Logged Details:
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-700">{notes}</p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setSelectedDelivery(d);
                    setWorkflowOpen(true);
                  }}
                  className="w-full rounded-full font-bold text-xs h-9 bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer"
                >
                  Open Delivery Resolution Workflow
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <DeliveryWorkflowModal
        delivery={selectedDelivery}
        open={workflowOpen}
        onOpenChange={setWorkflowOpen}
        onWorkflowComplete={loadIssues}
      />
    </div>
  );
}
