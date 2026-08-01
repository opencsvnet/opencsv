# OpenCSV: Client-Side Verified RWAs, Stables, and More on Bitcoin

**Status:** Working draft (v0.1)
**Date:** 2026-07-31

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
OpenCSV transaction anchors 64 bytes of opaque data (a *nullifier*) in an ordinary
Bitcoin transaction. Everything else — coin commitments, validity proofs, amounts —
moves off-chain, delivered directly from sender to recipient in a *consignment*.

OpenCSV extends the CSV model with the machinery an RWA requires:

1. an **issuance predicate** that permits supply growth only under a signature from an
   issuer key bound into the asset's genesis parameters;
2. **transparent mints and redemptions**, so that total outstanding supply per asset is
   publicly computable by anyone, while user-to-user transfers remain shielded
   (amounts and counterparties hidden);
3. **proof-carrying data (PCD)** built from AIR-native recursive proofs over a small
   field — no zkVM — so that a recipient's verification work is constant in the length
   of a coin's history.

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
  validated predicates, anchored to Bitcoin L1 with a 64-byte on-chain footprint and
  no consensus changes.
- A privacy/auditability split — shielded transfers over transparent issuance — that
  keeps total supply publicly computable while hiding amounts and the transaction
  graph between users.
- A design for the validity proofs as **AIR-native recursive PCD** (Plonky3-style
  AIR over BabyBear/Goldilocks with Poseidon), avoiding zkVM overhead and non-native
  field arithmetic, targeting sub-second proving for the transfer predicate.
- A security analysis (inflation soundness, double-spend resistance, privacy bounds,
  failure modes) and a roadmap for mechanized verification of the protocol logic in
  Lean 4 and a Rust reference implementation with a Signal-based transport.

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
  shown is that first occurrence. At 64 bytes per transaction, Bitcoin's block space
  supports on the order of 100 Shielded CSV transactions per second, independent of
  how many coins each transaction consumes or creates.

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
| Issuer's mint key is uncompromised | supply integrity | unauthorized (but *visible*) inflation; users can exit |
| Sender delivers the consignment | recipient learns their coin | funds are anchored but unusable by recipient (liveness, not theft — see §5.5) |
| Recipient stores consignments durably | later spending | loss of funds (mitigated by backups/escrow) |

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
- `Σ` — an issuer signature scheme that is *AIR-friendly*: verification expressed
  natively over `𝔽` without non-native field arithmetic. Two candidate
  instantiations: Schnorr over an elliptic curve whose base field is `𝔽`, or a
  Poseidon-based hash signature for mint authorization (signatures appear only in
  mints, so even a comparatively heavy scheme is acceptable). The interface is
  `Σ.Verify(ipk, m, σ) ∈ {0,1}`; the concrete choice is fixed at implementation time.

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
  their own UTXOs. Relaying a fully-signed anchor transaction through any third
  party remains possible; a fee-service that *funds* the anchor must pre-commit
  its funding input to the sender off-band so the payload can be computed before
  proving.

**The marker output.** Every anchor transaction additionally carries a small,
protocol-constant **marker output**: dust (546 sats) to `OP_0 ∥ sha256(OP_TRUE)`
— a P2WSH anyone-can-spend script, identical for every anchor. The marker's only
job is *discovery*: BIP157/158 basic block filters exclude OP_RETURN outputs but
include ordinary scriptPubKeys, so a wallet syncing compact filters can find
anchor-bearing blocks trustlessly (§4.7.1). It carries no authority — the
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
Output 1:   546 sats → OP_0 ∥ sha256(OP_TRUE)      (constant marker)
Output 2..: change
```

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

### 4.7.1 Client chain views: scan-first indexing

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
3. **Anchor check.** The anchor in `anchor_ref` exists on-chain at the claimed
   position, its payload recomputes as `H("bind" ∥ nf ∥ ctx)` from the proof's
   nullifier and the carrying transaction's context (§4.7), has ≥ *k*
   confirmations, and — for transfers/redemptions — the nullifier(s) have no
   earlier occurrence.
4. **Ownership check.** The recipient's own key derives `owner_i` for at least one
   output; record the coins and the consignment in local storage.
5. **Accept.** Credit the balance. Reject (and alert) on any failure.

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

---

## 5. Security Analysis

### 5.1 Inflation soundness

**Claim.** Except with negligible probability, any coin accepted by `Accept` traces to
a mint carrying a valid signature of the asset's issuer key, and total created value
per asset equals the sum of publicly anchored mints minus public redemptions.

**Argument.** Induction over the PCD tree. Base case: a mint proof verifies only if
the mint predicate held — including issuer-signature validity (§4.4 item 1) and
`Σ v_i = V` (item 3) — by soundness of `Π` and unforgeability of `Σ`. Inductive step:
a transfer proof verifies only if each input's predecessor proof verifies (recursion
condition) *and* per-asset input/output sums match with range-checked values
(§4.5 items 2, 4), so the total per-asset value across the cut of the tree is
preserved. Redeem is analogous, moving value from shielded form into a public
negative term. Hence the only sources of per-asset value in any accepted coin's
ancestry are signed mints, and the public stream bounds total supply exactly
(§4.9). The quantitative bound reduces to the soundness error of `Π` (FRI-based,
negligible in `λ`) and the EUF-CMA security of `Σ`.

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
is an unremarkable anyone-can-spend script that other protocols can share, and
a deployment under censorship pressure may omit markers from its anchors at the
cost of losing filter discovery (falling back to indexer-assisted or full-block
scanning), since no occurrence semantics depend on it; (ii) *economics* —
censoring miners forfeit the anchor fees, so sustained censorship requires a
majority cartel, at which point Bitcoin's own neutrality is already
compromised; (iii) honest acknowledgment that no anchor-based scheme fully
removes this assumption — OpenCSV shares it with every data-carrier protocol.

**(c) Nuisance floods.** Fake consignments cost a recipient one proof verification
(~4 ms measured) each — nuisance-level, comparable to message spam. Spam anchors
bloat the nullifier index linearly, but every spam byte is paid for at fee-market
rates and first-occurrence lookups are indexed, so the cost to victims grows only
with the attacker's spend. Mempool spying itself leaks no amounts, assets, or
counterparties (§5.4); what it does expose is the *anchorer's* fee-paying UTXOs —
Bitcoin-level metadata about the sender, never about the recipient.

### 5.4 Privacy

**Hidden:** amounts and owners of mint outputs, transfer inputs/outputs; the
per-transfer link between consumed nullifiers and created coins (consignments are
off-chain and confidential); asset IDs inside transfers.

**Public:** the raw nullifier stream (pseudorandom, unlinkable to coins without the
opening), mint and redemption events with `(asset_id, V)`, timing of anchors, and —
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
  unusable. The sender can always re-send (they hold the data); the protocol should
  also support an "abort" — the sender re-spends the outputs back to themselves
  before the recipient accepts, at the cost of another anchor. Recipients must back
  up consignments (they are small); watchtower-style escrow of encrypted consignments
  is compatible with the design.
- **Nullifier spam.** Anchoring costs Bitcoin fees; an attacker can only pollute the
  nullifier space economically at fee-market prices, and spam nullifiers conflict
  with nothing (they correspond to no valid coin). The recipient's scan cost grows
  linearly with *total* anchored bytes, not with spam specifically.
- **L1 reorgs.** Treated as in any anchored system: wait for *k* confirmations; on a
  deep reorg, re-evaluate first occurrences.
- **Proof-system or hash break.** Catastrophic (counterfeiting). Mitigation is
  conservative parameterization (128-bit conjectured security, ample FRI queries) and
  the fact that supply inflation remains *detectable in principle* via audits that
  re-check proofs — the transparent mint stream bounds the *legitimate* supply, and
  any counterfeit coin still needs a valid-looking anchor and consignment, keeping
  attacks attributable and the blast radius observable.

### 5.6 Parameter notes

Poseidon over BabyBear/Goldilocks at 128-bit security is the current community
standard but has received less cryptanalytic attention than, say, SHA-256; this is
the same trade-off every modern STARK-based system makes for in-field efficiency, and
we inherit it. FRI soundness parameters (blowup factor, query count) are chosen for
≥ 100-bit conjectured security; exact numbers belong to the implementation
(§7) and will be reported with benchmarks.

### 5.7 Post-quantum considerations

No discrete-logarithm or pairing assumption is load-bearing anywhere in OpenCSV's
own design, so the scheme is quantum-*resistant* by construction rather than by
addon — with two honest caveats (parameter sizing, and the one classical component).

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
- **Issuer signatures — the caveat.** The prototype's off-circuit Ed25519
  signature is *not* post-quantum (Shor). Of the two production candidates in
  §4.1, embedded-curve Schnorr is likewise not, while the Poseidon-native
  hash-based signature (Winternitz/SPHINCS+ style) is both post-quantum and
  AIR-native. Selecting the hash-based option makes the entire OpenCSV layer
  quantum-resistant; it is the intended choice.
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
(zero-knowledge supply proofs instead of transparent mints), multi-issuer assets, and
denominational/privacy interoperability with on-chain BTC (BitVM-style two-way
bridges, which Shielded CSV already sketches). The predicate architecture
accommodates all of these as additional transaction types without changes to the
anchoring or recursion layer.

---

## 6. Formal Verification Roadmap

The security argument of §5 has three load-bearing parts: the state machine (genesis →
mint → transfer* → redeem), the value-conservation invariant, and nullifier
uniqueness. These are *protocol logic* — independent of the SNARK — and are amenable
to mechanized proof.

**Target:** a Lean 4 development (`formal/`) with:

1. **Abstract interfaces** — commitment scheme, signature scheme, PRF, each with its
   security property stated as an explicit hypothesis (binding, EUF-CMA,
   pseudorandomness). The proof system `Π` is abstracted as a sound compliance
   predicate: if `Verify` accepts, the predicate held on some witness.
2. **Coin state machine** — inductive definition of valid coin traces mirroring §4.4–4.6.
3. **Theorems:**
   - **(T1) Inflation soundness** — every valid trace's per-asset net supply equals
     Σ mints − Σ redeems along the trace, and every mint node carries a valid issuer
     signature.
   - **(T2) Conservation** — transfer steps preserve per-asset totals.
   - **(T3) Nullifier uniqueness** — distinct spends of one coin emit identical
     nullifiers; hence any accepted double-spend yields an observable on-chain
     conflict.
   - **(T4) Receiver correctness** — `Accept` succeeds only on traces valid in the
     state machine, modulo the stated hypotheses.
4. **Correspondence documentation** — a mapping from each theorem to (a) the paper
   section and (b) the Rust predicate/circuit it abstracts, so the formal artifact
   stays honest about the gap between verified logic and unverified cryptography.

Deliberately *not* mechanized (initially): the AIR/FRI soundness proof itself, and the
Poseidon security analysis — both are proof-system-level results better left to
dedicated formalization efforts.

---

## 7. Implementation Roadmap

**Phase 2 — Rust core (implemented).** `opencsv-core`: Poseidon2
commitments and nullifiers over BabyBear, issuer signatures, consignment
(de)serialization, the `Accept` driver. `opencsv-pcd`:
the recursive engine —
predicates (mint/transfer/redeem) written directly as AIR over BabyBear on top of a
Plonky3 0.6 stack, with in-circuit FRI verification (via the official
Plonky3-recursion crates) for the recursion step. **No zkVM anywhere.**
`opencsv-bitcoin`: the real anchor backend — OP_RETURN anchor transactions with the
funding-input binding of §4.7 (two-pass construction), block scanning with a
rebuildable occurrence index, selectable network (signet/mainnet/regtest) with no
fallbacks. Validated end-to-end on regtest (real anchor transactions: mint,
transfer, double-spend rejected by first occurrence at a real block location,
supply audited from chain data); signet read-path validated against a live node.

Measured results (reference machine: Xeon Gold 6526Y, 64 cores; release profile;
test-grade FRI parameters — production parameters are future work):

| proof | predecessors verified in-circuit | prove | verify | size |
|---|---|---|---|---|
| genesis mint | 0 | 64 ms | 3.2 ms | 46,431 B |
| transfer (2-in/2-out) | 2 | 2.97 s | 3.6 ms | 56,041 B |
| transfer, second hop | 2 | 2.96 s | 3.6 ms | 56,041 B |
| redeem | 1 | 1.47 s | 3.5 ms | 54,058 B |

Proof size and verification time are constant across history length — the defining
property of PCD, confirmed empirically. The end-to-end acceptance test (mint →
shielded transfer → double-spend rejected by first-occurrence → redeem → public
supply audit) passes against the real verifier. Known gaps vs this specification:
the issuer signature is currently verified off-circuit (an AIR-native signature is
the production target), transfers are single-asset, and predecessor verification-key
binding relies on call-site discipline pending upstream support. See
`crates/opencsv-pcd/BENCHMARKS.md` and `README.md` for details.

**Latency and scaling profile.** The user-facing cost of a payment decomposes into
three parts. (a) *Proving* is the sender's dominant computational cost: ~3 s per
transfer on the 64-core reference machine, independent of how many hops the coin
has already traveled (each proof verifies its predecessors' proofs in-circuit
rather than replaying history, so hop 1,000 costs what hop 2 costs — the table's
identical rows are the point). Proving is single-thread-bound at these circuit
sizes (1 core ≈ 64 cores measured), so single-core speed is what matters:
measured on-device, an iPhone 16e (A18) proves a transfer in ~550 ms and an
iPhone 17 Pro Max (A19 Pro) in ~670 ms — 3–5× faster than the 64-core server
reference, comfortably inside interactive-UX territory. (b) *Transport* is a ~56 KB off-chain message — sub-second over a
messaging channel. (c) *Anchoring/finality* is inherited from Bitcoin: the
nullifier anchor is visible in the next block, and recipients finally accept after
*k* confirmations (§4.7), exactly like an on-chain BTC payment. The recipient's
own work is ~4 ms of verification plus a nullifier lookup against a local
(rebuildable) index. Aggregate throughput is bounded by the 64-byte anchor: on the
order of 100 OpenCSV transactions per second if the entire Bitcoin block space
were available to them. Costs that *do* grow: circuit size with inputs/outputs
per transfer (the reference circuits are fixed 2-in/2-out), the nullifier index
linearly with total anchored bytes, and supply audits linearly with chain length
(a public, permissionless, one-pass scan).

**Phase 3 — Lean 4 formalization (implemented)** as specified in §6: theorems T1–T4
are mechanized in a dependency-free Lean 4 project (`formal/`), `sorry`-free, with
all cryptographic hardness assumptions isolated as labeled axioms (`#print axioms`
audit included).

**Phase 4 — Signal transport.** Consignments are dominated by the proof (~46–56 KB
measured), which fits comfortably in a Signal attachment (and even in a message
body), making a messaging transport natural: `opencsv-signal` will deliver
consignments as end-to-end encrypted Signal messages using presage (a native Rust
Signal client library), and `opencsv-cli` will expose the wallet as a text client —
send, receive, mint (issuer mode), redeem, balance, audit. Receiving an RWA
payment then literally looks like receiving a message; `Accept` runs on arrival and
the user is shown "verified" or "rejected". The Signal channel also gives sender
authentication and forward secrecy for the consignment, covering the
transport-privacy gap noted in §5.4.

---

## 8. Related Work

| | global consensus validation | shielded transfers | auditable supply | issuer-gated issuance | on-chain footprint / tx | fork-free on Bitcoin |
|---|---|---|---|---|---|---|
| ERC-20 on Ethereum | yes | no | yes | yes (contract logic) | full calldata | n/a |
| RGB | no (CSV) | partial (history visible to recipients) | per-contract, not public | yes | 1 commitment (seal) | yes |
| Taproot Assets | no (CSV) | partial | per-asset proofs | yes | 1 commitment | yes |
| Zcash (Sapling/Orchard) | yes (own chain) | yes | no (turnstile audits only) | n/a (no issuer assets) | full shielded tx | no |
| Shielded CSV | no (CSV) | yes | no | no | 64 B nullifier | yes |
| **OpenCSV** | no (CSV) | yes | **yes (transparent mint/redeem stream)** | **yes (in-circuit issuer predicate)** | 64 B nullifier | yes |

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
  the loop to the issuer; a public supply-audit function; and a concrete choice of
  AIR-native recursion (Plonky3-style, no zkVM) as the PCD engine.
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
Lean 4 formalization) are implemented; §7 reports measured numbers. Phase 4 (Signal
transport) is in progress.*
