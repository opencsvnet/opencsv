//! Issuer signatures `Σ` (paper §4.1, §4.4).
//!
//! The paper requires an **AIR-friendly** signature scheme whose verification
//! is expressible natively over 𝔽 (candidates: Schnorr over an 𝔽-base-field
//! curve, or a Poseidon-based hash signature). This prototype instead uses
//! **Ed25519** (`ed25519-dalek`) behind the [`IssuerSignature`] trait as a
//! pragmatic stand-in: Ed25519 verification is *not* AIR-native and must be
//! replaced before the PCD engine (`opencsv-pcd`) proves mints in-circuit.
//! The trait is the seam where the production scheme plugs in.

use ed25519_dalek::{Signer, SigningKey, VerifyingKey};

use crate::asset::AssetId;
use crate::digest::Digest;

/// An issuer signature scheme `Σ` with interface
/// `Σ.Verify(ipk, m, σ) ∈ {0,1}` (paper §4.1).
pub trait IssuerSignature {
    /// Issuer public key (`ipk`).
    type PublicKey;
    /// Issuer secret key (`isk`).
    type SecretKey;
    /// Signature (`σ`).
    type Signature;

    /// Sign a message with the issuer's secret key.
    fn sign(sk: &Self::SecretKey, msg: &[u8]) -> Self::Signature;
    /// Verify a signature against the issuer's public key.
    fn verify(pk: &Self::PublicKey, msg: &[u8], sig: &Self::Signature) -> bool;
}

/// Ed25519 issuer signatures — **prototype stand-in only**, not AIR-friendly.
/// See module docs.
pub struct Ed25519IssuerSignature;

impl Ed25519IssuerSignature {
    /// Derive the keypair for a 32-byte secret seed.
    pub fn keypair_from_seed(seed: [u8; 32]) -> ([u8; 32], [u8; 32]) {
        let sk = SigningKey::from_bytes(&seed);
        (sk.to_bytes(), sk.verifying_key().to_bytes())
    }
}

impl IssuerSignature for Ed25519IssuerSignature {
    type PublicKey = [u8; 32];
    type SecretKey = [u8; 32];
    type Signature = [u8; 64];

    fn sign(sk: &Self::SecretKey, msg: &[u8]) -> Self::Signature {
        SigningKey::from_bytes(sk).sign(msg).to_bytes()
    }

    fn verify(pk: &Self::PublicKey, msg: &[u8], sig: &Self::Signature) -> bool {
        let Ok(vk) = VerifyingKey::from_bytes(pk) else {
            return false;
        };
        vk.verify_strict(msg, &ed25519_dalek::Signature::from_bytes(sig))
            .is_ok()
    }
}

/// The message signed by the issuer to authorize a mint:
/// `"OpenCSV-mint" ∥ asset_id ∥ V ∥ mint_nonce` (paper §4.4 item 1; the mint
/// AIR checks `Σ.Verify(ipk, (asset_id, V, mint_nonce), σ) = 1`).
pub fn mint_signing_message(asset_id: &AssetId, value: u64, mint_nonce: &Digest) -> Vec<u8> {
    let mut msg = Vec::with_capacity(11 + 32 + 8 + 32);
    msg.extend_from_slice(b"OpenCSV-mint");
    msg.extend_from_slice(asset_id.as_bytes());
    msg.extend_from_slice(&value.to_le_bytes());
    msg.extend_from_slice(mint_nonce.as_bytes());
    msg
}
