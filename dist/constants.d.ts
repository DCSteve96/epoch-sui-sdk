import type { EpochNetworkConfig, Network } from './types';
/** Sui system clock object ID — constant across all networks */
export declare const CLOCK_ID = "0x0000000000000000000000000000000000000000000000000000000000000006";
/** Mainnet deployment */
export declare const MAINNET_CONFIG: EpochNetworkConfig;
/** Testnet deployment */
export declare const TESTNET_CONFIG: EpochNetworkConfig;
/** Convenience map — index by network string */
export declare const NETWORK_CONFIGS: Record<Network, EpochNetworkConfig>;
/**
 * Default deploy fee (fallback if `fetchDeployFee` cannot reach the RPC).
 * Always call `fetchDeployFee()` at runtime for the actual value.
 */
export declare const DEFAULT_DEPLOY_FEE: Record<Network, bigint>;
export declare const MIST_PER_SUI = 1000000000n;
//# sourceMappingURL=constants.d.ts.map