import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Poirl } from "../target/types/poirl";
import { fetchIrlState, findIrlPda, initIrlIx, proveIrlIx, updatePasswordIx } from "../tests/ixBuilder";
import { getErrorCode, loadCliWallet, requestAirdrop, sendTx} from '../../test_dir/test-help';
import { expect } from "chai";
import { getArxSig } from '../../test_dir/ingest_arx';

describe("CREATE IRL ACCOUNT WITH ARX CHIP", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.Poirl as Program<Poirl>;

    let adminKp, clientKp;
    before("load keysm and airdrop", async () => {
        adminKp = loadCliWallet('../test_dir/wallets/admin.json');
        clientKp = loadCliWallet('../test_dir/wallets/client1.json');
        // await requestAirdrop(adminKp.publicKey, 1);
        // await requestAirdrop(clientKp.publicKey, 1);
        console.log("-- admin publicKey: ", adminKp.publicKey.toString());
        console.log("-- client publicKey: ", clientKp.publicKey.toString());
    });

    // DONE -> irlPda: 93ukKbBa8aQRRAkPSgcXB1DzeBSKJJrdN5eFjciJDVHN
    const arxPublicKey = "04ac7044c1d5131fd66af628bc2f74af1b9b0f1745fbc0d83614e8fbd6d5a6f24250782fc10aab8c9a8eb79a4f5c285087235ec1c6d12a4ba27ed1537c0e6e366d";
    const seatName = "demo seat 1";
    let irlPda;
    before("get irlPda", () => {
        irlPda = findIrlPda(arxPublicKey);
        console.log('-- irlPda: ', irlPda.toString());
    });

    it("should init irl", async () => {
        const ix = await initIrlIx(arxPublicKey, seatName, adminKp.publicKey, true, null, null);
        expect(await sendTx([ix], adminKp, true)).eql(true);
    });

    it('should print out irl', async () => {
        const irlAcc = await program.account.irl.fetch(irlPda);
        console.log(irlAcc);
    });
});