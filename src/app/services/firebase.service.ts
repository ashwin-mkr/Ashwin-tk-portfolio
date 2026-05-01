import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, Analytics } from 'firebase/analytics';
import {
  getFirestore,
  Firestore,
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBZglGv_fT7cGxprG4Q2MOfF9s0MEo7on4", // ← paste your real apiKey here
  authDomain: "my-prot-c9733.firebaseapp.com", // ← paste your real authDomain
  projectId: "my-prot-c9733",
  storageBucket: "my-prot-c9733.firebasestorage.app",
  messagingSenderId: "854824283110", // ← paste your real messagingSenderId
  appId: "1:854824283110:web:f7829b41824fb64a1ec427",
  measurementId: "G-SY23CN1D1D" // ← paste your real measurementId
};

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app: FirebaseApp | undefined;
  private db: Firestore | undefined;
  private analytics: Analytics | undefined;

  constructor() {
    try {
      this.app = initializeApp(firebaseConfig);
      this.db  = getFirestore(this.app);
      
      // Analytics can fail if blocked by ad-blockers or if config is invalid
      try {
        this.analytics = getAnalytics(this.app);
      } catch (e) {
        console.warn('Firebase Analytics failed to initialize:', e);
      }
    } catch (err) {
      console.error('Firebase Initialization failed:', err);
    }
  }

  /** Save a contact-form submission to the "contacts" Firestore collection */
  async submitContactForm(data: {
    name: string;
    email: string;
    message: string;
    rememberMe: boolean;
  }): Promise<void> {
    try {
       if (!this.db) throw new Error('Firestore not initialized. Check your Firebase config.');

      await addDoc(collection(this.db, 'contacts'), {
        ...data,
        submittedAt: serverTimestamp()
      });
    } catch (err: any) {
      // Re-throw with a more user-friendly message if possible
      if (err.code === 'permission-denied') {
        throw new Error('Access Denied: Please check your Firestore security rules.');
      } else if (err.message?.includes('API key not valid')) {
        throw new Error('Invalid Firebase API Key. Please check your config.');
      }
      throw err;
    }
  }
}
