import { OnRpcRequestHandler, OnCronjobHandler, OnTransactionHandler} from 'C:/Users/David Shilliday/Desktop/Snap github/Clean Snap/node_modules/@metamask/snap-types';
import detectEthereumProvider from '@metamask/detect-provider';
import { hasProperty, isObject, Json } from '@metamask/utils';
import { ethers } from "ethers";
import  web3  from "web3";
/**
 * Get a message from the origin. For demonstration purposes only.
 *
 * @param originString - The origin string.
 * @returns A message based on the origin.
 */
const getMessage = (originString: string): string =>
  `Hello, ${originString}!`;

class CheckTransaction
{
  static wasATransactionMade: boolean = false;

}

async function isUnlocked() {
  return true;
}

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


export const onRpcRequest: OnRpcRequestHandler = ({ origin, request }) => {
  switch (request.method) {
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

export const onTransaction: OnTransactionHandler = async ({ transaction }) => {
  CheckTransaction.wasATransactionMade = true;
	const insights: {type: string, params?: Json} = { type: 'Unknown Transaction' }
	if(!isObject(transaction) || !hasProperty(transaction, 'data') || typeof transaction.data !== 'string')
		{
			console.warn('Unknown transaction type.');
		}

return { insights: {dummy: "dummy"}};


};

export const onCronjob: OnCronjobHandler = async({ request }) => {
	console.log("The event did get called!");
	switch (request.method) {
		case 'checkUnlocked':
		if(!CheckTransaction.wasATransactionMade && await isUnlocked())
    {
			return wallet.request({
				method: 'snap_confirm',
				params: [
					{
						prompt: "Unlocked wallet Detected!",
						description: "It looks like you've left your wallet open. Make sure to lock it when not in use!",
					}

				]
			});
    }
    else if(CheckTransaction.wasATransactionMade && await isUnlocked())
    {
      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: "Unlocked wallet Detected!",
            description: "Make sure to close your wallet after transactions!",
          }

        ]
      });
    }
    else
    {
      CheckTransaction.wasATransactionMade = false;
    }
			
		break;
			default:
				throw new Error('Chronological method not found.');

	}
};
