import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Poirl } from "../target/types/poirl";
import { BN } from "bn.js";
import idl from "../target/idl/poirl.json";

export const poirlProgram = new Program(idl as anchor.Idl, new web3.PublicKey('5yXZS9y1HQ2Ndu66fogKi7tzJbJZeWGGLTNYX7uc8x3o'));

export const findIrlPda = (arxPubkey) => {
    let [irlPda] = web3.PublicKey.findProgramAddressSync([
      Buffer.from("irl"),
      Buffer.from(arxPubkey.substring(0, 32))
    ], poirlProgram.programId);
    return irlPda;
}

export const fetchIrlState = async (irlPda) => {
    return await poirlProgram.account.irl.fetch(irlPda);
}

export const initIrlIx = async (arxPubkey, name, signerPubkey) => {
    const irlPda = findIrlPda(arxPubkey);
    console.log('-> irlPda: ', irlPda.toString())
    return await poirlProgram.methods.createIrl({
        name,
        arxPubkey
    }).accounts({
        irl: irlPda,
        irlAuth: signerPubkey,
        systemProgram: web3.SystemProgram.programId,
        clock: web3.SYSVAR_CLOCK_PUBKEY
    }).instruction();
}

export const updatePasswordIx = async (irlPda, newPassword, lifetime, signerPubkey) => {
    return await poirlProgram.methods.updatePassword({
        newPassword,
        lifetime: lifetime === null ? null : new BN(lifetime)
    }).accounts({
        irl: irlPda,
        signer: signerPubkey,
        clock: web3.SYSVAR_CLOCK_PUBKEY
    }).instruction();
}

export const proveIrlIx = async (irlPda, signatureData, signerPubkey) => {
    return await poirlProgram.methods.proveInRealLife({
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