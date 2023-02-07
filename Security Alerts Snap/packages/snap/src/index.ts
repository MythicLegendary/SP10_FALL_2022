import { OnRpcRequestHandler, OnCronjobHandler, OnTransactionHandler} from '@metamask/snap-types';
import detectEthereumProvider from '@metamask/detect-provider';
import { hasProperty, isObject, Json } from '@metamask/utils';
import { ethers } from "ethers";
import  web3  from "web3";

declare var recentTransaction: boolean

/**
 * Get a message from the origin. For demonstration purposes only.
 *
 * @param originString - The origin string.
 * @returns A message based on the origin.
 */
export const getMessage = (originString: string): string =>
  `Hello, ${originString}!`;

async function getFees() {
	const response = await fetch('https://www.etherchain.org/api/gasPriceOracle');
	return response.text();
}



async function isUnlocked() {
    
	console.log(window.ethereum);
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

//async?
export const onRpcRequest: OnRpcRequestHandler = ({ origin, request }) => {
  switch (request.method) {
    case 'hello':
      
		  return wallet.request({
			  method: 'snap_confirm',
			  params: [
			  {
				  prompt: getMessage(origin),
				  description: 'Example Snap Confirmation Message.',
				  
			  }
			  ]
		  });
	  
    default:
      throw new Error('Method not found.');
  }
};

export const onTransaction: OnTransactionHandler = async ({ transaction }) => {
	const insights: {type: string, params?: Json} = { type: 'Unknown Transaction' }
	recentTransaction = true;
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
			isUnlocked();
			return wallet.request({
				method: 'snap_confirm',
				params: [
					{
						prompt: "Unlocked wallet Detected!",
						description: "It looks like you've left your wallet open. Make sure to lock it when not in use!",
					}

				]
			});
		break;
		case "checkUnlockedAfterTransaction":
			isUnlocked();
			
				return wallet.request({
					method: 'snap_confirm',
					params: [
						{
							prompt: "Unlocked wallet Detected!",
							description: "Make sure to close your wallet after transactions!",
						}
	
					]
				});
			
		break;
			default:
				throw new Error('Chronological method not found.');

	}
};
