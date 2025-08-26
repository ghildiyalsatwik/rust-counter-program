import { test, expect } from "bun:test";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { GREETING_SIZE, CounterAccount, schema } from "./types";
import * as borsh from "borsh"

let userAccount = Keypair.generate();

let dataAccount = Keypair.generate();

const connection = new Connection("http://127.0.0.1:8899");

const res = await connection.requestAirdrop(userAccount.publicKey, 2 * LAMPORTS_PER_SOL);

await connection.confirmTransaction(res);

const programId = new PublicKey("F4kmdd8nuLC1Xwr592NVXrCCsRhY5E9jr7ymmSv8LYDM");

test("Data account is initialized", async () => {

    const lamports = await connection.getMinimumBalanceForRentExemption(GREETING_SIZE)

    const createDataAccountIx = SystemProgram.createAccount({

        fromPubkey: userAccount.publicKey,

        lamports,

        newAccountPubkey: dataAccount.publicKey,

        programId: programId,

        space: GREETING_SIZE
    })

    const tx = new Transaction()

    tx.add(createDataAccountIx)

    const txHash = await connection.sendTransaction(tx, [userAccount, dataAccount])

    await connection.confirmTransaction(txHash)

    const counterAccount = await connection.getAccountInfo(dataAccount.publicKey)

    if(!counterAccount) {

        throw new Error("Counter account not found");
    }

    const counter = borsh.deserialize(schema, counterAccount.data) as CounterAccount

    expect(counter.count).toBe(0)

})

test("counter does increase", async () => {

    const tx = new Transaction()

    tx.add(new TransactionInstruction({

        keys: [{

            pubkey: dataAccount.publicKey,

            isSigner: true,

            isWritable: true
        }],

        programId: programId,

        data: Buffer.from(new Uint8Array([0, 1, 0, 0, 0]))
    }))


    const txHash = await connection.sendTransaction(tx, [userAccount, dataAccount])

    await connection.confirmTransaction(txHash)

    const counterAccount = await connection.getAccountInfo(dataAccount.publicKey)

    if(!counterAccount) {

        throw new Error("Counter account does not exist")
    }

    const counter = borsh.deserialize(schema, counterAccount.data) as CounterAccount;

    expect(counter.count).toBe(1)
})