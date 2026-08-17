/**
 * Static UI form options for the Transaction Check page.
 *
 * These are INPUT CHOICES the user picks from — not fabricated application
 * data. They must stay aligned with the values your FastAPI/Pydantic schema
 * accepts. If the backend exposes an options/metadata endpoint, replace these
 * with a fetch; nothing else in the app needs to change.
 */

export const TRANSACTION_TYPES = [
  "Transfer",
  "Payment",
  "Withdrawal",
  "Deposit",
  "Card Purchase",
  "Online Purchase",
  "Crypto Exchange",
];

export const DEVICE_TYPES = ["Mobile App", "Web Browser", "ATM", "POS Terminal", "API / Bot"];

export const LOCATIONS = [
  "Mumbai, IN",
  "Delhi, IN",
  "Bengaluru, IN",
  "London, UK",
  "New York, US",
  "Singapore, SG",
  "Dubai, AE",
  "Lagos, NG",
  "Moscow, RU",
  "Unknown / VPN",
];

export const MERCHANT_CATEGORIES = [
  "Retail",
  "Travel",
  "Electronics",
  "Food & Delivery",
  "Crypto",
  "Gaming",
  "Luxury Goods",
  "Utilities",
];

/** Filter options used by the Transaction History page. */
export const STATUS_FILTERS = ["All", "Safe", "Suspicious", "Fraud"];
export const RISK_LEVEL_FILTERS = ["All", "Low", "Medium", "High"];
export const DATE_RANGE_FILTERS = [
  { label: "All time", value: "all" },
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
];
