import { useEffect, RefObject } from 'react';

/**
 * Retorna todos os elementos focáveis dentro de um container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => !el.closest('[aria-hidden="true"]') && (el.offsetParent !== null || el.tagName === 'INPUT'));
}

/**
 * Hook que prende o foco dentro de um container (focus-trap).
 * Tab avança, Shift+Tab retrocede. Ao sair do ultimo/primeiro, cicla para o oposto.
 *
 * @param containerRef  Ref do elemento container
 * @param enabled       Se false, o hook nao faz nada
 * @param autoFocus     Se true, foca o primeiro elemento ao montar
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  autoFocus = true
) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    const container = containerRef.current;

    if (autoFocus) {
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        const t = setTimeout(() => focusable[0].focus(), 80);
        return () => clearTimeout(t);
      }
    }
  }, [enabled]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    const container = containerRef.current;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, [enabled]);  // eslint-disable-line react-hooks/exhaustive-deps
}
