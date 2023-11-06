import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Poirl } from "../target/types/poirl";
import { fetchIrlState, findIrlPda, getErrorCode, initIrlIx, loadCliWallet, proveIrlIx, requestAirdrop, sendTx, updatePasswordIx } from "./client-help";
import { expect } from "chai";
import { invalid_sig, super_secret, wrong_chip, wrong_password } from "./arxData";

describe("poirl", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Poirl as Program<Poirl>;

  let adminKp, clientKp;
  before("load keysm and airdrop", async () => {
    adminKp = loadCliWallet('../test_dir/wallets/admin.json');
    clientKp = loadCliWallet('../test_dir/wallets/client1.json');
    await requestAirdrop(adminKp.publicKey, 1);
    await requestAirdrop(clientKp.publicKey, 1);
    console.log("-- admin publicKey: ", adminKp.publicKey.toString());
    console.log("-- client publicKey: ", clientKp.publicKey.toString());
  });
  
  let irlPda;
  const arxPublicKey = "04ac7044c1d5131fd66af628bc2f74af1b9b0f1745fbc0d83614e8fbd6d5a6f24250782fc10aab8c9a8eb79a4f5c285087235ec1c6d12a4ba27ed1537c0e6e366d";
  const name = "some seat";
  before("get irlPda", () => {
    irlPda = findIrlPda(program, adminKp.publicKey, name);
  });

  describe("admin", () => {
    describe("create irl", () => {
      it("shoule create irl", async () => {
        const ix = await initIrlIx(program, arxPublicKey, name, adminKp.publicKey);
        await sendTx([ix], adminKp);
      });
    });

    describe("update password", () => {
      let irlState;
      before("fetch irl state", async () => {
        irlState = await fetchIrlState(program, irlPda);
      });

      it("should update password w/ random string and 2 min lifetime", async () => {
        const ix = await updatePasswordIx(program, irlPda, null, null, adminKp.publicKey);
        await sendTx([ix], adminKp, true);
        const unixTimestamp = (new Date()).getTime() / 1000;

        const newIrlState = await fetchIrlState(program, irlPda);
        expect(irlState.password).not.eql(newIrlState.password);
        expect(newIrlState.password.length).eql(64);
        expect(Number(newIrlState.expiresAt)).to.be.lessThanOrEqual(unixTimestamp + 120);
        irlState = newIrlState;
      });

      it("should update password w/ custom password and lifetime", async () => {
        const newPassword = "secret password";
        const lifetime = 15;
        const ix = await updatePasswordIx(program, irlPda, newPassword, lifetime, adminKp.publicKey);
        await sendTx([ix], adminKp, true);
        const unixTimestamp = (new Date()).getTime() / 1000;

        const newIrlState = await fetchIrlState(program, irlPda);
        expect(irlState.password).not.eql(newIrlState.password);
        expect(newIrlState.password).eql(newPassword);
        expect(Number(newIrlState.expiresAt)).to.be.lessThanOrEqual(unixTimestamp + lifetime);
        irlState = newIrlState;
      });

      it("should fail to set password as non admin", async () => {
        const ix = await updatePasswordIx(program, irlPda, 'ngmi', 0, clientKp.publicKey);
        const result = await sendTx([ix], clientKp);
        expect(result.value).to.have.property('err');
        expect(getErrorCode(result)).eql(6005);
      })
    });
  });

  describe("client", () => {
    before("set password", async () => {
      const ix = await updatePasswordIx(program, irlPda, 'super_secret', 5000, adminKp.publicKey);
      await sendTx([ix], adminKp, true);
    });

    it("should checkin", async () => {
      const ix = await proveIrlIx(program, irlPda, super_secret, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(result.value.err).eql(null);
    });

    it("should fail to checkin for invalid signature", async () => {
      const ix = await proveIrlIx(program, irlPda, invalid_sig, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(result.value).to.have.property('err');
      expect(getErrorCode(result)).eql(6001);
    });

    it("should fail to checkin for incorrect arx chip", async () => {
      const ix = await proveIrlIx(program, irlPda, wrong_chip, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(result.value).to.have.property('err');
      expect(getErrorCode(result)).eql(6002);
    });

    it("should fail to checkin for incorrect password", async () => {
      const ix = await proveIrlIx(program, irlPda, wrong_password, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(result.value).to.have.property('err');
      expect(getErrorCode(result)).eql(6000);
    });

    it("should fail to checkin for incorrect wallet", async () => {
      const ix = await proveIrlIx(program, irlPda, wrong_password, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(result.value).to.have.property('err');
      expect(getErrorCode(result)).eql(6000);
    });
    
    it("should fail to checkin for expired password", async () => {
      let ix = await updatePasswordIx(program, irlPda, 'super_secret', 1, adminKp.publicKey);
      await sendTx([ix], adminKp, true);

      ix = await proveIrlIx(program, irlPda, super_secret, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(result.value).to.have.property('err');
      expect(getErrorCode(result)).eql(6004);
    });
  });
});


