import { OnRpcRequestHandler, OnCronjobHandler} from '@metamask/snap-types';
import detectEthereumProvider from '@metamask/detect-provider';

declare var window: any

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
				  description: 'Example Snap Confirmation Message.',
				  
			  }
			  ]
		  });
	  
    default:
      throw new Error('Method not found.');
  }
};

export const onCronjob: OnCronjobHandler = async({ request }) => {
	console.log("The event did get called!");
	switch (request.method) {
		case 'checkUnlocked':
			var promiseLock = window.ethereum._metamask.isUnlocked()
			if(promiseLock){
			
			return wallet.request({
				method: 'snap_notify',
				params: [
					{
						type: 'inApp',
						message: "It looks like you've left your wallet open. Make sure to lock it when not in use!",
					}

				]
			});
		}
			default:
				throw new Error('Chronological method not found.');

	}
};
