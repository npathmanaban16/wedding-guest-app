// ============================================================
// GUEST LIST
// ============================================================
// Guests type their name on the login screen to access the app.
// Matching is case-insensitive and ignores extra whitespace.

export const GUEST_LIST: string[] = [
  // --- Wedding Party ---
  "Neha Pathmanaban",
  "Naveen Nath",
  "Pathmanaban Raj",
  "Kalpana Pathmanaban",
  "Vishnu Pathmanaban",
  "Amar Nath",
  "Sandhya Nath",
  "Neel Nath",
  "Aya Nath",
  "Olivia Zhu",
  "Akanksha Singh",
  "Suhail Goyal",
  "Sayantanee Das",
  "Guhan Muruganandam",
  "Ritika Patil",
  "Kevin Labagnara",
  "Gaurie Mittal",
  "Sai Avala",
  "Nikila Vasudevan",
  "Goutham Subramanian",
  "Liz Paulino",
  "Andrew Ball",
  "Connor Franklin",
  "Alec Mirchandani",
  "Eleni Karandreas",
  "Alex Shih",
  "Nancy Kwan",

  // --- Guests ---
  "Jedidiah Glass",
  "Edel Dhuibheanaigh",
  "Elliott Baker",
  "Mary Dick",
  "Andrew You",
  "Jason Luo",
  "Grace Mutoko",
  "Paul Mas",
  "Sankash Shankar",
  "Bhavya Varma",
  "Leon Mirson",
  "Moeko Nagatsuka",
  "Rushil Sheth",
  "Tithi Raval",
  "Karam Tatla",
  "Jenna Freedman",
  "Ben Biswas",
  "Danielle Skelly",
  "Subbarao Addaganti",
  "Anitha Addaganti",
  "Yash Addaganti",
  "Trisha Addaganti",
  "Prasanna Bekal",
  "Vindhya Bekal",
  "Pallavi Bekal",
  "Tanvi Bekal",
  "Ram Sankaran",
  "Uma Ramanathan",
  "Rahul Ramanathan",
  "Abhay Mhatre",
  "Archana Mhatre",
  "Madhu Somenhalli",
  "Shashi Somenhalli",
  "Nithin Somenhalli",
  "Anand Palani",
  "Sujatha Palani",
  "Arthi Palani",
  "Sainath Palani",
  "Vivek Seth",
  "Ashvani Vivek",
  "Saravanan Kandaswamy",
  "Chrisvin Jabamani",
  "Howard Li",
  "Lingesh Radjou",
  "Rajesh Radjou",
  "Prabakaran Vasan",
  "Kannagi Prabakaran",
  "Neha Dubey",
  "Pooja Dubey",
  "Rakesh Dubey",
  "Neelu Dubey",
  "Vijay Kumar",
  "Sadhana Kumar",
  "Vikas Kumar",
  "Riva Kumar",
  "Vivek Kumar",
  "Jaya Kumar",
  "Sanjay Mishra",
  "Seema Verma",
  "Shaan Mishra",
  "Maya Mishra",
  "Anand Tewari",
  "Sangita Tewari",
  "Jeevan Tewari",
  "Lauren Bordeaux",
  "Ravi Tewari",
  "Tali Tudryn",
  "Sanjiv Upadhyay",
  "Meena Upadhyay",
  "Archana Upadhyay",
  "Kirin Upadhyay",
  "Serena Upadhyay",
  "Matt Uthupan",
  "Tushita Shrivastav",
  "Gugu Chohan",
  "Dennis Porto",
  "Jan Porto",
  "Diane Hedden",
  "Mary Kay Buchsbaum",
  "Bruce Buchsbaum",
  "Bruce Baker",
  "Kelli Baker",
  "Roshan Ram",
  "Bhavika Patel",
  "Jinesh Patel",
  "Radhika Kirpalani",
  "Tarun Kirpalani",
  "Nitya Srikishen",
  "Puneet Lakhi",
  "Marwan Bayoumy",
  "Asokan Selvaraj",
  "Sujatha Asokan",
];

// ============================================================
// WEDDING PARTY
// ============================================================
// Guests in this list see the Rehearsal Dinner on the schedule.

export const WEDDING_PARTY: string[] = [
  "Neha Pathmanaban",
  "Naveen Nath",
  "Pathmanaban Raj",
  "Kalpana Pathmanaban",
  "Vishnu Pathmanaban",
  "Amar Nath",
  "Sandhya Nath",
  "Neel Nath",
  "Aya Nath",
  "Olivia Zhu",
  "Akanksha Singh",
  "Suhail Goyal",
  "Sayantanee Das",
  "Guhan Muruganandam",
  "Ritika Patil",
  "Kevin Labagnara",
  "Gaurie Mittal",
  "Sai Avala",
  "Nikila Vasudevan",
  "Goutham Subramanian",
  "Liz Paulino",
  "Andrew Ball",
  "Connor Franklin",
  "Alec Mirchandani",
  "Eleni Karandreas",
  "Alex Shih",
  "Nancy Kwan",
];

// ============================================================
// HELPERS
// ============================================================

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function isValidGuest(name: string): boolean {
  const normalized = normalizeName(name);
  return GUEST_LIST.some((guest) => normalizeName(guest) === normalized);
}

export function getCanonicalName(name: string): string | null {
  const normalized = normalizeName(name);
  return GUEST_LIST.find((guest) => normalizeName(guest) === normalized) ?? null;
}

export function isWeddingParty(name: string): boolean {
  const normalized = normalizeName(name);
  return WEDDING_PARTY.some((guest) => normalizeName(guest) === normalized);
}
