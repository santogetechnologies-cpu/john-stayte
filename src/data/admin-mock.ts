import { products } from "./catalog";
import { OrderStatus } from "./ops";

export type AdminOrder = {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    type: "Domestic" | "Commercial B2B";
    company?: string;
  };
  date: string;
  items: {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
    image: string;
  }[];
  subtotal: number;
  vat: number;
  deliveryFee: number;
  total: number;
  paymentStatus: "Paid" | "Pending" | "Invoice Sent" | "Failed";
  paymentMethod: "Credit Card" | "BACS Account" | "Direct Debit" | "Pay on Delivery";
  fulfillmentStatus: OrderStatus;
  driver?: string;
  area: string;
  address: {
    street: string;
    city: string;
    postcode: string;
    notes?: string;
  };
  timeline: {
    status: OrderStatus;
    time: string;
    note?: string;
    actor: string;
  }[];
};

export type DetailedCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "Domestic" | "Commercial B2B";
  company?: string;
  accountCreated: string;
  totalOrders: number;
  totalSpend: number;
  loyaltyPoints: number;
  status: "Active" | "Inactive" | "Pending Review";
  primaryAddress: {
    street: string;
    city: string;
    postcode: string;
  };
  recentOrders: { id: string; date: string; amount: number; status: OrderStatus }[];
  notes?: string;
};

export type InventoryAlertItem = {
  id: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  targetStock: number;
  unitCost: number;
  supplier: string;
  status: "Low Stock" | "Out of Stock" | "Overstocked";
};

export type DetailedManager = {
  id: string;
  name: string;
  email: string;
  phone: string;
  area: string;
  assignedDepot: string;
  ordersAssigned: number;
  completedOrders: number;
  pendingOrders: number;
  completionRate: number;
  performanceRating: "Excellent" | "Good" | "Needs Attention";
  status: "Active" | "Disabled" | "On Leave";
  avatarUrl?: string;
};

export type AuditLogItem = {
  id: string;
  timestamp: string;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  action: string;
  module: "Orders" | "Catalog" | "Customers" | "Managers" | "CMS" | "System";
  target: string;
  ipAddress: string;
  location: string;
  status: "Success" | "Warning" | "Error";
  metadata?: Record<string, string | number>;
};

export type CmsBanner = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  linkUrl: string;
  active: boolean;
  startDate: string;
  endDate: string;
  position: "Homepage Top" | "Hero Carousel" | "Category Header";
};

export type DetailedOffer = {
  id: string;
  title: string;
  code: string;
  discountType: "Percentage" | "Fixed Amount" | "Bundle";
  value: string;
  usageCount: number;
  maxUsage: number;
  status: "Active" | "Scheduled" | "Expired";
  expiryDate: string;
};

// --- EXPANDED MOCK DATA ---

export const adminOrdersList: AdminOrder[] = [
  {
    id: "JSS-10244",
    customer: {
      name: "The Bell Inn",
      email: "bell@pub.co.uk",
      phone: "01453 889211",
      type: "Commercial B2B",
      company: "The Bell Inn Pub Ltd",
    },
    date: "2026-07-26 10:14",
    items: [
      {
        productId: "34kg-carbon-dioxide-pub-",
        name: "34kg Carbon Dioxide (Pub)",
        sku: "GAS-CO2-34KG",
        quantity: 4,
        unitPrice: 128.0,
        total: 512.0,
        image: products[11]?.image || "",
      },
      {
        productId: "10l-60-40-mixed-gas-pub-",
        name: "10L 60/40 Mixed Gas (Pub)",
        sku: "GAS-MIX-10L",
        quantity: 2,
        unitPrice: 58.0,
        total: 116.0,
        image: products[12]?.image || "",
      },
    ],
    subtotal: 628.0,
    vat: 125.6,
    deliveryFee: 0.0,
    total: 753.6,
    paymentStatus: "Invoice Sent",
    paymentMethod: "BACS Account",
    fulfillmentStatus: "Pending",
    area: "Stroud & District",
    address: {
      street: "High Street, Woodchester",
      city: "Stroud",
      postcode: "GL5 5NN",
      notes: "Deliver via cellar door at back of pub before 11am.",
    },
    timeline: [
      { status: "Pending", time: "2026-07-26 10:14", note: "Order placed via online portal", actor: "System" },
    ],
  },
  {
    id: "JSS-10243",
    customer: {
      name: "Mark Turner",
      email: "mark@farm.co.uk",
      phone: "07700 900123",
      type: "Domestic",
    },
    date: "2026-07-26 09:30",
    items: [
      {
        productId: "calor-gas-propane-47kg-refill",
        name: "Calor Gas Propane 47kg Refill",
        sku: "CAL-PROP-47KG",
        quantity: 2,
        unitPrice: 92.5,
        total: 185.0,
        image: products[0]?.image || "",
      },
    ],
    subtotal: 185.0,
    vat: 9.25,
    deliveryFee: 10.0,
    total: 204.25,
    paymentStatus: "Paid",
    paymentMethod: "Credit Card",
    fulfillmentStatus: "Approved",
    driver: "Ken Porter",
    area: "Cam & Dursley",
    address: {
      street: "Oakridge Farm, Church Lane",
      city: "Cam",
      postcode: "GL11 5HG",
      notes: "Gate code: 4412. Leave beside cylinder cage.",
    },
    timeline: [
      { status: "Pending", time: "2026-07-26 09:30", note: "Order placed", actor: "Mark Turner" },
      { status: "Approved", time: "2026-07-26 09:45", note: "Approved and assigned to Ken P.", actor: "Dave Miller" },
    ],
  },
  {
    id: "JSS-10242",
    customer: {
      name: "Green Acres Farm",
      email: "office@greenacres.uk",
      phone: "01453 543990",
      type: "Commercial B2B",
      company: "Green Acres Agricultural Ltd",
    },
    date: "2026-07-25 16:45",
    items: [
      {
        productId: "calor-gas-propane-47kg-refill",
        name: "Calor Gas Propane 47kg Refill",
        sku: "CAL-PROP-47KG",
        quantity: 6,
        unitPrice: 92.5,
        total: 555.0,
        image: products[0]?.image || "",
      },
      {
        productId: "house-coal-25kg",
        name: "House Coal 25kg",
        sku: "COAL-HC-25KG",
        quantity: 10,
        unitPrice: 19.5,
        total: 195.0,
        image: products[13]?.image || "",
      },
    ],
    subtotal: 750.0,
    vat: 37.5,
    deliveryFee: 0.0,
    total: 787.5,
    paymentStatus: "Paid",
    paymentMethod: "Direct Debit",
    fulfillmentStatus: "Packed",
    driver: "Ken Porter",
    area: "Dursley & Berkeley",
    address: {
      street: "Green Acres Lane, Slimbridge",
      city: "Dursley",
      postcode: "GL2 7BL",
    },
    timeline: [
      { status: "Pending", time: "2026-07-25 16:45", actor: "System" },
      { status: "Approved", time: "2026-07-25 17:00", actor: "Priya Shah" },
      { status: "Packed", time: "2026-07-26 08:15", note: "Loaded onto Truck #3", actor: "Depot Warehouse" },
    ],
  },
  {
    id: "JSS-10241",
    customer: {
      name: "Sarah Hughes",
      email: "customer@jss.com",
      phone: "07890 123456",
      type: "Domestic",
    },
    date: "2026-07-24 14:10",
    items: [
      {
        productId: "calor-gas-propane-19kg-refill",
        name: "Calor Gas Propane 19kg Refill",
        sku: "CAL-PROP-19KG",
        quantity: 1,
        unitPrice: 51.0,
        total: 51.0,
        image: products[1]?.image || "",
      },
      {
        productId: "calor-patio-gas-13kg-refill",
        name: "Calor Patio Gas 13kg Refill",
        sku: "CAL-PATIO-13KG",
        quantity: 1,
        unitPrice: 42.0,
        total: 42.0,
        image: products[5]?.image || "",
      },
    ],
    subtotal: 93.0,
    vat: 4.65,
    deliveryFee: 0.0,
    total: 97.65,
    paymentStatus: "Paid",
    paymentMethod: "Credit Card",
    fulfillmentStatus: "Out for Delivery",
    driver: "Tom Roberts",
    area: "Frampton on Severn",
    address: {
      street: "14 Bridge Road",
      city: "Frampton on Severn",
      postcode: "GL2 7EP",
    },
    timeline: [
      { status: "Pending", time: "2026-07-24 14:10", actor: "Sarah Hughes" },
      { status: "Approved", time: "2026-07-24 14:30", actor: "Dave Miller" },
      { status: "Packed", time: "2026-07-25 07:45", actor: "Depot Team" },
      { status: "Out for Delivery", time: "2026-07-26 09:00", note: "Driver Tom R. en route", actor: "Tom Roberts" },
    ],
  },
  {
    id: "JSS-10239",
    customer: {
      name: "Riverside Cafe",
      email: "hi@riverside.uk",
      phone: "01452 740112",
      type: "Commercial B2B",
      company: "Riverside Hospitality",
    },
    date: "2026-07-22 11:20",
    items: [
      {
        productId: "calor-gas-propane-19kg-refill",
        name: "Calor Gas Propane 19kg Refill",
        sku: "CAL-PROP-19KG",
        quantity: 2,
        unitPrice: 51.0,
        total: 102.0,
        image: products[1]?.image || "",
      },
    ],
    subtotal: 102.0,
    vat: 5.1,
    deliveryFee: 0.0,
    total: 107.1,
    paymentStatus: "Paid",
    paymentMethod: "Credit Card",
    fulfillmentStatus: "Delivered",
    driver: "Ken Porter",
    area: "Gloucester South",
    address: {
      street: "Quay Street, Canal Side",
      city: "Gloucester",
      postcode: "GL1 2HZ",
    },
    timeline: [
      { status: "Pending", time: "2026-07-22 11:20", actor: "System" },
      { status: "Approved", time: "2026-07-22 11:35", actor: "Dave Miller" },
      { status: "Out for Delivery", time: "2026-07-23 08:30", actor: "Ken Porter" },
      { status: "Delivered", time: "2026-07-23 11:15", note: "Signed for by Manager Pete", actor: "Ken Porter" },
    ],
  },
  {
    id: "JSS-10238",
    customer: {
      name: "Sarah Hughes",
      email: "customer@jss.com",
      phone: "07890 123456",
      type: "Domestic",
    },
    date: "2026-07-11 15:00",
    items: [
      {
        productId: "net-of-logs-approx-10kg",
        name: "Net of Logs Approx 10kg",
        sku: "LOGS-NET-10KG",
        quantity: 4,
        unitPrice: 6.5,
        total: 26.0,
        image: products[15]?.image || "",
      },
    ],
    subtotal: 26.0,
    vat: 1.3,
    deliveryFee: 5.0,
    total: 32.3,
    paymentStatus: "Paid",
    paymentMethod: "Credit Card",
    fulfillmentStatus: "Delivered",
    driver: "Tom Roberts",
    area: "Frampton on Severn",
    address: {
      street: "14 Bridge Road",
      city: "Frampton on Severn",
      postcode: "GL2 7EP",
    },
    timeline: [
      { status: "Delivered", time: "2026-07-12 14:20", actor: "Tom Roberts" },
    ],
  },
  {
    id: "JSS-10237",
    customer: {
      name: "Tom Bailey",
      email: "tom@mail.com",
      phone: "07911 223344",
      type: "Domestic",
    },
    date: "2026-07-20 09:12",
    items: [
      {
        productId: "calor-patio-gas-5kg-refill",
        name: "Calor Patio Gas 5kg Refill",
        sku: "CAL-PATIO-5KG",
        quantity: 1,
        unitPrice: 26.0,
        total: 26.0,
        image: products[6]?.image || "",
      },
    ],
    subtotal: 26.0,
    vat: 1.3,
    deliveryFee: 5.0,
    total: 32.3,
    paymentStatus: "Failed",
    paymentMethod: "Credit Card",
    fulfillmentStatus: "Cancelled",
    area: "Stonehouse",
    address: {
      street: "18 Bath Road",
      city: "Stonehouse",
      postcode: "GL10 2JA",
    },
    timeline: [
      { status: "Cancelled", time: "2026-07-20 09:15", note: "Payment authorization failed", actor: "Payment Gateway" },
    ],
  },
];

export const inventoryAlertsData: InventoryAlertItem[] = [
  {
    id: "inv-1",
    productName: "Twin Burner Gas Cooker",
    sku: "APP-FLAVEL-TWIN",
    category: "Gas Appliances",
    currentStock: 3,
    reorderPoint: 6,
    targetStock: 15,
    unitCost: 280.0,
    supplier: "Flavel UK",
    status: "Low Stock",
  },
  {
    id: "inv-2",
    productName: "34kg Carbon Dioxide (Pub)",
    sku: "GAS-CO2-34KG",
    category: "Gas",
    currentStock: 9,
    reorderPoint: 15,
    targetStock: 35,
    unitCost: 75.0,
    supplier: "Calor Gas Ltd",
    status: "Low Stock",
  },
  {
    id: "inv-3",
    productName: "SMART-E Electric Barbecue",
    sku: "APP-CHAR-SMARTE",
    category: "Gas Appliances",
    currentStock: 4,
    reorderPoint: 5,
    targetStock: 12,
    unitCost: 590.0,
    supplier: "Char-Broil Europe",
    status: "Low Stock",
  },
  {
    id: "inv-4",
    productName: "Blow Heater 15kW",
    sku: "APP-HEAT-15KW",
    category: "Gas Appliances",
    currentStock: 8,
    reorderPoint: 12,
    targetStock: 25,
    unitCost: 110.0,
    supplier: "Sealey Tools",
    status: "Low Stock",
  },
  {
    id: "inv-5",
    productName: "Calor Gas Propane 47kg Refill",
    sku: "CAL-PROP-47KG",
    category: "Gas",
    currentStock: 46,
    reorderPoint: 40,
    targetStock: 120,
    unitCost: 58.0,
    supplier: "Calor Gas Depot Whitminster",
    status: "Low Stock",
  },
];

export const detailedCustomersData: DetailedCustomer[] = [
  {
    id: "cust-1",
    name: "The Bell Inn",
    email: "bell@pub.co.uk",
    phone: "01453 889211",
    type: "Commercial B2B",
    company: "The Bell Inn Pub Ltd",
    accountCreated: "2024-03-15",
    totalOrders: 62,
    totalSpend: 18420.0,
    loyaltyPoints: 4210,
    status: "Active",
    primaryAddress: {
      street: "High Street, Woodchester",
      city: "Stroud",
      postcode: "GL5 5NN",
    },
    recentOrders: [
      { id: "JSS-10244", date: "2026-07-26", amount: 753.6, status: "Pending" },
      { id: "JSS-10190", date: "2026-07-02", amount: 620.0, status: "Delivered" },
    ],
    notes: "VIP Commercial account. Special pricing tier B applicable.",
  },
  {
    id: "cust-2",
    name: "Green Acres Farm",
    email: "office@greenacres.uk",
    phone: "01453 543990",
    type: "Commercial B2B",
    company: "Green Acres Agricultural Ltd",
    accountCreated: "2024-06-10",
    totalOrders: 41,
    totalSpend: 12960.0,
    loyaltyPoints: 3105,
    status: "Active",
    primaryAddress: {
      street: "Green Acres Lane, Slimbridge",
      city: "Dursley",
      postcode: "GL2 7BL",
    },
    recentOrders: [
      { id: "JSS-10242", date: "2026-07-25", amount: 787.5, status: "Packed" },
    ],
  },
  {
    id: "cust-3",
    name: "Sarah Hughes",
    email: "customer@jss.com",
    phone: "07890 123456",
    type: "Domestic",
    accountCreated: "2025-01-20",
    totalOrders: 14,
    totalSpend: 1284.5,
    loyaltyPoints: 320,
    status: "Active",
    primaryAddress: {
      street: "14 Bridge Road",
      city: "Frampton on Severn",
      postcode: "GL2 7EP",
    },
    recentOrders: [
      { id: "JSS-10241", date: "2026-07-24", amount: 97.65, status: "Out for Delivery" },
      { id: "JSS-10238", date: "2026-07-11", amount: 32.3, status: "Delivered" },
    ],
  },
  {
    id: "cust-4",
    name: "Mark Turner",
    email: "mark@farm.co.uk",
    phone: "07700 900123",
    type: "Domestic",
    accountCreated: "2025-04-11",
    totalOrders: 23,
    totalSpend: 3120.0,
    loyaltyPoints: 780,
    status: "Active",
    primaryAddress: {
      street: "Oakridge Farm, Church Lane",
      city: "Cam",
      postcode: "GL11 5HG",
    },
    recentOrders: [
      { id: "JSS-10243", date: "2026-07-26", amount: 204.25, status: "Approved" },
    ],
  },
];

export const detailedManagersData: DetailedManager[] = [
  {
    id: "mgr-1",
    name: "Dave Miller",
    email: "manager@jss.com",
    phone: "07712 345678",
    area: "Gloucester & Stroud Depot",
    assignedDepot: "Fromebridge Main Station",
    ordersAssigned: 128,
    completedOrders: 124,
    pendingOrders: 4,
    completionRate: 96.8,
    performanceRating: "Excellent",
    status: "Active",
  },
  {
    id: "mgr-2",
    name: "Priya Shah",
    email: "priya@jss.com",
    phone: "07799 887766",
    area: "Dursley, Cam & Berkeley",
    assignedDepot: "Wild Goose Station",
    ordersAssigned: 96,
    completedOrders: 92,
    pendingOrders: 4,
    completionRate: 95.8,
    performanceRating: "Excellent",
    status: "Active",
  },
  {
    id: "mgr-3",
    name: "Ken Porter",
    email: "ken@jss.com",
    phone: "07733 445566",
    area: "Forest of Dean & Severn Vale",
    assignedDepot: "Bridge Service Station",
    ordersAssigned: 74,
    completedOrders: 68,
    pendingOrders: 6,
    completionRate: 91.8,
    performanceRating: "Good",
    status: "Active",
  },
];

export const extendedAuditLogs: AuditLogItem[] = [
  {
    id: "log-101",
    timestamp: "2026-07-26 10:24:12",
    actor: { name: "Administrator", email: "admin@jss.com", role: "Super Admin" },
    action: "Updated Product Pricing",
    module: "Catalog",
    target: "Calor Gas Propane 19kg Refill (SKU: CAL-PROP-19KG)",
    ipAddress: "192.168.1.45",
    location: "Gloucester, UK",
    status: "Success",
    metadata: { oldPrice: "£49.50", newPrice: "£51.00", currency: "GBP" },
  },
  {
    id: "log-102",
    timestamp: "2026-07-26 09:51:30",
    actor: { name: "Dave Miller", email: "manager@jss.com", role: "Regional Operations Manager" },
    action: "Approved Order Fulfillment",
    module: "Orders",
    target: "Order #JSS-10242 (Green Acres Farm)",
    ipAddress: "192.168.2.110",
    location: "Whitminster Depot",
    status: "Success",
    metadata: { orderTotal: "£787.50", assignedDriver: "Ken Porter" },
  },
  {
    id: "log-103",
    timestamp: "2026-07-25 16:20:00",
    actor: { name: "Administrator", email: "admin@jss.com", role: "Super Admin" },
    action: "Created Manager Account",
    module: "Managers",
    target: "Priya Shah (priya@jss.com)",
    ipAddress: "192.168.1.45",
    location: "Gloucester, UK",
    status: "Success",
    metadata: { assignedDepot: "Wild Goose Station" },
  },
  {
    id: "log-104",
    timestamp: "2026-07-25 14:05:40",
    actor: { name: "Priya Shah", email: "priya@jss.com", role: "Depot Manager" },
    action: "Adjusted Inventory Level",
    module: "Catalog",
    target: "House Coal 25kg (SKU: COAL-HC-25KG)",
    ipAddress: "192.168.3.14",
    location: "Dursley Depot",
    status: "Success",
    metadata: { adjustment: "+40 bags", reason: "Stock Delivery Recd" },
  },
  {
    id: "log-105",
    timestamp: "2026-07-24 11:15:00",
    actor: { name: "Administrator", email: "admin@jss.com", role: "Super Admin" },
    action: "Published Promotional Banner",
    module: "CMS",
    target: "Winter Fuel Savings Bundle Banner",
    ipAddress: "192.168.1.45",
    location: "Gloucester, UK",
    status: "Success",
  },
];

export const cmsBannersData: CmsBanner[] = [
  {
    id: "ban-1",
    title: "Gloucestershire Next-Day Gas & Fuel Delivery",
    subtitle: "Order before 2pm for guaranteed next working day cylinder drop-off across Gloucestershire.",
    badge: "Official Local Supply",
    linkUrl: "/order-gas",
    active: true,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    position: "Homepage Top",
  },
  {
    id: "ban-2",
    title: "Winter Heating Bundle Special",
    subtitle: "Save 15% on House Coal & Log packages for domestic stoves.",
    badge: "Seasonal Offer",
    linkUrl: "/offers",
    active: true,
    startDate: "2026-06-01",
    endDate: "2026-09-30",
    position: "Hero Carousel",
  },
];

export const cmsOffersData: DetailedOffer[] = [
  {
    id: "off-1",
    title: "Winter Fuel Bundle",
    code: "WINTERFUEL2026",
    discountType: "Bundle",
    value: "Save £9.00",
    usageCount: 142,
    maxUsage: 500,
    status: "Active",
    expiryDate: "2026-09-30",
  },
  {
    id: "off-2",
    title: "Patio Gas Double Refill",
    code: "PATIO2X",
    discountType: "Fixed Amount",
    value: "Save £6.00",
    usageCount: 88,
    maxUsage: 300,
    status: "Active",
    expiryDate: "2026-08-31",
  },
  {
    id: "off-3",
    title: "BBQ Season Pro Package",
    code: "CHARBROIL100",
    discountType: "Fixed Amount",
    value: "Save £100.00",
    usageCount: 24,
    maxUsage: 50,
    status: "Active",
    expiryDate: "2026-08-15",
  },
];

export const recentActivityFeed = [
  {
    id: "act-1",
    icon: "Tag",
    user: "Admin",
    title: "Product price updated",
    description: "Calor Gas Propane 19kg increased from £49.50 to £51.00",
    time: "10 minutes ago",
  },
  {
    id: "act-2",
    icon: "CheckCircle2",
    user: "Dave Miller",
    title: "Order JSS-10242 approved",
    description: "6 × 47kg Propane assigned to Driver Ken Porter",
    time: "42 minutes ago",
  },
  {
    id: "act-3",
    icon: "UserPlus",
    user: "Admin",
    title: "New manager onboarded",
    description: "Priya Shah assigned to Dursley & Cam depot",
    time: "2 hours ago",
  },
  {
    id: "act-4",
    icon: "PackageCheck",
    user: "Priya Shah",
    title: "Inventory restock recorded",
    description: "+40 nets of Kiln Dried Hardwood added to Whitminster warehouse",
    time: "Yesterday at 16:40",
  },
  {
    id: "act-5",
    icon: "Megaphone",
    user: "Admin",
    title: "CMS Banner published",
    description: "Published 'Winter Fuel Savings Bundle' banner on home hero",
    time: "Yesterday at 11:20",
  },
];
