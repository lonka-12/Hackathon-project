import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

interface AuthProps {
  onAuthChange: (user: User | null) => void;
}

const Auth = ({ onAuthChange }: AuthProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate inputs
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("This email is already registered. Please sign in instead.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/operation-not-allowed":
          setError(
            "Email/password accounts are not enabled. Please contact support."
          );
          break;
        case "auth/weak-password":
          setError("Please choose a stronger password.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled. Please contact support.");
          break;
        case "auth/user-not-found":
          setError("No account found with this email. Please sign up first.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password. Please try again.");
          break;
        default:
          setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google auth error:", err);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError("");
    setIsLoading(true);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Sign out error:", err);
      setError("Failed to sign out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {!auth.currentUser ? (
        <form onSubmit={handleSubmit} className="auth-form">
          <h2>{isSignUp ? "Sign Up" : "Sign In"}</h2>
          {error && <p className="error-message">{error}</p>}
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="google-auth-button"
            disabled={isLoading}
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="google-icon"
            />
            Continue with Google
          </button>
          <button
            type="button"
            className="toggle-auth"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={isLoading}
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </button>
        </form>
      ) : (
        <div className="user-info">
          <p>Welcome, {auth.currentUser.email}</p>
          <button
            onClick={handleSignOut}
            className="sign-out-button"
            disabled={isLoading}
          >
            {isLoading ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Auth;
