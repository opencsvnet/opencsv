//! Protocol-level tests for opencsv-core, mirroring paper §4.

use opencsv_core::accept::{accept, public_input};
use opencsv_core::*;

const VK: &[u8] = b"opencsv-test-vk";

fn byte_seed(seed: u8) -> [u8; 32] {
    [seed; 32]
}

fn genesis() -> AssetGenesis {
    let (_, pk) = Ed25519IssuerSignature::keypair_from_seed(byte_seed(1));
    AssetGenesis {
        issuer_pk: pk,
        currency_code: *b"USD",
        terms_hash: Digest::from_bytes(byte_seed(2)),
        nonce: 7,
    }
}

fn secret(seed: u8) -> OwnerSecret {
    OwnerSecret::from_bytes(byte_seed(seed))
}

fn opening_for(asset_id: AssetId, value: u64, owner_seed: u8, r_seed: u8) -> CoinOpening {
    CoinOpening {
        asset_id,
        value,
        owner: secret(owner_seed).owner(),
        randomness: Digest::from_bytes(byte_seed(r_seed)),
    }
}

fn params<'a>(secrets: &'a [OwnerSecret], known: &'a [AssetId]) -> AcceptParams<'a> {
    AcceptParams {
        vk: VK,
        required_confirmations: 6,
        recipient_secrets: secrets,
        known_assets: known,
    }
}

/// Build a consignment whose mock proof matches the given chain anchor.
fn consignment_for(
    chain: &MockAnchorChain,
    anchor_ref: AnchorRef,
    openings: Vec<CoinOpening>,
    aux: Option<AssetGenesis>,
) -> Consignment {
    let record = chain.anchor_at(&anchor_ref).unwrap();
    let x = public_input(&record, &openings);
    Consignment {
        coin_openings: openings,
        proof: MockVerifier::prove(VK, &x),
        anchor_ref,
        aux,
    }
}

// --- Round-trip / determinism (§4.2–4.3) ------------------------------------

#[test]
fn genesis_asset_id_is_stable() {
    assert_eq!(genesis().asset_id(), genesis().asset_id());
    let mut other = genesis();
    other.nonce = 8;
    assert_ne!(genesis().asset_id(), other.asset_id());
    other = genesis();
    other.currency_code = *b"EUR";
    assert_ne!(genesis().asset_id(), other.asset_id());
}

#[test]
fn coin_commitment_and_nullifier_are_deterministic() {
    let asset_id = genesis().asset_id();
    let coin = Coin {
        asset_id,
        value: 100,
        owner: secret(3).owner(),
        randomness: Digest::from_bytes(byte_seed(4)),
    };
    assert_eq!(coin.commitment(), coin.commitment());
    assert_eq!(coin.nullifier(&secret(3)), coin.nullifier(&secret(3)));

    // Hiding: different randomness → different commitment.
    let mut coin2 = coin;
    coin2.randomness = Digest::from_bytes(byte_seed(5));
    assert_ne!(coin.commitment(), coin2.commitment());

    // Nullifier is computable only under the owner's secret.
    assert_ne!(coin.nullifier(&secret(3)), coin.nullifier(&secret(9)));
}

#[test]
fn owner_derivation_matches_hash_of_secret() {
    let osk = secret(3);
    assert_eq!(osk.owner(), osk.owner());
    assert_ne!(osk.owner(), secret(4).owner());
}

#[test]
fn issuer_signature_round_trip() {
    let (sk, pk) = Ed25519IssuerSignature::keypair_from_seed(byte_seed(1));
    let msg = mint_signing_message(&genesis().asset_id(), 100, &Digest::from_bytes(byte_seed(6)));
    let sig = Ed25519IssuerSignature::sign(&sk, &msg);
    assert!(Ed25519IssuerSignature::verify(&pk, &msg, &sig));

    let mut bad = msg.clone();
    bad[20] ^= 1;
    assert!(!Ed25519IssuerSignature::verify(&pk, &bad, &sig));
    let (_, other_pk) = Ed25519IssuerSignature::keypair_from_seed(byte_seed(9));
    assert!(!Ed25519IssuerSignature::verify(&other_pk, &msg, &sig));
}

// --- Anchor records (§4.4–4.6) ----------------------------------------------

fn td(seed: u8) -> TruncatedDigest {
    Digest::from_bytes(byte_seed(seed)).to_anchor()
}

#[test]
fn anchor_records_are_64_bytes_and_round_trip() {
    let records = [
        AnchorRecord::Mint {
            asset_id: td(1),
            value: u64::MAX,
            mint_commit: td(2),
        },
        AnchorRecord::Xfer { nullifier: td(3) },
        AnchorRecord::XferCompressed {
            nullifier_commit: td(4),
        },
        AnchorRecord::Redeem {
            asset_id: td(5),
            value: 42,
            nullifier: td(6),
        },
    ];
    for record in records {
        let bytes = record.to_bytes();
        assert_eq!(bytes.len(), ANCHOR_SIZE);
        assert_eq!(AnchorRecord::from_bytes(&bytes), Ok(record));
    }
}

#[test]
fn anchor_parse_rejects_bad_tag_and_padding() {
    let mut bytes = AnchorRecord::Xfer { nullifier: td(3) }.to_bytes();
    bytes[0] = 0x7f;
    assert!(matches!(
        AnchorRecord::from_bytes(&bytes),
        Err(anchor::AnchorParseError::UnknownTag(0x7f))
    ));
    let mut bytes = AnchorRecord::Xfer { nullifier: td(3) }.to_bytes();
    bytes[63] = 1;
    assert_eq!(
        AnchorRecord::from_bytes(&bytes),
        Err(anchor::AnchorParseError::NonZeroPadding)
    );
}

// --- Mock chain (§4.7) --------------------------------------------------------

#[test]
fn mock_chain_first_occurrence_and_double_spend() {
    let mut chain = MockAnchorChain::new();
    let nf = td(7);
    let first = chain.append(AnchorRecord::Xfer { nullifier: nf });
    chain.advance_blocks(1);
    let second = chain.append(AnchorRecord::Xfer { nullifier: nf });

    assert_eq!(
        chain.first_nullifier_occurrence(&nf),
        Some(first.location)
    );
    assert_eq!(
        chain.nullifier_occurrences(&nf),
        vec![first.location, second.location]
    );
    // The second occurrence is flagged: it is not the authoritative spend.
    assert_ne!(chain.first_nullifier_occurrence(&nf), Some(second.location));
}

#[test]
fn mock_chain_confirmation_depth() {
    let mut chain = MockAnchorChain::new();
    let r = chain.append(AnchorRecord::Xfer { nullifier: td(8) });
    assert_eq!(chain.confirmations_at(r.location.height), 1);
    chain.advance_blocks(5);
    assert_eq!(chain.confirmations_at(r.location.height), 6);
    assert_eq!(chain.confirmations_at(chain.tip_height() + 10), 0);
}

#[test]
fn mock_chain_lookup_by_txid_and_position() {
    let mut chain = MockAnchorChain::new();
    let record = AnchorRecord::Mint {
        asset_id: td(1),
        value: 10,
        mint_commit: td(2),
    };
    let r = chain.append(record);
    assert_eq!(chain.anchor_at(&r), Some(record));
    let mut wrong = r;
    wrong.txid[0] ^= 1;
    assert_eq!(chain.anchor_at(&wrong), None);
    let mut wrong = r;
    wrong.location.position = 99;
    assert_eq!(chain.anchor_at(&wrong), None);
}

// --- Accept driver (§4.8) ------------------------------------------------------

fn mint_anchor(chain: &mut MockAnchorChain, asset_id: &AssetId, value: u64) -> AnchorRef {
    chain.append(AnchorRecord::Mint {
        asset_id: asset_id.to_anchor(),
        value,
        mint_commit: mint_commit(asset_id, value, &Digest::from_bytes(byte_seed(6))).to_anchor(),
    })
}

#[test]
fn accept_mint_consignment_happy_path_with_genesis_aux() {
    let g = genesis();
    let asset_id = g.asset_id();
    let mut chain = MockAnchorChain::new();
    let anchor_ref = mint_anchor(&mut chain, &asset_id, 100);
    let openings = vec![opening_for(asset_id, 100, 3, 4)];
    let consignment = consignment_for(&chain, anchor_ref, openings, Some(g));
    chain.advance_blocks(5); // → 6 confirmations

    let accepted = accept(
        &consignment,
        &chain,
        &MockVerifier,
        &params(&[secret(3)], &[]),
    )
    .expect("valid mint consignment");
    assert_eq!(accepted.coins.len(), 1);
    assert_eq!(accepted.coins[0].value, 100);
    assert_eq!(accepted.anchor, anchor_ref.location);
}

#[test]
fn accept_transfer_consignment_happy_path() {
    let g = genesis();
    let asset_id = g.asset_id();
    // The spent coin (sender's), now being consumed.
    let spent = Coin {
        asset_id,
        value: 60,
        owner: secret(8).owner(),
        randomness: Digest::from_bytes(byte_seed(7)),
    };
    let nf = spent.nullifier(&secret(8));

    let mut chain = MockAnchorChain::new();
    let anchor_ref = chain.append(AnchorRecord::Xfer {
        nullifier: nf.to_anchor(),
    });
    let openings = vec![opening_for(asset_id, 60, 3, 4)];
    let consignment = consignment_for(&chain, anchor_ref, openings, None);
    chain.advance_blocks(5);

    let accepted = accept(
        &consignment,
        &chain,
        &MockVerifier,
        &params(&[secret(3)], &[asset_id]),
    )
    .expect("valid transfer consignment");
    assert_eq!(accepted.coins.len(), 1);
}

#[test]
fn accept_rejects_bad_proof() {
    let g = genesis();
    let asset_id = g.asset_id();
    let mut chain = MockAnchorChain::new();
    let anchor_ref = mint_anchor(&mut chain, &asset_id, 100);
    let openings = vec![opening_for(asset_id, 100, 3, 4)];
    let mut consignment = consignment_for(&chain, anchor_ref, openings, Some(g));
    chain.advance_blocks(5);
    let n = consignment.proof.len();
    consignment.proof[n - 1] ^= 1; // corrupt the mock checksum

    assert_eq!(
        accept(&consignment, &chain, &MockVerifier, &params(&[secret(3)], &[])),
        Err(RejectReason::InvalidProof)
    );
}

#[test]
fn accept_rejects_unknown_anchor() {
    let g = genesis();
    let asset_id = g.asset_id();
    let mut chain = MockAnchorChain::new();
    let anchor_ref = mint_anchor(&mut chain, &asset_id, 100);
    let openings = vec![opening_for(asset_id, 100, 3, 4)];
    let mut consignment = consignment_for(&chain, anchor_ref, openings, Some(g));
    chain.advance_blocks(5);
    consignment.anchor_ref.location.position = 99;

    assert_eq!(
        accept(&consignment, &chain, &MockVerifier, &params(&[secret(3)], &[])),
        Err(RejectReason::AnchorNotFound)
    );
}

#[test]
fn accept_rejects_insufficient_confirmations() {
    let g = genesis();
    let asset_id = g.asset_id();
    let mut chain = MockAnchorChain::new();
    let anchor_ref = mint_anchor(&mut chain, &asset_id, 100);
    let openings = vec![opening_for(asset_id, 100, 3, 4)];
    let consignment = consignment_for(&chain, anchor_ref, openings, Some(g));
    chain.advance_blocks(3); // only 4 confirmations

    assert_eq!(
        accept(&consignment, &chain, &MockVerifier, &params(&[secret(3)], &[])),
        Err(RejectReason::InsufficientConfirmations {
            have: 4,
            required: 6
        })
    );
}

#[test]
fn accept_rejects_earlier_conflicting_nullifier() {
    let g = genesis();
    let asset_id = g.asset_id();
    let spent = Coin {
        asset_id,
        value: 60,
        owner: secret(8).owner(),
        randomness: Digest::from_bytes(byte_seed(7)),
    };
    let nf = spent.nullifier(&secret(8)).to_anchor();

    let mut chain = MockAnchorChain::new();
    // The authoritative spend comes first.
    chain.append(AnchorRecord::Xfer { nullifier: nf });
    chain.advance_blocks(1);
    // The double-spend race anchor the attacker shows to the victim.
    let second_ref = chain.append(AnchorRecord::Xfer { nullifier: nf });
    let openings = vec![opening_for(asset_id, 60, 3, 4)];
    let consignment = consignment_for(&chain, second_ref, openings, None);
    chain.advance_blocks(5);

    let err = accept(
        &consignment,
        &chain,
        &MockVerifier,
        &params(&[secret(3)], &[asset_id]),
    )
    .unwrap_err();
    assert!(matches!(err, RejectReason::NullifierConflict { .. }));
}

#[test]
fn accept_rejects_unknown_asset_without_genesis_aux() {
    let g = genesis();
    let asset_id = g.asset_id();
    let mut chain = MockAnchorChain::new();
    let anchor_ref = mint_anchor(&mut chain, &asset_id, 100);
    let openings = vec![opening_for(asset_id, 100, 3, 4)];
    let consignment = consignment_for(&chain, anchor_ref, openings, None); // no aux
    chain.advance_blocks(5);

    assert_eq!(
        accept(&consignment, &chain, &MockVerifier, &params(&[secret(3)], &[])),
        Err(RejectReason::UnknownAsset)
    );

    // … but is accepted if the asset was pinned, or if aux matches.
    let ok = accept(
        &consignment,
        &chain,
        &MockVerifier,
        &params(&[secret(3)], &[asset_id]),
    );
    assert!(ok.is_ok());
}

#[test]
fn accept_rejects_mismatched_genesis_aux() {
    let g = genesis();
    let asset_id = g.asset_id();
    let mut other = g.clone();
    other.nonce = 99; // different asset
    let mut chain = MockAnchorChain::new();
    let anchor_ref = mint_anchor(&mut chain, &asset_id, 100);
    let openings = vec![opening_for(asset_id, 100, 3, 4)];
    let consignment = consignment_for(&chain, anchor_ref, openings, Some(other));
    chain.advance_blocks(5);

    assert_eq!(
        accept(&consignment, &chain, &MockVerifier, &params(&[secret(3)], &[])),
        Err(RejectReason::GenesisMismatch)
    );
}

#[test]
fn accept_rejects_when_nothing_is_owned() {
    let g = genesis();
    let asset_id = g.asset_id();
    let mut chain = MockAnchorChain::new();
    let anchor_ref = mint_anchor(&mut chain, &asset_id, 100);
    let openings = vec![opening_for(asset_id, 100, 3, 4)]; // owned by secret(3)
    let consignment = consignment_for(&chain, anchor_ref, openings, Some(g));
    chain.advance_blocks(5);

    assert_eq!(
        accept(&consignment, &chain, &MockVerifier, &params(&[secret(9)], &[])),
        Err(RejectReason::NoOwnedOutput)
    );
}

// --- Consignment serialization (§4.8) -----------------------------------------

#[test]
fn consignment_bincode_round_trip() {
    let g = genesis();
    let asset_id = g.asset_id();
    let mut chain = MockAnchorChain::new();
    let anchor_ref = mint_anchor(&mut chain, &asset_id, 100);
    let consignment = consignment_for(
        &chain,
        anchor_ref,
        vec![opening_for(asset_id, 100, 3, 4)],
        Some(g),
    );
    let bytes = consignment.to_bytes();
    assert_eq!(Consignment::from_bytes(&bytes).unwrap(), consignment);
    assert!(Consignment::from_bytes(&bytes[..bytes.len() - 1]).is_err());
}

// --- Supply audit (§4.9) -------------------------------------------------------

#[test]
fn supply_audit_counts_mints_and_redeems_not_transfers() {
    let g = genesis();
    let asset_id = g.asset_id();
    let other_asset = Digest::from_bytes(byte_seed(42));

    let mut chain = MockAnchorChain::new();
    mint_anchor(&mut chain, &asset_id, 100); // height 0
    let h0 = chain.tip_height();
    chain.advance_blocks(1);
    mint_anchor(&mut chain, &asset_id, 50); // height 1
    let h1 = chain.tip_height();
    // A mint of a *different* asset must not count.
    chain.append(AnchorRecord::Mint {
        asset_id: other_asset.to_anchor(),
        value: 999,
        mint_commit: td(11),
    });
    chain.advance_blocks(1);
    // Transfers do not change supply.
    chain.append(AnchorRecord::Xfer { nullifier: td(12) });
    chain.append(AnchorRecord::XferCompressed {
        nullifier_commit: td(13),
    });
    let h2 = chain.tip_height();
    chain.advance_blocks(1);
    chain.append(AnchorRecord::Redeem {
        asset_id: asset_id.to_anchor(),
        value: 30,
        nullifier: td(14),
    });
    let h3 = chain.tip_height();

    assert_eq!(supply(&chain, &asset_id, h0), Ok(100));
    assert_eq!(supply(&chain, &asset_id, h1), Ok(150));
    assert_eq!(supply(&chain, &asset_id, h2), Ok(150));
    assert_eq!(supply(&chain, &asset_id, h3), Ok(120));
    assert_eq!(supply(&chain, &other_asset, h3), Ok(999));
}

#[test]
fn supply_audit_flags_overspent_asset() {
    let asset_id = genesis().asset_id();
    let mut chain = MockAnchorChain::new();
    chain.append(AnchorRecord::Redeem {
        asset_id: asset_id.to_anchor(),
        value: 1,
        nullifier: td(15),
    });
    assert_eq!(supply(&chain, &asset_id, 0), Err(SupplyError::NegativeSupply));
}
