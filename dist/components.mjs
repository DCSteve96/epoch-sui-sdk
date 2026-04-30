// src/components.tsx
import * as React from "react";

// src/utils.ts
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

// src/queries.ts
async function fetchDeployFee(client, treasuryId) {
  const obj = await client.getObject({ id: treasuryId, options: { showContent: true } });
  const fields = obj.data?.content?.fields ?? {};
  if (fields.deploy_fee) return BigInt(fields.deploy_fee);
  throw new Error("[epoch-sdk] Could not read deploy_fee from Treasury object");
}

// src/transactions.ts
import { Transaction } from "@mysten/sui/transactions";

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

// src/transactions.ts
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

// src/components.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var EPOCH_URL = "https://epochsui.com";
var EPOCH_LOGO = /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
  /* @__PURE__ */ jsx(
    "polygon",
    {
      points: "12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5",
      stroke: "#6FBCF0",
      strokeWidth: "1.8",
      strokeLinejoin: "round",
      fill: "rgba(111,188,240,0.12)"
    }
  ),
  /* @__PURE__ */ jsx("line", { x1: "12", y1: "2", x2: "12", y2: "22", stroke: "#6FBCF0", strokeWidth: "1.2", strokeDasharray: "2.5 2" }),
  /* @__PURE__ */ jsx("line", { x1: "2", y1: "8.5", x2: "22", y2: "15.5", stroke: "#6FBCF0", strokeWidth: "1.2", strokeDasharray: "2.5 2" }),
  /* @__PURE__ */ jsx("line", { x1: "22", y1: "8.5", x2: "2", y2: "15.5", stroke: "#6FBCF0", strokeWidth: "1.2", strokeDasharray: "2.5 2" })
] });
var BADGE_SIZE = {
  sm: { fontSize: 9, padding: "3px 7px", gap: 4, logo: 11 },
  md: { fontSize: 10, padding: "4px 9px", gap: 5, logo: 13 },
  lg: { fontSize: 12, padding: "6px 12px", gap: 6, logo: 16 }
};
function PoweredByEpoch({
  size = "md",
  href = EPOCH_URL,
  style,
  className
}) {
  const s = BADGE_SIZE[size];
  const [hovered, setHovered] = React.useState(false);
  return /* @__PURE__ */ jsxs(
    "a",
    {
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      className,
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: s.gap,
        padding: s.padding,
        borderRadius: 999,
        border: `1px solid ${hovered ? "rgba(111,188,240,0.5)" : "rgba(111,188,240,0.25)"}`,
        background: hovered ? "rgba(111,188,240,0.12)" : "rgba(111,188,240,0.06)",
        color: "#6FBCF0",
        textDecoration: "none",
        fontFamily: "inherit",
        fontSize: s.fontSize,
        fontWeight: 600,
        letterSpacing: ".03em",
        whiteSpace: "nowrap",
        transition: "all .15s",
        ...style
      },
      children: [
        React.cloneElement(EPOCH_LOGO, { width: s.logo, height: s.logo }),
        "Powered by Epoch"
      ]
    }
  );
}
var DEFAULT_THEME = {
  accent: "#6FBCF0",
  bg: "#111117",
  card: "#18181b",
  border: "#27272a",
  text: "#e4e4e7",
  muted: "#71717a",
  green: "#34d399",
  red: "#f87171",
  purple: "#a78bfa"
};
function IconLinear({ size = 36 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 48 48", fill: "none", children: [
    /* @__PURE__ */ jsx("line", { x1: "6", y1: "42", x2: "42", y2: "6", stroke: "#6FBCF0", strokeWidth: "2", strokeLinecap: "round" }),
    /* @__PURE__ */ jsx("circle", { cx: "6", cy: "42", r: "3", fill: "rgba(111,188,240,0.3)", stroke: "#6FBCF0", strokeWidth: "1.5" }),
    /* @__PURE__ */ jsx("circle", { cx: "24", cy: "24", r: "3", fill: "rgba(111,188,240,0.3)", stroke: "#6FBCF0", strokeWidth: "1.5" }),
    /* @__PURE__ */ jsx("circle", { cx: "42", cy: "6", r: "3", fill: "#6FBCF0" })
  ] });
}
function IconCliff({ size = 36 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 48 48", fill: "none", children: [
    /* @__PURE__ */ jsx("rect", { x: "6", y: "30", width: "8", height: "14", rx: "1.5", fill: "rgba(111,188,240,0.12)", stroke: "#6FBCF0", strokeWidth: "1.4" }),
    /* @__PURE__ */ jsx("rect", { x: "20", y: "20", width: "8", height: "24", rx: "1.5", fill: "rgba(111,188,240,0.12)", stroke: "#6FBCF0", strokeWidth: "1.4" }),
    /* @__PURE__ */ jsx("rect", { x: "34", y: "6", width: "8", height: "38", rx: "1.5", fill: "rgba(111,188,240,0.25)", stroke: "#6FBCF0", strokeWidth: "1.4" })
  ] });
}
function IconHybrid({ size = 36 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 48 48", fill: "none", children: [
    /* @__PURE__ */ jsx("polyline", { points: "6,42 6,24 22,24", stroke: "#6FBCF0", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }),
    /* @__PURE__ */ jsx("line", { x1: "22", y1: "24", x2: "42", y2: "6", stroke: "#6FBCF0", strokeWidth: "2", strokeLinecap: "round", strokeDasharray: "3 2.5" }),
    /* @__PURE__ */ jsx("circle", { cx: "22", cy: "24", r: "4", fill: "rgba(111,188,240,0.2)", stroke: "#6FBCF0", strokeWidth: "1.5" })
  ] });
}
var VEST_TYPES = [
  { id: "linear", label: "Linear", Icon: IconLinear, desc: "Tokens stream continuously between two dates." },
  { id: "cliff", label: "Cliff", Icon: IconCliff, desc: "All tokens unlock at once on a specific date." },
  { id: "hybrid", label: "Hybrid", Icon: IconHybrid, desc: "Cliff percentage first, then linear until end." }
];
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function nextYear() {
  const d = /* @__PURE__ */ new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
function VestingWidget({
  client,
  network = "mainnet",
  defaultCoinType = "0x2::sui::SUI",
  walletAddress,
  onSignAndExecute,
  onSuccess,
  onError,
  theme: themeProp,
  width = "100%"
}) {
  const cfg = network === "testnet" ? TESTNET_CONFIG : MAINNET_CONFIG;
  const t = { ...DEFAULT_THEME, ...themeProp };
  const [mode, setMode] = React.useState("single");
  const [vestType, setVestType] = React.useState("linear");
  const [amount, setAmount] = React.useState("1");
  const [start, setStart] = React.useState(today());
  const [end, setEnd] = React.useState(nextYear());
  const [cliffDate, setCliffDate] = React.useState(today());
  const [cliffPct, setCliffPct] = React.useState("20");
  const [bene, setBene] = React.useState("");
  const [rows, setRows] = React.useState([
    { id: 1, address: "", pct: "50" },
    { id: 2, address: "", pct: "50" }
  ]);
  const [status, setStatus] = React.useState("idle");
  const [digest, setDigest] = React.useState("");
  const [errMsg, setErrMsg] = React.useState("");
  const totalPct = rows.reduce((s, r) => s + (Number(r.pct) || 0), 0);
  const submit = async () => {
    setStatus("pending");
    setErrMsg("");
    setDigest("");
    try {
      const fee = await fetchDeployFee(client, cfg.treasuryId);
      const coinType = defaultCoinType;
      let tx;
      if (mode === "single") {
        tx = buildCreateVaultTx({
          packageId: cfg.packageId,
          treasuryId: cfg.treasuryId,
          coinType,
          amount: toBaseUnits(amount, 9),
          fee,
          beneficiary: bene.trim() || walletAddress || "",
          cliffTsMs: vestType !== "linear" ? dateToMs(new Date(cliffDate)) : 0n,
          cliffBps: vestType === "hybrid" ? BigInt(Math.round(Number(cliffPct) * 100)) : vestType === "cliff" ? 10000n : 0n,
          linearStartMs: vestType !== "cliff" ? dateToMs(new Date(start)) : 0n,
          linearEndMs: vestType !== "cliff" ? dateToMs(new Date(end)) : 0n
        });
      } else {
        if (totalPct !== 100) throw new Error("Percentages must sum to 100%");
        tx = buildCreateMultiVaultTx({
          packageId: cfg.packageId,
          treasuryId: cfg.treasuryId,
          coinType,
          amount: toBaseUnits(amount, 9),
          fee,
          beneficiaries: rows.map((r) => r.address.trim() || walletAddress || ""),
          sharesBps: rows.map((r) => BigInt(Math.round((Number(r.pct) || 0) * 100))),
          cliffTsMs: 0n,
          cliffBps: 0n,
          linearStartMs: dateToMs(new Date(start)),
          linearEndMs: dateToMs(new Date(end))
        });
      }
      const result = await onSignAndExecute(tx);
      const d = typeof result === "string" ? result : result.digest;
      setDigest(d);
      setStatus("done");
      onSuccess?.(d);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(e?.message ?? "Transaction failed");
      setErrMsg(err.message);
      setStatus("error");
      onError?.(err);
    }
  };
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: "8px 10px",
    color: t.text,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none"
  };
  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 600,
    color: t.muted,
    textTransform: "uppercase",
    letterSpacing: ".06em"
  };
  const field = { display: "flex", flexDirection: "column" };
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  return /* @__PURE__ */ jsx("div", { style: { width, fontFamily: "system-ui, -apple-system, sans-serif" }, children: /* @__PURE__ */ jsxs("div", { style: {
    background: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: 16,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16
  }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontWeight: 700, fontSize: 16, color: t.text }, children: "Create Vault" }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 4, background: t.bg, borderRadius: 10, padding: 3 }, children: ["single", "multi"].map((m) => /* @__PURE__ */ jsx("button", { onClick: () => setMode(m), style: {
        padding: "4px 12px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 600,
        background: mode === m ? t.card : "transparent",
        color: mode === m ? t.text : t.muted,
        boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.3)" : "none",
        transition: "all .15s"
      }, children: m === "single" ? "Single" : "Multi" }, m)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: field, children: [
      /* @__PURE__ */ jsx("label", { style: labelStyle, children: "Vesting type" }),
      /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }, children: VEST_TYPES.map(({ id, label, Icon, desc }) => {
        const active = vestType === id;
        return /* @__PURE__ */ jsxs("button", { onClick: () => setVestType(id), style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 7,
          padding: "12px 6px 10px",
          borderRadius: 12,
          outline: "none",
          border: `1px solid ${active ? t.accent : t.border}`,
          background: active ? "rgba(111,188,240,0.07)" : t.bg,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all .15s"
        }, children: [
          /* @__PURE__ */ jsx(Icon, { size: 30 }),
          /* @__PURE__ */ jsx("span", { style: { fontWeight: 700, fontSize: 12, color: active ? t.accent : t.muted }, children: label }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: 9, color: "#52525b", lineHeight: 1.4, textAlign: "center" }, children: desc })
        ] }, id);
      }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: field, children: [
      /* @__PURE__ */ jsx("label", { style: labelStyle, children: "Amount" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "number",
          value: amount,
          min: "0.01",
          step: "0.01",
          placeholder: "1.0",
          onChange: (e) => setAmount(e.target.value),
          style: inputStyle
        }
      )
    ] }),
    vestType !== "linear" && /* @__PURE__ */ jsxs("div", { style: grid2, children: [
      /* @__PURE__ */ jsxs("div", { style: field, children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "Cliff date" }),
        /* @__PURE__ */ jsx("input", { type: "date", value: cliffDate, onChange: (e) => setCliffDate(e.target.value), style: inputStyle })
      ] }),
      vestType === "hybrid" && /* @__PURE__ */ jsxs("div", { style: field, children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "Cliff % unlock" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            value: cliffPct,
            min: "1",
            max: "99",
            onChange: (e) => setCliffPct(e.target.value),
            style: inputStyle
          }
        )
      ] })
    ] }),
    vestType !== "cliff" && /* @__PURE__ */ jsxs("div", { style: grid2, children: [
      /* @__PURE__ */ jsxs("div", { style: field, children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "Linear start" }),
        /* @__PURE__ */ jsx("input", { type: "date", value: start, onChange: (e) => setStart(e.target.value), style: inputStyle })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: field, children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "Linear end" }),
        /* @__PURE__ */ jsx("input", { type: "date", value: end, onChange: (e) => setEnd(e.target.value), style: inputStyle })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { height: 1, background: t.border } }),
    mode === "single" && /* @__PURE__ */ jsxs("div", { style: field, children: [
      /* @__PURE__ */ jsx("label", { style: labelStyle, children: "Beneficiary address" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: bene,
          onChange: (e) => setBene(e.target.value),
          placeholder: walletAddress ? `${walletAddress.slice(0, 20)}\u2026 (defaults to you)` : "0x\u2026",
          style: { ...inputStyle, fontFamily: "monospace", fontSize: 12 }
        }
      )
    ] }),
    mode === "multi" && /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "Beneficiaries" }),
        /* @__PURE__ */ jsxs("span", { style: { fontSize: 12, fontWeight: 700, color: totalPct === 100 ? t.green : t.red }, children: [
          totalPct,
          "%",
          totalPct !== 100 ? " \u2014 must be 100%" : " \u2713"
        ] })
      ] }),
      rows.map((row, i) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxs("span", { style: { fontSize: 12, color: t.muted, width: 16, flexShrink: 0 }, children: [
          i + 1,
          "."
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: row.address,
            placeholder: `Beneficiary ${i + 1} (0x\u2026)`,
            onChange: (e) => setRows((rs) => rs.map((r) => r.id === row.id ? { ...r, address: e.target.value } : r)),
            style: { ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            value: row.pct,
            min: "1",
            max: "99",
            onChange: (e) => setRows((rs) => rs.map((r) => r.id === row.id ? { ...r, pct: e.target.value } : r)),
            style: { ...inputStyle, width: 56, textAlign: "center", flexShrink: 0 }
          }
        ),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: t.muted }, children: "%" }),
        rows.length > 2 && /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setRows((rs) => rs.filter((r) => r.id !== row.id)),
            style: { background: "none", border: "none", color: t.muted, cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 },
            children: "\u2715"
          }
        )
      ] }, row.id)),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setRows((rs) => [...rs, { id: Date.now(), address: "", pct: "" }]),
          style: {
            alignSelf: "flex-start",
            background: "none",
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            color: t.muted,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12,
            padding: "5px 10px"
          },
          children: "+ Add beneficiary"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: submit,
        disabled: status === "pending" || mode === "multi" && totalPct !== 100,
        style: {
          width: "100%",
          padding: "11px 16px",
          borderRadius: 10,
          border: "none",
          background: status === "pending" ? t.border : mode === "multi" ? t.purple : t.accent,
          color: status === "pending" ? t.muted : "#0a0a0f",
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 700,
          cursor: status === "pending" || mode === "multi" && totalPct !== 100 ? "not-allowed" : "pointer",
          opacity: mode === "multi" && totalPct !== 100 ? 0.5 : 1,
          transition: "all .15s"
        },
        children: status === "pending" ? "Waiting for wallet\u2026" : `Create ${mode === "multi" ? "multi-" : ""}vault`
      }
    ),
    status === "error" && /* @__PURE__ */ jsxs("p", { style: { margin: 0, fontSize: 12, color: t.red }, children: [
      "Error: ",
      errMsg
    ] }),
    status === "done" && /* @__PURE__ */ jsxs("div", { style: {
      padding: "10px 14px",
      borderRadius: 10,
      background: "rgba(52,211,153,.06)",
      border: "1px solid rgba(52,211,153,.2)"
    }, children: [
      /* @__PURE__ */ jsx("p", { style: { margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: t.green }, children: "Vault created!" }),
      /* @__PURE__ */ jsxs(
        "a",
        {
          href: `https://suiscan.xyz/${network}/tx/${digest}`,
          target: "_blank",
          rel: "noopener noreferrer",
          style: { fontFamily: "monospace", fontSize: 11, color: t.green, textDecoration: "none" },
          children: [
            digest.slice(0, 28),
            "\u2026 \u2197"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "center", paddingTop: 2 }, children: /* @__PURE__ */ jsx(PoweredByEpoch, { size: "sm" }) })
  ] }) });
}
export {
  PoweredByEpoch,
  VestingWidget
};
//# sourceMappingURL=components.mjs.map
