import { useState, useEffect } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import "./Auth.css";

interface AuthProps {
  onAuthChange: (user: User | null) => void;
}

const Auth = ({ onAuthChange }: AuthProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      onAuthChange(user);
    });

    return () => unsubscribe();
  }, [onAuthChange]);

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
    setLoading(true);

    try {
      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email address");
      }

      if (!validatePassword(password)) {
        throw new Error("Password must be at least 6 characters long");
      }

      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      switch (error.code) {
        case "auth/email-already-in-use":
          setError("This email is already registered. Please sign in instead.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/weak-password":
          setError("Password should be at least 6 characters long.");
          break;
        case "auth/user-not-found":
          setError("No account found with this email. Please sign up first.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password. Please try again.");
          break;
        default:
          setError(error.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Google auth error:", error);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onAuthChange(null);
    } catch (error) {
      console.error("Sign out error:", error);
      setError("Failed to sign out. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>{isSignUp ? "Sign Up" : "Sign In"}</h2>
        {currentUser && (
          <div className="signed-in-message">
            <p>You are currently signed in as:</p>
            <p className="user-email">{currentUser.email}</p>
            <button
              onClick={handleSignOut}
              className="auth-button sign-out-button"
            >
              Sign Out
            </button>
          </div>
        )}
        {!currentUser && (
          <>
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </button>
            <button
              type="button"
              className="toggle-auth"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="google-auth-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                className="google-icon"
              />
              Continue with Google
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default Auth;
