import {FirebaseApp, getApp, getApps, initializeApp} from "@firebase/app";

const firebaseConfig = {
    apiKey: "AIzaSyAOHIkbcMpQf9EKn141sJXLrLk5UYN7lG4",
    authDomain: "auth-cosmos.firebaseapp.com",
    projectId: "auth-cosmos",
    storageBucket: "auth-cosmos.appspot.com",
    messagingSenderId: "617204160956",
    appId: "1:617204160956:web:fbf7c64efc4d0ac053b3b9"
};

let app: FirebaseApp;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
}else {
    app = getApp();
}

export { app }