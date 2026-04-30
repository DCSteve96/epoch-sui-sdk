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
import * as React from 'react'
import type { SuiClientLike } from './queries'
import { fetchDeployFee } from './queries'
import { buildCreateVaultTx, buildCreateMultiVaultTx } from './transactions'
import { toBaseUnits, dateToMs } from './utils'
import { MAINNET_CONFIG, TESTNET_CONFIG } from './constants'

// ═══════════════════════════════════════════════════════════════════════════════
// PoweredByEpoch
// ═══════════════════════════════════════════════════════════════════════════════

const EPOCH_URL = 'https://epochsui.com'

const EPOCH_LOGO = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <polygon
      points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"
      stroke="#6FBCF0" strokeWidth="1.8" strokeLinejoin="round"
      fill="rgba(111,188,240,0.12)"
    />
    <line x1="12" y1="2"   x2="12" y2="22"  stroke="#6FBCF0" strokeWidth="1.2" strokeDasharray="2.5 2"/>
    <line x1="2"  y1="8.5" x2="22" y2="15.5" stroke="#6FBCF0" strokeWidth="1.2" strokeDasharray="2.5 2"/>
    <line x1="22" y1="8.5" x2="2"  y2="15.5" stroke="#6FBCF0" strokeWidth="1.2" strokeDasharray="2.5 2"/>
  </svg>
)

type BadgeSize = 'sm' | 'md' | 'lg'
const BADGE_SIZE: Record<BadgeSize, { fontSize: number; padding: string; gap: number; logo: number }> = {
  sm: { fontSize: 9,  padding: '3px 7px',  gap: 4, logo: 11 },
  md: { fontSize: 10, padding: '4px 9px',  gap: 5, logo: 13 },
  lg: { fontSize: 12, padding: '6px 12px', gap: 6, logo: 16 },
}

export interface PoweredByEpochProps {
  size?:      BadgeSize
  href?:      string
  style?:     React.CSSProperties
  className?: string
}

/**
 * Attribution badge — required for apps built on @epoch-sui/sdk.
 * Place it anywhere visible (header, footer, about page).
 */
export function PoweredByEpoch({
  size = 'md',
  href = EPOCH_URL,
  style,
  className,
}: PoweredByEpochProps) {
  const s = BADGE_SIZE[size]
  const [hovered, setHovered] = React.useState(false)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: s.gap,
        padding: s.padding, borderRadius: 999,
        border: `1px solid ${hovered ? 'rgba(111,188,240,0.5)' : 'rgba(111,188,240,0.25)'}`,
        background: hovered ? 'rgba(111,188,240,0.12)' : 'rgba(111,188,240,0.06)',
        color: '#6FBCF0', textDecoration: 'none',
        fontFamily: 'inherit', fontSize: s.fontSize, fontWeight: 600,
        letterSpacing: '.03em', whiteSpace: 'nowrap', transition: 'all .15s',
        ...style,
      }}
    >
      {React.cloneElement(EPOCH_LOGO, { width: s.logo, height: s.logo })}
      Powered by Epoch
    </a>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VestingWidget internals
// ═══════════════════════════════════════════════════════════════════════════════

type VestType = 'linear' | 'cliff' | 'hybrid'
type Mode     = 'single' | 'multi'

const DEFAULT_THEME = {
  accent:  '#6FBCF0',
  bg:      '#111117',
  card:    '#18181b',
  border:  '#27272a',
  text:    '#e4e4e7',
  muted:   '#71717a',
  green:   '#34d399',
  red:     '#f87171',
  purple:  '#a78bfa',
}

// ── SVG icons ──────────────────────────────────────────────────────────────────

function IconLinear({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <line x1="6" y1="42" x2="42" y2="6" stroke="#6FBCF0" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="6"  cy="42" r="3" fill="rgba(111,188,240,0.3)" stroke="#6FBCF0" strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="3" fill="rgba(111,188,240,0.3)" stroke="#6FBCF0" strokeWidth="1.5"/>
      <circle cx="42" cy="6"  r="3" fill="#6FBCF0"/>
    </svg>
  )
}
function IconCliff({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6"  y="30" width="8"  height="14" rx="1.5" fill="rgba(111,188,240,0.12)" stroke="#6FBCF0" strokeWidth="1.4"/>
      <rect x="20" y="20" width="8"  height="24" rx="1.5" fill="rgba(111,188,240,0.12)" stroke="#6FBCF0" strokeWidth="1.4"/>
      <rect x="34" y="6"  width="8"  height="38" rx="1.5" fill="rgba(111,188,240,0.25)" stroke="#6FBCF0" strokeWidth="1.4"/>
    </svg>
  )
}
function IconHybrid({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <polyline points="6,42 6,24 22,24" stroke="#6FBCF0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="22" y1="24" x2="42" y2="6" stroke="#6FBCF0" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2.5"/>
      <circle cx="22" cy="24" r="4" fill="rgba(111,188,240,0.2)" stroke="#6FBCF0" strokeWidth="1.5"/>
    </svg>
  )
}

const VEST_TYPES = [
  { id: 'linear' as VestType, label: 'Linear', Icon: IconLinear, desc: 'Tokens stream continuously between two dates.' },
  { id: 'cliff'  as VestType, label: 'Cliff',  Icon: IconCliff,  desc: 'All tokens unlock at once on a specific date.'  },
  { id: 'hybrid' as VestType, label: 'Hybrid', Icon: IconHybrid, desc: 'Cliff percentage first, then linear until end.' },
]

function today()    { return new Date().toISOString().slice(0, 10) }
function nextYear() { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10) }

// ═══════════════════════════════════════════════════════════════════════════════
// VestingWidget — public API
// ═══════════════════════════════════════════════════════════════════════════════

export interface VestingWidgetProps {
  /** SUI RPC client (satisfies SuiClientLike from @epoch-sui/sdk). */
  client: SuiClientLike

  /** Network to use. Defaults to `'mainnet'`. */
  network?: 'mainnet' | 'testnet'

  /** Default coin type. Defaults to `'0x2::sui::SUI'`. */
  defaultCoinType?: string

  /**
   * Connected wallet address — used as the default beneficiary and shown
   * as placeholder in the beneficiary field.
   */
  walletAddress?: string

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
  onSignAndExecute: (tx: any) => Promise<{ digest: string } | string>

  /** Called with the transaction digest on success. */
  onSuccess?: (digest: string) => void

  /** Called with the thrown error on failure. */
  onError?: (error: Error) => void

  /** Visual theme overrides. All fields are optional. */
  theme?: Partial<typeof DEFAULT_THEME>

  /** Widget container width. Defaults to `'100%'`. */
  width?: string | number
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
export function VestingWidget({
  client,
  network       = 'mainnet',
  defaultCoinType = '0x2::sui::SUI',
  walletAddress,
  onSignAndExecute,
  onSuccess,
  onError,
  theme: themeProp,
  width = '100%',
}: VestingWidgetProps) {
  const cfg = network === 'testnet' ? TESTNET_CONFIG : MAINNET_CONFIG
  const t   = { ...DEFAULT_THEME, ...themeProp }

  // ── Form state ──────────────────────────────────────────────────────────────
  const [mode,      setMode]      = React.useState<Mode>('single')
  const [vestType,  setVestType]  = React.useState<VestType>('linear')
  const [amount,    setAmount]    = React.useState('1')
  const [start,     setStart]     = React.useState(today())
  const [end,       setEnd]       = React.useState(nextYear())
  const [cliffDate, setCliffDate] = React.useState(today())
  const [cliffPct,  setCliffPct]  = React.useState('20')
  const [bene,      setBene]      = React.useState('')
  const [rows, setRows] = React.useState([
    { id: 1, address: '', pct: '50' },
    { id: 2, address: '', pct: '50' },
  ])

  // ── Transaction state ───────────────────────────────────────────────────────
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const [digest, setDigest] = React.useState('')
  const [errMsg, setErrMsg] = React.useState('')

  const totalPct = rows.reduce((s, r) => s + (Number(r.pct) || 0), 0)

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submit = async () => {
    setStatus('pending'); setErrMsg(''); setDigest('')
    try {
      const fee = await fetchDeployFee(client, cfg.treasuryId)
      const coinType = defaultCoinType

      let tx: any
      if (mode === 'single') {
        tx = buildCreateVaultTx({
          packageId:     cfg.packageId,
          treasuryId:    cfg.treasuryId,
          coinType,
          amount:        toBaseUnits(amount, 9),
          fee,
          beneficiary:   bene.trim() || walletAddress || '',
          cliffTsMs:     vestType !== 'linear' ? dateToMs(new Date(cliffDate)) : 0n,
          cliffBps:      vestType === 'hybrid'  ? BigInt(Math.round(Number(cliffPct) * 100))
                       : vestType === 'cliff'   ? 10000n
                       : 0n,
          linearStartMs: vestType !== 'cliff' ? dateToMs(new Date(start)) : 0n,
          linearEndMs:   vestType !== 'cliff' ? dateToMs(new Date(end))   : 0n,
        })
      } else {
        if (totalPct !== 100) throw new Error('Percentages must sum to 100%')
        tx = buildCreateMultiVaultTx({
          packageId:     cfg.packageId,
          treasuryId:    cfg.treasuryId,
          coinType,
          amount:        toBaseUnits(amount, 9),
          fee,
          beneficiaries: rows.map(r => r.address.trim() || walletAddress || ''),
          sharesBps:     rows.map(r => BigInt(Math.round((Number(r.pct) || 0) * 100))),
          cliffTsMs:     0n,
          cliffBps:      0n,
          linearStartMs: dateToMs(new Date(start)),
          linearEndMs:   dateToMs(new Date(end)),
        })
      }

      const result = await onSignAndExecute(tx)
      const d = typeof result === 'string' ? result : result.digest
      setDigest(d); setStatus('done'); onSuccess?.(d)
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(e?.message ?? 'Transaction failed')
      setErrMsg(err.message); setStatus('error'); onError?.(err)
    }
  }

  // ── Shared styles ───────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: '8px 10px', color: t.text, fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 600,
    color: t.muted, textTransform: 'uppercase', letterSpacing: '.06em',
  }
  const field: React.CSSProperties = { display: 'flex', flexDirection: 'column' }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ width, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{
        background: t.card, border: `1px solid ${t.border}`,
        borderRadius: 16, padding: 20,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: t.text }}>Create Vault</span>
          <div style={{ display: 'flex', gap: 4, background: t.bg, borderRadius: 10, padding: 3 }}>
            {(['single', 'multi'] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                background: mode === m ? t.card : 'transparent',
                color: mode === m ? t.text : t.muted,
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,.3)' : 'none',
                transition: 'all .15s',
              }}>
                {m === 'single' ? 'Single' : 'Multi'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Type picker ── */}
        <div style={field}>
          <label style={labelStyle}>Vesting type</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {VEST_TYPES.map(({ id, label, Icon, desc }) => {
              const active = vestType === id
              return (
                <button key={id} onClick={() => setVestType(id)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                  padding: '12px 6px 10px', borderRadius: 12, outline: 'none',
                  border: `1px solid ${active ? t.accent : t.border}`,
                  background: active ? 'rgba(111,188,240,0.07)' : t.bg,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                }}>
                  <Icon size={30} />
                  <span style={{ fontWeight: 700, fontSize: 12, color: active ? t.accent : t.muted }}>{label}</span>
                  <span style={{ fontSize: 9, color: '#52525b', lineHeight: 1.4, textAlign: 'center' }}>{desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Amount ── */}
        <div style={field}>
          <label style={labelStyle}>Amount</label>
          <input type="number" value={amount} min="0.01" step="0.01" placeholder="1.0"
            onChange={e => setAmount(e.target.value)} style={inputStyle} />
        </div>

        {/* ── Cliff inputs ── */}
        {vestType !== 'linear' && (
          <div style={grid2}>
            <div style={field}>
              <label style={labelStyle}>Cliff date</label>
              <input type="date" value={cliffDate} onChange={e => setCliffDate(e.target.value)} style={inputStyle} />
            </div>
            {vestType === 'hybrid' && (
              <div style={field}>
                <label style={labelStyle}>Cliff % unlock</label>
                <input type="number" value={cliffPct} min="1" max="99"
                  onChange={e => setCliffPct(e.target.value)} style={inputStyle} />
              </div>
            )}
          </div>
        )}

        {/* ── Linear schedule ── */}
        {vestType !== 'cliff' && (
          <div style={grid2}>
            <div style={field}>
              <label style={labelStyle}>Linear start</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} style={inputStyle} />
            </div>
            <div style={field}>
              <label style={labelStyle}>Linear end</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: t.border }} />

        {/* ── Single beneficiary ── */}
        {mode === 'single' && (
          <div style={field}>
            <label style={labelStyle}>Beneficiary address</label>
            <input type="text" value={bene} onChange={e => setBene(e.target.value)}
              placeholder={walletAddress ? `${walletAddress.slice(0, 20)}… (defaults to you)` : '0x…'}
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
          </div>
        )}

        {/* ── Multi beneficiaries ── */}
        {mode === 'multi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={labelStyle}>Beneficiaries</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: totalPct === 100 ? t.green : t.red }}>
                {totalPct}%{totalPct !== 100 ? ' — must be 100%' : ' ✓'}
              </span>
            </div>
            {rows.map((row, i) => (
              <div key={row.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: t.muted, width: 16, flexShrink: 0 }}>{i + 1}.</span>
                <input type="text" value={row.address} placeholder={`Beneficiary ${i + 1} (0x…)`}
                  onChange={e => setRows(rs => rs.map(r => r.id === row.id ? { ...r, address: e.target.value } : r))}
                  style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 11 }} />
                <input type="number" value={row.pct} min="1" max="99"
                  onChange={e => setRows(rs => rs.map(r => r.id === row.id ? { ...r, pct: e.target.value } : r))}
                  style={{ ...inputStyle, width: 56, textAlign: 'center', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: t.muted }}>%</span>
                {rows.length > 2 && (
                  <button onClick={() => setRows(rs => rs.filter(r => r.id !== row.id))}
                    style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setRows(rs => [...rs, { id: Date.now(), address: '', pct: '' }])}
              style={{
                alignSelf: 'flex-start', background: 'none', border: `1px solid ${t.border}`,
                borderRadius: 8, color: t.muted, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, padding: '5px 10px',
              }}>
              + Add beneficiary
            </button>
          </div>
        )}

        {/* ── Submit ── */}
        <button onClick={submit}
          disabled={status === 'pending' || (mode === 'multi' && totalPct !== 100)}
          style={{
            width: '100%', padding: '11px 16px', borderRadius: 10, border: 'none',
            background: status === 'pending' ? t.border
              : mode === 'multi' ? t.purple : t.accent,
            color: status === 'pending' ? t.muted : '#0a0a0f',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
            cursor: status === 'pending' || (mode === 'multi' && totalPct !== 100)
              ? 'not-allowed' : 'pointer',
            opacity: (mode === 'multi' && totalPct !== 100) ? 0.5 : 1,
            transition: 'all .15s',
          }}>
          {status === 'pending' ? 'Waiting for wallet…' : `Create ${mode === 'multi' ? 'multi-' : ''}vault`}
        </button>

        {/* ── Error ── */}
        {status === 'error' && (
          <p style={{ margin: 0, fontSize: 12, color: t.red }}>Error: {errMsg}</p>
        )}

        {/* ── Success ── */}
        {status === 'done' && (
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.2)',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: t.green }}>Vault created!</p>
            <a href={`https://suiscan.xyz/${network}/tx/${digest}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'monospace', fontSize: 11, color: t.green, textDecoration: 'none' }}>
              {digest.slice(0, 28)}… ↗
            </a>
          </div>
        )}

        {/* ── Epoch signature — always shown ── */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
          <PoweredByEpoch size="sm" />
        </div>
      </div>
    </div>
  )
}
