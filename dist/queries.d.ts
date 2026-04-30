/**
 * Minimal duck-typed interface — any SuiClient (v1.0, v1.21, dapp-kit)
 * satisfies this as long as it exposes the four RPC methods we use.
 * This avoids version-mismatch TS errors when integrators use a different
 * version of @mysten/sui than the SDK's devDependency.
 */
export interface SuiClientLike {
    queryEvents(params: {
        query: any;
        cursor?: any;
        limit?: number;
    }): Promise<{
        data: any[];
        hasNextPage: boolean;
        nextCursor?: any;
    }>;
    getObject(params: {
        id: string;
        options?: any;
    }): Promise<any>;
    multiGetObjects(params: {
        ids: string[];
        options?: any;
    }): Promise<any[]>;
    getCoinMetadata(params: {
        coinType: string;
    }): Promise<any>;
}
import type { AnyVault, TokenTVLStat, AnalyticsData } from './types';
/**
 * Fetches **all** events of a given Move event type, following pagination
 * automatically. SUI's RPC is capped at 50 events per call.
 *
 * @param maxPages - Safety cap (default 40 = 2 000 events). Increase for very
 *   active protocols.
 */
export declare function fetchAllEvents(client: SuiClientLike, eventType: string, maxPages?: number): Promise<any[]>;
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
export declare function fetchVault(client: SuiClientLike, vaultId: string): Promise<AnyVault | null>;
/**
 * Fetches all vaults (single + multi) where `address` is a beneficiary.
 *
 * Uses on-chain events — works without an indexer.
 */
export declare function fetchVaultsByBeneficiary(client: SuiClientLike, address: string, packageId: string): Promise<AnyVault[]>;
/**
 * Fetches all vaults created by `address`.
 */
export declare function fetchVaultsByCreator(client: SuiClientLike, address: string, packageId: string): Promise<AnyVault[]>;
/**
 * Reads the current deploy fee from the Treasury object on-chain.
 *
 * Always call this before building a create-vault transaction to get the
 * exact fee — do not hard-code it.
 */
export declare function fetchDeployFee(client: SuiClientLike, treasuryId: string): Promise<bigint>;
/**
 * Fetches per-token TVL statistics: total locked, remaining, and claimed
 * amounts for every coin type present in active vaults.
 *
 * This is an expensive read — it fetches all vault objects and calls
 * `getCoinMetadata` for each unique coin type. Cache the result.
 */
export declare function fetchTokenTVL(client: SuiClientLike, packageId: string): Promise<TokenTVLStat[]>;
/**
 * Computes protocol-wide analytics from on-chain events.
 *
 * @example
 * ```ts
 * const analytics = await fetchAnalytics(client, MAINNET_CONFIG.packageId)
 * console.log(`${analytics.totalVaults} vaults created`)
 * ```
 */
export declare function fetchAnalytics(client: SuiClientLike, packageId: string): Promise<AnalyticsData>;
//# sourceMappingURL=queries.d.ts.map