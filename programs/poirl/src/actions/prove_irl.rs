use crate::*;

// *******************
// init_irl
// *******************
#[derive(Accounts)]
#[instruction(params: InitIrlParams)]
pub struct ProveIrl<'info> {
    pub signer: Signer<'info>,
    #[account(mut)]
    pub irl: Account<'info, Irl>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ProveIrlParams {
    pub arx_pubkey: String,
    pub digest: String,
    pub r: String,
    pub s: String,
    pub v: u8,
}

pub fn prove_irl(ctx: Context<ProveIrl>, params: ProveIrlParams) -> Result<()> {
    // assert IRL match for arx pubkey on chain
    require!(params.arx_pubkey == ctx.accounts.irl.arx_pubkey, PoirlError::InvalidArxPubkey);
    // assert digest contains signer pubkey + password
    let recovered_digest = Irl::recover_digest(&mut ctx.accounts.irl, ctx.accounts.signer.key())?;
    require!(params.digest == recovered_digest, PoirlError::InvalidDigest);
    // assert password has not expired
    msg!("current time: {}", ctx.accounts.clock.unix_timestamp);
    msg!("expires at: {}", ctx.accounts.irl.expires_at);
    require!(ctx.accounts.clock.unix_timestamp < ctx.accounts.irl.expires_at, PoirlError::PasswordExpired);

    // build inputted pubkey for comparison
    let public_key_str = &params.arx_pubkey[2..];
    let public_key_bytes = hex::decode(public_key_str).unwrap();
    let valid_public_key_bytes: [u8; 64] = public_key_bytes[..64].try_into().unwrap();
    let secp256k1_pubkey = Secp256k1Pubkey(valid_public_key_bytes);

    // recover pubkey from signature
    let digest = hex::decode(params.digest.clone()).unwrap();
    let signature_r = hex::decode(params.r).unwrap();
    let signature_s = hex::decode(params.s).unwrap();
    let recovery_id = (params.v - 27) as u8;
    let signature: Vec<u8> = [signature_r, signature_s].concat();
    let recovered_pubkey = secp256k1_recover(&digest, recovery_id, &signature);
    
    // verify pubkey's match
    match recovered_pubkey {
        Ok(recovered_pk) => {
            if secp256k1_pubkey.to_bytes() == recovered_pk.to_bytes() {
                msg!("-- Valid Signature! :)");
            } else {
                msg!("-- Invalid signature.");
                return Err(PoirlError::InvalidSignature.into());
            }
        }
        Err(err) => {
            msg!("Signature verification failed: {:?}", err);
            return Err(PoirlError::InvalidSignature.into());
        }
    }

    Ok(())
}