//! # opencsv-pcd
//!
//! Proof-carrying data (PCD) for **OpenCSV**, built on the Plonky3 circuit /
//! recursion stack (`p3-circuit`, `p3-circuit-prover` from the pinned
//! Plonky3-recursion git commit — see `Cargo.toml`).
//!
//! All hashes are computed in-circuit exactly as `opencsv-core`'s
//! `hash_felts` does (Poseidon2 `PaddingFreeSponge` over BabyBear, width 16 /
//! rate 8 / digest 8, length-prefixed, domain-separated — see `README.md`).
//!
//! ## Stage 1: commitment opening (paper §4.3)
//!
//! A **non-recursive** circuit proving knowledge of an opening of a coin
//! commitment `C = H("coin" ∥ asset_id ∥ v ∥ owner ∥ r)`:
//!
//! - Public input: `C` as 8 BabyBear elements ([`DIGEST_ELEMS`]).
//! - Private witness: `asset_id` (8), `v` (3 limbs), `owner` (8), `r` (8).
//!
//! Use [`prove_opening`] / [`verify_opening`].
//!
//! ## Stage 2: mint and transfer predicates (paper §4.4–4.5)
//!
//! Still **non-recursive** (recursion is stage 3):
//!
//! - Mint ([`prove_mint`] / [`verify_mint`]): output commitments recompute,
//!   values in range, `Σ v_i = V`, and
//!   `mint_commit = H("mint" ∥ asset_id ∥ V ∥ mint_nonce)`. The issuer
//!   signature stays off-circuit (see the `mint` module docs).
//! - Transfer ([`prove_transfer`] / [`verify_transfer`]): 2 inputs / 2
//!   outputs, **single asset** — input commitments recompute, ownership
//!   (`owner_i = H(osk_i)`), nullifiers (`nf_i = H("null" ∥ osk_i ∥ C_i)`),
//!   values in range, conservation `Σ v_in = Σ v_out`, output commitments
//!   recompute.
//!
//! Values are range-checked u64 limb triples (24/24/16 bits) with
//! carry-exact sum constraints — see the `value` module.
//!
//! ## Stage 3: PCD recursion (paper §4.5 item 4)
//!
//! Real proof-carrying data: the **node (transfer) circuit** verifies two
//! predecessor proofs *in-circuit* (genuine batch-STARK verification via
//! `p3-recursion`), and a dedicated **statement table** exposes every
//! circuit's public statement as STARK instance public values, which the
//! successor `connect`s to its own recomputed input commitments — this is
//! what chains the PCD and binds predecessor public data. See the `node`
//! module docs for the architecture (two circuits: mint genesis + recursive
//! transfer node), and the `statement` module docs for the binding channel.
//!
//! - Genesis: [`prove_genesis_mint`].
//! - Recursive transfer: [`prove_coin_transfer`].
//! - Root verification: [`verify_coin_proof`] (checks the bound statement
//!   values, then natively verifies the proof).
//!
//! **Known limitation (inherited from upstream 0.1.0 PoC):** the standalone
//! stage-1/2 verifier (`BatchStarkProver::verify_all_tables`) proves
//! *satisfiability of the circuit for some public inputs* — the public input
//! values are sent on the witness bus but are not exposed as STARK instance
//! public values. This crate therefore stores the public data inside each
//! stage-1/2 proof struct ([`OpeningProof`], [`MintProof`], [`TransferProof`])
//! and the `verify_*` functions compare it against the expected values.
//! Stage 3 closes this gap for the recursive proofs via the statement table
//! (see `README.md` for the remaining root/vk caveats).

#![forbid(unsafe_code)]
#![warn(missing_docs)]

mod hash;
mod mint;
mod node;
mod opening;
mod prove;
mod recursion_config;
mod statement;
#[cfg(test)]
mod spike;
mod transfer;
mod value;

use p3_baby_bear::BabyBear;
use p3_field::extension::BinomialExtensionField;

/// Circuit field: quartic extension of BabyBear (`D = 4`; the upstream
/// prover at the pinned commit only supports Poseidon2 tables for extension
/// degrees `D ∈ {2, 4, 5}` — see `README.md`).
pub type EF = BinomialExtensionField<BabyBear, 4>;

pub use hash::{OSK_ELEMS, osk_felts};
pub use mint::{
    MINT_OUTPUTS, MINT_PRIVATE_ELEMS, MINT_PUBLIC_ELEMS, MintError, MintProof, MintStatement,
    prove_mint, prove_mint_raw, verify_mint,
};
pub use node::{
    CoinProof, NODE_INPUTS, NODE_OUTPUTS, NODE_PRIVATE_ELEMS, NodeError, NodeMode, NodeStatement,
    STATEMENT_ELEMS, coin_fri_params, prove_genesis_mint, verify_coin_proof,
};
pub use node::prove_transfer as prove_coin_transfer;
pub use opening::{
    CoinWitness, OpeningError, OpeningProof, PRIVATE_ELEMS, PUBLIC_ELEMS, prove_opening,
    prove_opening_raw, verify_opening,
};
pub use transfer::{
    TRANSFER_INPUTS, TRANSFER_OUTPUTS, TRANSFER_PRIVATE_ELEMS, TRANSFER_PUBLIC_ELEMS,
    TransferError, TransferProof, TransferStatement, prove_transfer, verify_transfer,
};
pub use value::{VALUE_LIMBS, u64_to_felts};

pub use opencsv_core::field::DIGEST_ELEMS;
