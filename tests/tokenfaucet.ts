import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Tokenfaucet } from "../target/types/tokenfaucet";
import {PublicKey, Keypair, } from "@solana/web3.js";
import * as spl_token from "@solana/spl-token";
import { expect } from "chai";

describe("tokenfaucet", () => {
  const signerKeypair = Keypair.generate();
  const lamportsRequired = 40000000;
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Tokenfaucet as Program<Tokenfaucet>;
  const mintDecimals = 6;

  let [mintAddress, mintAddressBump] = PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("mint"),
    ], program.programId);

  console.log('signer account: ', signerKeypair.publicKey.toBase58());

  before(() => {
    return new Promise<void>(async (resolve,reject) => {

      console.log(`funding signer account with ${lamportsRequired} lamports...`);
      
      const airdropSignature = await provider.connection
        .requestAirdrop(signerKeypair.publicKey, lamportsRequired)
        .catch(reject);

      if(!airdropSignature)
        return;   

      const airdropConfirmation = await provider.connection
        .confirmTransaction(airdropSignature,'finalized')
        .catch(reject);

      if(!airdropConfirmation)
        return;

      resolve();
    });

  });

  it("Create Mint", async () => {
    console.log(`creating ${mintDecimals} decimal mint: `, mintAddress.toBase58());

    try{
    const existingMint = await spl_token
      .getMint(provider.connection, mintAddress,'confirmed', spl_token.TOKEN_PROGRAM_ID)
      .catch();

    if(existingMint) {
      console.log('mint already exists.');
      return;
    }
  } catch(err) {
  }

    const tx = await program.methods
      .createAirdropMint(mintDecimals)
      .accounts({
        signer: signerKeypair.publicKey,
        mint: mintAddress,
      })
      .transaction();
    
      const txSignature = await anchor.web3.sendAndConfirmTransaction(provider.connection, tx, [signerKeypair], {commitment: 'finalized'});
      
      console.log("transaction signature", txSignature);

      const mintAccount = await spl_token.getMint(provider.connection, mintAddress,'confirmed', spl_token.TOKEN_PROGRAM_ID);
      expect(mintAccount.address).is.eql(mintAddress)
      expect(mintAccount.decimals).is.equal(mintDecimals);
      expect(mintAccount.supply).is.equal(BigInt(0));
      expect(mintAccount.mintAuthority).is.eql(mintAddress);
      expect(mintAccount.isInitialized).is.equal(true);    
  });
  
it("Airdrop", async() => {
    const airDropAmount = 1;

    const signerTokenAccount = await spl_token.getOrCreateAssociatedTokenAccount(
      provider.connection,
      signerKeypair,
      mintAddress,
      signerKeypair.publicKey,
      false,
      'finalized',
      {commitment:'finalized'},
      spl_token.TOKEN_PROGRAM_ID,
      spl_token.ASSOCIATED_TOKEN_PROGRAM_ID);

    console.log('signer token account: ', signerTokenAccount.address.toBase58());

    const tx = await program.methods
      .executeAirdrop(new anchor.BN(airDropAmount))
      .accounts({
        mint: mintAddress,
        recipient: signerTokenAccount.address,
        signer: signerKeypair.publicKey
      })
      .transaction();

    const txSignature = await anchor.web3.sendAndConfirmTransaction(provider.connection, tx, [signerKeypair], {commitment: 'finalized'});
    console.log("transaction signature", txSignature);

    const updatedSignerTokenAccount = await spl_token.getAccount(provider.connection, signerTokenAccount.address,'confirmed', spl_token.TOKEN_PROGRAM_ID);
    expect(updatedSignerTokenAccount.mint).is.eql(mintAddress);
    expect(updatedSignerTokenAccount.address).is.eql(signerTokenAccount.address)
    expect(updatedSignerTokenAccount.amount).is.equal(BigInt(airDropAmount));
    expect(updatedSignerTokenAccount.owner).is.eql(signerKeypair.publicKey);
  });
  
});
