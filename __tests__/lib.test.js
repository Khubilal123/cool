const lib = require('../src/js/lib');

describe('appLib utilities', () => {
  beforeEach(() => {
    // reset localStorage
    localStorage.clear();
    document.body.innerHTML = '<div id="a11y-live" aria-live="polite"></div>';
  });

  test('loadItems returns empty array when none saved', () => {
    const items = lib.loadItems();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
  });

  test('saveItems persists and loadItems retrieves', () => {
    const sample = [{ id: 'x', itemName: 'Test' }];
    lib.saveItems(sample);
    const loaded = lib.loadItems();
    expect(loaded).toEqual(sample);
  });

  test('maskContact masks correctly', () => {
    expect(lib.maskContact('')).toBe('—');
    expect(lib.maskContact('1234')).toBe('****');
    expect(lib.maskContact('1234567890')).toMatch(/12\*+90/);
  });

  test('announce writes to a11y-live', (done) => {
    lib.announce('Hello');
    // announce uses setTimeout( ..., 100 ) so wait a bit
    setTimeout(() => {
      expect(document.getElementById('a11y-live').textContent).toBe('Hello');
      done();
    }, 150);
  });
});
