// src/pages/Games.jsx
import React from "react";
import "./Games.css";
import {
  FiArrowLeft,
  FiMessageCircle,
  FiPlayCircle,
  FiHelpCircle,
  FiShuffle,
  FiHome,
  FiUser,
} from "react-icons/fi";

function Games({ currentUser, onBack, onNavigate }) {
  const name = currentUser || "You";

  const go = (target) => {
    if (target === "back") {
      onBack && onBack();
    } else if (onNavigate) {
      onNavigate(target);
    }
  };

  return (
    <div className="games-root">
      <div className="games-shell">
        {/* Header */}
        <header className="games-header">
          <button
            className="games-header-back"
            onClick={() => go("back")}
            aria-label="Back home"
          >
            <FiArrowLeft />
          </button>
          <div className="games-header-main">
            <span className="games-header-title">Games for you two</span>
            <span className="games-header-subtitle">
              Pick a game and keep the conversation fun.
            </span>
          </div>
          <div className="games-header-avatar">
            {name.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Cards grid */}
        <main className="games-main">
          <section className="games-grid">
            <article className="game-card">
              <div className="game-card-icon">
                <FiPlayCircle />
              </div>
              <h2 className="game-card-title">Truth or Dare</h2>
              <p className="game-card-text">
                Classic Truth or Dare with prompts tuned for couples and close
                friends.
              </p>
              <div className="game-card-meta">
                <span>Short rounds · Spicy or soft</span>
              </div>
              <button
                className="game-card-button"
                onClick={() => go("truth-or-dare")}
              >
                Start Truth or Dare
                <span>↳</span>
              </button>
            </article>

            <article className="game-card">
              <div className="game-card-icon">
                <FiHelpCircle />
              </div>
              <h2 className="game-card-title">Would You Rather</h2>
              <p className="game-card-text">
                Quick “this or that” questions to learn what the other person
                really thinks.
              </p>
              <div className="game-card-meta">
                <span>Light, funny, endless</span>
              </div>
              <button
                className="game-card-button"
                onClick={() => go("would-you-rather")}
              >
                Open this game
                <span>↳</span>
              </button>
            </article>

            <article className="game-card">
              <div className="game-card-icon">
                <FiShuffle />
              </div>
              <h2 className="game-card-title">Deep Questions</h2>
              <p className="game-card-text">
                Curated prompts for late-night calls, long chats, and honest
                moments.
              </p>
              <div className="game-card-meta">
                <span>Deep, gentle, vulnerable</span>
              </div>
              <button
                className="game-card-button"
                onClick={() => go("question-round")}
              >
                Start a question round
                <span>↳</span>
              </button>
            </article>
          </section>
        </main>

        {/* Bottom nav – Games active */}
        <footer className="home-bottom-nav">
          <button
            className="home-nav-item"
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
          <button className="home-nav-item active">
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

export default Games;
