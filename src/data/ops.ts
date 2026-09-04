export type OrderStatus =
  "Pending" | "Approved" | "Packed" | "Out for Delivery" | "Delivered" | "Cancelled" | "Refunded";

export type Order = {
  id: string;
  customer: string;
  email: string;
  date: string;
  items: number;
  total: number;
  status: OrderStatus;
  driver?: string;
  area: string;
};

export const orders: Order[] = [
  {
    id: "JSS-10241",
    customer: "Sarah Hughes",
    email: "customer@jss.com",
    date: "2026-07-24",
    items: 2,
    total: 92.5,
    status: "Out for Delivery",
    driver: "Tom R.",
    area: "Frampton",
  },
  {
    id: "JSS-10238",
    customer: "Sarah Hughes",
    email: "customer@jss.com",
    date: "2026-07-11",
    items: 4,
    total: 148.0,
    status: "Delivered",
    driver: "Tom R.",
    area: "Frampton",
  },
  {
    id: "JSS-10230",
    customer: "Sarah Hughes",
    email: "customer@jss.com",
    date: "2026-06-28",
    items: 1,
    total: 39.5,
    status: "Delivered",
    driver: "Ken P.",
    area: "Frampton",
  },
  {
    id: "JSS-10244",
    customer: "The Bell Inn",
    email: "bell@pub.co.uk",
    date: "2026-07-26",
    items: 6,
    total: 486.0,
    status: "Pending",
    area: "Stroud",
  },
  {
    id: "JSS-10243",
    customer: "Mark Turner",
    email: "mark@farm.co.uk",
    date: "2026-07-26",
    items: 3,
    total: 121.5,
    status: "Pending",
    area: "Cam",
  },
  {
    id: "JSS-10242",
    customer: "Green Acres Farm",
    email: "office@greenacres.uk",
    date: "2026-07-25",
    items: 9,
    total: 812.0,
    status: "Approved",
    driver: "Ken P.",
    area: "Dursley",
  },
  {
    id: "JSS-10239",
    customer: "Riverside Cafe",
    email: "hi@riverside.uk",
    date: "2026-07-22",
    items: 2,
    total: 96.0,
    status: "Packed",
    driver: "Ken P.",
    area: "Gloucester",
  },
  {
    id: "JSS-10237",
    customer: "Tom Bailey",
    email: "tom@mail.com",
    date: "2026-07-20",
    items: 1,
    total: 26.0,
    status: "Cancelled",
    area: "Stonehouse",
  },
];

export const salesByMonth = [
  { month: "Jan", revenue: 42100, orders: 310 },
  { month: "Feb", revenue: 38700, orders: 288 },
  { month: "Mar", revenue: 45200, orders: 341 },
  { month: "Apr", revenue: 39800, orders: 302 },
  { month: "May", revenue: 47600, orders: 366 },
  { month: "Jun", revenue: 52900, orders: 402 },
  { month: "Jul", revenue: 61400, orders: 455 },
];

export const categoryPerformance = [
  { name: "Gas", value: 48 },
  { name: "Coal & Logs", value: 19 },
  { name: "Appliances", value: 15 },
  { name: "Baits & Feed", value: 11 },
  { name: "Spares", value: 7 },
];

export const lowStock = [
  { name: "Twin Burner Gas Cooker", stock: 3, reorder: 6 },
  { name: "34kg Carbon Dioxide (Pub)", stock: 9, reorder: 15 },
  { name: "SMART-E Electric Barbecue", stock: 4, reorder: 5 },
  { name: "Blow Heater 15kW", stock: 8, reorder: 12 },
];

export const managers = [
  {
    name: "Dave Miller",
    email: "manager@jss.com",
    area: "Gloucester & Stroud",
    orders: 128,
    status: "Active",
  },
  {
    name: "Priya Shah",
    email: "priya@jss.com",
    area: "Dursley & Cam",
    orders: 96,
    status: "Active",
  },
  {
    name: "Ken Porter",
    email: "ken@jss.com",
    area: "Forest of Dean",
    orders: 74,
    status: "Disabled",
  },
];

export const customersList = [
  { name: "Sarah Hughes", email: "customer@jss.com", orders: 14, spend: 1284.5, points: 320 },
  { name: "The Bell Inn", email: "bell@pub.co.uk", orders: 62, spend: 18420.0, points: 4210 },
  {
    name: "Green Acres Farm",
    email: "office@greenacres.uk",
    orders: 41,
    spend: 12960.0,
    points: 3105,
  },
  { name: "Mark Turner", email: "mark@farm.co.uk", orders: 23, spend: 3120.0, points: 780 },
];

export const tickets = [
  { id: "T-4412", subject: "Delivery window change", status: "Open", updated: "2 hours ago" },
  { id: "T-4398", subject: "Invoice copy for June", status: "Resolved", updated: "5 days ago" },
];

export const notifications = [
  { title: "Order JSS-10241 is out for delivery", time: "35 min ago" },
  { title: "Your invoice for JSS-10238 is ready", time: "2 days ago" },
  { title: "Winter fuel bundle now live", time: "1 week ago" },
];

export const auditLogs = [
  { actor: "admin@jss.com", action: "Updated product price — Calor 19kg Refill", time: "10:24" },
  { actor: "manager@jss.com", action: "Approved order JSS-10242", time: "09:51" },
  { actor: "admin@jss.com", action: "Created manager account — Priya Shah", time: "Yesterday" },
  { actor: "manager@jss.com", action: "Adjusted stock — House Coal 25kg", time: "Yesterday" },
];

export const statusColor: Record<OrderStatus, string> = {
  Pending: "bg-warning/15 text-warning-foreground border-warning/30",
  Approved: "bg-accent text-accent-foreground border-primary/20",
  Packed: "bg-secondary text-secondary-foreground border-border",
  "Out for Delivery": "bg-primary/10 text-primary border-primary/25",
  Delivered: "bg-success/15 text-success border-success/30",
  Cancelled: "bg-muted text-muted-foreground border-border",
  Refunded: "bg-muted text-muted-foreground border-border",
};
