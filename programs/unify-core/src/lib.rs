use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqkZ7FEfcYkgSQ7VJ2i4wVQb");

#[program]
pub mod unify_core {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.bump = ctx.bumps.platform;
        Ok(())
    }
}

#[account]
pub struct PlatformConfig {
    pub authority: Pubkey,
    pub bump: u8,
}

impl PlatformConfig {
    pub const SIZE: usize = 8 + 32 + 1;
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = PlatformConfig::SIZE,
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, PlatformConfig>,

    pub system_program: Program<'info, System>,
}
