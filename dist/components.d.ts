/**
 * React components exported by @epoch-sui/sdk.
 *
 * Two exports:
 *  - `PoweredByEpoch` — attribution badge, links to epochsui.com
 *  - `VestingWidget`  — drop-in vault-creation widget
 *
 * Import path: `@epoch-sui/sdk/components`
 *
 * @example
 * ```tsx
 * import { VestingWidget, PoweredByEpoch } from '@epoch-sui/sdk/components'
 *
 * <VestingWidget
 *   client={suiClient}
 *   network="mainnet"
 *   walletAddress={connectedAddress}
 *   onSignAndExecute={async (tx) => signAndExecuteTransaction({ transaction: tx })}
 *   onSuccess={(digest) => console.log('done', digest)}
 * />
 * ```
 */
import * as React from 'react';
import type { SuiClientLike } from './queries';
type BadgeSize = 'sm' | 'md' | 'lg';
export interface PoweredByEpochProps {
    size?: BadgeSize;
    href?: string;
    style?: React.CSSProperties;
    className?: string;
}
/**
 * Attribution badge — required for apps built on @epoch-sui/sdk.
 * Place it anywhere visible (header, footer, about page).
 */
export declare function PoweredByEpoch({ size, href, style, className, }: PoweredByEpochProps): import("react/jsx-runtime").JSX.Element;
declare const DEFAULT_THEME: {
    accent: string;
    bg: string;
    card: string;
    border: string;
    text: string;
    muted: string;
    green: string;
    red: string;
    purple: string;
};
export interface VestingWidgetProps {
    /** SUI RPC client (satisfies SuiClientLike from @epoch-sui/sdk). */
    client: SuiClientLike;
    /** Network to use. Defaults to `'mainnet'`. */
    network?: 'mainnet' | 'testnet';
    /** Default coin type. Defaults to `'0x2::sui::SUI'`. */
    defaultCoinType?: string;
    /**
     * Connected wallet address — used as the default beneficiary and shown
     * as placeholder in the beneficiary field.
     */
    walletAddress?: string;
    /**
     * Sign and execute a transaction built by the widget.
     * Return `{ digest: string }` or just the digest string.
     *
     * @example with dapp-kit
     * ```ts
     * onSignAndExecute={async (tx) =>
     *   signAndExecuteTransaction({ transaction: tx })
     * }
     * ```
     */
    onSignAndExecute: (tx: any) => Promise<{
        digest: string;
    } | string>;
    /** Called with the transaction digest on success. */
    onSuccess?: (digest: string) => void;
    /** Called with the thrown error on failure. */
    onError?: (error: Error) => void;
    /** Visual theme overrides. All fields are optional. */
    theme?: Partial<typeof DEFAULT_THEME>;
    /** Widget container width. Defaults to `'100%'`. */
    width?: string | number;
}
/**
 * Drop-in vault-creation widget.
 *
 * Handles the full UI: vesting type picker, schedule inputs,
 * beneficiary management (single & multi), transaction building,
 * and success/error feedback.
 *
 * The host app is only responsible for wallet signing via `onSignAndExecute`.
 */
export declare function VestingWidget({ client, network, defaultCoinType, walletAddress, onSignAndExecute, onSuccess, onError, theme: themeProp, width, }: VestingWidgetProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=components.d.ts.map