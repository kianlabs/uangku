/**
 * Setup global untuk Vitest.
 *
 * jsdom + kombinasi Node tertentu tidak mengekspos `localStorage` ke global
 * (semua test yang memanggil `localStorage.clear()` di beforeEach gagal
 * dengan "Cannot read properties of undefined"). Stub in-memory ini mengisi
 * kekosongan tersebut; tiap file test tetap isolasi via worker-nya sendiri
 * dan membersihkan lewat `localStorage.clear()` di beforeEach masing-masing.
 */
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  const stub: Storage = {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: stub,
    writable: true,
    configurable: true,
  });
}
