import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Auth,
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Setting up auth state listener');
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      console.log('Attempting to sign in with Google...');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      console.log('Sign in successful:', result.user.displayName);
    } catch (error: any) {
      console.error('Detailed sign-in error:', {
        code: error.code,
        message: error.message,
        email: error.email,
        credential: error.credential
      });
      
      if (error.code === 'auth/popup-blocked') {
        alert('Please enable popups for this website to sign in with Google');
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log('Sign-in popup was closed by the user');
      } else {
        alert('Error signing in: ' + error.message);
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Attempting to sign out...');
      await firebaseSignOut(auth);
      console.log('Sign out successful');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 