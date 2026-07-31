//! FileAnchorChain semantics: must match `MockAnchorChain` (first-occurrence,
//! confirmations, positions), plus on-disk persistence.

use opencsv_cli::chain::FileAnchorChain;
use opencsv_core::chain::AnchorChain;
use opencsv_core::{AnchorRecord, Digest};

fn mint_record(tag: u8) -> AnchorRecord {
    AnchorRecord::Mint {
        asset_id: Digest::from_bytes([tag; 32]).to_anchor(),
        value: u64::from(tag) * 10,
        mint_commit: Digest::from_bytes([tag + 1; 32]).to_anchor(),
    }
}

fn xfer_record(tag: u8) -> AnchorRecord {
    AnchorRecord::Xfer {
        nullifier: Digest::from_bytes([tag; 32]).to_anchor(),
    }
}

#[test]
fn append_advance_and_persistence() {
    let tmp = tempfile::tempdir().unwrap();
    let path = tmp.path().join("chain.log");

    let mint_ref;
    let xfer_ref;
    {
        let mut chain = FileAnchorChain::open(&path).unwrap();
        assert_eq!(chain.tip_height(), 0);
        // Appends land in the current tip block with in-block positions.
        mint_ref = chain.append(mint_record(1)).unwrap();
        let xfer2 = chain.append(mint_record(2)).unwrap();
        assert_eq!(mint_ref.location.height, 0);
        assert_eq!(mint_ref.location.position, 0);
        assert_eq!(xfer2.location.position, 1);
        assert_eq!(chain.confirmations_at(0), 1);

        chain.advance_blocks(6).unwrap();
        assert_eq!(chain.tip_height(), 6);
        assert_eq!(chain.confirmations_at(0), 7);

        xfer_ref = chain.append(xfer_record(9)).unwrap();
        assert_eq!(xfer_ref.location.height, 6);
        assert_eq!(xfer_ref.location.position, 0);
        // Above-tip heights have zero confirmations.
        assert_eq!(chain.confirmations_at(7), 0);
    }

    // Reopen: everything replays from the log.
    let chain = FileAnchorChain::open(&path).unwrap();
    assert_eq!(chain.tip_height(), 6);
    assert_eq!(chain.anchor_at(&mint_ref), Some(mint_record(1)));
    assert_eq!(chain.anchor_at(&xfer_ref), Some(xfer_record(9)));
    // txid mismatch → not found.
    let mut bogus = mint_ref;
    bogus.txid[0] ^= 1;
    assert_eq!(chain.anchor_at(&bogus), None);
    assert_eq!(chain.anchors_up_to(0).len(), 2);
    assert_eq!(chain.anchors_up_to(6).len(), 3);
}

#[test]
fn nullifier_first_occurrence_wins() {
    let tmp = tempfile::tempdir().unwrap();
    let path = tmp.path().join("chain.log");
    let mut chain = FileAnchorChain::open(&path).unwrap();

    let record = xfer_record(7);
    let key = record.nullifier_keys()[0];
    let first = chain.append(record).unwrap();
    chain.advance_blocks(3).unwrap();
    let second = chain.append(record).unwrap(); // double-spend attempt
    assert_eq!(chain.first_nullifier_occurrence(&key), Some(first.location));
    assert_eq!(
        chain.nullifier_occurrences(&key),
        vec![first.location, second.location]
    );

    // The index is rebuilt on reopen.
    let chain = FileAnchorChain::open(&path).unwrap();
    assert_eq!(chain.first_nullifier_occurrence(&key), Some(first.location));
}

#[test]
fn corrupt_log_is_rejected() {
    let tmp = tempfile::tempdir().unwrap();
    let path = tmp.path().join("chain.log");
    std::fs::write(&path, "not-a-chain\n").unwrap();
    assert!(FileAnchorChain::open(&path).is_err());

    let path2 = tmp.path().join("chain2.log");
    std::fs::write(&path2, "opencsv-chain-v1\nentry 0 0 zz\n").unwrap();
    assert!(FileAnchorChain::open(&path2).is_err());
}
