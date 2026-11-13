// The OJK working-day clock, "same day" reply targets and the calendar all use Jakarta time (WIB).
// Imported first so every Date in the process uses it.
process.env.TZ = process.env.TZ || 'Asia/Jakarta';
export {};
