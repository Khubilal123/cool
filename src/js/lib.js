// Shared utilities for the Campus Lost & Found app
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.appLib = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STORAGE_KEY = 'campus_lost_found_items_v1';

  function loadItems() {
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load items from storage', e);
      return [];
    }
  }

  function saveItems(items) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save items to storage', e);
    }
  }

  function maskContact(contact) {
    if (!contact) return '—';
    if (contact.length <= 4) return '****';
    return contact.slice(0, 2) + '*'.repeat(Math.max(0, contact.length - 4)) + contact.slice(-2);
  }

  function announce(message) {
    try {
      if (typeof document === 'undefined') return;
      const live = document.getElementById('a11y-live');
      if (!live) return;
      live.textContent = '';
      setTimeout(() => { live.textContent = message; }, 100);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Announce failed', e);
    }
  }

  return { STORAGE_KEY, loadItems, saveItems, maskContact, announce };
});
