/**
 * Centralized Logout Service
 * 
 * Handles client-side cleanup during logout to ensure no sensitive data 
 * remains in memory or browser storage.
 */

export const performLogoutCleanup = () => {
  if (typeof window === 'undefined') return;

  // 1. Complete localStorage cleanup (preserving theme preferences)
  const currentTheme = localStorage.getItem('theme');
  localStorage.clear();
  if (currentTheme) {
    localStorage.setItem('theme', currentTheme);
  }

  // 2. Complete sessionStorage cleanup
  sessionStorage.clear();

  // Note: Redux cleanup is handled via rootReducer interception 
  // in store/index.ts reacting to the 'auth/logout' action.
};

/**
 * Setup multi-tab logout synchronization.
 * Listens for the 'access_token' being removed from localStorage
 * in another tab, and forces this tab to also log out.
 */
export const setupMultiTabLogout = (onLogout: () => void) => {
  if (typeof window === 'undefined') return () => {};

  const handleStorageChange = (e: StorageEvent) => {
    // If the access_token was removed in another tab
    if (e.key === 'access_token' && e.oldValue && !e.newValue) {
      onLogout();
    }
    // Alternatively, if localStorage.clear() was called (e.key is null)
    // and we currently think we are authenticated, we might need to check.
    if (e.key === null) {
      if (!localStorage.getItem('access_token')) {
        onLogout();
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};
