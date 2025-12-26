// src/pages/Home.jsx
import React from "react";
import "./Home.css";
import {
  FiHome,
  FiMessageCircle,
  FiPlayCircle,
  FiUser,
} from "react-icons/fi";

function Home({ currentUser, onNavigate }) {
  const name = currentUser || "You";

  const go = (target) => {
    if (onNavigate) onNavigate(target);
  };

  return (
    <div className="home-root">
      <div className="home-shell">
        {/* Top app bar */}
        <header className="home-header">
          <div className="home-header-left">
            <span className="home-app-name">Only Us</span>
            <span className="home-app-tagline">
              Your private two‑person world
            </span>
          </div>
          <div className="home-header-right">
            <button
              className="home-icon-button"
              onClick={() => go("settings")}
              aria-label="Open profile"
            >
              <div className="home-avatar-circle">
                {name.charAt(0).toUpperCase()}
              </div>
            </button>
          </div>
        </header>

        {/* Content area */}
        <main className="home-main-layout">
          {/* Left column – profile & quick actions */}
          <aside className="home-sidebar">
            <div className="home-profile-card">
              <div className="home-profile-row">
                <div className="home-profile-avatar">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="home-profile-text">
                  <div className="home-profile-username">@{name}</div>
                  <div className="home-profile-name">Just the two of you</div>
                </div>
              </div>
              <p className="home-profile-bio">
                This is your shared little universe. Link your person here and
                keep all your chats, games and inside jokes in one place.
              </p>

              <button
                className="home-primary"
                onClick={() => go("link-account")}
              >
                Link with my person
                <span>↳</span>
              </button>
            </div>

            <div className="home-actions-column">
              <button
                className="home-action-pill"
                onClick={() => go("chat")}
              >
                <span className="home-action-dot" />
                Open private chat
              </button>
              <button
                className="home-action-pill"
                onClick={() => go("games")}
              >
                <span className="home-action-dot" />
                Play Truth or Dare
              </button>
              <button
                className="home-action-pill"
                onClick={() => go("games")}
              >
                <span className="home-action-dot" />
                Start a question round
              </button>
            </div>
          </aside>

          {/* Right column – feed of quotes / cards */}
          <section className="home-feed">
            {/* “Stories” style row */}
            <div className="home-stories-row">
              <div className="home-story-item home-story-you">
                <div className="home-story-avatar-add">+</div>
                <span className="home-story-label">Your quote</span>
              </div>

              <div className="home-story-item">
                <div className="home-story-ring">
                  <div className="home-story-avatar" />
                </div>
                <span className="home-story-label">Goodnight note</span>
              </div>

              <div className="home-story-item">
                <div className="home-story-ring">
                  <div className="home-story-avatar" />
                </div>
                <span className="home-story-label">Truth or Dare</span>
              </div>

              <div className="home-story-item">
                <div className="home-story-ring">
                  <div className="home-story-avatar" />
                </div>
                <span className="home-story-label">Saved moments</span>
              </div>
            </div>

            {/* Quote / activity cards */}
            <article className="home-feed-card">
              <div className="home-feed-meta">
                <div className="home-feed-avatar" />
                <div className="home-feed-meta-text">
                  <span className="home-feed-title">Daily “us” quote</span>
                  <span className="home-feed-subtitle">
                    Today · For you two
                  </span>
                </div>
              </div>
              <p className="home-feed-quote">
                “Real intimacy is not just late‑night calls; it’s remembering the
                tiny things they said when they thought you weren’t listening.”
              </p>
              <div className="home-feed-actions">
                <button className="home-feed-button">Send in chat</button>
                <button className="home-feed-button secondary">
                  Save to our wall
                </button>
              </div>
            </article>

            <article className="home-feed-card">
              <div className="home-feed-meta">
                <div className="home-feed-avatar game" />
                <div className="home-feed-meta-text">
                  <span className="home-feed-title">Tonight’s game idea</span>
                  <span className="home-feed-subtitle">
                    Truth or Dare · 5 new prompts
                  </span>
                </div>
              </div>
              <p className="home-feed-quote">
                Spin up a quick round of Truth or Dare and see who backs out
                first. We’ll keep the dares spicy but safe.
              </p>
              <div className="home-feed-actions">
                <button
                  className="home-feed-button"
                  onClick={() => go("games")}
                >
                  Start a round
                </button>
                <button className="home-feed-button secondary">
                  Peek prompts
                </button>
              </div>
            </article>
          </section>
        </main>

        {/* Bottom navigation with icon library */}
        <footer className="home-bottom-nav">
          <button
            className="home-nav-item active"
            onClick={() => go("home")}
          >
            <span className="home-nav-icon">
              <FiHome />
            </span>
            <span className="home-nav-label">Home</span>
          </button>
          <button
            className="home-nav-item"
            onClick={() => go("chat")}
          >
            <span className="home-nav-icon">
              <FiMessageCircle />
            </span>
            <span className="home-nav-label">Chat</span>
          </button>
          <button
            className="home-nav-item"
            onClick={() => go("games")}
          >
            <span className="home-nav-icon">
              <FiPlayCircle />
            </span>
            <span className="home-nav-label">Games</span>
          </button>
          <button
            className="home-nav-item"
            onClick={() => go("settings")}
          >
            <span className="home-nav-icon">
              <FiUser />
            </span>
            <span className="home-nav-label">Profile</span>
          </button>
        </footer>
      </div>
    </div>
  );
}

export default Home;
