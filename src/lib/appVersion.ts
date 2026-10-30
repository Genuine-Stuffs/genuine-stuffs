/**
 * Is this tab running an older build than the site now serves?
 *
 * A deploy replaces the hashed files under /assets, so a tab opened before it
 * asks for worker and chunk files that are gone: the server answers with the
 * page's HTML ("non-JavaScript MIME type"), and planning falls back to the
 * main thread, freezing the page (owner's console, 2026-10-20). The page
 * checks before it sends a prompt and reloads then: before a first prompt
 * nothing on screen is lost; before a follow-up the conversation and the
 * design on screen are kept across the reload (2026-10-30: an edit typed into
 * an old tab was drawn the slow way, without the edit loop). During a design
 * it only says a new version is ready.
 */
const BUNDLE = /\/assets\/index-[A-Za-z0-9_-]+\.js/;
const PENDING_PROMPT = 'gs-ai-studio-pending-prompt';
const PENDING_SESSION = 'gs-ai-studio-pending-session';

/** The main bundle this tab runs, or null in development (no hashed bundle). */
export function runningBundle(): string | null {
    for (const s of Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))) {
        const m = s.src.match(BUNDLE);
        if (m) return m[0];
    }
    return null;
}

/** True when the site now serves a different main bundle; false when it
 * serves the same one, in development, or when the check can't be made. */
export async function newerBuildAvailable(): Promise<boolean> {
    const mine = runningBundle();
    if (!mine) return false;
    try {
        const res = await fetch(`${window.location.pathname}?v=${Date.now()}`, { cache: 'no-store' });
        const served = (await res.text()).match(BUNDLE)?.[0];
        return !!served && served !== mine;
    } catch {
        return false;
    }
}

/** Keep the prompt across the reload; the page puts it back in the box. */
export function reloadKeepingPrompt(prompt: string): void {
    try { sessionStorage.setItem(PENDING_PROMPT, prompt); } catch { /* storage blocked: the reload still helps */ }
    window.location.reload();
}

/** Keep the conversation (and the prompt) across the reload; false, and no reload, when the
 * browser can't store it (storage blocked or full), so nothing on screen is lost. */
export function reloadKeepingSession(prompt: string, session: unknown): boolean {
    try { sessionStorage.setItem(PENDING_SESSION, JSON.stringify(session)); } catch {
        try { sessionStorage.removeItem(PENDING_SESSION); } catch { /* nothing stored */ }
        return false;
    }
    reloadKeepingPrompt(prompt);
    return true;
}

/** The conversation saved before a reload, once. */
export function takePendingSession<T>(): T | null {
    try {
        const s = sessionStorage.getItem(PENDING_SESSION);
        if (s !== null) sessionStorage.removeItem(PENDING_SESSION);
        return s ? JSON.parse(s) as T : null;
    } catch {
        return null;
    }
}

/** The prompt saved before a reload, once. */
export function takePendingPrompt(): string | null {
    try {
        const p = sessionStorage.getItem(PENDING_PROMPT);
        if (p !== null) sessionStorage.removeItem(PENDING_PROMPT);
        return p;
    } catch {
        return null;
    }
}
