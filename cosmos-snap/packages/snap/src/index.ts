import { OnRpcRequestHandler, OnCronjobHandler, OnTransactionHandler} from '../../../node_modules/@metamask/snap-types';
import detectEthereumProvider from '@metamask/detect-provider';
import { JsonBIP44CoinTypeNode, SLIP10Node, SLIP10Path } from "@metamask/key-tree";
import { hasProperty, isObject, Json } from '@metamask/utils';
import { assert, BytesLike, ethers, parseUnits } from "ethers";
import { Web3Provider } from "@ethersproject/providers";
import { Decimal } from "@cosmjs/math";
import  web3  from "web3";
import {Buffer} from 'buffer';
import { caesar, rot13 } from "simple-cipher-js";
import crypto from 'crypto';

import { CosmWasmClient} from "@cosmjs/cosmwasm-stargate";
import { AccountData, coins} from "@cosmjs/launchpad";
import { Coin, DirectSecp256k1HdWallet, makeAuthInfoBytes } from "@cosmjs/proto-signing";
import { SigningStargateClient, StargateClientOptions, SigningStargateClientOptions, GasPrice, StdFee, MsgSendEncodeObject, calculateFee, assertIsDeliverTxSuccess } from "@cosmjs/stargate";
//will need further imports to ensure!

import { publicKeyCreate, ecdsaSign } from 'secp256k1';
import { bech32 } from 'bech32'
import Sha256WithX2 from "sha256";
import RIPEMD160Static from "ripemd160";

interface DictionaryAccount {
  address : string,
  name : string
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
      const filteredState =  filterResponse(await getPluginState());
      return filteredState;

    case 'setupPassword': {
      console.log("COSMOS-SNAP: Setting up new password for key encryption.");
      return setupPassword(request.params[0]['password'], request.params[0]['mnemonic']);
    }

    case 'login': {
      console.log("COSMOS-SNAP: Logging in user.");
      return loginUser(request.params[0]['password']);
    }
    
    case 'logout' : {
      console.log("COSMOS-SNAP: Logging out user- no backend run.");
      return {}
    }
    
    case 'removeAccount': {
      console.log("COSMOS-SNAP: Removing Account");
      // Remove All Data, Including Keys
      await updatePluginState({});
      // Set the parameters to the defaults
      await clearConfigData();
      return {msg : "All Configuration Data Cleared, Keys Removed."}
    }

    case 'setConfig':
      console.log("COSMOS-SNAP: Attempting to update configuration.");
      const updates  : any = await updateConfiguration(request);
      await updatePluginState({
        ...await getPluginState(),
        ...updates
      })
      return filterResponse(await getPluginState());
    
    case 'addAddress': {
      console.log("COSMOS-SNAP: Adding a new name-address pair to the dictionary");
      return await addAddress(request.params[0].name, request.params[0].address);
    }

    case 'viewAddresses' : {
      console.log("COSMOS-SNAP: Return the dictionary of addresses set by the user.");
      return {dictionary  : (await getPluginState()).dictionary}
    }

    case 'clearWalletData':
      console.log("COSMOS-SNAP: Clearing the config data.");
      return await clearConfigData();

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
  try {
    const currentState : any = await getPluginState();
    
    // If there is no password yet.
    if(password == null || password == '') {
      return {msg : "Password Required", loginSuccessful : false}
    }

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
  catch(e) {
    console.log("COSMOS-SNAP: ", e);
    return {msg : e.toString()};
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
 * Initializes the attributes of the wallet to empty.
 */
async function setupPassword(password : string, mnemonic : string) {
  try {
    // If the password is empty or null
    if(password == null || password === '') {
      return {msg: 'Password Required.', setup : false}
    }
    if(mnemonic == null || mnemonic === '') {
      return {msg : 'Mnemonic required', setup : false}
    }
    // If invalid length mnemonic
    const length = mnemonic.split(" ").length;
    if(length !== 12 && length !== 24 && length !== 25) {
      return {msg : 'Invalid Mnemonic Length' , setup : false}
    }

    // Update the pluginState with the encrypted key and serialized wallet
  await updatePluginState(
    {
      ...await getPluginState(),
      mnemonic : await encrypt(mnemonic, await bip32EntropyPrivateKey()),
      password : await encrypt(password, await bip32EntropyPrivateKey())

    });
  await clearConfigData();
  return {msg : "Successful serialization of wallet.", setup : true}
  }
  catch(error) {
    console.log(error);
    return {msg : "Serialization not successful.", setup : false}
  }
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
  return caesar.decrypt(password, keyint);
}

/**
 * Functions the fee by simulating a transaction.
 */
async function formatFee(msgs : Array<MsgSendEncodeObject>, fromAddress : string, 
  client : SigningStargateClient, memo : string, gasPrice : GasPrice) {
  // Simulate the transaction
  const gasEstimation = await client.simulate(fromAddress, msgs, memo);
  const fee : StdFee = calculateFee(Math.round(gasEstimation * 1.3), gasPrice);

  return fee
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
 * Adds a new address to the dictionary.
 */
async function addAddress(name : string, address : string) {
  if(name == null || name == '') {
    return {msg : "Name Required." , added : false}
  }
  if(address == null || address == '') {
    return {msg : "Address Required." , added : false}
  }
  const currentState : any = await getPluginState();
  // if this name already exists
  const dictionary : Array<DictionaryAccount> = currentState.dictionary;
  for(let i = 0; i < dictionary.length; i ++) {
    if(dictionary[i].name == name) {
      return {msg : "Name already used." , added : false}
    }
  }

  // Otherwise, add the new pairing
  currentState.dictionary.push({name : name, address : address});
  await updatePluginState(currentState);
  return {msg : name + "-" + address + " was added to the dictionary." , added : true}
}

/**
 * Retrieves the current currencies associated with the account, with the currency specified in the configuration.
 */
async function getAccountInfo() {
  try {
    // Get the wallet (keys) object
    const currentState : any = await getPluginState();
    const wallet : DirectSecp256k1HdWallet = await getCosmosWallet();
    
    // If the nodeUrl has not been set
    if(currentState.nodeUrl == null || currentState.nodeUrl == '') {
      return {msg : "Node URL required.", accountRetrieved : false}
    }

    // Get the client object to interact with the blockchain
    const client : SigningStargateClient = await SigningStargateClient.connectWithSigner(currentState.nodeUrl, wallet);
    
    // Get the public address of the account
    const accountData : AccountData = (await wallet.getAccounts())[0];

    // If there is no default denom
    if(currentState.denom == null || currentState.denom == '') {
      return {msg : "Default denom required.", accountRetrieved : false}
    }

    // Return result
    let result : any = await client.getBalance(accountData.address, currentState.denom);
    assertIsDeliverTxSuccess(result);
    result['Account'] = accountData.address;
    result['msg'] = "Account Details."
    result['accountRetrieved'] = true;
    return result; 
  }
  catch(error) {
    console.log("COSMOS-SNAP: " , error);
    return {msg : error.toString()};
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
    
    // If the nodeUrl has not been set
    if(currentState.nodeUrl == null || currentState.nodeUrl == '') {
      return {msg : "Node URL required.", accountRetrieved : false}
    }
    // Get the client object to interact with the blockchain
    const client : SigningStargateClient = await SigningStargateClient.connectWithSigner(currentState.nodeUrl, wallet);
    
    // If the denom is empty
    if(denom == null || denom == '') {
      return {msg : "Denom Required.", accountRetrieved : false}
    }

    // If the address is empty
    if(address == null || address == '') {
      return {msg : "Address Required.", accountRetrieved : false}
    }

    // If the address sent by the user is a short-hand name in the dictionary, replace it with the actual address for the transaction.
    let searchAddress : string = address;
    const possiblePairing : any  = (await getAddressFromName(searchAddress))
    if(possiblePairing.pairing) {
      searchAddress = possiblePairing.address;
    }
    
    // Return result
    let result : any = await client.getBalance(searchAddress, denom);
    assertIsDeliverTxSuccess(result);
    result['Account'] = address;
    result['accountRetrieved'] = true;
    return result; 
  }
  catch(error) {
    console.log("COSMOS-SNAP: " , error);
    return {msg : error.toString()};
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
    
    // Get the gas price
    if(currentState.gas == null || currentState.gas == '') {
      return {msg : "Gas not set.", transactionSent : false}
    }
    const gasPrice : GasPrice = GasPrice.fromString(currentState.gas);

    // If the nodeUrl has not been set
    if(currentState.nodeUrl == null || currentState.nodeUrl == '') {
      return {msg : "Node URL required.", transactionSent : false}
    }
    const client : SigningStargateClient = await SigningStargateClient
      .connectWithSigner(
        currentState.nodeUrl, 
        wallet, 
        {gasPrice : gasPrice}
      );
    
    // Get the public address of the account
    const accountData : AccountData = (await wallet.getAccounts())[0];
    
    // If the recipient address, amount, or denom is missing
    if(transactionRequest.recipientAddress == null || transactionRequest.recipientAddress == '') {
      return {msg : "Recpient Address Required.", transactionSent : false}
    }
    if(transactionRequest.denom == null || transactionRequest.denom == '') {
      return {msg : "Denom Required.", transactionSent : false}
    }
    if(transactionRequest.amount == null || transactionRequest.amount == '') {
      return {msg : "Amount Required.", transactionSent : false}
    }
    if(transactionRequest.memo == null || transactionRequest.memo == '') {
      return {msg : "Memo Required.", transactionSent : false}
    }

    // Format the amount
    const amount : Coin[] = [{denom : transactionRequest.denom, amount: transactionRequest.amount}];
    
    // If the address sent by the user is a short-hand name in the dictionary, replace it with the actual address for the transaction.
    let recipientAddress : string = transactionRequest.recipientAddress;
    const possiblePairing : any  = (await getAddressFromName(recipientAddress))
    if(possiblePairing.pairing) {
      recipientAddress = possiblePairing.address;
    }

    // Format the fee
    const fee : StdFee = await formatFee(
      [{
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: {
          fromAddress: accountData.address,
          toAddress: recipientAddress,
          amount: amount
            }
      }],
      accountData.address,
      client,
      transactionRequest.memo,
      gasPrice
    );

    // Make the transaction request to the network.
    const response : any  = await client.sendTokens(
      accountData.address,
      recipientAddress,
      amount, 
      fee,
      transactionRequest.memo
    );
    assertIsDeliverTxSuccess(response);
    return {
      msg : transactionRequest.amount + " " + transactionRequest.denom + " sent to " + transactionRequest.recipientAddress,
      transactionSent : true
    };
  }
  catch(error) {
    console.log("COSMOS-SNAP ", error);
    return {msg : error.toString()};
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
      if(currentState.gas == null || currentState.gas == '') {
        return {msg : "Gas not set.", transactionSent : false}
      }
      if(currentState.nodeUrl == null || currentState.nodeUrl == '') {
        return {msg : "Node URL required.", transactionSent : false}
      }
      const gasPrice : GasPrice = GasPrice.fromString(currentState.gas);
      const client : SigningStargateClient = await SigningStargateClient.connectWithSigner(currentState.nodeUrl, wallet, {gasPrice : gasPrice});
      
      // Get the public address of the account
      const accountData : AccountData = (await wallet.getAccounts())[0];
      
      // Format the multiple transactions
      const messages : Array<MsgSendEncodeObject> = [];
      const transactions : string[] = transactionRequest.inputs.split(" ");
      let content = "";
      
      for (let i = 0; i < transactions.length; i ++) {
        // Should be in the form: <RecipientAddress>-<Amount>-<Denom>
        const transaction : string[] = transactions[i].split("-");
        
        // If the address sent by the user is a short-hand name in the dictionary, replace it with the actual address for the transaction.
        let recipientAddress : string = transaction[0];
        const possiblePairing : any  = (await getAddressFromName(recipientAddress))
        if(possiblePairing.pairing) {
          recipientAddress = possiblePairing.address;
        }

        let newMessage : MsgSendEncodeObject = {
          typeUrl : "/cosmos.bank.v1beta1.MsgSend",
          value : {
            fromAddress : accountData.address,
            toAddress : recipientAddress,
            amount : [{amount : transaction[1], denom : transaction[2]}]
          }
        };
        messages.push(newMessage);
        content += "\n" + transaction[1] + " " + transaction[2] + " sent to " + transaction[0] + "\n";
      }
      
      // Get the fee.
      const fee : StdFee = await formatFee(
        messages,
        accountData.address,
        client,
        transactionRequest.memo,
        gasPrice
      );

      //Use signAndBroadcast
      const response : any = client.signAndBroadcast(
        accountData.address,
        messages,
        fee,
        transactionRequest.memo
      );
      assertIsDeliverTxSuccess(response);
      
      return  {
        msg  : "Multi-Send Executed:" + "\n" + content,
        transactionSent : true
      }
    }
    catch(error) {
      console.log("COSMOS-SNAP ", error);
      return {msg : error.toString()};
    } 
}

/**
 * Gets the data persisted by MetaMask.
 */
async function getPluginState()
{
    const currentState : any =  await wallet.request({
    method: 'snap_manageState',
    params: ['get'],
    });

    // If null return blank object.
    if(currentState == null) {
      return {}
    } 
    return currentState;
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

/**
 * Clear the configuration data. Also used to initialize it.
 */
async function clearConfigData() {
  const currentState : any = await getPluginState();
  currentState.nodeUrl  = "";
  currentState.denom = "";
  currentState.memo = "";
  currentState.prefix = ""; 
  currentState.gas = ""
  currentState.dictionary = new Array<DictionaryAccount>();
  await updatePluginState(currentState);

  return {dataCleared : true};
}

/**
 * Filters the mnemonic and password from the response.
 */
function filterResponse(currentState : any) {
  let filtered : any = Object.assign({}, ...
    Object.entries(currentState).filter(([k,v]) => k != 'mnemonic').map(([k,v]) => ({[k]:v}))
  );

  let filtered2 = Object.assign({}, ...
    Object.entries(filtered).filter(([k,v]) => k != 'password').map(([k,v]) => ({[k]:v}))
  );

  let filtered3 = Object.assign({}, ...
    Object.entries(filtered2).filter(([k,v]) => k != 'dictionary').map(([k,v]) => ({[k]:v}))
  );
  return filtered3;
}

/**
 * Seaches the dictionary for a name match, returns the address.
 */
async function getAddressFromName(name : string) {
  const currentState : any = await getPluginState();
  const dictionary : Array<DictionaryAccount> = currentState.dictionary;
  for(let i = 0; i < dictionary.length; i ++) {
    if(dictionary[i].name == name) {
      return {address : dictionary[i].address, pairing : true}
    }
  }
  return {pairing : false}
}

/**
 * Allows for dynamic updating using setConfig method.
 */
async function updateConfiguration(request : any) {
  const updates  : any = request.params[0];
  const currentState : any = await getPluginState();
  if((updates.nodeUrl === null || updates.nodeUrl === '') && currentState.nodeUrl !== null) {
    updates.nodeUrl = currentState.nodeUrl;
  }
  if((updates.denom === null || updates.denom === '') && currentState.denom !== null) {
    updates.denom = currentState.denom;
  }
  if((updates.prefix === null || updates.prefix === '') && currentState.prefix !== null) {
    updates.prefix  = currentState.prefix;
  }
  if((updates.memo === null || updates.memo === '') && currentState.memo !== null) {
    updates.memo = currentState.memo;
  }
  if((updates.gas === null || updates.gas === '') && currentState.gas !== null) {
    updates.gas = currentState.gas;
  }

  return updates;
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