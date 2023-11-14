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
    pub protected: bool
}

impl RotatePasswordParams {
    pub fn none() -> Self {
        Self {
            new_password: None, 
            lifetime: None,
            protected: false
        }
    }

    pub fn new(p: Option<String>, e: Option<i64>) -> Self {
        Self {
            new_password: p, 
            lifetime: e,
            protected: true
        }
    }
}


pub fn rotate_passowrd(ctx: Context<RotatePassword>, params: RotatePasswordParams) -> Result<()> {
    if params.protected {
        match params.new_password {
            Some(_) => {
                require!(ctx.accounts.irl.authority == ctx.accounts.signer.key(), PoirlError::WrongAuthority);
            },
            None => ()
        }
    }
    Irl::rotate_passowrd(&mut ctx.accounts.irl, &ctx.accounts.clock, params.protected, params.new_password, params.lifetime)?;
    Ok(())
}