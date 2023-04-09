import { defaultSnapOrigin } from '../config';
import { GetSnapsResponse, Snap } from '../types';

import {
  getAuth,
  GoogleAuthProvider,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  signInWithPopup,
  RecaptchaVerifier,
  getMultiFactorResolver,
  MultiFactorError
} from "@firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore} from "firebase/firestore";

// Initalize the firebase configurations for user authentication.
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC-zSupcef4CUhkTAzFdKJZCsg9tOYyTQo",
  authDomain: "senior-design-project-metamask.firebaseapp.com",
  projectId: "senior-design-project-metamask",
  storageBucket: "senior-design-project-metamask.appspot.com",
  messagingSenderId: "370823076952",
  appId: "1:370823076952:web:71a7baf249e1c7a840be2d",
  measurementId: "G-21GKM1HQST"
};
// Initialization necesary for firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

const authenticationMethods : Set<string> = new Set<string>(['setupPassword', 'restoreWallet','login', 'addNewAccount', 'deleteWallet', 'removeAccount', 'enrollUserPhoneNumber']);

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
          description : "Response From Setup : " + response.msg ,
          textAreaContent : "Password and Mnemonic Stored.",
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
    case 'enrollUserPhoneNumber' : {
      if(response.enrolled) {
        content = {
          prompt: "Phone Number Auth Enrolled",
          description : "",
          textAreaContent : response.msg
          };
        break;
      }
      else {
        content = {
          prompt: "Phone Number Not Enrolled",
          description : "",
          textAreaContent : response.msg
          };
        break;
      }
    }
    case 'restoreWallet' : {
      if(response.setup) {
        content = {
          prompt: "Password Reset.",
          description : "",
          textAreaContent : response.msg
          };
        break;
      }
      else {
        content = {
          prompt: "Password Not Reset.",
          description : "",
          textAreaContent : response.msg
          };
        break;
      }
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
 * Attempts to create a new firebase user.
 */
async function createNewFirebaseUser(password : string) {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    // Store the user_id in the state variable
    return user.uid
}

/**
 * Execute google login.
 */async function googleLogin() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider)
    const user = result.user;
    // Get permission for the user state_id
    if(!(await checkUID(user.uid))) {
      throw new Error("Email not associated with wallet.")
    }
    return user.uid
}


/**
 * Enrolls the user's phone number as a second factor for authentication.
 */
 async function enrollSecondFactorFirebaseUser( phoneNumber : string, recaptchaVerifier : RecaptchaVerifier) {
    // Enroll the user for SMS MFA
    const user = auth.currentUser;
    if (user == null) {
      throw new Error("Null User in Auth");
    }
    const multiFactorSession = await multiFactor(user).getSession()

    // Specify the phone number and pass the MFA session.
    const phoneInfoOptions = {
      phoneNumber: phoneNumber,
      session: multiFactorSession
    };

    const phoneAuthProvider = new PhoneAuthProvider(auth);

    // Send SMS verification code.
    const verificationId =  await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
     // Ask user for the verification code. Then:
     const verificationCode = window.prompt("Enter the verification code: ");
     if(verificationCode == null) {
       throw new Error("Verification Code is NULL");
     }
     const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
     const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
     
      // Complete enrollment.
      await multiFactor(user).enroll(multiFactorAssertion, user.email);
}

/**
 * Sends an SMS code to verified users.
 */
async function sendSMSCode(recaptchaVerifier : RecaptchaVerifier, error : MultiFactorError) {
    const resolver = getMultiFactorResolver(auth, error);

    const phoneInfoOptions = { 
      multiFactorHint: resolver.hints[0],
      session: resolver.session
    };

    const phoneAuthProvider = new PhoneAuthProvider(auth);

    // Send SMS verification code.
    const verificationId =  await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);

    // Ask user for the verification code. Then:
    const verificationCode = window.prompt("Enter the verification code: ");
    if(verificationCode == null) {
      throw new Error("Verification Code is NULL");
    }
    const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

    await resolver.resolveSignIn(multiFactorAssertion)
}

/**
 * Delete the user in firebase. 
 */
async function deleteFirebaseUser() {
  let user = await auth.currentUser  
  user?.delete()
  .then(() => {
    // User deleted successfully
  })
  .catch((error : any) => {
    console.error(error);
  });
}

/**
 * Checks if the user has mfaEnabled.
 */
async function isMFAUser() {
  const response : any = await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'isMFAEnabled',
        params: []
      },
    ],
  });
  return response.mfaEnabled;
}

/**
 * Set mfaEnabled in the backend.
 */
async function setMFAEnabled() {
  const response : any = await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'setMFAEnabled',
        params: []
      },
    ],
  });
  return response.mfaEnabled;
}

/**
 * Checks if the current UID produced by the sign-in is correct.
 */
async function checkUID(uid : string) {
  const result : any = await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'validateUID',
        params: [{uid}]
      },
    ],
  });
  
  return result.isValid;
}

/**
 * Handles the authentication methods in firebase.
 */
async function handleAuthentication(methodName:string, payload:any, recaptchaVerifier : RecaptchaVerifier) {
  // Handle the authentication method
  switch(methodName) {
    case 'setupPassword' : {
      // Enroll a new user using google sign-in
      try {
        const resultID = await createNewFirebaseUser(payload.password)
        return {proceed : true, uid : resultID}
      }
      catch(error) {
        return {proceed : false, response : {msg : "Firebase User not created, wallet not setup.\n" + error.toString(), setup : false}}
      }
    }
    case 'login' : {
      try {
        // Execute google login
        const uid = await googleLogin();
        return {proceed : true, uid : uid}
      }
      catch(error) {
        if(error.code == 'auth/multi-factor-auth-required') {
          try {
            await sendSMSCode(recaptchaVerifier, error);
            return {proceed : true}
          }
          catch(secondError){
            return {proceed : false, response : {msg : "Firebase Login Failed with: " + secondError.toString(), loginSuccessful : false}}
          }
        }
        return {proceed : false, response : {msg : "Firebase Login Failed with: " + error.toString(), loginSuccessful : false}}
      }
    } 
    case 'addNewAccount' : {
      return {proceed : true}
    }
    case 'deleteWallet' : {
      try {
        await googleLogin()
        return {proceed : true}
      }
      catch(error) {
        if(error.code == 'auth/multi-factor-auth-required') {
          try {
            await sendSMSCode(recaptchaVerifier, error);
            return {proceed : true}
          }
          catch(secondError){
            return {proceed : false, response : {msg : "Firebase Login Failed with: " + secondError.toString(), loginSuccessful : false}}
          }
        }
        return {proceed : false, response : {msg : "Wallet removal failure: " + error.toString(), deleted : false}}
      }
    }
    case 'removeAccount' : {
      try{
        await googleLogin()
        return {proceed : true}
      }
      catch(error) {
        if(error.code == 'auth/multi-factor-auth-required') {
          try {
            await sendSMSCode(recaptchaVerifier, error);
            return {proceed : true}
          }
          catch(secondError){
            return {proceed : false, response : {msg : "Firebase Login Failed with: " + secondError.toString(), loginSuccessful : false}}
          }
        }
        return {proceed : false, response : {msg : "Account removal failure: " + error.toString(), accountRemoved : false}}
      }
    }
    case 'enrollUserPhoneNumber' : {
      try {
        await enrollSecondFactorFirebaseUser(payload.phoneNumber, recaptchaVerifier);
        return {proceed : false, response : {msg : "Enrollment Succeeded", enrolled : true}}
      }
      catch(error) {
        return {proceed : false, response : {msg : "Enrollment failure: " + error.toString(), enrolled : false}}
      }

    }
    case 'restoreWallet' : {
      try {
        const uid = await googleLogin()
        return {proceed : true, uid : uid}
      }
      catch(error) {
        if(error.code == 'auth/multi-factor-auth-required') {
          try {
            await sendSMSCode(recaptchaVerifier, error);
            return {proceed : true}
          }
          catch(secondError){
            return {proceed : false, response : {msg : "Firebase Login Failed with: " + secondError.toString(), setup : false}}
          }
        }
        return {proceed : false, response : {msg : "Wallet restoration failed. " + error.toString(), setup : false}}
      }
    }
  }
}

/**
 * Handles snapRPC requests to and from the backend, and also authentication flow.
 */
 export const sendSnapRPC = async (methodName:string, payload:any, recaptchaVerifier : RecaptchaVerifier) => {
  if(authenticationMethods.has(methodName)) {
    console.log('[',methodName,'] >>> SENDING >>>', "[hidden]");
    const result : any = await handleAuthentication(methodName, payload, recaptchaVerifier);
    // If firebase authentication failed, do not bother with the backend
    if(!result.proceed) {
      await sendNotification(methodName, result.response)
      return result.response
    }
    else if(methodName == 'setupPassword' || methodName == 'login' || methodName == 'restoreWallet'){
      payload.uid = result.uid
    }
  }else {
    console.log('[',methodName,'] >>> SENDING >>>', payload);
  }

  let response : any = {}
  try {
    response = await sendRequest(payload, methodName);
    console.log('[',methodName,'] <<< RECEIVING <<<', response);
    // Backend check for authentication methods
    switch(methodName) {
      // DO NOT DELETE FIREBASE USER- RESETS THE UID EVERY TIME
      // case 'setupPassword' : {
      //   // Wallet not serialized, but account was created->delete the firebase account.
      //   if(!response.setup) {
      //     await deleteFirebaseUser();
      //   }
      // }
      case 'deleteWallet' : {
        if(response.deleted) {
          // Only delete the firebase account if successful
          await deleteFirebaseUser();
        } 
      }
      case 'login' : {
        // If login was successful, then we will return the uid to be stored in the state.
        if(response.loginSuccessful) {
          response.uid = payload.uid
        }
      }
    }
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
