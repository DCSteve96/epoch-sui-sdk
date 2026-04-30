export type Network = 'mainnet' | 'testnet';
export interface EpochNetworkConfig {
    packageId: string;
    treasuryId: string;
}
/**
 * - `cliff`  — all tokens unlock at a single date
 * - `linear` — gradual unlock between start and end
 * - `hybrid` — cliff release first, then linear
 */
export type VestingType = 'cliff' | 'linear' | 'hybrid';
/** Sui's VecMap<address, u64> serialised by the RPC */
export interface VecMapField {
    contents: Array<{
        key: string;
        value: string;
    }>;
}
/** Raw fields as returned by the Sui RPC for a VestingVault<T> object */
export interface VaultFields {
    creator: string;
    beneficiary: string;
    /** Total tokens locked at creation, as a decimal string (base units) */
    total_locked: string;
    /** Tokens already claimed, as a decimal string */
    claimed: string;
    cliff_ts_ms: string;
    cliff_bps: string;
    linear_start_ms: string;
    linear_end_ms: string;
    created_at_ms: string;
}
/** A fully-hydrated VestingVault object */
export interface Vault {
    /** Object ID */
    id: string;
    /** Full Move type string, e.g. `0xpkg::vesting::VestingVault<0x2::sui::SUI>` */
    type: string;
    kind: 'single';
    fields: VaultFields;
}
/** Raw fields for a MultiVestingVault<T> object */
export interface MultiVaultFields {
    creator: string;
    /** Total tokens locked across all beneficiaries */
    total_locked: string;
    /** VecMap<address, u64> — share in basis points per beneficiary */
    shares: VecMapField;
    /** VecMap<address, u64> — tokens already claimed per beneficiary */
    claimed: VecMapField;
    cliff_ts_ms: string;
    cliff_bps: string;
    linear_start_ms: string;
    linear_end_ms: string;
    created_at_ms: string;
}
/** A fully-hydrated MultiVestingVault object */
export interface MultiVault {
    id: string;
    type: string;
    kind: 'multi';
    fields: MultiVaultFields;
}
/** Union type covering both vault kinds */
export type AnyVault = Vault | MultiVault;
export interface VaultCreatedEvent {
    vault_id: string;
    creator: string;
    beneficiary: string;
    total_locked: string;
    cliff_ts_ms: string;
    cliff_bps: string;
    linear_start_ms: string;
    linear_end_ms: string;
}
export interface MultiVaultCreatedEvent {
    vault_id: string;
    creator: string;
    total_locked: string;
    beneficiary_count: string;
    cliff_ts_ms: string;
    cliff_bps: string;
    linear_start_ms: string;
    linear_end_ms: string;
}
/** Emitted once per beneficiary when a multi-vault is created */
export interface MultiBeneficiaryAddedEvent {
    vault_id: string;
    beneficiary: string;
    share_bps: string;
    token_amount: string;
}
export interface TokensClaimedEvent {
    vault_id: string;
    beneficiary: string;
    amount: string;
    total_claimed: string;
}
export interface MultiTokensClaimedEvent {
    vault_id: string;
    beneficiary: string;
    amount: string;
    total_claimed_by_beneficiary: string;
}
export interface CreateVaultParams {
    /** Package ID — use `MAINNET_CONFIG.packageId` or `TESTNET_CONFIG.packageId` */
    packageId: string;
    /** Treasury object ID */
    treasuryId: string;
    /** Move coin type, e.g. `'0x2::sui::SUI'` or `'0xabc::usdc::USDC'` */
    coinType: string;
    /** Amount to lock in base units (MIST for SUI) */
    amount: bigint;
    /** Deploy fee in MIST — read from Treasury on-chain with `fetchDeployFee()` */
    fee: bigint;
    /** Beneficiary Sui address */
    beneficiary: string;
    /**
     * Cliff timestamp in milliseconds.
     * - Cliff-only: set to the unlock date.
     * - Linear-only: set to 0.
     * - Hybrid: set to the cliff date.
     */
    cliffTsMs: bigint;
    /** Cliff unlock percentage in basis points (0–10000). 0 = no cliff. */
    cliffBps: bigint;
    /** Linear vesting start timestamp in ms. Set to 0 for cliff-only. */
    linearStartMs: bigint;
    /** Linear vesting end timestamp in ms. Set to 0 for cliff-only. */
    linearEndMs: bigint;
    /**
     * Coin object ID to split tokens from.
     * - Required for non-SUI tokens (the SDK will split `amount` from it).
     * - For SUI: omit — gas will be split automatically.
     */
    coinObjectId?: string;
}
export interface CreateMultiVaultParams {
    packageId: string;
    treasuryId: string;
    coinType: string;
    amount: bigint;
    fee: bigint;
    /**
     * Beneficiary addresses. Must be the same length as `sharesBps` and in the
     * same order. Each entry is a Sui address (`0x...`).
     */
    beneficiaries: string[];
    /**
     * Each beneficiary's share in basis points. Must sum to exactly `10000`
     * (= 100%). Example: `[5000n, 3000n, 2000n]` = 50 / 30 / 20 %.
     */
    sharesBps: bigint[];
    cliffTsMs: bigint;
    cliffBps: bigint;
    linearStartMs: bigint;
    linearEndMs: bigint;
    coinObjectId?: string;
}
export interface ClaimParams {
    /** Package ID */
    packageId: string;
    /** Vault object ID */
    vaultId: string;
    /**
     * Full vault type string returned by `fetchVault()`, e.g.
     * `'0xpkg::vesting::VestingVault<0x2::sui::SUI>'`.
     * The SDK extracts the coin type and picks `claim` vs `claim_multi` automatically.
     */
    vaultType: string;
}
export interface TokenTVLStat {
    coinType: string;
    symbol: string;
    decimals: number;
    vaultCount: number;
    totalLocked: bigint;
    remaining: bigint;
    claimed: bigint;
}
export interface AnalyticsData {
    totalVaults: number;
    singleVaults: number;
    multiVaults: number;
    /** Estimated total beneficiaries (single wallets + multi-vault beneficiaries) */
    totalWallets: number;
    totalClaims: number;
    uniqueCreators: number;
    /** ISO date string of the first vault creation, or null */
    firstVaultDate: string | null;
    /** Monthly vault creation counts, sorted oldest → newest */
    monthlyBars: Array<{
        month: string;
        single: number;
        multi: number;
    }>;
    /** Monthly claim counts (aligned to `monthlyBars`) */
    claimBars: Array<{
        month: string;
        count: number;
    }>;
    /** Top 6 creators sorted by vault count */
    topCreators: Array<{
        address: string;
        count: number;
        pct: number;
    }>;
}
//# sourceMappingURL=types.d.ts.map