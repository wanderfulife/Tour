import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCsxGumK5lTVMLQ7CgmNby3-xfD3BZrgLI",
  authDomain: "navetetours.firebaseapp.com",
  projectId: "navetetours",
  storageBucket: "navetetours.appspot.com",
  messagingSenderId: "14782940663",
  appId: "1:14782940663:web:841efc7beb1e03271b5af2",
  measurementId: "G-SRCH097SE8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
