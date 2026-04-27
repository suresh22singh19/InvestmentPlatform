/**
 * Devanagari copy for the prescription PDF — keep as literal UTF-8 (no \\u escapes).
 * Renders with Noto Sans Devanagari only (includes Latin), so jsPDF does not switch
 * fonts mid-line (which breaks shaping) and we avoid splitTextToSize on these strings.
 */

/** अष्टविध block + examinations — matches legacy pad wording */
export const PRESCRIPTION_HINDI_EXAM_LINES = [
  "अष्टविध परिक्षा",
  "स्पर्श",
  "शब्द",
  "Face (आकृति)",
  "Eye (दृष्टि)",
  "Jiwha (जिह्वा)",
  "Urine (मूत्र)",
  "Stool (मल)",
  "Nadi (वात, पित, कफ)",
] as const;

/**
 * Patient consent — fixed line breaks (no algorithmic wrapping on Devanagari).
 * Same wording as legacy HTML; two lines for readability on A4.
 */
export const PRESCRIPTION_HINDI_CONSENT_LINES = [
  "डॉक्टर ने मुझे मेरी बीमारी और उसकी चिकित्सा के बारे में पूरी तरह से समझा दिया है।",
  "हम सब कुछ समझते हुए, हमारे मरीज़ अपनी चिकित्सा करवाना चाहते हैं और इसके लिए सहमति देते हैं।",
] as const;

export const PRESCRIPTION_HINDI_SIGNATURE_DOCTOR = "डॉक्टर के हस्ताक्षर:";
export const PRESCRIPTION_HINDI_SIGNATURE_PATIENT = "मरीज़ के हस्ताक्षर:";
