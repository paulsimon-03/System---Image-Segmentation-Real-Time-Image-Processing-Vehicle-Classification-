//connect to firebase realtime database

// import the functions from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js";

//for firestore database
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAn4TVJVo11J9kYx70F1RVfcSMvMdydl3g",
  authDomain: "bsu-rtivcs.firebaseapp.com",
  databaseURL:
    "https://bsu-rtivcs-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bsu-rtivcs",
  storageBucket: "bsu-rtivcs.appspot.com",
  messagingSenderId: "44736503835",
  appId: "1:44736503835:web:1a76895b7367b0cfa098be",
  measurementId: "G-P9NCCCSE1M",
};

const app = initializeApp(firebaseConfig);

//reference to the realtime db
const database = getDatabase(app);

//reference to the firestore db
const db = getFirestore(app);

//realtime db
export { getDatabase, database, ref, onValue };

//firestore db
export {
  initializeApp,
  getFirestore,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  db,
  app,
};
