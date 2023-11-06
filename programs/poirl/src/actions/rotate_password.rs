use crate::*;

// *******************
// update_valid_digest
// *******************
#[derive(Accounts)]
pub struct RotatePassword<'info> {
    pub signer: Signer<'info>,
    #[account(mut)]
    pub irl: Account<'info, Irl>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct RotatePasswordParams {
    pub new_password: Option<String>,
    pub lifetime: Option<i64>,
}

impl RotatePasswordParams {
    pub fn none() -> Self {
        Self {
            new_password: None, 
            lifetime: None
        }
    }
}


pub fn rotate_passowrd(ctx: Context<RotatePassword>, params: RotatePasswordParams) -> Result<()> {
    match params.new_password {
        Some(_) => {
            if ctx.accounts.irl.authority != ctx.accounts.signer.key() {
                return Err(PoirlError::WrongAuthority.into());
            }
        },
        None => ()
    }
    match params.lifetime {
        Some(_) => {
            if ctx.accounts.irl.authority != ctx.accounts.signer.key() {
                return Err(PoirlError::WrongAuthority.into());
            }
        },
        None => ()
    }
    Irl::rotate_passowrd(&mut ctx.accounts.irl, &ctx.accounts.clock, params)?;
    Ok(())
}