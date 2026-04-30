import type { VaultFields, MultiVaultFields, VecMapField } from './types'

// ─── Coin type extraction ─────────────────────────────────────────────────────

/**
 * Extracts the coin type from a vault's Move type string.
 *
 * @example
 * extractCoinType('0xpkg::vesting::VestingVault<0x2::sui::SUI>')
 * // → '0x2::sui::SUI'
 */
export function extractCoinType(vaultType: string): string | null {
  const m = vaultType.match(/<(.+)>$/)
  return m ? m[1] : null
}

/**
 * Returns `true` if the vault type string belongs to a `MultiVestingVault`.
 */
export function isMultiVaultType(vaultType: string): boolean {
  return vaultType.includes('MultiVestingVault')
}

// ─── VecMap helpers ───────────────────────────────────────────────────────────

/**
 * Converts a Sui VecMap<address, u64> (as serialised by the RPC) to a plain
 * `Record<address, bigint>`.
 */
export function parseVecMap(vm: VecMapField): Record<string, bigint> {
  const out: Record<string, bigint> = {}
  for (const { key, value } of vm.contents) {
    out[key] = BigInt(value)
  }
  return out
}

// ─── Claimable amount ─────────────────────────────────────────────────────────

/**
 * Computes the amount currently claimable from a **single-beneficiary** vault.
 *
 * Returns `0n` if nothing has vested yet or everything has been claimed.
 */
export function claimableNow(fields: VaultFields, nowMs?: number): bigint {
  const now        = BigInt(nowMs ?? Date.now())
  const total      = BigInt(fields.total_locked)
  const claimed    = BigInt(fields.claimed)
  const cliffTs    = BigInt(fields.cliff_ts_ms)
  const cliffBps   = BigInt(fields.cliff_bps)
  const linStart   = BigInt(fields.linear_start_ms)
  const linEnd     = BigInt(fields.linear_end_ms)

  let vested = 0n

  // Cliff component
  if (cliffTs > 0n && now >= cliffTs) {
    vested += (total * cliffBps) / 10000n
  }

  // Linear component
  const linearTotal = total - (total * cliffBps) / 10000n
  if (linEnd > linStart && now >= linStart) {
    if (now >= linEnd) {
      vested += linearTotal
    } else {
      vested += (linearTotal * (now - linStart)) / (linEnd - linStart)
    }
  }

  if (vested > total) vested = total
  return vested > claimed ? vested - claimed : 0n
}

/**
 * Computes the amount currently claimable by a specific beneficiary from a
 * **multi-beneficiary** vault.
 */
export function claimableForUser(
  fields: MultiVaultFields,
  userAddress: string,
  nowMs?: number,
): bigint {
  const now       = BigInt(nowMs ?? Date.now())
  const total     = BigInt(fields.total_locked)
  const shares    = parseVecMap(fields.shares)
  const claimed   = parseVecMap(fields.claimed)
  const cliffTs   = BigInt(fields.cliff_ts_ms)
  const cliffBps  = BigInt(fields.cliff_bps)
  const linStart  = BigInt(fields.linear_start_ms)
  const linEnd    = BigInt(fields.linear_end_ms)

  const shareBps    = shares[userAddress] ?? 0n
  const userTotal   = (total * shareBps) / 10000n
  const userClaimed = claimed[userAddress] ?? 0n

  const cliffComp  = (userTotal * cliffBps) / 10000n
  const linearComp = userTotal - cliffComp

  let vested = 0n
  if (cliffTs > 0n && now >= cliffTs) vested += cliffComp
  if (linEnd > linStart && now >= linStart) {
    if (now >= linEnd) {
      vested += linearComp
    } else {
      vested += (linearComp * (now - linStart)) / (linEnd - linStart)
    }
  }
  if (vested > userTotal) vested = userTotal
  return vested > userClaimed ? vested - userClaimed : 0n
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Formats a raw token amount (in base units) as a human-readable string.
 *
 * @example
 * formatAmount(1_500_000_000n, 9)  // → '1.50'
 * formatAmount(1_234_000_000_000n, 9) // → '1.23K'
 */
export function formatAmount(raw: bigint, decimals: number): string {
  const n = Number(raw) / 10 ** decimals
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`
  return n % 1 === 0 ? `${n}` : n.toFixed(2)
}

/**
 * Converts a decimal amount string (e.g. `"10.5"`) to base units (bigint).
 *
 * Handles both `.` and `,` as decimal separators.
 *
 * @example
 * toBaseUnits('10.5', 9) // → 10_500_000_000n
 */
export function toBaseUnits(amount: string, decimals: number): bigint {
  if (!amount) return 0n
  const normalized = amount.trim().replace(',', '.')
  if (isNaN(Number(normalized))) return 0n
  const [intPart, fracPart = ''] = normalized.split('.')
  const frac = fracPart.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(intPart || '0') * BigInt(10 ** decimals) + BigInt(frac || '0')
}

/**
 * Converts a JS `Date` (or date string) to a Unix timestamp in milliseconds
 * as `bigint`, ready to pass to the transaction builders.
 */
export function dateToMs(date: Date | string): bigint {
  const ts = typeof date === 'string' ? new Date(date).getTime() : date.getTime()
  return BigInt(ts)
}
