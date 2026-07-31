//! Minimal hex helpers (asset ids, owner keys, coin ids, digests).

use opencsv_core::Digest;

use crate::Error;

/// Lowercase hex encoding.
pub fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Decode hex (upper or lower case), odd lengths rejected.
pub fn from_hex(s: &str) -> Result<Vec<u8>, Error> {
    let s = s.trim();
    if !s.len().is_multiple_of(2) {
        return Err(Error::Hex(format!("odd length {}", s.len())));
    }
    (0..s.len())
        .step_by(2)
        .map(|i| {
            u8::from_str_radix(&s[i..i + 2], 16)
                .map_err(|_| Error::Hex(format!("non-hex byte at offset {i}")))
        })
        .collect()
}

/// Decode a 32-byte digest (asset id, owner key, …) from hex.
pub fn digest_from_hex(s: &str) -> Result<Digest, Error> {
    let bytes = from_hex(s)?;
    let bytes: [u8; 32] = bytes
        .try_into()
        .map_err(|v: Vec<u8>| Error::Hex(format!("expected 32 bytes, got {}", v.len())))?;
    Ok(Digest::from_bytes(bytes))
}
