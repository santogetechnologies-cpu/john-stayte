import { adminOrdersList, AdminOrder, detailedCustomersData, DetailedCustomer, inventoryAlertsData } from "./admin-mock";
import { OrderStatus } from "./ops";

export type SupportEnquiry = {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subject: string;
  category: "Delivery Issue" | "Cylinder Exchange" | "Account / Invoice" | "General";
  priority: "Urgent" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Waiting for Customer" | "Resolved";
  created: string;
  lastUpdated: string;
  orderId?: string;
  messages: {
    sender: string;
    role: "Customer" | "Manager" | "System";
    timestamp: string;
    text: string;
  }[];
  internalNotes?: string;
};

export type DeliveryRouteItem = {
  id: string;
  orderId: string;
  customerName: string;
  address: string;
  area: string;
  timeSlot: string;
  driver: string;
  vehicle: string;
  status: "Pending" | "Out for Delivery" | "Delivered" | "Delayed";
  delayReason?: "Traffic Delay" | "Customer Unavailable" | "Vehicle Issue" | "Address Issue";
  notes?: string;
};

export type ManagerPerformanceMetrics = {
  ordersHandled: number;
  ordersCompleted: number;
  approvalRate: number;
  onTimeDeliveryRate: number;
  customerResponseRate: number;
  avgApprovalTimeMinutes: number;
  monthlyTrend: { month: string; handled: number; completed: number; rate: number }[];
};

export const managerProfileData = {
  id: "mgr-dave",
  name: "Dave Miller",
  email: "manager@jss.com",
  phone: "07712 345678",
  role: "Operations Manager",
  department: "Gloucestershire Regional Logistics",
  assignedDepot: "Fromebridge Main Station",
  assignedArea: "Gloucester, Stroud & Frampton",
  joinedDate: "2023-04-12",
  avatarUrl: "",
};

export const supportEnquiriesData: SupportEnquiry[] = [
  {
    id: "enq-1",
    ticketNumber: "T-4412",
    customerName: "The Bell Inn",
    customerEmail: "bell@pub.co.uk",
    customerPhone: "01453 889211",
    subject: "Urgent delivery window change for 34kg CO2 cylinders",
    category: "Delivery Issue",
    priority: "Urgent",
    status: "Open",
    created: "2026-07-26 09:15",
    lastUpdated: "2 hours ago",
    orderId: "JSS-10244",
    messages: [
      {
        sender: "The Bell Inn (Pete)",
        role: "Customer",
        timestamp: "2026-07-26 09:15",
        text: "Hi JSS team, our cellar door will be locked between 12pm and 3pm for a delivery run. Can driver Ken drop off before 11:30am if possible?",
      },
    ],
    internalNotes: "Checked with Ken P. — he will prioritize Woodchester drop first at 10:45am.",
  },
  {
    id: "enq-2",
    ticketNumber: "T-4408",
    customerName: "Sarah Hughes",
    customerEmail: "customer@jss.com",
    customerPhone: "07890 123456",
    subject: "Empty 19kg Propane cylinder exchange confirmation",
    category: "Cylinder Exchange",
    priority: "Medium",
    status: "In Progress",
    created: "2026-07-25 14:20",
    lastUpdated: "1 day ago",
    orderId: "JSS-10241",
    messages: [
      {
        sender: "Sarah Hughes",
        role: "Customer",
        timestamp: "2026-07-25 14:20",
        text: "Hello, I left my empty Calor 19kg cylinder next to the side gate as requested. Will driver Tom swap it directly?",
      },
      {
        sender: "Dave Miller",
        role: "Manager",
        timestamp: "2026-07-25 15:10",
        text: "Hi Sarah, yes! Tom Roberts will swap the empty on the doorstep during tomorrow's morning delivery run.",
      },
    ],
  },
  {
    id: "enq-3",
    ticketNumber: "T-4398",
    customerName: "Green Acres Farm",
    customerEmail: "office@greenacres.uk",
    customerPhone: "01453 543990",
    subject: "Monthly commercial BACS invoice copy for June",
    category: "Account / Invoice",
    priority: "Low",
    status: "Resolved",
    created: "2026-07-20 11:00",
    lastUpdated: "5 days ago",
    messages: [
      {
        sender: "Green Acres Farm",
        role: "Customer",
        timestamp: "2026-07-20 11:00",
        text: "Please email a PDF copy of our June statement for accounts department.",
      },
      {
        sender: "Dave Miller",
        role: "Manager",
        timestamp: "2026-07-20 11:30",
        text: "Statement sent to office@greenacres.uk. Thanks!",
      },
    ],
  },
];

export const deliveryRoutesData: DeliveryRouteItem[] = [
  {
    id: "del-1",
    orderId: "JSS-10241",
    customerName: "Sarah Hughes",
    address: "14 Bridge Road, Frampton on Severn GL2 7EP",
    area: "Frampton on Severn",
    timeSlot: "Morning (09:00 - 12:00)",
    driver: "Tom Roberts",
    vehicle: "Truck #04 (3.5T Flatbed)",
    status: "Out for Delivery",
  },
  {
    id: "del-2",
    orderId: "JSS-10242",
    customerName: "Green Acres Farm",
    address: "Green Acres Lane, Slimbridge, Dursley GL2 7BL",
    area: "Dursley & Slimbridge",
    timeSlot: "Afternoon (13:00 - 17:00)",
    driver: "Ken Porter",
    vehicle: "Truck #02 (7.5T Heavy)",
    status: "Pending",
  },
  {
    id: "del-3",
    orderId: "JSS-10244",
    customerName: "The Bell Inn",
    address: "High Street, Woodchester, Stroud GL5 5NN",
    area: "Stroud & Woodchester",
    timeSlot: "Morning (10:00 - 11:30)",
    driver: "Dave Miller",
    vehicle: "Truck #01 (5T Cylinder Run)",
    status: "Pending",
  },
  {
    id: "del-4",
    orderId: "JSS-10239",
    customerName: "Riverside Cafe",
    address: "Quay Street, Canal Side, Gloucester GL1 2HZ",
    area: "Gloucester South",
    timeSlot: "Morning (08:30 - 11:30)",
    driver: "Ken Porter",
    vehicle: "Truck #02 (7.5T Heavy)",
    status: "Delivered",
  },
  {
    id: "del-5",
    orderId: "JSS-10230",
    customerName: "Mark Turner",
    address: "Oakridge Farm, Church Lane, Cam GL11 5HG",
    area: "Cam",
    timeSlot: "Afternoon (14:00 - 16:00)",
    driver: "Tom Roberts",
    vehicle: "Truck #04 (3.5T Flatbed)",
    status: "Delayed",
    delayReason: "Traffic Delay",
    notes: "A38 roadworks near Whitminster roundabout.",
  },
];

export const managerPerformanceData: ManagerPerformanceMetrics = {
  ordersHandled: 196,
  ordersCompleted: 184,
  approvalRate: 96.2,
  onTimeDeliveryRate: 94.8,
  customerResponseRate: 98.1,
  avgApprovalTimeMinutes: 14,
  monthlyTrend: [
    { month: "Feb", handled: 140, completed: 132, rate: 94.2 },
    { month: "Mar", handled: 165, completed: 158, rate: 95.8 },
    { month: "Apr", handled: 152, completed: 145, rate: 95.4 },
    { month: "May", handled: 178, completed: 171, rate: 96.0 },
    { month: "Jun", handled: 188, completed: 180, rate: 95.7 },
    { month: "Jul", handled: 196, completed: 184, rate: 96.2 },
  ],
};

export const managerNotificationsData = [
  {
    id: "mn-1",
    category: "Orders",
    title: "New B2B Order #JSS-10244 Requires Approval",
    description: "The Bell Inn submitted an order for 4 × 34kg CO2 cylinders (£753.60).",
    time: "15 mins ago",
    read: false,
  },
  {
    id: "mn-2",
    category: "Deliveries",
    title: "Delivery Delay Alert — Truck #04",
    description: "Driver Tom Roberts reported traffic delay on A38 near Whitminster.",
    time: "45 mins ago",
    read: false,
  },
  {
    id: "mn-3",
    category: "Inventory",
    title: "Low Stock Alert: Propane 47kg",
    description: "Whitminster Depot stock reached 46 cylinders (Reorder threshold: 40).",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "mn-4",
    category: "Customers",
    title: "New Customer Enquiry Ticket T-4412",
    description: "Pete from The Bell Inn requested delivery time change.",
    time: "3 hours ago",
    read: true,
  },
];
