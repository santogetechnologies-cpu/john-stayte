import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Building2,
  PenTool,
  PackagePlus,
  Loader2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getCustomerGasApplication, GasCustomerApplication } from "@/lib/application-service";
import { GasCustomerApplicationForm } from "./GasCustomerApplicationForm";

export function CustomerApplicationView() {
  const { user } = useStore();
  const [application, setApplication] = useState<GasCustomerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const loadApplication = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const activeUid = authData?.user?.id || user?.id;

      if (!activeUid) {
        setApplication(null);
        return;
      }

      const data = await getCustomerGasApplication(activeUid);
      setApplication(data);
    } catch (err: unknown) {
      console.warn("Could not load application:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadApplication();

    // Subscribe to realtime database changes so status updates instantly when approved/rejected
    const channel = supabase
      .channel("customer_application_view_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        loadApplication(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gas_customer_applications" },
        () => loadApplication(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadApplication]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-slate-500 font-bold">Checking customer application status...</p>
      </div>
    );
  }

  // Case 1: Application NOT completed OR user explicitly clicked to re-submit/edit -> render the form
  if (!application || application.status === "NOT_COMPLETED" || isEditing) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-left">
              <h3 className="text-sm sm:text-base font-black text-amber-950">
                {isEditing
                  ? "Update Gas Customer Application"
                  : "Application Required for Gas Orders"}
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed max-w-xl">
                Please complete and digitally sign your Gas Customer Application below before
                ordering gas cylinders or booking refill collections.
              </p>
            </div>
          </div>
          <Badge className="bg-amber-600 text-white font-extrabold text-[10px] shrink-0 uppercase px-3 py-1">
            Status: Action Required
          </Badge>
        </div>

        <GasCustomerApplicationForm
          initialUsage={application?.usage_type || "DOMESTIC"}
          onCancel={isEditing && application ? () => setIsEditing(false) : undefined}
          onSuccess={(saved) => {
            setApplication(saved);
            setIsEditing(false);
            toast.success("Application registered! You can now place gas orders.");
          }}
        />
      </div>
    );
  }

  // Case 2: Application is SUBMITTED, APPROVED, or REJECTED -> render read-only summary & signature
  const isApproved = application.status === "APPROVED";
  const isRejected = application.status === "REJECTED";

  return (
    <div className="space-y-6 text-left">
      {/* Header Status Banner */}
      {isApproved ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-700 text-white font-black text-[10px] uppercase">
                  Verified & Approved
                </Badge>
                <span className="text-[11px] text-emerald-800 font-bold">
                  Signed on {new Date(application.signed_at).toLocaleDateString("en-GB")}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Gas Customer Application Active
              </h2>
              <p className="text-xs sm:text-sm text-emerald-900">
                Your gas customer onboarding is verified and approved. You are authorized to order
                domestic, commercial and bulk gas cylinders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
            <Button
              asChild
              className="w-full sm:w-auto rounded-full px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold text-xs shadow-md gap-2"
            >
              <Link to="/order-gas">
                <PackagePlus className="h-4 w-4" />
                <span>Order Gas Now</span>
              </Link>
            </Button>
          </div>
        </div>
      ) : isRejected ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/90 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <XCircle className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-rose-700 text-white font-black text-[10px] uppercase">
                  Update Required / Rejected
                </Badge>
                <span className="text-[11px] text-rose-800 font-bold">
                  Submitted {new Date(application.signed_at).toLocaleDateString("en-GB")}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Application Requires Attention
              </h2>
              <p className="text-xs sm:text-sm text-rose-900 font-medium">
                {application.admin_notes ||
                  "Our Gloucestershire depot team requested updates on your onboarding application before cylinder deliveries can proceed."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
            <Button
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto rounded-full px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md gap-2 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Update & Resubmit</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-blue-200 bg-blue-50/80 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-700 text-white font-black text-[10px] uppercase">
                  Application Submitted
                </Badge>
                <span className="text-[11px] text-blue-800 font-bold">
                  Signed on {new Date(application.signed_at).toLocaleDateString("en-GB")}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Application Under Review
              </h2>
              <p className="text-xs sm:text-sm text-blue-900">
                Your gas customer onboarding application has been received and is being verified by
                our depot team.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
            <Button
              asChild
              className="w-full sm:w-auto rounded-full px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold text-xs shadow-md gap-2"
            >
              <Link to="/order-gas">
                <PackagePlus className="h-4 w-4" />
                <span>Order Gas</span>
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Itemized Application Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Application Reference
            </span>
            <p className="text-base font-black text-slate-900 font-mono">#{application.id}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Classification
            </span>
            <p className="text-sm font-black text-primary">{application.usage_type} LPG</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs sm:text-sm">
          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Customer Name:</span>
            <p className="font-extrabold text-slate-900">{application.full_name}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Contact Email:</span>
            <p className="font-extrabold text-slate-900">{application.email}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Telephone:</span>
            <p className="font-extrabold text-slate-900">{application.phone}</p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <span className="text-slate-500 font-medium">Registered Address:</span>
            <p className="font-extrabold text-slate-900">
              {application.street_address}, {application.city} {application.postcode}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Cylinder Status:</span>
            <p className="font-extrabold text-slate-900">
              {application.existing_cylinder_status || "Standard Exchange"}
            </p>
          </div>

          {/* Business Details if Commercial / Bulk */}
          {application.business_name && (
            <div className="md:col-span-3 p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-600" /> Commercial Business Registration
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-blue-700 font-medium">Business Name:</span>
                  <p className="font-extrabold text-slate-900">{application.business_name}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Trade Sector:</span>
                  <p className="font-extrabold text-slate-900">
                    {application.business_type || "Commercial"}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Accounts Phone:</span>
                  <p className="font-extrabold text-slate-900">
                    {application.business_contact || application.phone}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Digital Signature Rendering */}
        <div className="border-t border-slate-100 pt-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <PenTool className="h-3.5 w-3.5 text-primary" /> Submitted Digital Signature
            </span>
            <span className="text-[10px] text-slate-400 font-semibold font-mono">
              Timestamp: {new Date(application.signed_at).toISOString()}
            </span>
          </div>

          {application.signature_data ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 max-w-sm">
              <img
                src={application.signature_data}
                alt="Customer Signature"
                className="h-20 w-auto object-contain mx-auto"
              />
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Signature on physical record.</p>
          )}
        </div>
      </div>
    </div>
  );
}
