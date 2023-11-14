use anchor_lang::prelude::*;
use solana_program::secp256k1_recover::{secp256k1_recover, Secp256k1Pubkey};
pub mod state;
pub use state::*;
pub mod actions;
pub use actions::*;

declare_id!("Adqu9U29r9oQHiBxvykpw8MnYMSbbBwC2YH4z9shbdfq");

#[program]
pub mod poirl {
    use super::*;

    pub fn create_irl<'info>(
        ctx: Context<'_, '_, '_, 'info, InitIrl<'info>>,
        params: InitIrlParams
    ) -> Result<()> {
        init_irl(ctx, params)
    }

    pub fn prove_in_real_life<'info>(
        ctx: Context<'_, '_, '_, 'info, ProveIrl<'info>>,
        params: ProveIrlParams
    ) -> Result<()> {
        prove_irl(ctx, params)
    }

    pub fn update_password<'info>(
        ctx: Context<'_, '_, '_, 'info, RotatePassword<'info>>,
        params: RotatePasswordParams
    ) -> Result<()> {
        rotate_passowrd(ctx, params)
    }
}