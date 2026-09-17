import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  Truck,
  ArrowRight,
  Plus,
  Flame,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  processCustomerMessage,
  ChatMessage,
  ChatAction,
  AssistantProductCard,
  AssistantOrderCard,
  AssistantStationCard,
  AssistantAppCard,
  formatGbp,
} from "@/lib/jss-assistant-engine";

const INITIAL_GREETING: ChatMessage = {
  id: "msg-init",
  role: "assistant",
  content:
    "Hello! I am your **JSS Customer Assistant**.\n\nI can help you check live gas prices & stock, understand cylinder exchange, track your orders, find forecourt stations, or answer any questions about our products.",
  timestamp: Date.now(),
  actions: [
    { type: "prompt", label: "Do you have Calor propane?" },
    { type: "prompt", label: "How much is a 13kg refill?" },
    { type: "prompt", label: "How does cylinder exchange work?" },
    { type: "prompt", label: "Where is my order?" },
    { type: "prompt", label: "Find nearest filling station" },
  ],
};

export function JSSAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("jss_chat_history");
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [INITIAL_GREETING];
  });
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { addToCart } = useStore();

  // Save session history
  useEffect(() => {
    try {
      if (messages.length > 0) {
        sessionStorage.setItem("jss_chat_history", JSON.stringify(messages));
      }
    } catch (_) {}
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await processCustomerMessage(text, messages);

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: response.text,
        timestamp: Date.now(),
        actions: response.actions,
        products: response.products,
        orders: response.orders,
        stations: response.stations,
        application: response.application,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("AI assistant error:", err);
      const fallbackMsg: ChatMessage = {
        id: `asst-err-${Date.now()}`,
        role: "assistant",
        content:
          "I apologize, but I encountered a temporary problem processing your request. Please feel free to rephrase or reach our Gloucestershire team directly on +44 (0)1453 822859.",
        timestamp: Date.now(),
        actions: [{ type: "link", label: "Contact Us", url: "/contact", primary: true }],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: ChatAction) => {
    if (action.type === "prompt") {
      handleSendMessage(action.label);
    } else if (action.type === "link" && action.url) {
      navigate({ to: action.url as any });
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    }
  };

  const handleAddProductToCart = (prod: AssistantProductCard) => {
    addToCart(prod.slug, 1);
    toast.success(`${prod.name} added to your basket!`, {
      description: `${formatGbp(prod.price)} • Ready for Gloucestershire delivery or collection`,
      action: {
        label: "View Basket",
        onClick: () => navigate({ to: "/cart" }),
      },
    });
  };

  const handleResetChat = () => {
    setMessages([INITIAL_GREETING]);
    try {
      sessionStorage.removeItem("jss_chat_history");
    } catch (_) {}
    toast.info("Conversation reset");
  };

  // Basic markdown-like parser for bold, lists, and headers
  const renderFormattedText = (content: string) => {
    return content.split("\n").map((line, idx) => {
      let formatted = line;

      // Header
      if (formatted.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-2 mb-1">
            {formatted.replace("### ", "")}
          </h4>
        );
      }

      // Bullet points
      if (formatted.startsWith("• ") || formatted.startsWith("- ")) {
        const itemText = formatted.replace(/^[•\-]\s*/, "");
        return (
          <div key={idx} className="flex items-start gap-1.5 my-1 text-xs sm:text-sm">
            <span className="text-red-600 font-bold leading-none mt-1">•</span>
            <span
              dangerouslySetInnerHTML={{
                __html: formatInlineMarkdown(itemText),
              }}
            />
          </div>
        );
      }

      // Empty line
      if (!formatted.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p
          key={idx}
          className="text-xs sm:text-sm leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: formatInlineMarkdown(formatted),
          }}
        />
      );
    });
  };

  function formatInlineMarkdown(str: string): string {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>')
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
  }

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* 1. JSS CIRCULAR GLOSSY RED CHAT BUTTON & "NEED HELP?" TOOLTIP       */}
      {/* ------------------------------------------------------------------- */}
      <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 select-none">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group/chatbtn relative flex flex-col items-center cursor-pointer bg-transparent border-0 p-0 m-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 rounded-full transition-transform duration-300 active:scale-95"
            aria-label="Open JSS Assistant chat - Need help?"
            title="Need help? Chat with JSS Assistant"
          >
            {/* "Need help?" Floating Speech Bubble Tooltip */}
            <div className="relative mb-2 px-3 sm:px-3.5 py-1 sm:py-1.5 bg-white text-[#e31b23] font-bold text-xs sm:text-[13px] rounded-full border border-red-100/90 shadow-[0_4px_20px_rgba(227,27,35,0.22)] select-none tracking-tight animate-jss-tooltip flex items-center justify-center transition-transform duration-300 group-hover/chatbtn:scale-105">
              {/* Soft Ambient Glow behind Tooltip */}
              <div className="absolute -inset-1.5 rounded-full bg-red-500/10 blur-md pointer-events-none -z-10" />
              Need help?
              {/* Downward Speech Bubble Pointer Tail */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-red-100/90 rotate-45" />
            </div>

            {/* Circular Glossy Red Chat Button */}
            <div className="relative flex items-center justify-center animate-jss-chat-btn">
              {/* Ambient Red Glow Halo */}
              <div className="absolute -inset-2.5 rounded-full bg-red-500/25 blur-lg group-hover/chatbtn:bg-red-500/40 group-hover/chatbtn:blur-xl transition-all duration-300 pointer-events-none animate-jss-chat-glow" />

              {/* 3D Glossy Red Disc */}
              <div
                className="relative w-13 h-13 sm:w-14 sm:h-14 md:w-15 md:h-15 rounded-full flex items-center justify-center border border-red-400/35 transition-transform duration-300 group-hover/chatbtn:scale-105"
                style={{
                  background:
                    "radial-gradient(circle at 45% 22%, #ff5266 0%, #e6001a 45%, #b30012 85%, #80000a 100%)",
                  boxShadow:
                    "inset 0 2px 3px rgba(255, 255, 255, 0.65), inset 0 -3px 5px rgba(0, 0, 0, 0.4), 0 8px 24px -2px rgba(227, 27, 35, 0.45), 0 4px 10px rgba(0, 0, 0, 0.2)",
                }}
              >
                {/* Inner Crisp White Circular Disc */}
                <div
                  className="w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center border border-white/60"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, #ffffff 0%, #f7f7fa 100%)",
                    boxShadow:
                      "inset 0 1px 2px rgba(0, 0, 0, 0.08), 0 2px 5px rgba(0, 0, 0, 0.12)",
                  }}
                >
                  {/* Center Red Chat Bubble with 3 White Dots */}
                  <svg
                    className="w-5 h-5 sm:w-5.5 sm:h-5.5 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="jssRedChatBubble" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ff3b4e" />
                        <stop offset="100%" stopColor="#c70016" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M16 6.5C10.753 6.5 6.5 10.194 6.5 14.75C6.5 17.247 7.771 19.475 9.809 20.97C9.451 22.461 8.674 23.757 7.796 24.758C7.594 24.986 7.783 25.338 8.083 25.293C10.232 24.972 12.245 23.982 13.661 22.75C14.426 22.938 15.218 23 16 23C21.247 23 25.5 19.306 25.5 14.75C25.5 10.194 21.247 6.5 16 6.5Z"
                      fill="url(#jssRedChatBubble)"
                    />
                    <circle cx="11.5" cy="14.75" r="1.4" fill="white" />
                    <circle cx="16" cy="14.75" r="1.4" fill="white" />
                    <circle cx="20.5" cy="14.75" r="1.4" fill="white" />
                  </svg>
                </div>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. CHAT PANEL                                                       */}
      {/* ------------------------------------------------------------------- */}
      {isOpen && (
        <div className="fixed inset-x-2 bottom-2 top-16 sm:inset-auto sm:bottom-5 sm:right-5 sm:top-auto z-50 flex flex-col sm:w-[420px] sm:h-[620px] max-h-[92vh] rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-red-600 to-red-700 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/20">
                <Flame className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight text-white">JSS Assistant</h3>
                  <Badge className="bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 text-[10px] px-1.5 py-0">
                    Live Data
                  </Badge>
                </div>
                <p className="text-[11px] text-red-100/90 leading-none mt-0.5">
                  John Stayte Services • Customer Support
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Reset conversation"
                className="rounded-lg p-1.5 text-red-100 hover:bg-white/10 hover:text-white transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="rounded-lg p-1.5 text-red-100 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm mt-0.5">
                    <Flame className="h-4 w-4 text-amber-300" />
                  </div>
                )}

                <div
                  className={`flex flex-col max-w-[85%] sm:max-w-[82%] ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {/* Bubble Content */}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 shadow-sm text-xs sm:text-sm ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white rounded-br-none"
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-none"
                    }`}
                  >
                    {renderFormattedText(msg.content)}
                  </div>

                  {/* Attached Product Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-2 w-full space-y-1.5">
                      {msg.products.map((prod) => (
                        <div
                          key={prod.id}
                          className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-sm hover:border-red-200 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {prod.image_url ? (
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="h-11 w-11 rounded-lg object-contain bg-slate-50 border p-0.5 shrink-0"
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-slate-900 truncate">
                                {prod.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-bold text-red-600 text-xs sm:text-sm">
                                  {formatGbp(prod.price)}
                                </span>
                                {prod.brand && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0 border-slate-200 text-slate-600"
                                  >
                                    {prod.brand}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigate({ to: `/products/${prod.slug}` as any });
                                if (window.innerWidth < 768) setIsOpen(false);
                              }}
                              className="h-7 px-2 text-[11px]"
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAddProductToCart(prod)}
                              className="h-7 px-2 bg-red-600 hover:bg-red-700 text-white text-[11px] gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached Order Cards */}
                  {msg.orders && msg.orders.length > 0 && (
                    <div className="mt-2 w-full space-y-2">
                      {msg.orders.map((ord) => (
                        <div
                          key={ord.id}
                          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">
                              Order #{ord.order_number}
                            </span>
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${
                                ord.status === "Delivered"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : ord.status === "Out for Delivery"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {ord.status}
                            </Badge>
                          </div>

                          {ord.items_summary && (
                            <p className="text-[11px] text-slate-600 truncate">
                              {ord.items_summary}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t text-[11px] text-slate-500">
                            <span>Total: {formatGbp(ord.total)}</span>
                            <Link
                              to={`/account/orders/${ord.id}` as any}
                              onClick={() => {
                                if (window.innerWidth < 768) setIsOpen(false);
                              }}
                              className="text-red-600 font-semibold hover:underline flex items-center gap-0.5"
                            >
                              Track <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached Filling Station Cards */}
                  {msg.stations && msg.stations.length > 0 && (
                    <div className="mt-2 w-full space-y-2">
                      {msg.stations.map((st) => (
                        <div
                          key={st.id}
                          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-1.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900">{st.name}</h4>
                              <p className="text-[11px] text-slate-600 mt-0.5">{st.address}</p>
                            </div>
                            {st.autogas_available && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1 py-0 shrink-0">
                                Autogas LPG
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" /> {st.hours}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" /> {st.phone}
                            </span>
                          </div>

                          <div className="pt-1 border-t flex justify-end">
                            <a
                              href={st.maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                            >
                              Get Directions <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached Action Buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleActionClick(act)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            act.primary
                              ? "bg-red-600 text-white hover:bg-red-700 shadow-sm"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-500">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
                  <Flame className="h-4 w-4 text-amber-300 animate-pulse" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-white border border-slate-200 px-3.5 py-2.5 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-bounce" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Footer */}
          <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about gas prices, delivery, exchange..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <Button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                size="sm"
                className="rounded-xl bg-red-600 px-3 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400">
              <span>John Stayte Services Customer AI</span>
              <span>Gloucestershire Delivery</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
