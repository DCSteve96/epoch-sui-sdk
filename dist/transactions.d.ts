import { Transaction } from '@mysten/sui/transactions';
import type { CreateVaultParams, CreateMultiVaultParams, ClaimParams } from './types';
/**
 * Builds a `Transaction` that calls `vesting::create_vault<T>`.
 *
 * The returned transaction must be signed and executed by the caller's wallet.
 *
 * @example
 * ```ts
 * import { buildCreateVaultTx, MAINNET_CONFIG, dateToMs } from '@epoch-sui/sdk'
 *
 * const tx = buildCreateVaultTx({
 *   packageId:     MAINNET_CONFIG.packageId,
 *   treasuryId:    MAINNET_CONFIG.treasuryId,
 *   coinType:      '0x2::sui::SUI',
 *   amount:        1_000_000_000n, // 1 SUI
 *   fee:           10_000_000_000n, // 10 SUI
 *   beneficiary:   '0xrecipient...',
 *   cliffTsMs:     0n,
 *   cliffBps:      0n,
 *   linearStartMs: dateToMs('2025-01-01'),
 *   linearEndMs:   dateToMs('2026-01-01'),
 * })
 * // → sign and execute with your wallet adapter
 * ```
 */
export declare function buildCreateVaultTx(params: CreateVaultParams): Transaction;
/**
 * Builds a `Transaction` that calls `vesting::create_multi_vault<T>`.
 *
 * @throws if `sharesBps` does not sum to exactly `10000`.
 *
 * @example
 * ```ts
 * const tx = buildCreateMultiVaultTx({
 *   ...MAINNET_CONFIG,
 *   coinType:      '0x2::sui::SUI',
 *   amount:        10_000_000_000n,  // 10 SUI
 *   fee:           10_000_000_000n,
 *   beneficiaries: ['0xalice...', '0xbob...'],
 *   sharesBps:     [6000n, 4000n], // 60% / 40%
 *   cliffTsMs:     0n,
 *   cliffBps:      0n,
 *   linearStartMs: dateToMs('2025-06-01'),
 *   linearEndMs:   dateToMs('2027-06-01'),
 * })
 * ```
 */
export declare function buildCreateMultiVaultTx(params: CreateMultiVaultParams): Transaction;
/**
 * Builds a `Transaction` that calls `vesting::claim<T>` or
 * `vesting::claim_multi<T>`, depending on the vault type.
 *
 * @example
 * ```ts
 * const vault = await fetchVault(client, '0xvaultId...')
 * const tx = buildClaimTx({
 *   packageId: MAINNET_CONFIG.packageId,
 *   vaultId:   vault.id,
 *   vaultType: vault.type,
 * })
 * ```
 */
export declare function buildClaimTx(params: ClaimParams): Transaction;
//# sourceMappingURL=transactions.d.ts.map