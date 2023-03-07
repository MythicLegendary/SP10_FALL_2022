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
 * Invoke the "hello" method from the example snap.
 */
async function sendHello() {
    await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'hello'
      },
    ],
  });
};

/**
 * Invoke the "setConfig" method from the cosmos snap.
 */
async function sendSetConfig(payload : any) {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'setConfig',
        params: [{payload}]
      },
    ],
  });
};

/**
 * Invoke the "getAccounts" method from the cosmos snap.
 */
async function sendGetAccount() {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'getAccount'
      },
    ],
  });
};

/**
 * Invoke the "getAccountInfo" method from the cosmos snap.
 */
async function sendGetAccountInfo() {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'getAccountInfo'
      },
    ],
  });
};

/**
 * Invoke the "getSnapState" method from the cosmos snap.
 */
async function sendGetSnapState() {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'getSnapState'
      },
    ],
  });
}


/** 
 * Invoke the cosmjsDemo method. 
*/
async function sendGetCosmosAccountDemo() {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'getCosmosAccountDemo'
      },
    ],
  });
}

/** 
 * Invoke the sendCosmosTransactionDemo method. 
*/
async function sendCosmosTransactionDemo() {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'sendCosmosTransactionDemo'
      },
    ],
  });
}

/**
 *  Sends a mnemonic and password for either first-time setup or wallet recovery.
 */
async function sendSetupPassword(payload : any) {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'setupPassword',
        params: [payload]
      },
    ],
  });
}

/**
 * Sends the user's password to try and login.
 */
async function sendLogin(payload : any) {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'login',
        params: [payload]
      },
    ],
  });
}

/**
 * This is a common method to send snap JSON RPC requests.
 * Later there will be a different method for each request.
 */

 export const sendSnapRPC = async (methodName:string, payload:any) => {
  console.log('[',methodName,'] >>> SENDING >>>', payload);
  let response : any = {}
  try {
    switch(methodName) {
      case 'hello': {
        await sendHello();
        break;
      }
      case 'setupPassword': {
        response = await sendSetupPassword(payload);
        break;
      }
      case 'login': {
        response = await sendLogin(payload);
        break;
      }
      case 'setConfig': {
        response = await sendSetConfig(payload);
        break;
      }
      case 'getSnapState': {
        response = await sendGetSnapState();
        break;
      }
      case 'getAccountInfo': {
        response = await sendGetAccountInfo();
        break;
      } 
      case 'sendCosmosTransactionDemo': {
        console.log("WARNING: only functional on will's machine.");
        response = await sendCosmosTransactionDemo();
        break;
      }
      case 'getCosmosAccountDemo': {
        console.log("WARNING: only functional on will's machine.");
        response = await sendGetCosmosAccountDemo();
        break;
      }
      default : {
        await sendHello();
      }
    }
    console.log('[',methodName,'] <<< RECEIVING <<<', response);
  }
  catch(e) {
    console.log("RUNTIME ERROR: " , e);
  }

  // For functions that need it
  return response;
};

export const isLocalSnap = (snapId: string) => snapId.startsWith('local:');
