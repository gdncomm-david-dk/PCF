/*
 * Text selection and copying inside a canvas app. The player marks its controls user-select:none
 * and may cancel selectstart / copy / the context menu further up the page; the control's CSS turns
 * selection back on and guardSelection() keeps those events from reaching the host.
 */

/** Keeps the host from cancelling selection, copy and the context menu inside `el`. */
export function guardSelection(el: HTMLElement): () => void {
    const stop = (e: Event): void => e.stopPropagation();
    const keys = (e: KeyboardEvent): void => {
        if ((e.ctrlKey || e.metaKey) && /^(a|c|x|insert)$/i.test(e.key)) e.stopPropagation();
    };
    const events = ["selectstart", "copy", "cut", "contextmenu"];
    events.forEach((t) => el.addEventListener(t, stop));
    el.addEventListener("keydown", keys);
    return () => {
        events.forEach((t) => el.removeEventListener(t, stop));
        el.removeEventListener("keydown", keys);
    };
}

/** True while the user has text selected; a click that ends a drag-selection should not act. */
export function isSelecting(): boolean {
    const s = window.getSelection();
    return !!s && !s.isCollapsed && s.toString().trim() !== "";
}

/**
 * Copies text to the clipboard. The Clipboard API is often refused inside the player's iframe, so a
 * hidden textarea and execCommand("copy") are the fallback.
 */
export async function copyText(text: string, host?: HTMLElement | null): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        /* fall back below */
    }
    const active = document.activeElement as HTMLElement | null;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    (host ?? document.body).appendChild(ta);
    try {
        ta.select();
        ta.setSelectionRange(0, text.length);
        return document.execCommand("copy");
    } catch {
        return false;
    } finally {
        ta.remove();
        active?.focus?.({ preventScroll: true });
    }
}
