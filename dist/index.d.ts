/**
 * @epoch-sui/sdk
 *
 * TypeScript SDK for integrating the Epoch vesting protocol on Sui.
 *
 * @example
 * ```ts
 * import {
 *   SuiClient,
 *   getFullnodeUrl,
 * } from '@mysten/sui/client'
 * import {
 *   MAINNET_CONFIG,
 *   fetchDeployFee,
 *   buildCreateVaultTx,
 *   fetchVault,
 *   fetchAnalytics,
 *   dateToMs,
 * } from '@epoch-sui/sdk'
 *
 * const client = new SuiClient({ url: getFullnodeUrl('mainnet') })
 *
 * // 1. Read the current deploy fee
 * const fee = await fetchDeployFee(client, MAINNET_CONFIG.treasuryId)
 *
 * // 2. Build a create-vault transaction
 * const tx = buildCreateVaultTx({
 *   ...MAINNET_CONFIG,
 *   coinType:      '0x2::sui::SUI',
 *   amount:        1_000_000_000n,   // 1 SUI
 *   fee,
 *   beneficiary:   '0xrecipient...',
 *   cliffTsMs:     0n,
 *   cliffBps:      0n,
 *   linearStartMs: dateToMs('2025-01-01'),
 *   linearEndMs:   dateToMs('2026-01-01'),
 * })
 * // → sign & execute with your wallet adapter (e.g. @mysten/dapp-kit)
 *
 * // 3. Read back the vault
 * const vault = await fetchVault(client, '0xvaultId...')
 *
 * // 4. Protocol analytics
 * const stats = await fetchAnalytics(client, MAINNET_CONFIG.packageId)
 * console.log(stats.totalVaults)
 * ```
 */
export type { Network, EpochNetworkConfig, VestingType, VecMapField, VaultFields, Vault, MultiVaultFields, MultiVault, AnyVault, VaultCreatedEvent, MultiVaultCreatedEvent, MultiBeneficiaryAddedEvent, TokensClaimedEvent, MultiTokensClaimedEvent, CreateVaultParams, CreateMultiVaultParams, ClaimParams, TokenTVLStat, AnalyticsData, } from './types';
export { CLOCK_ID, MAINNET_CONFIG, TESTNET_CONFIG, NETWORK_CONFIGS, DEFAULT_DEPLOY_FEE, MIST_PER_SUI, } from './constants';
export { extractCoinType, isMultiVaultType, parseVecMap, claimableNow, claimableForUser, formatAmount, toBaseUnits, dateToMs, } from './utils';
export { buildCreateVaultTx, buildCreateMultiVaultTx, buildClaimTx, } from './transactions';
export type { SuiClientLike } from './queries';
export { fetchAllEvents, fetchVault, fetchVaultsByBeneficiary, fetchVaultsByCreator, fetchDeployFee, fetchTokenTVL, fetchAnalytics, } from './queries';
//# sourceMappingURL=index.d.ts.map