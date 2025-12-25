// Firebase Configuration for SimamiaKanisa
// Your actual Firebase project configuration

const firebaseConfig = {
  apiKey: "AIzaSyD9_1_qsyvXCEFHwlP3QTsBTSD8tdWiGOY",
  authDomain: "simamiakanisa.firebaseapp.com",
  projectId: "simamiakanisa",
  storageBucket: "simamiakanisa.firebasestorage.app",
  messagingSenderId: "108213015252",
  appId: "1:108213015252:web:1f8fb3771ca8fcc1102141",
  measurementId: "G-8PYNMZNY40"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Auth - THIS IS CRITICAL!
const auth = firebase.auth();
// Initialize Firestore
const db = firebase.firestore();

// Collection references for SimamiaKanisa
const membersCollection = db.collection('members');
const contributionsCollection = db.collection('contributions');
const eventsCollection = db.collection('events');

console.log('🔥 Firebase initialized successfully for SimamiaKanisa!');