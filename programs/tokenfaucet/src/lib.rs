use anchor_lang::prelude::*;
use anchor_spl::{
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("FYCn1UsoWGFGwhdErrbLVBeTGpb3665k61tywbRmhNbY");

const MINT_SEED_BYTES: &[u8] = b"mint";

#[program]
pub mod tokenfaucet {
    use super::*;

    pub fn create_airdrop_mint(_ctx: Context<CreateAirdropMint>, _decimals:u8) -> Result<()> {
        Ok(())
    }

    pub fn execute_airdrop(ctx: Context<ExecuteAirdrop>, amount: u64) -> Result<()> {
        let token_program = ctx.accounts.token_program.to_account_info();
        
        let mint_to_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
            authority: ctx.accounts.mint.to_account_info(),
        };

        let bump = *ctx.bumps.get("mint").unwrap();
        
        mint_to(
            CpiContext::new_with_signer(
                token_program, 
                mint_to_accounts, 
                &[&[
                    MINT_SEED_BYTES,
                    &[bump]
                ]]
            ), 
            amount
        )?;
        
        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(_decimals:u8)]
pub struct CreateAirdropMint<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    
    #[account(
        init, 
        seeds = [MINT_SEED_BYTES], 
        bump,
        payer = signer,
        mint::decimals = _decimals, 
        mint::authority = mint
    )]
    pub mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct ExecuteAirdrop<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    
    #[account(mut, seeds = [MINT_SEED_BYTES], bump)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub recipient: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}
