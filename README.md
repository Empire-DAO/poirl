# Proof of In Real Life - PoIRL

**This program provides on-chain proof that a human interacted with a specific physical space in real time.** The space could be anything from a building or desk to a tree in the forest or the summit of a mountain. The program's objective is to tokenize real-world spaces and demonstrate human interactions with them on-chain. To establish this proof, two key elements are considered: location and recency.

To verify a human's presence at a given location, we utilize [ARX Near-Frequency Communication (NFC) tags](https://arx.org/). These tags contain a cryptographic identity (keypair) that signs messages submitted by the human. By validating this signature, we can trust that the human was indeed present in the specified space, as only NFC can generate a valid signature.

For proving recency, we rely on slot numbers and/or on-chain passwords. Two levels of recency proof are available: password-protected and passwordless.

- **Password-Protected Option:**
  - A randomly generated password is incorporated into the message signed by the NFC tag, and the program validates the signature. Passwords expire, enhancing recency proof.
  - To generate a valid signature for a password-protected on-chain representation of an IRL space, two components are required: the public key of the wallet signing the transaction and the password. The digest signed by the ARX chip is a `sha256` hash of the following string: `{wallet public key}_{password}`.
  - When validating the signature, the program:
    1. Derives the public key of the ARX chip that created the signature and compares it with the public key associated with the on-chain representation of the IRL space.
    2. Derives the expected message signed by the ARX chip (`{wallet public key}_{password}`) and compares it with the digest of the signature.

- **Passwordless Option:**
  - While this option has potential exploits, it offers improved user experience as new passwords do not need to be generated before proving IRL.
  - In this implementation, the most recent slot number is submitted as an argument to the instruction, and the program verifies that the slot number matches a recent slot number. Note that this option is NOT RECOMMENDED as it DOES NOT provide a robust proof of IRL.

**State:**
```rust
pub struct Irl {
    pub authority: Pubkey,
    pub arx_pubkey: String,
    pub name: String, // max 32 chars
    pub password_protected: bool,
    pub password: Option<String>,
    pub expires_at: Option<i64>, 
}
```

**Actions:**
* `init_irl`: Initializes an irl account linked to an ARX NFC tag.
* `rotate_password`: Generates a new password for proving recency.
* `prove_irl`: Ingests a signature from the ARX tag and validates the person's presence at a given location at a given time.
