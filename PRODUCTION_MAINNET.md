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

## Registry lifecycle

Registry changes are versioned, signed release inputs. They are never fetched
as mutable remote policy at spend time.

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
   recovery namespace, and build inputs are frozen for review. Writes remain
   disabled.
3. **Reviewed** — independent protocol, wallet, Signal, operational, and issuer
   reviews approve exact hashes. This is still not a release.
4. **Distribution candidate** — reproducible signed build passes clean-install
   recovery and signet acceptance. TestFlight or another distribution action
   still needs explicit owner approval and contains no funded mainnet wallet by
   default.
5. **Limited activation** — separately approved users initialize fresh
   production wallets under published funding and loss limits. Every initial
   mainnet transaction requires an explicit runbook receipt.
6. **General activation** — allowed only after limited-operation evidence,
   incident procedures, support/recovery validation, and a new owner decision.

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
deployment-scoped mainnet derivation, two-host pinned raw-byte quorum, and a
two-peer confirmed-chain activation check. Its matching local Signal candidate
has immutable profiles for the two current built-ins and rejects mutated or
mixed-network policy before network I/O. Until those candidates are rebased,
hosted-green, independently reviewed, and merged, they are evidence of work in
progress only. No production manifest, production wallet, public release, or
mainnet transaction exists as a result of this document.
