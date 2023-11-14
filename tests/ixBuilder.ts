import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Poirl } from "../target/types/poirl";
import { BN } from "bn.js";
import idl from "../target/idl/poirl.json";
import { getConnection } from "../../test_dir/test-help";

const connection = getConnection();
anchor.setProvider(anchor.AnchorProvider.env());
export const poirlProgram = new Program(idl as anchor.Idl, new web3.PublicKey('Adqu9U29r9oQHiBxvykpw8MnYMSbbBwC2YH4z9shbdfq'));
// ****************************************
// PDAs
// ****************************************
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

// ****************************************
// INIT IX
// ****************************************
export const initIrlIx = async (arxPubkey, name, signerPubkey, passwordProtected, password, lifetime) => {
    const irlPda = findIrlPda(arxPubkey);
    return await poirlProgram.methods.createIrl({
        name,
        arxPubkey,
        protected: passwordProtected,
        password,
        lifetime: lifetime ? new BN(lifetime) : lifetime
    }).accounts({
        irl: irlPda,
        irlAuth: signerPubkey,
        systemProgram: web3.SystemProgram.programId,
        clock: web3.SYSVAR_CLOCK_PUBKEY
    }).instruction();
}

// ****************************************
// INTERACTION
// ****************************************
export const updatePasswordIx = async (irlPda, passwordProtected, newPassword, lifetime, signerPubkey) => {
    return await poirlProgram.methods.updatePassword({
        protected: passwordProtected,
        newPassword,
        lifetime: lifetime !== null ? new anchor.BN(lifetime) : lifetime
    }).accounts({
        irl: irlPda,
        signer: signerPubkey,
        clock: web3.SYSVAR_CLOCK_PUBKEY
    }).instruction();
}
export const proveIrlIx = async (irlPda, signatureData, signerPubkey) => {
    const slotInfo = await connection.getLatestBlockhashAndContext();
    return await poirlProgram.methods.proveInRealLife({
        arxPubkey: signatureData.arxPubkey,
        digest: signatureData.digest,
        r: signatureData.r,
        s: signatureData.s,
        v: signatureData.v,
        slot: new BN(slotInfo.context.slot)
    }).accounts({
        irl: irlPda,
        signer: signerPubkey,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        slotHashes: web3.SYSVAR_SLOT_HASHES_PUBKEY
    }).instruction();
}