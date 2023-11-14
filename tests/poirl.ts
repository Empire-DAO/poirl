import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Poirl } from "../target/types/poirl";
import { fetchIrlState, findIrlPda, initIrlIx, proveIrlIx, updatePasswordIx } from "./ixBuilder";
import { getConnection, getErrorCode, loadCliWallet, requestAirdrop, sendTx} from '../../test_dir/test-help';
import { expect } from "chai";
import { invalid_sig, super_secret, wrong_chip, wrong_password } from "./arxData";
import { getArxSig } from "../../test_dir/ingest_arx";

describe("poirl", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Poirl as Program<Poirl>;

  let adminKp, clientKp;
  before("load keysm and airdrop", async () => {
    adminKp = loadCliWallet('../test_dir/wallets/admin.json');
    clientKp = loadCliWallet('../test_dir/wallets/client1.json');
    console.log("-- admin publicKey: ", adminKp.publicKey.toString());
    console.log("-- client publicKey: ", clientKp.publicKey.toString());
  });
  
  let irlPdaW, irlPdaWo, irlW, irlWo;
  const arxPublicKeyW = "04ac7044c1d5131fd66af628bc2f74af1b9b0f1745fbc0d83614e8fbd6d5a6f24250782fc10aab8c9a8eb79a4f5c285087235ec1c6d12a4ba27ed1537c0e6e366d";
  const arxPublicKeyWo = '04bcb5d9aa1da4148402874dda3a496874c7a51078d8ece695c180f4b11942602d0191b664ce1c0c198476ccfaeb05215b3d8078dc72dbc54dc322f88eff8301cc';
  const nameW = "w/ password";
  const nameWo = "w/o password"
  before("get irlPda", () => {
    irlPdaW = findIrlPda(arxPublicKeyW);
    irlPdaWo = findIrlPda(arxPublicKeyWo);
  });

  const connection = getConnection();
  describe("admin", () => {
    describe("create irl", () => {
      it("shoule create irl w/ password", async () => {
        const lifetime = 1000;
        const ix = await initIrlIx(arxPublicKeyW, nameW, adminKp.publicKey, true, nameW, lifetime);
        const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({ 
          units: 1000000 
        });
        expect(await sendTx([ix, modifyComputeUnits], adminKp)).eql(true);
        irlW = await fetchIrlState(irlPdaW);
        expect(irlW).to.have.property('password', nameW);
        expect(irlW).to.have.property('expiresAt');
        expect(Number(irlW.expiresAt)).to.be.lessThan((new Date()).getTime() + lifetime);
      });

      it("should create irl w/o password", async () => {
        const ix = await initIrlIx(arxPublicKeyWo, nameWo, adminKp.publicKey, false, null, null);
        const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({ 
          units: 1000000 
        });
        expect(await sendTx([ix, modifyComputeUnits], adminKp)).eql(true);
        irlWo = await fetchIrlState(irlPdaWo);
        expect(irlWo).to.have.property('password');
        expect(irlWo).to.have.property('expiresAt');
      })
    });

    describe("update password", () => {
      before("fetch irl state", async () => {
        irlW = await fetchIrlState(irlPdaW);
      });

      it("should update password w/ random string and 5 min lifetime", async () => {
        const ix = await updatePasswordIx(irlPdaW, true, null, null, adminKp.publicKey);
        await sendTx([ix], adminKp, true);
        const unixTimestamp = (new Date()).getTime() / 1000;

        const newIrlState = await fetchIrlState(irlPdaW);
        expect(irlW.password).not.eql(newIrlState.password);
        expect(newIrlState.password).lengthOf(64);
        expect(Number(newIrlState.expiresAt)).to.be.lessThanOrEqual(unixTimestamp + 300);
        irlW = newIrlState;
      });

      it("should update to non password protected", async () => {
        const ix = await updatePasswordIx(irlPdaW, false, null, null, adminKp.publicKey);
        expect(await sendTx([ix], adminKp, true)).eql(true);
        
        const newIrlState = await fetchIrlState(irlPdaW);
        expect(newIrlState.password).eql(null);
        expect(newIrlState.expiresAt).eql(null);
        irlW = newIrlState;
      });

      it("should update password w/ custom password and lifetime", async () => {
        const newPassword = "secret password";
        const lifetime = 15;
        const ix = await updatePasswordIx(irlPdaW, true, newPassword, lifetime, adminKp.publicKey);
        expect(await sendTx([ix], adminKp, true)).eql(true);
        const unixTimestamp = (new Date()).getTime() / 1000;

        const newIrlState = await fetchIrlState(irlPdaW);
        expect(irlW.password).not.eql(newIrlState.password);
        expect(newIrlState.password).eql(newPassword);
        expect(Number(newIrlState.expiresAt)).to.be.lessThanOrEqual(unixTimestamp + lifetime);
        irlW = newIrlState;
      });

      it("should fail to set password as non admin", async () => {
        const ix = await updatePasswordIx(irlPdaW, true, 'ngmi', 0, clientKp.publicKey);
        const result = await sendTx([ix], clientKp);
        expect(getErrorCode(result)).eql(6005);
      })
    });
  });

  describe("client", () => {
    before("set password", async () => {
      const ix = await updatePasswordIx(irlPdaW, true, 'super_secret', 5000, adminKp.publicKey);
      expect(await sendTx([ix], adminKp, true)).eql(true);
      irlW = await fetchIrlState(irlPdaW);
      expect(irlW).to.have.property('password', 'super_secret');
    });

    it("should checkin", async () => {
      const ix = await proveIrlIx(irlPdaW, super_secret, clientKp.publicKey);
      expect(await sendTx([ix], clientKp)).equal(true);
    });

    it("should fail to checkin for invalid signature", async () => {
      const ix = await proveIrlIx(irlPdaW, invalid_sig, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(getErrorCode(result)).eql(6001);
    });

    it("should fail to checkin for incorrect arx chip", async () => {
      const ix = await proveIrlIx(irlPdaW, wrong_chip, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(getErrorCode(result)).eql(6002);
    });

    it("should fail to checkin for incorrect password", async () => {
      const ix = await proveIrlIx(irlPdaW, wrong_password, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(getErrorCode(result)).eql(6000);
    });

    it("should fail to checkin for incorrect wallet", async () => {
      const ix = await proveIrlIx(irlPdaW, wrong_password, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(getErrorCode(result)).eql(6000);
    });
    
    it("should fail to checkin for expired password", async () => {
      let ix = await updatePasswordIx(irlPdaW, true, 'super_secret', 1, adminKp.publicKey);
      await sendTx([ix], adminKp, true);

      ix = await proveIrlIx(irlPdaW, super_secret, clientKp.publicKey);
      const result = await sendTx([ix], clientKp);
      expect(getErrorCode(result)).eql(6004);
    });
  });

  describe("real time / real chip", () => {
    describe("w/ password", () => {
      before("update password as client", async () => {
        let ix = await updatePasswordIx(irlPdaW, true, null, null, clientKp.publicKey);
        await sendTx([ix], clientKp, true);
      });

      it("validate signature with updated password", async () => {
        const {password} = await fetchIrlState(irlPdaW);
        const arxSig = await getArxSig(clientKp.publicKey.toString(), password);

        const ix = await proveIrlIx(irlPdaW, arxSig, clientKp.publicKey);
        expect(await sendTx([ix], clientKp)).eql(true);
      });
    });

    describe("w/o password", () => {
      before("update password as client", async () => {
        let ix = await updatePasswordIx(irlPdaW, false, null, null, clientKp.publicKey);
        await sendTx([ix], clientKp, true);
      });

      it("validate signature with updated password", async () => {
        const arxSig = await getArxSig(clientKp.publicKey.toString(), "does not matter");
        const ix = await proveIrlIx(irlPdaW, arxSig, clientKp.publicKey);
        expect(await sendTx([ix], clientKp)).eql(true);
      });
    });
  });
});


