// src/hooks/useAuth.ts
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ফায়ারবেস থেকে ইউজারের রিয়েল-টাইম লগইন স্ট্যাটাস শুনবে
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // গুগল সাইন-ইন লজিক
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // ইউজার প্রথমবারের মতো আসলে ফায়ারস্টোরে তার ডেটা সেভ করব
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          studyLevel: "hsc", // ডিফল্ট স্টাডি লেভেল
          createdAt: new Date().toISOString(),
        });
      }
      return user;
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      throw error;
    }
  };

  // লগআউট লজিক
  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return {
    user,
    loading,
    signInWithGoogle,
    logOut,
  };
}