# @epoch-sui/sdk

TypeScript SDK for integrating the [Epoch](https://epochsui.com) vesting protocol on Sui.

Two layers, one package:

| Layer | Import | What it does |
|---|---|---|
| **Core SDK** | `@epoch-sui/sdk` | Transaction builders, on-chain queries, utils — no UI, no React |
| **Embed Widget** | `@epoch-sui/sdk/components` | Drop-in React component — full vesting UI, you only wire up wallet signing |

---

## Installation

```bash
npm install @epoch-sui/sdk @mysten/sui
```

React peer dependency is only required for the Embed Widget:

```bash
npm install @epoch-sui/sdk @mysten/sui react react-dom
```

---

## Core SDK

### Quick start

```ts
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import {
  MAINNET_CONFIG,
  fetchDeployFee,
  buildCreateVaultTx,
  fetchVault,
  dateToMs,
} from '@epoch-sui/sdk'

const client = new SuiClient({ url: getFullnodeUrl('mainnet') })

// 1. Read the current deploy fee
const fee = await fetchDeployFee(client, MAINNET_CONFIG.treasuryId)

// 2. Build a create-vault transaction
const tx = buildCreateVaultTx({
  ...MAINNET_CONFIG,
  coinType:      '0x2::sui::SUI',
  amount:        1_000_000_000n,       // 1 SUI in MIST
  fee,
  beneficiary:   '0xrecipient...',
  cliffTsMs:     0n,
  cliffBps:      0n,
  linearStartMs: dateToMs('2025-01-01'),
  linearEndMs:   dateToMs('2026-01-01'),
})

// 3. Sign & execute with your wallet adapter
await wallet.signAndExecuteTransaction({ transaction: tx })

// 4. Read back the vault
const vault = await fetchVault(client, '0xvaultId...')
```

### Network configs

```ts
import { MAINNET_CONFIG, TESTNET_CONFIG, NETWORK_CONFIGS } from '@epoch-sui/sdk'

// Direct
const { packageId, treasuryId } = MAINNET_CONFIG

// Or by string
const config = NETWORK_CONFIGS['testnet']
```

| Constant | Network | packageId |
|---|---|---|
| `MAINNET_CONFIG` | mainnet | `0x3d3dc8…` |
| `TESTNET_CONFIG` | testnet | `0xad485a…` |

### Transaction builders

#### `buildCreateVaultTx(params)` — single beneficiary

```ts
import { buildCreateVaultTx, MAINNET_CONFIG, dateToMs } from '@epoch-sui/sdk'

const tx = buildCreateVaultTx({
  ...MAINNET_CONFIG,
  coinType:      '0x2::sui::SUI',
  amount:        5_000_000_000n,   // 5 SUI
  fee,                             // from fetchDeployFee()
  beneficiary:   '0xabc...',
  cliffTsMs:     dateToMs('2025-06-01'),
  cliffBps:      3000n,            // 30% unlocks at cliff
  linearStartMs: dateToMs('2025-06-01'),
  linearEndMs:   dateToMs('2028-06-01'),
})
```

| Param | Type | Description |
|---|---|---|
| `packageId` | `string` | Epoch package ID for the network |
| `treasuryId` | `string` | Epoch treasury object ID |
| `coinType` | `string` | Fully-qualified Move coin type |
| `amount` | `bigint` | Amount in base units (MIST for SUI) |
| `fee` | `bigint` | Deploy fee from `fetchDeployFee()` |
| `beneficiary` | `string` | Recipient wallet address |
| `cliffTsMs` | `bigint` | Cliff timestamp in milliseconds |
| `cliffBps` | `bigint` | Cliff unlock percentage in basis points (3000 = 30%) |
| `linearStartMs` | `bigint` | Start of linear vesting in milliseconds |
| `linearEndMs` | `bigint` | End of linear vesting in milliseconds |

#### `buildCreateMultiVaultTx(params)` — multiple beneficiaries

```ts
import { buildCreateMultiVaultTx } from '@epoch-sui/sdk'

const tx = buildCreateMultiVaultTx({
  ...MAINNET_CONFIG,
  coinType:      '0x2::sui::SUI',
  totalAmount:   10_000_000_000n,
  fee,
  beneficiaries: [
    { address: '0xabc...', bps: 6000 },  // 60%
    { address: '0xdef...', bps: 4000 },  // 40%
  ],
  cliffTsMs:     0n,
  cliffBps:      0n,
  linearStartMs: dateToMs('2025-01-01'),
  linearEndMs:   dateToMs('2027-01-01'),
})
```

#### `buildClaimTx(params)` — claim vested tokens

```ts
import { buildClaimTx } from '@epoch-sui/sdk'

const tx = buildClaimTx({
  ...MAINNET_CONFIG,
  vaultId:   '0xvault...',
  coinType:  '0x2::sui::SUI',
  isMulti:   false,
})
```

### Query functions

```ts
import {
  fetchDeployFee,
  fetchVault,
  fetchVaultsByBeneficiary,
  fetchVaultsByCreator,
  fetchTokenTVL,
  fetchAnalytics,
} from '@epoch-sui/sdk'

// Current deploy fee in MIST
const fee = await fetchDeployFee(client, MAINNET_CONFIG.treasuryId)

// Single vault by object ID
const vault = await fetchVault(client, '0xvaultId...')

// All vaults where address is beneficiary
const received = await fetchVaultsByBeneficiary(client, MAINNET_CONFIG.packageId, '0xaddr...')

// All vaults created by address
const created = await fetchVaultsByCreator(client, MAINNET_CONFIG.packageId, '0xaddr...')

// TVL breakdown by token
const tvl = await fetchTokenTVL(client, MAINNET_CONFIG.packageId)

// Protocol-wide analytics
const stats = await fetchAnalytics(client, MAINNET_CONFIG.packageId)
console.log(stats.totalVaults, stats.totalClaims)
```

### Utility functions

```ts
import { claimableNow, formatAmount, toBaseUnits, dateToMs } from '@epoch-sui/sdk'

// How many tokens can be claimed right now
const available = claimableNow(vault)

// Format raw bigint for display (e.g. 1000000000n → "1.00")
const display = formatAmount(1_000_000_000n, 9)

// Convert decimal string to base units
const mist = toBaseUnits('5.5', 9)   // → 5_500_000_000n

// Date string → millisecond timestamp as bigint
const ts = dateToMs('2025-06-01')
```

---

## Embed Widget

Drop the full vesting UI into any React app — wallet signing is the only thing you wire up.

```tsx
import { VestingWidget } from '@epoch-sui/sdk/components'
import {
  useSuiClient,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from '@mysten/dapp-kit'

function MyPage() {
  const client          = useSuiClient()
  const account         = useCurrentAccount()
  const { mutateAsync } = useSignAndExecuteTransaction()

  return (
    <VestingWidget
      client={client}
      network="mainnet"
      walletAddress={account?.address}
      onSignAndExecute={(tx) => mutateAsync({ transaction: tx })}
      onSuccess={(digest) => console.log('✓', digest)}
    />
  )
}
```

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `client` | `SuiClientLike` | ✓ | Sui RPC client |
| `network` | `"mainnet" \| "testnet"` | ✓ | Selects on-chain addresses automatically |
| `walletAddress` | `string \| undefined` | — | Connected wallet address |
| `onSignAndExecute` | `(tx: Transaction) => Promise<any>` | ✓ | Wallet signing callback |
| `onSuccess` | `(digest: string) => void` | — | Called after successful transaction |
| `onError` | `(error: unknown) => void` | — | Called on transaction failure |
| `defaultCoinType` | `string` | — | Pre-selects a coin type in the form |
| `theme` | `WidgetTheme` | — | Custom colour scheme (see below) |
| `width` | `string \| number` | — | Widget width (default `"100%"`) |

### Custom theme

```tsx
<VestingWidget
  client={client}
  network="mainnet"
  walletAddress={account?.address}
  onSignAndExecute={signFn}
  theme={{
    accent: '#a78bfa',   // purple
    bg:     '#0d0d14',
    card:   '#13131e',
    border: '#2a2a3a',
    text:   '#f0f0ff',
    muted:  '#6060a0',
  }}
/>
```

| Key | Default | Description |
|---|---|---|
| `accent` | `#4f9eff` | Primary colour — buttons, active states, progress |
| `bg` | `#0a0a0f` | Widget background |
| `card` | `#18181b` | Card / inner panel background |
| `border` | `#27272a` | Border colour |
| `text` | `#e4e4e7` | Primary text |
| `muted` | `#71717a` | Secondary / placeholder text |

### `PoweredByEpoch` badge

If you build a custom UI instead of using the widget, include the attribution badge:

```tsx
import { PoweredByEpoch } from '@epoch-sui/sdk/components'

<PoweredByEpoch size="sm" />   // sm | md | lg
```

---

## TypeScript types

```ts
import type {
  AnyVault,
  Vault,
  MultiVault,
  EpochNetworkConfig,
  Network,
  AnalyticsData,
  TokenTVLStat,
  SuiClientLike,
} from '@epoch-sui/sdk'
```

`SuiClientLike` is a minimal structural interface — the SDK never imports `@mysten/sui` directly, so it works with any version of the Sui client your app already has.

---

## Links

- **App** — [epochsui.com](https://epochsui.com)
- **Docs** — [epochsui.com/docs](https://epochsui.com/docs)
- **Developer docs** — [epochsui.com/docs#sdk](https://epochsui.com/docs#sdk)
- **X** — [@epochsui](https://x.com/epochsui)
- **License** — MIT
