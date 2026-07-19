// Overpass rejects requests without a User-Agent (406), and the other free
// APIs expect polite identification too. One constant so every outbound call
// identifies the app the same way.

export const USER_AGENT = "Farepoint/1.0 (personal trip planner; contact: enesiahuoyiza@gmail.com)";

export const IDENT_HEADERS = { "User-Agent": USER_AGENT };
