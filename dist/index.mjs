// src/constants.ts
var CLOCK_ID = "0x0000000000000000000000000000000000000000000000000000000000000006";
var MAINNET_CONFIG = {
  packageId: "0x3d3dc872c6f62b344ab182810b6ec4b04bac1d9b1b1572867f9002a7e4d2edde",
  treasuryId: "0x3491507049854f0e001ac3ef24532287b6da1f314e5b8599695e187a7c7e5250"
};
var TESTNET_CONFIG = {
  packageId: "0xad485a6f7c5a9c0758533df421e21da35da8fe1fb3f6919846703643bd4bc036",
  treasuryId: "0x08bb6ecbed70229bb6f68955e55714edbebea9fd2ba59a03b55a8dc2ef4bc0be"
};
var NETWORK_CONFIGS = {
  mainnet: MAINNET_CONFIG,
  testnet: TESTNET_CONFIG
};
var DEFAULT_DEPLOY_FEE = {
  mainnet: 10000000000n,
  // 10 SUI
  testnet: 100000000n
  //  0.1 SUI
};
var MIST_PER_SUI = 1000000000n;

// src/utils.ts
function extractCoinType(vaultType) {
  const m = vaultType.match(/<(.+)>$/);
  return m ? m[1] : null;
}
function isMultiVaultType(vaultType) {
  return vaultType.includes("MultiVestingVault");
}
function parseVecMap(vm) {
  const out = {};
  for (const { key, value } of vm.contents) {
    out[key] = BigInt(value);
  }
  return out;
}
function claimableNow(fields, nowMs) {
  const now = BigInt(nowMs ?? Date.now());
  const total = BigInt(fields.total_locked);
  const claimed = BigInt(fields.claimed);
  const cliffTs = BigInt(fields.cliff_ts_ms);
  const cliffBps = BigInt(fields.cliff_bps);
  const linStart = BigInt(fields.linear_start_ms);
  const linEnd = BigInt(fields.linear_end_ms);
  let vested = 0n;
  if (cliffTs > 0n && now >= cliffTs) {
    vested += total * cliffBps / 10000n;
  }
  const linearTotal = total - total * cliffBps / 10000n;
  if (linEnd > linStart && now >= linStart) {
    if (now >= linEnd) {
      vested += linearTotal;
    } else {
      vested += linearTotal * (now - linStart) / (linEnd - linStart);
    }
  }
  if (vested > total) vested = total;
  return vested > claimed ? vested - claimed : 0n;
}
function claimableForUser(fields, userAddress, nowMs) {
  const now = BigInt(nowMs ?? Date.now());
  const total = BigInt(fields.total_locked);
  const shares = parseVecMap(fields.shares);
  const claimed = parseVecMap(fields.claimed);
  const cliffTs = BigInt(fields.cliff_ts_ms);
  const cliffBps = BigInt(fields.cliff_bps);
  const linStart = BigInt(fields.linear_start_ms);
  const linEnd = BigInt(fields.linear_end_ms);
  const shareBps = shares[userAddress] ?? 0n;
  const userTotal = total * shareBps / 10000n;
  const userClaimed = claimed[userAddress] ?? 0n;
  const cliffComp = userTotal * cliffBps / 10000n;
  const linearComp = userTotal - cliffComp;
  let vested = 0n;
  if (cliffTs > 0n && now >= cliffTs) vested += cliffComp;
  if (linEnd > linStart && now >= linStart) {
    if (now >= linEnd) {
      vested += linearComp;
    } else {
      vested += linearComp * (now - linStart) / (linEnd - linStart);
    }
  }
  if (vested > userTotal) vested = userTotal;
  return vested > userClaimed ? vested - userClaimed : 0n;
}
function formatAmount(raw, decimals) {
  const n = Number(raw) / 10 ** decimals;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n % 1 === 0 ? `${n}` : n.toFixed(2);
}
function toBaseUnits(amount, decimals) {
  if (!amount) return 0n;
  const normalized = amount.trim().replace(",", ".");
  if (isNaN(Number(normalized))) return 0n;
  const [intPart, fracPart = ""] = normalized.split(".");
  const frac = fracPart.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(intPart || "0") * BigInt(10 ** decimals) + BigInt(frac || "0");
}
function dateToMs(date) {
  const ts = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  return BigInt(ts);
}

// src/transactions.ts
import { Transaction } from "@mysten/sui/transactions";
function buildCreateVaultTx(params) {
  const {
    packageId,
    treasuryId,
    coinType,
    amount,
    fee,
    beneficiary,
    cliffTsMs,
    cliffBps,
    linearStartMs,
    linearEndMs,
    coinObjectId
  } = params;
  const tx = new Transaction();
  const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(fee)]);
  let tokenCoin;
  if (coinType === "0x2::sui::SUI") {
    ;
    [tokenCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
  } else {
    if (!coinObjectId) {
      throw new Error(
        "[epoch-sdk] coinObjectId is required for non-SUI tokens. Pass the object ID of the coin you want to lock."
      );
    }
    ;
    [tokenCoin] = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(amount)]);
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
      tx.object(CLOCK_ID)
    ]
  });
  return tx;
}
function buildCreateMultiVaultTx(params) {
  const {
    packageId,
    treasuryId,
    coinType,
    amount,
    fee,
    beneficiaries,
    sharesBps,
    cliffTsMs,
    cliffBps,
    linearStartMs,
    linearEndMs,
    coinObjectId
  } = params;
  if (beneficiaries.length !== sharesBps.length) {
    throw new Error(
      `[epoch-sdk] beneficiaries.length (${beneficiaries.length}) must equal sharesBps.length (${sharesBps.length})`
    );
  }
  const sumBps = sharesBps.reduce((a, b) => a + b, 0n);
  if (sumBps !== 10000n) {
    throw new Error(
      `[epoch-sdk] sharesBps must sum to 10000 (= 100%), got ${sumBps}`
    );
  }
  const tx = new Transaction();
  const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(fee)]);
  let tokenCoin;
  if (coinType === "0x2::sui::SUI") {
    ;
    [tokenCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
  } else {
    if (!coinObjectId) {
      throw new Error(
        "[epoch-sdk] coinObjectId is required for non-SUI tokens."
      );
    }
    ;
    [tokenCoin] = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(amount)]);
  }
  tx.moveCall({
    target: `${packageId}::vesting::create_multi_vault`,
    typeArguments: [coinType],
    arguments: [
      tx.object(treasuryId),
      feeCoin,
      tokenCoin,
      tx.pure.vector("address", beneficiaries),
      tx.pure.vector("u64", sharesBps),
      tx.pure.u64(cliffTsMs),
      tx.pure.u64(cliffBps),
      tx.pure.u64(linearStartMs),
      tx.pure.u64(linearEndMs),
      tx.object(CLOCK_ID)
    ]
  });
  return tx;
}
function buildClaimTx(params) {
  const { packageId, vaultId, vaultType } = params;
  const coinType = extractCoinType(vaultType);
  if (!coinType) {
    throw new Error(
      `[epoch-sdk] Cannot extract coin type from vault type: "${vaultType}"`
    );
  }
  const fn = isMultiVaultType(vaultType) ? "claim_multi" : "claim";
  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::vesting::${fn}`,
    typeArguments: [coinType],
    arguments: [tx.object(vaultId), tx.object(CLOCK_ID)]
  });
  return tx;
}

// src/queries.ts
async function fetchAllEvents(client, eventType, maxPages = 40) {
  const all = [];
  let cursor = void 0;
  for (let i = 0; i < maxPages; i++) {
    let res;
    try {
      res = await client.queryEvents({
        query: { MoveEventType: eventType },
        cursor,
        limit: 50
      });
    } catch {
      break;
    }
    all.push(...res?.data ?? []);
    if (!res?.hasNextPage || !res?.nextCursor) break;
    cursor = res.nextCursor;
  }
  return all;
}
async function batchGetObjects(client, ids) {
  const CHUNK = 50;
  const results = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const res = await client.multiGetObjects({
      ids: chunk,
      options: { showContent: true, showType: true }
    });
    results.push(...res);
  }
  return results;
}
function toVault(obj) {
  if (!obj?.data?.content?.fields) return null;
  return {
    id: obj.data.objectId,
    type: obj.data.type ?? "",
    kind: "single",
    fields: obj.data.content.fields
  };
}
function toMultiVault(obj) {
  if (!obj?.data?.content?.fields) return null;
  const raw = obj.data.content.fields;
  const normaliseVecMap = (vm) => {
    if (vm?.fields?.contents) return { contents: vm.fields.contents };
    if (vm?.contents) return { contents: vm.contents };
    return { contents: [] };
  };
  return {
    id: obj.data.objectId,
    type: obj.data.type ?? "",
    kind: "multi",
    fields: {
      ...raw,
      shares: normaliseVecMap(raw.shares),
      claimed: normaliseVecMap(raw.claimed)
    }
  };
}
function deserialiseVault(obj) {
  const type = obj?.data?.type ?? "";
  if (type.includes("MultiVestingVault")) return toMultiVault(obj);
  if (type.includes("VestingVault")) return toVault(obj);
  return null;
}
async function fetchVault(client, vaultId) {
  const obj = await client.getObject({
    id: vaultId,
    options: { showContent: true, showType: true }
  });
  return deserialiseVault(obj);
}
async function fetchVaultsByBeneficiary(client, address, packageId) {
  const [singleEvts, multiAddedEvts] = await Promise.all([
    fetchAllEvents(client, `${packageId}::vesting::VaultCreated`),
    fetchAllEvents(client, `${packageId}::vesting::MultiBeneficiaryAdded`)
  ]);
  const singleIds = singleEvts.filter((e) => e.parsedJson?.beneficiary === address).map((e) => e.parsedJson.vault_id).filter(Boolean);
  const multiIds = [
    ...new Set(
      multiAddedEvts.filter((e) => e.parsedJson?.beneficiary === address).map((e) => e.parsedJson.vault_id).filter(Boolean)
    )
  ];
  const allIds = [.../* @__PURE__ */ new Set([...singleIds, ...multiIds])];
  if (allIds.length === 0) return [];
  const objects = await batchGetObjects(client, allIds);
  return objects.map(deserialiseVault).filter((v) => v !== null);
}
async function fetchVaultsByCreator(client, address, packageId) {
  const [singleEvts, multiEvts] = await Promise.all([
    fetchAllEvents(client, `${packageId}::vesting::VaultCreated`),
    fetchAllEvents(client, `${packageId}::vesting::MultiVaultCreated`)
  ]);
  const singleIds = singleEvts.filter((e) => e.parsedJson?.creator === address).map((e) => e.parsedJson.vault_id).filter(Boolean);
  const multiIds = multiEvts.filter((e) => e.parsedJson?.creator === address).map((e) => e.parsedJson.vault_id).filter(Boolean);
  const allIds = [.../* @__PURE__ */ new Set([...singleIds, ...multiIds])];
  if (allIds.length === 0) return [];
  const objects = await batchGetObjects(client, allIds);
  return objects.map(deserialiseVault).filter((v) => v !== null);
}
async function fetchDeployFee(client, treasuryId) {
  const obj = await client.getObject({ id: treasuryId, options: { showContent: true } });
  const fields = obj.data?.content?.fields ?? {};
  if (fields.deploy_fee) return BigInt(fields.deploy_fee);
  throw new Error("[epoch-sdk] Could not read deploy_fee from Treasury object");
}
async function fetchTokenTVL(client, packageId) {
  const [singleEvts, multiEvts] = await Promise.all([
    fetchAllEvents(client, `${packageId}::vesting::VaultCreated`),
    fetchAllEvents(client, `${packageId}::vesting::MultiVaultCreated`)
  ]);
  const vaultIds = [
    ...singleEvts.map((e) => e.parsedJson?.vault_id).filter(Boolean),
    ...multiEvts.map((e) => e.parsedJson?.vault_id).filter(Boolean)
  ];
  if (vaultIds.length === 0) return [];
  const objects = await batchGetObjects(client, vaultIds);
  const byType = /* @__PURE__ */ new Map();
  for (const obj of objects) {
    const type = obj.data?.type ?? "";
    const coinType = extractCoinType(type);
    if (!coinType) continue;
    const fields = obj.data?.content?.fields ?? {};
    const balRaw = typeof fields.balance === "object" ? fields.balance?.fields?.value ?? "0" : fields.balance ?? "0";
    const remaining = BigInt(balRaw);
    const totalLocked = BigInt(fields.total_locked ?? "0");
    let claimed = 0n;
    if (typeof fields.claimed === "object" && fields.claimed?.fields?.contents) {
      for (const entry of fields.claimed.fields.contents) {
        claimed += BigInt(entry.fields?.value ?? entry.value ?? 0);
      }
    } else if (typeof fields.claimed === "object" && fields.claimed?.contents) {
      for (const entry of fields.claimed.contents) {
        claimed += BigInt(entry.value ?? 0);
      }
    } else {
      claimed = BigInt(fields.claimed ?? "0");
    }
    const cur = byType.get(coinType) ?? {
      vaultCount: 0,
      totalLocked: 0n,
      remaining: 0n,
      claimed: 0n
    };
    byType.set(coinType, {
      vaultCount: cur.vaultCount + 1,
      totalLocked: cur.totalLocked + totalLocked,
      remaining: cur.remaining + remaining,
      claimed: cur.claimed + claimed
    });
  }
  const coinTypes = [...byType.keys()];
  const metaResults = await Promise.allSettled(
    coinTypes.map((ct) => client.getCoinMetadata({ coinType: ct }))
  );
  return coinTypes.map((ct, i) => {
    const meta = metaResults[i].status === "fulfilled" ? metaResults[i].value : null;
    const agg = byType.get(ct);
    return {
      coinType: ct,
      symbol: meta?.symbol ?? ct.split("::").pop()?.toUpperCase() ?? "?",
      decimals: meta?.decimals ?? 9,
      vaultCount: agg.vaultCount,
      totalLocked: agg.totalLocked,
      remaining: agg.remaining,
      claimed: agg.claimed
    };
  }).sort((a, b) => Number(b.totalLocked - a.totalLocked));
}
function monthKey(tsMs) {
  const d = new Date(tsMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
async function fetchAnalytics(client, packageId) {
  const [singleEvts, multiEvts, claimEvts, multiClaimEvts] = await Promise.all([
    fetchAllEvents(client, `${packageId}::vesting::VaultCreated`),
    fetchAllEvents(client, `${packageId}::vesting::MultiVaultCreated`),
    fetchAllEvents(client, `${packageId}::vesting::TokensClaimed`),
    fetchAllEvents(client, `${packageId}::vesting::MultiTokensClaimed`)
  ]);
  const vaultByMonth = /* @__PURE__ */ new Map();
  const allTs = [];
  for (const e of singleEvts) {
    const ts = Number(e.timestampMs ?? 0);
    if (!ts) continue;
    allTs.push(ts);
    const k = monthKey(ts);
    const cur = vaultByMonth.get(k) ?? { single: 0, multi: 0 };
    vaultByMonth.set(k, { ...cur, single: cur.single + 1 });
  }
  for (const e of multiEvts) {
    const ts = Number(e.timestampMs ?? 0);
    if (!ts) continue;
    allTs.push(ts);
    const k = monthKey(ts);
    const cur = vaultByMonth.get(k) ?? { single: 0, multi: 0 };
    vaultByMonth.set(k, { ...cur, multi: cur.multi + 1 });
  }
  const sortedKeys = [...vaultByMonth.keys()].sort();
  const monthlyBars = [];
  if (sortedKeys.length > 0) {
    const first = /* @__PURE__ */ new Date(sortedKeys[0] + "-01");
    const last = /* @__PURE__ */ new Date(sortedKeys[sortedKeys.length - 1] + "-01");
    const cur = new Date(first);
    while (cur <= last) {
      const k = monthKey(cur.getTime());
      monthlyBars.push({ month: k, ...vaultByMonth.get(k) ?? { single: 0, multi: 0 } });
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  const claimByMonth = /* @__PURE__ */ new Map();
  for (const e of [...claimEvts, ...multiClaimEvts]) {
    const ts = Number(e.timestampMs ?? 0);
    if (!ts) continue;
    const k = monthKey(ts);
    claimByMonth.set(k, (claimByMonth.get(k) ?? 0) + 1);
  }
  const claimBars = monthlyBars.map((b) => ({
    month: b.month,
    count: claimByMonth.get(b.month) ?? 0
  }));
  const creatorCount = /* @__PURE__ */ new Map();
  for (const e of [...singleEvts, ...multiEvts]) {
    const creator = e.parsedJson?.creator ?? "";
    if (creator) creatorCount.set(creator, (creatorCount.get(creator) ?? 0) + 1);
  }
  const totalForPct = singleEvts.length + multiEvts.length || 1;
  const topCreators = [...creatorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([address, count]) => ({
    address,
    count,
    pct: Math.round(count / totalForPct * 100)
  }));
  const multiWallets = multiEvts.reduce(
    (sum, e) => sum + Number(e.parsedJson?.beneficiary_count ?? 2),
    0
  );
  const firstTs = allTs.length > 0 ? Math.min(...allTs) : null;
  return {
    totalVaults: singleEvts.length + multiEvts.length,
    singleVaults: singleEvts.length,
    multiVaults: multiEvts.length,
    totalWallets: singleEvts.length + multiWallets,
    totalClaims: claimEvts.length + multiClaimEvts.length,
    uniqueCreators: creatorCount.size,
    firstVaultDate: firstTs ? new Date(firstTs).toISOString() : null,
    monthlyBars,
    claimBars,
    topCreators
  };
}
export {
  CLOCK_ID,
  DEFAULT_DEPLOY_FEE,
  MAINNET_CONFIG,
  MIST_PER_SUI,
  NETWORK_CONFIGS,
  TESTNET_CONFIG,
  buildClaimTx,
  buildCreateMultiVaultTx,
  buildCreateVaultTx,
  claimableForUser,
  claimableNow,
  dateToMs,
  extractCoinType,
  fetchAllEvents,
  fetchAnalytics,
  fetchDeployFee,
  fetchTokenTVL,
  fetchVault,
  fetchVaultsByBeneficiary,
  fetchVaultsByCreator,
  formatAmount,
  isMultiVaultType,
  parseVecMap,
  toBaseUnits
};
//# sourceMappingURL=index.mjs.map
