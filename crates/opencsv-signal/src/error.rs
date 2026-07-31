//! The transport error type.
//!
//! presage errors are generic over the store's error type
//! (`presage::Error<S::Error>`), which is awkward to thread through a
//! prototype API, so everything from presage is stringified into the
//! variants below.

use std::path::PathBuf;

/// Everything that can go wrong in the Signal transport.
#[derive(Debug)]
pub enum Error {
    /// Filesystem failure on the store directory.
    Io {
        /// The path being accessed.
        path: PathBuf,
        /// The underlying I/O error.
        source: std::io::Error,
    },
    /// The store directory holds no registration (run `opencsv signal link`).
    NotRegistered,
    /// A recipient string did not parse, or did not resolve to a contact.
    Recipient(String),
    /// Attachment upload or download failed.
    Attachment(String),
    /// Anything from presage / libsignal-service (network, protocol, store).
    Signal(String),
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io { path, source } => write!(f, "{}: {source}", path.display()),
            Self::NotRegistered => write!(
                f,
                "no Signal registration in this store (run `opencsv signal link` first)"
            ),
            Self::Recipient(m) => write!(f, "{m}"),
            Self::Attachment(m) => write!(f, "attachment error: {m}"),
            Self::Signal(m) => write!(f, "signal error: {m}"),
        }
    }
}

impl std::error::Error for Error {}
