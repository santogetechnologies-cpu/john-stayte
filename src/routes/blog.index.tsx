import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  CalendarDays,
  Clock,
  Search,
  BookOpen,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Flame,
  X,
  ShieldCheck,
  CheckCircle2,
  Check,
  MapPin,
  HelpCircle,
  Truck,
  Mail,
  Send,
  Loader2,
  Phone,
  Layers,
  Fuel,
  Info,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Ban,
  PhoneCall,
  CheckSquare,
  Award,
  LayoutGrid,
  FileText,
  Lightbulb,
  Newspaper,
  AlertTriangle,
  CookingPot,
  Wrench,
  Zap,
  Wind,
  PowerOff,
  AlertCircle,
  CircleOff,
  Users,
  Handshake,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  blogArticles,
  type BlogPost,
  safetyCylinderUpright,
  safetyKeepFlammableAway,
  safetyMeasuresInfographic,
} from "@/data/blog";
import blogHeroKnowledge from "@/assets/blog-hero-knowledge.jpg";
import blogHeroCylinders from "@/assets/blog_hero_cylinders.jpg";
import safetyGasHobImg from "@/assets/safety_gas_hob.jpg";
import safetyCoAlarmImg from "@/assets/safety_co_alarm.jpg";
import safetyGasValveImg from "@/assets/safety_gas_valve.jpg";
import guidanceEmergencyHelpImg from "@/assets/guidance_emergency_help.jpg";
import guidanceUsingGasSafelyImg from "@/assets/guidance_using_gas_safely.jpg";
import guidanceConnectionsImg from "@/assets/guidance_connections.jpg";
import guidanceStorageAdviceImg from "@/assets/guidance_storage_advice.jpg";
import guidanceTransportingGasImg from "@/assets/guidance_transporting_gas.jpg";
import guidanceChecksServicingImg from "@/assets/guidance_checks_servicing.jpg";
import guidanceBusinessImg from "@/assets/guidance_business.jpg";
import guidanceTankReplacementImg from "@/assets/guidance_tank_replacement.jpg";
import guidancePipeworkServicingImg from "@/assets/guidance_pipework_servicing.jpg";
import safetyStorageV3Img from "@/assets/safety_storage_v3.jpg";
import safetyUprightV3Img from "@/assets/safety_upright_v3.jpg";
import safetyAwayFromFlamesV3Img from "@/assets/safety_away_from_flames_v3.jpg";
import safetyVentilationLeaksFinalImg from "@/assets/safety_ventilation_leaks_final.jpg";
import safetyChildPetFinalImg from "@/assets/safety_child_pet_final.jpg";
import safetySmellGasV3Img from "@/assets/safety_smell_gas_v3.jpg";
import localKnowledgeTradingImg from "@/assets/local_knowledge_trading.jpg";
import localKnowledgeStationsImg from "@/assets/local_knowledge_stations.jpg";
import localKnowledgeProductsImg from "@/assets/local_knowledge_products.jpg";
import localKnowledgeSafetyImg from "@/assets/local_knowledge_safety.jpg";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

function ScrollRevealCard({
  children,
  className = "",
  delay = 0,
  staggerIndex,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerIndex?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsRevealed(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting || entry.intersectionRatio > 0.05) {
              setIsRevealed(true);
              observer.unobserve(el);
              break;
            }
          }
        },
        {
          threshold: 0.08,
          rootMargin: "0px 0px -30px 0px",
        }
      );

      observer.observe(el);
      return () => {
        observer.disconnect();
      };
    } else {
      setIsRevealed(true);
    }
  }, []);

  const computedDelay = typeof staggerIndex === "number" ? (staggerIndex % 3) * 90 : delay;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "translateY(0px)" : "translateY(28px)",
        transitionProperty: "opacity, transform",
        transitionDuration: "600ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: isRevealed ? `${computedDelay}ms` : "0ms",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Safety & Advice Knowledge Centre | John Stayte Services" },
      {
        name: "description",
        content:
          "Practical gas safety guidance, fuel advice and home energy tips from certified UK specialists at John Stayte Services.",
      },
      { property: "og:title", content: "Knowledge Centre — Safety & Advice | John Stayte Services" },
      {
        property: "og:description",
        content: "Gas cylinder safety measures, fuel regulations, and expert heating tips.",
      },
    ],
  }),
  component: BlogKnowledgeCentrePage,
});

const CATEGORIES = [
  "All",
  "Safety",
  "Guides",
  "Fuel Advice",
  "Regulations",
  "Tips",
  "News",
] as const;




const CHECKLIST_ITEMS = [
  "Cylinder standing upright on firm, level ground",
  "Valve and regulator checked for tight gas-tight fit",
  "Area well ventilated with natural outdoor airflow",
  "No naked flames, sparks or bonfires nearby",
  "Strict no smoking rule enforced near gas cylinders",
  "High-pressure rubber hose checked for cracks or wear",
  "No visible cylinder damage, corrosion or leaks",
  "Children and pets kept safe distance away",
];

const AlertLineIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const BbqBurnerIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="6" width="14" height="6" rx="1" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="7" y1="12" x2="7" y2="20" />
    <line x1="17" y1="12" x2="17" y2="20" />
    <line x1="5" y1="17" x2="19" y2="17" />
    <circle cx="7" cy="20" r="1.5" />
    <circle cx="17" cy="20" r="1.5" />
  </svg>
);

const ConnectingBottlesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="8" width="7" height="13" rx="2" />
    <path d="M6 8V5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v3" />
    <rect x="13" y="10" width="8" height="11" rx="2" />
    <path d="M15 10V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3" />
    <line x1="2" y1="21" x2="22" y2="21" />
  </svg>
);

const StoringBottleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <rect x="6" y="5" width="12" height="16" rx="3" />
    <circle cx="12" cy="13" r="1.5" fill="currentColor" />
    <line x1="4" y1="21" x2="20" y2="21" />
  </svg>
);

const TransportCarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 11l2-4a2 2 0 0 1 1.8-1.1h8.4A2 2 0 0 1 18 7l2 4" />
    <rect x="2" y="11" width="20" height="6" rx="2" />
    <circle cx="6.5" cy="17.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

const ToolsInspectionIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const ForkliftBusinessIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 6h4v11H3z" />
    <path d="M7 11h6l3 3v3H7" />
    <circle cx="9" cy="17" r="2" />
    <circle cx="16" cy="17" r="2" />
    <path d="M21 8v9h-2" />
    <line x1="17" y1="12" x2="21" y2="12" />
  </svg>
);

const BulkTankIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="7" width="14" height="9" rx="4.5" />
    <line x1="8" y1="16" x2="8" y2="20" />
    <line x1="16" y1="16" x2="16" y2="20" />
    <line x1="5" y1="20" x2="19" y2="20" />
    <path d="M10 7V5h4v2" />
  </svg>
);

const PipeworkServicingIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="13" y="3" width="7" height="4" rx="0.5" />
    <path d="M13 5H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h7" />
    <rect x="13" y="16" width="7" height="4" rx="0.5" />
    <line x1="16.5" y1="12" x2="16.5" y2="16" />
    <line x1="14.5" y1="14" x2="18.5" y2="14" />
  </svg>
);

const SAFETY_GUIDANCE_ITEMS = [
  // 1. Emergency help
  {
    id: "emergency-help",
    title: "Emergency help",
    badge: "Urgent Protocol",
    description: "What to do in the event of a gas emergency.",
    image: guidanceEmergencyHelpImg,
    icon: AlertLineIcon,
    overview: "Immediate life-safety guidance and action steps to follow if you smell gas, suspect an LPG leak, or experience an emergency involving gas cylinders, bulk vessels, or supply pipework.",
    situationTitle: "IF YOU SMELL GAS OR SUSPECT AN LPG LEAK",
    situationText: "LPG (Liquefied Petroleum Gas) is naturally odourless, but an artificial pungent odorant is added to alert you immediately. Because LPG vapour is heavier than air, it settles at floor level, cellar drains, and low-lying hollows where it can accumulate silently.",
    immediateActions: [
      "Extinguish all naked flames, cigarettes, pilot lights, and burning appliances immediately.",
      "Do NOT turn any electrical switches, extractors, appliances, or lights on or off.",
      "Do NOT use mobile phones, doorbells, landlines, or handheld electronic devices within the affected area.",
      "Shut off the gas supply immediately at the cylinder valve (turn clockwise) or the main emergency control valve.",
      "Open all external doors and windows wide to promote rapid natural cross-ventilation.",
      "Evacuate all occupants and pets to an outdoor assembly point at least 15 metres away."
    ],
    steps: [
      { num: "01", title: "Isolate Gas Supply", text: "Turn the handwheel on your gas cylinder fully clockwise to shut off supply, or flip the emergency control valve to OFF." },
      { num: "02", title: "Eliminate Ignition Sources", text: "Extinguish all candles, matches, and cigarettes. Do not touch power points, light switches, or circuit breakers." },
      { num: "03", title: "Maximise Cross-Ventilation", text: "Open external doors and ground-level windows wide to allow fresh outdoor air to disperse heavy pooling gas." },
      { num: "04", title: "Evacuate the Building", text: "Escort all family members, occupants, and pets outside immediately to a safe, well-ventilated outdoor assembly point." },
      { num: "05", title: "Call Emergency Services", text: "Once outside in fresh air, call the National Gas Emergency Service on 0800 111 999 or 999 if there is immediate fire danger." }
    ],
    whatToCheck: [
      "Check if any cooker burner control dials or heater knobs were accidentally left open without being lit",
      "Inspect flexible rubber pigtails and regulator connections for audible hissing or obvious disconnections",
      "Check automatic changeover valve indicator to confirm if it has tripped or shows a continuous red signal",
      "Inspect nearby cellar vents, basement entrances, and external drains for pooling gas odorant"
    ],
    whatToAvoid: [
      "NEVER strike matches, lighters, spark igniters, or use battery tools inside the contaminated property",
      "NEVER turn electrical switches on OR off — even flicking a light off generates a microscopic internal electrical spark",
      "NEVER enter cellars, basements, or inspection pits as LPG vapor is 1.5 to 2.0 times heavier than air",
      "NEVER attempt DIY repairs on gas valves, regulators, or fixed copper pipework while gas is leaking",
      "NEVER re-enter the building until certified emergency engineers have declared the premises 100% safe"
    ],
    whenToLeave: "Evacuate immediately without delay if you detect a strong, overwhelming gas odour, hear loud high-pressure hissing from a cylinder valve or pipe joint, or if anyone in the building experiences dizziness, nausea, headaches, or difficulty breathing.",
    afterLeaving: "Once outside, stay at least 15 metres upwind from the building. Keep everyone away from property entry points and prevent anyone from re-entering until Gas Safe engineers or the Fire & Rescue Service give formal clearance.",
    whenToCallPro: "A certified Gas Safe registered engineer must be called whenever a gas leak is confirmed, a regulator has frozen or vented, pipework has suffered mechanical impact, or following any emergency isolation before supply is restored.",
    recapPoints: [
      "Turn off cylinder valve clockwise to isolate gas flow",
      "Do NOT operate any electrical switches or naked flames",
      "Open doors and windows wide for cross-ventilation",
      "Evacuate all occupants outdoors to a safe distance",
      "Call National Gas Emergency (0800 111 999) from outside"
    ]
  },

  // 2. Using gas safely
  {
    id: "using-gas-safely",
    title: "Using gas safely",
    badge: "Everyday Advice",
    description: "Tips for safe everyday use in your home or business.",
    image: guidanceUsingGasSafelyImg,
    icon: BbqBurnerIcon,
    overview: "Comprehensive safety protocols and proven operational standards for domestic gas cookers, hobs, space heaters, and hot water systems.",
    situationTitle: "SAFE EVERYDAY APPLIANCE PROTOCOLS",
    situationText: "LPG is one of the cleanest, most efficient heating fuels available when used properly. Maintaining correct combustion conditions, good room airflow, and regular visual safety monitoring prevents carbon monoxide formation and fire hazards.",
    immediateActions: [
      "Ensure rooms containing gas appliances have unobstructed permanent ventilation grilles and window trickle vents.",
      "Check burner flames daily: healthy LPG combustion produces a crisp, steady, vibrant blue flame with sharp inner cones.",
      "Never leave portable indoor cabinet gas heaters on unattended or running overnight while occupants are asleep.",
      "Maintain at least 1 metre clearance between room heaters and soft furnishings, curtains, bedding, and furniture.",
      "Install audible Carbon Monoxide (CO) alarms certified to BS EN 50291 in every living room and bedroom near gas appliances."
    ],
    steps: [
      { num: "01", title: "Ensure Constant Airflow", text: "Never block wall vents, air bricks, or trickle vents. Proper air exchange supplies essential oxygen for clean combustion." },
      { num: "02", title: "Monitor Flame Quality", text: "Look for stable blue flames. Yellow, floppy, lazy flames or heavy soot indicate incomplete combustion and carbon monoxide risks." },
      { num: "03", title: "Keep Combustibles Clear", text: "Maintain strict separation distances. Keep kitchen towels, grease, paper, curtains, and aerosol cans away from hot cookers." },
      { num: "04", title: "Test CO Alarms Monthly", text: "Press the test button on all household carbon monoxide detectors once every month and replace batteries annually." },
      { num: "05", title: "Schedule Annual Service", text: "Have a Gas Safe registered technician inspect and service your appliances, flue pipes, and seals every 12 months." }
    ],
    whatToCheck: [
      "Check that burner flame failure safety devices (FFD) extinguish gas flow within 90 seconds if the flame blows out",
      "Inspect pan supports to ensure cookware sits level and does not obstruct primary air aeration ports",
      "Examine cooker hoods and extractor grease filters: clean monthly to eliminate grease accumulation",
      "Check heater gas hoses for any signs of cracking, fraying, pet teeth marks, or surface stiffening"
    ],
    whatToAvoid: [
      "NEVER use outdoor patio heaters, gas barbecues, or camping stoves inside enclosed rooms, conservatories, or tents",
      "NEVER use gas cooking hobs or open ovens as an impromptu room space heater during cold weather",
      "NEVER drape wet laundry, towels, or clothing directly over portable gas heaters to dry",
      "NEVER ignore soot, dark yellow flame tips, brown scorch marks, or unusual acrid odours around appliances",
      "NEVER modify appliance jet sizes or attempt DIY conversions between natural gas and LPG"
    ],
    whenToLeave: "If your Carbon Monoxide alarm sounds continuously, or if anyone develops headaches, dizziness, unexplained tiredness, nausea, or visual disturbance, shut off the appliance, open windows, and leave the property immediately for medical assessment.",
    afterLeaving: "Breathe fresh outdoor air deeply. Seek medical attention immediately if CO poisoning symptoms persist. Contact a qualified Gas Safe technician to inspect all heating appliances before re-lighting.",
    whenToCallPro: "Contact a Gas Safe registered engineer if an appliance burner produces yellow flames, leaves black soot on pans, fails to ignite smoothly, or if pilot lights repeatedly blow out.",
    recapPoints: [
      "Burners must display clean, steady blue flames",
      "Never block permanent ventilation openings or air bricks",
      "Install and test BS EN 50291 Carbon Monoxide alarms",
      "Never use outdoor cooking gear or patio heaters indoors",
      "Book annual appliance servicing with a Gas Safe engineer"
    ]
  },

  // 3. Connections
  {
    id: "connections",
    title: "Connections",
    badge: "Hardware & Fittings",
    description: "How to connect appliances and fittings safely.",
    image: guidanceConnectionsImg,
    icon: ConnectingBottlesIcon,
    overview: "Step-by-step technical guidance on connecting, tightening, testing, and disconnecting LPG regulators, automatic changeover valves, pigtails, and flexible hoses.",
    situationTitle: "CYLINDER & REGULATOR CONNECTION PROTOCOLS",
    situationText: "Safe gas connections depend on correct thread engagement, undamaged rubber seals ('O' rings), appropriate spanners, and systematic leak detection. Propane and Butane use completely different regulator fittings and operating pressures.",
    immediateActions: [
      "Always extinguish naked flames, pilot lights, and cigarettes before changing any gas cylinder.",
      "Check the replacement cylinder label to confirm correct gas type: Propane (Red) or Butane (Blue).",
      "Inspect the brass bullnose connector and rubber sealing washer for hairline cracks, dirt, or flattening.",
      "Ensure the appliance control knobs and cylinder handwheel are turned fully OFF before connecting.",
      "Perform a 50/50 soapy water bubble test or certified leak detection spray over all joints after connecting."
    ],
    steps: [
      { num: "01", title: "Turn Off Old Cylinder", text: "Turn the cylinder handwheel fully clockwise to shut off the valve, or flip the clip-on regulator lever to the OFF position." },
      { num: "02", title: "Carefully Disconnect Fitting", text: "For Propane: turn nut clockwise (LH reverse thread) with a Calor spanner. For Butane: squeeze release collar and lift upwards." },
      { num: "03", title: "Inspect Seal & Threads", text: "Wipe clean the mating surfaces. Check the rubber 'O' ring washer on the regulator nozzle for cracks or degradation." },
      { num: "04", title: "Connect to New Cylinder", text: "Align threads straight. For Propane: turn nut anti-clockwise (LH) by hand, then tighten firmly with spanner. Do not overtighten." },
      { num: "05", title: "Perform Bubble Leak Test", text: "Open cylinder valve slowly. Apply 50/50 soapy water across all joints. If growing bubbles appear, shut valve immediately and reseat." }
    ],
    whatToCheck: [
      "Inspect high-pressure pigtail hoses for manufacturing date stamps: replace all flexible LPG hoses every 5 years",
      "Check that propane Left-Hand (LH) reverse-threaded nuts are free from cross-threading or damaged flats",
      "Verify that clip-on regulators for butane cylinders click down firmly and lock securely into the neck groove",
      "Ensure copper gas pipework is anchored with non-combustible clips and not subject to mechanical stress"
    ],
    whatToAvoid: [
      "NEVER use PTFE plumber's tape, jointing paste, or sealants on brass bullnose regulator connections",
      "NEVER use matches, lighters, or any naked flame to test for connection leaks",
      "NEVER use excessive force or extend spanner handles with pipe bars; brass fittings can shear or strip",
      "NEVER kink, stretch, twist, or route rubber gas hoses behind hot cooker backs or oven panels exceeding 50°C",
      "NEVER attempt to connect a propane regulator to a butane bottle or vice versa"
    ],
    whenToLeave: "If you hear loud continuous hissing from the regulator joint upon opening the valve, or if soapy water produces rapid frothing that does not stop after gentle re-tightening, shut the cylinder valve and step back into fresh air.",
    afterLeaving: "Keep the cylinder isolated outdoors. If the cylinder neck valve itself continues to hiss or leak despite being turned off, keep everyone 15m clear and call John Stayte Services or emergency services immediately.",
    whenToCallPro: "Contact our technical team or a certified Gas Safe engineer if you require high-pressure auto-changeover manifold installation, rigid copper pipework extension, or replacement of worn regulator valves.",
    recapPoints: [
      "Propane uses Left-Hand (LH) reverse threads (turn anti-clockwise to tighten)",
      "Always inspect rubber 'O' ring seals before fitting",
      "Test joints with soapy water — never with a flame",
      "Replace flexible rubber hoses every 5 years",
      "Do not use PTFE tape on brass bullnose connections"
    ]
  },

  // 4. Storage advice
  {
    id: "storage-advice",
    title: "Storage advice",
    badge: "Storage Rules",
    description: "Store cylinders correctly and keep everyone safe.",
    image: guidanceStorageAdviceImg,
    icon: StoringBottleIcon,
    overview: "UK statutory guidelines, ventilation criteria, and distance separation standards for domestic and commercial LPG cylinder storage.",
    situationTitle: "OUTDOOR LPG STORAGE PRINCIPLES",
    situationText: "Because LPG vapour is significantly denser than ambient air, cylinders must always be stored outdoors in well-ventilated locations on a stable, level surface away from ground-level drainage channels, cellars, and basement entries.",
    immediateActions: [
      "Always store LPG gas bottles outdoors in a well-ventilated location on a firm, level, paved concrete base.",
      "Keep all cylinders standing vertically upright at all times, with valves pointing straight upwards.",
      "Maintain a minimum 1-metre separation distance from openable windows, doors, air bricks, and cellar grates.",
      "Keep cylinders at least 3 metres away from sources of ignition, electrical switches, barbecues, and bonfires.",
      "Secure cylinders firmly with heavy-duty wall chains or lockable safety brackets to prevent accidental tipping."
    ],
    steps: [
      { num: "01", title: "Select Outdoor Location", text: "Choose a sheltered outdoor location with natural cross-ventilation, on solid level paving or concrete slabs." },
      { num: "02", title: "Maintain Boundary Clearances", text: "Keep at least 1m from doors and air vents, and at least 3m from electrical sockets, air conditioning units, and fire pits." },
      { num: "03", title: "Secure in Upright Position", text: "Position cylinders vertically upright and secure with wall safety chains or inside a lockable galvanised steel cage." },
      { num: "04", title: "Segregate Full & Empty Bottles", text: "Keep full and empty cylinders clearly labeled and separated. Refit plastic protective valve caps when disconnected." },
      { num: "05", title: "Keep Perimeter Clear", text: "Keep the immediate 3-metre radius free from dry leaves, weeds, paints, petrol, solvents, and combustible rubbish." }
    ],
    whatToCheck: [
      "Check that cylinder valve dust caps or sealing plugs are firmly fitted to all disconnected cylinders",
      "Verify that ground-level drains and cellar grates within 2 metres are fitted with water traps or sealed covers",
      "Inspect wall chain anchors and padlocks to ensure bottles cannot be knocked over by pets or vehicles",
      "Confirm that storage areas are not enclosed by non-breathable plastic tarpaulins or unventilated wooden boxes"
    ],
    whatToAvoid: [
      "NEVER store LPG cylinders inside residential rooms, hallways, porches, cellars, basements, or under staircases",
      "NEVER store gas cylinders inside unventilated garden sheds, enclosed garages, or lock-ups",
      "NEVER lay gas cylinders down horizontally on their sides during storage or operation",
      "NEVER store paints, thinners, white spirit, petrol, oil, or weedkillers in the same enclosure as LPG cylinders",
      "NEVER stack gas cylinders on top of one another unless using certified modular stacking racks"
    ],
    whenToLeave: "If an outdoor storage area has pooled gas odour or a cylinder valve is venting vapour under thermal pressure, stay upwind at least 15 metres away and prevent anyone from approaching with vehicles or electrical equipment.",
    afterLeaving: "Keep the area cordoned off. Alert neighbours if wind carries gas towards adjacent buildings, and call emergency services immediately.",
    whenToCallPro: "Contact John Stayte Services on 01452 741234 to install heavy-duty galvanised cylinder cages, auto-changeover manifolds, or to arrange commercial storage safety surveys.",
    recapPoints: [
      "Store cylinders outdoors on a firm, level, paved base",
      "Always keep bottles standing vertically upright",
      "Maintain 1m from doors/windows and 3m from ignition sources",
      "Never store LPG bottles in sheds, cellars, or garages",
      "Secure bottles with wall chains or lockable cages"
    ]
  },

  // 5. Transporting gas
  {
    id: "transporting-gas",
    title: "Transporting gas",
    badge: "Transport Rules",
    description: "Guidance for transporting gas cylinders safely.",
    image: guidanceTransportingGasImg,
    icon: TransportCarIcon,
    overview: "Legal requirements, weight limits, vehicle ventilation rules, and securing methods for carrying bottled gas in cars, vans, and commercial vehicles.",
    situationTitle: "VEHICLE TRANSPORT SAFETY PROTOCOLS",
    situationText: "Transporting gas bottles requires careful preparation to prevent movement during braking, cornering, or acceleration. Unsecured cylinders can cause severe damage or valve shearing in an impact.",
    immediateActions: [
      "Transport all cylinders in an upright vertical position, firmly strapped with heavy-duty ratchet straps.",
      "Ensure the cylinder valve is fully closed (turned clockwise) and protective transport caps/plugs are tightly fitted.",
      "Maintain active cross-ventilation throughout the journey by keeping vehicle windows partially open.",
      "Limit vehicle load: carry no more than 2 portable cylinders (maximum 50kg total LPG) in a private passenger car.",
      "Unload gas cylinders immediately upon reaching your destination — never leave cylinders unattended in a parked car."
    ],
    steps: [
      { num: "01", title: "Close Valve & Fit Cap", text: "Confirm the cylinder handwheel is closed tight. Screw in or snap on the protective valve transit cap." },
      { num: "02", title: "Position Vertically", text: "Place the cylinder upright on the vehicle boot floor or cargo bay against a fixed bulkhead. Never lay flat." },
      { num: "03", title: "Secure with Ratchet Straps", text: "Use heavy-duty tie-down straps anchored to vehicle chassis tie points to prevent tilting, sliding, or rolling." },
      { num: "04", title: "Enable Constant Ventilation", text: "Lower side windows slightly or ensure cargo ventilation vents are open to disperse any trace vapour during transit." },
      { num: "05", title: "Drive Carefully & Unload Fast", text: "Avoid aggressive braking or cornering. Drive directly to your destination and unload cylinders immediately." }
    ],
    whatToCheck: [
      "Check the vehicle cargo area for loose tools, sharp metal objects, or corrosive battery fluids before loading",
      "Confirm that a 2kg dry powder fire extinguisher conforming to BS EN 3 is carried inside the vehicle",
      "Verify that transport straps are tightened across the middle barrel of the cylinder",
      "Ensure the vehicle is not parked in direct hot sunlight or enclosed underground parking facilities"
    ],
    whatToAvoid: [
      "NEVER transport gas cylinders lying flat horizontally on their side in the boot, back seat, or footwell",
      "NEVER smoke, vape, or use open flames inside or within 5 metres of a vehicle transporting gas cylinders",
      "NEVER leave gas cylinders inside a parked passenger car, boot, or van in hot weather",
      "NEVER transport cylinders with connected regulators, hoses, or appliances attached",
      "NEVER exceed the statutory carriage threshold without ADR certification and commercial HAZCHEM signage"
    ],
    whenToLeave: "If you detect gas odour inside your vehicle while driving, pull over immediately to a safe, open roadside location, turn off the engine, exit the vehicle with all passengers, and leave the doors/tailgate open to ventilate.",
    afterLeaving: "Stand at least 15 metres away from the vehicle. Do not use electronic key fobs or mobile phones near the vehicle. Call John Stayte Services or emergency services if the leak cannot be stopped by closing the handwheel.",
    whenToCallPro: "Save the hassle of vehicle transport: John Stayte Services provides fast, certified local delivery across Gloucestershire straight to your door: 01452 741234.",
    recapPoints: [
      "Keep cylinders upright and secured with ratchet straps",
      "Ensure cylinder valves are tightly closed with transit caps",
      "Keep vehicle windows open for active cross-ventilation",
      "Never leave gas bottles unattended in a parked car",
      "Maximum 2 cylinders (50kg LPG) in a private car"
    ]
  },

  // 6. Checks & servicing
  {
    id: "checks-servicing",
    title: "Checks & servicing",
    badge: "Maintenance",
    description: "Why regular checks and servicing are important.",
    image: guidanceChecksServicingImg,
    icon: ToolsInspectionIcon,
    overview: "Routine inspection protocols, safety audits, and statutory Gas Safe certification procedures to ensure long-term appliance safety and performance.",
    situationTitle: "STATUTORY INSPECTION & SERVICING STANDARDS",
    situationText: "Gas appliances, regulators, and flexible rubber hoses degrade naturally over time due to thermal cycling, UV exposure, and mechanical vibration. Regular servicing guarantees fuel efficiency, carbon monoxide safety, and warranty compliance.",
    immediateActions: [
      "Have all LPG appliances, pipework, and regulators inspected and serviced annually by a certified Gas Safe registered engineer.",
      "Perform a visual inspection of external hoses, changeover valves, and pipe clamps every 3 months.",
      "Landlords must obtain an annual Landlord Gas Safety Record (CP12) from a Gas Safe engineer for all rental properties.",
      "Monitor automatic changeover indicators regularly to identify when the primary cylinder has switched to reserve.",
      "Replace LPG rubber pigtails and flexible hoses every 5 years, or immediately if any surface perishing is observed."
    ],
    steps: [
      { num: "01", title: "Check Hose Manufacture Dates", text: "Inspect the printed date stamp along all flexible rubber hoses. Replace any hose that is more than 5 years old." },
      { num: "02", title: "Conduct Visual Soundness Checks", text: "Look for cracked rubber, corrosion on brass fittings, damaged pipe clips, and blocked burner aeration ports." },
      { num: "03", title: "Test Flue & Ventilation Paths", text: "Check that external boiler flue terminals, balanced flues, and room air grilles are clear of bird nests, leaves, and debris." },
      { num: "04", title: "Verify Automatic Changeover", text: "Look at the changeover valve indicator window: green indicates normal primary feed, red indicates primary bottle is empty." },
      { num: "05", title: "Book Gas Safe Annual Service", text: "Schedule your annual comprehensive service with John Stayte Services to test operating pressures, seals, and flue gases." }
    ],
    whatToCheck: [
      "Check regulator breather vents to confirm they point downwards and are free from spider webs or water ingress",
      "Check that copper gas pipework is supported with non-combustible pipe clips and free from mechanical strain",
      "Inspect appliance burner flames for uniform blue flame cones across all ports without lifting or flash-back",
      "Verify that high-visibility safety shut-off tags and emergency contact numbers are legible on manifold controls"
    ],
    whatToAvoid: [
      "NEVER attempt DIY modifications, servicing, or disassembly of gas valves, burner jets, or internal parts",
      "NEVER ignore minor hairline rubber cracks, surface perishing, or faint intermittent gas odours",
      "NEVER hire an unregistered tradesperson; always verify Gas Safe ID cards before allowing work to begin",
      "NEVER paint over brass regulator relief vents, data plates, or emergency isolation valves",
      "NEVER bypass safety thermostats, flame failure devices (FFD), or emergency gas interlocks"
    ],
    whenToLeave: "If an appliance produces pungent stinging fumes, black soot, or makes loud explosive booming sounds during ignition, shut off the gas supply and leave the room immediately.",
    afterLeaving: "Do not attempt to re-light the appliance. Keep the room ventilated and contact a Gas Safe engineer to diagnose the flue or burner failure.",
    whenToCallPro: "Annual servicing, boiler commissioning, landlord CP12 certificates, and pipework pressure soundness tests must be carried out exclusively by Gas Safe registered engineers: 01452 741234.",
    recapPoints: [
      "Schedule annual servicing with a Gas Safe registered engineer",
      "Replace flexible rubber gas hoses every 5 years",
      "Landlords must obtain an annual CP12 Gas Safety Record",
      "Check auto-changeover indicators to monitor fuel reserves",
      "Never attempt DIY repairs on gas hardware or pipework"
    ]
  },

  // 7. Business
  {
    id: "business-safety",
    title: "Business",
    badge: "Commercial & Trade",
    description: "LPG safety guidance for hospitality, catering and trade.",
    image: guidanceBusinessImg,
    icon: ForkliftBusinessIcon,
    overview: "Comprehensive statutory safety guidance for commercial kitchens, mobile catering trailers, forklift fleets, agricultural crop dryers, and industrial manifold installations.",
    situationTitle: "COMMERCIAL LPG COMPLIANCE & DSEAR REGULATIONS",
    situationText: "Commercial LPG installations operate under strict UK health and safety legislation, including the Dangerous Substances and Explosive Atmospheres Regulations (DSEAR 2002) and Gas Safety (Installation and Use) Regulations 1998.",
    immediateActions: [
      "Ensure all commercial kitchens operating under mechanical extraction hoods have an active Gas Interlock System (GIS).",
      "Multi-cylinder manifold banks must have dedicated auto-changeover regulators and external thermal fire-stop valves.",
      "Train all kitchen and operating staff in emergency gas isolation procedures and display clear shut-off signage.",
      "Store forklift (FLT) cylinders in secure, lockable outdoor galvanised steel cages segregated from oxidising gases.",
      "Conduct regular written risk assessments and maintain up-to-date statutory commercial gas safety certificates."
    ],
    steps: [
      { num: "01", title: "Verify Gas Interlock Function", text: "Test the Gas Interlock System (GIS) at the start of every shift to confirm gas will not flow without extraction running." },
      { num: "02", title: "Inspect High-Pressure Manifolds", text: "Check multi-bottle headers, pigtails, non-return valves, and auto-changeover indicators for leaks and soundness." },
      { num: "03", title: "Secure FLT Cylinder Storage", text: "Store forklift bottles in a dedicated outdoor cage at least 3m from openings, clear of vehicle traffic and pedestrian routes." },
      { num: "04", title: "Train Staff in Emergency Steps", text: "Conduct regular drills ensuring staff know the location of emergency slam-shut buttons and external isolation valves." },
      { num: "05", title: "Maintain Commercial Records", text: "Keep annual Non-Domestic Gas Safety inspection certificates on file for Environmental Health and insurance audits." }
    ],
    whatToCheck: [
      "Check that commercial kitchen extraction canopy grease filters and ductwork are cleaned to TR19 standards",
      "Inspect forklift quick-release couplings and seal rings for gas weeping before starting engine",
      "Check that emergency gas shut-off push buttons (slam switches) are fully unobstructed and clearly labeled",
      "Verify that high-pressure commercial pigtails meet BS EN 16436-1 Class 3 high-pressure ratings"
    ],
    whatToAvoid: [
      "NEVER use domestic single-stage regulators on high-demand commercial catering equipment",
      "NEVER obstruct emergency exit routes, fire hydrants, or fire extinguishers with cylinder storage",
      "NEVER permit unauthorised or untrained personnel to swap commercial gas cylinder manifolds",
      "NEVER store FLT cylinders horizontally unless they are purpose-designed liquid-withdrawal bottles",
      "NEVER operate mobile catering appliances without flame failure devices (FFD) on every single burner"
    ],
    whenToLeave: "In the event of a commercial gas leak or manifold rupture, hit the emergency gas slam button, initiate the building fire evacuation alarm, and escort all employees and patrons outside immediately.",
    afterLeaving: "Account for all staff at the designated assembly point. Notify the Fire & Rescue Service and the National Gas Emergency Helpline. Do not re-enter until emergency services declare the commercial premises safe.",
    whenToCallPro: "John Stayte Services supplies commercial LPG bulk tanks, multi-bottle cylinder contracts, and commercial installation services: 01452 741234.",
    recapPoints: [
      "Commercial kitchens must have an active Gas Interlock System (GIS)",
      "Train all staff on emergency isolation and slam switches",
      "Store forklift cylinders in locked outdoor steel cages",
      "Multi-bottle manifolds require annual commercial certification",
      "All commercial catering equipment must have flame failure devices"
    ]
  },

  // 8. Tank replacement
  {
    id: "tank-replacement",
    title: "Tank replacement",
    badge: "Bulk & Storage",
    description: "Safe procedures for bulk tank replacement and swaps.",
    image: guidanceTankReplacementImg,
    icon: BulkTankIcon,
    overview: "Safety guidelines, statutory clearance exclusion zones, and delivery crane protocols for domestic and commercial bulk LPG storage vessels.",
    situationTitle: "BULK LPG TANK SAFETY & REPLACEMENT STANDARDS",
    situationText: "Bulk LPG tanks provide large-capacity central heating and hot water storage. Tanks must comply with UK Code of Practice 1 (CoP 1) regarding separation distances from property boundaries, buildings, and overhead electrical lines.",
    immediateActions: [
      "Maintain clear statutory safety exclusion zones around bulk tanks: minimum 3 metres from walls and property lines.",
      "Keep the ground within the 3-metre tank perimeter completely free from weeds, dry grass, and combustible materials.",
      "Ensure delivery tanker access routes and hardstanding areas are clear, level, and unobstructed at all times.",
      "Check magnetic float contents gauges regularly to monitor fuel levels and schedule timely seasonal refills.",
      "Inspect tank earthing connections, cathodic protection, and pressure relief valve covers annually."
    ],
    steps: [
      { num: "01", title: "Establish 3m Exclusion Zone", text: "Keep a strict 3-metre radius around the vessel clear of wooden sheds, fences, foliage, drains, and ignition sources." },
      { num: "02", title: "Monitor Fuel Gauge Level", text: "Check the magnetic percentage gauge under the tank hood. Contact us when fuel drops below 25-30%." },
      { num: "03", title: "Inspect Shroud & Hood Latches", text: "Keep the tank hood lid closed and securely latched to protect valves, regulator, and contents gauge from weather." },
      { num: "04", title: "Verify Tanker Access Path", text: "Ensure delivery drivers have clear, safe hose-run access (max 45m) with no trip hazards or parked vehicle obstructions." },
      { num: "05", title: "Schedule Replacement Surveys", text: "Bulk vessels have a certified 15-20 year inspection life. We perform ultrasonic thickness testing and seamless tank swaps." }
    ],
    whatToCheck: [
      "Check that the pressure relief valve weather cap is in place to prevent rainwater entering the relief mechanism",
      "Inspect cathodic protection test points and sacrificial anode cables on underground tanks",
      "Check copper and MDPE underground pipe entry points into the building for intact yellow protective sleeving",
      "Confirm that no electrical conduits, cables, or external lighting are attached to the tank body"
    ],
    whatToAvoid: [
      "NEVER build wooden sheds, carports, gazebos, or extensions within 3 metres of a bulk LPG tank",
      "NEVER use electric strimmers, lawnmowers, or metal-blade tools directly adjacent to tank valves",
      "NEVER park vehicles or store petrol, weedkiller, or garden waste inside the tank exclusion zone",
      "NEVER tamper with hydrostatic relief valves, regulator bonnet vents, or telemetry transmitter units",
      "NEVER bury an above-ground tank or mound soil against the vessel shell"
    ],
    whenToLeave: "If you observe rapid white vapour venting from the tank safety relief valve, or hear loud hissing accompanied by heavy gas odour, evacuate everyone upwind to a safe distance (at least 50m) immediately.",
    afterLeaving: "Prevent vehicle entry into the driveway. Call the Fire & Rescue Service (999) and the John Stayte 24/7 Bulk Emergency Team immediately.",
    whenToCallPro: "John Stayte Services provides complete bulk LPG tank supply, automated tank telemetry, inspections, and seamless tank swaps: 01452 741234.",
    recapPoints: [
      "Maintain a strict 3m clear exclusion zone around bulk tanks",
      "Keep ground free from weeds, timber, and dry debris",
      "Order refills when gauge drops to 25-30%",
      "Keep tank hood closed and latched against weather",
      "Bulk vessels require periodic statutory soundness audits"
    ]
  },

  // 9. Pipework check and servicing
  {
    id: "pipework-servicing",
    title: "Pipework check and servicing",
    badge: "Pipework & Valves",
    description: "Maintaining supply lines, valves and gas regulators.",
    image: guidancePipeworkServicingImg,
    icon: PipeworkServicingIcon,
    overview: "Best practices for maintaining above-ground and underground LPG distribution pipework, emergency isolation valves (EIV), two-stage regulation, and building entry points.",
    situationTitle: "GAS PIPEWORK INTEGRITY & VALVE SERVICING",
    situationText: "Gas distribution pipework carries pressurized LPG from storage to internal appliances. Proper pipe clamping, corrosion protection, gas-tight wall sleeving, and certified isolation valves prevent dangerous leaks.",
    immediateActions: [
      "Ensure all external copper and MDPE pipework is properly supported with non-combustible pipe clips.",
      "Emergency isolation valves (EIV) must be clearly labeled, accessible, and tested annually for smooth operation.",
      "Protect exposed pipework from accidental impact along driveways, loading bays, and public pathways.",
      "Two-stage regulation systems must feature integrated over-pressure (OPSO) and under-pressure (UPSO) shut-off devices.",
      "Ensure all building entry pipe penetrations are sealed gas-tight and sleeved through masonry walls."
    ],
    steps: [
      { num: "01", title: "Inspect Pipe Clamps & Clips", text: "Verify that copper pipework is securely anchored at statutory intervals (max 1.5m) to prevent vibration and sagging." },
      { num: "02", title: "Test Emergency Isolation Valves", text: "Turn external quarter-turn lever valves back and forth to confirm smooth operation. Handles must point perpendicular when OFF." },
      { num: "03", title: "Check Building Wall Sleeves", text: "Confirm gas pipes entering brickwork pass through continuous PVC/copper sleeves sealed with non-setting fire-retardant mastic." },
      { num: "04", title: "Inspect Regulator OPSO/UPSO", text: "Ensure secondary over-pressure shut-off valves show green indicator flags and have not tripped due to line pressure surges." },
      { num: "05", title: "Perform Annual Pressure Test", text: "Have a Gas Safe engineer perform a 10-minute electronic manometer tightness test to prove 0.0 mbar pressure drop." }
    ],
    whatToCheck: [
      "Check for visible green verdigris corrosion, surface pitting, or paint flaking on external copper pipe runs",
      "Check that high-visibility yellow 'GAS' warning tape is present on underground and above-ground gas lines",
      "Verify that earth bonding continuity clamps are securely attached to gas pipework where required by BS 7671",
      "Inspect secondary regulators to ensure breather vents are free from mud, paint, or ice obstruction"
    ],
    whatToAvoid: [
      "NEVER use gas pipework as an electrical earth, or hang washing lines, tools, or bikes from gas pipes",
      "NEVER bury unprotected bare copper pipework directly in soil without certified yellow plastic factory sleeving",
      "NEVER conceal mechanical compression joints inside cavity walls, solid floors, or ceiling voids",
      "NEVER run gas pipework through lift shafts, unventilated ducts, or drainage inspection chambers",
      "NEVER operate gas systems if the OPSO safety reset button has tripped without finding the root cause"
    ],
    whenToLeave: "If underground gas pipework is damaged or snagged by garden digging or building excavators, evacuate the entire area immediately. Do not attempt to bend or crimp damaged gas pipework.",
    afterLeaving: "Shut off the gas supply at the cylinder or tank immediately if safe to do so from upwind. Call emergency services and John Stayte Services right away.",
    whenToCallPro: "All pipework installation, extension, electronic tightness testing, and regulator commissioning must be performed by certified Gas Safe engineers: 01452 741234.",
    recapPoints: [
      "Emergency Isolation Valves (EIV) must remain unobstructed",
      "Pipes entering buildings must be properly sleeved and sealed",
      "Never hang items or connect electrical earths to gas pipes",
      "Underground pipework requires factory-sleeved protection",
      "Annual electronic manometer tightness testing is essential"
    ]
  },

  // 10. Safe Cylinder Storage
  {
    id: "safe-cylinder-storage",
    title: "Safe Cylinder Storage",
    badge: "Storage Safety",
    description: "Correct positioning, ventilation, and outdoor storage principles for LPG bottles.",
    image: safetyStorageV3Img,
    icon: StoringBottleIcon,
    overview: "Essential safety guidance for storing Propane and Butane bottles on residential and rural properties, preventing gas accumulation and weather degradation.",
    situationTitle: "RESIDENTIAL CYLINDER STORAGE REQUIREMENTS",
    situationText: "Safe storage protects cylinders against accidental impact, tampering, radiant heat, and pooling gas hazards. Following UK code requirements keeps your household and neighbours completely protected.",
    immediateActions: [
      "Always store LPG cylinders upright on a solid, non-combustible concrete or paved stone base outdoors.",
      "Ensure the storage position has unrestricted natural ventilation to disperse any minute trace gas immediately.",
      "Maintain a minimum 1-metre horizontal clearance from windows, doors, air bricks, and cellar entry points.",
      "Keep cylinders at least 3 metres away from bonfires, garden fire pits, barbecues, and outdoor electrical sockets.",
      "Fasten cylinders securely with wall chains or purpose-built metal safety brackets to prevent accidental tipping."
    ],
    steps: [
      { num: "01", title: "Select Concrete Base", text: "Place cylinders on a flat, level concrete slab or paved flagstones to prevent subsidence or ground moisture corrosion." },
      { num: "02", title: "Anchor with Safety Chains", text: "Fasten heavy-duty rustproof chains around the cylinder mid-section to a solid masonry wall." },
      { num: "03", title: "Check Distance from Drains", text: "Ensure no open drain grates or unsealed cellar covers are within 2 metres of the storage footprint." },
      { num: "04", title: "Protect Disconnected Bottles", text: "Refit protective plastic dust caps and plugs onto valve outlets whenever bottles are not in active service." },
      { num: "05", title: "Keep Area Tidy & Free of Debris", text: "Clear away dry leaves, garden clippings, timber, and flammable chemicals from around the gas storage perimeter." }
    ],
    whatToCheck: [
      "Check that cylinder storage bases remain level and have not shifted due to frost heave or soil movement",
      "Inspect wall chain anchor bolts and brackets to ensure they are firmly secured in solid brickwork",
      "Verify that full and empty cylinders are kept segregated and clearly marked with status tags",
      "Ensure storage enclosures have open mesh panels allowing at least 50% free natural air exchange"
    ],
    whatToAvoid: [
      "NEVER store gas cylinders inside domestic rooms, porches, cellars, basements, or under stairwells",
      "NEVER store cylinders in wooden garden sheds or unventilated plastic storage boxes",
      "NEVER place cylinders directly on soft earth, grass, or gravel where ground moisture accelerates base corrosion",
      "NEVER store solvents, paints, petrol cans, or weedkillers in the same storage zone as gas bottles",
      "NEVER cover cylinders with non-breathable plastic tarpaulins that trap moisture and gas vapour"
    ],
    whenToLeave: "If you discover a stored cylinder is leaking or venting vapour in an enclosed or semi-enclosed alcove, step back upwind at least 15 metres and keep everyone away.",
    afterLeaving: "Do not operate outdoor garden lighting or vehicle engines. Contact John Stayte Services on 01452 741234 or the National Gas Emergency line.",
    whenToCallPro: "Contact John Stayte Services for supply and installation of certified galvanised residential cylinder security cages, wall brackets, and auto-changeover kits.",
    recapPoints: [
      "Store cylinders upright on solid concrete paving outdoors",
      "Maintain 1m from doors/windows and 3m from ignition sources",
      "Never store LPG bottles in sheds, cellars, or garages",
      "Secure bottles with wall chains or lockable steel brackets",
      "Keep storage areas clear of timber, weeds, and chemicals"
    ]
  },

  // 11. Keep Cylinders Upright
  {
    id: "keep-cylinders-upright",
    title: "Keep Cylinders Upright",
    badge: "Vertical Handling",
    description: "Why gas cylinders must remain vertical with relief valves pointing upwards.",
    image: safetyUprightV3Img,
    icon: AlertLineIcon,
    overview: "Technical explanation and life-safety reasons why LPG bottles must remain strictly vertical during storage, transit, and active operation.",
    situationTitle: "LIQUID LPG VS VAPOUR PHASE DYNAMICS",
    situationText: "LPG is stored inside steel bottles as a pressurized liquid occupying the bottom 80-85%, with pressurized vapour at the top. Keeping cylinders upright ensures internal pressure-relief valves communicate exclusively with the vapour space.",
    immediateActions: [
      "Always keep cylinders standing vertically upright during storage, appliance operation, and vehicle transit.",
      "Ensure relief valves and cylinder handwheels point straight upwards towards the sky.",
      "Never lay cylinders on their sides or roll them horizontally across the ground.",
      "Fasten securely in vehicles or outdoor storage racks using heavy-duty ratchet straps.",
      "Even 'empty' cylinders must remain upright as dangerous residual liquid and heavy vapour remain inside."
    ],
    steps: [
      { num: "01", title: "Inspect Standing Stability", text: "Ensure the cylinder base foot-ring rests flat and stable on a level, non-combustible surface." },
      { num: "02", title: "Position Valve Upward", text: "Verify the brass valve assembly, handwheel, and pressure relief orifice point straight up." },
      { num: "03", title: "Secure Against Tipping", text: "Use wall chains, cylinder stands, or vehicle transport cradles to prevent accidental tipping." },
      { num: "04", title: "Never Roll on Barrel", text: "Use a purpose-built two-wheeled cylinder trolley or cylinder handling technique to move bottles." },
      { num: "05", title: "Handle Empty Bottles Same", text: "Treat empty cylinders with the exact same safety care as full bottles: keep vertical and capped." }
    ],
    whatToCheck: [
      "Check that cylinder base foot-rings are not bent, cracked, or deformed from rough handling",
      "Inspect transport cradles and wall safety chains to ensure they restrain the bottle at 2/3 height",
      "Check that cylinder valve protective shroud collars are intact and have not taken direct impact"
    ],
    whatToAvoid: [
      "NEVER lay a cylinder horizontally on its side in a car boot, van bed, or garden storage area",
      "NEVER operate any gas appliance connected to a cylinder that is tilted or lying on its side",
      "NEVER roll gas cylinders horizontally along the ground or throw them from vehicle tailgates",
      "NEVER use cylinders as rollers to move heavy machinery or furniture across the floor",
      "NEVER invert or shake gas cylinders to 'get the last bit of gas out' — this risks liquid entering regulators"
    ],
    whenToLeave: "If a horizontal or fallen cylinder begins releasing liquid gas (visible as dense white frosty fog or liquid spray), evacuate the entire area immediately upwind at least 25 metres.",
    afterLeaving: "Liquid LPG expands 250 times into gas vapour and creates an immediate severe flash-fire hazard. Alert emergency services (999) without delay.",
    whenToCallPro: "If a cylinder has suffered heavy impact, neck deformation, or has fallen from a vehicle, contact John Stayte Services for professional assessment and safe recovery.",
    recapPoints: [
      "Always keep gas cylinders standing vertically upright",
      "Laying cylinders flat allows dangerous liquid to enter regulators",
      "Valves and relief vents must point straight up",
      "Never roll cylinders horizontally on their sides",
      "Empty cylinders still contain liquid and must stay upright"
    ]
  },

  // 12. Keep Away From Flames
  {
    id: "keep-away-from-flames",
    title: "Keep Away From Flames",
    badge: "Ignition Safety",
    description: "Maintaining safe statutory separation distances from open fires, barbecues, and sparks.",
    image: safetyAwayFromFlamesV3Img,
    icon: Flame,
    overview: "Crucial guidance on maintaining safe physical separation distances between LPG bottles, barbecue burners, outdoor heaters, fire pits, and electrical spark sources.",
    situationTitle: "THERMAL RADIATION & IGNITION SEPARATION",
    situationText: "Radiant heat from nearby barbecues, bonfires, patio heaters, or electrical arcing rapidly heats cylinder steel, causing internal liquid LPG to boil and internal pressure to surge dangerously.",
    immediateActions: [
      "Maintain a minimum 3-metre clearance from open bonfires, barbecues, patio heaters, and fire pits.",
      "Never smoke, vape, or light matches near gas storage, cylinder changeover, or appliance connection areas.",
      "Keep cylinders clear of outdoor power sockets, air conditioning condenser units, and light switches.",
      "Position flexible gas hoses so they cannot contact hot cooker surfaces, oven sides, or BBQ hoods.",
      "Keep timber, dry foliage, garden waste, paints, and petrol well clear of gas bottles."
    ],
    steps: [
      { num: "01", title: "Position BBQ at Safe Distance", text: "Place the gas cylinder outside the direct heat footprint of the barbecue body and side burners." },
      { num: "02", title: "Inspect Hose Routing", text: "Ensure flexible rubber gas hoses do not touch hot barbecue drip trays, firebox panels, or burner tubes." },
      { num: "03", title: "Enforce 3m Smoking Ban", text: "Never permit smoking, vaping, or open flames within 3 metres of cylinders or connection points." },
      { num: "04", title: "Clear Combustible Debris", text: "Remove dry grass, wooden pallets, paints, and aerosol cans from the immediate cylinder area." },
      { num: "05", title: "Keep Fire Extinguisher Handy", text: "Keep a dry powder fire extinguisher or fire blanket accessible whenever operating outdoor gas cooking equipment." }
    ],
    whatToCheck: [
      "Check that barbecue gas hoses are protected from radiant heat and hot fat dripping from the grill",
      "Verify that outdoor electrical cables, junction boxes, and security lights are at least 1m away from gas lines",
      "Check patio heater base stability: ensure cylinders inside heater housings are firmly strapped"
    ],
    whatToAvoid: [
      "NEVER operate gas barbecues or patio heaters directly under low timber pergolas, awnings, or marquee canopies",
      "NEVER place gas cylinders directly behind barbecue grease trays or underneath open charcoal grills",
      "NEVER use lighter fluid, petrol, or aerosol accelerants near gas cylinders or burners",
      "NEVER leave gas patio heaters or barbecues operating unattended around children or pets",
      "NEVER store gas cylinders near domestic incinerators, garden bonfires, or outdoor wood burners"
    ],
    whenToLeave: "If an uncontrolled fire breaks out near a gas cylinder and cannot be instantly extinguished with a fire blanket, evacuate the area immediately to a distance of at least 100 metres.",
    afterLeaving: "Notify the Fire & Rescue Service (999) immediately. Inform the emergency incident commander of the exact number, size, and location of gas cylinders involved.",
    whenToCallPro: "Contact John Stayte Services for certified gas barbecue regulators, armored high-temperature pigtails, and outdoor gas appliance hardware.",
    recapPoints: [
      "Maintain a minimum 3-metre clearance from fires and barbecues",
      "Ensure rubber gas hoses never contact hot metal surfaces",
      "Never smoke or light matches near gas storage areas",
      "Keep fire blankets or dry powder extinguishers nearby",
      "Evacuate 100m immediately if a nearby fire threatens a cylinder"
    ]
  },

  // 13. Ventilation & Leak Checks
  {
    id: "ventilation-leak-checks",
    title: "Ventilation & Leak Checks",
    badge: "Leak Detection",
    description: "Routine soapy water bubble testing and ventilation checks for safe connections.",
    image: safetyVentilationLeaksFinalImg,
    icon: ConnectingBottlesIcon,
    overview: "Detailed instructions on executing routine 50/50 soapy water leak tests, recognizing micro-leaks, and maintaining permanent ventilation openings.",
    situationTitle: "BUBBLE LEAK TESTING & VENTILATION PRINCIPLES",
    situationText: "Unrestricted air exchange prevents minor gas seepage from reaching flammable concentrations (LPG lower explosive limit is approx 2%). Performing systematic bubble checks identifies joint leaks before appliances are lit.",
    immediateActions: [
      "Ensure permanent room ventilation grilles, air bricks, and window trickle vents remain completely clear.",
      "Perform a bubble test with 50/50 soapy water or certified leak detection fluid across all joints after every bottle swap.",
      "Inspect flexible rubber pigtails and hoses for hairline cracks, weathering, and 5-year replacement date stamps.",
      "Tighten propane Left-Hand (LH) threaded nuts anti-clockwise using the correct Calor cylinder spanner.",
      "Never test for gas leaks using matches, lighters, or any naked flame."
    ],
    steps: [
      { num: "01", title: "Mix 50/50 Bubble Solution", text: "Mix equal parts washing-up liquid and water in a spray bottle or cup, or use certified Leak Detection Fluid (LDF)." },
      { num: "02", title: "Turn Off Appliance Burners", text: "Ensure all cooker and appliance control knobs are in the OFF position before testing." },
      { num: "03", title: "Open Cylinder Valve", text: "Open the cylinder handwheel 1 to 2 turns to pressurize the regulator and flexible hose lines." },
      { num: "04", title: "Apply Solution to All Joints", text: "Brush or spray the soapy mixture generously over the valve stem, regulator nut, hose barb, and joint crimps." },
      { num: "05", title: "Inspect for Growing Bubbles", text: "Watch for 60 seconds. Growing, frothing bubbles signal an active gas leak. If seen, shut valve immediately and reseat." }
    ],
    whatToCheck: [
      "Check that permanent room air bricks and window trickle vents are free from dust, paint, and furniture blockages",
      "Inspect high-pressure flexible rubber hoses for surface perishing, cracking, stiffening, or oil degradation",
      "Verify that rubber 'O' ring washers inside regulator bullnose fittings are supple and uncracked",
      "Confirm that appliance flame failure devices (FFD) shut off gas flow if burner flame is extinguished"
    ],
    whatToAvoid: [
      "NEVER tape over, block, or stuff insulation into air bricks or wall vents to stop winter draughts",
      "NEVER use naked flames, candles, or lighters to search for gas leaks",
      "NEVER ignore small intermittent bubbling on regulator joints; shut the valve, wipe dry, and reseat connection",
      "NEVER use corrosive acid-based cleaning chemicals on brass gas fittings or copper pipework",
      "NEVER continue using a flexible gas hose past its printed 5-year replacement expiry date"
    ],
    whenToLeave: "If soapy water testing reveals violent frothing that persists after reseating and tightening, or if you can hear audible hissing, shut the cylinder valve and step outside into fresh air.",
    afterLeaving: "Leave the cylinder isolated outdoors. Do not attempt to use the appliance until a replacement regulator or hose has been fitted.",
    whenToCallPro: "If joint leaks cannot be resolved by gentle retightening, or if you require fixed pipework electronic manometer soundness testing, call John Stayte Services on 01452 741234.",
    recapPoints: [
      "Test all new cylinder connections with 50/50 soapy water",
      "Growing froth and bubbles indicate an active gas leak",
      "Never use a naked flame to test for gas leaks",
      "Never block air bricks or permanent room ventilation grilles",
      "Replace flexible rubber hoses every 5 years"
    ]
  },

  // 14. Child & Pet Safety
  {
    id: "child-pet-safety",
    title: "Child & Pet Safety",
    badge: "Home Protection",
    description: "Securing cylinder storage areas and appliances away from children and pets.",
    image: safetyChildPetFinalImg,
    icon: ShieldCheck,
    overview: "Practical advice on securing LPG cylinders, room heaters, cooker knobs, and flexible rubber hoses from curious children and household pets.",
    situationTitle: "PROTECTING VULNERABLE HOUSEHOLD MEMBERS",
    situationText: "Children and pets are naturally curious. Gas valves, regulator knobs, and flexible rubber hoses must be physically protected from accidental tampering, gnawing, clawing, or impact.",
    immediateActions: [
      "House outdoor cylinders inside a secure, lockable, well-ventilated galvanised mesh storage cage or timber cabinet.",
      "Keep all gas appliances, cooker knobs, and valve handles safely out of reach of young children.",
      "Protect flexible rubber hoses from pet biting, clawing, and rodent gnawing using protective conduit.",
      "Teach children never to climb on, play near, or touch gas cylinders, copper pipes, or regulators.",
      "Never leave portable indoor cabinet heaters unattended in rooms with toddlers, puppies, or kittens."
    ],
    steps: [
      { num: "01", title: "Install Lockable Enclosures", text: "Secure outdoor cylinders inside a lockable, ventilated safety enclosure with childproof padlock latches." },
      { num: "02", title: "Fit Cooker Knob Safety Covers", text: "Use childproof safety covers or locking clips on domestic gas cooker knobs to prevent accidental turning." },
      { num: "03", title: "Protect Flexible Hoses", text: "Shield rubber hoses with metal conduit sleeves to prevent dogs or rodents gnawing through gas lines." },
      { num: "04", title: "Use Fireguards Around Heaters", text: "Place a certified BS 8423 nursery fireguard securely around portable cabinet heaters in family living areas." },
      { num: "05", title: "Educate Family Members", text: "Teach children that gas cylinders and valves are strictly for adults and must never be touched or played near." }
    ],
    whatToCheck: [
      "Check that padlocks and security latches on outdoor storage cages are locked and keys kept safely out of reach",
      "Inspect flexible rubber hoses regularly for teeth indentations, claw scratches, or surface abrasions",
      "Verify that portable indoor cabinet heaters have secure rear panels preventing pets reaching internal bottles",
      "Confirm that carbon monoxide alarms are positioned at breathing height in children's bedrooms"
    ],
    whatToAvoid: [
      "NEVER leave gas bottle valves unlocked or freely accessible in garden play zones or patio areas",
      "NEVER allow dogs or pets to sleep directly against gas supply hoses, regulator lines, or room heaters",
      "NEVER leave portable cabinet heater control knobs unlocked around unsupervised toddlers",
      "NEVER let children use outdoor gas barbecues or patio heaters without strict adult supervision",
      "NEVER store toys, balls, or pet bedding in the same space as gas cylinders"
    ],
    whenToLeave: "If a child or pet accidentally knocks a heater over or turns an unlit gas valve, shut off the valve immediately, open all windows wide, and escort children and pets outside into fresh air.",
    afterLeaving: "Ensure children and pets remain outdoors until the room has completely ventilated and no trace gas odour remains.",
    whenToCallPro: "John Stayte Services supplies heavy-duty galvanised lockable cylinder security cages, armored flexible hoses, and appliance safety accessories: 01452 741234.",
    recapPoints: [
      "House outdoor cylinders in lockable, ventilated safety cages",
      "Protect flexible rubber hoses from pet teeth and claws",
      "Use childproof safety covers on cooker knobs and valves",
      "Fit nursery fireguards around portable indoor heaters",
      "Never allow children or pets to play near gas equipment"
    ]
  },

  // 15. What To Do If You Smell Gas
  {
    id: "what-to-do-if-you-smell-gas",
    title: "What To Do If You Smell Gas",
    badge: "Leak Response",
    description: "Immediate safety actions, valve shut-off, and evacuation steps if a gas smell is detected.",
    image: safetySmellGasV3Img,
    icon: PhoneCall,
    overview: "Step-by-step emergency protocol to follow the instant you detect a gas odour inside or outside your property, protecting life and property.",
    situationTitle: "IMMEDIATE EMERGENCY GAS LEAK RESPONSE",
    situationText: "LPG contains a distinctive 'rotten egg' or sulfur odorant to ensure even the smallest leak is immediately detected. Calm, immediate, methodical action is vital to prevent accidental ignition.",
    immediateActions: [
      "Turn off the gas supply immediately at the cylinder valve handwheel (turn clockwise to OFF).",
      "Extinguish all naked flames, candles, pilot lights, and cigarettes without delay.",
      "Do NOT turn any electrical switches, extractors, sockets, or lights on or off.",
      "Open all external doors and windows wide to promote rapid natural cross-ventilation.",
      "Evacuate everyone to an outdoor safe point at least 15 metres away and call 0800 111 999."
    ],
    steps: [
      { num: "01", title: "Shut Off Cylinder Valve", text: "Turn the handwheel on the top of the cylinder fully clockwise to isolate the gas flow immediately." },
      { num: "02", title: "Eliminate All Sparks", text: "Do not touch electrical switches, light switches, power points, cooker hoods, or doorbells." },
      { num: "03", title: "Open Doors & Windows Wide", text: "Create immediate cross-ventilation by opening external doors and windows to disperse heavy pooling vapour." },
      { num: "04", title: "Evacuate Property Immediately", text: "Escort all occupants and pets outside to an outdoor assembly point at least 15 metres from the building." },
      { num: "05", title: "Call National Gas Helpline", text: "From a safe outdoor location, call 0800 111 999 (24/7 Freephone) or 999 in case of immediate fire risk." }
    ],
    whatToCheck: [
      "Confirm the cylinder handwheel is turned fully clockwise to the completely closed position",
      "Check if any cooker control dials were accidentally bumped or left open without ignition",
      "Ensure all building occupants, children, and pets have safely evacuated to outdoor fresh air"
    ],
    whatToAvoid: [
      "NEVER touch light switches, extractors, power sockets, or landline phones inside the building",
      "NEVER use matches, lighters, candles, or mobile phones inside the affected property",
      "NEVER enter cellars, basements, or inspection pits as LPG settles in low-lying areas",
      "NEVER turn the gas supply back on until a certified Gas Safe engineer has tested the entire installation",
      "NEVER re-enter the property until certified emergency engineers declare it completely safe"
    ],
    whenToLeave: "Leave the building immediately if the gas odour is strong, if you hear hissing from a pipe joint or valve, or if you feel dizzy, nauseous, or lightheaded.",
    afterLeaving: "Remain outside at a safe distance. Warn neighbours if necessary, especially those downwind or in basement properties. Wait for emergency response engineers.",
    whenToCallPro: "National Gas Emergency Helpline: 0800 111 999 (24/7 Freephone). For emergency cylinder isolation assistance or post-incident safety testing, contact John Stayte Services on 01452 741234.",
    recapPoints: [
      "Turn off cylinder valve clockwise to isolate gas supply",
      "Do NOT operate any electrical switches or naked flames",
      "Open doors and windows wide for cross-ventilation",
      "Evacuate all occupants outdoors to a safe distance (15m)",
      "Call National Gas Emergency (0800 111 999) from outside"
    ]
  }
];

function BlogKnowledgeCentrePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [dbPosts, setDbPosts] = useState<any[]>([]);

  // Safety Guidance modal state
  const [activeSafetyGuideId, setActiveSafetyGuideId] = useState<string | null>(null);
  const activeSafetyGuide = useMemo(
    () => SAFETY_GUIDANCE_ITEMS.find((g) => g.id === activeSafetyGuideId) || null,
    [activeSafetyGuideId]
  );

  // Safety Checklist state
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Safety Essentials Expandable Card & Modal State



  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Fetch real blog posts from Supabase if available
  useEffect(() => {
    async function fetchDbPosts() {
      try {
        const [{ data: tablePosts }, { data: blockData }] = await Promise.all([
          supabase.from("cms_blog_posts").select("*").eq("is_published", true).order("created_at", { ascending: false }),
          supabase.from("cms_content_blocks").select("content").eq("section_key", "blog_posts_data").maybeSingle(),
        ]);

        let parsed: any[] = [];
        if (blockData?.content) {
          try {
            parsed = JSON.parse(blockData.content);
          } catch {}
        }

        let local: any[] = [];
        try {
          const stored = localStorage.getItem("jss_admin_blog_posts");
          if (stored) local = JSON.parse(stored);
        } catch {}

        const combined = new Map<string, any>();
        if (Array.isArray(parsed)) parsed.forEach((p) => combined.set(p.slug, p));
        if (Array.isArray(local)) local.forEach((p) => combined.set(p.slug, { ...combined.get(p.slug), ...p }));
        if (Array.isArray(tablePosts) && tablePosts.length > 0) {
          tablePosts.forEach((p) => combined.set(p.slug, { ...combined.get(p.slug), ...p }));
        }

        const list = Array.from(combined.values());
        if (list.length > 0) {
          setDbPosts(list.filter((p) => p.is_published !== false));
        }
      } catch {
        // Fallback gracefully
      }
    }
    fetchDbPosts();

    const handleUpdate = () => fetchDbPosts();
    window.addEventListener("cms_blog_updated", handleUpdate);
    return () => window.removeEventListener("cms_blog_updated", handleUpdate);
  }, []);

  // Merge DB posts with rich catalog articles
  const allArticles: BlogPost[] = useMemo(() => {
    if (dbPosts.length > 0) {
      const merged: BlogPost[] = [];
      dbPosts.forEach((p) => {
        const existing = blogArticles.find((a) => a.slug === p.slug);
        if (existing) {
          merged.push({
            ...existing,
            title: p.title || existing.title,
            excerpt: p.excerpt || existing.excerpt,
            heroImage: p.image_url || existing.heroImage,
            date: p.created_at || existing.date,
          });
        } else {
          merged.push({
            id: p.id,
            slug: p.slug,
            title: p.title,
            date: p.created_at,
            tag: p.tag || "Safety & Advice",
            category: (p.category as any) || "Guides",
            readingTime: p.reading_time || "4 min read",
            author: {
              name: p.author_name || "John Stayte Team",
              role: p.author_role || "LPG Specialist",
            },
            excerpt: p.excerpt || "",
            heroImage: p.image_url || safetyMeasuresInfographic,
            summary: p.excerpt || "",
            sections: [],
          });
        }
      });
      blogArticles.forEach((a) => {
        if (!merged.some((m) => m.slug === a.slug)) {
          merged.push(a);
        }
      });
      return merged;
    }
    return blogArticles;
  }, [dbPosts]);

  // Filter articles based on search query and category
  const filteredArticles = useMemo(() => {
    return allArticles.filter((article) => {
      let matchesCategory = selectedCategory === "All";
      if (!matchesCategory) {
        if (selectedCategory === "Fuel Advice") {
          matchesCategory =
            article.category === "Regulations" ||
            article.tag.toLowerCase().includes("fuel") ||
            article.title.toLowerCase().includes("fuel");
        } else {
          matchesCategory =
            article.category === selectedCategory ||
            article.tag.toLowerCase() === selectedCategory.toLowerCase();
        }
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.tag.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [allArticles, searchQuery, selectedCategory]);

  // Primary Featured Article: Safe Cylinder Storage (uses safetyMeasuresInfographic)
  const featuredArticle = useMemo(() => {
    return allArticles.find((a) => a.slug === "safe-cylinder-storage") || allArticles[0];
  }, [allArticles]);

  // Regular grid articles (6 unique articles)
  const regularArticles = useMemo(() => {
    if (searchQuery || selectedCategory !== "All") {
      return filteredArticles;
    }
    return filteredArticles.filter((a) => a.slug !== featuredArticle?.slug);
  }, [filteredArticles, searchQuery, selectedCategory, featuredArticle]);

  // Checklist counts
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const isChecklistComplete = checkedCount === CHECKLIST_ITEMS.length;

  const toggleChecklistItem = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const resetChecklist = () => {
    setCheckedItems({});
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newsletterEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubscribing(true);
    try {
      // 1. Try insert into newsletter_subscribers table
      try {
        await supabase.from("newsletter_subscribers").insert({
          email: cleanEmail,
          source: "blog_index",
          status: "subscribed",
        });
      } catch {
        /* fallback to block */
      }

      // 2. Persist to newsletter_subscribers in cms_content_blocks
      try {
        const { data: block } = await supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "newsletter_subscribers_data")
          .maybeSingle();

        let list = [];
        if (block?.content) {
          try {
            list = JSON.parse(block.content);
          } catch {
            list = [];
          }
        }
        if (!list.some((item: any) => item.email === cleanEmail)) {
          const updated = [...list, { email: cleanEmail, source: "blog_index", subscribed_at: new Date().toISOString() }];
          await supabase.from("cms_content_blocks").upsert({
            section_key: "newsletter_subscribers_data",
            title: "Newsletter Subscribers List",
            content: JSON.stringify(updated),
          }, { onConflict: "section_key" });
        }
      } catch {
        /* continue */
      }

      setSubscribed(true);
      toast.success("Thank you for subscribing!", {
        description: "You will receive our UK LPG and solid fuel safety advice.",
      });
    } catch (err: any) {
      setSubscribed(true);
      toast.success("Thank you for subscribing!", {
        description: "You will receive our UK LPG and solid fuel safety advice.",
      });
    } finally {
      setSubscribing(false);
    }
  };


  return (
    <SiteLayout>
      <div className="bg-slate-50/50">
        {/* =========================================================================
            1. EDITORIAL LIGHT BLOG HERO (Desktop: Strict Reference Match - 100% Preserved)
        ========================================================================= */}
        <section className="hidden lg:block relative w-full bg-white border-b border-slate-200/60 overflow-hidden">
          {/* Atmospheric Background on Left: Clean Subtle Dot Grid & Ambient Glow */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-35 pointer-events-none" />
          <div className="absolute -left-24 top-1/4 w-[420px] h-[420px] bg-red-50/50 rounded-full blur-3xl pointer-events-none" />

          {/* Right Side: Full-Bleed High-Res Cylinder Lifestyle Image with Soft Left Gradient Fade */}
          <div className="absolute right-0 top-0 bottom-0 w-[52%] xl:w-[50%] h-full pointer-events-none">
            <ScrollRevealCard delay={150} className="w-full h-full">
              <img
                src={blogHeroCylinders}
                alt="John Stayte Services Calor Gas LPG cylinders connected to regulator in modern residential home setting"
                className="w-full h-full object-cover object-left"
                loading="eager"
              />
            </ScrollRevealCard>
            {/* Soft, seamless horizontal gradient blending from pure white on the left into the photo */}
            <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none" />
          </div>

          <div className="container-page max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-12 gap-8 items-center min-h-[520px] py-12">

              {/* Left Column: Content Area (Takes 6 cols out of 12) */}
              <div className="col-span-6 space-y-7 text-left">
                {/* 1. Eyebrow */}
                <ScrollRevealCard delay={0}>
                  <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-primary font-display">
                    SAFETY & ADVICE
                  </p>
                </ScrollRevealCard>

                {/* 2. Main Heading */}
                <ScrollRevealCard delay={80}>
                  <h1 className="text-[52px] xl:text-[58px] font-black text-slate-900 tracking-tight leading-[1.06] font-display">
                    Knowledge Centre
                  </h1>
                </ScrollRevealCard>

                {/* 3. Subtitle / Description */}
                <ScrollRevealCard delay={160}>
                  <p className="text-[17px] text-slate-600 font-normal leading-relaxed max-w-lg">
                    Practical gas safety, fuel advice and useful guidance for safer homes.
                  </p>
                </ScrollRevealCard>

                {/* 4 & 5. CTA Buttons in one horizontal row */}
                <ScrollRevealCard delay={240}>
                  <div className="flex items-center gap-3.5 pt-1">
                    <Link
                      to="/blog/$slug"
                      params={{ slug: "safe-cylinder-storage" }}
                      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-[0_4px_16px_rgba(220,38,38,0.28)] hover:shadow-[0_6px_22px_rgba(220,38,38,0.38)] hover:-translate-y-0.5 transition-all cursor-pointer text-center"
                    >
                      <span>Explore Safety Guides</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </Link>

                    <Link
                      to="/contact"
                      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm shadow-2xs hover:-translate-y-0.5 transition-all cursor-pointer text-center"
                    >
                      <span>Contact Us</span>
                      <ArrowRight className="h-4 w-4 stroke-[2]" />
                    </Link>
                  </div>
                </ScrollRevealCard>

                {/* Benefit Row at Bottom */}
                <div className="pt-8 border-t border-slate-200/80 grid grid-cols-3 gap-5 text-left">
                  {/* 1 */}
                  <ScrollRevealCard delay={320}>
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-red-50 text-primary border border-red-100/80 flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck className="h-4.5 w-4.5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-black text-slate-900 font-display">
                          Practical guidance
                        </h4>
                        <p className="text-xs text-slate-500 font-normal leading-snug mt-0.5">
                          Expert tips and how-to advice.
                        </p>
                      </div>
                    </div>
                  </ScrollRevealCard>

                  {/* 2 */}
                  <ScrollRevealCard delay={400}>
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-red-50 text-primary border border-red-100/80 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="h-4.5 w-4.5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-black text-slate-900 font-display">
                          Local knowledge
                        </h4>
                        <p className="text-xs text-slate-500 font-normal leading-snug mt-0.5">
                          Information for Gloucestershire homes.
                        </p>
                      </div>
                    </div>
                  </ScrollRevealCard>

                  {/* 3 */}
                  <ScrollRevealCard delay={480}>
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-red-50 text-primary border border-red-100/80 flex items-center justify-center shrink-0 mt-0.5">
                        <Flame className="h-4.5 w-4.5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-black text-slate-900 font-display">
                          Safety first
                        </h4>
                        <p className="text-xs text-slate-500 font-normal leading-snug mt-0.5">
                          Helping you stay safe around gas.
                        </p>
                      </div>
                    </div>
                  </ScrollRevealCard>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =========================================================================
            2. MOBILE-ONLY BLOG HERO (Text on White, CTA Buttons Overlaid on Image)
        ========================================================================= */}
        <section className="block lg:hidden relative w-full bg-white border-b border-slate-200/60 overflow-hidden py-7 sm:py-9">
          <div className="container-page px-4 sm:px-6 text-left">
            {/* 1. Header Text Area on White Background */}
            <ScrollRevealCard delay={0}>
              <div className="space-y-3.5 sm:space-y-4">
                {/* Eyebrow */}
                <p className="text-xs sm:text-[13px] font-extrabold uppercase tracking-[0.18em] text-primary font-display">
                  SAFETY & ADVICE
                </p>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-[1.08] font-display">
                  Knowledge Centre
                </h1>

                {/* Subtitle / Description */}
                <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-lg">
                  Practical gas safety, fuel advice and useful guidance for safer homes.
                </p>
              </div>
            </ScrollRevealCard>

            {/* 2. Hero Image Container with Two CTA Buttons Overlaid Directly on Top */}
            <ScrollRevealCard delay={100}>
              <div className="relative w-full overflow-hidden rounded-2xl aspect-[16/11] sm:aspect-[16/9] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200/80 my-4 sm:my-5">
                {/* Exact Propane Cylinders Image */}
                <img
                  src={blogHeroCylinders}
                  alt="John Stayte Services Calor Gas LPG cylinders connected to regulator in modern residential home setting"
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                />

                {/* Subtle Gradient Overlay for High Button Contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent pointer-events-none" />

                {/* Overlaid CTA Buttons directly inside the image */}
                <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 z-10">
                  <Link
                    to="/blog/$slug"
                    params={{ slug: "safe-cylinder-storage" }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-primary/30 transition-all cursor-pointer text-center"
                  >
                    <span>Explore Safety Guides</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </Link>

                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-white/40 bg-black/40 backdrop-blur-md text-white hover:bg-white/20 font-extrabold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer text-center"
                  >
                    <span>Contact Us</span>
                    <ArrowRight className="h-4 w-4 stroke-[2]" />
                  </Link>
                </div>
              </div>
            </ScrollRevealCard>

            {/* 3. Three Feature Items Row (Below the Image) */}
            <div className="pt-4 sm:pt-5 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5 text-left">
              {/* 1. Practical guidance */}
              <ScrollRevealCard delay={150}>
                <div className="flex items-center sm:items-start gap-3">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-red-50 text-primary border border-red-100/80 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-[13px] font-black text-slate-900 font-display">
                      Practical guidance
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-normal leading-snug">
                      Expert tips and how-to advice.
                    </p>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* 2. Local knowledge */}
              <ScrollRevealCard delay={220}>
                <div className="flex items-center sm:items-start gap-3">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-red-50 text-primary border border-red-100/80 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-[13px] font-black text-slate-900 font-display">
                      Local knowledge
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-normal leading-snug">
                      Information for Gloucestershire homes.
                    </p>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* 3. Safety first */}
              <ScrollRevealCard delay={290}>
                <div className="flex items-center sm:items-start gap-3">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-red-50 text-primary border border-red-100/80 flex items-center justify-center shrink-0">
                    <Flame className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-[13px] font-black text-slate-900 font-display">
                      Safety first
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-normal leading-snug">
                      Helping you stay safe around gas.
                    </p>
                  </div>
                </div>
              </ScrollRevealCard>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. SAFETY GUIDANCE (15 Unified Visual Cards with Rectangular 16:9 Images)
        ========================================================================= */}
        <section className="container-page py-8 md:py-12">
          <div className="space-y-6">
            <div className="space-y-1 text-left">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 font-display">
                <ShieldCheck className="h-3.5 w-3.5" /> SAFETY GUIDANCE
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-slate-900 tracking-tight font-display">
                Safety guidance
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-normal">
                Essential UK gas safety rules, cylinder handling protocols, and practical advice to protect your home and business.
              </p>
            </div>

            {/* 15-Card Responsive Grid: 3 cols desktop (5 rows of 3), 2 cols tablet, 1 col mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
              {SAFETY_GUIDANCE_ITEMS.map((item, idx) => (
                <ScrollRevealCard key={item.id} staggerIndex={idx} className="h-full">
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between text-left group h-full">
                    <div className="space-y-4">
                      {/* Clean Rectangular Supporting Photograph (16:9 Aspect Ratio, 0-2px Radius) */}
                      <div className="w-full aspect-[16/9] rounded-[2px] overflow-hidden bg-slate-100 relative border border-slate-100/80">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>

                      {/* Header Row with Icon, Badge & Title */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-red-50 text-primary border border-red-100/70 flex items-center justify-center shrink-0">
                            <item.icon className="h-4 w-4 stroke-[2]" />
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary font-display">
                            {item.badge}
                          </span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-display">
                          {item.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Clean Text-Only CTA */}
                    <div className="pt-4 mt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveSafetyGuideId(item.id)}
                        className="text-primary font-extrabold text-xs sm:text-[13px] hover:text-red-700 transition-colors cursor-pointer select-none text-left p-0 bg-transparent border-0 inline-block focus:outline-none"
                      >
                        View guide
                      </button>
                    </div>
                  </div>
                </ScrollRevealCard>
              ))}
            </div>
          </div>
        </section>

        <div className="container-page py-10 md:py-16 space-y-16">
          {/* =========================================================================
              4. FEATURED SAFETY GUIDE — 3-IMAGE COLLAGE STRICT REFERENCE MATCH
          ========================================================================= */}
          {!searchQuery && selectedCategory === "All" && featuredArticle && (
            <section>
              <ScrollRevealCard delay={80}>
                <Link
                  to="/blog/$slug"
                  params={{ slug: featuredArticle.slug }}
                  className="group surface-card rounded-[28px] sm:rounded-[32px] border border-slate-200/90 bg-white overflow-hidden grid grid-cols-1 lg:grid-cols-12 hover:border-primary/40 hover:shadow-lg transition-all duration-300 shadow-xs cursor-pointer"
                >
                  {/* Left Column (50% on desktop): 3-Image Safety Collage */}
                  <div className="lg:col-span-6 flex flex-col gap-1.5 bg-slate-100/80 p-0 overflow-hidden">
                    {/* Top Large Image: Modern Kitchen Gas Hob with Blue Flame */}
                    <div className="w-full h-[220px] sm:h-[260px] lg:h-[270px] xl:h-[290px] overflow-hidden">
                      <img
                        src={safetyGasHobImg}
                        alt="Modern UK domestic kitchen gas hob with safe blue flame"
                        className="w-full h-full object-cover object-center group-hover:scale-[1.015] transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>

                    {/* Bottom Row: 2 Equal Square/Landscape Images */}
                    <div className="grid grid-cols-2 gap-1.5 w-full h-[140px] sm:h-[170px] lg:h-[180px] xl:h-[190px]">
                      {/* Bottom Left: Carbon Monoxide Alarm Detector */}
                      <div className="w-full h-full overflow-hidden">
                        <img
                          src={safetyCoAlarmImg}
                          alt="Digital carbon monoxide detector alarm mounted on UK home wall"
                          className="w-full h-full object-cover object-center group-hover:scale-[1.015] transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>

                      {/* Bottom Right: Gas Appliance Shutoff Valve & Pipework */}
                      <div className="w-full h-full overflow-hidden">
                        <img
                          src={safetyGasValveImg}
                          alt="Professional brass gas isolation valve and appliance pipework"
                          className="w-full h-full object-cover object-center group-hover:scale-[1.015] transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column (50% on desktop): Clean White Editorial Content */}
                  <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-5 sm:space-y-6 bg-white text-left">
                    <div className="space-y-4">
                      {/* Eyebrow Label */}
                      <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-primary font-display">
                        <ShieldAlert className="h-4 w-4 text-primary" /> FEATURED SAFETY GUIDE
                      </div>

                      {/* Main Heading */}
                      <h2 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-[38px] font-black text-slate-900 group-hover:text-primary transition-colors tracking-tight leading-tight font-display">
                        Gas Cylinder Safety Measures
                      </h2>

                      {/* Reading Time & Date */}
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-semibold">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="h-3.5 w-3.5 text-slate-500" /> {featuredArticle.readingTime}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                          {new Date(featuredArticle.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                        Simple, practical guidance for safer LPG storage, handling and everyday use across domestic and commercial settings.
                      </p>

                      {/* Two-Column Safety Checklist */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-2 text-xs sm:text-[13px] font-bold text-slate-800 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Safe storage
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Outdoor ventilation
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Correct handling
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Leak awareness
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Child safety
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Emergency steps
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary/90 text-white px-7 py-3 text-xs sm:text-sm font-extrabold shadow-sm transition-all text-center">
                        <span>READ SAFETY GUIDE</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
                      </span>
                      <span className="text-xs sm:text-sm text-slate-400 font-semibold hidden sm:inline">100% Free UK Guidance</span>
                    </div>
                  </div>
                </Link>
              </ScrollRevealCard>
            </section>
          )}

          {/* =========================================================================
              6. ESSENTIAL GAS SAFETY INFORMATION (3 Large Editorial Columns)
          ========================================================================= */}
          <section className="space-y-8 py-4">
            <div className="space-y-2 text-left">
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-primary tracking-tight font-display">
                Essential Gas Safety Information
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-normal max-w-3xl leading-relaxed">
                Practical guidance for staying safe around LPG, gas appliances and installations.
              </p>
            </div>

            {/* 3-Column Editorial Grid: Desktop 3 cols, Tablet 2 cols, Mobile 1 col */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">

              {/* COLUMN 1: FIRE */}
              <ScrollRevealCard delay={0} className="h-full">
                <div className="bg-[#f4f5f6] rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 lg:p-10 flex flex-col justify-between text-left space-y-6 h-full">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight font-display leading-none">
                        Fire
                      </h3>
                      <p className="text-lg sm:text-xl font-bold text-slate-700 font-display">
                        How to stay safe
                      </p>
                    </div>

                    <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                      <p className="font-extrabold text-slate-900 text-sm sm:text-base">
                        You must call 999 immediately.
                      </p>

                      <p>
                        Ask for the fire service and tell them you have an LPG gas bottle or LPG tank.
                      </p>

                      <ul className="space-y-3.5 pt-2">
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            <strong>If you have gas bottles</strong> - If it&apos;s safe to do so, shut off valves on your gas bottles and the emergency control valve outside the building.
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            <strong>If you have an LPG tank</strong> - If it&apos;s safe to do so, you should shut off all valves and the emergency control valve (ECV) outside the building.
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            Keep all people, children and pets well away from the danger area (at least 100 metres upwind).
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            Call the National Gas Emergency Service on 0800 111 999 or John Stayte Emergency Support on 01452 741234.
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            Don&apos;t turn on the gas or re-enter the building until the system has been declared completely safe by a certified engineer and all appliances have been turned off.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* COLUMN 2: GAS LEAKS */}
              <ScrollRevealCard delay={100} className="h-full">
                <div className="bg-[#f4f5f6] rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 lg:p-10 flex flex-col justify-between text-left space-y-6 h-full">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight font-display leading-none">
                        Gas leaks
                      </h3>
                      <p className="text-lg sm:text-xl font-bold text-slate-700 font-display">
                        If you suspect one
                      </p>
                    </div>

                    <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                      <p>
                        <strong>If you have gas bottles</strong> - Shut off the emergency control valve outside the building and the valve on top of each gas bottle, located under the changeover valve (if applicable).
                      </p>

                      <p>
                        <strong>If you have an LPG tank</strong> - Shut the ECV outside the building. Shut the gas installation valve — you&apos;ll find this on the top of your above ground tank or beneath the cover of your below ground tank.
                      </p>

                      <ul className="space-y-3.5 pt-2">
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            <strong>Don&apos;t</strong> use electrical switches, mobile phones, electrical devices, naked flames, or smoke within the area. Make sure there are no other sources of ignition in the affected area.
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            <strong>Don&apos;t</strong> turn any light switches on or off.
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            Open windows and doors to ventilate, particularly at lower ground levels where dense LPG pools.
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            Move everyone into fresh outdoor air immediately.
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            Call the National Gas Emergency Service on 0800 111 999 or John Stayte Services on 01452 741234.
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            Do not use the installation again until it has been inspected and declared safe by a Gas Safe engineer.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* COLUMN 3: CARBON MONOXIDE */}
              <ScrollRevealCard delay={200} className="h-full md:col-span-2 lg:col-span-1">
                <div className="bg-[#f4f5f6] rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 lg:p-10 flex flex-col justify-between text-left space-y-6 h-full">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight font-display leading-none">
                        Carbon Monoxide
                      </h3>
                      <p className="text-lg sm:text-xl font-bold text-slate-700 font-display">
                        A poisonous gas
                      </p>
                    </div>

                    <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                      <p>
                        CO is produced when appliances aren&apos;t working correctly. It has no colour, smell, or even taste. CO detectors* are available, and we strongly recommend you get one fitted.
                      </p>

                      <ul className="space-y-3.5 pt-1">
                        <li className="flex items-start gap-2.5">
                          <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                          <span>
                            Seek medical attention if you suspect you&apos;re suffering from signs of CO poisoning, and call our Emergency Service on 01452 741234.
                          </span>
                        </li>
                      </ul>

                      <div className="space-y-2 pt-2">
                        <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          Signs of exposure include:
                        </p>
                        <ul className="space-y-2.5 pl-1">
                          <li className="flex items-start gap-2.5">
                            <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                            <span>Tightness across the forehead, headaches, weakness, dizziness, nausea, and vomiting</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                            <span>Breathlessness, chest pains, confusion, and visual impairment</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="text-primary font-bold text-lg leading-none shrink-0 mt-0.5">•</span>
                            <span>Severe exposure can lead to coma, intermittent convulsion, or depressed heart action</span>
                          </li>
                        </ul>
                      </div>

                      <div className="pt-2">
                        <p className="text-[11px] text-slate-500 font-medium">
                          *Complying with BS EN 50291 standard.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollRevealCard>

            </div>
          </section>

          {/* =========================================================================
              8. INTERACTIVE SAFETY CHECKLIST ("Before You Use Your Cylinder")
          ========================================================================= */}
          <ScrollRevealCard delay={0}>
            <section className="surface-card rounded-[28px] border border-slate-200/90 bg-white p-6 sm:p-8 lg:p-10 space-y-7 shadow-xs">
              {/* Header: Title, Category Badge & Prominent Progress Widget */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                <div className="space-y-1.5 text-left">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 font-display">
                    <CheckSquare className="h-4 w-4" /> INTERACTIVE SAFETY TOOL
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                    Before You Use Your Cylinder
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-normal max-w-xl leading-relaxed">
                    Run through these 8 essential pre-use verifications before lighting or operating any gas appliance.
                  </p>
                </div>

                {/* Prominent Progress Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-w-[240px] space-y-2.5 shrink-0 shadow-2xs">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-600 font-bold">Verification Progress</span>
                    <span className={cn("font-black font-display text-xs", isChecklistComplete ? "text-emerald-600" : "text-slate-900")}>
                      {checkedCount} of {CHECKLIST_ITEMS.length} verified
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300 ease-out rounded-full",
                        isChecklistComplete ? "bg-emerald-500" : "bg-primary"
                      )}
                      style={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Success Celebration Banner (When all 8 checks are completed) */}
              {isChecklistComplete && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-fadeIn">
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="h-5 w-5 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-emerald-950 font-display">
                        ✓ Cylinder safety check complete
                      </h4>
                      <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                        All 8 essential safety verifications have passed. Your cylinder setup is safe to use.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetChecklist}
                    className="text-xs font-black text-emerald-700 hover:text-emerald-900 underline underline-offset-4 shrink-0 cursor-pointer self-start sm:self-center font-display"
                  >
                    Reset checklist
                  </button>
                </div>
              )}

              {/* 2-Column Checklist Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {CHECKLIST_ITEMS.map((item, idx) => {
                  const isChecked = !!checkedItems[idx];
                  return (
                    <ScrollRevealCard key={idx} delay={(idx % 2) * 80}>
                      <button
                        type="button"
                        onClick={() => toggleChecklistItem(idx)}
                        className={cn(
                          "w-full group flex items-start gap-3.5 p-4 sm:p-4.5 rounded-2xl border text-left text-xs sm:text-sm transition-all duration-200 cursor-pointer select-none",
                          isChecked
                            ? "bg-emerald-50/70 border-emerald-300 text-slate-900 shadow-2xs"
                            : "bg-slate-50/60 hover:bg-white border-slate-200/80 hover:border-slate-300 text-slate-800 shadow-2xs"
                        )}
                      >
                        {/* Custom Checkbox Indicator */}
                        <div
                          className={cn(
                            "h-5 w-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200",
                            isChecked
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs scale-100"
                              : "border-slate-300 bg-white group-hover:border-primary/60 scale-95"
                          )}
                        >
                          {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>

                        {/* Check Text */}
                        <div className="space-y-0.5">
                          <span
                            className={cn(
                              "leading-relaxed block transition-colors",
                              isChecked
                                ? "font-extrabold text-slate-900"
                                : "font-semibold text-slate-800 group-hover:text-slate-900"
                            )}
                          >
                            {item}
                          </span>
                        </div>
                      </button>
                    </ScrollRevealCard>
                  );
                })}
              </div>

              {/* Compact "Safety First" Information Strip */}
              <div className="p-4 sm:p-4.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3.5 text-xs sm:text-[13px] text-amber-950 text-left">
                <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-extrabold text-amber-950 font-display">Safety first: </strong>
                  Damaged, leaking or unsafe cylinders should never be used under any circumstances. If you discover physical damage, hear hissing, or detect a smell of gas, do not attempt to light any appliance. Move to a safe, well-ventilated outdoor area immediately and contact a Gas Safe registered engineer or call John Stayte Support on{" "}
                  <a href="tel:01452741234" className="font-extrabold underline text-amber-950 hover:text-primary transition-colors">
                    01452 741234
                  </a>.
                </div>
              </div>
            </section>
          </ScrollRevealCard>

          {/* =========================================================================
              9. EMERGENCY SAFETY SECTION (IF YOU SMELL GAS)
          ========================================================================= */}
          <section className="rounded-[28px] sm:rounded-[32px] border border-red-100 bg-white p-6 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 shadow-xs">
            {/* Header: Alert Icon Badge, Eyebrow, Title and High-Visibility Red Phone CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left">
                {/* Circular Alert Icon with thin red outline */}
                <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-full border border-red-200 bg-white flex items-center justify-center text-primary shrink-0 shadow-2xs">
                  <AlertCircle className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary font-display block">
                    EMERGENCY ACTION
                  </span>
                  <h3 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-slate-900 tracking-tight font-display">
                    IF YOU SMELL GAS
                  </h3>
                </div>
              </div>

              {/* Red Phone CTA Button */}
              <a
                href="tel:01452741234"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-primary hover:bg-primary/90 text-white px-7 py-3 text-xs sm:text-sm font-black font-display shadow-sm hover:shadow-md transition-all shrink-0 cursor-pointer self-start sm:self-center"
              >
                <PhoneCall className="h-4 w-4 stroke-[2.5]" />
                <span>01452 741234</span>
              </a>
            </div>

            {/* 5 Distinct Emergency Step Cards (Matching Reference Layout & Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 text-left">

              {/* STEP 1: FLAMES (Warm Orange/Red) */}
              <ScrollRevealCard delay={0} className="h-full">
                <div className="p-5 sm:p-6 rounded-[22px] sm:rounded-[24px] bg-white border border-red-100 hover:border-red-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-5 text-left group cursor-default min-h-[175px] h-full">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-11 w-11 rounded-full border border-orange-200 bg-orange-50/50 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <Flame className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <span className="text-[11px] font-black text-primary uppercase tracking-wider font-display">
                      1. FLAMES
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-sm sm:text-base text-slate-900 font-display leading-snug">
                      Avoid flames &amp; sparks
                    </h4>
                    <p className="text-xs text-slate-500 font-normal leading-relaxed">
                      Extinguish all naked flames and cigarettes immediately.
                    </p>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* STEP 2: ELECTRICITY (Amber/Yellow) */}
              <ScrollRevealCard delay={80} className="h-full">
                <div className="p-5 sm:p-6 rounded-[22px] sm:rounded-[24px] bg-white border border-red-100 hover:border-red-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-5 text-left group cursor-default min-h-[175px] h-full">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-11 w-11 rounded-full border border-amber-200 bg-amber-50/50 text-amber-500 flex items-center justify-center shrink-0 shadow-2xs">
                      <Zap className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <span className="text-[11px] font-black text-primary uppercase tracking-wider font-display">
                      2. ELECTRICITY
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-sm sm:text-base text-slate-900 font-display leading-snug">
                      No electrical switches
                    </h4>
                    <p className="text-xs text-slate-500 font-normal leading-relaxed">
                      Do not turn light switches or appliances on or off.
                    </p>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* STEP 3: SHUT VALVE (Red) */}
              <ScrollRevealCard delay={160} className="h-full">
                <div className="p-5 sm:p-6 rounded-[22px] sm:rounded-[24px] bg-white border border-red-100 hover:border-red-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-5 text-left group cursor-default min-h-[175px] h-full">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-11 w-11 rounded-full border border-red-200 bg-red-50/50 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <CircleOff className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <span className="text-[11px] font-black text-primary uppercase tracking-wider font-display">
                      3. SHUT VALVE
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-sm sm:text-base text-slate-900 font-display leading-snug">
                      Close cylinder valve
                    </h4>
                    <p className="text-xs text-slate-500 font-normal leading-relaxed">
                      Shut bottle valve clockwise if safe to reach.
                    </p>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* STEP 4: VENTILATE (Blue) */}
              <ScrollRevealCard delay={240} className="h-full">
                <div className="p-5 sm:p-6 rounded-[22px] sm:rounded-[24px] bg-white border border-red-100 hover:border-red-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-5 text-left group cursor-default min-h-[175px] h-full">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-11 w-11 rounded-full border border-blue-200 bg-blue-50/50 text-blue-500 flex items-center justify-center shrink-0 shadow-2xs">
                      <Wind className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <span className="text-[11px] font-black text-primary uppercase tracking-wider font-display">
                      4. VENTILATE
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-sm sm:text-base text-slate-900 font-display leading-snug">
                      Move to fresh air
                    </h4>
                    <p className="text-xs text-slate-500 font-normal leading-relaxed">
                      Open doors/windows wide &amp; step outside.
                    </p>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* STEP 5: CONTACT (Green) */}
              <ScrollRevealCard delay={320} className="h-full sm:col-span-2 lg:col-span-1">
                <div className="p-5 sm:p-6 rounded-[22px] sm:rounded-[24px] bg-white border border-red-100 hover:border-red-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-5 text-left group cursor-default min-h-[175px] h-full">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-11 w-11 rounded-full border border-emerald-200 bg-emerald-50/50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <PhoneCall className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <span className="text-[11px] font-black text-primary uppercase tracking-wider font-display">
                      5. CONTACT
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-sm sm:text-base text-slate-900 font-display leading-snug">
                      Call Emergency Line
                    </h4>
                    <p className="text-xs text-slate-500 font-normal leading-relaxed">
                      Call 0800 111 999 or JSS on 01452 741234.
                    </p>
                  </div>
                </div>
              </ScrollRevealCard>

            </div>
          </section>

          {/* =========================================================================
              10. LOCAL KNOWLEDGE & TRUST (Strict Reference Match)
          ========================================================================= */}
          <section className="rounded-[32px] sm:rounded-[36px] border border-slate-200/80 bg-white p-6 sm:p-10 lg:p-12 space-y-8 sm:space-y-10 shadow-sm">
            {/* Header: Centered Eyebrow, Large Bold Title & Flame Icon */}
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary font-display block">
                LOCAL KNOWLEDGE
              </span>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-display leading-tight">
                Advice from a team that understands gas, fuel and local customers.
              </h3>
              <div className="flex justify-center pt-1.5">
                <Flame className="h-4 w-4 text-primary/80" />
              </div>
            </div>

            {/* 4 Premium Information Cards (Equal Height & Clean Single-Layer Presentation) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">

              {/* CARD 1: 50+ Years Trading */}
              <ScrollRevealCard delay={0} className="h-full">
                <div className="relative bg-white rounded-[24px] border border-slate-200/80 shadow-2xs hover:shadow-lg hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left group h-full">
                  <div className="relative aspect-[4/3] w-full">
                    <div className="w-full h-full rounded-t-[23px] overflow-hidden bg-slate-100">
                      <img
                        src={localKnowledgeTradingImg}
                        alt="John Stayte delivery truck"
                        className="object-cover object-center w-full h-full group-hover:scale-103 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    {/* Floating Circular Icon Badge - Fully visible, never clipped */}
                    <div className="absolute -bottom-4 left-5 h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 border-white bg-red-50 text-primary flex items-center justify-center shadow-md z-20">
                      <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 pt-6 sm:pt-7 flex flex-col justify-between flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="font-black text-base sm:text-lg text-slate-900 font-display">
                        50+ Years Trading
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed">
                        Family-run business serving Gloucestershire residents, smallholdings and commercial premises since 1972.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 text-slate-700">
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-bold font-display text-slate-800">
                        Trusted by thousands of local customers
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* CARD 2: 3 Local Stations */}
              <ScrollRevealCard delay={100} className="h-full">
                <div className="relative bg-white rounded-[24px] border border-slate-200/80 shadow-2xs hover:shadow-lg hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left group h-full">
                  <div className="relative aspect-[4/3] w-full">
                    <div className="w-full h-full rounded-t-[23px] overflow-hidden bg-slate-100">
                      <img
                        src={localKnowledgeStationsImg}
                        alt="John Stayte filling stations"
                        className="object-cover object-center w-full h-full group-hover:scale-103 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    {/* Floating Circular Icon Badge - Fully visible, never clipped */}
                    <div className="absolute -bottom-4 left-5 h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 border-white bg-red-50 text-primary flex items-center justify-center shadow-md z-20">
                      <MapPin className="h-5 w-5 stroke-[2.2]" />
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 pt-6 sm:pt-7 flex flex-col justify-between flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="font-black text-base sm:text-lg text-slate-900 font-display">
                        3 Local Stations
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed">
                        Cylinder exchanges and vehicle fuel available at Fromebridge, Wild Goose Garage and Bridge Service Station.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <Link
                        to="/filling-stations"
                        className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline font-display"
                      >
                        <span>Find your nearest station</span>
                        <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                      </Link>
                    </div>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* CARD 3: Wide Range of Products */}
              <ScrollRevealCard delay={200} className="h-full">
                <div className="relative bg-white rounded-[24px] border border-slate-200/80 shadow-2xs hover:shadow-lg hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left group h-full">
                  <div className="relative aspect-[4/3] w-full">
                    <div className="w-full h-full rounded-t-[23px] overflow-hidden bg-slate-100">
                      <img
                        src={localKnowledgeProductsImg}
                        alt="Calor gas cylinders and fuel products"
                        className="object-cover object-center w-full h-full group-hover:scale-103 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    {/* Floating Circular Icon Badge - Fully visible, never clipped */}
                    <div className="absolute -bottom-4 left-5 h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 border-white bg-red-50 text-orange-600 flex items-center justify-center shadow-md z-20">
                      <Flame className="h-5 w-5 stroke-[2.2]" />
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 pt-6 sm:pt-7 flex flex-col justify-between flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="font-black text-base sm:text-lg text-slate-900 font-display">
                        Wide Range of Products
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed">
                        Calor Gas, lifestyle cylinders, appliances, coal, kindling, smokeless fuels and much more.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <Link
                        to="/products"
                        className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline font-display"
                      >
                        <span>Shop our products</span>
                        <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                      </Link>
                    </div>
                  </div>
                </div>
              </ScrollRevealCard>

              {/* CARD 4: Safety First Approach */}
              <ScrollRevealCard delay={300} className="h-full">
                <div className="relative bg-white rounded-[24px] border border-slate-200/80 shadow-2xs hover:shadow-lg hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left group h-full">
                  <div className="relative aspect-[4/3] w-full">
                    <div className="w-full h-full rounded-t-[23px] overflow-hidden bg-slate-100">
                      <img
                        src={localKnowledgeSafetyImg}
                        alt="John Stayte gas expert assisting customer"
                        className="object-cover object-center w-full h-full group-hover:scale-103 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    {/* Floating Circular Icon Badge - Fully visible, never clipped */}
                    <div className="absolute -bottom-4 left-5 h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 border-white bg-red-50 text-primary flex items-center justify-center shadow-md z-20">
                      <UserCheck className="h-5 w-5 stroke-[2.2]" />
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 pt-6 sm:pt-7 flex flex-col justify-between flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="font-black text-base sm:text-lg text-slate-900 font-display">
                        Safety First Approach
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-600 font-normal leading-relaxed">
                        Certified Calor stockist providing verified gas hardware, Defra-approved smokeless fuel, and direct expert support.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <a
                        href="#safety-guidance"
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById("safety-guidance");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline font-display cursor-pointer"
                      >
                        <span>Safety information</span>
                        <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                      </a>
                    </div>
                  </div>
                </div>
              </ScrollRevealCard>

            </div>

            {/* Bottom Highlight / Statistics Trust Strip */}
            <ScrollRevealCard delay={120}>
              <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/60 p-6 sm:p-8 grid grid-cols-2 md:grid-cols-5 gap-6 text-center pt-8">

                {/* Stat 1: 50+ Years */}
                <div className="space-y-1.5 text-center flex flex-col items-center">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                    <Users className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                    50+
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-tight max-w-[140px]">
                    Years of trusted local service
                  </p>
                </div>

                {/* Stat 2: 3 Stations */}
                <div className="space-y-1.5 text-center flex flex-col items-center">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                    <MapPin className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                    3
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-tight max-w-[140px]">
                    Local filling stations
                  </p>
                </div>

                {/* Stat 3: Fast Delivery */}
                <div className="space-y-1.5 text-center flex flex-col items-center">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                    <Truck className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                    Fast
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-tight max-w-[140px]">
                    Local delivery across Gloucestershire
                  </p>
                </div>

                {/* Stat 4: Safety Accredited */}
                <div className="space-y-1.5 text-center flex flex-col items-center">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                    <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                    Safety
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-tight max-w-[140px]">
                    Accredited &amp; safety compliant
                  </p>
                </div>

                {/* Stat 5: Local Community */}
                <div className="space-y-1.5 text-center flex flex-col items-center col-span-2 md:col-span-1">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                    <Handshake className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                    Local
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-tight max-w-[140px]">
                    Supporting local homes, farms &amp; businesses
                  </p>
                </div>

              </div>
            </ScrollRevealCard>
          </section>

          {/* =========================================================================
              12. NEWSLETTER / STAY INFORMED
          ========================================================================= */}
          <ScrollRevealCard delay={80}>
            <section className="surface-card rounded-[28px] border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-6 sm:p-10 space-y-4 shadow-xs text-center max-w-3xl mx-auto">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                  STAY INFORMED
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  Get useful gas, fuel and home energy advice.
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Occasional safety updates, seasonal fuel recommendations, and local service alerts.
                </p>
              </div>

              <form
                onSubmit={handleNewsletterSubmit}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-2"
              >
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  disabled={subscribing || subscribed}
                  className="h-11 rounded-full text-xs sm:text-sm bg-white border-slate-200 focus-visible:ring-primary"
                  required
                />
                <Button
                  type="submit"
                  disabled={subscribing || subscribed}
                  className="h-11 rounded-full px-6 text-xs font-bold bg-primary hover:bg-primary/90 text-white shrink-0 shadow-xs gap-1.5 w-full sm:w-auto"
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Subscribing...
                    </>
                  ) : subscribed ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Subscribed
                    </>
                  ) : (
                    <>
                      Stay informed <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </section>
          </ScrollRevealCard>
        </div >
      </div >

      {/* =========================================================================
          SAFETY GUIDANCE DETAILED KNOWLEDGE CENTRE MODAL (Rich Editorial Handbook)
      ========================================================================= */}
      <Dialog
        open={!!activeSafetyGuideId}
        onOpenChange={(open) => {
          if (!open) setActiveSafetyGuideId(null);
        }}
      >
        {activeSafetyGuide && (
          <DialogContent className="max-w-[860px] w-[95vw] sm:w-full max-h-[88vh] overflow-hidden p-0 rounded-[24px] border border-slate-200/90 shadow-2xl bg-white flex flex-col focus:outline-none">
            {/* 1. Premium Sticky Fixed Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-white flex items-start justify-between gap-4 shrink-0 shadow-2xs z-10">
              <div className="flex items-start gap-4 text-left pr-6">
                <div className="h-12 w-12 rounded-2xl bg-red-50 text-primary border border-red-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <activeSafetyGuide.icon className="h-6 w-6 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary font-display">
                      SAFETY GUIDANCE
                    </span>
                    <span className="rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {activeSafetyGuide.badge}
                    </span>
                  </div>
                  <DialogTitle className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight font-display leading-tight">
                    {activeSafetyGuide.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-slate-500 font-normal">
                    {activeSafetyGuide.description}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* 2. Scrollable Middle Content Area (Comprehensive Multi-Section Editorial Knowledge Handbook) */}
            <div className="px-6 sm:px-8 py-7 overflow-y-auto space-y-8 text-left text-slate-800 flex-1 custom-scrollbar">

              {/* SECTION 1: OVERVIEW */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" /> 1. OVERVIEW &amp; APPLICABILITY
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  {activeSafetyGuide.overview}
                </p>
              </div>

              {/* SECTION 2: SITUATION / IMMEDIATE ACTIONS */}
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-red-950 font-display flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" /> 2. {activeSafetyGuide.situationTitle}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                    {activeSafetyGuide.situationText}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-red-50/40 border border-red-100/90 space-y-2.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-primary font-display block">
                    IMMEDIATE ACTIONS REQUIRED:
                  </span>
                  <div className="space-y-2">
                    {activeSafetyGuide.immediateActions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-800">
                        <span className="h-5 w-5 rounded-full bg-red-100 text-primary flex items-center justify-center shrink-0 text-[11px] font-black mt-0.5">
                          !
                        </span>
                        <span className="leading-relaxed font-medium">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 3: WHAT TO DO STEP-BY-STEP */}
              <div className="space-y-3.5">
                <h4 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> 3. STEP-BY-STEP PROCEDURE
                </h4>
                <div className="grid gap-3 sm:grid-cols-1">
                  {activeSafetyGuide.steps.map((step, idx) => (
                    <div key={idx} className="p-4 sm:p-4.5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors flex items-start gap-3.5 shadow-2xs">
                      <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0 font-display mt-0.5">
                        {step.num}
                      </div>
                      <div className="space-y-0.5">
                        <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 font-display">
                          {step.title}
                        </h5>
                        <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                          {step.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4 & 5: WHAT TO CHECK & WHAT TO AVOID */}
              <div className="space-y-3.5">
                <h4 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" /> 4. INSPECTION CHECKS &amp; HAZARDS TO AVOID
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {/* Left Column: WHAT TO CHECK */}
                  <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" /> WHAT TO CHECK
                    </h5>
                    <ul className="space-y-2.5 text-xs sm:text-[13px] text-slate-600">
                      {activeSafetyGuide.whatToCheck.map((chk, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
                          <span className="leading-relaxed font-normal">{chk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Column: WHAT TO AVOID */}
                  <div className="p-5 rounded-2xl border border-red-100 bg-red-50/40 space-y-3">
                    <h5 className="text-xs font-black uppercase tracking-wider text-red-900 font-display flex items-center gap-2">
                      <AlertOctagon className="h-4 w-4 text-red-600" /> WHAT TO AVOID
                    </h5>
                    <ul className="space-y-2.5 text-xs sm:text-[13px] text-red-950/90">
                      {activeSafetyGuide.whatToAvoid.map((avoid, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-600 font-bold shrink-0 text-xs mt-0.5">✕</span>
                          <span className="leading-relaxed font-normal">{avoid}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* SECTION 6 & 7: WHEN TO LEAVE & AFTER LEAVING */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-amber-950 font-display flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700" /> 5. WHEN TO LEAVE IMMEDIATELY
                  </h5>
                  <p className="text-xs sm:text-[13px] text-amber-900/90 leading-relaxed font-medium">
                    {activeSafetyGuide.whenToLeave}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-100/80 border border-slate-200/90 space-y-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-700" /> 6. AFTER LEAVING THE PROPERTY
                  </h5>
                  <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed font-normal">
                    {activeSafetyGuide.afterLeaving}
                  </p>
                </div>
              </div>

              {/* SECTION 8: WHEN TO CALL A QUALIFIED PROFESSIONAL */}
              <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                <h5 className="text-xs font-black uppercase tracking-wider text-blue-950 font-display flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-700" /> 7. WHEN TO CALL A GAS SAFE PROFESSIONAL
                </h5>
                <p className="text-xs sm:text-[13px] text-blue-900/90 leading-relaxed font-medium">
                  {activeSafetyGuide.whenToCallPro}
                </p>
              </div>

              {/* SECTION 9: EMERGENCY CONTACT STRIP */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-display block">
                  8. 24/7 EMERGENCY CONTACT &amp; TECHNICAL ASSISTANCE
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                      NATIONAL GAS EMERGENCY SERVICE
                    </span>
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-emerald-400 shrink-0" />
                      <strong className="text-white text-sm sm:text-base font-display">0800 111 999</strong>
                    </div>
                    <span className="text-[11px] text-slate-400 block">24 Hours / 7 Days • Freephone UK</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary block">
                      JOHN STAYTE CUSTOMER SERVICE
                    </span>
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-primary shrink-0" />
                      <a href="tel:01452741234" className="text-white text-sm sm:text-base font-display hover:text-primary transition-colors">
                        01452 741234
                      </a>
                    </div>
                    <span className="text-[11px] text-slate-400 block">Local Gloucestershire Team • Mon–Fri</span>
                  </div>
                </div>
              </div>

              {/* SECTION 10: QUICK RECAP CHECKLIST */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-emerald-950 font-display flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 9. QUICK SAFETY RECAP CHECKLIST
                </h5>
                <div className="space-y-2">
                  {activeSafetyGuide.recapPoints.map((recap, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-emerald-950">
                      <div className="h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">
                        ✓
                      </div>
                      <span className="leading-relaxed font-medium">{recap}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* 3. Sticky Fixed Footer with John Stayte Red Button */}
            <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                100% Free UK Safety Guidance • John Stayte Services
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveSafetyGuideId(null)}
                className="h-10 rounded-full px-7 text-xs font-extrabold bg-primary hover:bg-primary/90 text-white ml-auto cursor-pointer shadow-xs transition-colors"
              >
                Close Guide
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </SiteLayout>
  );
}
