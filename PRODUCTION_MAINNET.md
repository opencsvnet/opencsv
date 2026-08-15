# Production USD and mainnet activation contract

Status: **design review only**. Nothing in this document activates a product,
names a production issuer, authorizes a release, or permits a mainnet
transaction.

This is the boundary between the permanent signet Test USD demonstration and a
future issuer-backed production USD product. It exists so a build cannot become
"production" merely by changing a network string.

## Invariants

1. Test USD never migrates to mainnet. Its assets, balances, history, account
   root, owner and issuer identities, database, backup namespace, and Bitcoin
   fee tree remain signet-only.
2. Production USD begins with a fresh account root, database, Secure Backup
   namespace, BIP84 mainnet fee tree, deployment identifier, and exact issuer
   registry.
3. A ticker is not trust. `USD`, a display name, or a familiar issuer name can
   never select or authorize an asset. Only a fully validated exact manifest
   and its derived asset ID can enter the reviewed registry.
4. Signal never holds an issuer secret and never exposes mint or arbitrary
   Bitcoin-send actions. Issuance remains an explicit headless operator action.
5. A mainnet wallet may open, restore public state, and synchronize while no
   product is configured. It must not create a consumer Bitcoin write until a
   reviewed production registry is present.
6. Already signed bytes are not stranded by a later registry change. New
   unsigned work fails closed, while exact persisted recovery and
   protocol-safe fee bump remain available.
7. No review, build, website edit, or TestFlight state authorizes a mainnet
   broadcast. That remains a separate, deliberate owner action.
8. Activation and loss limits are release data, not mutable host preferences.
   A production release commits its phase and ceilings; the app may tighten
   them locally but cannot raise them.

## Namespace separation

| Boundary | Test USD | Future production USD |
|---|---|---|
| Bitcoin network | signet | mainnet |
| Product status | permanent no-value test product | inactive until reviewed |
| Deployment | `opencsv-test-usd-v2` | new non-test identifier, chosen at activation |
| Key derivation | `opencsv-account-v2` | deployment-scoped `opencsv-mainnet-account-v1` |
| Account root | existing test root | newly generated root |
| Wallet database | existing signet database | fresh mainnet database |
| Secure Backup | existing Test USD namespace | fresh versioned production namespace |
| Bitcoin fee tree | BIP84 signet coin type | fresh BIP84 mainnet coin type |
| Asset registry | exact test-only manifests | exact non-test manifests approved below |
| Issuance | headless test issuer tooling | separately governed headless issuer tooling |
| Conversion | none | none from Test USD |

The Rust custody boundary records its derivation identifier in account status,
database metadata, and Secure Backup checkpoints. Older signet version-4
checkpoints remain compatible. A database or checkpoint from the abandoned
pre-v1 mainnet derivation is archived rather than guessed into the production
namespace.

## Exact issuer-registry entry

Every registry entry is a complete public `InstrumentManifestV1`, not a ticker
or a key alias. Review pins at least:

- manifest version and canonical bytes;
- derived asset ID;
- Bitcoin network (`mainnet`);
- unit code (`USD`) and decimal precision;
- `test_only: false`;
- issuer authorization public key;
- issuer legal/display name without implying an unverified affiliation;
- immutable terms hash and stable HTTPS terms URI;
- redemption summary, eligibility, jurisdiction, fees, timing, and failure
  procedure supplied by that issuer;
- registry priority and activation epoch;
- reviewer identities, approval receipt, and source revision.

Manifest validation proves internal identity consistency; it does not prove
backing, solvency, legal enforceability, or control of a brand. Those are
separate issuer and reviewer claims and must have explicit evidence.

Multiple reviewed issuers may appear under one consumer **USD** presentation,
but their instruments remain different assets with different risks and supply.
Version 1 spends one exact issuer instrument per transfer. It does not silently
combine claims, exchange one issuer for another, or promise par redemption.
The selected issuer and asset ID remain visible in payment details and receipts.

### Registry release envelope

Mainnet does not accept a loose host-supplied `usd_issuers` vector. The
candidate Rust boundary accepts issuer policies only inside one
`ProductionUsdRegistryRelease` with:

- `format_version: 1` and a nonzero `registry_version`;
- the exact non-test `deployment_id`;
- the ordered issuer manifests and priorities;
- one exact rollout policy containing:
  - `phase`: `candidate`, `limited`, or `general`;
  - `max_transfer_base_units`, `max_batch_total_base_units`, and
    `max_rolling_24h_outgoing_base_units`;
  - `max_rolling_24h_operations` and `max_batch_recipients`;
  - `max_reserve_allocation_sats` for one reserve-maintenance transaction; and
  - `max_miner_fee_sats` for initial transactions and replacements;
- a 40- or 64-character lowercase hexadecimal source revision;
- at least one unique public HTTPS approval receipt; and
- `commitment_sha256`, recomputed over a domain-separated canonical encoding of
  every preceding field.

Status exposes the registry version, deployment, source revision, approval
receipts, issuer count, rollout policy, and commitment. A mutation, wrong
deployment, missing approval, malformed rollout, commitment mismatch, or
production object presented to signet fails during account configuration.
Conversely, a loose mainnet issuer list fails even when every individual
manifest is internally valid. Test USD keeps its separate signet registry
format.

A `candidate` release is reviewable and recoverable but cannot create a fresh
consumer Bitcoin write; it returns the stable reason
`production_activation_not_authorized`. A `limited` or `general` release may
write only inside its committed ceilings. Rust checks a new intent against the
per-transfer and rolling-day allowance, checks an explicit batch against its
recipient and total-value ceilings, and rechecks the applicable policy before
proof/signing. Live and completed intents count against the rolling allowance;
cancelled and protocol-rejected intents do not. Wallet-internal reserve
maintenance and every initial or replacement miner fee remain separately
bounded. Host configuration can lower the miner-fee ceiling but cannot raise
the release value. Signed solo, batch, or reserve-maintenance bytes carry a
durable receipt that snapshots the complete authorizing release. A
later RBF revalidates that snapshot's deployment and commitment and uses its
original miner-fee ceiling, so a later release can neither raise the signed
operation's exposure nor strand protocol-safe recovery by lowering the live
ceiling.

The containing reproducible application release and its distribution signature
authenticate this immutable input. The public receipts make the selected policy
auditable; neither the commitment, the application signature, nor a receipt URL
proves backing, solvency, redemption, legal authority, or brand control.

The database atomically stores the highest accepted registry version and its
exact commitment, and production Secure Backup checkpoints carry the same
floor. An older valid client/release may still open balances, history, and
evidence, but new writes return `production_registry_rollback`. Reusing one
version with different committed bytes returns
`production_registry_conflict`. A higher authenticated version advances the
floor; restoring an older checkpoint never lowers it, while a newer checkpoint
keeps an older client read-only. Failing account open entirely was rejected
because rollback defense must not hide recovery evidence.

## Registry lifecycle

Registry changes are versioned, signed release inputs. They are never fetched
as mutable remote policy at spend time. A version identifies the exact release
payload above; it is not a mutable counter returned by an API.

- **Add:** requires complete manifest review, independent security review,
  product/legal approval, reproducible client build, and owner approval.
- **Disable:** stops planning, proving, and signing new consumer operations for
  that asset. The balance and evidence remain visible and read-only.
- **Remove from presentation:** may hide an inactive instrument from the
  default picker but must preserve history, export, and exact issuer details.
- **Emergency freeze:** is an authenticated registry release with a public
  reason and version. It cannot erase coins or rewrite prior receipts.
- **Resume:** is a new reviewed registry version, never an implicit rollback.

An operation that has not released a signature rechecks the exact asset before
proof work, at proof commit, and before signing. An operation with a fully
signed transaction already persisted may resume relay/observation/delivery and
may use only the protocol-safe RBF path that preserves OpenCSV records,
membership, identities, context, and output positions.

## Activation state machine

1. **Unconfigured** — mainnet wallet code is present but the production
   registry is empty. Read, restore, sync, and evidence export are allowed;
   new consumer Bitcoin writes return `production_usd_not_configured`.
2. **Candidate** — proposed deployment ID, manifest set, key ceremony,
   recovery namespace, build inputs, and rollout ceilings are frozen for
   review. The committed release phase is `candidate`; writes remain disabled
   with `production_activation_not_authorized`.
3. **Reviewed** — independent protocol, wallet, Signal, operational, and issuer
   reviews approve exact hashes. The committed release phase remains
   `candidate`; this is still not an activated release.
4. **Distribution candidate** — reproducible signed build passes clean-install
   recovery and signet acceptance. TestFlight or another distribution action
   still needs explicit owner approval and contains no funded mainnet wallet by
   default. Its production policy remains `candidate`.
5. **Limited activation** — separately approved users initialize fresh
   production wallets under the exact `limited` release ceilings. Every initial
   mainnet transaction requires an explicit runbook receipt.
6. **General activation** — allowed only after limited-operation evidence,
   incident procedures, support/recovery validation, and a new owner decision
   embodied in a higher `general` registry release. General does not mean
   unlimited; its committed ceilings still apply.

No state transition is inferred from elapsed time. Each transition names exact
source, build, manifest, and approval receipts.

## Required evidence before limited activation

### Protocol and implementation

- exact-green Rust and Signal tips, with independent adversarial approval;
- formal ledger and axiom audit regenerated from the exact protocol revision;
- default Signal archive proves issuer and test-rebind symbols absent;
- mainnet empty-registry, network mismatch, checkpoint mismatch, revocation,
  crash, reorg, observer-conflict, RBF, and exact-once delivery tests;
- reproducible reference binaries and an archive whose embedded network,
  deployment, source SHA, build number, and bundle ID are revalidated at upload.

### Product and issuer

- final production manifest bytes and asset ID published;
- issuer authority and terms URI authenticated out of band;
- backing, redemption, eligibility, fee, privacy, and jurisdiction statements
  reviewed by the responsible humans; no protocol proof substitutes for them;
- issuer key generation, backup, rotation, compromise, and revocation runbooks;
- supply/audit publication procedure and incident contact.

### Wallet and operations

- clean fresh-root setup and Secure Backup recovery without Test USD state;
- primary/linked-device permissions and lost-device procedure;
- fee-reserve limits and UTXO policy tested on mainnet-compatible fixtures
  without broadcast;
- at least two required pinned raw-transaction observers operated on distinct
  hosts, with exact-byte agreement and no ordinary-trust fallback;
- direct relay remains enabled and settlement uses at least two distinct
  configured compact-filter peers; missing or duplicated peers keep the wallet
  read-only rather than deferring failure until signing;
- certificate-pin rotation, observer outage/conflict, peer disagreement, and
  stale-cache presentation tested without broadcast;
- limited-rollout caps, monitoring, rollback/freeze procedure, and support path;
- a deliberate owner approval for the exact first mainnet action.

## Open decisions

These are intentionally unresolved and block activation:

- the real issuer or issuers and their authority to make the proposed claims;
- canonical production terms, redemption mechanism, and legal review;
- production deployment identifier and registry version 1 bytes;
- issuer-key custody and whether authorization should use threshold hardware;
- registry signer/reviewer quorum and emergency-update governance;
- final production observer operators/endpoints and certificate-pin lifecycle
  (the candidate defaults are mempool.space and Blockstream, not an approval to
  outsource spend-critical chain truth to either service);
- initial wallet/transaction/value limits and incident-response owners;
- release channel, tester population, and support/recovery commitments.

## What current work does and does not prove

The current reference implementation has reproducible receipts for Test USD
minting by a headless issuer, transfer in Signal, forwarding before
confirmation under the required observation policy, batching, fee bump,
recovery, and signet settlement. Formal proofs and tests cover protocol
properties described in the paper; they do not prove issuer backing or
operational readiness.

The local Rust production-gate candidate adds the empty-registry write block,
deployment-scoped mainnet derivation, two-host pinned raw-byte quorum, a
two-peer confirmed-chain activation check, and release-committed activation and
loss ceilings. Candidate policy remains readable but cannot write; limited and
general policy is enforced at planning and again before proof/signing. The
matching local Signal candidate has immutable profiles for the two current
built-ins and rejects mutated or mixed-network policy before network I/O. The
latest unpublished Rust tip is `e5cd9ef589fe24ac26f083868693a9ccc12d31a5`;
its FFI receipt is 111 passed, 0 failed, and 3 intentional slow ignores, plus
both feature-gated recovery rebind tests and warnings-denied default, recovery,
and issuer builds. Until those candidates are rebased, hosted-green,
independently reviewed, and merged, they are evidence of work in progress only.
No production manifest, production wallet, public release, or mainnet
transaction exists as a result of this document.
