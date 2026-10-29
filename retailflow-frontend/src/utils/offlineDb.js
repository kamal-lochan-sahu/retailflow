import { openDB } from 'idb'

// Local (per-device) storage for offline billing: a cached copy of the shop's
// products/customers so search + barcode scan keep working with no signal, and a
// queue of sales rung up while offline, waiting to be synced to the server.
//
// Every helper here swallows storage errors and returns a safe default — IndexedDB
// can be unavailable (private windows, blocked site data), and that must degrade to
// "online-only billing", never break the POS screen.

let dbPromise
const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB('retailflow-offline', 1, {
      upgrade(db) {
        db.createObjectStore('products',  { keyPath: '_id' })
        db.createObjectStore('customers', { keyPath: '_id' })
        db.createObjectStore('queue',     { keyPath: 'clientId' })
        db.createObjectStore('meta')
      },
    })
  }
  return dbPromise
}

// ── meta ──────────────────────────────────────────────────────
export const getMeta = async (key) => {
  try { return await (await getDB()).get('meta', key) } catch { return undefined }
}
export const setMeta = async (key, value) => {
  try { await (await getDB()).put('meta', value, key) } catch {}
}

// ── product / customer cache ──────────────────────────────────
export const replaceStore = async (name, rows) => {
  const db = await getDB()
  const tx = db.transaction(name, 'readwrite')
  await tx.store.clear()
  for (const row of rows) await tx.store.put(row)
  await tx.done
}

// Wipes the cached shop data (NOT the sale queue — unsynced sales must survive).
export const clearOfflineCache = async () => {
  try {
    const db = await getDB()
    await db.clear('products')
    await db.clear('customers')
    await db.clear('meta')
  } catch {}
}

const norm = (v) => String(v ?? '').toLowerCase()

export const searchCachedProducts = async (q, limit = 10) => {
  try {
    const needle = norm(q).trim()
    if (!needle) return []
    const all = await (await getDB()).getAll('products')
    return all
      .filter(p => [p.name, p.sku, p.barcode, p.brand].some(f => norm(f).includes(needle)))
      .slice(0, limit)
  } catch { return [] }
}

// Same shape the live /products/barcode/:code endpoint returns ({ product }).
// Variant barcodes aren't cached — only base-product barcodes work offline.
export const findCachedByBarcode = async (code) => {
  try {
    const all = await (await getDB()).getAll('products')
    const product = all.find(p => p.barcode && String(p.barcode) === String(code))
    return product ? { product } : null
  } catch { return null }
}

export const searchCachedCustomers = async (q, limit = 10) => {
  try {
    const needle = norm(q).trim()
    if (!needle) return []
    const all = await (await getDB()).getAll('customers')
    return all
      .filter(c => norm(c.name).includes(needle) || norm(c.phone).includes(needle) || String(c.memberCardNumber ?? '') === q.trim())
      .slice(0, limit)
  } catch { return [] }
}

// After an offline sale, keep the cached stock figures honest so the next search
// doesn't show goods that have already gone out the door.
export const adjustCachedStock = async (items) => {
  try {
    const db = await getDB()
    const tx = db.transaction('products', 'readwrite')
    for (const it of items) {
      const p = await tx.store.get(it.productId)
      if (p) await tx.store.put({ ...p, stock: (p.stock || 0) - it.quantity })
    }
    await tx.done
  } catch {}
}

// ── offline sale queue ────────────────────────────────────────
export const addToQueue    = async (entry) => { await (await getDB()).put('queue', entry) }
export const updateInQueue = async (entry) => { await (await getDB()).put('queue', entry) }
export const removeFromQueue = async (clientId) => { await (await getDB()).delete('queue', clientId) }
export const getQueue = async () => {
  try { return await (await getDB()).getAll('queue') } catch { return [] }
}
