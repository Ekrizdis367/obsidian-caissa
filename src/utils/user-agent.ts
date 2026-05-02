import manifest from "../../manifest.json";

/**
 * Identifying User-Agent for all outgoing HTTPS requests this plugin makes.
 * Lichess (and most public APIs) ask third-party clients to set a descriptive
 * UA so they can identify and contact the developer if traffic patterns
 * become problematic. The version is pulled from manifest.json so it stays
 * in sync with releases automatically.
 */
export const USER_AGENT = `${manifest.id}/${manifest.version} (https://github.com/${manifest.author ?? "ekrizdis"}/${manifest.id})`;
