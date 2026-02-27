// ============================================================
// GUEST LIST
// ============================================================
// Add every invited guest's full name here (case-insensitive matching).
// Guests will type their name on the login screen to enter the app.
//
// Format: "First Last" — the app will match names case-insensitively
// and also handles common variations (e.g. missing accents, extra spaces).

export const GUEST_LIST: string[] = [
  // --- Family ---
  "Neha Pathmanaban",
  "Naveen Kumar",
  "Priya Pathmanaban",
  "Rajan Pathmanaban",
  "Sunita Kumar",
  "Vikram Kumar",
  "Ananya Kumar",
  "Karthik Pathmanaban",
  "Meera Pathmanaban",

  // --- Friends ---
  "Aisha Mohammed",
  "Sophie Bennett",
  "James Wilson",
  "Emma Thompson",
  "Raj Patel",
  "Prerna Sharma",
  "Arjun Mehta",
  "Kavya Reddy",
  "David Chen",
  "Sarah Johnson",
  "Michael Brown",
  "Fatima Al-Hassan",
  "Charlotte Davies",
  "Oliver Smith",
  "Isabelle Martin",
  "Tom Richards",
  "Zoe Williams",
  "Aarav Singh",
  "Deepika Nair",
  "Rohan Gupta",

  // TODO: Replace these placeholder names with your actual guest list
];

/**
 * Normalizes a name for comparison: lowercase, trim whitespace, collapse spaces.
 */
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Checks whether a given name is on the guest list.
 * Matching is case-insensitive and ignores extra whitespace.
 */
export function isValidGuest(name: string): boolean {
  const normalized = normalizeName(name);
  return GUEST_LIST.some((guest) => normalizeName(guest) === normalized);
}

/**
 * Returns the canonical (correctly-cased) version of a guest name,
 * or null if not found on the list.
 */
export function getCanonicalName(name: string): string | null {
  const normalized = normalizeName(name);
  return GUEST_LIST.find((guest) => normalizeName(guest) === normalized) ?? null;
}
