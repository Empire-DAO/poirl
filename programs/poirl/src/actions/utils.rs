use solana_program::sysvar;
use crate::*;

pub fn verify_slot_recency(slot_hashes: UncheckedAccount,  input_slot: u64) -> bool {
    if slot_hashes.key() != sysvar::slot_hashes::id() {
        msg!("Invalid SlotHashes sysvar");
        return false;
    }
    let data = slot_hashes.try_borrow_data().unwrap();
    // let num_slot_hashes = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let mut pos = 8;
    for _i in 0..100 {
        let slot = u64::from_le_bytes(data[pos..pos + 8].try_into().unwrap());
        pos += 40;
        if input_slot == slot {
            return true
        }    
    }
    false
}