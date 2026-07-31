//! Receiver verification driver `Accept` (paper §4.8) and the proof-verifier
//! seam where `opencsv-pcd` plugs in.

use std::collections::HashSet;

use crate::anchor::AnchorRecord;
use crate::asset::AssetId;
use crate::chain::{AnchorChain, AnchorLocation};
use crate::coin::{Coin, OwnerSecret};
use crate::consignment::{CoinOpening, Consignment};
use crate::digest::TruncatedDigest;

/// Verification of a transaction validity proof `π` against the predicate's
/// verification key and public input (paper §4.1: `Π.Verify(vk, x, π)`).
///
/// This trait is the seam where the AIR/FRI-based PCD engine (`opencsv-pcd`)
/// plugs in: it will supply an implementation backed by real recursive
/// proofs over BabyBear.
pub trait ProofVerifier {
    /// Return `true` iff `proof` attests the predicate `vk` on public input
    /// `public_input`.
    fn verify(&self, vk: &[u8], public_input: &[u8], proof: &[u8]) -> bool;
}

/// A **mock** verifier for tests and prototypes — NOT a proof system.
///
/// A "proof" is `public_input ∥ checksum(4 bytes)` where `checksum` is the
/// 32-bit FNV-1a hash of `vk ∥ public_input`. It checks nothing but internal
/// consistency of the message; it provides zero soundness. Do not use outside
/// tests.
pub struct MockVerifier;

impl MockVerifier {
    /// Produce a mock "proof" that [`MockVerifier`] accepts (test helper).
    pub fn prove(vk: &[u8], public_input: &[u8]) -> Vec<u8> {
        let mut proof = public_input.to_vec();
        proof.extend_from_slice(&Self::checksum(vk, public_input).to_le_bytes());
        proof
    }

    fn checksum(vk: &[u8], public_input: &[u8]) -> u32 {
        let mut h: u32 = 0x811c_9dc5;
        for b in vk.iter().chain(public_input) {
            h = (h ^ u32::from(*b)).wrapping_mul(0x0100_0193);
        }
        h
    }
}

impl ProofVerifier for MockVerifier {
    fn verify(&self, vk: &[u8], public_input: &[u8], proof: &[u8]) -> bool {
        let Some((pi, sum)) = proof.split_at_checked(public_input.len()) else {
            return false;
        };
        pi == public_input && sum == Self::checksum(vk, public_input).to_le_bytes()
    }
}

/// Parameters the recipient brings to [`accept`] (application-level policy,
/// paper §4.7–4.8).
pub struct AcceptParams<'a> {
    /// Verification key of the transaction predicate being claimed.
    pub vk: &'a [u8],
    /// Required confirmation depth `k` (paper §4.7 rule 2; default 6).
    pub required_confirmations: u64,
    /// The recipient's owner secrets, for the ownership check (step 4).
    pub recipient_secrets: &'a [OwnerSecret],
    /// Assets already pinned by this client. If an opening names an asset not
    /// in this list, the consignment must carry matching genesis `aux`.
    pub known_assets: &'a [AssetId],
}

/// The coins credited by a successful [`accept`] (paper §4.8 step 5).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AcceptedCoins {
    /// The recipient's own outputs among the consignment's openings.
    pub coins: Vec<Coin>,
    /// Where the transaction's anchor sits on-chain.
    pub anchor: AnchorLocation,
}

/// Why a consignment was rejected (paper §4.8 steps 1–4).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RejectReason {
    /// The consignment carries no coin openings.
    EmptyConsignment,
    /// `aux` genesis does not recompute to the openings' asset ID (step 1).
    GenesisMismatch,
    /// An opening names an asset the client has not pinned, and no (matching)
    /// genesis `aux` was supplied (step 1).
    UnknownAsset,
    /// No anchor record exists at the referenced location / txid (step 3a).
    AnchorNotFound,
    /// The anchor is not buried under `k` confirmations (step 3, rule 2).
    InsufficientConfirmations {
        /// Confirmations the anchor actually has.
        have: u64,
        /// Confirmations required by policy.
        required: u64,
    },
    /// A nullifier key of this transaction already occurred *earlier* on
    /// chain — the anchor shown is not the authoritative spend (step 3b,
    /// paper §4.7 rule 1).
    NullifierConflict {
        /// The conflicting nullifier key.
        nullifier: TruncatedDigest,
        /// The first (authoritative) occurrence.
        first: AnchorLocation,
    },
    /// `Π.Verify(vk, x, π) = 0` (step 2).
    InvalidProof,
    /// None of the openings belongs to any of the recipient's keys (step 4).
    NoOwnedOutput,
}

impl std::fmt::Display for RejectReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::EmptyConsignment => write!(f, "consignment has no coin openings"),
            Self::GenesisMismatch => write!(f, "genesis aux does not match openings' asset ID"),
            Self::UnknownAsset => write!(f, "unknown asset and no genesis aux supplied"),
            Self::AnchorNotFound => write!(f, "anchor not found at the referenced location"),
            Self::InsufficientConfirmations { have, required } => {
                write!(f, "anchor has {have} confirmations, need {required}")
            }
            Self::NullifierConflict { first, .. } => {
                write!(f, "nullifier already occurred earlier at {first:?}")
            }
            Self::InvalidProof => write!(f, "transaction proof did not verify"),
            Self::NoOwnedOutput => write!(f, "no opening belongs to the recipient"),
        }
    }
}

impl std::error::Error for RejectReason {}

/// Reconstruct the proof public input `x` from the on-chain anchor record and
/// the consignment's openings (paper §4.8 step 2):
/// `anchor_bytes(64) ∥ opening_1 ∥ … ∥ opening_n`, each opening encoded as
/// `asset_id(32) ∥ v(8) ∥ owner(32) ∥ r(32)`.
pub fn public_input(record: &AnchorRecord, openings: &[CoinOpening]) -> Vec<u8> {
    let mut x = Vec::with_capacity(64 + 104 * openings.len());
    x.extend_from_slice(&record.to_bytes());
    for opening in openings {
        x.extend_from_slice(&opening.to_public_input_bytes());
    }
    x
}

/// The receiver verification algorithm `Accept` (paper §4.8, steps 1–5).
///
/// Steps: (1) parse/type-check and pin-or-reject genesis aux; (2) proof
/// check via [`ProofVerifier`]; (3) anchor existence, confirmation depth,
/// and nullifier first-occurrence; (4) ownership check; (5) credit the
/// recipient's coins.
pub fn accept<V: ProofVerifier, C: AnchorChain>(
    consignment: &Consignment,
    chain: &C,
    verifier: &V,
    params: &AcceptParams,
) -> Result<AcceptedCoins, RejectReason> {
    let openings = &consignment.coin_openings;
    if openings.is_empty() {
        return Err(RejectReason::EmptyConsignment);
    }

    // Step 1 — parse & type-check. If genesis aux is present it must
    // recompute to the openings' asset ID; otherwise the asset must already
    // be pinned. (Pinning itself, including any user confirmation for new
    // assets, is client UX outside this crate.)
    let asset_ids: HashSet<AssetId> = openings.iter().map(|o| o.asset_id).collect();
    match &consignment.aux {
        Some(genesis) => {
            let id = genesis.asset_id();
            if asset_ids.iter().any(|a| *a != id) {
                return Err(RejectReason::GenesisMismatch);
            }
        }
        None => {
            if asset_ids.iter().any(|a| !params.known_assets.contains(a)) {
                return Err(RejectReason::UnknownAsset);
            }
        }
    }

    // Anchor lookup (step 3a, performed before the proof check because the
    // public input is reconstructed from the on-chain record).
    let record = chain
        .anchor_at(&consignment.anchor_ref)
        .ok_or(RejectReason::AnchorNotFound)?;

    // Step 2 — proof check.
    let x = public_input(&record, openings);
    if !verifier.verify(params.vk, &x, &consignment.proof) {
        return Err(RejectReason::InvalidProof);
    }

    // Step 3 — anchor check: confirmation depth, then, for transfers and
    // redemptions, nullifier first-occurrence (paper §4.7 rules 1–2).
    let location = consignment.anchor_ref.location;
    let have = chain.confirmations_at(location.height);
    if have < params.required_confirmations {
        return Err(RejectReason::InsufficientConfirmations {
            have,
            required: params.required_confirmations,
        });
    }
    for key in record.nullifier_keys() {
        let first = chain
            .first_nullifier_occurrence(&key)
            .ok_or(RejectReason::AnchorNotFound)?;
        if first != location {
            return Err(RejectReason::NullifierConflict {
                nullifier: key,
                first,
            });
        }
    }

    // Step 4 — ownership check.
    let owners: HashSet<_> = params.recipient_secrets.iter().map(|s| s.owner()).collect();
    let coins: Vec<Coin> = openings
        .iter()
        .filter(|o| owners.contains(&o.owner))
        .map(CoinOpening::to_coin)
        .collect();
    if coins.is_empty() {
        return Err(RejectReason::NoOwnedOutput);
    }

    // Step 5 — accept.
    Ok(AcceptedCoins {
        coins,
        anchor: location,
    })
}
