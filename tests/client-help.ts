import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Poirl } from "../target/types/poirl";
import fs from "fs";
import { BN } from "bn.js";
const {PublicKey, Keypair, TransactionMessage, VersionedTransaction} = web3;

const LOGGER = Boolean(process.env.log);

export const loadCliWallet = (filepath) => {
    const data = fs.readFileSync(filepath);
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(data)));
}

export const requestAirdrop = async (publicKey, amount) => {
    const connection = new web3.Connection(process.env.RPC);
    await connection.requestAirdrop(publicKey, web3.LAMPORTS_PER_SOL * amount);
}

export const getErrorCode = (result) => {
    return result.value.err.InstructionError[1].Custom;
}

export const sendTx = async (ixs, signer, finalized = false) => {
    const connection = new web3.Connection(process.env.RPC);
    const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
    const txMessage = new TransactionMessage({
        recentBlockhash: blockhash,
        instructions: ixs,
        payerKey: signer.publicKey,
    });
    const tx = new VersionedTransaction(txMessage.compileToV0Message());
    tx.sign([signer]);
    const sig = await connection.sendTransaction(tx, {skipPreflight: true, preflightCommitment: 'confirmed'});
    const result = await connection.confirmTransaction({
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        signature: sig,
      }, finalized ? 'finalized' : 'confirmed');
    if (LOGGER) {
        console.log("-- tx: ", sig);
    }
    return result;
}

export const findIrlPda = (program, signerPubkey, name) => {
    let [irlPda] = web3.PublicKey.findProgramAddressSync([
      Buffer.from("irl"),
      signerPubkey.toBuffer(),
      Buffer.from(name)
    ], program.programId);
    return irlPda;
}

export const fetchIrlState = async (program, irlPda) => {
    return await program.account.irl.fetch(irlPda, {commitment: "confimred"});
}

export const initIrlIx = async (program, arxPubkey, name, signerPubkey) => {
    const irlPda = findIrlPda(program, signerPubkey, name);
    return await program.methods.createIrl({
        name,
        arxPubkey
    }).accounts({
        irl: irlPda,
        irlAuth: signerPubkey,
        systemProgram: web3.SystemProgram.programId,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        slotHashes: web3.SYSVAR_SLOT_HASHES_PUBKEY
    }).instruction();
}

export const updatePasswordIx = async (program, irlPda, newPassword, lifetime, signerPubkey) => {
    return await program.methods.updatePassword({
        newPassword,
        lifetime: lifetime === null ? null : new BN(lifetime)
    }).accounts({
        irl: irlPda,
        signer: signerPubkey,
        clock: web3.SYSVAR_CLOCK_PUBKEY
    }).instruction();
}

export const proveIrlIx = async (program, irlPda, signatureData, signerPubkey) => {
    return await program.methods.proveInRealLife({
        arxPubkey: signatureData.arxPubkey,
        digest: signatureData.digest,
        r: signatureData.r,
        s: signatureData.s,
        v: signatureData.v
    }).accounts({
        irl: irlPda,
        signer: signerPubkey,
        clock: web3.SYSVAR_CLOCK_PUBKEY
    }).instruction();
}