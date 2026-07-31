# opencsv-pcd benchmarks

Prove time, verify time, and proof size for the coin-proof circuits
(stage 3–4, test-grade FRI parameters — `CoinFriParams::testing()`, **not a
security claim**). Measured with `tests/bench.rs`:

```
cargo test -p opencsv-pcd --test bench -- --ignored --nocapture           # debug
cargo test -p opencsv-pcd --release --test bench -- --ignored --nocapture # release
```

Single-shot measurements (each row costs full recursive proofs, so warm-up
effects are negligible). Proof size is the postcard-serialized
`BatchStarkProof` (the mode + statement envelope adds a constant ~200 bytes
for the consignment encoding).

## Machine

- CPU: INTEL(R) XEON(R) GOLD 6526Y, 64 cores
- RAM: 255 GB (`MemTotal: 254985704 kB`)
- rustc 1.94.0 (4a4ef493e 2026-03-02), Linux x86_64

## Results

### Debug profile (`cargo test`)

| circuit | prove | verify | proof size |
|---|---|---|---|
| genesis mint | 1.56 s | 57.60 ms | 46,431 B |
| transfer (2 mint predecessors) | 70.96 s | 45.93 ms | 56,041 B |
| 2-hop transfer (2 node predecessors) | 70.71 s | 45.97 ms | 56,041 B |
| redeem (1 node predecessor) | 35.35 s | 45.84 ms | 54,058 B |

### Release profile (`cargo test --release`)

| circuit | prove | verify | proof size |
|---|---|---|---|
| genesis mint | 63.70 ms | 3.22 ms | 46,431 B |
| transfer (2 mint predecessors) | 2.97 s | 3.56 ms | 56,041 B |
| 2-hop transfer (2 node predecessors) | 2.96 s | 3.60 ms | 56,041 B |
| redeem (1 node predecessor) | 1.47 s | 3.51 ms | 54,058 B |

## Notes

- Proof size and verify time are constant in history length (PCD): the
  2-hop transfer verifies exactly two predecessors, as does the 1-hop
  transfer; only the predecessor *shape* differs.
- Redeem is cheaper than transfer in proportion to its single in-circuit
  predecessor verification (plus fewer Poseidon2 rows: one coin opening,
  one ownership hash, one nullifier hash, no outputs, no conservation
  gadget).
- Prover-side setup (`ProverData::from_airs_and_degrees` per circuit shape)
  is rebuilt per proof and included in the prove times above; caching it
  per vk is a known optimization (see README "What's next").
