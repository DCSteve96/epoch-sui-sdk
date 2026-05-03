import type { EpochNetworkConfig, Network } from './types'

/** Sui system clock object ID — constant across all networks */
export const CLOCK_ID =
  '0x0000000000000000000000000000000000000000000000000000000000000006'

/** Mainnet deployment */
export const MAINNET_CONFIG: EpochNetworkConfig = {
  packageId:
    '0x848cb7edf8b5f7650b3188dec459394472c8ccf206a031497bf55fe40c165da2',
  treasuryId:
    '0x31bd863db14dd552a28f85641888b7ddc3a4866c4ffde286b30eaf7ac2841553',
}

/** Testnet deployment */
export const TESTNET_CONFIG: EpochNetworkConfig = {
  packageId:
    '0xc1427dd16f3d6ee090d48b24fc2cdb3effb4d28898504e742987f4eddb61118c',
  treasuryId:
    '0xaa32f12e76f17d2a78e99c0f7531a55d55aab9750670f2d25b1e8704ce06920a',
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
