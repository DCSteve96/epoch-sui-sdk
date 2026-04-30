import type { EpochNetworkConfig, Network } from './types'

/** Sui system clock object ID — constant across all networks */
export const CLOCK_ID =
  '0x0000000000000000000000000000000000000000000000000000000000000006'

/** Mainnet deployment */
export const MAINNET_CONFIG: EpochNetworkConfig = {
  packageId:
    '0x3d3dc872c6f62b344ab182810b6ec4b04bac1d9b1b1572867f9002a7e4d2edde',
  treasuryId:
    '0x3491507049854f0e001ac3ef24532287b6da1f314e5b8599695e187a7c7e5250',
}

/** Testnet deployment */
export const TESTNET_CONFIG: EpochNetworkConfig = {
  packageId:
    '0xad485a6f7c5a9c0758533df421e21da35da8fe1fb3f6919846703643bd4bc036',
  treasuryId:
    '0x08bb6ecbed70229bb6f68955e55714edbebea9fd2ba59a03b55a8dc2ef4bc0be',
}

/** Convenience map — index by network string */
export const NETWORK_CONFIGS: Record<Network, EpochNetworkConfig> = {
  mainnet: MAINNET_CONFIG,
  testnet: TESTNET_CONFIG,
}

/**
 * Default deploy fee (fallback if `fetchDeployFee` cannot reach the RPC).
 * Always call `fetchDeployFee()` at runtime for the actual value.
 */
export const DEFAULT_DEPLOY_FEE: Record<Network, bigint> = {
  mainnet: 10_000_000_000n, // 10 SUI
  testnet:    100_000_000n, //  0.1 SUI
}

export const MIST_PER_SUI = 1_000_000_000n
