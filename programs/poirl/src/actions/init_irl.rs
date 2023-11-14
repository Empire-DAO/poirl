use solana_program::sysvar;
use crate::*;

// *********************************************************
// init_irl("irl", params.name)
// *********************************************************
#[derive(Accounts)]
#[instruction(params: InitIrlParams)]
pub struct InitIrl<'info> {
    #[account(
        init,
        space=Irl::LEN,
        payer = irl_auth,
        seeds=["irl".as_bytes(), &params.arx_pubkey[..32].as_bytes()],
        bump,
    )]
    pub irl: Account<'info, Irl>,
    #[account(mut)]
    pub irl_auth: Signer<'info>,
    /// CHECK: system program is ok
    pub system_program: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
    /// CHECK: SLOT_HASHES ok
    pub slot_hashes: UncheckedAccount<'info>
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitIrlParams {
    arx_pubkey: String,
    name: String
}

pub fn init_irl(ctx: Context<InitIrl>, params: InitIrlParams) -> Result<()> {
    // slot hashes testing
    if ctx.accounts.slot_hashes.key() != sysvar::slot_hashes::id() {
        msg!("Invalid SlotHashes sysvar");
        return Err(PoirlError::WrongAuthority.into());
    }
    msg!("-- correct sysvar account");
    let data = ctx.accounts.slot_hashes.try_borrow_data()?;
    let num_slot_hashes = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let mut pos = 8;
    for _i in 0..num_slot_hashes {
        let slot = u64::from_le_bytes(data[pos..pos + 8].try_into().unwrap());
        pos += 8;
        let hash = &data[pos..pos + 32];
        msg!("slot: {}", slot);
        msg!("bytes: {:?}", hash);
        msg!("hash: {}", bs58::encode(hash).into_string());
        pos += 32;
    }


    require!(params.name.len() <= 32, PoirlError::NameTooLong);
    ctx.accounts.irl.name = params.name;
    ctx.accounts.irl.arx_pubkey = params.arx_pubkey;
    ctx.accounts.irl.authority = ctx.accounts.irl_auth.key();
    Irl::rotate_passowrd(&mut ctx.accounts.irl, &ctx.accounts.clock, RotatePasswordParams::none())?;
    Ok(())
}