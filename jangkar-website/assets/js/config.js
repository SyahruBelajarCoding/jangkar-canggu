/* ==========================================================================
   SITE SETTINGS — edit this file to update the website (no coding needed)
   ========================================================================== */
window.JANGKAR = {
  // WhatsApp number in international format, digits only (no +, no spaces)
  whatsapp: "6281337677891",

  // How many months ahead guests can pick dates
  monthsAhead: 12,

  // Maximum guests the form allows
  maxAdults: 6,
  maxChildren: 4,

  // FULLY BOOKED nights per room type. Format "YYYY-MM-DD" (the night of that date).
  // Add a single night:            "2026-12-24"
  // Add a range (inclusive):       "2026-12-28..2027-01-02"
  // Dates here are shown crossed out in the calendar and can't be selected.
  // "double" = Double Room, "villa" = Villa. If BOTH are booked on a night,
  // it is also blocked for guests who choose "Not sure".
  booked: {
    double: [
      // "2026-12-24",
    ],
    villa: [
      // "2026-12-28..2027-01-02",
    ],
  },
};
