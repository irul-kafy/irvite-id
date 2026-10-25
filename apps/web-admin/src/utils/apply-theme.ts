/**
 * Instantly switch the admin color theme.
 *
 * Many admin components animate `background` / `color` / `border-color`
 * (often via `transition: all`). Without intervention, those transitions run
 * when the `dark` class flips, so buttons and cards visibly lag behind the
 * page. We suppress every transition for the frame in which the theme changes,
 * then restore them so hover/focus animations keep working.
 */
export type AdminTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'irvite-theme';

export function applyTheme(next: AdminTheme): void {
  const root = document.documentElement;

  const killTransitions = document.createElement('style');
  killTransitions.setAttribute('data-theme-switch', '');
  killTransitions.textContent =
    '*,*::before,*::after{transition:none!important}';
  document.head.appendChild(killTransitions);

  root.classList.toggle('dark', next === 'dark');
  root.style.colorScheme = next;

  // Force style recalculation for the whole tree while transitions are off.
  void document.body.offsetHeight;

  // Restore transitions after the new theme has been painted.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => killTransitions.remove());
  });

  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // ignore (private mode / storage disabled)
  }
}

export function getCurrentTheme(): AdminTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
