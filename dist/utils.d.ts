import type { VaultFields, MultiVaultFields, VecMapField } from './types';
/**
 * Extracts the coin type from a vault's Move type string.
 *
 * @example
 * extractCoinType('0xpkg::vesting::VestingVault<0x2::sui::SUI>')
 * // → '0x2::sui::SUI'
 */
export declare function extractCoinType(vaultType: string): string | null;
/**
 * Returns `true` if the vault type string belongs to a `MultiVestingVault`.
 */
export declare function isMultiVaultType(vaultType: string): boolean;
/**
 * Converts a Sui VecMap<address, u64> (as serialised by the RPC) to a plain
 * `Record<address, bigint>`.
 */
export declare function parseVecMap(vm: VecMapField): Record<string, bigint>;
/**
 * Computes the amount currently claimable from a **single-beneficiary** vault.
 *
 * Returns `0n` if nothing has vested yet or everything has been claimed.
 */
export declare function claimableNow(fields: VaultFields, nowMs?: number): bigint;
/**
 * Computes the amount currently claimable by a specific beneficiary from a
 * **multi-beneficiary** vault.
 */
export declare function claimableForUser(fields: MultiVaultFields, userAddress: string, nowMs?: number): bigint;
/**
 * Formats a raw token amount (in base units) as a human-readable string.
 *
 * @example
 * formatAmount(1_500_000_000n, 9)  // → '1.50'
 * formatAmount(1_234_000_000_000n, 9) // → '1.23K'
 */
export declare function formatAmount(raw: bigint, decimals: number): string;
/**
 * Converts a decimal amount string (e.g. `"10.5"`) to base units (bigint).
 *
 * Handles both `.` and `,` as decimal separators.
 *
 * @example
 * toBaseUnits('10.5', 9) // → 10_500_000_000n
 */
export declare function toBaseUnits(amount: string, decimals: number): bigint;
/**
 * Converts a JS `Date` (or date string) to a Unix timestamp in milliseconds
 * as `bigint`, ready to pass to the transaction builders.
 */
export declare function dateToMs(date: Date | string): bigint;
//# sourceMappingURL=utils.d.ts.map