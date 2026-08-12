import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously as authSignInAnonymously,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebaseConfig";

export type UserRole = "admin" | "scorer" | "umpire" | "spectator";

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, role: UserRole) => Promise<void>;
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  setCustomRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("spectator");
  const [loading, setLoading] = useState(true);

  // Sync user state and load role from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            setRole(data.role || "spectator");
          } else {
            // New user, default to spectator (or scorer if anonymous creator)
            const defaultRole = currentUser.isAnonymous ? "scorer" : "spectator";
            await setDoc(userDocRef, {
              email: currentUser.email || "",
              role: defaultRole,
              createdAt: Date.now()
            });
            setRole(defaultRole);
          }
        } catch (err) {
          console.warn("Firestore role fetch failed, fallback to local/default:", err);
          // Fallback if offline or rules block
          setRole(currentUser.isAnonymous ? "scorer" : "spectator");
        }
      } else {
        setRole("spectator");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, userRole: UserRole) => {
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    if (credential.user) {
      await setDoc(doc(db, "users", credential.user.uid), {
        email,
        role: userRole,
        createdAt: Date.now()
      });
      setRole(userRole);
    }
  };

  const loginAnonymously = async () => {
    await authSignInAnonymously(auth);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const setCustomRole = async (newRole: UserRole) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { role: newRole }, { merge: true });
      setRole(newRole);
    } catch (err) {
      console.error("Failed to update user role:", err);
      // Fallback
      setRole(newRole);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        loginAnonymously,
        logout,
        setCustomRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
