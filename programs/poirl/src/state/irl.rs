use crate::*;
use anchor_lang::solana_program::{
    clock::Clock,
    hash::Hasher,
};
// account
#[account]
pub struct Irl {
    pub authority: Pubkey,
    pub arx_pubkey: String,
    pub name: String, // max 32 chars
    pub password_protected: bool,
    pub password: Option<String>,
    pub expires_at: Option<i64>, 
}

impl Irl {
    pub const LEN: usize = 8
        + 32    // authority
        + 130   // secp256k1 pubkey
        + 32    // name
        + 1     // password protected
        + 64    // password string
        + 8;     // timestamp         

    pub fn new(auth: Pubkey, arx_pubkey: String, name: String) -> Self {
        Self {
            authority: auth,
            arx_pubkey, 
            name, 
            expires_at: None, 
            password: None,
            password_protected: false
        }
    }

    pub fn rotate_passowrd(&mut self, clock: &Sysvar<Clock>, protected: bool, new_password: Option<String>, lifetime: Option<i64>) -> Result<()> {
        if protected {
            self.password_protected = true;
            match new_password {
                Some(np) => {
                    self.password = Some(np);
                },
                None => {
                    let seed1 = "iAmTheEmporer";
                    let seed2 = "KingOfDaCastle";
                    let seed3 = "WAGMIidiots";
                    let timestamp = clock.unix_timestamp;
                    let mut hasher_state = Hasher::default();
                    hasher_state.hashv(&[
                        &timestamp.to_le_bytes(),
                        seed1.as_bytes(),
                        seed2.as_bytes(),
                        seed3.as_bytes()
                    ]);
                    let hash_result = hasher_state.result();
                    self.password = Some(hex::encode(hash_result).to_string());
                }
            }
            match lifetime {
                Some(lt) => {
                    self.expires_at = Some(clock.unix_timestamp + lt);
                },
                None => {
                    self.expires_at = Some(clock.unix_timestamp + 300); // 5 min default
                }
            }
        } else {
            self.password_protected = false;
            self.expires_at = None;
            self.password = None;
        }
        Ok(())
    }

    pub fn recover_digest(&mut self, signer_pubkey: Pubkey) -> Result<String> {
        let mut hasher_state = Hasher::default();
        let digest_str: String = signer_pubkey.to_string() + "_" + self.password.clone().unwrap().as_str();
        msg!("-- recovered_digest: {}", digest_str);
        hasher_state.hashv(&[digest_str.as_bytes()]);
        let hash_result = hasher_state.result();
        Ok(hex::encode(hash_result).to_string())
    }
}