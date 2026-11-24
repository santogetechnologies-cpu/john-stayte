import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  isCrossDevicePkceError,
  isCodeAlreadyExchangedError,
  parseVerificationError,
} from "@/lib/auth-origin-service";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [statusMessage, setStatusMessage] = useState("Verifying your email and activating account...");

  useEffect(() => {
    let isMounted = true;

    async function processCallback() {
      if (typeof window === "undefined") return;

      try {
        const searchParams = new URLSearchParams(window.location.search);
        const rawHash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(rawHash);

        // 1. Check for incoming Auth errors from Supabase
        const errorDesc =
          searchParams.get("error_description") ||
          hashParams.get("error_description") ||
          (searchParams.get("error") ? "Verification failed." : null);
        const errorCode = searchParams.get("error_code") || hashParams.get("error_code");

        if (errorDesc) {
          const parsed = parseVerificationError(errorDesc, errorCode);
          if (isMounted) {
            setStatus("error");
            setStatusMessage(parsed?.message || "Verification link is invalid or expired.");
            toast.error(parsed?.message || "Verification failed.");
          }
          setTimeout(() => {
            navigate({
              to: "/login",
              search: {
                error: errorCode || "access_denied",
                error_description: errorDesc,
              } as any,
            });
          }, 2000);
          return;
        }

        // 2. Check if a session already exists (e.g. detectSessionInUrl)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          if (isMounted) {
            setStatus("success");
            setStatusMessage("Email verified successfully! Taking you to your dashboard...");
            toast.success("Email verified successfully!");
          }
          const role = (sessionData.session.user?.user_metadata?.role as string) || "customer";
          const target =
            role === "admin"
              ? "/admin"
              : role === "manager"
                ? "/manager"
                : role === "delivery_agent"
                  ? "/delivery"
                  : role === "branch_staff"
                    ? "/branch"
                    : "/account";
          setTimeout(() => {
            navigate({ to: target as any });
          }, 800);
          return;
        }

        // 3. PKCE Authorization Code Flow
        const code = searchParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!isMounted) return;

          if (!error && data?.session) {
            setStatus("success");
            setStatusMessage("Email verified! Redirecting to your dashboard...");
            toast.success("Email verified successfully!");
            const role = (data.session.user?.user_metadata?.role as string) || "customer";
            const target =
              role === "admin"
                ? "/admin"
                : role === "manager"
                  ? "/manager"
                  : role === "delivery_agent"
                    ? "/delivery"
                    : role === "branch_staff"
                      ? "/branch"
                      : "/account";
            setTimeout(() => {
              navigate({ to: target as any });
            }, 800);
            return;
          }

          if (error) {
            const errorMsg = error.message || "";
            if (isCrossDevicePkceError(errorMsg)) {
              // Server confirmed email, prompt login
              setStatus("success");
              setStatusMessage("Email confirmed! Redirecting to sign in...");
              toast.success("Email confirmed! Please sign in with your password.");
              setTimeout(() => {
                navigate({ to: "/login", search: { confirmed: "true" } as any });
              }, 1200);
              return;
            }

            if (isCodeAlreadyExchangedError(errorMsg)) {
              setStatus("success");
              setStatusMessage("Your email is already verified. Redirecting to sign in...");
              toast.info("Account is already verified. Please sign in.");
              setTimeout(() => {
                navigate({ to: "/login", search: { confirmed: "true" } as any });
              }, 1200);
              return;
            }

            setStatus("error");
            setStatusMessage(error.message || "Failed to exchange verification code.");
            toast.error(error.message || "Verification code exchange failed.");
            setTimeout(() => {
              navigate({ to: "/login" });
            }, 2500);
            return;
          }
        }

        // 4. Token Hash Flow
        const tokenHash = searchParams.get("token_hash");
        const type = (searchParams.get("type") || "signup") as any;
        if (tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (!isMounted) return;

          if (!error && (data?.session || data?.user)) {
            setStatus("success");
            setStatusMessage("Email verified! Taking you to your dashboard...");
            toast.success("Email verified successfully!");
            setTimeout(() => {
              navigate({ to: "/login", search: { confirmed: "true" } as any });
            }, 1000);
            return;
          }

          if (error) {
            setStatus("error");
            setStatusMessage(error.message || "Invalid or expired token.");
            toast.error(error.message || "Verification link error.");
            setTimeout(() => {
              navigate({ to: "/login" });
            }, 2500);
            return;
          }
        }

        // 5. Fallback: redirect to login
        navigate({ to: "/login", search: { confirmed: "true" } as any });
      } catch (err: any) {
        if (isMounted) {
          setStatus("error");
          setStatusMessage("Unexpected error during verification.");
        }
        setTimeout(() => navigate({ to: "/login" }), 2000);
      }
    }

    processCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center">
          {status === "loading" && (
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-[#e31b23]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          )}
          {status === "error" && (
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertCircle className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {status === "loading"
              ? "Verifying Email Address"
              : status === "success"
                ? "Verification Complete"
                : "Verification Notice"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            {statusMessage}
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/login" })}
            className="text-xs font-bold text-slate-500 hover:text-[#e31b23] transition-colors"
          >
            Go to Sign In &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
