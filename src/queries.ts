/**
 * Minimal duck-typed interface — any SuiClient (v1.0, v1.21, dapp-kit)
 * satisfies this as long as it exposes the four RPC methods we use.
 * This avoids version-mismatch TS errors when integrators use a different
 * version of @mysten/sui than the SDK's devDependency.
 */
export interface SuiClientLike {
  queryEvents(params: { query: any; cursor?: any; limit?: number }): Promise<{ data: any[]; hasNextPage: boolean; nextCursor?: any }>
  getObject(params: { id: string; options?: any }): Promise<any>
  multiGetObjects(params: { ids: string[]; options?: any }): Promise<any[]>
  getCoinMetadata(params: { coinType: string }): Promise<any>
}

import type {
  AnyVault, Vault, MultiVault,
  VaultCreatedEvent, MultiVaultCreatedEvent,
  MultiBeneficiaryAddedEvent,
  TokenTVLStat, AnalyticsData,
} from './types'
import { extractCoinType } from './utils'

// ─── Pagination helper ────────────────────────────────────────────────────────

/**
 * Fetches **all** events of a given Move event type, following pagination
 * automatically. SUI's RPC is capped at 50 events per call.
 *
 * @param maxPages - Safety cap (default 40 = 2 000 events). Increase for very
 *   active protocols.
 */
export async function fetchAllEvents(
  client: SuiClientLike,
  eventType: string,
  maxPages = 40,
): Promise<any[]> {
  const all: any[] = []
  let cursor: any = undefined

  for (let i = 0; i < maxPages; i++) {
    let res: any
    try {
      res = await client.queryEvents({
        query: { MoveEventType: eventType },
        cursor,
        limit: 50,
      })
    } catch {
      // RPC node doesn't know about this event type yet (no events emitted) — treat as empty
      break
    }
    all.push(...(res?.data ?? []))
    if (!res?.hasNextPage || !res?.nextCursor) break
    cursor = res.nextCursor
  }

  return all
}

// ─── Object batch fetcher ─────────────────────────────────────────────────────

async function batchGetObjects(client: SuiClientLike, ids: string[]): Promise<any[]> {
  const CHUNK = 50
  const results: any[] = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const res = await client.multiGetObjects({
      ids: chunk,
      options: { showContent: true, showType: true },
    })
    results.push(...res)
  }
  return results
}

// ─── Vault deserialisers ──────────────────────────────────────────────────────

function toVault(obj: any): Vault | null {
  if (!obj?.data?.content?.fields) return null
  return {
    id:     obj.data.objectId,
    type:   obj.data.type ?? '',
    kind:   'single',
    fields: obj.data.content.fields,
  }
}

function toMultiVault(obj: any): MultiVault | null {
  if (!obj?.data?.content?.fields) return null
  const raw = obj.data.content.fields
  // VecMap serialisation: { contents: [...] } or { fields: { contents: [...] } }
  const normaliseVecMap = (vm: any) => {
    if (vm?.fields?.contents) return { contents: vm.fields.contents }
    if (vm?.contents)         return { contents: vm.contents }
    return { contents: [] }
  }
  return {
    id:   obj.data.objectId,
    type: obj.data.type ?? '',
    kind: 'multi',
    fields: {
      ...raw,
      shares:  normaliseVecMap(raw.shares),
      claimed: normaliseVecMap(raw.claimed),
    },
  }
}

function deserialiseVault(obj: any): AnyVault | null {
  const type: string = obj?.data?.type ?? ''
  if (type.includes('MultiVestingVault')) return toMultiVault(obj)
  if (type.includes('VestingVault'))      return toVault(obj)
  return null
}

// ─── Single vault ─────────────────────────────────────────────────────────────

/**
 * Fetches a single vault by its object ID.
 *
 * @returns The vault, or `null` if the object does not exist or is not a vault.
 *
 * @example
 * ```ts
 * import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
 * import { fetchVault, MAINNET_CONFIG } from '@epoch-sui/sdk'
 *
 * const client = new SuiClient({ url: getFullnodeUrl('mainnet') })
 * const vault  = await fetchVault(client, '0xvaultId...')
 * ```
 */
export async function fetchVault(
  client: SuiClientLike,
  vaultId: string,
): Promise<AnyVault | null> {
  const obj = await client.getObject({
    id: vaultId,
    options: { showContent: true, showType: true },
  })
  return deserialiseVault(obj)
}

// ─── Vaults by beneficiary ────────────────────────────────────────────────────

/**
 * Fetches all vaults (single + multi) where `address` is a beneficiary.
 *
 * Uses on-chain events — works without an indexer.
 */
export async function fetchVaultsByBeneficiary(
  client: SuiClientLike,
  address: string,
  packageId: string,
): Promise<AnyVault[]> {
  const [singleEvts, multiAddedEvts] = await Promise.all([
    fetchAllEvents(client, `${packageId}::vesting::VaultCreated`),
    fetchAllEvents(client, `${packageId}::vesting::MultiBeneficiaryAdded`),
  ])

  const singleIds = singleEvts
    .filter(e => (e.parsedJson as VaultCreatedEvent)?.beneficiary === address)
    .map(e => (e.parsedJson as VaultCreatedEvent).vault_id)
    .filter(Boolean)

  const multiIds = [
    ...new Set(
      multiAddedEvts
        .filter(e => (e.parsedJson as MultiBeneficiaryAddedEvent)?.beneficiary === address)
        .map(e => (e.parsedJson as MultiBeneficiaryAddedEvent).vault_id)
        .filter(Boolean),
    ),
  ]

  const allIds = [...new Set([...singleIds, ...multiIds])]
  if (allIds.length === 0) return []

  const objects = await batchGetObjects(client, allIds)
  return objects.map(deserialiseVault).filter((v): v is AnyVault => v !== null)
}

// ─── Vaults by creator ────────────────────────────────────────────────────────

/**
 * Fetches all vaults created by `address`.
 */
export async function fetchVaultsByCreator(
  client: SuiClientLike,
  address: string,
  packageId: string,
): Promise<AnyVault[]> {
  const [singleEvts, multiEvts] = await Promise.all([
    fetchAllEvents(client, `${packageId}::vesting::VaultCreated`),
    fetchAllEvents(client, `${packageId}::vesting::MultiVaultCreated`),
  ])

  const singleIds = singleEvts
    .filter(e => (e.parsedJson as VaultCreatedEvent)?.creator === address)
    .map(e => (e.parsedJson as VaultCreatedEvent).vault_id)
    .filter(Boolean)

  const multiIds = multiEvts
    .filter(e => (e.parsedJson as MultiVaultCreatedEvent)?.creator === address)
    .map(e => (e.parsedJson as MultiVaultCreatedEvent).vault_id)
    .filter(Boolean)

  const allIds = [...new Set([...singleIds, ...multiIds])]
  if (allIds.length === 0) return []

  const objects = await batchGetObjects(client, allIds)
  return objects.map(deserialiseVault).filter((v): v is AnyVault => v !== null)
}

// ─── Deploy fee ───────────────────────────────────────────────────────────────

/**
 * Reads the current deploy fee from the Treasury object on-chain.
 *
 * Always call this before building a create-vault transaction to get the
 * exact fee — do not hard-code it.
 */
export async function fetchDeployFee(
  client: SuiClientLike,
  treasuryId: string,
): Promise<bigint> {
  const obj = await client.getObject({ id: treasuryId, options: { showContent: true } })
  const fields = (obj.data?.content as any)?.fields ?? {}
  if (fields.deploy_fee) return BigInt(fields.deploy_fee)
  throw new Error('[epoch-sdk] Could not read deploy_fee from Treasury object')
}

// ─── Token TVL ────────────────────────────────────────────────────────────────

/**
 * Fetches per-token TVL statistics: total locked, remaining, and claimed
 * amounts for every coin type present in active vaults.
 *
 * This is an expensive read — it fetches all vault objects and calls
 * `getCoinMetadata` for each unique coin type. Cache the result.
 */
export async function fetchTokenTVL(
  client: SuiClientLike,
  packageId: string,
): Promise<TokenTVLStat[]> {
  const [singleEvts, multiEvts] = await Promise.all([
    fetchAllEvents(client, `${packageId}::vesting::VaultCreated`),
    fetchAllEvents(client, `${packageId}::vesting::MultiVaultCreated`),
  ])

  const vaultIds = [
    ...singleEvts.map(e => (e.parsedJson as any)?.vault_id).filter(Boolean),
    ...multiEvts.map(e  => (e.parsedJson as any)?.vault_id).filter(Boolean),
  ]
  if (vaultIds.length === 0) return []

  const objects = await batchGetObjects(client, vaultIds)

  const byType = new Map<string, {
    vaultCount:  number
    totalLocked: bigint
    remaining:   bigint
    claimed:     bigint
  }>()

  for (const obj of objects) {
    const type     = obj.data?.type ?? ''
    const coinType = extractCoinType(type)
    if (!coinType) continue

    const fields  = (obj.data?.content as any)?.fields ?? {}
    const balRaw  = typeof fields.balance === 'object'
      ? (fields.balance?.fields?.value ?? '0')
      : (fields.balance ?? '0')
    const remaining   = BigInt(balRaw)
    const totalLocked = BigInt(fields.total_locked ?? '0')

    // claimed: bigint for single, VecMap sum for multi
    let claimed = 0n
    if (typeof fields.claimed === 'object' && fields.claimed?.fields?.contents) {
      for (const entry of fields.claimed.fields.contents) {
        claimed += BigInt(entry.fields?.value ?? entry.value ?? 0)
      }
    } else if (typeof fields.claimed === 'object' && fields.claimed?.contents) {
      for (const entry of fields.claimed.contents) {
        claimed += BigInt(entry.value ?? 0)
      }
    } else {
      claimed = BigInt(fields.claimed ?? '0')
    }

    const cur = byType.get(coinType) ?? {
      vaultCount: 0, totalLocked: 0n, remaining: 0n, claimed: 0n,
    }
    byType.set(coinType, {
      vaultCount:  cur.vaultCount + 1,
      totalLocked: cur.totalLocked + totalLocked,
      remaining:   cur.remaining + remaining,
      claimed:     cur.claimed + claimed,
    })
  }

  const coinTypes = [...byType.keys()]
  const metaResults = await Promise.allSettled(
    coinTypes.map(ct => client.getCoinMetadata({ coinType: ct })),
  )

  return coinTypes
    .map((ct, i) => {
      const meta = metaResults[i].status === 'fulfilled' ? metaResults[i].value : null
      const agg  = byType.get(ct)!
      return {
        coinType:    ct,
        symbol:      meta?.symbol ?? ct.split('::').pop()?.toUpperCase() ?? '?',
        decimals:    meta?.decimals ?? 9,
        vaultCount:  agg.vaultCount,
        totalLocked: agg.totalLocked,
        remaining:   agg.remaining,
        claimed:     agg.claimed,
      }
    })
    .sort((a, b) => Number(b.totalLocked - a.totalLocked))
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function monthKey(tsMs: number): string {
  const d = new Date(tsMs)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Computes protocol-wide analytics from on-chain events.
 *
 * @example
 * ```ts
 * const analytics = await fetchAnalytics(client, MAINNET_CONFIG.packageId)
 * console.log(`${analytics.totalVaults} vaults created`)
 * ```
 */
export async function fetchAnalytics(
  client: SuiClientLike,
  packageId: string,
): Promise<AnalyticsData> {
  const [singleEvts, multiEvts, claimEvts, multiClaimEvts] = await Promise.all([
    fetchAllEvents(client, `${packageId}::vesting::VaultCreated`),
    fetchAllEvents(client, `${packageId}::vesting::MultiVaultCreated`),
    fetchAllEvents(client, `${packageId}::vesting::TokensClaimed`),
    fetchAllEvents(client, `${packageId}::vesting::MultiTokensClaimed`),
  ])

  // Monthly vault counts
  const vaultByMonth = new Map<string, { single: number; multi: number }>()
  const allTs: number[] = []

  for (const e of singleEvts) {
    const ts = Number(e.timestampMs ?? 0); if (!ts) continue
    allTs.push(ts)
    const k = monthKey(ts); const cur = vaultByMonth.get(k) ?? { single: 0, multi: 0 }
    vaultByMonth.set(k, { ...cur, single: cur.single + 1 })
  }
  for (const e of multiEvts) {
    const ts = Number(e.timestampMs ?? 0); if (!ts) continue
    allTs.push(ts)
    const k = monthKey(ts); const cur = vaultByMonth.get(k) ?? { single: 0, multi: 0 }
    vaultByMonth.set(k, { ...cur, multi: cur.multi + 1 })
  }

  const sortedKeys = [...vaultByMonth.keys()].sort()
  const monthlyBars: AnalyticsData['monthlyBars'] = []

  if (sortedKeys.length > 0) {
    const first = new Date(sortedKeys[0] + '-01')
    const last  = new Date(sortedKeys[sortedKeys.length - 1] + '-01')
    const cur   = new Date(first)
    while (cur <= last) {
      const k = monthKey(cur.getTime())
      monthlyBars.push({ month: k, ...(vaultByMonth.get(k) ?? { single: 0, multi: 0 }) })
      cur.setMonth(cur.getMonth() + 1)
    }
  }

  // Monthly claims
  const claimByMonth = new Map<string, number>()
  for (const e of [...claimEvts, ...multiClaimEvts]) {
    const ts = Number(e.timestampMs ?? 0); if (!ts) continue
    const k = monthKey(ts)
    claimByMonth.set(k, (claimByMonth.get(k) ?? 0) + 1)
  }
  const claimBars: AnalyticsData['claimBars'] = monthlyBars.map(b => ({
    month: b.month,
    count: claimByMonth.get(b.month) ?? 0,
  }))

  // Top creators
  const creatorCount = new Map<string, number>()
  for (const e of [...singleEvts, ...multiEvts]) {
    const creator: string = (e.parsedJson as any)?.creator ?? ''
    if (creator) creatorCount.set(creator, (creatorCount.get(creator) ?? 0) + 1)
  }
  const totalForPct = singleEvts.length + multiEvts.length || 1
  const topCreators: AnalyticsData['topCreators'] = [...creatorCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([address, count]) => ({
      address,
      count,
      pct: Math.round((count / totalForPct) * 100),
    }))

  const multiWallets = multiEvts.reduce(
    (sum, e) => sum + Number((e.parsedJson as any)?.beneficiary_count ?? 2),
    0,
  )
  const firstTs = allTs.length > 0 ? Math.min(...allTs) : null

  return {
    totalVaults:    singleEvts.length + multiEvts.length,
    singleVaults:   singleEvts.length,
    multiVaults:    multiEvts.length,
    totalWallets:   singleEvts.length + multiWallets,
    totalClaims:    claimEvts.length + multiClaimEvts.length,
    uniqueCreators: creatorCount.size,
    firstVaultDate: firstTs
      ? new Date(firstTs).toISOString()
      : null,
    monthlyBars,
    claimBars,
    topCreators,
  }
}
