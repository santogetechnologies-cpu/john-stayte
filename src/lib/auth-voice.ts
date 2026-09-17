/**
 * Browser-native SpeechSynthesis AI Voice Feedback for Authentication Flows
 * Configured as a friendly, cheerful, natural female AI assistant.
 */

let lastSpokenText = "";
let lastSpokenTimestamp = 0;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Initialize voices cache and register event listener
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const updateVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices() || [];
    } catch {
      cachedVoices = [];
    }
  };

  updateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
}

// Known male voice indicators to strictly exclude
const MALE_VOICE_KEYWORDS = [
  "male",
  "man",
  "guy",
  "boy",
  "david",
  "daniel",
  "george",
  "oliver",
  "harry",
  "thomas",
  "james",
  "arthur",
  "ryan",
  "tom",
  "mark",
  "paul",
  "richard",
  "alex",
  "fred",
  "ralph",
  "albert",
  "junior",
  "bruce",
  "brian",
  "bernard",
  "stephen",
  "steve",
  "gordon",
  "mitch",
  "john",
  "jack",
  "william",
  "charles",
  "edward",
  "henry",
  "stefan",
  "lee",
  "rishi",
  "prabhat",
  "deranged",
  "zarvox",
  "trinoids",
  "bad news",
  "bahh",
  "cellos",
  "good news",
  "hysterical",
  "pipe organ",
  "whisper",
  "wobble",
];

// High-priority natural English female voice names across Windows, macOS, iOS, Android, and Chrome/Edge
const FEMALE_VOICE_NAMES = [
  // UK / British Female (Natural conversational British English)
  "google uk english female",
  "microsoft sonia online (natural) - english (united kingdom)",
  "microsoft sonia",
  "microsoft libby online (natural) - english (united kingdom)",
  "microsoft libby",
  "microsoft mia online (natural) - english (united kingdom)",
  "microsoft mia",
  "microsoft hazel desktop - english (great britain)",
  "microsoft hazel",
  "microsoft susan",
  "victoria",
  "kate",
  "serena",
  "martha",
  "stephanie",
  "fiona",
  "moira",
  // US / International English Natural Conversational Female Voices
  "microsoft jenny online (natural) - english (united states)",
  "microsoft jenny",
  "microsoft aria online (natural) - english (united states)",
  "microsoft aria",
  "microsoft zira desktop - english (united states)",
  "microsoft zira",
  "google us english",
  "samantha",
  "ava",
  "allison",
  "susan",
  "karen",
  "tessa",
  "veena",
  "zoe",
  "charlotte",
  "emily",
  "grace",
  "lily",
  "clara",
  "olivia",
];

/**
 * Filter and find the best available English female voice
 */
function findBestEnglishFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  let voices = cachedVoices;
  if (!voices || voices.length === 0) {
    try {
      voices = window.speechSynthesis.getVoices() || [];
      cachedVoices = voices;
    } catch {
      voices = [];
    }
  }

  if (!voices || voices.length === 0) {
    return null;
  }

  // Filter only English voices that are strictly NOT male
  const englishNonMaleVoices = voices.filter((v) => {
    const nameLower = v.name.toLowerCase();
    const langLower = (v.lang || "").toLowerCase();
    const uriLower = (v.voiceURI || "").toLowerCase();

    const isEnglish = langLower.startsWith("en");
    if (!isEnglish) return false;

    const isMale = MALE_VOICE_KEYWORDS.some((m) => nameLower.includes(m) || uriLower.includes(m));
    return !isMale;
  });

  if (englishNonMaleVoices.length === 0) {
    return null;
  }

  // 1. First priority: Check for exact known high-quality female voice names
  for (const preferredName of FEMALE_VOICE_NAMES) {
    const match = englishNonMaleVoices.find((v) => {
      const nameLower = v.name.toLowerCase();
      return nameLower.includes(preferredName);
    });
    if (match) return match;
  }

  // 2. Second priority: Any English voice with "female" or "woman" in name or URI
  const explicitFemale = englishNonMaleVoices.find((v) => {
    const nameLower = v.name.toLowerCase();
    const uriLower = (v.voiceURI || "").toLowerCase();
    return nameLower.includes("female") || uriLower.includes("female") || nameLower.includes("woman");
  });
  if (explicitFemale) return explicitFemale;

  // 3. Third priority: UK English non-male voice
  const ukNonMale = englishNonMaleVoices.find((v) => (v.lang || "").toLowerCase().startsWith("en-gb"));
  if (ukNonMale) return ukNonMale;

  // 4. Fourth priority: Any remaining non-male English voice
  return englishNonMaleVoices[0] || null;
}

/**
 * Cleanly speak a short notification using browser SpeechSynthesis with an English female voice
 */
export function speakVoiceFeedback(text: string, force = false): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    return;
  }

  const now = Date.now();
  // Prevent duplicate announcements within 2.5 seconds (prevents React re-render repeats)
  if (!force && text === lastSpokenText && now - lastSpokenTimestamp < 2500) {
    return;
  }

  try {
    // Cancel any previous speech immediately
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.15; // Fast, lively, conversational speaking speed (~1.15x)
    utterance.pitch = 1.10; // Cheerful, bright, friendly and jolly female AI tone
    utterance.volume = 0.95; // Crisp, clear and natural volume

    const femaleVoice = findBestEnglishFemaleVoice();
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    lastSpokenText = text;
    lastSpokenTimestamp = now;

    window.speechSynthesis.speak(utterance);
  } catch {
    // Non-blocking: gracefully ignore speech synthesis errors
  }
}

/**
 * Handle voice feedback for login errors according to backend response and validation
 */
export function speakLoginError(errorMessage?: string, email?: string): void {
  const err = (errorMessage || "").toLowerCase().trim();
  const trimmedEmail = (email || "").trim();

  // 1. WRONG EMAIL:
  // When the entered email is invalid / does not exist according to the actual authentication response
  const isValidEmailFormat = trimmedEmail.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  if (
    (!isValidEmailFormat && trimmedEmail.length > 0) ||
    err.includes("user not found") ||
    err.includes("user does not exist") ||
    err.includes("email not found") ||
    err.includes("no user found") ||
    err.includes("invalid email") ||
    err.includes("email address is invalid") ||
    err.includes("wrong email")
  ) {
    speakVoiceFeedback("Hmm... you entered the wrong email. Please check it once and try again.");
    return;
  }

  // 2. WRONG PASSWORD:
  // When the email is valid but the password is incorrect
  if (
    err.includes("wrong password") ||
    err.includes("incorrect password") ||
    err.includes("invalid password") ||
    err.includes("password is incorrect") ||
    err.includes("password incorrect")
  ) {
    speakVoiceFeedback("Oops! That password doesn't look right. Please enter the correct password and try again.");
    return;
  }

  // 3. GENERIC LOGIN FAILURE:
  // If the backend cannot determine whether the email or password is incorrect, do NOT guess.
  speakVoiceFeedback("Oops! Something went wrong. Please check your details and try again.");
}

/**
 * Handle role-aware voice feedback for successful login
 */
export function speakLoginSuccess(role?: string): void {
  if (role === "admin") {
    speakVoiceFeedback("Welcome, Admin! You're all set.");
  } else {
    speakVoiceFeedback("Yay! Welcome to John Stayte Services. Great to have you back!");
  }
}
