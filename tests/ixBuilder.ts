import { web3 } from "@coral-xyz/anchor";
import { BN } from "bn.js";

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
        clock: web3.SYSVAR_CLOCK_PUBKEY
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