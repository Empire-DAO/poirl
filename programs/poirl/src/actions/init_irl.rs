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
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitIrlParams {
    arx_pubkey: String,
    name: String
}

pub fn init_irl(ctx: Context<InitIrl>, params: InitIrlParams) -> Result<()> {
    require!(params.name.len() <= 32, PoirlError::NameTooLong);
    ctx.accounts.irl.name = params.name;
    ctx.accounts.irl.arx_pubkey = params.arx_pubkey;
    ctx.accounts.irl.authority = ctx.accounts.irl_auth.key();
    Irl::rotate_passowrd(&mut ctx.accounts.irl, &ctx.accounts.clock, RotatePasswordParams::none())?;
    Ok(())
}