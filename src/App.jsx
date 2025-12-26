// src/App.jsx
import React, { useEffect, useState } from "react";
import "./app.css";
import { supabase } from "./lib/supabaseClient";

import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Chat from "./pages/Chat.jsx";
import Games from "./pages/Games.jsx";
import Settings from "./pages/Settings.jsx";

function App() {
  const [theme, setTheme] = useState("dark");
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState("landing"); // "landing" | "login" | "home" | "chat" | "games" | "settings"
  const [currentUser, setCurrentUser] = useState("");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("crush_app_theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    const savedUser = window.localStorage.getItem("onlyus_username");
    if (savedUser) {
      setCurrentUser(savedUser);
      setScreen("landing"); // later you can change to "home"
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("crush_app_theme", theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleEnterSpace = () => {
    setScreen("login");
  };

  // called from Login after OTP success
  const handleLoginSuccess = async (usernameFallback) => {
    const {
      data: { user },
    } = await supabase.auth.getUser(); // includes email + user_metadata [web:140]

    const email = user?.email || "";
    const displayName =
      user?.user_metadata?.username ||
      user?.user_metadata?.full_name ||
      usernameFallback ||
      email ||
      "You";

    window.localStorage.setItem("onlyus_username", displayName);
    setCurrentUser(displayName);
    setScreen("home");
  };

  const handleNavigateFromHome = (target) => {
    if (target === "home") setScreen("home");
    if (target === "chat") setScreen("chat");
    if (target === "games") setScreen("games");
    if (target === "settings") setScreen("settings");
    if (target === "link-account") {
      // later: dedicated link screen or modal
      setScreen("settings");
    }
  };

  return (
    <div className={`app ${theme}`}>
      <div className="app-chrome">
        <div
          className={
            "theme-toggle-button " + (theme === "light" ? "light" : "dark")
          }
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <div className="theme-toggle-knob" />
        </div>
        <div className="theme-toggle-label">
          {theme === "dark" ? "She’s in dark mode" : "Soft light mode"}
        </div>
      </div>

      <AppHeader />

      {screen === "landing" &&
        (showSplash ? (
          <SoftSplash onEnterSpace={handleEnterSpace} />
        ) : (
          <Landing onEnterSpace={handleEnterSpace} />
        ))}

      {screen === "login" && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}

      {screen === "home" && (
        <Home
          currentUser={currentUser}
          onNavigate={handleNavigateFromHome}
        />
      )}

      {screen === "chat" && (
        <Chat
          currentUser={currentUser}
          onBack={() => setScreen("home")}
        />
      )}

{screen === "games" && (
  <Games
    currentUser={currentUser}
    onBack={() => setScreen("home")}
    onNavigate={(target) => {
      if (target === "home") setScreen("home");
      if (target === "chat") setScreen("chat");
      if (target === "settings") setScreen("settings");
    }}
  />
)}


      {screen === "settings" && (
        <Settings
          currentUser={currentUser}
          onBack={() => setScreen("home")}
        />
      )}
    </div>
  );
}

function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <div className="app-header-logo">
          <img src="/onlyus-logo.svg" alt="Only Us logo" />
        </div>
        <div className="app-header-text">
          <span className="app-header-title">Only Us</span>
          <span className="app-header-tagline">
            Private space for just you two
          </span>
        </div>
      </div>
    </header>
  );
}

function SoftSplash({ onEnterSpace }) {
  return (
    <div className="landing-root">
      <div className="landing-shell">
        <div className="landing-card">
          <div className="landing-content">
            <div className="landing-badge-row">
              <div className="landing-logo">
                <img src="/onlyus-logo.svg" alt="Only Us logo" />
              </div>
              <div className="landing-pill">
                <span className="landing-pill-dot" />
                <span>Loading our little world…</span>
              </div>
            </div>
            <h1 className="landing-title">
              Just a second,
              <br />
              <span className="highlight">setting the mood.</span>
            </h1>
            <p className="landing-subtitle">
              Messages, games, and inside jokes are warming up in the
              background. This space is only for you two.
            </p>
          </div>
        </div>

        <RightVisualSplash />

        {/* mobile-only button under card */}
        <div className="mobile-copy">
          <h2 className="mobile-copy-title">
            Your little <span>universe</span>
          </h2>
          <p className="mobile-copy-text">
            Just the two of you. Chat, play truth or dare, and keep the
            conversation going.
          </p>
          <div className="mobile-copy-button">
            <button
              className="mobile-enter-button"
              onClick={onEnterSpace}
            >
              Enter our space
              <span className="arrow">↳</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Landing({ onEnterSpace }) {
  const handlePeekGames = () => {};

  return (
    <div className="landing-root">
      <div className="landing-shell">
        {/* Desktop hero text card */}
        <div className="landing-card">
          <div className="landing-content">
            <div className="landing-badge-row">
              <div className="landing-logo">
                <img src="/onlyus-logo.svg" alt="Only Us logo" />
              </div>
              <div className="landing-pill">
                <span className="landing-pill-dot" />
                <span>PRIVATE, JUST YOU TWO</span>
              </div>
            </div>

            <h1 className="landing-title">
              Your own tiny
              <br />
              <span className="highlight">universe of “us”.</span>
            </h1>

            <p className="landing-subtitle">
              A secret chat and game space for just the two of you. Talk, play
              truth or dare, ask deep questions, and never run out of “what do
              we say next?” again.
            </p>

            <div className="landing-meta">
              <span>
                <span className="landing-meta-dot" />
                Only 2 accounts: you + her
              </span>
              <span>
                <span className="landing-meta-dot" />
                Truth or Dare, Would You Rather, prompts
              </span>
              <span>
                <span className="landing-meta-dot" />
                Dark mode she loves, light mode for you
              </span>
            </div>

            <div className="landing-actions">
              <button className="landing-primary" onClick={onEnterSpace}>
                Enter our space
                <span>↳</span>
              </button>
              <button className="landing-secondary" onClick={handlePeekGames}>
                Preview the games
              </button>
            </div>

            <div className="landing-caption">
              Your messages stay between you and her. No sign‑ups, no timeline,
              just the two of you.
            </div>
          </div>
        </div>

        {/* Right visual (always shown) */}
        <RightVisualLanding />

        {/* Mobile-only copy under card */}
        <div className="mobile-copy">
          <h2 className="mobile-copy-title">
            Your little <span>universe</span>
          </h2>
          <p className="mobile-copy-text">
            Just the two of you. Chat, play truth or dare, and keep the
            conversation going with endless “Would you rather” moments.
          </p>
          <div className="mobile-copy-button">
            <button
              className="mobile-enter-button"
              onClick={onEnterSpace}
            >
              Enter our space
              <span className="arrow">↳</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RightVisualSplash() {
  return (
    <div className="landing-visual">
      <div className="landing-visual-inner">
        <div className="landing-orbit">
          <div className="message-stack">
            <div className="message-chip game game-top">
              <div className="message-avatar" />
              <span>Hey, ready for another round of “Would you rather”?</span>
            </div>
            <div className="message-chip game game-middle">
              <span className="message-typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
              <span>where we talk forever</span>
            </div>
            <div className="message-chip game game-bottom">
              <span>Saving this little universe just for you two…</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RightVisualLanding() {
  return (
    <div className="landing-visual">
      <div className="landing-visual-inner">
        <div className="landing-orbit">
          <div className="message-stack">
            <div className="message-chip game game-top">
              <div className="message-avatar" />
              <span>Truth: first moment you knew you liked me?</span>
            </div>
            <div className="message-chip game game-middle">
              <span className="message-typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
              <span>NEXT ROUND: WOULD YOU RATHER?</span>
            </div>
            <div className="message-chip game game-bottom">
              <span>Dare: send a 10‑second voice note saying anything.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
