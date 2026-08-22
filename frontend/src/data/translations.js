// English + Hindi labels. Keys are stable; add regional languages later.
export const translations = {
  en: {
    appName: "Discharge2Care",
    tagline: "From discharge instructions to everyday recovery.",
    subTagline: "Your recovery plan, medicines, appointments and family support — all in one place.",
    role: { patient: "Patient / Caregiver", doctor: "Doctor / Hospital" },
    roleDesc: {
      patient: "Track medicines, tests, appointments and share care with your family.",
      doctor: "Command desk for post-discharge continuity across your patients.",
    },
    cta: {
      demo: "Start SIH Demo",
      emergency: "Emergency SOS",
      login: "Log in",
      demoPatient: "Continue with Demo Patient",
      demoDoctor: "Use Demo Hospital Account",
      confirm: "Confirm & Activate Care Plan",
      review: "Review Again",
      share: "Share with Doctor",
      upload: "Upload Discharge Summary",
      markDone: "Mark as Done",
      addAppt: "Add Appointment",
      invite: "Invite Family Member",
    },
    nav: {
      recovery: "Recovery Hub", discharge: "My Discharge Plan", medicines: "Medicines",
      tests: "Tests", appointments: "Appointments", family: "Family Care Circle",
      stock: "Medicine Stock", pill: "Pill Verification", otc: "OTC Drug Safety",
      tracking: "Daily Tracking", changed: "What Changed?", emergency: "Emergency Card",
      settings: "Settings", notifications: "Notifications", dashboard: "Command Desk",
      patients: "Patients",
    },
    hub: {
      greeting: "Good day",
      today: "Here is your recovery plan for today.",
      now: "NOW", next: "NEXT", upcoming: "UPCOMING",
      progressToday: "Today's progress", progressRecovery: "Recovery progress",
      empty: "You are all caught up. Enjoy some rest.",
    },
    status: {
      confirmed: "Confirmed", pending: "Pending", needsAttention: "Needs attention",
      upcoming: "Upcoming", done: "Done", notConfirmed: "Not confirmed yet",
      unconfirmedNote: "Not confirmed yet. Please check with the patient.",
    },
    a11y: {
      title: "Accessibility",
      textSize: "Text size", contrast: "High contrast", motion: "Reduce motion",
      dyslexia: "Dyslexia-friendly font", large: "Larger buttons", simple: "Simple language",
      language: "Language",
    },
    disclaimer: "SIH DEMO / SYNTHETIC DATA — Not a diagnosis or prescription tool.",
    privacy: "Your information is private. Family access is controlled by you.",
  },
  hi: {
    appName: "डिस्चार्ज2केयर",
    tagline: "अस्पताल से घर तक — हर दिन की देखभाल।",
    subTagline: "आपकी रिकवरी योजना, दवाइयाँ, अपॉइंटमेंट और परिवार का साथ — एक जगह।",
    role: { patient: "मरीज़ / देखभालकर्ता", doctor: "डॉक्टर / अस्पताल" },
    roleDesc: {
      patient: "दवाइयाँ, जाँच, अपॉइंटमेंट देखें और परिवार को जोड़ें।",
      doctor: "मरीज़ों की डिस्चार्ज-पश्चात निरंतरता के लिए कमांड डेस्क।",
    },
    cta: {
      demo: "SIH डेमो शुरू करें",
      emergency: "आपात SOS",
      login: "लॉग इन",
      demoPatient: "डेमो मरीज़ के रूप में जारी रखें",
      demoDoctor: "डेमो अस्पताल खाता उपयोग करें",
      confirm: "पुष्टि करें और योजना शुरू करें",
      review: "फिर से देखें",
      share: "डॉक्टर के साथ साझा करें",
      upload: "डिस्चार्ज सारांश अपलोड करें",
      markDone: "पूरा हुआ",
      addAppt: "अपॉइंटमेंट जोड़ें",
      invite: "परिवार सदस्य जोड़ें",
    },
    nav: {
      recovery: "रिकवरी हब", discharge: "मेरा डिस्चार्ज प्लान", medicines: "दवाइयाँ",
      tests: "जाँच", appointments: "अपॉइंटमेंट", family: "फ़ैमिली केयर सर्कल",
      stock: "दवा स्टॉक", pill: "गोली सत्यापन", otc: "OTC दवा सुरक्षा",
      tracking: "दैनिक ट्रैकिंग", changed: "क्या बदला?", emergency: "आपात कार्ड",
      settings: "सेटिंग्स", notifications: "सूचनाएँ", dashboard: "कमांड डेस्क",
      patients: "मरीज़",
    },
    hub: {
      greeting: "नमस्ते",
      today: "आज की आपकी रिकवरी योजना।",
      now: "अभी", next: "अगला", upcoming: "आगामी",
      progressToday: "आज की प्रगति", progressRecovery: "रिकवरी प्रगति",
      empty: "सब कुछ पूरा। थोड़ा आराम करें।",
    },
    status: {
      confirmed: "पुष्टि हुई", pending: "बाकी", needsAttention: "ध्यान चाहिए",
      upcoming: "आगामी", done: "पूरा", notConfirmed: "पुष्टि नहीं हुई",
      unconfirmedNote: "अभी पुष्टि नहीं। कृपया मरीज़ से पूछें।",
    },
    a11y: {
      title: "सुगमता",
      textSize: "अक्षर आकार", contrast: "उच्च कंट्रास्ट", motion: "एनिमेशन कम",
      dyslexia: "डिस्लेक्सिया अनुकूल फ़ॉन्ट", large: "बड़े बटन", simple: "सरल भाषा",
      language: "भाषा",
    },
    disclaimer: "SIH डेमो / काल्पनिक डेटा — यह निदान या प्रिस्क्रिप्शन उपकरण नहीं है।",
    privacy: "आपकी जानकारी निजी है। पारिवारिक पहुँच आप नियंत्रित करते हैं।",
  },
};

export const t = (lang, path) => {
  const keys = path.split(".");
  let cur = translations[lang] || translations.en;
  for (const k of keys) { cur = cur?.[k]; if (cur === undefined) break; }
  if (cur === undefined) {
    cur = translations.en;
    for (const k of keys) { cur = cur?.[k]; if (cur === undefined) return path; }
  }
  return cur;
};
