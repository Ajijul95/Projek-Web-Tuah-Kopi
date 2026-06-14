// assets/js/firebase-config.js
// Config Firebase milik project: kedai-kopi-f2f88

const firebaseConfig = {
  apiKey: "AIzaSyBVaX_EkyOiHH0pYuodhDZgjgcI3OIPGJc",
  authDomain: "kedai-kopi-f2f88.firebaseapp.com",
  projectId: "kedai-kopi-f2f88",
  storageBucket: "kedai-kopi-f2f88.firebasestorage.app",
  messagingSenderId: "240380838223",
  appId: "1:240380838223:web:7c7e8fe975aa0bdedf853a",
  measurementId: "G-LC721ZD5SY",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = typeof firebase.storage === "function" ? firebase.storage() : null;

console.log("Firebase aktif:", firebaseConfig.projectId);
