// src/pages/Login.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import { ChevronLeft } from "lucide-react";

function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [phase, setPhase] = useState("form"); // "form" | "verify"
  const [username, setUsername] = useState("");
  const [contact, setContact] = useState(""); // email OR username depending on mode
  const [password, setPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingMode, setPendingMode] = useState("signup"); // which flow VerifyCodeView is for
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 3D tilt setup
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    x.set((clientX - left) / width - 0.5);
    y.set((clientY - top) / height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-7, 7]);

  // Later you can replace with real profiles lookup
  async function resolveEmailFromInput(input) {
    const trimmed = input.trim();
    if (trimmed.includes("@")) return trimmed;

    // username -> email lookup can go here
    throw new Error("Type the email you used to sign up.");
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const u = username.trim();
    const c = contact.trim();
    const p = password.trim();

    if (!u && mode === "signup") {
      setError("Choose a name for yourself.");
      return;
    }

    if (!c) {
      setError(
        mode === "signup"
          ? "Enter an email address for confirmation."
          : "Enter your email or username."
      );
      return;
    }

    if (!p || p.length < 4) {
      setError("Pick a password with at least 4 characters.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!c.includes("@")) {
          setError("Enter a valid email address for confirmation.");
          setLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: c,
          password: p,
          options: {
            data: {
              username: u,
              display_name: u,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setPendingEmail(c);
        setPendingMode("signup");
        setPhase("verify");
      } else {
        let emailForOtp;
        try {
          emailForOtp = await resolveEmailFromInput(c);
        } catch (resolveError) {
          setError(resolveError.message);
          setLoading(false);
          return;
        }

        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: emailForOtp,
            password: p,
          });

        if (signInError) {
          setError("Email/username or password is incorrect.");
          return;
        }

        await supabase.auth.signOut();

        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: emailForOtp,
        });

        if (otpError) {
          setError(otpError.message);
          return;
        }

        setPendingEmail(emailForOtp);
        setPendingMode("login");
        setPhase("verify");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "signup" ? "Create your shared key" : "Welcome back to Only Us";

  const subtitle =
    mode === "signup"
      ? "Set a name and contact so this space always knows it’s you. You both can use your own accounts and meet here."
      : "Enter your email or username and password to unlock your private chat and games again.";

  return (
    <div
      className="auth-root"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="auth-shell">
        {/* LEFT: animated auth card */}
        <motion.div
          className="auth-card"
          style={{ rotateX, rotateY }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          <div className="auth-card-inner">
            <AnimatePresence mode="wait">
              {phase === "form" ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="auth-pill-row">
                    <div className="auth-logo">
                      <img src="/onlyus-logo.svg" alt="Only Us logo" />
                    </div>
                    <div className="auth-pill">
                      <span className="auth-pill-dot" />
                      <span>{mode === "signup" ? "New here" : "Back again"}</span>
                    </div>
                  </div>

                  <h1 className="auth-title">{title}</h1>
                  <p className="auth-subtitle">{subtitle}</p>

                  <div className="auth-tabs">
                    <button
                      type="button"
                      className={
                        "auth-tab-button " + (mode === "signup" ? "active" : "")
                      }
                      onClick={() => {
                        setMode("signup");
                        setPhase("form");
                        setError("");
                      }}
                    >
                      I’m new
                    </button>
                    <button
                      type="button"
                      className={
                        "auth-tab-button " + (mode === "login" ? "active" : "")
                      }
                      onClick={() => {
                        setMode("login");
                        setPhase("form");
                        setError("");
                      }}
                    >
                      I’ve been here
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="login-form">
                    {mode === "signup" && (
                      <label className="login-label">
                        Username
                        <input
                          className="login-input"
                          type="text"
                          placeholder="The name you want to be seen as"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </label>
                    )}

                    <label className="login-label">
                      {mode === "signup" ? "Email" : "Email or username"}
                      <input
                        className="login-input"
                        type="text"
                        placeholder={
                          mode === "signup"
                            ? "The email we’ll send your code to"
                            : "The email or username you used before"
                        }
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                      />
                    </label>

                    <label className="login-label">
                      Password
                      <input
                        className="login-input"
                        type="password"
                        placeholder={
                          mode === "signup"
                            ? "Create a small secret"
                            : "Your secret to this space"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </label>

                    {error && <div className="login-error">{error}</div>}

                    <button
                      type="submit"
                      className="login-primary"
                      disabled={loading}
                    >
                      {loading
                        ? "Please wait…"
                        : mode === "signup"
                        ? "Create my space"
                        : "Enter our space"}
                      <span className="arrow">↳</span>
                    </button>
                  </form>

                  <div className="auth-footnote">
                    Only you and the person you share this with can get in. No
                    public profiles, no feed, just this shared room.
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <button
                    type="button"
                    className="login-secondary-link"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 8,
                    }}
                    onClick={() => {
                      setPhase("form");
                      setError("");
                    }}
                  >
                    <ChevronLeft size={16} />
                    Back
                  </button>

                  <VerifyCodeView
                    flowMode={pendingMode}
                    email={pendingEmail}
                    username={username}
                    onSuccess={onLoginSuccess}
                    onBack={() => {
                      setPhase("form");
                      setError("");
                    }}
                    setError={setError}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* RIGHT: chat bubble visual + mobile CTA (styled in App.css) */}
        <div className="auth-visual">
          <div className="landing-visual">
            <div className="landing-visual-inner">
              <div className="landing-orbit">
                <div className="message-stack">
                  <div className="message-chip game game-top">
                    <div className="message-avatar" />
                    <span>
                      “It’s still wild how happy your messages make me.”
                    </span>
                  </div>
                  <div className="message-chip game game-middle">
                    <span className="message-typing">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </span>
                    <span>Your names and secrets stay in here.</span>
                  </div>
                  <div className="message-chip game game-bottom">
                    <span>
                      Once you’re in, it’s just the two of you, talking and
                      playing.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-mobile-cta">
            <button
              className="mobile-enter-button"
              onClick={() => {
                const form = document.querySelector(".login-form");
                if (form) form.requestSubmit();
              }}
              disabled={loading}
            >
              {phase === "verify"
                ? "Confirm and continue"
                : loading
                ? "Please wait…"
                : mode === "signup"
                ? "Create my space"
                : "Enter our space"}
              <span className="arrow">↳</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyCodeView({
  flowMode, // "signup" | "login"
  email,
  username,
  onSuccess,
  onBack,
  setError,
}) {
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [step, setStep] = useState("otp"); // "otp" | "profile"
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();

    if (!trimmed) {
      setError("Enter the 6‑digit code we sent to your email.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        type: "email",
        email,
        token: trimmed,
      }); // [web:89]

      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }

      if (flowMode === "signup") {
        await supabase.auth.updateUser({
          data: {
            display_name: username,
            username,
          },
        });
        setSubmitting(false);
        setStep("profile");
      } else {
        setSubmitting(false);
        onSuccess(username || email);
      }
    } catch (err) {
      setError("Could not verify code. Please try again.");
      setSubmitting(false);
    }
  };

  const handleFinishProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // later: save fullName + bio to a profiles table
      onSuccess(username || fullName || email);
    } catch (err) {
      setError("Could not save your profile. Please try again.");
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResending(true);
    try {
      if (flowMode === "login") {
        const { error } = await supabase.auth.signInWithOtp({ email }); // [web:91][web:97]
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email });
        if (
          error &&
          !error.message.toLowerCase().includes("already registered")
        ) {
          setError(error.message);
        }
      }
    } catch (err) {
      setError("Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (step === "profile" && flowMode === "signup") {
    return (
      <>
        <div className="auth-pill-row">
          <div className="auth-logo">
            <img src="/onlyus-logo.svg" alt="Only Us logo" />
          </div>
          <div className="auth-pill">
            <span className="auth-pill-dot" />
            <span>Set up your profile</span>
          </div>
        </div>

        <h1 className="auth-title">
          Almost done, {username || "lovebird"}
        </h1>
        <p className="auth-subtitle">
          Your username is <strong>@{username}</strong>. You can change your
          display name and add a tiny bio. Share this username with a friend,
          crush, partner or lover so they can link with you later.
        </p>

        <form onSubmit={handleFinishProfile} className="login-form">
          <label className="login-label">
            Full name
            <input
              className="login-input"
              type="text"
              placeholder="What should they call you?"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <label className="login-label">
            Bio
            <textarea
              className="login-input"
              rows={3}
              placeholder="Write a tiny sentence about you or both of you."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>

          <button
            type="submit"
            className="login-primary"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Finish and enter"}
            <span className="arrow">↳</span>
          </button>
        </form>

        <button
          type="button"
          className="login-secondary-link"
          onClick={onBack}
        >
          Start over
        </button>
      </>
    );
  }

  // OTP step
  return (
    <>
      <div className="auth-pill-row">
        <div className="auth-logo">
          <img src="/onlyus-logo.svg" alt="Only Us logo" />
        </div>
        <div className="auth-pill">
          <span className="auth-pill-dot" />
          <span>Confirm your code</span>
        </div>
      </div>

      <h1 className="auth-title">Check your inbox</h1>
      <p className="auth-subtitle">
        A 6‑digit code was sent to <strong>{email}</strong>. Paste it here to
        {flowMode === "signup"
          ? " finish creating your shared space."
          : " log back into your shared space."}
      </p>

      <form onSubmit={handleVerifyOtp} className="login-form">
        <label className="login-label">
          Confirmation code
          <input
            className="login-input"
            type="text"
            inputMode="numeric"
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>

        <button
          type="submit"
          className="login-primary"
          disabled={submitting}
        >
          {submitting ? "Verifying…" : "Confirm and continue"}
          <span className="arrow">↳</span>
        </button>
      </form>

      <button
        type="button"
        className="login-secondary-link"
        onClick={handleResend}
        disabled={resending}
      >
        {resending ? "Sending a new code…" : "Didn’t get a code? Resend"}
      </button>

      <button
        type="button"
        className="login-secondary-link"
        onClick={onBack}
      >
        Go back and edit details
      </button>
    </>
  );
}

export default Login;
