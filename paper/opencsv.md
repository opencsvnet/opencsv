# OpenCSV: Client-Side Verified RWAs, Stables, and More on Bitcoin

**Status:** Working draft (v0.4)
**Date:** 2026-08-07

---

## Abstract

Issuer-backed assets — RWAs, stablecoins, and more — today inherit their security
model wholesale from the system that hosts
them: a global consensus network (Ethereum, Tron, Solana) that every participant must
trust or fully re-execute, or a federated sidechain whose validators must be trusted
not to collude. Either way, validation is a network-wide act, and privacy is poor.

We present **OpenCSV**, a scheme in which such asset transactions are validated *by the
parties to the payment* rather than by a consensus network. Building on the client-side
validation (CSV) lineage — and most directly on Shielded CSV (Nick, Eagen, Linus,
ePrint 2025/068) — OpenCSV removes transaction validity from consensus entirely. The
Bitcoin blockchain is used only as an ordering and data-availability layer: each
solo OpenCSV transaction anchors a 64-byte context-bound record plus a
compact-filter-visible marker output in an ordinary Bitcoin transaction. Raw
nullifiers remain off-chain. Everything else — coin commitments, validity proofs,
amounts — is delivered directly from sender to recipient in a *consignment*.

OpenCSV extends the CSV model with the machinery an RWA requires:

1. an **issuance predicate** that permits supply growth only under a signature from an
   issuer key bound into the asset's genesis parameters;
2. **transparent mints and redemptions**, so that total outstanding supply per asset is
   publicly computable by anyone, while user-to-user transfers remain shielded
   (amounts and counterparties hidden);
3. **proof-carrying data (PCD)** built from AIR-native recursive proofs over a small
   field — no zkVM — so that a recipient's verification work is constant in the length
   of a coin's history.

The reference profile separates three performance questions that are often
conflated. Recursive PCD compresses private history and verification work;
co-funded batches amortize one Bitcoin transaction's fixed overhead across up
to 64 independently signing participants; and an exact mempool transaction may
grant explicitly provisional availability after full local verification. None
of these mechanisms changes Bitcoin finality. Under the checked transaction
weight model, dedicating an idealized 4,000,000-WU block every 600 seconds to
OpenCSV raises the theoretical saturation bound from 7.32 solo operations/s to
15.15 operations/s for 64-party batches, while reducing modeled fees by 67% at
5 sat/vB. These are upper bounds and fee-model outputs, not network-throughput
promises.

A recipient accepts a payment after checking one succinct proof and one Bitcoin
anchor. No global state, no bridge, no fork, no new chain.

---

## 1. Introduction

### 1.1 The RWA verification problem

An RWA token is a claim on an issuer — a stablecoin is the canonical example, but
the same shape fits tokenized treasuries, securities, commodities, and other
issuer-backed assets: the issuer promises redemption against the
underlying real-world asset, and the system must
guarantee two things that the issuer's promise alone cannot — that the *units*
circulating are genuine (no counterfeits, no unauthorized inflation) and that each
transfer is a transfer (no double-spends). On a smart-contract chain these guarantees
come from global consensus: every full node re-executes every transfer of every token
forever. Holders who do not run a full node trust someone who does. The cost of
verification is socialized; the privacy of participants is zero.

Client-side validation inverts this. The guarantees a recipient actually needs are
*local*: is the coin I am receiving genuine, unspent, and derived from legitimate
issuance? A recipient who can answer those three questions for the specific coins in
front of them does not need anyone to verify anything else. This observation — that
consensus needs to agree on *ordering* and *availability*, not on *validity* — goes
back to Peter Todd's work on single-use seals and underlies RGB. Shielded CSV
(2025) showed how to complete the program for a bearer asset using zero-knowledge
proofs: recursive proof-carrying data collapses a coin's entire history into one
constant-size proof, and the chain carries nothing but 64-byte nullifiers.

### 1.2 Why RWAs are not just "another asset" for CSV

A bearer asset (like bitcoin) has no issuer and no supply predicate beyond the base
protocol's issuance schedule. An RWA is different in exactly the places that
matter for verification:

- **Issuance is ongoing and permissioned.** Supply grows when the issuer takes in
  reserves and shrinks on redemption. The validity predicate must therefore encode an
  *issuer authorization rule* — supply increases only under the issuer's key — and this
  rule must be enforced inside the proof system, not by convention.
- **Auditability is a product requirement.** Issuers, regulators, and counterparties
  need to answer "how many units exist?" A fully shielded design (hidden asset types,
  hidden mints) makes this impossible without issuer cooperation; a naive transparent
  design destroys user privacy. OpenCSV takes a deliberate middle position: *mints and
  redemptions are transparent; transfers between users are shielded.* Supply is a sum
  over public events; user graph privacy is preserved.
- **Redemption is part of the protocol.** A RWA must burn cleanly back to the
  issuer. Redemption is modeled as a first-class transaction type, not an afterthought.

### 1.3 Contributions

- A concrete scheme, **OpenCSV**, specifying asset genesis, coin commitments,
  nullifiers, and three transaction types (mint, transfer, redeem) as client-side
  validated predicates, anchored to Bitcoin L1 with a fixed 64-byte record plus
  marker output and no consensus changes.
- A privacy/auditability split — shielded transfers over transparent issuance — that
  keeps total supply publicly computable while hiding amounts and the transaction
  graph between users.
- A design for the validity proofs as **AIR-native recursive PCD** (Plonky3-style
  AIR over BabyBear/Goldilocks with Poseidon), avoiding zkVM overhead and non-native
  field arithmetic, targeting sub-second proving for the transfer predicate.
- A concrete performance model that keeps proof computation, Bitcoin block
  space, provisional mempool availability, and settled finality distinct;
  includes co-funded transaction weights and fee allocation; and publishes the
  source revision and generated rows as a machine-checkable receipt.
- A security analysis (inflation soundness, double-spend resistance, privacy bounds,
  failure modes) and a roadmap for mechanized verification of the protocol logic in
  Lean 4, plus a Rust reference implementation. A separate Signal fork demonstrates
  one possible consumer transport and UI; it is not a production interface.

Deployment policy is deliberately outside the cryptographic theorem boundary.
An internally valid issuer manifest does not prove backing, redemption, legal
authority, operational recovery, or brand identity. The project's review-only
[production/mainnet activation contract](../PRODUCTION_MAINNET.md) therefore
requires a fresh namespace and exact reviewed manifest registry before any
consumer mainnet write. The implementation candidate accepts that policy only
as a versioned, deployment-bound release input with a recomputed commitment to
its ordered manifests, activation phase, exact transfer/batch/rolling-day/
reserve/fee ceilings, source revision, and public approval receipts. Candidate
policy is readable but cannot write; limited and general releases remain
bounded by their committed ceilings. A signed operation snapshots the complete
authorizing release, and protocol-safe replacement revalidates that commitment
and retains its original fee ceiling across later policy changes. A
wallet-derived signature also binds the commitment to the stable operation
identity, so missing, substituted, or cross-operation mainnet authorization is
treated as corrupt state rather than replaced by live host policy. This is
release-policy integrity, not a proof of reserves or issuer authority. A
separately featured, secret-free `opencsv-registry` tool constructs and checks
those exact bytes with the same Rust serializer and verifier as account open;
it reports structural validity without claiming activation authority and binds
verification to the deployment expected by the application. Candidate fixtures
may be issuer-empty, but limited/general releases require an exact issuer and a
non-placeholder source revision. A
database- and backup-carried version floor makes rollback read-only without
hiding wallet evidence; it is operational policy state, not a protocol theorem.
The contract also requires two distinct pinned raw-byte observer hosts and two
distinct compact-filter peers; those are operational diversity requirements,
not new cryptographic assumptions or claims that public APIs are authoritative.
The contract keeps the issuer and operational assumptions explicit and is not
evidence that a production issuer or deployment exists.

### 1.4 Organization

§2 recalls client-side validation and Shielded CSV. §3 gives the system and trust
model. §4 presents the construction. §5 analyzes security. §6 sketches the
formalization roadmap, §7 the implementation roadmap. §8 discusses related work.

---

## 2. Background

### 2.1 Client-side validation

In a conventional cryptocurrency, validity is a consensus rule: a block full of invalid
transactions is itself invalid, so every node checks everything. Todd's observation
(2013, later developed in RGB) is that this is an engineering choice, not a logical
necessity. Blocks can carry arbitrary committed data; each client interprets the data
that concerns *its* coins and ignores the rest. An invalid "transaction" is not
rejected by the network — it is simply uninterpretable as a valid transfer to any
recipient, and therefore worthless. What consensus must still provide is a **single,
totally-ordered, available log**, so that commitments (e.g. spends) have a canonical
first occurrence. This is the sense in which Bitcoin can anchor systems it knows
nothing about.

RGB instantiated this with single-use seals bound to UTXOs: a contract state transition
commits into a specific Bitcoin output, and spending the output closes the seal. The
recipient of an RGB transfer verifies the full *history* of the asset back to genesis —
the core scalability and privacy pain point of naive CSV: history size grows with each
hop, and verifying it means seeing it.

### 2.2 Shielded CSV

Shielded CSV (Nick–Eagen–Linus, ePrint 2025/068) resolves both problems with
proof-carrying data:

- Each coin carries a succinct proof that it was produced by a valid sequence of
  transactions terminating in legitimate issuance. When spending, the prover folds the
  predecessor coins' proofs into the new proof, so proof size and verification time are
  *constant in history length*. The recipient never sees the history.
- What touches the chain is only a **nullifier** per transaction — 64 pseudorandom
  bytes. To a plain Bitcoin node it is indistinguishable from junk data. No signature
  verification, no UTXO changes, no fork.
- Double-spending is resolved by ordering: the first on-chain appearance of a coin's
  nullifier is the authoritative spend; a recipient checks that the anchor they are
  shown is that first occurrence. A record-byte-only estimate is not a transaction
  throughput model: actual capacity also includes inputs, outputs, witness, marker,
  fees, and standardness. §4.7.3 gives the checked OpenCSV transaction-level model.

OpenCSV adopts this skeleton wholesale and modifies the predicates — the "what counts
as valid" — for the RWA setting, and makes different engineering choices for
the proof system (§4.1, §7).

### 2.3 Proof-carrying data and AIR-native proving

Proof-carrying data (Chiesa–Tromer 2010) is the abstraction of a distributed
computation in which every message carries a proof that it was produced in compliance
with a local predicate φ applied to the message's predecessors. Recursive composition
gives constant-size proofs of arbitrarily long histories.

The practical question is the arithmetization. A **zkVM** (RISC Zero, SP1) proves
execution of a general CPU — convenient, but each proved step pays for instruction
fetch/decode/execute machinery that a fixed predicate does not need. **AIR**
(algebraic intermediate representation — the arithmetization behind STARKs, Plonky2/3)
describes the computation directly as a trace table with polynomial constraints; for a
fixed, hash-heavy predicate (commitments, nullifiers, a signature verification) it is
one to two orders of magnitude leaner. OpenCSV specifies its predicates directly in
AIR over a small prime field (BabyBear or Goldilocks), hashes with Poseidon, and
obtains recursion by verifying the previous proofs' FRI arguments inside the AIR —
the Plonky2 approach generalized to a tree of predecessors, which is precisely PCD.
No zkVM anywhere in the stack.

---

## 3. System and Trust Model

### 3.1 Parties

- **Issuer** — the entity backing the RWA. Holds an issuance keypair
  `(isk, ipk)` per asset. Mints against reserves, redeems burns, publishes the asset's
  genesis parameters. The issuer is trusted for *backing* (that a unit can be redeemed
  against the underlying asset) — no scheme can remove that — but is **not** trusted
  for correctness of the
  ledger: an issuer cannot inflate supply covertly, forge transfers, or spend users'
  coins, because every validity condition is checked client-side from proofs and
  public chain data.
- **Users (clients)** — holders and transactors. Each user runs (or delegates parts of)
  an OpenCSV client that: stores their coins and consignments, produces and verifies
  proofs, anchors spends to Bitcoin, and monitors the chain for nullifiers relevant to
  them.
- **Bitcoin miners / the L1** — the neutral ordering and availability layer. Miners do
  not know OpenCSV exists.
- **Auditors** — any third party (regulator, reserve attestor, curious person) who
  computes per-asset supply from public data. Auditors need nothing from the issuer
  beyond genesis parameters and nothing from users at all.

### 3.2 What Bitcoin provides, and what it does not

OpenCSV requires from the base chain exactly:

1. **Total order** over anchored payloads (block order, then in-block order).
2. **Availability** of those payloads to anyone who wants them (full blocks are public).
3. **Censorship resistance and finality** at the level Bitcoin natively provides
   (a spend is final after *k* confirmations for the application's chosen *k*).

It does **not** require: script changes, covenant opcodes, soft forks, miner
cooperation, or any node interpreting the payloads.

### 3.3 Trust assumptions, stated plainly

| Assumption | Needed for | If it fails |
|---|---|---|
| Bitcoin's ordering is not reorged past *k* conf | finality of spends | payments can be undone, as with on-chain BTC |
| Poseidon is collision- and preimage-resistant | commitment & nullifier integrity | counterfeiting / double-spend possible |
| The AIR/FRI proof system is sound | no fake validity proofs | counterfeiting possible |
| Issuer's mint seed is uncompromised | supply integrity | unauthorized (but *visible*) inflation; users can exit |
| Sender delivers the consignment | recipient learns their coin | funds are anchored but unusable by recipient (liveness, not theft — see §5.5) |
| Recipient stores consignments durably | later spending | loss of funds (mitigated by backups/escrow) |
| Client's verified header/filter/block view is current | first occurrence and confirmation state | a spend or reorg can be missed; explorers do not repair this |

Notably absent: any honesty assumption about the issuer regarding the ledger, any
network of validators, any bridge committee, any token-specific consensus.

### 3.4 Adversary model

We consider an adversary who controls the network (can delay but not permanently
censor Bitcoin), corrupts arbitrary users, and may observe all public data (chain,
mints, redemptions). The adversary's goals: (a) inflate supply without the issuer's
key; (b) double-spend a coin; (c) learn amounts/counterparties of shielded transfers;
(d) prevent a payment from completing. §5 argues (a)–(c) fail under the assumptions
above and characterizes (d) as liveness failures with mitigations.

---

## 4. Construction

### 4.1 Preliminaries and notation

- `𝔽` — a small prime field, instantiated as BabyBear (`p = 2^31 − 2^27 + 1`) or
  Goldilocks (`p = 2^64 − 2^32 + 1`). All hash inputs and circuit values are field
  elements or fixed-width vectors of them.
- `H` — a Poseidon-family hash over `𝔽` (the reference implementation uses Poseidon2,
  width 16 / rate 8), used for commitments, nullifiers, and Fiat–Shamir
  challenges. Security parameter `λ = 128` (conjectured; see §5.6).
- `Π` — an AIR-based argument with FRI as the polynomial commitment, supporting
  recursion (verification of a `Π` proof inside a `Π` AIR). We write
  `π ← Π.Prove(vk, x, w)` and `Π.Verify(vk, x, π)`, with `vk` the predicate's
  verification key, `x` public input, `w` witness.
- `Σ` — an abstract issuer authorization scheme that is *AIR-friendly*: verification expressed
  natively over `𝔽` without non-native field arithmetic. Two candidate
  instantiations: Schnorr over an elliptic curve whose base field is `𝔽`, or a
  Poseidon-based hash signature for mint authorization (signatures appear only in
  mints, so even a comparatively heavy scheme is acceptable). The interface is
  `Σ.Verify(ipk, m, σ) ∈ {0,1}`. The v3 reference implementation instantiates
  this abstract predicate as a PCD signature of knowledge: the mint circuit
  proves knowledge of an issuer seed committed by genesis and transcript-binds
  the exact mint statement. It is not a separately verifiable conventional
  signature. Legacy Ed25519 records remain inspection-only.

Field-element quantities such as `asset_id`, `C`, `nf` below are single `𝔽`-elements
(or small fixed vectors); the on-chain anchor serializes to exactly 64 bytes.

### 4.2 Asset genesis

An asset is created out-of-band by publishing its **genesis parameters**

```
G = (ipk, currency_code, terms_hash, nonce)
asset_id := H("OpenCSV-asset" ∥ G)
```

- `ipk` — issuer public key for this asset.
- `currency_code` — e.g. USD, EUR.
- `terms_hash` — hash of the asset's human/legal terms (redemption policy, fees,
  freeze policy if any — see §5.8).
- `nonce` — domain separation across assets sharing `(ipk, currency_code)`.

`G` is published on the issuer's channels and pinned into clients as a trust-on-first-use
parameter, exactly as a contract address would be pinned in an ERC-20 wallet. There is
no on-chain registration: an asset exists in virtue of its genesis parameters being
known and its mints being anchored.

### 4.3 Coins, commitments, nullifiers

A **coin** is a tuple

```
coin = (asset_id, v, owner, r)
```

- `v` — value in the asset's base units, `0 ≤ v < 2^64` (enforced by range check in-circuit).
- `owner` — owner's public key; in the simple case `owner = H(osk)` for owner secret `osk`.
- `r` — hiding randomness (256 bits in the reference implementation; a single
  BabyBear element would not suffice), uniform.

The coin's **commitment** and **nullifier** are

```
C  := H("coin" ∥ asset_id ∥ v ∥ owner ∥ r)
nf := H("null" ∥ osk ∥ C)
```

Properties:

- `C` is hiding (random `r`) and binding (collision resistance): outsiders see nothing;
  the committed value cannot be changed.
- `nf` is computable only by whoever knows `osk` for the `owner` in `C` — i.e. the
  legitimate spender — and is unique per coin (`C` fixes one coin; `osk` fixes one key;
  one `nf`). Publishing a spend of `nf` marks the coin consumed. The same coin can
  only ever yield the same `nf`, so a double-spend attempt necessarily produces two
  spends of one `nf` — an *observable conflict* to anyone who knows `nf` (the owner
  and their consignment recipients), resolvable by first occurrence (§4.7).
- `v`, `owner`, **and `nf` itself** never touch the chain. What the chain sees is a
  context-bound **anchor payload** `P = H("bind" ∥ nf ∥ ctx)` (§4.7): `nf` stays
  off-chain (inside proofs and consignments), which is precisely what prevents
  anchor copying attacks.

### 4.4 Mint

A mint creates coins out of nothing — the only transaction type allowed to do so.

**Off-chain:** the issuer chooses outputs `(coin_1 … coin_n)` and total
`V = Σ v_i`, all in one `asset_id`, and a fresh `mint_nonce`.

**On-chain anchor (public):**

```
MINT ∥ asset_id ∥ V ∥ H("mint" ∥ asset_id ∥ V ∥ mint_nonce)
```

serialized so the whole record is 64 bytes, carried in an OP_RETURN (or equivalent
data-carrier output) of an ordinary Bitcoin transaction. `asset_id ∥ V` is
*transparent*: anyone can read every mint.

**Proof:** the mint predicate's AIR proves, with public input
`x = (asset_id, V, mint_commit)` where `mint_commit = H("mint" ∥ asset_id ∥ V ∥ mint_nonce)`:

1. `Σ.Verify(ipk, (asset_id, V, mint_nonce), σ) = 1` — issuer authorization, with
   `ipk` bound to `asset_id` through genesis (`asset_id = H("OpenCSV-asset" ∥ G)` and
   `G` supplied in the witness, its hash chained to `asset_id`);
2. for each output `i`: `C_i = H("coin" ∥ asset_id ∥ v_i ∥ owner_i ∥ r_i)` (correct
   commitments), each `v_i` in range;
3. `Σ v_i = V` — the public minted total equals the sum of shielded outputs.

The mint proof `π_mint` is delivered to each output's recipient inside their
consignment. Mints are *transparent in amount and asset* but need not reveal output
owners — the public record contains only `(asset_id, V, mint_commit)`.

### 4.5 Shielded transfer

A transfer consumes coins `in_1 … in_m` (possibly of different owners — a multi-party
payment, with each spender's cooperation) and creates coins `out_1 … out_n`.

**Off-chain:** consignments carrying each output's `(v_i, owner_i, r_i)` plus the
transaction proof are delivered to the recipients.

**On-chain anchor (opaque, untagged):**

```
P_1 ∥ … ∥ P_m          (serialized to exactly 64 bytes)
```

— one **anchor payload** `P_i = H("bind" ∥ nf_i ∥ ctx)` per consumed coin, where
`ctx` is derived from the anchor transaction's input side (§4.7). The raw
nullifiers never appear on-chain. The record carries no tag byte: transfer anchors
are indistinguishable from arbitrary data-carrier traffic, and mean nothing to
anyone who does not know the corresponding `nf_i` (§4.7). (For `m` up to the
64-byte budget this is direct; larger `m` uses `H(P_1 ∥ … ∥ P_m)` as the payload
with the full list in the consignment, at a small cost in the conflict-check
algorithm of §4.7.)

**Proof:** the transfer predicate's AIR proves, with public input
`x = (nf_1…nf_m, anchor_commit)`:

1. **Ownership.** For each input, knowledge of `osk_i` with
   `owner_i = H(osk_i)` and `nf_i = H("null" ∥ osk_i ∥ C_i)`.
2. **Conservation.** Grouping inputs and outputs by `asset_id`: for each asset
   present, `Σ_in v = Σ_out v`. Sums are computed over opened witness values with
   per-value range checks (`0 ≤ v < 2^64`), so wrap-around cannot fake balance. No
   homomorphic commitment scheme is needed — the circuit sees the values; the public
   sees only the proof.
3. **Commitment integrity.** Each input `C_i` recomputes from its witness opening;
   each output `C'_j = H("coin" ∥ asset_id_j ∥ v_j ∥ owner_j ∥ r_j)` recomputes.
4. **PCD recursion.** For each input coin, verify its predecessor proof
   (`π_mint` or a previous transfer proof — redemptions create no coins) against the
   corresponding
   verification key, with that proof's public input chaining to `C_i`. This is the
   recursion step: the current proof attests the entire ancestry of every input back
   to an issuer-signed mint.

Recipients learn only their own outputs and the proof; the number of inputs, other
outputs, and all amounts remain hidden. Asset IDs of *transferred* coins are hidden
too — they appear only inside the proof — since public auditability only requires
transparency of mints and redemptions.

### 4.6 Redemption

Redemption returns value to the issuer and destroys the coin.

**Off-chain:** the redeemer presents the issuer with the consignment and proof out of
band (the redemption UX is issuer-specific).

**On-chain anchor (public):**

```
REDEEM ∥ asset_id ∥ V ∥ P
```

— the coin's anchor payload `P = H("bind" ∥ nf ∥ ctx)` (as in transfers, §4.7), with
its `asset_id` and value `V` made public at burn time. (Mints and redeems remain
*tagged*: their amounts must be publicly readable for the supply audit of §4.9, so
camouflage does not apply to them — only to transfers.)

**Proof:** the redeem predicate proves ownership and nullifier correctness as in a
transfer (items 1 and 3 of §4.5 for the single input), plus that the coin's committed
value equals the public `V`, plus PCD recursion over the coin's ancestry. The issuer
completes off-chain settlement only after the `REDEEM` anchor is final (§4.7).

### 4.7 Anchoring, context binding, and double-spend resolution

All anchors are payload in ordinary Bitcoin transactions (OP_RETURN, or a Taproot
data-carrier; 64 bytes each). A raw anchor record is just bytes, and bytes can be
*copied*: without further structure, a mempool observer could front-run any anchor
with a byte-identical one and win the first-occurrence race, freezing the victim's
coins (a griefing attack, analyzed in §5.3). OpenCSV therefore keeps the raw
nullifier off-chain and publishes only a **context-bound payload**:

- The coin's owner computes the raw nullifier `nf` as in §4.3 and, when
  constructing the anchor transaction, takes `ctx` from the transaction's input
  side (in the reference implementation: the funding input's outpoint) and
  publishes the payload `P = H("bind" ∥ nf ∥ ctx)`. The consignment carries `nf`
  (it is part of the proof's public data, which is already off-chain).
- A record is an **occurrence of `nf`** in a transaction `T` iff
  `P == H("bind" ∥ nf ∥ ctx(T))`. Checking this requires knowing `nf` — so
  occurrences of a coin are recognizable to the coin's owner and to consignment
  recipients, and to nobody else (by design; see the scoping note below).
- A mempool copier sees only `P`. Copying it into their own transaction fails the
  check (`ctx` differs), and recomputing the payload for their own context
  requires `nf` — a preimage attack on `H`. The one thing a copier cannot
  reproduce is the input side of the victim's transaction: their copy must spend
  their own UTXOs. The reference wallet therefore reserves and fixes funding
  input zero before proof generation, signs locally, persists the signed bytes,
  and can relay that complete transaction through any generic peer.

**The marker output.** Every newly created anchor transaction additionally carries
a small, protocol-constant **marker output**: dust (546 sats) to
`OP_0 ∥ sha256(OP_RETURN)` — a P2WSH unspendable script, identical for every
anchor. The marker's only
job is *discovery*: BIP157/158 basic block filters exclude OP_RETURN outputs but
include ordinary scriptPubKeys, so a wallet syncing compact filters can find
anchor-bearing blocks trustlessly (§4.7.2). It carries no authority — the
occurrence semantics above never consult it — so a griefer "copying" the marker
into their own transactions merely volunteers their own fee money to cause a
wallet a wasted block download. (More precisely: fake markers let an attacker
influence a scanning wallet's *block-download rate* — one full block per fake
marker — bounded by their willingness to burn dust and fees; costly to sustain,
and never correctness-affecting.) Nothing about the marker involves
elliptic-curve
cryptography (P2WSH is script-hash based), keeping the entire anchor format
within the post-quantum envelope of §5.7.

The complete anchor format (network order):

```
Input(s):   funding UTXO(s) — vin[0] is the ctx (SHA-256(txid ∥ vout_le))
Output 0:   OP_RETURN ∥ <64-byte record>
Output 1:   546 sats → OP_0 ∥ sha256(OP_RETURN)    (constant marker)
Output 2..: change
```

The historical marker `OP_0 ∥ sha256(OP_TRUE)` was filter-visible but
anyone-can-spend. A live signet observer spent it and pinned its parent against
ordinary BIP125 replacement. Readers retain exact version-2 compatibility, but
new constructors emit only version 3 with the unspendable marker; historical
manifests cannot begin a new replacement epoch. Marker authority remains zero
in either version—the migration closes a fee-bump/liveness flaw, not an
OpenCSV-validity flaw.

The rules that turn anchors into finality:

1. **First occurrence wins.** The authoritative spend of a coin is the first
   occurrence of its `nf` — i.e. the first record satisfying
   `P == H("bind" ∥ nf ∥ ctx(T))` — in the canonical chain order (block height,
   then in-block position). Any later occurrence of the same `nf` is invalid and
   ignored. Records that match no `nf` the verifier knows are inert noise.
2. **Finality depth.** A payment is accepted as final once its anchor has *k*
   confirmations (`k = 6` by default, an application parameter), making reordering
   economically prohibitive.
3. **Recipient's check.** A recipient verifies, against their own Bitcoin view (full
   node, or compact-block-filter light client): (a) the anchor transaction exists at
   the claimed position and its payload recomputes from the consignment's `nf` and
   the transaction's context; (b) no *earlier* occurrence of the same `nf` exists —
   i.e. no earlier record `P'` with `P' == H("bind" ∥ nf ∥ ctx(T'))`. Check (b) is a
   scan with one hash per candidate record; clients can maintain a local occurrence
   index incrementally over their own coins, and the index is
   deletable/rebuildable data, not secret state.

Because a coin determines exactly one `nf`, an attempted double-spend cannot produce
two *different* valid spends; it can only race two occurrences of the *same* `nf`
(each deliberately constructed by the coin's owner under its own context — distinct
payloads on-chain, but recognizable as the same coin to anyone holding `nf`), which
rule (1) resolves deterministically. A sender who double-spends therefore
succeeds in defrauding a recipient only if they can get a conflicting anchor
confirmed first *and* the victim accepts before finality — the standard 0-conf
hazard, removed by rule (2). A *copier*, by contrast, can produce neither a valid
occurrence of the coin nor any record the recipient will heed.

**Scoping note.** Because occurrence recognition requires `nf`, double-spend
conflicts are visible to the coin's owner and consignment recipients — not to
arbitrary third parties. This is a deliberate trade: it is what makes anchors
uncopiable, it costs nothing the recipients needed (each of them can check their
own leg), and it fits the client-side philosophy — validation happens where the
coins are. Public auditability of supply (§4.9) is unaffected, since it depends
only on the tagged mint/redeem stream.

### 4.7.1 Batching: combining many anchors into one transaction

The format above costs one Bitcoin transaction per anchor. Under the exact
reference weight bound, an all-OpenCSV 4,000,000-WU block every 600 seconds is
at most 7.32 solo operations/s—not roughly 100. **Batching** moves the unit of
accounting from transactions to per-participant envelopes by carrying many
payments' payloads in one transaction.
The frozen C1 protocol is co-funded and fail-closed:

1. A stock owner pre-creates a count-specific signed P2WSH stock outpoint.
   Spending it as input 0 fixes the one shared context `ctx` for the batch;
   output 2 returns its value and exact script unchanged.
2. Each of `N` participants contributes exactly one already-bound 24-byte
   payload, one confirmed native-segwit fee input, one fresh change script, and
   a maximum charge. Their wallet selects and durably reserves the fee outpoint;
   neither Swift nor a coordinator supplies coin selection or change.
3. Commitments are sorted canonically by fee outpoint. The exact transaction is
   fixed before signatures: input 0 is stock, inputs 1…N participant fees;
   output 0 is the 64-byte header, output 1 the unspendable marker, output 2 the
   unchanged stock, and outputs 3…N+2 participant change in the same order.
4. Every participant independently verifies the proposal, all public prevouts,
   payload/header/envelope equality, fee split, expiry, ordering, standardness,
   and their own durable reservation. Only then may it release `SIGHASH_ALL`.
   The typed verification receipt is bound to the exact batch, manifest, chain
   tip, and maximum age; a caller-supplied Boolean “verified” flag is not an API.
5. Replacement is unanimous. It preserves stock/context, membership, inputs,
   payload order, protocol outputs, and change scripts; only participant charges
   increase within each signed maximum. Recovery tracks every exact manifest,
   including earlier epochs whose signatures may still exist.

The coordinator is an ephemeral assembler with liveness power only. Any
participant can coordinate; any peer holding the complete transcript can
combine signatures and broadcast; nobody receives another participant's keys.
The current reference profile caps one batch at 64 participants because of
Bitcoin script/witness limits. That is not a universal transport quota; relay
quotas are local policy keyed to authorized relay, fee-key, outpoint,
operation, and payload identities.

C2 transports the two rounds over authenticated peer frames. Stock-key
authorization binds proposal bodies; fee-key authorization binds participant
commitment bodies. The TCP/CLI profile additionally binds a relay identity;
Signal binds the same authorized body to its authenticated sender and operation
context instead. An exact proposal reannouncement is idempotent; a different
body in the same session is rejected. Remote parse/authentication failures are
contained, storage/listener failures are fatal, and prefix/body reads share one
absolute deadline. No OpenCSV-specific coordination server is required.

Occurrence semantics remain unchanged: an occurrence of `nf` is a payload `P`
in a batch envelope with `P == H("bind" ∥ nf ∥ ctx)` and a header commitment
that recomputes over the ordered envelope. Recipients name
`(txid, envelope_index)` instead of a solo anchor position. Batch members are
co-timed, so composition should be treated like coinjoin participation.
The normative transcript, threat model, golden vectors, fee formula, and abort
rules live in
[`BATCHING_V2.md`](https://github.com/opencsvnet/opencsv-rs/blob/main/BATCHING_V2.md).

### 4.7.2 Client chain views: scan-first indexing

How does a wallet — especially a phone — obtain the chain data that `Accept`
needs? The design rule is that the default path requires **no trust in anyone**,
and any service that makes it faster is optional and verifiable.

**Self-scan (the default, trustless).** The wallet maintains a local occurrence
index by continuous background sync: it verifies the header chain's
proof-of-work, downloads BIP157/158 compact filters (~kilobytes per block), and
matches the protocol-constant marker script (§4.7). Every block whose filter
*lacks* the marker provably contains no anchor; the handful of candidate blocks
(on anchor days) are fetched from any peer and merkle-verified against the
headers. Candidate records with their funding `ctx` go into the local index;
the double-spend exclusion check — "no earlier occurrence of this coin's `nf`"
— is then a *local* evaluation of `H("bind" ∥ nf ∥ ctx)` over the index, at
receive time, with no network access and no third party involved. The sync
window is bounded from below by the wallet's oldest coin birth (fixed by the
coin's proof chain); bandwidth is filter-size-dominated, not block-dominated.

Two properties of this path deserve emphasis. First, **privacy is structural**:
`nf` never leaves the device, so no indexer, peer, or server learns which coins
a wallet watches (naive query protocols leak exactly this). Second, the
**marker tension is resolved by authority separation**: an occurrence key that
is publicly matchable would be forgeable by a griefer (the duality that ruled
out filter-matching the payload itself), but the *marker* is publicly
matchable precisely because it carries no authority — copying it yields the
copier nothing.

**Point verification (same machinery).** Checking that a *claimed* anchor
exists — height, position, txid, record, `ctx`, `k` confirmations — uses the
same headers + merkle verification, fetching the single claimed block from any
peer. The anchor cannot be faked, moved, or misdated. (BIP158 filters are
irrelevant to this check: the height is already known, and they exclude
OP_RETURN outputs anyway.)

**Indexers as optional accelerators (never trust requirements).** A wallet that
wants to skip or shortcut a sync may query an *indexer* — a service that scans
blocks and serves per-block occurrence lists `(position, record, ctx)`. Such
lists are deterministic from chain data, which makes them safe to consume
without trust: the wallet cross-checks several independent indexers
(disagreement is fraud evidence, publishable), and can spot-verify any block's
list against its own SPV/merkle view at negligible cost. A desktop client can
act as its owner's personal indexer over a secure channel; the owner's full
node is one indexer among others, never a root of trust. Hiding an occurrence
from a wallet requires defeating the wallet's own self-scan, which is always
available — the accelerator optimizes latency, never correctness.

**Broadcasting anchors** is orthogonal and trustless by construction: the
signed transaction is handed to any number of nodes or public APIs for relay —
the worst any of them can do is not relay.

### 4.7.3 Performance model: computation, block space, and settlement

OpenCSV uses three different mechanisms because it has three different clocks.
Recursive PCD makes proof verification independent of coin-history length;
co-funded batching amortizes Bitcoin transaction overhead; provisional
acceptance can make a fully verified coin available while its exact parent is
still in the mempool. Provisional availability is not settlement and does not
reduce Bitcoin's confirmation interval.

The pinned reference fee model uses the pessimistic transaction weights

```
solo_weight       = 911 WU
batch_weight(N)   = 968 + 423N WU
solo_cost(N, r)   = N × (ceil(911 / 4) × r + 546) sats
batch_cost(N, r)  = ceil((968 + 423N) / 4) × r + 546 sats
```

where `N` is participant count, `r` is sat/vB, and 546 sats is the marker
output. The reusable stock principal is returned and is not counted as a fee.
At 5 sat/vB:

| participants | batch weight | solo total | batch total | saving | idealized full-block operations/s |
|---:|---:|---:|---:|---:|---:|
| 1 | 1,391 WU | 1,686 sat | 2,286 sat | −35.6% | 4.79 |
| 2 | 1,814 WU | 3,372 sat | 2,816 sat | 16.5% | 7.35 |
| 8 | 4,352 WU | 13,488 sat | 5,986 sat | 55.6% | 12.25 |
| 32 | 14,504 WU | 53,952 sat | 18,676 sat | 65.4% | 14.67 |
| 64 | 28,040 WU | 107,904 sat | 35,596 sat | 67.0% | 15.15 |

The full-block column is
`floor(4,000,000 / weight) × operations-per-transaction / 600`. It is a
theoretical saturation upper bound, not a prediction: Bitcoin block space is
shared, block intervals vary, and real transaction mixtures are not all
OpenCSV. Batching is therefore approximately a 2.07× raw operation-capacity
improvement at `N=64`, not a 64× claim. Its larger practical effect is fee
amortization and shared settlement.

For unconfirmed chaining, a child consumes an off-chain OpenCSV coin, not the
parent anchor's Bitcoin UTXO. The child normally uses a separate confirmed fee
UTXO, so ordinary Bitcoin mempool ancestor/descendant limits do not directly
describe the asset dependency chain. Replacement or disappearance risk still
cascades through the wallet's explicit parent graph: exact parents are
re-observed after selection and immediately before signing, and missing parents
freeze every dependent operation.

The versioned source rows are published at
[`web/data/bitcoin-performance-v1.json`](../web/data/bitcoin-performance-v1.json)
and CI reruns the fee-model example at the pinned Rust revision before accepting
changes to this paper or the public explainer.

### 4.8 Consignment format and receiver verification algorithm

The **consignment** is the off-chain message from sender to recipient:

```
consignment := (
    coin_openings  = [(asset_id, v_i, owner_i, r_i)],   # recipient's outputs
    proof          = π,                                  # PCD proof for the tx
    anchor_ref     = (txid, block_height, position),     # L1 anchor location
    aux            = genesis G (if asset unknown to recipient)
)
```

**Receiver verification algorithm** `Accept(consignment)`:

1. **Parse & type-check.** If `aux` present, recompute `asset_id` from `G` and check
   it matches the openings; pin `G` if new (user confirmation for unknown assets).
2. **Proof check.** `Π.Verify(vk_tx, x, π) = 1` for the transaction type's `vk`, with
   public input `x` reconstructed from the anchor data and openings.
3. **Anchor check.** Recompute `H("bind" ∥ nf ∥ ctx)` from the proof's nullifier
   and the exact carrying transaction (§4.7). For settled acceptance, verify
   the claimed chain position, ≥ *k* confirmations, and no earlier occurrence.
   For provisional acceptance, require the exact transaction to be observable
   in the mempool, use the wallet's verified confirmed-history snapshot as the
   exclusion prefix, validate canonical layout and replacement policy, and
   persist the exact parent txid as a dependency. Cross-check and caller-supplied
   snapshots cannot grant provisional authority.
4. **Ownership check.** The recipient's own key derives `owner_i` for at least one
   output; record the coins and the consignment in local storage.
5. **Accept.** Credit as `available-unconfirmed` only under the provisional
   capability above, or as `settled` after the confirmation policy. Attachment
   transport alone remains `confirming` and non-spendable. Missing/replaced
   provisional parents freeze the credit as `needs-attention`. Reject (and
   alert) on any cryptographically terminal failure.

Steps 2–4 are the entirety of consensus participation for a recipient: one proof
verification (constant time), one point lookup plus a bounded scan against Bitcoin
(no full-chain validation unless the user chooses to run a full node).

### 4.9 Supply auditability

Define the public per-asset supply at height `h`:

```
supply(asset_id, h) =  Σ V  over MINT anchors with this asset_id up to h
                     − Σ V  over REDEEM anchors with this asset_id up to h
```

Anyone with Bitcoin block data computes this with a linear scan — no proofs, no
issuer cooperation, no trust. Conservation (§4.5 item 2) guarantees that shielded
transfers neither create nor destroy value, so the transparent mint/redeem stream
fully determines supply. This gives the attestation workflow issuers already perform
("reserves ≥ outstanding supply") a trustless right-hand side.

### 4.10 Client wallet, custody, and recovery boundary

This section's custody and transaction rules belong to the Rust reference
wallet. The Signal fork and temporary Swift bridge used in the public film are
a separate demonstration adapter for showing a consumer dollar-payment
experience to Signal's team. They are not a supported production ABI, an
upstream commitment, or part of the formal-verification claim. Signal-specific
details below document that prototype's acceptance work rather than define the
OpenCSV protocol boundary.

The reference product architecture keeps custody and Bitcoin policy in Rust,
not in the messaging UI and not in an OpenCSV server. One random 32-byte
OpenCSV account root derives domain-separated owner and BIP84 fee-wallet
branches. Issuer authority is deliberately absent from Signal and lives in a
separate opt-in headless operator. The Bitcoin branch is a **protocol fee reserve**: callers may inspect
its address, balance, UTXOs, confirmations, fees, and explorer evidence, but no
API can send arbitrary BTC. In Signal it can be spent only while constructing
an OpenCSV transfer or invariant-preserving fee replacement; the separately
featured issuer tool owns its own minting wallet and authority.

The host submits actions—asset, recipient, amount, and fee policy—not WIF keys,
fee outpoints, coin selection, change addresses, or raw transactions. The Rust
wallet durably reserves both asset coins and fee UTXOs, fixes input 0 before
proof generation, derives change, validates the exact input/output layout,
persists signed bytes before relay, and journals the operation through:

```
planned → fee_reserved → proof_ready → signed_persisted → broadcast
        → mempool → confirmed → consignment_delivered
```

The interactive messaging boundary is deliberately earlier than
`proof_ready`. Rust may first persist an exact `planned` intent containing the
asset, recipient, and amount without selecting an asset coin or Bitcoin
outpoint. Signal atomically stores the conversation metadata and enqueues an
authenticated message that labels the payment pending and non-spendable. The
UI may then return to the conversation while one serialized recovery worker
resumes proof generation, checkpoint protection, signing, relay, and final
proof-bearing delivery under the same operation identifier. A restart resumes
the journaled state; a terminal Rust rejection creates one idempotent failure
follow-up rather than an indefinitely pending payment.

This is latency hiding, not optimistic acceptance. The first message is a
transport-level intent and creates no recipient coin, balance, or spendability.
Only the ordinary provisional or settled accept path—proof, owner, binding,
exact parent transaction, layout, and exclusion checks included—may credit a
spendable coin.

Cancellation is allowed only before broadcast. A replacement may reduce the
original change but must preserve funding input zero, context, record, marker,
output positions, and change destination. Generic Bitcoin wallet fee-bump
behavior is not assumed protocol-safe.

Public Esplora data may accelerate address history, UTXO discovery, fee hints,
and explorer links. Before proof/signing, spend-critical state is independently
revalidated through proof-of-work headers, BIP158 filters, merkle-checked full
blocks, and multiple peers on public networks. Signed transactions are relayed
directly to multiple Bitcoin peers; a generic relay may be fallback transport,
but there is no bespoke anchor server.

Recovery uses a versioned checkpoint plus the account root in Signal Secure
Backups; the BDK chain database is rebuildable cache. Only the primary device
receives signing material. Linked devices receive watch descriptors and public
identities. Because iOS can restore Keychain state onto another phone, the
account root alone cannot establish primary authority: Rust also binds the
database/checkpoint to a separate 32-byte value stored in a non-migratable
`ThisDeviceOnly` item. Missing or mismatched binding opens read/export-only,
the missing state is sticky, and authority moves only through an explicit
recovery/rekey procedure.

Transport retries are likewise not payment identities. Receive first decodes
and canonically re-encodes the consignment, then hashes the canonical bytes for
one verdict/render key shared by accepted and rejected outcomes. Attachment IDs
and delivery-attempt nonces never create a second credit or payment bubble.

---

## 5. Security Analysis

### 5.1 Inflation soundness

**Claim.** Except with negligible probability, any coin accepted by `Accept` traces to
a mint carrying valid authorization from the asset issuer, and total created value
per asset equals the sum of publicly anchored mints minus public redemptions.

**Argument.** Induction over the PCD tree. Base case: a mint proof verifies only if
the mint predicate held — including issuer-authorization validity (§4.4 item 1) and
`Σ v_i = V` (item 3) — by soundness of `Π` and unforgeability of `Σ`. Inductive step:
a transfer proof verifies only if each input's predecessor proof verifies (recursion
condition) *and* per-asset input/output sums match with range-checked values
(§4.5 items 2, 4), so the total per-asset value across the cut of the tree is
preserved. Redeem is analogous, moving value from shielded form into a public
negative term. Hence the only sources of per-asset value in any accepted coin's
ancestry are issuer-authorized mints, and the public stream bounds total supply exactly
(§4.9). The quantitative bound reduces to the soundness error of `Π` (FRI-based,
negligible in `λ`) and the unforgeability property of `Σ`. In the v3 reference
instantiation, that latter boundary reduces to proof soundness and the secrecy/
preimage resistance of the genesis-bound issuer seed rather than EUF-CMA of a
standalone signature.

The issuer itself cannot inflate *covertly*: every mint must anchor its amount
publicly (the mint predicate's public input includes `V`, and the recipient checks
proof-public-input consistency with the anchor). An issuer operating with a
compromised or misused key can inflate *visibly* — which the next subsection and §5.5
address.

### 5.2 Double-spend resistance

**Claim.** Two recipients cannot both finally accept spends of the same coin.

**Argument.** A coin fixes one commitment `C` (binding) and one owner key; the
nullifier `nf = H("null" ∥ osk ∥ C)` is therefore unique per coin and computable only
by the owner. Any spend — transfer or redeem — must anchor an occurrence of `nf`
on-chain (checked in `Accept` step 3). Two conflicting spends of one coin must both
anchor occurrences of the *same* `nf` (distinct payloads, since their contexts
differ — but both recognizable to anyone holding `nf`, i.e. to each victim); the
first-occurrence rule (§4.7) declares exactly one of them authoritative,
and both recipients cannot see their own anchor as the first occurrence at finality
depth. A recipient who waits for *k* confirmations before accepting is protected up
to a Bitcoin reorg deeper than *k* — the standard L1 finality assumption, identical
to accepting an on-chain BTC payment.

A recipient may instead grant **provisional availability** to one exact mempool
transaction after the checks in §4.8. That recipient consciously accepts
replacement/disappearance risk before settlement. The wallet persists the
parent txid, re-observes it after selection and immediately before any dependent
signature, and freezes the coin and its descendants if the parent changes.
This improves payment availability, not finality; two conflicting descendants
cannot both become settled first occurrences.

Note the asymmetry with account-based shielded systems: there is no global nullifier
*set* that consensus maintains; uniqueness is enforced by clients observing a public,
append-only log whose ordering they already trust.

### 5.3 Griefing and denial of service

The anchor layer is public and permissionless, which invites attacks that aim not to
steal but to *disrupt*. We analyze the three that matter.

**(a) Copy-griefing (front-running an anchor with a byte-identical copy).** A raw
anchor record is only bytes; anyone watching the mempool can copy a record into
their own transaction and race it to confirmation. Under a naive first-occurrence
rule the copy could win, and the effect is worth stating precisely: it is *burn,
not theft*. The attacker gains nothing — they hold 64 bytes, not the coin openings
or proofs — but the victim's nullifier is consumed by a garbage anchor, so the
legitimate consignment can never be accepted and the value freezes.

The §4.7 construction eliminates the attack class, and it is worth being precise
about *why*, because the naive version of the fix fails: a publicly self-consistent
binding such as `H(nf ∥ ctx)` published alongside `nf` would be **recomputable by
the griefer** (both inputs are on-chain), leaving the attack intact. What actually
works is keeping `nf` itself off-chain: the payload is `P = H("bind" ∥ nf ∥ ctx)`,
so the griefer sees only `P` — copying it fails under their different `ctx`, and
recomputing the payload for their own context requires `nf`, a preimage attack on
`H`. Occurrence recognition is thereby restricted to parties who know `nf` (owner
and consignment recipients), which is also what makes transfer anchors
uncopyable *and* unlinkable by outsiders. What remains is the *race between two
deliberate anchors* — i.e. a double-spend attempt by the coin's owner, resolved by
first occurrence as in §5.2. Residual cost model: even before the fix,
each grief cost the attacker a Bitcoin fee with no amplification; after the fix
there is no grief to pay for.

**(b) Censorship (miners refusing OpenCSV anchors).** If anchors are trivially
identifiable, a miner or cartel can refuse to mine them — a system-wide liveness
failure in which nothing is stolen and no coins are burned (un-anchored coins
remain valid in their owners' hands) but transfers halt. Here the marker output
(§4.7) is a deliberate, declared trade: it makes anchors *identifiable by
design* — to wallets, and unavoidably to censors too — in exchange for
trustless discovery. The mitigations are therefore: (i) *dilution* — the marker
is an unremarkable unspendable P2WSH script that other protocols can share. A
non-conforming deployment could omit it only by also giving up the standard
scan-first discovery profile and falling back to full-block discovery; no
occurrence semantics grant the marker authority. (ii) *economics* —
censoring miners forfeit the anchor fees, so sustained censorship requires a
majority cartel, at which point Bitcoin's own neutrality is already
compromised; (iii) honest acknowledgment that no anchor-based scheme fully
removes this assumption — OpenCSV shares it with every data-carrier protocol.

**(c) Nuisance floods.** Fake consignments can cost a recipient one proof verification
(15–22 ms measured for current v3 shapes) each — nuisance-level, comparable to message spam. Spam anchors
bloat the nullifier index linearly, but every spam byte is paid for at fee-market
rates and first-occurrence lookups are indexed, so the cost to victims grows only
with the attacker's spend. Mempool spying itself leaks no amounts, assets, or
counterparties (§5.4); what it does expose is the *anchorer's* fee-paying UTXOs —
Bitcoin-level metadata about the sender, never about the recipient.

### 5.4 Privacy

**Hidden:** amounts and owners of mint outputs, transfer inputs/outputs; the
per-transfer link between consumed nullifiers and created coins (consignments are
off-chain and confidential); asset IDs inside transfers.

**Public:** context-bound payload records (pseudorandom, unlinkable to coins without
the raw nullifier), mint and redemption events with `(asset_id, V)`, timing of anchors, and —
unavoidably — whatever the off-chain transport leaks (§7 discusses using Signal so
that transport metadata is minimized and end-to-end encrypted).

**Bounds.** Privacy is against *passive chain observers* and *other users*. It is not
claimed against: (a) the issuer, who learns redemption amounts and may learn mint
recipients operationally (KYC'd issuance); (b) counterparties, who obviously know
their own payments; (c) global network adversaries correlating anchor timing with
off-chain activity — the same limitation every anchor-based system has, mitigated by
batching and decoy anchoring, which we leave to future work. Amount-hiding relies on
the hiding property of `H`-commitments with uniform `r`; unlinkability relies on
`H`'s pseudorandomness and on recipients never reusing `r` or `owner` keys (one-shot
addresses by default).

### 5.5 Failure modes and mitigations

- **Issuer key compromise.** An attacker (or rogue issuer) can mint visibly. Detection
  is trivial (public mint stream); response is governance-level: publish a new genesis
  with a rotated key and a cutoff height; clients pin the new `G`. Old-asset units
  minted past the cutoff are identifiable and can be refused by counterparties. This
  is strictly better than opaque-ledger inflation, which may never be detected.
- **Consignment non-delivery / data loss.** If the sender anchors a spend but the
  recipient never receives the consignment, the anchored coins exist but are
  unusable by that recipient until delivery. The sender can re-send the same
  canonically identified consignment; delivery-attempt IDs do not create a second
  payment. A prepared operation may be cancelled only before broadcast. After
  broadcast, recovery resumes the durable journal and delivery rather than silently
  constructing a conflicting "abort." Recipients back up coin state and compact
  checkpoints through the account recovery mechanism.
- **Nullifier spam.** Anchoring costs Bitcoin fees; an attacker can only pollute the
  nullifier space economically at fee-market prices, and spam nullifiers conflict
  with nothing (they correspond to no valid coin). The recipient's scan cost grows
  linearly with *total* anchored bytes, not with spam specifically.
- **L1 reorgs.** Treated as in any anchored system: wait for *k* confirmations; on a
  deep reorg, re-evaluate first occurrences.
- **Provisional-parent disappearance or replacement.** A verified unconfirmed
  coin is spendable only while the exact parent remains observable. Every child
  journals its parent txids and rechecks them immediately before signing.
  Disappearance removes the coin from balance and selection, freezes dependent
  provenance durably, and surfaces `needs-attention`; it never silently falls
  back to an indexer assertion or a different transaction. A normal settled
  replay is the only path that thaws a frozen coin.
- **Proof-system or hash break.** Catastrophic (counterfeiting). Mitigation is
  conservative parameterization (including the runtime-enforced 94-bit proven FRI
  floor and a separate 128-bit hash target) and
  the fact that supply inflation remains *detectable in principle* via audits that
  re-check proofs — the transparent mint stream bounds the *legitimate* supply, and
  any counterfeit coin still needs a valid-looking anchor and consignment, keeping
  attacks attributable and the blast radius observable.

### 5.6 Parameter notes

Poseidon2 over BabyBear has received less cryptanalytic attention than SHA-256;
this is the same trade-off modern STARK systems make for in-field efficiency.
Proof lineage v3 uses quartic BabyBear challenges, 8× LDE, maximum folding arity
4, 64 FRI queries, 16-bit grinding per commit round, and 16-bit query grinding.
The executable Plonky3 proven-security calculator is evaluated on each proof's
actual trace degrees with a union margin; verification fails below a published
**94-bit adjusted floor**. The separate Poseidon2 collision target is 128 bits.
These are concrete accounting inputs, not an independent cryptographic audit.

### 5.7 Post-quantum considerations

No discrete-logarithm or pairing assumption is load-bearing in OpenCSV's own
v3 asset-validity layer. The honest term remains *plausibly post-quantum*:
parameter sizing and underlying hash/proof assumptions still matter, and Bitcoin
itself uses classical signatures.

- **Hashes (commitments, nullifiers, owner keys, asset IDs).** All are Poseidon2.
  Security rests on preimage and collision resistance, against which the best
  generic quantum attack is Grover search (quadratic). A conjectured 128-bit
  classical level therefore degrades to roughly 64–85 bits against a large
  fault-tolerant quantum adversary, depending on the exact claim (preimage vs
  collision) and digest sizing. If post-quantum security is a hard requirement
  rather than a hedge, digest sizes and state width should be bumped accordingly —
  cheap to do with an AIR-native hash compared to any curve-based alternative.
- **Proofs.** FRI's soundness relies on collision resistance and code distance, not
  on any number-theoretic assumption, and it has a transparent (trapdoor-free)
  setup — the same reasons STARKs are described as plausibly post-quantum [6, 7].
- **Issuer authorization.** Legacy off-circuit Ed25519 records are classical and
  cannot create v3 mints. V3 instead proves knowledge of the Poseidon2-derived
  issuer seed inside the mint PCD circuit and binds the exact statement. This is
  a hash-native authorization artifact, not a standalone conventional signature.
- **Outside our control.** The Bitcoin anchor layer itself relies on ECDSA/Schnorr
  signatures; a quantum break of Bitcoin would affect OpenCSV's ordering/finality
  substrate but is a Bitcoin-level event, not something this scheme introduces or
  can fix. The Signal transport already deploys hybrid post-quantum key agreement
  (PQXDH), and its symmetric ratchet is hash-based.

We stress what this does *not* claim: Poseidon2's resistance to quantum
cryptanalysis is an assumption like any other, and "plausibly post-quantum" is the
honest term — no proof system or hash in this design carries a quantum security
*proof*.

### 5.8 Out of scope (this version)

Issuer-enforced freezing/clawback predicates, confidential mint amounts
(zero-knowledge supply proofs instead of transparent mints), silently fungible
multi-issuer composites, and
denominational/privacy interoperability with on-chain BTC (BitVM-style two-way
bridges, which Shielded CSV already sketches). The predicate architecture
accommodates all of these as additional transaction types without changes to the
anchoring or recursion layer.

Sequential payments inside one underlying Bitcoin transaction are also future
work. The current protocol can batch independent participants and can chain
verified unconfirmed OpenCSV coins across separate fee anchors. Combining
Alice→Bob and Bob→Carol inside one transaction additionally requires
intra-batch proof dependency ordering, context semantics, proof-generation
timing, fee responsibility, replacement rules, and an explicit version boundary.

---

## 6. Formal Verification Status and Roadmap

The security argument of §5 has three load-bearing parts: the state machine (genesis →
mint → transfer* → redeem), the value-conservation invariant, and nullifier
uniqueness. These are *protocol logic* — independent of the SNARK — and are amenable
to mechanized proof.

**Specification ledger (implemented):** a dependency-free Lean 4 development
with 72 sorry-free, CI-audited declarations covering:

1. **Abstract interfaces** — commitment scheme, signature scheme, PRF, each with its
   security property stated as an explicit hypothesis (binding, EUF-CMA,
   pseudorandomness). The proof system `Π` is abstracted as a sound compliance
   predicate: if `Verify` accepts, the predicate held on some witness.
2. **Coin state machine** — inductive definition of valid coin traces mirroring §4.4–4.6.
3. **Theorems:**
   - **(T1) Inflation soundness** — every valid trace's per-asset net supply equals
     Σ mints − Σ redeems along the trace, and every mint node carries valid issuer
     authorization.
   - **(T2) Conservation** — transfer steps preserve per-asset totals.
   - **(T3) Nullifier uniqueness** — distinct spends of one coin emit identical
     nullifiers; hence any accepted double-spend yields an observable on-chain
     conflict.
   - **(T4) Receiver correctness** — `Accept` succeeds only on traces valid in the
     state machine, modulo the stated hypotheses.
4. **Correspondence documentation** — a mapping from each theorem to (a) the paper
   section and (b) the Rust predicate/circuit it abstracts, so the formal artifact
   stays honest about the gap between verified logic and unverified cryptography.
5. **V4 one-input forwarding** — seven declarations specialize the valid-step
   relation to one authenticated predecessor, one real nullifier plus an exact
   zero pad, recipient plus optional change, one context-bound anchor, and an
   unchanged live pool. A CI source-correspondence manifest is pinned to exact
   `opencsv-rs@9b9eca2` and fails if the Rust version tags, constraints,
   statement projection, or output ordering drift. It is a source-drift gate,
   not a proof of AIR/FRI equivalence.
6. **Recursive lineage and batching** — eleven declarations model recursive
   predecessor validity, edge matching, distinct inputs and nullifiers,
   current lineage, conservation, and fail-closed legacy behavior, on top of
   the reviewed batch semantics. They prove the state-transition model, not the
   encoding or verification of serialized recursive proof bytes.

The separate `formal-aeneas` project translates the pure Rust kernel and proves
15 audited declarations/refinements for binding, occurrence, first-occurrence,
and supply. The reproducible dependency/audit commit has a green hosted receipt
and was fast-forwarded to `formal-aeneas/main` without rewriting history. A4/A5
implement verify-then-adopt and a pure receiver-decision boundary on
`opencsv-rs/main`.

The completeness claim is intentionally **layered, not a percentage**. Protocol
state/value/scan/batch/lineage semantics are machine-checked. Four families of
pure Rust kernel decisions have a narrow translated refinement. The concrete
AIR/recursive prover is adversarially tested and source-shape gated, but not
proved equivalent to the Lean predicate. Poseidon2 and concrete FRI security,
Bitcoin consensus/finality, storage and crash safety, networking, issuer-key
operations, host-language adapters, and application lifecycle/UI remain
distinct external or tested trust surfaces. None of the 72 specification
declarations or 15 refinement declarations implies whole-wallet correctness.

---

## 7. Implementation Status and Roadmap

**Rust core and proof system (implemented on the reference main line).**
`opencsv-core` defines commitments, anchors, consignments, and the accept driver;
`opencsv-pcd` implements mint/transfer/redeem directly as AIR over BabyBear with
in-circuit FRI recursion; `opencsv-bitcoin` and `opencsv-cbf` implement real
Bitcoin transactions, proof-of-work headers, BIP158, merkle-checked blocks, and
rebuildable occurrence indexes. **No zkVM is used.** The end-to-end regtest
acceptance flow mints, transfers, rejects a double-spend, redeems, and audits
supply against real Bitcoin transactions.

Proof lineage v3 caches setup by complete circuit/setup/vk identity, binds the
issuer seed and exact mint statement in-circuit, hard-binds recursive predecessor
keys, rejects legacy proof/profile tags, and enforces the §5.6 floor. Release
measurements:

| proof | Apple M4 prove (warm) | verify | size | iPhone 16e prove (cold) |
|---|---:|---:|---:|---:|
| genesis mint | 102.35 ms | 14.80 ms | 535,705 B | 180.8 ms |
| v4 one-input / mint predecessor | 4.803 s | 20.38 ms | 788,068 B | 6.4353 s |
| transfer / mint predecessors | 7.77 s | 22.20 ms | 854,105 B | 11.253 s |
| transfer / node predecessors | 9.76 s | 21.38 ms | 841,464 B | 14.469 s |
| redeem | 4.71 s | 19.94 ms | 778,466 B | 7.283 s |

The older 46–56 KB, ~3.5 ms verification, and ~0.55–0.96 s phone rows used
two FRI queries and no grinding. They are retained as historical feasibility
evidence, not projections for v3. Proof size and native verification remain
history-independent; predecessor circuit shape changes the fixed cost. The
complete cold/warm table, security calculator inputs, and two iOS memory-killed
profiles are recorded in
[`BENCHMARKS.md`](https://github.com/opencsvnet/opencsv-rs/blob/main/crates/opencsv-pcd/BENCHMARKS.md).
Proof lineage v4 retains the same frozen FRI parameters and adds an explicit
one-input/two-output transfer circuit. It verifies one authenticated v3 or v4
predecessor, constrains the second nullifier slot to zero, and creates recipient
plus optional change outputs under exact conservation. This removes the need
for a fake padding coin in the ordinary “spend one received coin” wallet path.
New proofs carry the fail-closed
`opencsv-pcd-coin-v4-with-v3-fri94` verifier-set tag; authenticated v3 roots are
accepted only as migration predecessors, and changing an outer version byte
does not relabel a proof. The v4 row above is measured evidence for the proof
lineage now on `opencsv-rs/main` through `46a3e48`; it is not a product-release
claim. Current explicit proof gaps are multi-asset transfers
and distribution of an allowlist for accepted self-described root-circuit
commitments.

**Formal verification (specification and Rust adoption merged).** The
dependency-free Lean project has 72 sorry-free audited specification declarations,
including limb arithmetic, batching, scan-exclusion soundness, and the v4
one-input forwarding specialization. The separate
Aeneas project has 15 audited declarations on its default branch connecting
translated `opencsv-kernel` Rust to binding, occurrence, first-occurrence, and
supply specifications. A4/A5 adopt that kernel and a pure receiver-decision
boundary on `opencsv-rs/main`. Proof-system soundness, Poseidon2
cryptanalysis, chain backends, storage, and networking are not mechanized.
The public [interactive proof map](https://opencsv.net/web/formal.html) exposes
the exact declaration ledger, axioms, source correspondence, and gaps. Delivery
status lives separately in the [receipt-backed roadmap](https://opencsv.net/roadmap.html),
while throughput and fee claims live in the checked
[performance model](https://opencsv.net/scale.html); neither is presented as a
consequence of the Lean theorems.

**Scan-first indexing and readiness (implemented on main; release still gated).**
Wallets find marker-bearing blocks via compact filters, merkle-verify candidates,
and evaluate exclusion locally. A real consignment verified with no RPC/indexer
(320 filter bytes + 1,140 block bytes for the test window), and a hand-built
`bitcoin-cli` anchor was discovered by filter walk. Dated signet receipts cover
multi-peer cold/restart/same-session sync, fee modeling, the spendable-marker
failure, safe-marker migration, and the negative generic-fee-bump result. Those
receipts do not authorize release or mainnet.

**Co-funded batching (C0/C1/C2 implemented).** The normative v2/v3 transcript,
real multi-party regtest transaction, unanimous replacement, BIP158 discovery,
authenticated peer gossip, durable reservations, and exact-manifest recovery
are implemented. The newest adversarial fixes—historical-v2 live rejection and
one absolute frame deadline—are on `opencsv-rs/main`.
The C3 Lean model is also on `opencsv-formal/main`: exact participant/output
alignment, allocation and conservation, duplicate-field and reusable-output
guards, sign-time freshness, fail-closed versioning, and conforming replacement
were the 54-declaration C3 audit milestone. The subsequent v4 specialization
and follow-up audit work bring the current public ledger to 72 declarations at
`dc7e8eb`.

The checked fee model for that exact implementation is published as a
versioned JSON receipt and reproduced by documentation CI. At 5 sat/vB the
64-participant bound is 28,040 WU and 35,596 sats, versus 107,904 sats for 64
solo anchors. The resulting 67% saving and 15.15 operations/s theoretical
full-block upper bound are explicitly separated from measured network
throughput.

**Signal demonstration transport (real two-hop signet receipt; not a production
interface).** The current prototype exposes one permanently signet-only **Test USD** instrument,
with no monetary or redemption value. Signal can receive, send, and inspect
that reviewed instrument but cannot mint it; issuance remains a non-default
headless Rust capability. Its account wallet uses Bitcoin only as a protocol
fee reserve, has no bespoke anchor server, persists signed transactions before
relay, and carries consignments through Signal attachments.

For the simple consumer film recorded on 2026-08-08, Carol sent 1 Test USD to
Bob in signet transaction
`445c43cbe53a7e5e737a7e5c6ef26281c34998d283258e319bd9d9b4315400fd`,
confirmed at height 316765. Bob sent 1 Test USD back in
`6d85895fc516716f48a7b6ee41e2fd25f99a6698b67c9725f298e2c548ef49aa`,
confirmed at height 316766. mempool.space and Blockstream returned the same
confirmed block for each transaction. The published 36.288-second cut uses real
Bob and Carol simulator recordings. One-screen moments pair the real interface
with context; the handoff uses synchronized two-screen footage. Dead pauses are
removed while retained application action remains at normal speed. A moving
dot is disclosed as editorial motion explaining the encrypted consignment
path—not Signal UI or packet evidence. No application or transaction state is
reconstructed. Its SHA-256 is
`5a59058f94ce5863337a957e8ec21ef7d724a95520303902b91748d43fa89b0c`.

On 2026-08-07, two registered Signal simulators completed a real round trip.
Carol sent 25 Test USD to Bob in signet transaction
`e5ffe6076052e4bf98ba117d7122d79e21de14ed0992070c0dbe85da22dd9ee9`,
confirmed at height 316611. Bob then sent 10 Test USD back to Carol, preserving
15 Test USD as change, in transaction
`a3a3f4b12f71e3423801cea069e5251260aeae70fb9cfd133cd7aaefce12dc0a`,
confirmed at height 316620. Carol accepted the returning coin provisionally
before the second anchor confirmed and the UI labeled replacement risk. Both
anchors later settled.

The return operation took 328 seconds end to end in this development build.
The durable receipt attributes 6.237 seconds to local proving, 42 ms to local
signing and persistence, 1.826 seconds to two complete P2P socket submissions,
347 ms to the required pinned Blockstream raw-byte observation, 77.861 seconds
to funding verification, and 93.163 seconds to pre-sign verification. The
mempool.space observer was configured as `Observe`, timed out after 8.025
seconds, and did not count as required success. A complete P2P write is recorded
as submission, not mempool acceptance.

The merged Rust and Signal implementations supersede that
one-required-observer policy. Rust
`28010d8f714c361a6f4a94ded1ed8708affe70dd` derives an
omitted raw-byte quorum from every API marked `Require` and rejects an explicit
mismatch; Signal `db818658f1511eed0dc98df42affce1be78b486f` derives the same
count and exposes no caller override. In a warning-denied simulator test, both pinned providers
returned identical raw bytes for the known return transaction in 1.831 seconds.
The subsequent wallet-level rerun produced an actual unconfirmed parent and
child. Carol→Bob transaction
`2c3bc97c39615094486f8d1786974aed34ed426ba7d97a949890e073cfbf4786`
remained unconfirmed while Bob verified and selected its exact OpenCSV coin.
Bob→Carol child
`f77ff98673107a94391fd0509bfa8c2ec40e4551f62b7b6674319d8098d24554`
records that dependency and was also accepted before either provider reported
confirmation. For parent/child, mempool.space matched exact bytes in 256/239ms
and Blockstream in 377/359ms. Local proving took 6.096/5.995 seconds and
signing/persistence 23/18ms. Both operations survived a post-broadcast relaunch,
and protocol credit remained deduplicated at that checkpoint. This proves
sequential zero-confirmation forwarding across two Bitcoin transactions.

A fresh 2026-08-08 repeat exercised the same boundary with 45 Test USD in
parent `b8cf70152dfd84a85367e19fec1ace53c6ae6708147faba79b1d9d810b851269`
and 10 Test USD in child
`2fbec40ae4aaed063018ce3f3e56d7cdbc9a7372e24cafcbcd5ee78c3db0d286`.
Both required providers returned identical bytes while both were unconfirmed;
the child was therefore a real spend of provisionally accepted parent state,
not a replay of a confirmed run. Both later settled in signet block 316824.
Each transaction was 309 bytes, 909 WU, and paid 455 sats. Parent/child local
proving took 6.149/6.171 seconds; signing and persistence took 24/22ms.

The wider relaunch audit distinguished protocol credit from UI delivery. The
credit stayed deduplicated, but an outgoing attachment could be reinserted
after restart because Signal queried by the raw consignment id rather than the
canonical payment id. Signal PR #8 repairs that lookup. The same run found that
Rust's deterministic selector failed the whole send when its first candidate
was already spent on the verified chain, even if a valid alternate coin was
available. Rust PR #16 reconciles confirmed spends and retries selection. These
fixes are merged at Signal `1e3472b9` and Rust `908bbb53`; Rust PR and
post-merge CI are green. Signal `9b72d86d` pins the merged Rust SHA. Its PR-tip
default/recovery jobs passed, but its post-merge default Xcode job failed while
recovery passed. This is fix-forward integration evidence, not a release claim.

The same implementation completed the separate shared-transaction gate. Carol sent
5 Test USD to Bob and 5 Test USD to Note to Self under batch
`c3d0260082cea04e98a1a56d9e7713fb`. Operations
`afcaa691e4a0adb3cfd24a6f986400d0` and
`bc1850940e9e8f2c3af747aa60852725` share signet transaction
`771aefc62e38dae80b4fdeec5ebb183c5c4c53c7902b559991aa55679103c4c3`
and retain their exact envelope positions. Three peers recorded complete
submission writes, not mempool acceptance; both pinned APIs returned identical
raw bytes in 271/354ms. The 908-sat, 1,808-WU transaction later settled at
height 316687. Deliberate relaunches after proof and broadcast resumed the same
operation ids. This is a two-recipient Bob/Carol-plus-self receipt, not a
three-party payment.

A 1 Test USD Bob→Carol operation
`3d2210aeda489dfa33acbb00c92951b1` also completed one protocol-safe fee
replacement. Original transaction
`cb32fa1048b83d479fadf4aaa6160664e61170e95036ab5d4d3d57bdd0d98fd5`
at 2 sat/vB was replaced by
`4ae0f1c686977cfb270e94dc834043d4609283781b27e3bb47f222dde6cbd7f7`
at 5 sat/vB. The funding input, OpenCSV record, marker, change destination,
protocol context, output positions, and delivery identity remained protected.
Both observers report the replacement confirmed in signet block 316803 with
block hash
`000000110b921854bf388cfdfb480a73f5effb1a14603abcf2031dc47bcf72a5`
and return 404 for the original. Carol's balance increased once, from 131 to
132. Rust derives a
domain-separated identity from canonical proof-protected consignment bytes
after zeroing only the replaceable anchor txid; Signal uses that verified
identity to render one payment while retaining both exact attachments as
receipts.

The run also found local defects whose repairs are now merged in Rust: the
value gadget needed a signed low-limb borrow for `25 = 10 + 15`; confirmed
parents needed canonical snapshot handling instead of a mempool sentinel; and
corrupt cached BIP158 filters needed refetch/bad-peer failover. The live build
starts from Rust `3295cd5896aa2615c992faf45a9075ad138094ca` and Signal
`c14f02025daa557ca9149325dfc3199bced1012b`; the consolidated Rust branch was
fast-forwarded to `main` at `28010d8f714c361a6f4a94ded1ed8708affe70dd`
after hosted runs
[31231128052](https://github.com/opencsvnet/opencsv-rs/actions/runs/31231128052)
and
[31231129868](https://github.com/opencsvnet/opencsv-rs/actions/runs/31231129868)
passed on that exact SHA. Signal integration is merged at
`db818658f1511eed0dc98df42affce1be78b486f`. The exact Rust recovery-feature suite passes 71 tests
with two deliberate slow release-only ignores; the warning-denied Signal store
suite passes 27 tests and the full simulator app builds locally against the
exact Rust XCFramework. Post-merge recovery and OpenCSV wallet checks passed,
but the broad Xcode job stopped at the upstream Signal fixture assertion
`OWSSwiftUtils.swift:56: Missing attachment file`; a complete green
default-branch run remains a release gate. The live crash-state matrix,
clean-install recovery, and physical-device rollout remain open. The simple
36.288-second real-Signal cut described above is published on the project
homepage with SHA-256
`5a59058f94ce5863337a957e8ec21ef7d724a95520303902b91748d43fa89b0c`.

---

## 8. Related Work

| | global consensus validation | shielded transfers | auditable supply | issuer-gated issuance | trustless light verification | on-chain footprint / tx | fork-free on Bitcoin |
|---|---|---|---|---|---|---|---|
| ERC-20 on Ethereum | yes | no | yes | yes (contract logic) | no (trusted RPC) | full calldata | n/a |
| RGB | no (CSV) | partial (history visible to recipients) | per-contract, not public | yes | no (full history rescan) | 1 commitment (seal) | yes |
| Taproot Assets | no (CSV) | partial | per-asset proofs | yes | no (issuer proofs) | 1 commitment | yes |
| Zcash (Sapling/Orchard) | yes (own chain) | yes | no (turnstile audits only) | n/a (no issuer assets) | partial (lightwalletd, trusted) | full shielded tx | no |
| Shielded CSV | no (CSV) | yes | no | no | no (full scan or trusted indexer) | 64 B nullifier | yes |
| **OpenCSV** | no (CSV) | yes | **yes (transparent mint/redeem stream)** | **yes (in-circuit issuer predicate)** | **yes (marker + compact filters + PoW)** | 64 B bound record + marker | yes |

- **Client-side validation lineage.** Todd's client-side validation and single-use
  seals; RGB maximizes this philosophy with Bitcoin-UTXO-bound seals and full
  history verification by recipients. OpenCSV replaces history verification with PCD,
  trading RGB's minimal cryptography for constant-size, privacy-preserving proofs.
- **Taproot Assets** anchors asset state into Taproot trees with Sparse Merkle
  proofs of issuance/transfer; verification still involves per-asset proof chains
  and offers limited amount privacy. OpenCSV's recursion gives constant verification
  independent of history, and its supply audit is a public sum rather than an
  issuer-served proof.
- **Zcash** is the canonical shielded-amount design but requires global consensus on
  a dedicated chain and supports no issuer-gated assets; supply integrity relies on
  turnstile arguments rather than public auditability. OpenCSV borrows the
  commitment/nullifier skeleton and relocates validation to the client.
- **Shielded CSV** is the direct parent. OpenCSV differs by: issuer-bound issuance
  predicate with on-chain-transparent mint amounts; a redemption predicate closing
  the loop to the issuer; a public supply-audit function; a concrete choice of
  AIR-native recursion (Plonky3-style, no zkVM) as the PCD engine; and — the
  systems-level difference — a solution to light verification: Shielded CSV
  recipients must scan all anchored nullifiers (or trust an indexer) to check
  double-spends, while OpenCSV's marker output (§4.7) makes anchor blocks
  discoverable via compact block filters, so exclusion is checkable on-device
  against proof-of-work alone (§4.7.2).
- **Proof systems.** PCD (Chiesa–Tromer); STARKs and FRI (Ben-Sasson et al.); Plonky2's
  in-circuit FRI recursion and Plonky3's AIR framework; Poseidon (Grassi et al.);
  BabyBear/Goldilocks fields as deployed in modern high-throughput provers.

---

## 9. References

1. J. Nick, L. Eagen, R. Linus. *Shielded CSV: Private and Efficient Client-Side
   Validation.* Cryptology ePrint Archive, Paper 2025/068, 2025.
   https://eprint.iacr.org/2025/068
2. P. Todd. *Client-side validation / single-use seals.* 2013–2016.
   https://petertodd.org/2016/state-machine-consensus-building-blocks
3. RGB protocol documentation. https://docs.rgb.info/
4. Taproot Assets protocol (BIPs + Lightning Labs docs).
   https://github.com/lightninglabs/taproot-assets
5. A. Chiesa, E. Tromer. *Proof-Carrying Data and Hearsay Arguments from Signature
   Cards.* ICS 2010.
6. E. Ben-Sasson, I. Bentov, Y. Horesh, M. Riabzev. *Scalable, transparent, and
   post-quantum secure computational integrity* (STARK). ePrint 2018/046.
7. E. Ben-Sasson et al. *Fast Reed–Solomon Interactive Oracle Proofs of Proximity*
   (FRI). ICALP 2018.
8. Plonky2 / Plonky3 — Polygon Zero. https://github.com/Plonky3/Plonky3
9. L. Grassi et al. *Poseidon: A New Hash Function for Zero-Knowledge Proof Systems.*
   USENIX Security 2021.
10. Zcash Protocol Specification. https://zips.z.cash/protocol/protocol.pdf
11. presage — Rust Signal client library. https://github.com/whisperfish/presage
12. BabyBear field and prover deployments (e.g. RISC Zero, SP1 documentation;
    used here only as a field choice — OpenCSV uses no zkVM).

---

*OpenCSV is a working draft. Phases 1–3 (paper/site, Rust core with recursive PCD,
Lean 4 formalization) are implemented; §7 reports measured numbers. The separate
Signal/Swift demonstration is prototype evidence for discussion with Signal's
team, not Phase 4 of the production protocol.*
