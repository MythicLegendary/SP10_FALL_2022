import { defaultSnapOrigin } from '../config';
import { GetSnapsResponse, Snap } from '../types';

/**
 * Get the installed snaps in MetaMask.
 *
 * @returns The snaps installed in MetaMask.
 */
export const getSnaps = async (): Promise<GetSnapsResponse> => {
  return (await window.ethereum.request({
    method: 'wallet_getSnaps',
  })) as unknown as GetSnapsResponse;
};

/**
 * Connect a snap to MetaMask.
 *
 * @param snapId - The ID of the snap.
 * @param params - The params to pass with the snap to connect.
 */
export const connectSnap = async (
  snapId: string = defaultSnapOrigin,
  params: Record<'version' | string, unknown> = {},
) => {
  await window.ethereum.request({
    method: 'wallet_enable',
    params: [
      {
        wallet_snap: {
          [snapId]: {
            ...params,
          },
        },
      },
    ],
  });
};

/**
 * Get the snap from MetaMask.
 *
 * @param version - The version of the snap to install (optional).
 * @returns The snap object returned by the extension.
 */
export const getSnap = async (version?: string): Promise<Snap | undefined> => {
  try {
    const snaps = await getSnaps();

    return Object.values(snaps).find(
      (snap) =>
        snap.id === defaultSnapOrigin && (!version || snap.version === version),
    );
  } catch (e) {
    console.log('Failed to obtain installed snap', e);
    return undefined;
  }
};

/**
 * Sends a transaction request with reciepient, amount and denom.
 */
async function sendRequest(payload : any, method : string) {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: method,
        params: [payload]
      },
    ],
  });
}

async function sendNotification(methodName : string, response : any) {
  let content : any = {}
  switch(methodName) {
    case 'login': 
    {
      if(!response.loginSuccessful) {
        content = {
          prompt: "Login Unsuccessful",
          description : "Response For The Login Attempt",
          textAreaContent : response.msg
          };
      }
      else {
        content = {
          prompt: "Login Successful!",
          description : "Response For The Login Attempt",
          textAreaContent : response.msg
          };
      }
      break;
    }
    case 'setupPassword': {
      if(response.setup) {
        content = {
          prompt: "Setting Up Password",
          description : "Response From Setup : " + response.msg,
          textAreaContent : "Password and Mnemonic Stored."
          };
      }
      else {
        content = {
          prompt: "Setup Failed",
          description : "",
          textAreaContent : response.msg
          };
      }
      break;
    }
    case 'getSnapState': {
      let display = ""
      for (const property in response) {
        if (Object.prototype.hasOwnProperty.call(response, property)) {
          display += `${property}: ${response[property]}`
          display += '\n\n'
        }
      }
      content = {
        prompt: "Configuration Data",
        description : "",
        textAreaContent : display
        };
      break;
    }
    case 'setConfig': {
      let display = ""
      for (const property in response) {
        if (Object.prototype.hasOwnProperty.call(response, property)) {
          display += `${property}: ${response[property]}`
          display += '\n\n'
        }
      }
      content = {
        prompt: "Updated Configuration Data",
        description : "",
        textAreaContent : display
        };
      break;
    }
    case 'getAccountInfo': {
        if(response.accountRetrieved) {
          content = {
            prompt: "Account Information",
            description : "Account Information for : " + response.Account,
            textAreaContent : "Amount of " + response.denom + ": " + response.amount
            };
        }
        else {
          content = {
            prompt: "Account Retrieval failed",
            description : "",
            textAreaContent : response.msg
            };
        }
        break;
    }
    case 'getAccountGeneral': {
      if(response.accountRetrieved) {
        content = {
          prompt: "Account Information",
          description : "Account Information for : " + response.Account,
          textAreaContent : "Amount of " + response.denom + ": " + response.amount
          };
      }
      else {
        content = {
          prompt: "Account Retrieval failed",
          description : "",
          textAreaContent : response.msg
          };
      }
      break;
    }
    case 'createSend': {
      if(response.transactionSent) {
        response['rawLog'] = "[REMOVED FOR LENGTH]"
        content = {
          prompt: "Transaction Sent",
          description : "",
          textAreaContent : response.msg
          };
      }
      else {
        content = {
          prompt: "Transaction Not Sent",
          description : "",
          textAreaContent : response.msg
          };
      }
      break;
    }
    case 'createMultiSend' : {
        if(response.transactionSent) {
          content = {
            prompt: "Transaction Sent",
            description : "",
            textAreaContent : response.msg
            };
            break;
        }
        else {
          content = {
            prompt: "Transaction Failed",
            description : "",
            textAreaContent : response.msg
            };
            break;
        }
    }
    case 'error': {
      content = {
        prompt: "Error Encountered During Request",
        description : "Here is the error recieved:",
        textAreaContent : JSON.stringify(response)
        };
        break;
    }
    
    case 'removeAccount' : {
      if(response.accountRemoved) {
        content = {
          prompt: "Keys Removed.",
          description : "",
          textAreaContent : response.msg
          };
          break;
      }
      else {
        content = {
          prompt: "Keys Not Removed.",
          description : "",
          textAreaContent : response.msg
          };
          break;
      }
    }
    case 'logout' : {
      content = {
        prompt: "Logout Successful.",
        description : "",
        textAreaContent : ""
        };
        break;
    }
    case 'addAddress': {
      if(response.added) {
        content = {
          prompt: "Address Added",
          description : "",
          textAreaContent : response.msg
          };
          break;
      }
      else {
        content = {
          prompt: "Address Not Added",
          description : "",
          textAreaContent : response.msg
          };
          break;
      }
    }

    case 'viewAddresses': {
      const dictionary : Array<any> = response.dictionary;
      let msg = "";
      for(let i = 0; i < dictionary.length; i ++) {
        msg += dictionary[i].name + "-" + dictionary[i].address + "\n\n";
      }
      content = {
        prompt: "Addresses",
        description : "",
        textAreaContent : msg
        };
        break;
    }

    case 'deleteWallet' : {
      if(response.deleted) {
        content = {
          prompt: "Wallet Deleted",
          description : "",
          textAreaContent : ""
          };
          break;
      }
      else {
        content = {
          prompt: "Wallet Not Deleted.",
          description : "",
          textAreaContent : response.msg
          };
          break;
      }
    }

    case 'getTransactionHistory': {
      const transactionHistory  : Array<any> = response.transactionHistory; // Array is of type Transaction
      let output = '';
    
      transactionHistory.forEach(transaction => {
        const formattedDate = transaction.timeSent.toLocaleString(); // Format the date
    
        output += `${transaction.type} Transaction\n`;
        output += `${transaction.amount} ${transaction.denom} sent to ${transaction.address} at \n${formattedDate}\n With memo: ${transaction.memo}`;
        output += '\n\n';
      });
    
      content = {
        prompt: "Transaction History Retrieved",
        description : "",
        textAreaContent : output
        };
        break;
    }

    case 'addNewAccount' : {
      if(response.accountAdded) {
        content = {
          prompt: "Account Added",
          description : "",
          textAreaContent : ""
          };
          break;
      }
      else {
        content = {
          prompt: "Account not added.",
          description : "",
          textAreaContent : response.msg
          };
          break;
      }
    }

    case 'viewAccounts' : {
      let msg = "Active Account: \n\t" +  response.accounts[0].accountName +  "\n\nOther Acccounts: " + "\n\t";
      for (let i =1; i < response.accounts.length; i ++) {
        let account : any = response.accounts[i];
        msg +=  account.accountName + '\n\t';
      }
      content = {
        prompt: "Available Accounts",
        description : "",
        textAreaContent : msg
        };
      break;
    }
    
    default: {
      content = {
      prompt: "Response From "  + methodName,
      description : " ",
      textAreaContent : response.msg
      };
    }
  }
  await sendRequest(content, 'displayNotification');
}

/**
 * This is a common method to send snap JSON RPC requests.
 * Later there will be a different method for each request.
 */

 export const sendSnapRPC = async (methodName:string, payload:any) => {
  console.log('[',methodName,'] >>> SENDING >>>', payload);
  let response : any = {}
  try {
    response = await sendRequest(payload, methodName);
    console.log('[',methodName,'] <<< RECEIVING <<<', response);
    await sendNotification(methodName, response);
  }
  catch(e) {
    console.log("RUNTIME ERROR: " , e);
    response = e;
    await sendNotification('error', response);
  }

  // For functions that need it
  return response;
};

export const isLocalSnap = (snapId: string) => snapId.startsWith('local:');
