//! The anchor chain abstraction and an in-memory mock (paper §4.7).
//!
//! [`AnchorChain`] is the seam over Bitcoin: the production backend will read
//! anchored payloads from `bitcoind` RPC; [`MockAnchorChain`] is an in-memory
//! append-only ordered log for tests. Ordering is `(block_height, position)`
//! — block order, then in-block order — and *first occurrence wins* for any
//! nullifier key (paper §4.7 rule 1).

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::anchor::AnchorRecord;
use crate::digest::TruncatedDigest;
use crate::field::{felt, hash_felts};

/// Location of an anchor in the canonical chain order (paper §4.7).
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct AnchorLocation {
    /// Block height containing the anchor transaction.
    pub height: u64,
    /// In-block position of the anchor transaction.
    pub position: u32,
}

/// A reference to a specific on-chain anchor, as carried in a consignment
/// (paper §4.8: `anchor_ref = (txid, block_height, position)`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnchorRef {
    /// ID of the Bitcoin transaction carrying the anchor.
    pub txid: [u8; 32],
    /// Claimed location of that transaction.
    pub location: AnchorLocation,
}

/// A totally ordered, append-only log of anchor records — what OpenCSV
/// requires from the base chain (paper §3.2, §4.7).
pub trait AnchorChain {
    /// Height of the chain tip.
    fn tip_height(&self) -> u64;

    /// Fetch the anchor record at the referenced location, returning `None`
    /// if no record exists there or the transaction ID does not match
    /// (paper §4.8 step 3a: "the anchor transaction exists at the claimed
    /// position").
    fn anchor_at(&self, anchor_ref: &AnchorRef) -> Option<AnchorRecord>;

    /// The first occurrence of a nullifier key in canonical chain order, if
    /// any (paper §4.7 rule 1). See [`AnchorRecord::nullifier_keys`].
    fn first_nullifier_occurrence(&self, key: &TruncatedDigest) -> Option<AnchorLocation>;

    /// All occurrences of a nullifier key in canonical chain order. More
    /// than one entry means a (failed, by rule 1) double-spend attempt is
    /// observable on-chain (paper §4.3, §5.2).
    fn nullifier_occurrences(&self, key: &TruncatedDigest) -> Vec<AnchorLocation>;

    /// All anchors at or below `height`, in canonical order. Used by the
    /// supply audit (paper §4.9).
    fn anchors_up_to(&self, height: u64) -> Vec<(AnchorLocation, AnchorRecord)>;

    /// Confirmation depth of an anchor at `height`: `tip − height + 1`, or 0
    /// if `height` is above the tip (paper §4.7 rule 2).
    fn confirmations_at(&self, height: u64) -> u64 {
        if height > self.tip_height() {
            0
        } else {
            self.tip_height() - height + 1
        }
    }
}

/// An in-memory append-only anchor chain for tests and prototypes.
#[derive(Clone, Debug, Default)]
pub struct MockAnchorChain {
    tip_height: u64,
    entries: Vec<Entry>,
    /// First occurrence per nullifier key (never overwritten).
    nullifier_index: HashMap<TruncatedDigest, AnchorLocation>,
}

#[derive(Clone, Copy, Debug)]
struct Entry {
    txid: [u8; 32],
    location: AnchorLocation,
    record: AnchorRecord,
}

impl MockAnchorChain {
    /// An empty chain with tip at height 0.
    pub fn new() -> Self {
        Self::default()
    }

    /// Advance the tip by `n` blocks (without adding anchors).
    pub fn advance_blocks(&mut self, n: u64) {
        self.tip_height = self.tip_height.saturating_add(n);
    }

    /// Append a record to the current tip block, returning a reference to its
    /// location. The transaction ID is derived deterministically from the
    /// entry's ordinal in the log.
    pub fn append(&mut self, record: AnchorRecord) -> AnchorRef {
        let position = self
            .entries
            .iter()
            .filter(|e| e.location.height == self.tip_height)
            .count() as u32;
        let location = AnchorLocation {
            height: self.tip_height,
            position,
        };
        let txid = *hash_felts("mock-txid", &[&[felt(self.entries.len() as u32)]]).as_bytes();
        let entry = Entry {
            txid,
            location,
            record,
        };
        for key in record.nullifier_keys() {
            self.nullifier_index.entry(key).or_insert(location);
        }
        self.entries.push(entry);
        AnchorRef { txid, location }
    }
}

impl AnchorChain for MockAnchorChain {
    fn tip_height(&self) -> u64 {
        self.tip_height
    }

    fn anchor_at(&self, anchor_ref: &AnchorRef) -> Option<AnchorRecord> {
        self.entries
            .iter()
            .find(|e| e.location == anchor_ref.location && e.txid == anchor_ref.txid)
            .map(|e| e.record)
    }

    fn first_nullifier_occurrence(&self, key: &TruncatedDigest) -> Option<AnchorLocation> {
        self.nullifier_index.get(key).copied()
    }

    fn nullifier_occurrences(&self, key: &TruncatedDigest) -> Vec<AnchorLocation> {
        let mut locations: Vec<_> = self
            .entries
            .iter()
            .filter(|e| e.record.nullifier_keys().contains(key))
            .map(|e| e.location)
            .collect();
        locations.sort();
        locations
    }

    fn anchors_up_to(&self, height: u64) -> Vec<(AnchorLocation, AnchorRecord)> {
        let mut anchors: Vec<_> = self
            .entries
            .iter()
            .filter(|e| e.location.height <= height)
            .map(|e| (e.location, e.record))
            .collect();
        anchors.sort_by_key(|(location, _)| *location);
        anchors
    }
}
