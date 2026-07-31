//! In-circuit Poseidon2 sponge helpers reproducing [`opencsv-core`]'s
//! `hash_felts` semantics (`PaddingFreeSponge` over BabyBear, width 16 /
//! rate 8 / digest 8, length-prefixed, domain-separated, overwrite mode),
//! shared by every circuit in this crate. See `README.md` for the packing
//! conventions (4 base elements per extension limb, `absorb_len = 0`).

use opencsv_core::OwnerSecret;
use p3_baby_bear::BabyBear;
use p3_circuit::ops::{Poseidon2Config, Poseidon2PermCall};
use p3_circuit::{CircuitBuilder, CircuitBuilderError, ExprId};

use crate::{DIGEST_ELEMS, EF};

/// Sponge rate in BabyBear elements (two extension limbs per permutation row).
pub(crate) const RATE: usize = 8;

/// Number of field elements an owner secret encodes to (`bytes_to_felts` of
/// 32 bytes, three bytes per element: `ceil(32 / 3)`).
pub const OSK_ELEMS: usize = 11;

/// Encode a domain tag three bytes per element, little-endian (mirrors
/// `opencsv-core`'s `bytes_to_felts`, used for the domain separation tags).
pub(crate) fn domain_felts(tag: &str) -> Vec<BabyBear> {
    tag.as_bytes()
        .chunks(3)
        .map(|chunk| {
            let mut buf = [0u8; 4];
            buf[..chunk.len()].copy_from_slice(chunk);
            BabyBear::new(u32::from_le_bytes(buf))
        })
        .collect()
}

/// Encode an owner secret as field elements, mirroring the absorption in
/// `opencsv-core`'s `OwnerSecret::owner` and `coin::nullifier`
/// (`bytes_to_felts` of the 32 secret bytes — *not* the digest limb
/// encoding).
pub fn osk_felts(osk: &OwnerSecret) -> [BabyBear; OSK_ELEMS] {
    let mut out = [BabyBear::default(); OSK_ELEMS];
    for (i, chunk) in osk.0.as_bytes().chunks(3).enumerate() {
        let mut buf = [0u8; 4];
        buf[..chunk.len()].copy_from_slice(chunk);
        out[i] = BabyBear::new(u32::from_le_bytes(buf));
    }
    out
}

/// Assemble the absorption vector `[N] ∥ domain_felts ∥ parts…` for
/// `hash_felts(domain, parts)`, with the length prefix `N` and the domain
/// elements as circuit constants.
pub(crate) fn hash_input(
    builder: &mut CircuitBuilder<EF>,
    domain: &str,
    parts: &[&[ExprId]],
) -> Vec<ExprId> {
    let domain = domain_felts(domain);
    let n = domain.len() + parts.iter().map(|p| p.len()).sum::<usize>();
    let mut absorbed = Vec::with_capacity(1 + n);
    absorbed.push(builder.alloc_const(EF::from(BabyBear::new(n as u32)), "absorb_count"));
    for d in domain {
        absorbed.push(builder.alloc_const(EF::from(d), "domain"));
    }
    for part in parts {
        absorbed.extend_from_slice(part);
    }
    absorbed
}

/// Absorb `absorbed` (base field elements embedded in the extension field)
/// with `PaddingFreeSponge` overwrite semantics; returns the final state's
/// rate part as two extension limbs (limb `i` ↔ digest elements `4i..4i+4`).
///
/// One permutation row per rate-sized chunk, `new_start` on the first row
/// (capacity preserved between rows, like the native sponge). Absorbed
/// values are packed 4 base elements per extension limb via
/// `recompose_base_coeffs_to_ext_via_alu` (so private inputs are claimed by
/// an ALU op); a partial final limb mixes the tail of the input with the
/// leftover coefficients of the previous row's output — exactly the native
/// overwrite semantics. `absorb_len = 0` on all rows: the AIR's optional
/// length tag is a different construction (native `DuplexChallenger`), not
/// `PaddingFreeSponge`.
///
/// `absorbed.len()` must be at least [`RATE`] and the first chunk must be
/// full (all hash inputs in this crate are: shortest is the owner-key hash
/// with 12 elements).
pub(crate) fn sponge_absorb(
    builder: &mut CircuitBuilder<EF>,
    absorbed: &[ExprId],
) -> Result<[ExprId; 2], CircuitBuilderError> {
    assert!(
        absorbed.len() >= RATE,
        "sponge input must cover at least one full rate chunk"
    );
    let chunks: Vec<&[ExprId]> = absorbed.chunks(RATE).collect();
    let last_row = chunks.len() - 1;
    let mut last_rate_outputs: Vec<ExprId> = Vec::new();
    let mut final_rate: Option<[ExprId; 2]> = None;
    for (row, chunk) in chunks.into_iter().enumerate() {
        let mut inputs: Vec<Option<ExprId>> = vec![None; 4];
        for ext_idx in 0..2 {
            let base_start = ext_idx * 4;
            let n = chunk.len().saturating_sub(base_start).min(4);
            if n == 0 {
                // No values for this limb: inherit the previous output.
                inputs[ext_idx] = None;
            } else {
                let mut coeffs: Vec<ExprId> = chunk[base_start..base_start + n].to_vec();
                if n < 4 {
                    // Partial limb: leftover positions keep the previous
                    // permutation output (overwrite mode).
                    assert!(row > 0, "first sponge row must be a full chunk");
                    let prev_coeffs = builder
                        .decompose_ext_to_base_coeffs::<BabyBear>(last_rate_outputs[ext_idx])?;
                    coeffs.extend_from_slice(&prev_coeffs[n..]);
                }
                inputs[ext_idx] =
                    Some(builder.recompose_base_coeffs_to_ext_via_alu::<BabyBear>(&coeffs)?);
            }
        }

        let (_, outputs) = builder.add_poseidon2_perm(&Poseidon2PermCall {
            config: Poseidon2Config::BABY_BEAR_D4_W16,
            new_start: row == 0,
            merkle_path: false,
            mmcs_bit: None,
            mmcs_bit2: None,
            inputs,
            out_ctl: vec![true; 2],
            return_all_outputs: false,
            mmcs_index_sum: None,
        })?;

        last_rate_outputs = outputs[..2]
            .iter()
            .map(|o| o.expect("out_ctl exposes both rate limbs"))
            .collect();
        if row == last_row {
            final_rate = Some([last_rate_outputs[0], last_rate_outputs[1]]);
        }
    }
    Ok(final_rate.expect("at least one sponge row"))
}

/// Full `hash_felts(domain, parts)` in-circuit; returns the digest as two
/// extension limbs.
pub(crate) fn hash_felts_limbs(
    builder: &mut CircuitBuilder<EF>,
    domain: &str,
    parts: &[&[ExprId]],
) -> Result<[ExprId; 2], CircuitBuilderError> {
    let absorbed = hash_input(builder, domain, parts);
    sponge_absorb(builder, &absorbed)
}

/// Full `hash_felts(domain, parts)` in-circuit; returns the digest as 8
/// base-element exprs (for feeding into a subsequent hash chain, e.g. the
/// nullifier hash absorbing the coin commitment).
pub(crate) fn hash_felts_base(
    builder: &mut CircuitBuilder<EF>,
    domain: &str,
    parts: &[&[ExprId]],
) -> Result<[ExprId; DIGEST_ELEMS], CircuitBuilderError> {
    let [l0, l1] = hash_felts_limbs(builder, domain, parts)?;
    let c0 = builder.decompose_ext_to_base_coeffs::<BabyBear>(l0)?;
    let c1 = builder.decompose_ext_to_base_coeffs::<BabyBear>(l1)?;
    let mut out = [ExprId::ZERO; DIGEST_ELEMS];
    out[..4].copy_from_slice(&c0);
    out[4..].copy_from_slice(&c1);
    Ok(out)
}

/// Connect a computed digest (rate limbs) to 8 base-element exprs, enforcing
/// equality coefficient-wise (mismatches fail at witness generation with a
/// slot conflict, like every `connect`).
pub(crate) fn connect_digest(
    builder: &mut CircuitBuilder<EF>,
    rate: [ExprId; 2],
    elems: &[ExprId],
) -> Result<(), CircuitBuilderError> {
    assert_eq!(elems.len(), DIGEST_ELEMS);
    let l0 = builder.recompose_base_coeffs_to_ext::<BabyBear>(&elems[0..4])?;
    let l1 = builder.recompose_base_coeffs_to_ext::<BabyBear>(&elems[4..8])?;
    builder.connect(rate[0], l0);
    builder.connect(rate[1], l1);
    Ok(())
}

/// `C = H("coin" ∥ asset_id ∥ v ∥ owner ∥ r)` in-circuit (paper §4.3);
/// returns the commitment as two extension limbs.
pub(crate) fn coin_commitment_limbs(
    builder: &mut CircuitBuilder<EF>,
    asset_id: &[ExprId],
    value: &[ExprId],
    owner: &[ExprId],
    randomness: &[ExprId],
) -> Result<[ExprId; 2], CircuitBuilderError> {
    hash_felts_limbs(builder, "coin", &[asset_id, value, owner, randomness])
}

/// `C = H("coin" ∥ asset_id ∥ v ∥ owner ∥ r)` in-circuit; returns the
/// commitment as 8 base-element exprs (e.g. for the nullifier chain).
pub(crate) fn coin_commitment_base(
    builder: &mut CircuitBuilder<EF>,
    asset_id: &[ExprId],
    value: &[ExprId],
    owner: &[ExprId],
    randomness: &[ExprId],
) -> Result<[ExprId; DIGEST_ELEMS], CircuitBuilderError> {
    hash_felts_base(builder, "coin", &[asset_id, value, owner, randomness])
}
