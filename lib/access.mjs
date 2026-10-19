// Deliberately lightweight, client-side deterrent. This is NOT a secret or real authentication.
// The password and all site data can be inspected in publicly served static assets.
export const ACCESS_SESSION_KEY = 'momijii-access-v1';
/** @param {string} password */
export function acceptsPassword(password) { return password === 'momiji'; }
