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
import flatted from 'flatted';

import { CosmWasmClient} from "@cosmjs/cosmwasm-stargate";
import { AccountData, coins} from "@cosmjs/launchpad";
import { Coin, DirectSecp256k1HdWallet, makeAuthInfoBytes } from "@cosmjs/proto-signing";
import { SigningStargateClient, StargateClientOptions, SigningStargateClientOptions, GasPrice, StdFee, MsgSendEncodeObject, calculateFee, assertIsDeliverTxSuccess } from "@cosmjs/stargate";
//will need further imports to ensure!

import { publicKeyCreate, ecdsaSign } from 'secp256k1';
import { bech32 } from 'bech32'
import Sha256WithX2 from "sha256";
import RIPEMD160Static from "ripemd160";
import { SnapControllerActions } from '@metamask/snap-controllers';

interface DictionaryAddress {
  address : string,
  name : string
}

interface Transaction {
  type : string, //Either "multisend" or "single"
  timeSent : Date,
  address : string,
  amount : string, 
  memo: string
  denom: string
}

interface SnapConfiguration {
  otherAccounts : Array<CosmosAccount>,
  password : string,
  activeAccount : CosmosAccount 
}

interface CosmosAccount {
  accountName : string,
  nodeUrl : string,
  gas : string,
  denom : string,
  accountAddress : string,
  addresses : Array<DictionaryAddress>,
  mnemonic : string,
  transactionHistory : Array<Transaction>
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
      return setupPassword(request.params[0]['password'], 
        request.params[0]['mnemonic'], 
        request.params[0]['firstAccountName']
      );
    }

    case 'login': {
      console.log("COSMOS-SNAP: Logging in user.");
      return loginUser(request.params[0]['password']);
    }
    
    case 'logout' : {
      console.log("COSMOS-SNAP: Logging out user- no backend run.");
      return {}
    }
    
    case 'setConfig':
      console.log("COSMOS-SNAP: Attempting to update configuration.");
      await updatePluginState(await updateConfiguration(request));
      return filterResponse(await getPluginState());
    
    case 'addAddress': {
      console.log("COSMOS-SNAP: Adding a new name-address pair to the dictionary");
      return await addAddress(request.params[0].name, request.params[0].address);
    }

    case 'viewAddresses' : {
      console.log("COSMOS-SNAP: Return the dictionary of addresses set by the user.");
      const currentState : SnapConfiguration = await getPluginState();

      return {dictionary : currentState.activeAccount.addresses}
    }

    case 'deleteWallet': {
      console.log("COSMOS-SNAP: Attempting wallet deletion.");
      return await deleteWallet(request);
    }

    case 'removeAccount' : {
      console.log("COSMOS_SNAP: Attempting to remove an account.");
      return await removeAccount(request);
    }

    case 'viewAccounts' : {
      console.log("COSMOS-SNAP:  Retrieving Accounts");
      const currentState : SnapConfiguration = await getPluginState();
      const accounts : CosmosAccount[] = currentState.otherAccounts;
      accounts.unshift(currentState.activeAccount);
      return {accounts : accounts}  
    }

    case 'setActiveAccount' : {
      console.log("COSMOS-SNAP: Setting the active account.");
      return await setActiveAccount(request.params[0].accountName);
    }

    case 'addNewAccount' : {
      console.log("COSMOS-SNAP: Adding a new account to the accounts list.");
      return await addNewAccount(request.params[0].accountName, request.params[0].mnemonic);  
    }

    case 'getAccountInfo':
      console.log("COSMOS-SNAP: Getting Account Info.");
      return await getAccountInfo();

    case 'getAccountGeneral':
      console.log("COSMOS-SNAP: Getting Account Info General");
      return await getAccountInfoGeneral(request.params[0].address);

    case 'createSend':
      console.log("COSMOS-SNAP: Creating Send Transaction.");
      return await createSend(request.params[0]);

    case 'createMultiSend':
        console.log("COSMOS-SNAP: Creating Multi Send Transaction.");
        return await createMultiSend(request.params[0]);

    case 'getTransactionHistory':
      console.log("COSMOS-SNAP: Getting Transaction History.");
      return await getTransactionHistory();

    case 'displayNotification':
        try {
          await wallet.request({
            method: 'snap_confirm',
            params: [
              {
                prompt: request.params[0].prompt,
                description: request.params[0].description,
                textAreaContent: request.params[0].textAreaContent,
              },
            ],
          });
          return {}
        }
        catch (error) {
          console.error(error);
          return {}
        }

    default:
      throw new Error('Method not found.');
  }
};

//----------------------------------------------------------
/**
 * DUMMY FUNCTION - Records a dummy single transaction or multisend transaction, without having to use testnet.
 */

async function createSendDummy(transactionRequest : any) {
  try {
    const currentState : any = await getPluginState();

    currentState.transactionHistory.push({
      type : "Singlular",
      timeSent : new Date(),
      address : transactionRequest.recipientAddress, 
      amount : transactionRequest.amount, 
      memo : transactionRequest.memo, 
      denom : currentState.denom
    });
    await updatePluginState(currentState);

    return {
      msg : transactionRequest.amount + " " + currentState.denom + " sent to " + transactionRequest.recipientAddress,
      transactionSent : true
    };
  } catch(error) {
    console.log("COSMOS-SNAP ", error);
    return {msg : error.toString()};
  } 
}

async function createMultiSendDummy(transactionRequest : any) {
  try {
     // Format the multiple transactions
     const messages : Array<MsgSendEncodeObject> = [];
     const transactions : string[] = transactionRequest.inputs.split(" ");
     let content = "";

     const currentState : any = await getPluginState();
     const currentTime = new Date();
     
     for (let i = 0; i < transactions.length; i ++) {
       // Should be in the form: <RecipientAddress>-<Amount>-<Denom>
       const transaction : string[] = transactions[i].split("-");
       content += "\n" + transaction[1] + " " + transaction[2] + " sent to " + transaction[0] + "\n";

       currentState.transactionHistory.push({
        type: "Multisend",
        timeSent : currentTime,
        address : transaction[0], 
        amount : transaction[1], 
        memo : transactionRequest.memo,
        denom : transaction[2]
      });
     }
     await updatePluginState(currentState);

     return  {
      msg  : "Multi-Send Executed:" + "\n" + content,
      transactionSent : true
    }
  } catch(error) {
    console.log("COSMOS-SNAP ", error);
    return {msg : error.toString()};
  } 
}

//----------------------------------------------------------
/**
 * Retrieves transaction history.
 */

async function getTransactionHistory() {
  const currentState : SnapConfiguration = await getPluginState();
  return {transactionHistory  : currentState.activeAccount.transactionHistory}
}

//----------------------------------------------------------
/**
 * Logs in the user using the password. Updates the lastLogin field to be the current session number.
 */
async function loginUser(password : string) {
  try {
    const currentState : SnapConfiguration = await getPluginState();
    
    // If there is no password yet.
    if(password == null || password == '') {
      return {msg : "Password Required", loginSuccessful : false}
    }

    if(currentState.password == null || currentState.password == '') {
      return {msg : "No Password Stored; Setup Account.", loginSuccessful : false}
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

/**
 * Sets the active account parameter in the configuration.
 */
async function setActiveAccount(accountName : string) {
  if(accountName == null || accountName == '') {
    return {msg : 'Account Name Required.', accountChanged: false}
  }

  const currentState : SnapConfiguration = await getPluginState();
  const accounts : CosmosAccount[] = currentState.otherAccounts;
  // Find the account
  for(let i = 0; i < accounts.length; i ++) {
    // If the name matches remove the account
    if (accounts[i].accountName ===  accountName) {
      const newActiveAccount: CosmosAccount = accounts.splice(i, 1)[0];
      const oldActiveAccount: CosmosAccount = currentState.activeAccount;
      currentState.activeAccount = newActiveAccount;
      accounts.push(oldActiveAccount);
      currentState.otherAccounts = accounts;
      await updatePluginState(currentState);
      return {msg: "Account Successfully Changed.", accountChanged: true} 
    }
  }

  return {msg : "Account Name Not Found.", accountChanged : false}
}

/**
 * Adds a new account to the list of accounts.
 */
async function addNewAccount(accountName : string, mnemonic : string) {
  if(accountName == null || accountName == '') {
    return {msg : 'Account Name Required.', acccountAdded : false}
  }
  if(mnemonic == null || mnemonic == '') {
    return {msg : 'Mnemonic Required.', acccountAdded : false}
  }
  // If invalid length mnemonic
  const length = mnemonic.split(" ").length;
  if(length !== 12 && length !== 24 && length !== 25) {
    return {msg : 'Invalid Mnemonic Length' , setup : false}
  }

  const currentState : SnapConfiguration = await getPluginState();
  const accounts : CosmosAccount[] = currentState.otherAccounts;
  
  // Check if the account is already stored.
  for(let i = 0; i < accounts.length; i ++) {
    // If the name matches remove the account
    if (accounts[i].accountName === accountName) {
      return {msg : "Account Name Already Exists.", accountAdded : false}
    }
  }
  // Create a new account
  let newAccount : CosmosAccount = {
    nodeUrl : "",
    denom : "",
    gas : "",
    addresses : new Array<DictionaryAddress>(),
    accountName : "",
    accountAddress : "",
    mnemonic : "",
    transactionHistory  : new Array<Transaction>
  }

  // Set the parameters of the new account
  newAccount.mnemonic = await encrypt(mnemonic, await bip32EntropyPrivateKey());
  newAccount.accountName = accountName;

  // Get the account address.
  const wallet : DirectSecp256k1HdWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
  const accountData : AccountData = (await wallet.getAccounts())[0]
  newAccount.accountAddress = accountData.address;
  
  // Update the config
  const updatedState : SnapConfiguration = await getPluginState();
  updatedState.otherAccounts.push(newAccount);

  // Store the new configuration
  await updatePluginState(updatedState);

  // Set the password
  return {msg : "Account stored and serialized.", accountAdded : true}
}

/**
 * Removes the account specified in the request.
 */
async function removeAccount(request : any) {
  const removeAccountName : string = request.params[0].accountName;

  // Confrim with th user that they want to remove the account.
  if(!(await confirmRequest(request.params[0], 'removeAccount'))) {
    return {msg : "Account Not Removed- User Rejected.", accountRemoved : false}
  }

  // Find the Account to delete, remove it.
  const currentState : SnapConfiguration = await getPluginState();
  const accounts: CosmosAccount[] = currentState.otherAccounts;

  for(let i = 0; i < accounts.length; i ++) {
    // If the name matches remove the account
    if (accounts[i].accountName === removeAccountName) {
      accounts.splice(i, 1); // Remove the account from the array
      currentState.otherAccounts = accounts;
      await updatePluginState(currentState);
      return { msg: "Account removed successfully.", accountRemoved: true };
    }
  }

  // If the account to remove is the active account.
  if(currentState.activeAccount.accountName == removeAccountName) {
    return {msg :  "Cannot remove the active account." , accountRemoved : false}
  }

  // Otherwise, account not found.
  return {msg : "Account to remove not found.", accountRemoved : false}
}

/**
 * Deletes the wallet, clears all SnapConfiguration data.
 */
async function deleteWallet(request : any) {
    // Confirm  with the user
    if(!(await confirmRequest(request.params[0], 'deleteWallet'))) {
      return {msg : "Account Not Deleted- User Rejected", deleted : false}
    }

    // Check the login
    const passwordCheck : any = await loginUser(request.params[0].password);
    if(!passwordCheck.loginSuccessful) {
      return {msg : "Authentication failed", deleted : false}
    }

    // Clear all data in the configuration
    await updatePluginState(await setupWallet());

    return {msg : "Wallet Completely Cleared.", deleted : true};
}

/**
 * Returns the cosmos wallet for the active account.
 */
async function getCosmosWallet() {
  const currentAccount : CosmosAccount = (await getPluginState()).activeAccount;

  return await DirectSecp256k1HdWallet.fromMnemonic(
    await decrypt(
      currentAccount.mnemonic, 
      await bip32EntropyPrivateKey()
  ));
}

/**
 *  This function is used to create a new wallet configuration. 
 */
async function setupWallet() {
  let newConfig : SnapConfiguration = {
    otherAccounts : new Array<CosmosAccount>(),
    activeAccount: {
      accountName : "",
      accountAddress : "",
      addresses : new Array<DictionaryAddress>(),
      mnemonic : "",
      denom : "",
      gas : "",
      nodeUrl : "",
      transactionHistory : new Array<Transaction>()
    },
    password : ""
  }

  return newConfig;
}

/**
 * Sets up the new password used for verification
 * Initializes wallet with a single account.
 */
async function setupPassword(password : string, mnemonic : string, accountName : string) {
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
    // If the account name is empty or null.
    if(accountName == null || accountName == '') {
      return {msg : "Account name is required." , setup : false}
    }
    
    // Get the blank configuration 
    let newConfig : SnapConfiguration = await setupWallet();
    
    // Set the parameters of the new account
    newConfig.activeAccount.mnemonic = await encrypt(mnemonic, await bip32EntropyPrivateKey());
    newConfig.activeAccount.accountName = accountName;

    // Get the account address.
    const wallet : DirectSecp256k1HdWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
    const accountData : AccountData = (await wallet.getAccounts())[0]
    newConfig.activeAccount.accountAddress = accountData.address;
        
    // Setup the password
    newConfig.password = await encrypt(password, await bip32EntropyPrivateKey());
    
    // Store the new configuration
    await updatePluginState(newConfig);

    // Set the password
    return {msg : "Successful serialization of wallet.", setup : true}
  }
  catch(error) {
    console.log(error);
    return {msg : "Serialization not successful: " + error.toString(), setup : false}
  }
}

/**
 * Used to confirm with the user that they want to perform an action.
 */
async function confirmRequest(params: any, method : string) {
  const currentAccount : CosmosAccount = (await getPluginState()).activeAccount;
  let prompt = "";
  let content = "";
  switch(method) {
    case 'createSend' : {
      prompt  = "Confirm Singular Transaction";
      content = "Send " + params.amount + " " + currentAccount.denom +   " to " + params.recipientAddress;
      break;
    }
    case 'createMultiSend' : {
      prompt = "Confirm Multi Send Transaction"
      let transactions = params.inputs.split(" ");
      for (let i = 0; i < transactions.length; i ++) {
        // Should be in the form: <RecipientAddress>-<Amount>-<Denom>
        const transaction : string[] = transactions[i].split("-");
        
        // If the address sent by the user is a short-hand name in the dictionary, replace it with the actual address for the transaction.
        content += "\n Send " + transaction[1] + " " + transaction[2] + " to " + transaction[0] + "\n";
      }
      break;
    }
    case 'deleteWallet' : {
      prompt = "Confirm Wallet Deletion";
      break;
    }
    case 'removeAccount' : {
      prompt = "Confrim Account Removal";
      break;
    }
  }
  return wallet.request({
    method: 'snap_confirm',
    params: [
      {
        prompt: prompt,
        description: "",
        textAreaContent: content,
      },
    ],
  });
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
  
  const currentState : SnapConfiguration = await getPluginState();

  // if this name already exists
  const dictionary : Array<DictionaryAddress> = currentState.activeAccount.addresses;
  for(let i = 0; i < dictionary.length; i ++) {
    if(dictionary[i].name == name) {
      return {msg : "Name already used." , added : false}
    }
  }

  // Otherwise, add the new pairing
  dictionary.push({name : name, address : address}); 
  await updatePluginState(currentState);
  return {msg : name + "-" + address + " was added to the dictionary." , added : true}
}

/**
 * Retrieves the current currencies associated with the account, with the currency specified in the configuration.
 */
async function getAccountInfo() {
  try {
    // Get the wallet (keys) object
    const currentAccount : CosmosAccount = (await getPluginState()).activeAccount;
    const wallet : DirectSecp256k1HdWallet = await getCosmosWallet();
    
    // If the nodeUrl has not been set
    if(currentAccount.nodeUrl == null || currentAccount.nodeUrl == '') {
      return {msg : "Node URL required.", accountRetrieved : false}
    }

    // Get the client object to interact with the blockchain
    const client : SigningStargateClient = await SigningStargateClient.connectWithSigner(currentAccount.nodeUrl, wallet);
    
    // Get the public address of the account
    const accountData : AccountData = (await wallet.getAccounts())[0];

    // If there is no default denom
    if(currentAccount.denom == null || currentAccount.denom == '') {
      return {msg : "Default denom required.", accountRetrieved : false}
    }

    // Return result
    let result : any = await client.getBalance(accountData.address, currentAccount.denom);
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
 * Returns the balance at -address-
 */
async function getAccountInfoGeneral(address : string) {
  try {
    // Get the wallet (keys) object
    const currentAccount : CosmosAccount = (await getPluginState()).activeAccount;
    const wallet : DirectSecp256k1HdWallet = await getCosmosWallet();
    
    // If the nodeUrl has not been set
    if(currentAccount.nodeUrl == null || currentAccount.nodeUrl == '') {
      return {msg : "Node URL required.", accountRetrieved : false}
    }
    // Get the client object to interact with the blockchain
    const client : SigningStargateClient = await SigningStargateClient.connectWithSigner(currentAccount.nodeUrl, wallet);
    
    // If the denom is empty
    if(currentAccount.denom == null || currentAccount.denom == '') {
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
    let result : any = await client.getBalance(searchAddress, currentAccount.denom);
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
    // Confirm the transaction request with the user.
    let confirmed = await confirmRequest(transactionRequest, 'createSend');
    if (!confirmed) {
      console.log("COSMOS-SNAP: Transaction Rejected By User");
      return {msg : "Transaction Not Confirmed", transactionSent : false}
    }
    
    // Get the wallet (keys) object
    const wallet : DirectSecp256k1HdWallet = await getCosmosWallet();
    
    // Get the client object to interact with the blockchain
    const currentAccount : CosmosAccount = (await getPluginState()).activeAccount;
    
    // Get the gas price
    if(currentAccount.gas == null || currentAccount.gas == '') {
      return {msg : "Gas not set.", transactionSent : false}
    }
    const gasPrice : GasPrice = GasPrice.fromString(currentAccount.gas);

    // If the nodeUrl has not been set
    if(currentAccount.nodeUrl == null || currentAccount.nodeUrl == '') {
      return {msg : "Node URL required.", transactionSent : false}
    }
    const client : SigningStargateClient = await SigningStargateClient
      .connectWithSigner(
        currentAccount.nodeUrl, 
        wallet, 
        {gasPrice : gasPrice}
      );
    
    // Get the public address of the account
    const accountData : AccountData = (await wallet.getAccounts())[0];
    
    // If the recipient address, amount, or denom is missing
    if(transactionRequest.recipientAddress == null || transactionRequest.recipientAddress == '') {
      return {msg : "Recpient Address Required.", transactionSent : false}
    }
    if(currentAccount.denom == null || currentAccount.denom == '') {
      return {msg : "Denom Required.", transactionSent : false}
    }
    if(transactionRequest.amount == null || transactionRequest.amount == '') {
      return {msg : "Amount Required.", transactionSent : false}
    }
    if(transactionRequest.memo == null || transactionRequest.memo == '') {
      return {msg : "Memo Required.", transactionSent : false}
    }

    // Format the amount
    const amount : Coin[] = [{denom : currentAccount.denom, amount: transactionRequest.amount}];
    
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

    // Record the transaction in the transaction history.
    currentAccount.transactionHistory.push({
      type : "Singlular",
      timeSent : new Date(),
      address : transactionRequest.recipientAddress, 
      amount : transactionRequest.amount, 
      memo : transactionRequest.memo, 
      denom : currentAccount.denom
    });
    const currentState : SnapConfiguration = await getPluginState();
    currentState.activeAccount = currentAccount;
    await updatePluginState(currentState);

    return {
      msg : transactionRequest.amount + " " + currentAccount.denom + " sent to " + transactionRequest.recipientAddress,
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
    
      // Confirm the transaction with the user
      if(! (await confirmRequest(transactionRequest, 'createMultiSend'))) {
        return {msg : "Transaction Denied by user.", transactionSent : false}
      }

      // Get the client object to interact with the blockchain
      const currentAccount : CosmosAccount = (await getPluginState()).activeAccount;
      if(currentAccount.gas == null || currentAccount.gas == '') {
        return {msg : "Gas not set.", transactionSent : false}
      }
      if(currentAccount.nodeUrl == null || currentAccount.nodeUrl == '') {
        return {msg : "Node URL required.", transactionSent : false}
      }
      const gasPrice : GasPrice = GasPrice.fromString(currentAccount.gas);
      const client : SigningStargateClient = await SigningStargateClient.connectWithSigner(currentAccount.nodeUrl, wallet, {gasPrice : gasPrice});
      
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
        messages.push(newMessage);      //return await createSend(request.params[0]);
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

      // Send the transaction.
      const response : any = await client.signAndBroadcast(
        accountData.address,
        messages,
        fee,
        transactionRequest.memo
      );
      assertIsDeliverTxSuccess(response);

      // Record the succussful transaction
      const currentTime = new Date();
      for (let i = 0; i < transactions.length; i ++) {
        // Should be in the form: <RecipientAddress>-<Amount>-<Denom>
        const transaction : string[] = transactions[i].split("-");
        
        currentAccount.transactionHistory.push({
         type: "Multisend",
         timeSent : currentTime,
         address : transaction[0], 
         amount : transaction[1], 
         memo : transactionRequest.memo,
         denom : transaction[2]
       });
      }
      const currentState : SnapConfiguration = await getPluginState();
      currentState.activeAccount = currentAccount;
      await updatePluginState(currentState);

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
async function updatePluginState(state: SnapConfiguration)
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

  let currentAccount : CosmosAccount = (await getPluginState()).activeAccount;
  currentAccount.nodeUrl  = "";
  currentAccount.denom = "";
  currentAccount.gas = ""
  currentAccount.addresses = new Array<DictionaryAddress>();
  currentAccount.transactionHistory = new Array<Transaction>();
  let currentState : SnapConfiguration = await getPluginState();
  currentState.activeAccount = currentAccount;

  await updatePluginState(currentState);

  return {dataCleared : true};
}

/**
 * Filters the mnemonic and password from the response.
 * Returns the configuration and general data about the activeAccount.
 */
function filterResponse(currentState : SnapConfiguration) {
  // We only want to send the config, so extract it. 
  let account : CosmosAccount = currentState.activeAccount;

  let filtered : any = Object.assign({}, ...
    Object.entries(account).filter(([k,v]) => k != 'mnemonic').map(([k,v]) => ({[k]:v}))
  );

  let filtered2 = Object.assign({}, ...
    Object.entries(filtered).filter(([k,v]) => k != 'addresses').map(([k,v]) => ({[k]:v}))
  );
  
  let filtered3 = Object.assign({}, ...
    Object.entries(filtered).filter(([k,v]) => k != 'transactionHistory').map(([k,v]) => ({[k]:v}))
  );
  return filtered3;
}

/**
 * Seaches the dictionary for a name match, returns the address.
 */
async function getAddressFromName(name : string) {
  const currentAccount : CosmosAccount = (await getPluginState()).activeAccount;
  const dictionary : Array<DictionaryAddress> = currentAccount.addresses;
  for(let i = 0; i < dictionary.length; i ++) {
    if(dictionary[i].name == name) {
      return {address : dictionary[i].address, pairing : true}
    }
  }
  return {pairing : false}
}

/**
 * Returns an updates state.
 */
async function updateConfiguration(request : any) {
  const updates  : any = request.params[0];

  // Retrieve the active account
  const currentState : SnapConfiguration = await getPluginState();
  let activeAccount : CosmosAccount = currentState.activeAccount;
  
  // If a url change was entered
  if(updates.nodeUrl != '' &&  updates.nodeUrl != null) {
    activeAccount.nodeUrl = updates.nodeUrl;
  }

  // If a gas change was entered.
  if(updates.gas != ''  && updates.gas != null) {
    activeAccount.gas = updates.gas;
  }

  // If a denom change was entered.
  if(updates.denom != ''  && updates.denom != null) {
    activeAccount.denom = updates.denom;
  }  

  let updatedState : SnapConfiguration = currentState;
  updatedState.activeAccount = activeAccount;
  return updatedState;
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