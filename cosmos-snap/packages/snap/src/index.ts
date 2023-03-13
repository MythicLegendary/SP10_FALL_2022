import { OnRpcRequestHandler, OnCronjobHandler, OnTransactionHandler} from '../../../node_modules/@metamask/snap-types';
import detectEthereumProvider from '@metamask/detect-provider';
import { JsonBIP44CoinTypeNode, SLIP10Node, SLIP10Path } from "@metamask/key-tree";
import { hasProperty, isObject, Json } from '@metamask/utils';
import { BytesLike, ethers, parseUnits } from "ethers";
import { Web3Provider } from "@ethersproject/providers";
import { Decimal } from "@cosmjs/math";
import  web3  from "web3";
import {Buffer} from 'buffer';
import crypto from 'crypto';

import { CosmWasmClient} from "@cosmjs/cosmwasm-stargate";
import { AccountData, coins} from "@cosmjs/launchpad";
import { Coin, DirectSecp256k1HdWallet, makeAuthInfoBytes } from "@cosmjs/proto-signing";
import { SigningStargateClient, StargateClientOptions, SigningStargateClientOptions, GasPrice, StdFee } from "@cosmjs/stargate";
//will need further imports to ensure!

import { publicKeyCreate, ecdsaSign } from 'secp256k1';
import { bech32 } from 'bech32'
import Sha256WithX2 from "sha256";
import RIPEMD160Static from "ripemd160";

import { caesar, rot13 } from "simple-cipher-js";


interface EncodeObject {
  readonly typeUrl: string;
  readonly value: {
    fromAddress : string,
    toAddress : string,
    amount : Coin[]
  };
}

/**
 * Get a message from the origin. For demonstration purposes only.
 *
 * @param originString - The origin string.
 * @returns A message based on the origin.
 */
const getMessage = (originString: string): string =>
  `Hello, ${originString}!`;

  
/**s
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns `null` if the request succeeded.
 * @throws If the request method is not valid for this snap.
 * @throws If the `snap_confirm` call failed.
 */


export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request } : {origin : string, request : any}) => {
  let pubKey, account;
  console.log("COSMOS-SNAP: Snap RPC Handler invoked. Request: ", request);
  switch (request.method) {

    case 'getSnapState':
      console.log("COSMOS-SNAP: Geting the Snap Plugin State.");
      return await getPluginState();

    case 'setupPassword': {
      console.log("COSMOS-SNAP: Setting up new password for key encryption.");
      return setupPassword(request.params[0]['password'], request.params[0]['mnemonic']);
    }

    case 'login': {
      console.log("COSMOS-SNAP: Logging in user.");
      return loginUser(request.params[0]['password']);
    }
    
    case 'setConfig':
      console.log("COSMOS-SNAP: Attempting to update configuration.");
      await updatePluginState({
        ...await getPluginState(),
        nodeUrl: request.params[0]['nodeUrl'],
        denom: request.params[0]['denom'],
        prefix: request.params[0]['prefix'],
        memo: request.params[0]['memo'],
        gas: request.params[0]['gas'],
        feeDenom  : request.params[0]['feeDenom'],
        feeAmount : request.params[0]['feeAmount']
      })
      return await getPluginState();

    case 'getAccountInfo':
      console.log("COSMOS-SNAP: Getting Account Info.");
      return await getAccountInfo();

    case 'getAccountGeneral':
      console.log("COSMOS-SNAP: Getting Account Info General");
      return await getAccountInfoGeneral(request.params[0].address, request.params[0].denom);

    case 'getStatus':
      console.log("COSMOS-SNAP: Getting status.");
      return getStatus();
    
    case 'getBandwidth':
      console.log("COSMOS-SNAP: Getting bandwidth.");
      pubKey = await getPubKey()
      account = getAccount(pubKey)
      return await getAccountBandwidth(account)
    
    case 'getIndexStats':
        console.log("COSMOS-SNAP: Getting index stats.");
        return await getIndexStats()
    
    case 'getRewards':
      console.log("COSMOS-SNAP: Getting rewards.");
      pubKey = await getPubKey()
      account = getAccount(pubKey)
      return await getRewards(account)

    case 'createSend':
      console.log("COSMOS-SNAP: Creating Send Transaction.");
      return await createSend(request.params[0]);

    case 'createMultiSend':
        console.log("COSMOS-SNAP: Creating Multi Send Transaction.");
        return await createMultiSend(
          request.params[0]
        );

    case 'createDelegate':
      console.log("COSMOS-SNAP: Creating Delegate.");
      return {}

    case 'createRedelegate':
      console.log("COSMOS-SNAP: Creating Redelegate");
      return {}

    case 'createUndelegate':
      console.log("COSMOS-SNAP: Creating Undelegate");
      return {}

    case 'createWithdrawDelegationReward':
      console.log("COSMOS-SNAP: Creating Withdrawal Delegation Reward");
      return {}

    case 'createTextProposal':
      console.log("COSMOS-SNAP: Creating Text Proposal");
      return {}

    case 'createCommunityPoolSpend':
      console.log("COSMOS-SNAP: Creating Community Pool Spend.");
      return {}

    case 'createParamsChangeProposal':
      console.log("COSMOS-SNAP: Create Params Change Proposal.");
      return {}
      
    case 'createDeposit':
      console.log("COSMOS-SNAP: Create Deposit.");
      return {}
      
    case 'createVote':
      console.log("COSMOS-SNAP: Creating Vote.");
      return {}
      
    case 'displayNotification':
      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: request.params[0].prompt,
            description: request.params[0].description,
            textAreaContent: request.params[0].textAreaContent,
          },
        ],
      });

    default:
      throw new Error('Method not found.');
  }
};

//----------------------------------------------------------
/**
 * Logs in the user using the password. Updates the lastLogin field to be the current session number.
 */
async function loginUser(password : string) {
  const currentState : any = await getPluginState();
  // Get the stored password
  const storedPassword : string = await decrypt(currentState.password, await bip32EntropyPrivateKey());
  // Compare the values
  if(password === storedPassword) {
    return {loginSuccessful : true, msg : "Login Sucessful"}
  } 
  else {
    return {loginSuccessful : false, msg : "Login Failed: Password not correct."}
  }
}

async function getCosmosWallet() {
  const currentState : any = await getPluginState();

  return await DirectSecp256k1HdWallet.fromMnemonic(
    await decrypt(
      currentState.mnemonic, 
      await bip32EntropyPrivateKey()
  ));
}

/**
 * Sets up the new password used for verification
 */
async function setupPassword(password : string, mnemonic : string) {
  
  console.log("Unencrypted:", password);
  console.log("Unencrypted:", mnemonic);
  const encryptedPassword = await encrypt(password, "key123");
  const encryptedMnemonic = await encrypt(mnemonic, "key123");
  console.log("Encrypted:", encryptedPassword);
  console.log("Encrypted:", encryptedMnemonic);
  const decryptedPassword = await decrypt(encryptedPassword, "key123");
  const decryptedMnemonic = await decrypt(encryptedMnemonic, "key123");
  console.log("Decrypted:", decryptedPassword);
  console.log("Decrypted:", decryptedMnemonic);
  
  
  // try {
  //   // Update the pluginState with the encrypted key and serialized wallet
  // await updatePluginState(
  //   {
  //     ...await getPluginState(),
  //     mnemonic : await encrypt(mnemonic, await bip32EntropyPrivateKey()),
  //     password : await encrypt(password, await bip32EntropyPrivateKey())

  //   });
  // return {msg : "Successful serialization of wallet.", setup : true}
  // }
  // catch(error) {
  //   console.log(error);
  //   return {msg : "Serialization not successful.", setup : false}
  // }
}

/**
 * Decrypts passwords and mnemonics.
 */
async function encrypt(password : string, key : string) {
  let keyint = 0;

  for(let i = 0; i<key.length; i++)
  {
    let character = key.charCodeAt(i);
    keyint = ((keyint << 5) - keyint) + character;
    keyint = keyint & keyint;
  }
  
  keyint = keyint%25;
  if(keyint < 0){keyint = keyint*-1;}
  console.log(keyint);
  console.log("Current password:", password);
  return caesar.encrypt(password, keyint);
}

/**
 * Decrypts passwords and mnemonics.
 */
async function decrypt(password : string, key : string) {
  let keyint = 0;

  for(let i = 0; i<key.length; i++)
  {
    let character = key.charCodeAt(i);
    keyint = ((keyint << 5) - keyint) + character;
    keyint = keyint & keyint;
  }
  
  keyint = keyint%25;
  if(keyint < 0){keyint = keyint*-1;}
  console.log(keyint);
  console.log("Current password:", password);
  return caesar.decrypt(password, keyint);
}

/**
 * Gets the unique entropy value used to create the keys; use to encrypt data.
 */
async function bip32EntropyPrivateKey(){
  const entropy : any = await wallet.request({
    method: 'snap_getBip32Entropy',
    params: {
      path: ["m", "44'", "118'", "0'"],
      curve: 'secp256k1',
    },
  })
  return entropy.privateKey;
}

/**
 * Retrieves the current currencies associated with the account, with the currency specified in the configuration.
 */
async function getAccountInfo() {
  try {
    // Get the wallet (keys) object
    const currentState : any = await getPluginState();
    const wallet : DirectSecp256k1HdWallet = await getCosmosWallet();
    
    // Get the client object to interact with the blockchain
    const client : SigningStargateClient = await SigningStargateClient.connectWithSigner(currentState.nodeUrl, wallet);
    
    // Get the public address of the account
    const accountData : AccountData = (await wallet.getAccounts())[0];

    // Return result
    let result : any = await client.getBalance(accountData.address, currentState.denom);
    result['Account'] = accountData.address;
    return result; 
  }
  catch(error) {
    console.log("COSMOS-SNAP: " , error);
    return error;
  }
}

/**
 * Returns the balance of -denom- at -address-
 */
async function getAccountInfoGeneral(address : string, denom : string) {
  try {
    // Get the wallet (keys) object
    const currentState : any = await getPluginState();
    const wallet : DirectSecp256k1HdWallet = await getCosmosWallet();
    
    // Get the client object to interact with the blockchain
    const client : SigningStargateClient = await SigningStargateClient.connectWithSigner(currentState.nodeUrl, wallet);
    
    // Return result
    let result : any = await client.getBalance(address, denom);
    result['Account'] = address;
    return result; 
  }
  catch(error) {
    console.log("COSMOS-SNAP: " , error);
    return error;
  }
}

/**
 * Sends a transaction request with reciepient, amount and denom.
 */
async function createSend(transactionRequest : any) {
  try {
    // Get the wallet (keys) object
    const wallet : DirectSecp256k1HdWallet = await getCosmosWallet();
    
    // Get the client object to interact with the blockchain
    const currentState : any = await getPluginState();
    const client : SigningStargateClient = await SigningStargateClient.connectWithSigner(currentState.nodeUrl, wallet);
    
    // Get the public address of the account
    const accountData : AccountData = (await wallet.getAccounts())[0];
    
    // Format the amount
    const amount : Coin[] = [{denom : transactionRequest.denom, amount: transactionRequest.amount}];

    // Format the fee
    const fee : StdFee =
    {
      amount : [{denom : currentState.feeDenom, amount : currentState.feeAmount}],
      gas : currentState.gas,
      granter : accountData.address,
      payer : accountData.address
    };
    
    // Make the transaction request to the network.
    return await client.sendTokens(
      accountData.address,
      transactionRequest.recipientAddress,
      amount, 
      fee,
      transactionRequest.memo
    );
  }
  catch(error) {
    console.log("COSMOS-SNAP ", error);
    return error;
  } 
}

/**
 * Creates a multi-send transaction (multiple recipients and or multiple denoms). 
 */
async function createMultiSend(transactionRequest : any) {
    try {
      // Get the wallet (keys) object
      const wallet : DirectSecp256k1HdWallet = await getCosmosWallet();
    
      // Get the client object to interact with the blockchain
      const currentState : any = await getPluginState();
      const client : SigningStargateClient = await SigningStargateClient.connectWithSigner(currentState.nodeUrl, wallet);
      
      // Get the public address of the account
      const accountData : AccountData = (await wallet.getAccounts())[0];
      
      // Format the fee
      const fee : StdFee =
      {
        amount : [{denom : currentState.feeDenom, amount : currentState.feeAmount}],
        gas : currentState.gas,
        granter : accountData.address,
        payer : accountData.address
      };

      // Format the multiple transactions
      const messages : Array<EncodeObject> = [];
      const transactions : string[] = transactionRequest.inputs.split(" ");
      for (let i = 0; i < transactions.length; i ++) {
        // Should be in the form: <RecipientAddress>-<Amount>-<Denom>
        const transaction : string[] = transactions[i].split("-");
        let newMessage : EncodeObject = {
          typeUrl : "/cosmos.bank.v1beta1.MsgSend",
          value : {
            fromAddress : accountData.address,
            toAddress : transaction[0],
            amount : [{amount : transaction[1], denom : transaction[2]}]
          }
        };
        messages.push(newMessage);
      }
      
      // TODO: Use signAndBroadcast
      return await client.signAndBroadcast(
        accountData.address,
        messages,
        fee,
        transactionRequest.memo
      );
    }
    catch(error) {
      console.log("COSMOS-SNAP ", error);
      return error;
    } 
}

/**
 * Gets the data persisted by MetaMask.
 */
async function getPluginState()
{
    return await wallet.request({
    method: 'snap_manageState',
    params: ['get'],
  });
}

/**
 * Updates the data persisted by MetaMask.
 */
async function updatePluginState(state: unknown)
{
  return await wallet.request({
  method: 'snap_manageState',
  params: ['update', state],
    });
}

//this function will also require its own endowment in the manifest...

async function getAppKey()
{
  const bip44Node = (await wallet.request({
    method: "snap_getBip44Entropy",
    params: {
      coinType: 118 //this cointype hardcoded is for ATOM. May need a better way of getting it to be more dynamic!
    },
  })) as JsonBIP44CoinTypeNode;

  return bip44Node.privateKey?.slice(0, 63);
}

//----------------------------------------------------------

async function getPubKey () {
  const PRIV_KEY = await getAppKey()
  const prikeyArr = new Uint8Array(hexToBytes(PRIV_KEY));
  return bytesToHex(publicKeyCreate(prikeyArr, true))
}

// Deprecated
async function getAccount (pubkey: any) {
  const currentPluginState : any = await getPluginState()
  const address = await getAddress(hexToBytes(pubkey))
  return toBech32(currentPluginState.prefix, address)
}

async function getAddress(pubkey: any) {
  if (pubkey.length > 33) {
    pubkey = pubkey.slice(5, pubkey.length);
  }
  const hmac = Sha256WithX2(pubkey);
  const b = Buffer.from(hexToBytes(hmac));
  const addr = new RIPEMD160Static().update(b);

  return addr.digest('hex').toUpperCase();
}

async function getStatus() {
  const currentPluginState : any = await getPluginState();
  try {
    const response = await fetch(`${currentPluginState.nodeUrl}/api/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if(!data.result.node_info) { throw new Error("node_info not present") };

    return data.result;
  } catch (error) {
    console.error(error)
  }
}
// Deprecated
async function getAccountInfoDeprecated(address: any) {
  const currentPluginState : any = await getPluginState()
  try {
    const response = await fetch(`${currentPluginState.nodeUrl}/api/account?address="${address}"`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });  
    
  async function getNetworkId() {
      const data = await getStatus();
      return data.node_info.network;
    }

    const accountInfo = await response.json();
    if(!accountInfo.result) { throw new Error ("Result not present in accountInfo.")};

    let account = accountInfo.result.account;
    if(!account) { throw Error };

    const chainId = await getNetworkId();
    account.chainId = chainId;

    return account
  } catch (error) {
      console.error(error);
  }
}

async function getAccountBandwidth(address : any) {
  const currentPluginState : any = await getPluginState()
  try {
    const bandwidth = {
      remained: 0,
      max_value: 0,
    };

    const response = await fetch(
      `${currentPluginState.nodeUrl}/api/account_bandwidth?address="${address}"`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await response.json();

    bandwidth.remained = data.result.remained;
    bandwidth.max_value = data.result.max_value;

    return bandwidth
  } catch (error) {
    console.error(error)
  }
}

async function getIndexStats() {
  const currentPluginState : any = await getPluginState()
  try {
    const response = await fetch(`${currentPluginState.nodeUrl}/api/index_stats`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if(!data.result) { throw new Error("Result not present.") };

    return data.result;
  } catch (error) {
    console.error(error)
  }
}

async function getRewards(address: any) {
  const currentPluginState : any = await getPluginState()
  try {
    const response = await fetch(`${currentPluginState.nodeUrl}/lcd/distribution/delegators/${address}/rewards`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if(!data.result.rewards) { throw new Error("Rewards not present in result or result not generated.") };

    return data.result.rewards;
  } catch (error) {
    console.error(error)
  }
}

function createSendDeprecated(txContext : any, recipient : any, amount : any, denom :any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cosmos-sdk/MsgSend',
    value: {
      amount: [
        {
          amount: amount.toString(),
          denom: denom,
        },
      ],
      from_address: txContext.bech32,
      to_address: recipient,
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

// Deprecated
async function createSendDeprecatedTx(subjectTo : any, amount :  any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createSendDeprecated(
    txContext,
    subjectTo,
    amount,
    currentPluginState.denom
  );
  
  const signedTx = await sign(tx, txContext);
  return txSubmit(signedTx);
};

async function createTxContext() {
  const pubKey = await getPubKey()
  const account = getAccount(pubKey)
  const accountInfo = await getAccountInfoDeprecated(account)

  const currentPluginState : any = await getPluginState();

  const txContext = {
    accountNumber: accountInfo.account_number,
    chainId: accountInfo.chainId,
    sequence: accountInfo.sequence,
    bech32: account,
    memo: currentPluginState.memo,
    pk: pubKey,
  };
  
  return txContext
}

// TODO refactor to universal skeleton
const createSkeleton = (txContext : any, denom : any) => {
  if (typeof txContext === 'undefined') {
    throw new Error('undefined txContext');
  }
  if (typeof txContext.accountNumber === 'undefined') {
    throw new Error('txContext does not contain the accountNumber');
  }
  if (typeof txContext.sequence === 'undefined') {
    throw new Error('txContext does not contain the sequence value');
  }
  const currentPluginState : any = getPluginState()
  const txSkeleton = {
    type: 'auth/StdTx',
    value: {
      msg: [], // messages
      fee: '',
      memo: currentPluginState.memo,
      signatures: [
        {
          signature: 'N/A',
          account_number: txContext.accountNumber.toString(),
          sequence: txContext.sequence.toString(),
          pub_key: {
            type: 'tendermint/PubKeySecp256k1',
            value: 'PK',
          },
        },
      ],
    },
  };
  return applyGas(txSkeleton, currentPluginState.gas, denom);
};

function applyGas(unsignedTx : any, gas : any, denom : any) {
  if (typeof unsignedTx === 'undefined') {
    throw new Error('undefined unsignedTx');
  }
  if (typeof gas === 'undefined') {
    throw new Error('undefined gas');
  }

  unsignedTx.value.fee = {
    amount: [
      {
        amount: '0', // TODO apply fee for cosmos support
        denom: denom,
      },
    ],
    gas: gas.toString(),
  };

  return unsignedTx;
}

async function txSubmit(signedTx : any) {
  const txBody = {
    tx: signedTx.value,
    mode: 'sync',
  };
  const currentPluginState : any = await getPluginState()
  const url = `${currentPluginState.nodeUrl}/lcd/txs`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(txBody),
  })
  const result = await response.json()
  if (result.error) {
    throw new Error(result.error)
  }
  return result
}

function createMultiSendDeprecated(txContext : any, inputs : any, outputs : any, denom : any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cosmos-sdk/MsgMultiSend',
    value: {
      inputs: inputs,
      outputs: outputs,
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

async function createMultiSendDeprecatedTx(inputs : any, outputs : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createMultiSendDeprecated(
    txContext,
    JSON.parse(inputs),
    JSON.parse(outputs),
    currentPluginState.denom
  );
}

function createDelegate(txContext : any, validatorBech32 : any, amount : any, denom : any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cosmos-sdk/MsgDelegate',
    value: {
      amount: {
        amount: amount.toString(),
        denom: denom,
      },
      delegator_address: txContext.bech32,
      validator_address: validatorBech32,
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

async function createDelegateTx(validatorTo : any, amount : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createDelegate(
    txContext,
    validatorTo,
    amount,
    currentPluginState.denom
  );
  
  const signedTx = await sign(tx, txContext);
  return txSubmit(signedTx)
  // return signedTx
};

function createRedelegate(txContext : any, validatorSourceBech32 : any, validatorDestBech32 : any, amount : any, denom : any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cosmos-sdk/MsgBeginRedelegate',
    value: {
      amount: {
        amount: amount.toString(),
        denom: denom,
      },
      delegator_address: txContext.bech32,
      validator_src_address: validatorSourceBech32,
      validator_dst_address: validatorDestBech32,
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

async function  createRedelegateTx(validatorFrom : any, validatorTo : any, amount : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createRedelegate(
    txContext,
    validatorFrom,
    validatorTo,
    amount,
    currentPluginState.denom
  );
  
  const signedTx = await sign(tx, txContext);
  return txSubmit(signedTx)
  // return signedTx
};

function createUndelegate(txContext : any, validatorBech32 : any, amount : any, denom : any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cosmos-sdk/MsgUndelegate',
    value: {
      amount: {
        amount: amount.toString(),
        denom: denom,
      },
      delegator_address: txContext.bech32,
      validator_address: validatorBech32,
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

async function createUndelegateTx(validatorFrom : any, amount : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createUndelegate(
    txContext,
    validatorFrom,
    amount,
    currentPluginState.denom
  );
  
  const signedTx = await sign(tx, txContext);
  return txSubmit(signedTx)
  // return signedTx
};

function createWithdrawDelegationReward(txContext : any, rewards : any, denom : any) {
  const txSkeleton = createSkeleton(txContext, denom);
  txSkeleton.value.msg = [];

  Object.keys(rewards).forEach(key => {
    txSkeleton.value.msg.push({
      type: 'cosmos-sdk/MsgWithdrawDelegationReward',
      value: {
        delegator_address: txContext.bech32,
        validator_address: rewards[key].validator_address,
      },
    });
  });

  return txSkeleton;
}

async function createWithdrawDelegationRewardTx(rewards : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createWithdrawDelegationReward(
    txContext,
    JSON.parse(rewards),
    currentPluginState.denom
  );
  
  const signedTx = await sign(tx, txContext);
  return txSubmit(signedTx)
  // return signedTx
}

function createTextProposal(txContext : any, title : any, description : any, deposit : any, denom : any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cosmos-sdk/MsgSubmitProposal',
    value: {
      content: {
        type: 'cosmos-sdk/TextProposal',
        value: {
          title: title,
          description: description,
        },
      },
      initial_deposit: [{
        amount: deposit.toString(),
        denom: denom,
      }],
      proposer: txContext.bech32,
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

async function createTextProposalTx(title : any, description : any, deposit : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createTextProposal(
    txContext,
    title,
    description,
    deposit,
    currentPluginState.denom
  );
  
  const signedTx = await sign(tx, txContext);
  return txSubmit(signedTx)
  // return signedTx
};

function createCommunityPoolSpendProposal(txContext : any, title: any, description : any, recipient : any, deposit : any, amount : any, denom : any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cosmos-sdk/MsgSubmitProposal',
    value: {
      content: {
        type: 'cosmos-sdk/CommunityPoolSpendProposal',
        value: {
          title: title,
          description: description,
          recipient: recipient,
          amount: [{
            amount: amount.toString(),
            denom: denom,
          }],
        },
      },
      initial_deposit: [{
        amount: deposit.toString(),
        denom: denom,
      }],
      proposer: txContext.bech32,
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

async function createCommunityPoolSpendProposalTx(title : any, description : any, recipient : any, deposit : any, amount : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createCommunityPoolSpendProposal(
    txContext,
    title,
    description,
    recipient,
    deposit,
    amount,
    currentPluginState.denom
  );
  
  const signedTx = await sign(tx, txContext);
  return txSubmit(signedTx)
  // return signedTx
};

function createParamsChangeProposal(txContext: any, title: any, description: any, changes: any, deposit: any, denom: any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cosmos-sdk/MsgSubmitProposal',
    value: {
      content: {
        type: 'cosmos-sdk/ParameterChangeProposal',
        value: {
          title: title,
          description: description,
          changes: changes,
        },
      },
      initial_deposit: [{
        amount: deposit.toString(),
        denom: denom,
      }],
      proposer: txContext.bech32,
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

async function createParamsChangeProposalTx(title : any, description : any, changes : any, deposit : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createParamsChangeProposal(
    txContext,
    title,
    description,
    JSON.parse(changes),
    deposit,
    currentPluginState.denom
  );
  
  const signedTx = await sign(tx, txContext);
  return txSubmit(signedTx)
  // return signedTx
};

function createDeposit(txContext : any, proposalId : any, amount : any, denom : any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cosmos-sdk/MsgDeposit',
    value: {
      proposal_id: proposalId,
      depositor: txContext.bech32,
      amount: [{
        amount: amount.toString(),
        denom: denom,
    }],
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

async function createDepositTx(proposalId : any, amount : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createDeposit(
    txContext,
    proposalId,
    amount,
    currentPluginState.denom
  );
  
  const signedTx = await sign(tx, txContext);
  return txSubmit(signedTx)
  // return signedTx
};

function createVote(txContext :any, proposalId : any, option : any, denom : any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cosmos-sdk/MsgVote',
    value: {
      proposal_id: proposalId,
      voter: txContext.bech32,
      option: option,
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

async function createVoteTx(proposalId : any, option : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = await getPluginState()

  const tx = await createVote(
    txContext,
    proposalId,
    option,
    currentPluginState.denom
  );
  
  const signedTx = await sign(tx, txContext);
  return txSubmit(signedTx)
  // return signedTx
};


//----------------------------------------------------------

function hexToBytes(hex: any) {
  const bytes = [];
  for (let c = 0; c < hex.length; c += 2) {
      bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
}

function toBech32(prefix: any, str: any) {
  const strByte = bech32.toWords(Buffer.from(str, 'hex'));

  return bech32.encode(prefix, strByte);
}

function bytesToHex(bytes: any) {
  const hex = [];

  for (let i = 0; i < bytes.length; i++) {
      hex.push((bytes[i] >>> 4).toString(16));
      hex.push((bytes[i] & 0xF).toString(16));
  }
  return hex.join('').toUpperCase();
}

//----------------------------------------------------------

async function sign(unsignedTx:any, txContext:any) {
  const bytesToSign = getBytesToSign(unsignedTx, txContext);
  const PRIV_KEY = await getAppKey()
  
  const hash = new Uint8Array(Sha256WithX2(Buffer.from(bytesToSign), {
    asBytes: true 
  }));
  const prikeyArr = new Uint8Array(hexToBytes(PRIV_KEY));
  const sig = ecdsaSign(hash, prikeyArr);

  return applySignature(unsignedTx, txContext, Array.from(sig.signature));
}

function getBytesToSign(tx:any, txContext:any) {
  if (typeof txContext === 'undefined') {
    throw new Error('txContext is not defined');
  }
  if (typeof txContext.chainId === 'undefined') {
    throw new Error('txContext does not contain the chainId');
  }
  if (typeof txContext.accountNumber === 'undefined') {
    throw new Error('txContext does not contain the accountNumber');
  }
  if (typeof txContext.sequence === 'undefined') {
    throw new Error('txContext does not contain the sequence value');
  }

  const txFieldsToSign = {
    account_number: txContext.accountNumber.toString(),
    chain_id: txContext.chainId,
    fee: tx.value.fee,
    memo: tx.value.memo,
    msgs: tx.value.msg,
    sequence: txContext.sequence.toString(),
  };

  return JSON.stringify(removeEmptyProperties(txFieldsToSign));
}

function removeEmptyProperties (jsonTx:any) : any {
  if (Array.isArray(jsonTx)) {
    return jsonTx.map(removeEmptyProperties)
  }

  if (typeof jsonTx !== `object`) {
    return jsonTx
  }
}

function applySignature(unsignedTx:any, txContext:any, secp256k1Sig:any) {
  if (typeof unsignedTx === 'undefined') {
    throw new Error('undefined unsignedTx');
  }
  if (typeof txContext === 'undefined') {
    throw new Error('undefined txContext');
  }
  if (typeof txContext.pk === 'undefined') {
    throw new Error('txContext does not contain the public key (pk)');
  }
  if (typeof txContext.accountNumber === 'undefined') {
    throw new Error('txContext does not contain the accountNumber');
  }
  if (typeof txContext.sequence === 'undefined') {
    throw new Error('txContext does not contain the sequence value');
  }

  const tmpCopy = Object.assign({}, unsignedTx, {});

  tmpCopy.value.signatures = [
    {
      signature: Buffer.from(secp256k1Sig).toString('base64'),
      account_number: txContext.accountNumber.toString(),
      sequence: txContext.sequence.toString(),
      pub_key: {
        type: 'tendermint/PubKeySecp256k1',
        value: Buffer.from(hexToBytes(txContext.pk)).toString('base64'),
      },
    },
  ];
  return tmpCopy;
}