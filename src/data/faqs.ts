import {
  HelpCircle,
  Truck,
  Building2,
  Flame,
  CreditCard,
  RefreshCw,
} from "lucide-react";

export const COMPREHENSIVE_FAQS = [
  {
    category: "Ordering & Accounts",
    icon: HelpCircle,
    questions: [
      {
        q: "How do I place an order online?",
        a: "Browse our catalogue at 'Shop & Order Gas', select your cylinder size (e.g. 13kg Propane, 47kg Commercial Propane, 7kg Butane), specify whether you have an empty cylinder to exchange, and proceed to checkout. You can check out as a guest or create an account to view past invoices, reorder quickly, and track real-time delivery status.",
      },
      {
        q: "Can I order over the telephone instead of online?",
        a: "Yes. Our customer support desk at Eastington depot is open Monday to Friday 8:00–17:00 and Saturday 8:30–12:30. Call us directly on +44 (0)1453 822859 and our team will gladly take your order.",
      },
      {
        q: "How do commercial and agricultural trade accounts work?",
        a: "Commercial businesses, hospitality venues, and farms can apply for a trade account with pre-agreed volume pricing and 30-day invoice credit terms. You can submit an application via 'Gas Customer Applications' on our website or speak to our depot management.",
      },
    ],
  },
  {
    category: "Delivery & Areas Covered",
    icon: Truck,
    questions: [
      {
        q: "Which areas do you deliver to?",
        a: "We deliver across Gloucestershire and surrounding border areas within a 40-mile radius of our Eastington/Whitminster depot. Our scheduled delivery areas include Gloucester & Cheltenham (Mon–Fri), Swindon (Mon & Fri), Bristol, Bath & Chippenham (Mon & Wed), Stroud Central & Tewkesbury (Tue & Fri), North Cotswolds (Mon), North Stroud & Malvern (Tue), Dursley, Frampton & Wotton (Wed), and Cirencester, Tetbury & Nailsworth (Thu & Fri).",
      },
      {
        q: "How fast is delivery?",
        a: "Standard delivery is typically next working day or on your area's next scheduled delivery run. Delivery is free for standard orders over £75 across Gloucestershire.",
      },
      {
        q: "Do I need to be home to receive my gas delivery?",
        a: "If you have provided safe access and clear instructions on where to place the cylinders (or where your empty cylinders are left for exchange), our drivers can deliver to your designated safe location. For orders requiring customer handover verification, an SMS one-time passcode (OTP) or signature is requested.",
      },
      {
        q: "What access is required for your delivery vehicles?",
        a: "Our delivery fleet consists of dedicated commercial vehicles carrying ADR-compliant hazardous goods. Please ensure driveways and gates are clear of obstructions. If your property has low bridge clearance or tight rural access, please let us know in your delivery instructions at checkout.",
      },
    ],
  },
  {
    category: "Forecourt Click & Collect",
    icon: Building2,
    questions: [
      {
        q: "How does Click & Collect work?",
        a: "At checkout, choose 'Click & Collect' and select your preferred branch: Gloucester Forecourt, Bridge 76 Cirencester, Wild Goose BP Nailsworth/Dursley, or our Eastington Depot. Once your order is ready, you will receive a notification. Bring your order reference and your empty cylinder (if exchanging) to the forecourt counter for swift handover.",
      },
      {
        q: "What are the collection opening hours?",
        a: "Forecourt collection is available during each station's standard retail opening hours. Most forecourts are open Monday to Saturday 7:00–19:00/20:00 and Sunday 8:00/9:00–17:00/18:00. Exact station hours can be viewed on our 'Filling Stations' page.",
      },
      {
        q: "How does forecourt OTP verification work?",
        a: "To protect your order from unauthorized collection, our forecourt staff verify the handover using a secure 6-digit SMS verification code sent to your registered mobile number.",
      },
    ],
  },
  {
    category: "Cylinder Exchanges & Gas Safety",
    icon: Flame,
    questions: [
      {
        q: "How do cylinder exchanges work?",
        a: "When you return an empty cylinder in the same exchange group (for example, swapping an empty 19kg Propane cylinder for a full 19kg Propane cylinder), you only pay for the gas refill. Our driver or forecourt team inspects and swaps the cylinder on the spot.",
      },
      {
        q: "What if I don't have an empty cylinder to return?",
        a: "If you are purchasing a cylinder for the first time or do not have an empty to return, a standard Calor Cylinder Refill Agreement charge is added to your order. This provides you with the cylinder, which remains the property of Calor Gas plc.",
      },
      {
        q: "Which empty cylinders can be exchanged?",
        a: "Under the Calor refill group rules, like-for-like exchanges are accepted within identical or compatible Calor gas groups (e.g., standard red Propane cylinders, blue Butane cylinders, or green Patio Gas cylinders). Cylinders from different brands or heavily damaged/corroded vessels may not be eligible for exchange.",
      },
      {
        q: "What are the safety rules for storing and transporting gas cylinders?",
        a: "Gas cylinders must always be stored outdoors or in dedicated, well-ventilated storage areas, standing upright and away from sources of heat, ignition, and drains. When transporting cylinders in a vehicle, always keep them upright, secured against movement, and ensure adequate cabin/boot ventilation.",
      },
    ],
  },
  {
    category: "Payment Methods & Invoicing",
    icon: CreditCard,
    questions: [
      {
        q: "What payment methods are supported?",
        a: "We accept all major UK credit and debit cards (Visa, Mastercard, Maestro) processed through our encrypted, PCI-DSS compliant UK banking gateway. For approved trade and agricultural accounts, 30-day invoice credit terms are supported.",
      },
      {
        q: "Will I receive a VAT invoice for my records?",
        a: "Yes. An official VAT invoice showing the net amount, VAT breakdown, and VAT number GB 207 610 984 is automatically generated and emailed to you upon order confirmation. Registered account holders can also download historical PDF invoices at any time under 'My Invoices'.",
      },
    ],
  },
  {
    category: "Returns & Customer Support",
    icon: RefreshCw,
    questions: [
      {
        q: "What should I do if my order has an issue or arrives damaged?",
        a: "Please inspect your items upon delivery. If anything is missing, incorrect, or damaged, contact us within 48 hours at +44 (0)1453 822859 or email info@johnstayteservices.co.uk. We will arrange an immediate doorstep swap, free collection, or full refund.",
      },
      {
        q: "Can I return an item if I change my mind?",
        a: "Yes. Consumer buyers have a 14-day statutory cooling-off period under the Consumer Rights Act 2015. Goods must be unused, in original packaging, and gas cylinders must have their tamper-evident safety seals intact. See our Refund & Cancellation Policy for full details.",
      },
      {
        q: "How can I contact customer support?",
        a: "You can reach us by phone on +44 (0)1453 822859, by email at info@johnstayteservices.co.uk, or via the interactive contact form on our 'Contact' page. Our team is based locally in Gloucestershire.",
      },
    ],
  },
];

