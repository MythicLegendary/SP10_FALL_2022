import { OnRpcRequestHandler, OnCronjobHandler, OnTransactionHandler} from 'C:/Users/David Shilliday/Desktop/Cosmos Repo/cosmos-snap/node_modules/@metamask/snap-types';
import detectEthereumProvider from '@metamask/detect-provider';
import { JsonBIP44CoinTypeNode } from "@metamask/key-tree";
import { hasProperty, isObject, Json } from '@metamask/utils';
import { BytesLike, ethers, parseUnits } from "ethers";
import { Web3Provider } from "@ethersproject/providers";
import  web3  from "web3";
//will need further imports to ensure!


import { publicKeyCreate, ecdsaSign } from 'secp256k1';
import { bech32 } from 'bech32'
import Sha256WithX2 from "sha256";
import RIPEMD160Static from "ripemd160";
/**
 * Get a message from the origin. For demonstration purposes only.
 *
 * @param originString - The origin string.
 * @returns A message based on the origin.
 */
const getMessage = (originString: string): string =>
  `Hello, ${originString}!`;


//hardcoded to start with ATOM as our base cryptocurrency, the official and most popular Cosmos coin.
updatePluginState({
  nodeUrl: "https://atom.getblock.io",
  denom: "uatom",
  prefix: "cosmos",
  memo: "SP-10-2022",
  gas: 0,
  version: "0.0.1"
})

/**
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


export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  let pubKey, account;
  console.log("Snap RPC Handler invoked");

  switch (request.method) {
    case 'getSnapState':
      console.log("Geting the Snap Plugin State.");
      return getPluginState();

    case 'setConfig':
      console.log("Attempting to update configuration.");
      updatePluginState({
        ...getPluginState(),
        nodeUrl: request[0]['nodeUrl'],
        denom: request[0]['denom'],
        prefix: request[0]['prefix'],
        memo: request[0]['memo'],
        gas: request[0]['gas'],
      })
      return getPluginState();

    case 'getAccount':
      console.log("Getting the public key.");
      pubKey = await getPubKey();
      return getAccount(pubKey);
    
    case 'getAccountInfo':
      console.log("Getting Account Info.");
      pubKey = await getPubKey();
      account = getAccount(pubKey);
      return await getAccountInfo(account);

    case 'getStatus':
      console.log("Getting status.");
      return getStatus();
    
    case 'getBandwidth':
      console.log("Getting bandwidth.");
      pubKey = await getPubKey()
      account = getAccount(pubKey)
      return await getAccountBandwidth(account)
    
    case 'getIndexStats':
        console.log("Getting index stats.");
        return await getIndexStats()
    
    case 'getRewards':
      console.log("Getting rewards.");
      pubKey = await getPubKey()
      account = getAccount(pubKey)
      return await getRewards(account)
    
      case 'createCyberlink':
        let linkData = request.params[0]
        return await createCyberlinkTx(
          linkData['objectFrom'],
          linkData['objectTo']
        )
    
    case 'createSend':
      console.log("Creating Send Transaction.");
      let sendData = request.params[0]
      return await createSendTx(
        sendData['subjectTo'],
        sendData['amount']
      )

    case 'createMultiSend':
        console.log("Creating Multi Send Transaction.");
        let multiSendData = request.params[0]
        return await createMultiSendTx(
          multiSendData['inputs'],
          multiSendData['outputs']
        )

    case 'createDelegate':
      console.log("Creating Delegate.");
      let delegateData = request.params[0]
      return await createDelegateTx(
        delegateData['validatorTo'],
        delegateData['amount']
      )

    case 'createRedelegate':
      console.log("Creating Redelegate");
      let redelegateData = request.params[0]
      return await createRedelegateTx(
        redelegateData['validatorFrom'],
        redelegateData['validatorTo'],
        redelegateData['amount']
      )

    case 'createUndelegate':
      console.log("Creating Undelegate");
      let undelegateData = request.params[0]
      return await createUndelegateTx(
        undelegateData['validatorFrom'],
        undelegateData['amount']
      )

    case 'createWithdrawDelegationReward':
      console.log("Creating Withdrawal Delegation Reward");
      let withdrawDelegationReward = request.params[0]
      return await createWithdrawDelegationRewardTx(
        withdrawDelegationReward['rewards']
      )

    case 'createTextProposal':
      console.log("Creating Text Proposal");
      let textProposalData = request.params[0]
      return await createTextProposalTx(
        textProposalData['title'],
        textProposalData['description'],
        textProposalData['deposit']
      )

    case 'createCommunityPoolSpend':
      console.log("Creating Community Pool Spend.");
      let communitySpendProposalData = request.params[0]
      return await createCommunityPoolSpendProposalTx(
        communitySpendProposalData['title'],
        communitySpendProposalData['description'],
        communitySpendProposalData['recipient'],
        communitySpendProposalData['deposit'],
        communitySpendProposalData['amount']
      )

    case 'createParamsChangeProposal':
      console.log("Create Params Change Proposal.");
      let paramsChangeProposalData = request.params[0]
      return await createParamsChangeProposalTx(
        paramsChangeProposalData['title'],
        paramsChangeProposalData['description'],
        paramsChangeProposalData['changes'],
        paramsChangeProposalData['deposit']
      )
      
    case 'createDeposit':
      console.log("Create Deposit.");
      let depositData = request.params[0]
      return await createDepositTx(
        depositData['proposalId'],
        depositData['amount']
      )
      
    case 'createVote':
      console.log("Creating Vote.");
      let voteData = request.params[0]
      return await createVoteTx(
        voteData['proposalId'],
        voteData['option']
      )
      
    case 'hello':
      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: getMessage(origin),
            description:
              'This custom confirmation is just for display purposes.',
            textAreaContent:
              'But you can edit the snap source code to make it do something, if you want to!',
          },
        ],
      });

    default:
      throw new Error('Method not found.');
  }
};

//----------------------------------------------------------

async function getPluginState()
{
  return await wallet.request({
    method: 'snap_manageState',
    params: {operation: 'get'},
  });
}

async function updatePluginState(state: unknown)
{
  return await wallet.request({
  method: 'snap_manageState',
  params: {operation: 'update', newState: state},
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

  return bip44Node.privateKey;

}

//----------------------------------------------------------

async function getPubKey () {
  const PRIV_KEY = await getAppKey()
  const prikeyArr = new Uint8Array(hexToBytes(PRIV_KEY));
  return bytesToHex(publicKeyCreate(prikeyArr, true))
}

async function getAccount (pubkey: any) {
  const currentPluginState : any = getPluginState()
  const address = getAddress(hexToBytes(pubkey))
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
  const currentPluginState : any = getPluginState();
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

async function getAccountInfo(address: any) {
  const currentPluginState : any = getPluginState()
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
  const currentPluginState : any = getPluginState()
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
  const currentPluginState : any = getPluginState()
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
  const currentPluginState : any = getPluginState()
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

function createSend(txContext : any, recipient : any, amount : any, denom :any) {
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


async function createSendTx(subjectTo : any, amount :  any) {
  const txContext = await createTxContext()
  const currentPluginState : any = getPluginState()

  const tx = await createSend(
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
  const accountInfo = await getAccountInfo(account)

  const currentPluginState : any = getPluginState();

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
  const currentPluginState : any = getPluginState()
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

function createMultiSend(txContext : any, inputs : any, outputs : any, denom : any) {
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

async function createMultiSendTx(inputs : any, outputs : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = getPluginState()

  const tx = await createMultiSend(
    txContext,
    JSON.parse(inputs),
    JSON.parse(outputs),
    currentPluginState.denom
  );
}

function createCyberlink(txContext : any, objectFrom : any, objectTo : any, denom : any) {
  const txSkeleton = createSkeleton(txContext, denom);

  const txMsg = {
    type: 'cyberd/Link',
    value: {
      address: txContext.bech32,
      links: [
        {
          from: objectFrom,
          to: objectTo,
        },
      ],
    },
  };

  txSkeleton.value.msg = [txMsg];

  return txSkeleton;
}

async function createCyberlinkTx (objectFrom :any, objectTo : any) {
  const txContext = await createTxContext()
  const currentPluginState : any = getPluginState()

  const tx = await createCyberlink(
    txContext,
    objectFrom,
    objectTo,
    currentPluginState.denom
  );

  const signedTx = await sign(tx, txContext);
  return await txSubmit(signedTx)
  // return signedTx
};

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
  const currentPluginState : any = getPluginState()

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
  const currentPluginState : any = getPluginState()

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
  const currentPluginState : any = getPluginState()

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
  const currentPluginState : any = getPluginState()

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
  const currentPluginState : any = getPluginState()

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
  const currentPluginState : any = getPluginState()

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
  const currentPluginState : any = getPluginState()

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
  const currentPluginState : any = getPluginState()

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
  const currentPluginState : any = getPluginState()

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