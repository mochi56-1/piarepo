import { useEffect } from "react";

export default function useDialogFocus(key, selector = '[role="dialog"]') {
  useEffect(() => {
    if (!key) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector(selector);
    const targets = () =>
      [
        ...(dialog?.querySelectorAll(
          'button:not(:disabled),input:not(:disabled):not([type="hidden"]),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
        ) || []),
      ].filter((element) => element.getClientRects().length > 0);
    (targets()[0] || dialog)?.focus();
    const onKeyDown = (event) => {
      if (event.key !== "Tab" || dialog?.closest("[inert]")) return;
      const items = targets(),
        first = items[0],
        last = items[items.length - 1];
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [key, selector]);
}
