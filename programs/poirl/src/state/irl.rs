use crate::*;
use anchor_lang::solana_program::{
    clock::Clock,
    hash::Hasher,
};
// account
#[account]
pub struct Irl {
    pub authority: Pubkey,
    pub password: String,
    pub expires_at: i64, 
    pub arx_pubkey: String,
    pub name: String, // max 32 chars
}

impl Irl {
    pub const LEN: usize = 8
        + 32 // authority
        + 64 // password string
        + 8 // timestamp 
        + 32 // name
        + 130; // secp256k1 pubkey

    pub fn rotate_passowrd(&mut self, clock: &Sysvar<Clock>, params: RotatePasswordParams) -> Result<()> {
        match params.new_password {
            Some(np) => {
                self.password = np;
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
                self.password = hex::encode(hash_result).to_string();
            }
        }
        match params.lifetime {
            Some(lt) => {
                self.expires_at = clock.unix_timestamp + lt;
            },
            None => {
                self.expires_at = clock.unix_timestamp + 120;
            }
        }
        msg!("-- new password: {}", self.password);
        msg!("-- expires at: {}", self.expires_at);
        Ok(())
    }

    pub fn recover_digest(&mut self, signer_pubkey: Pubkey) -> Result<String> {
        let mut hasher_state = Hasher::default();
        let digest_str = signer_pubkey.to_string() + "_" + &self.password;
        msg!("-- recovered_digest: {}", digest_str);
        hasher_state.hashv(&[digest_str.as_bytes()]);
        let hash_result = hasher_state.result();
        Ok(hex::encode(hash_result).to_string())
    }
}