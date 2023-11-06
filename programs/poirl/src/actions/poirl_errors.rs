use anchor_lang::prelude::*;

#[error_code]
pub enum PoirlError {
    #[msg("Invalid Digest, try again")]
    InvalidDigest,                          // 6000
    #[msg("Invalid Signature")]
    InvalidSignature,                       // 6001
    #[msg("Invalid Arx Pubkey")]
    InvalidArxPubkey,                       // 6002
    #[msg("Name too long")]
    NameTooLong,                            // 6003
    #[msg("Password expired")]
    PasswordExpired,                        // 6004
    #[msg("Wrong Authority")]
    WrongAuthority                          // 6005
}