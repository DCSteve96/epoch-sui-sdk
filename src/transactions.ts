import { Transaction } from '@mysten/sui/transactions'
import { CLOCK_ID } from './constants'
import { extractCoinType, isMultiVaultType } from './utils'
import type { CreateVaultParams, CreateMultiVaultParams, ClaimParams } from './types'

// ─── Create single-beneficiary vault ─────────────────────────────────────────

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
export function buildCreateVaultTx(params: CreateVaultParams): Transaction {
  const {
    packageId, treasuryId, coinType,
    amount, fee, beneficiary,
    cliffTsMs, cliffBps, linearStartMs, linearEndMs,
    coinObjectId,
  } = params

  const tx = new Transaction()

  // Split the deploy fee from gas
  const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(fee)])

  // Split the token amount
  let tokenCoin: ReturnType<typeof tx.splitCoins>[0]
  if (coinType === '0x2::sui::SUI') {
    ;[tokenCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)])
  } else {
    if (!coinObjectId) {
      throw new Error(
        '[epoch-sdk] coinObjectId is required for non-SUI tokens. ' +
        'Pass the object ID of the coin you want to lock.',
      )
    }
    ;[tokenCoin] = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(amount)])
  }

  tx.moveCall({
    target: `${packageId}::vesting::create_vault`,
    typeArguments: [coinType],
    arguments: [
      tx.object(treasuryId),
      feeCoin,
      tokenCoin,
      tx.pure.address(beneficiary),
      tx.pure.u64(cliffTsMs),
      tx.pure.u64(cliffBps),
      tx.pure.u64(linearStartMs),
      tx.pure.u64(linearEndMs),
      tx.object(CLOCK_ID),
    ],
  })

  return tx
}

// ─── Create multi-beneficiary vault ──────────────────────────────────────────

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
export function buildCreateMultiVaultTx(params: CreateMultiVaultParams): Transaction {
  const {
    packageId, treasuryId, coinType,
    amount, fee, beneficiaries, sharesBps,
    cliffTsMs, cliffBps, linearStartMs, linearEndMs,
    coinObjectId,
  } = params

  if (beneficiaries.length !== sharesBps.length) {
    throw new Error(
      `[epoch-sdk] beneficiaries.length (${beneficiaries.length}) must equal sharesBps.length (${sharesBps.length})`,
    )
  }

  const sumBps = sharesBps.reduce((a, b) => a + b, 0n)
  if (sumBps !== 10000n) {
    throw new Error(
      `[epoch-sdk] sharesBps must sum to 10000 (= 100%), got ${sumBps}`,
    )
  }

  const tx = new Transaction()

  const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(fee)])

  let tokenCoin: ReturnType<typeof tx.splitCoins>[0]
  if (coinType === '0x2::sui::SUI') {
    ;[tokenCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)])
  } else {
    if (!coinObjectId) {
      throw new Error(
        '[epoch-sdk] coinObjectId is required for non-SUI tokens.',
      )
    }
    ;[tokenCoin] = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(amount)])
  }

  tx.moveCall({
    target: `${packageId}::vesting::create_multi_vault`,
    typeArguments: [coinType],
    arguments: [
      tx.object(treasuryId),
      feeCoin,
      tokenCoin,
      tx.pure.vector('address', beneficiaries),
      tx.pure.vector('u64', sharesBps),
      tx.pure.u64(cliffTsMs),
      tx.pure.u64(cliffBps),
      tx.pure.u64(linearStartMs),
      tx.pure.u64(linearEndMs),
      tx.object(CLOCK_ID),
    ],
  })

  return tx
}

// ─── Claim ────────────────────────────────────────────────────────────────────

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
export function buildClaimTx(params: ClaimParams): Transaction {
  const { packageId, vaultId, vaultType } = params

  const coinType = extractCoinType(vaultType)
  if (!coinType) {
    throw new Error(
      `[epoch-sdk] Cannot extract coin type from vault type: "${vaultType}"`,
    )
  }

  const fn = isMultiVaultType(vaultType) ? 'claim_multi' : 'claim'
  const tx = new Transaction()

  tx.moveCall({
    target: `${packageId}::vesting::${fn}`,
    typeArguments: [coinType],
    arguments: [tx.object(vaultId), tx.object(CLOCK_ID)],
  })

  return tx
}
