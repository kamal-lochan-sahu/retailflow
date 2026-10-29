import api from './api.js'
import { useAuthStore } from '../store/authStore.js'
import * as db from '../utils/offlineDb.js'

// Offline billing engine: keeps a local copy of products/customers fresh while online,
// queues sales rung up with no connection, and replays them to the server when the
// connection comes back. Every queued sale carries a clientId, and the server treats
// it as an idempotency key — replaying the same sale twice can never bill twice.

const CACHE_TTL_MS   = 10 * 60 * 1000
const SYNC_EVERY_MS  = 30 * 1000
const CACHE_CHECK_MS = 5 * 60 * 1000

// ── tiny external store (consumed via useSyncExternalStore) ───
let state = { online: typeof navigator === 'undefined' ? true : navigator.onLine, pending: 0, failed: [], syncing: false }
const listeners = new Set()
const setState = (patch) => { state = { ...state, ...patch }; listeners.forEach(l => l()) }
export const subscribe   = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const getSnapshot = () => state

export const isOnline = () => navigator.onLine

export const newClientId = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)

const currentUserId = () => {
  const u = useAuthStore.getState().user
  return u?._id || u?.id || null
}

// Only this user's queued sales are shown/synced — a shared till must not attribute
// one cashier's sales to whoever happens to be logged in when signal returns.
export const refreshPending = async () => {
  const uid = currentUserId()
  const mine = (await db.getQueue()).filter(q => q.userId === uid)
  setState({
    pending: mine.filter(q => q.status !== 'failed').length,
    failed:  mine.filter(q => q.status === 'failed').map(q => ({ clientId: q.clientId, ref: q.ref, total: q.total, error: q.error })),
  })
}

export const queueOfflineSale = async (sale, { total, itemCount }) => {
  const userId = currentUserId()
  if (!userId) throw new Error('Not logged in')
  await db.addToQueue({
    clientId: sale.clientId,
    userId,
    ref: 'OFF-' + String(sale.clientId).replace(/-/g, '').slice(0, 6).toUpperCase(),
    offlineCreatedAt: new Date().toISOString(),
    total, itemCount,
    status: 'pending',
    sale,
  })
  await db.adjustCachedStock(sale.items)
  await refreshPending()
}

// ── cache refresh ─────────────────────────────────────────────
let refreshing = false

async function fetchAll(path, key) {
  const out = []
  for (let page = 1; page <= 25; page++) {
    const { data } = await api.get(path, { params: { page, limit: 200 }, silent: true })
    const body = data.data
    out.push(...(body[key] || []))
    if (page >= (body.pagination?.pages || 1)) break
  }
  return out
}

export async function refreshCaches({ force = false } = {}) {
  const uid = currentUserId()
  if (refreshing || !uid || !isOnline()) return
  refreshing = true
  try {
    // Different person logged in on this device? Drop the previous shop's cached data.
    if ((await db.getMeta('cacheUser')) !== uid) {
      await db.clearOfflineCache()
      await db.setMeta('cacheUser', uid)
    }
    const last = (await db.getMeta('lastRefresh')) || 0
    if (!force && Date.now() - last < CACHE_TTL_MS) return

    let ok = false
    try { await db.replaceStore('products', await fetchAll('/products', 'products')); ok = true } catch {}
    // Customers are best-effort — some roles can't list them.
    try { await db.replaceStore('customers', await fetchAll('/customers', 'customers')) } catch {}
    if (ok) await db.setMeta('lastRefresh', Date.now())
  } finally { refreshing = false }
}

// ── sync ──────────────────────────────────────────────────────
let syncing = false

export async function syncQueue({ retryFailed = false } = {}) {
  const uid = currentUserId()
  if (syncing || !uid || !isOnline()) return 0
  syncing = true
  setState({ syncing: true })
  let synced = 0
  try {
    const mine = (await db.getQueue())
      .filter(q => q.userId === uid)
      .sort((a, b) => a.offlineCreatedAt.localeCompare(b.offlineCreatedAt))

    for (const entry of mine) {
      if (entry.status === 'failed' && !retryFailed) continue
      try {
        await api.post('/sales/sync-offline',
          { ...entry.sale, offlineCreatedAt: entry.offlineCreatedAt },
          { silent: true })
        await db.removeFromQueue(entry.clientId)
        synced++
      } catch (e) {
        const status = e.response?.status
        // No response / server trouble / duplicate-in-flight: try again next round.
        if (!status || status >= 500 || status === 409 || status === 408 || status === 429 || status === 401) break
        // A real rejection (e.g. the product was deleted): park it visibly, never drop it.
        await db.updateInQueue({ ...entry, status: 'failed', error: e.response?.data?.message || `Rejected (${status})` })
      }
    }
  } finally {
    syncing = false
    setState({ syncing: false })
    await refreshPending()
  }
  if (synced > 0) {
    window.dispatchEvent(new Event('retailflow:synced'))
    refreshCaches({ force: true }).catch(() => {})
  }
  return synced
}

// ── bootstrap (called once, from the authenticated layout) ────
let started = false
export function initOfflineSync() {
  if (started) return
  started = true
  window.addEventListener('online', () => {
    setState({ online: true })
    syncQueue().catch(() => {})
    refreshCaches().catch(() => {})
  })
  window.addEventListener('offline', () => setState({ online: false }))
  setInterval(() => { if (isOnline() && state.pending > 0) syncQueue().catch(() => {}) }, SYNC_EVERY_MS)
  setInterval(() => { refreshCaches().catch(() => {}) }, CACHE_CHECK_MS)
  refreshPending()
    .then(() => { syncQueue().catch(() => {}); return refreshCaches() })
    .catch(() => {})
}
