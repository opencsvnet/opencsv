//! Message-format logic for the Signal transport: how a consignment blob is
//! recognised inside a Signal message, and how recipient strings parse.
//!
//! Everything in this module is pure and network-free so it can be unit
//! tested without talking to Signal servers.

use std::str::FromStr;

use presage::libsignal_service::prelude::Uuid;
use presage::libsignal_service::prelude::phonenumber::PhoneNumber;

use crate::Error;

/// File name a consignment blob is sent under.
pub const CONSIGNMENT_FILENAME: &str = "opencsv-consignment.bin";

/// Marker text body that accompanies a consignment attachment.
pub const CONSIGNMENT_BODY: &str = "OpenCSV consignment";

/// Content type a consignment attachment is uploaded with.
pub const CONSIGNMENT_CONTENT_TYPE: &str = "application/octet-stream";

/// Who a consignment is sent to.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Recipient {
    /// Note to Self — the linked account's own ACI (the demo path).
    SelfNote,
    /// A Signal account identifier (uuid).
    Aci(Uuid),
    /// An E.164 phone number; resolved to an ACI via the synced contacts.
    Phone(PhoneNumber),
}

/// Parse a recipient string: `self`, an ACI uuid, or an E.164 phone number.
pub fn parse_recipient(s: &str) -> Result<Recipient, Error> {
    let s = s.trim();
    if s.eq_ignore_ascii_case("self") {
        return Ok(Recipient::SelfNote);
    }
    if let Ok(uuid) = Uuid::parse_str(s) {
        return Ok(Recipient::Aci(uuid));
    }
    if s.starts_with('+') {
        if let Ok(phone) = PhoneNumber::from_str(s) {
            return Ok(Recipient::Phone(phone));
        }
    }
    Err(Error::Recipient(format!(
        "recipient must be `self`, an ACI uuid, or an E.164 phone number like +15551234567; got `{s}`"
    )))
}

/// Decide whether an attachment carries an OpenCSV consignment.
///
/// An attachment counts when its file name is [`CONSIGNMENT_FILENAME`], or
/// when the message body starts with the [`CONSIGNMENT_BODY`] marker and the
/// attachment is opaque binary data (the content type we upload with, or
/// none — some clients strip it).
pub fn is_consignment_attachment(
    file_name: Option<&str>,
    content_type: Option<&str>,
    body: Option<&str>,
) -> bool {
    if file_name == Some(CONSIGNMENT_FILENAME) {
        return true;
    }
    let marked = body.is_some_and(|b| b.starts_with(CONSIGNMENT_BODY));
    let opaque =
        content_type.is_none_or(|c| c.is_empty() || c.eq_ignore_ascii_case(CONSIGNMENT_CONTENT_TYPE));
    marked && opaque
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recipient_self_is_case_insensitive() {
        assert_eq!(parse_recipient("self").unwrap(), Recipient::SelfNote);
        assert_eq!(parse_recipient("Self").unwrap(), Recipient::SelfNote);
        assert_eq!(parse_recipient(" SELF ").unwrap(), Recipient::SelfNote);
    }

    #[test]
    fn recipient_aci_uuid() {
        let uuid = Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap();
        assert_eq!(
            parse_recipient("123e4567-e89b-12d3-a456-426614174000").unwrap(),
            Recipient::Aci(uuid)
        );
    }

    #[test]
    fn recipient_e164_phone() {
        match parse_recipient("+15551234567").unwrap() {
            Recipient::Phone(p) => assert_eq!(p.to_string(), "+15551234567"),
            other => panic!("expected phone recipient, got {other:?}"),
        }
    }

    #[test]
    fn recipient_rejects_garbage() {
        for bad in ["", "alice", "+", "+abc", "12345", "self@example.com"] {
            assert!(parse_recipient(bad).is_err(), "accepted `{bad}`");
        }
    }

    #[test]
    fn consignment_by_filename() {
        assert!(is_consignment_attachment(
            Some(CONSIGNMENT_FILENAME),
            Some(CONSIGNMENT_CONTENT_TYPE),
            None
        ));
        // File name alone is decisive, whatever the content type.
        assert!(is_consignment_attachment(
            Some(CONSIGNMENT_FILENAME),
            Some("image/png"),
            None
        ));
    }

    #[test]
    fn consignment_by_marker_body() {
        assert!(is_consignment_attachment(
            Some("blob.bin"),
            Some(CONSIGNMENT_CONTENT_TYPE),
            Some(CONSIGNMENT_BODY)
        ));
        // Marker with trailing note still matches.
        assert!(is_consignment_attachment(
            None,
            Some(CONSIGNMENT_CONTENT_TYPE),
            Some("OpenCSV consignment (2 coins)")
        ));
        // Missing content type still matches a marked message.
        assert!(is_consignment_attachment(None, None, Some(CONSIGNMENT_BODY)));
    }

    #[test]
    fn ordinary_messages_are_not_consignments() {
        // Plain text, no attachment naming.
        assert!(!is_consignment_attachment(None, None, Some("hello")));
        // Marker body but a non-opaque attachment (e.g. a photo with a caption).
        assert!(!is_consignment_attachment(
            Some("photo.jpg"),
            Some("image/jpeg"),
            Some(CONSIGNMENT_BODY)
        ));
        // Random binary attachment without any marker.
        assert!(!is_consignment_attachment(
            Some("data.bin"),
            Some(CONSIGNMENT_CONTENT_TYPE),
            None
        ));
    }
}
