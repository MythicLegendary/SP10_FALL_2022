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
          textAreaContent : JSON.stringify(response)
          };
      }
      else {
        content = {
          prompt: "Login Successful!",
          description : "Response For The Login Attempt",
          textAreaContent : JSON.stringify(response)
          };
      }
      break;
    }
    case 'setupPassword': {
      content = {
        prompt: "Setting Up Password",
        description : "Response From Setup : " + response.msg,
        textAreaContent : "Password and Mnemonic Stored."
        };
        break;
    }
    case 'getAccountInfo': {
      content = {
        prompt: "Account Information",
        description : "Account Information for : " + response.Account,
        textAreaContent : JSON.stringify(response)
        };
        break;
    }
    case 'getAccountGeneral': {
      content = {
        prompt: "Account Information",
        description : "Account Information for : " + response.Account,
        textAreaContent : JSON.stringify(response)
        };
        break;
    }
    case 'createSend': {
      response['rawLog'] = "[REMOVED FOR LENGTH]"
      content = {
        prompt: "Transaction Sent",
        description : "Response For The Transaction",
        textAreaContent : JSON.stringify(response)
        };
        break;
    }
    case 'createMultiSend' : {
      response['rawLog'] = "[REMOVED FOR LENGTH]"
      response['events'] = "[REMOVED FOR LENGTH]"
      content = {
        prompt: "Transaction Sent",
        description : "Response For The Transaction",
        textAreaContent : JSON.stringify(response)
        };
        break;
    }
    case 'error': {
      content = {
        prompt: "Error Encountered During Request",
        description : "Here is the error recieved:",
        textAreaContent : JSON.stringify(response)
        };
        break;
    }
    default: {
      content = {
      prompt: "Response From "  + methodName,
      description : " ",
      textAreaContent : JSON.stringify(response)
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
