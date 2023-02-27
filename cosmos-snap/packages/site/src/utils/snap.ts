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
async function sendSetConfig() {
  let data : any = {}
  data['nodeUrl'] = "https://random.getblock.io";
  data['denom'] = "urand";
  data['prefix'] = "cosmos";
  data['memo'] = "SP-10-2023";
  data['gas'] = 0;
  const response : unknown = await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'setConfig',
        params: [data]
      },
    ],
  });
};

/**
 * Invoke the "getAccounts" method from the cosmos snap.
 */
async function sendGetAccount() {

  await window.ethereum.request({
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

  await window.ethereum.request({
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
 * This is a common method to send snap JSON RPC requests.
 * Later there will be a different method for each request.
 */

 export const sendSnapRPC = async (methodName:string, payload:any) => {
  console.log('[',methodName,'] >>> SENDING >>>', payload);
  let response : any = {}
  try {
    switch(methodName) {
      default : {
        response = await sendHello();
      }
    }
    console.log('[',methodName,'] <<< RECEIVING <<<', response);
  }
  catch(e) {
    console.log("RUNTIME ERROR: " + e);
  }
};

export const isLocalSnap = (snapId: string) => snapId.startsWith('local:');
