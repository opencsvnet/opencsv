//! On-chain anchor records (paper §4.4–4.7).
//!
//! Every anchor serializes to exactly [`ANCHOR_SIZE`] (64) bytes, carried in
//! an OP_RETURN (or equivalent data-carrier output) of an ordinary Bitcoin
//! transaction. Byte 0 is a domain tag; digests are carried as 24-byte
//! [`TruncatedDigest`] prefixes (see [`crate::digest`]); multi-byte integers
//! are little-endian; all remaining bytes are zero and *must* be zero for the
//! record to parse.
//!
//! Layouts:
//!
//! ```text
//! MINT   [0x01][asset_id:24][V:8][mint_commit:24][pad:7]   (§4.4)
//! XFER   [0x02][nf:24][pad:39]                             (§4.5, m = 1)
//! XFERC  [0x03][nf_commit:24][pad:39]                      (§4.5, m > 1)
//! REDEEM [0x04][asset_id:24][V:8][nf:24][pad:7]            (§4.6)
//! ```

use crate::asset::AssetId;
use crate::coin::Nullifier;
use crate::digest::{Digest, TRUNCATED_DIGEST_BYTES, TruncatedDigest};
use crate::field::hash_felts;

/// Exact byte length of every serialized anchor record.
pub const ANCHOR_SIZE: usize = 64;

const TAG_MINT: u8 = 0x01;
const TAG_XFER: u8 = 0x02;
const TAG_XFER_COMPRESSED: u8 = 0x03;
const TAG_REDEEM: u8 = 0x04;

/// `mint_commit = H("mint" ∥ asset_id ∥ V ∥ mint_nonce)` (paper §4.4).
pub fn mint_commit(asset_id: &AssetId, value: u64, mint_nonce: &Digest) -> Digest {
    hash_felts(
        "mint",
        &[
            &asset_id.to_elems(),
            &crate::field::u64_to_felts(value),
            &mint_nonce.to_elems(),
        ],
    )
}

/// `nf_commit = H("xfer" ∥ nf_1 ∥ … ∥ nf_m)` — the hash-compressed anchor
/// payload for transfers with `m > 1` consumed coins (paper §4.5). The full
/// nullifier list travels in the consignment.
pub fn nullifier_commit(nullifiers: &[Nullifier]) -> Digest {
    let elems: Vec<p3_baby_bear::BabyBear> = nullifiers
        .iter()
        .flat_map(|nf| nf.to_elems())
        .collect();
    hash_felts("xfer", &[&elems])
}

/// An OpenCSV anchor record (paper §4.4–4.6).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AnchorRecord {
    /// `MINT ∥ asset_id ∥ V ∥ mint_commit` — transparent mint (§4.4).
    Mint {
        /// Asset being minted.
        asset_id: TruncatedDigest,
        /// Total minted value `V = Σ v_i` (public).
        value: u64,
        /// `H("mint" ∥ asset_id ∥ V ∥ mint_nonce)`, binding the mint nonce.
        mint_commit: TruncatedDigest,
    },
    /// `XFER ∥ nf` — shielded transfer consuming exactly one coin (§4.5).
    Xfer {
        /// Nullifier of the consumed coin.
        nullifier: TruncatedDigest,
    },
    /// `XFER ∥ H(nf_1 ∥ … ∥ nf_m)` — shielded transfer with `m > 1` inputs,
    /// hash-compressed to fit the 64-byte budget (§4.5).
    XferCompressed {
        /// Commitment to the full nullifier list (carried in the consignment).
        nullifier_commit: TruncatedDigest,
    },
    /// `REDEEM ∥ asset_id ∥ V ∥ nf` — transparent burn back to the issuer (§4.6).
    Redeem {
        /// Asset being redeemed.
        asset_id: TruncatedDigest,
        /// Redeemed value `V` (public at burn time).
        value: u64,
        /// Nullifier of the destroyed coin.
        nullifier: TruncatedDigest,
    },
}

/// Error returned when parsing a malformed 64-byte anchor record.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AnchorParseError {
    /// Byte 0 is not a known anchor tag.
    UnknownTag(u8),
    /// Bytes past the record's payload are non-zero.
    NonZeroPadding,
}

impl std::fmt::Display for AnchorParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnknownTag(t) => write!(f, "unknown anchor tag byte 0x{t:02x}"),
            Self::NonZeroPadding => write!(f, "non-zero anchor padding"),
        }
    }
}

impl std::error::Error for AnchorParseError {}

impl AnchorRecord {
    /// Serialize to exactly 64 bytes.
    pub fn to_bytes(&self) -> [u8; ANCHOR_SIZE] {
        let mut out = [0u8; ANCHOR_SIZE];
        match self {
            Self::Mint {
                asset_id,
                value,
                mint_commit,
            }
            | Self::Redeem {
                asset_id,
                value,
                nullifier: mint_commit,
            } => {
                out[0] = match self {
                    Self::Mint { .. } => TAG_MINT,
                    _ => TAG_REDEEM,
                };
                out[1..25].copy_from_slice(asset_id.as_bytes());
                out[25..33].copy_from_slice(&value.to_le_bytes());
                out[33..57].copy_from_slice(mint_commit.as_bytes());
            }
            Self::Xfer { nullifier } => {
                out[0] = TAG_XFER;
                out[1..25].copy_from_slice(nullifier.as_bytes());
            }
            Self::XferCompressed { nullifier_commit } => {
                out[0] = TAG_XFER_COMPRESSED;
                out[1..25].copy_from_slice(nullifier_commit.as_bytes());
            }
        }
        out
    }

    /// Parse a 64-byte anchor record, rejecting unknown tags and non-zero
    /// padding.
    pub fn from_bytes(bytes: &[u8; ANCHOR_SIZE]) -> Result<Self, AnchorParseError> {
        let td = |range: std::ops::Range<usize>| {
            let mut b = [0u8; TRUNCATED_DIGEST_BYTES];
            b.copy_from_slice(&bytes[range]);
            TruncatedDigest(b)
        };
        let check_padding = |from: usize| {
            if bytes[from..].iter().all(|&b| b == 0) {
                Ok(())
            } else {
                Err(AnchorParseError::NonZeroPadding)
            }
        };
        match bytes[0] {
            TAG_MINT => {
                check_padding(57)?;
                Ok(Self::Mint {
                    asset_id: td(1..25),
                    value: u64::from_le_bytes(bytes[25..33].try_into().expect("8 bytes")),
                    mint_commit: td(33..57),
                })
            }
            TAG_REDEEM => {
                check_padding(57)?;
                Ok(Self::Redeem {
                    asset_id: td(1..25),
                    value: u64::from_le_bytes(bytes[25..33].try_into().expect("8 bytes")),
                    nullifier: td(33..57),
                })
            }
            TAG_XFER => {
                check_padding(25)?;
                Ok(Self::Xfer {
                    nullifier: td(1..25),
                })
            }
            TAG_XFER_COMPRESSED => {
                check_padding(25)?;
                Ok(Self::XferCompressed {
                    nullifier_commit: td(1..25),
                })
            }
            tag => Err(AnchorParseError::UnknownTag(tag)),
        }
    }

    /// The nullifier keys this record publishes, used for first-occurrence
    /// indexing (paper §4.7). Mints publish none; a compressed transfer is
    /// indexed under its nullifier commitment (resolving the individual
    /// nullifiers requires the off-chain list from the consignment).
    pub fn nullifier_keys(&self) -> Vec<TruncatedDigest> {
        match self {
            Self::Mint { .. } => vec![],
            Self::Xfer { nullifier } => vec![*nullifier],
            Self::XferCompressed { nullifier_commit } => vec![*nullifier_commit],
            Self::Redeem { nullifier, .. } => vec![*nullifier],
        }
    }
}
