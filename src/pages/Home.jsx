// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import "./Home.css";
import { FiHome, FiMessageCircle, FiUser, FiFeather } from "react-icons/fi";
import { supabase } from "../lib/supabaseClient";

function Home({ currentUser, onNavigate, onLogout }) {
  const name = currentUser || "You";

  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [ownQuote, setOwnQuote] = useState(null); // { content, created_at }
  const [partnerQuote, setPartnerQuote] = useState(null);
  const [partnerUsername, setPartnerUsername] = useState("");
  const [quoteDraft, setQuoteDraft] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);
  const [message, setMessage] = useState("");

  const go = (target) => {
    if (onNavigate) onNavigate(target);
  };

  // Load latest quote for you and linked partner
  useEffect(() => {
    const loadQuotes = async () => {
      setLoadingQuotes(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoadingQuotes(false);
        return;
      }

      const userId = user.id;

      // 1) Your latest quote
      const { data: myQuoteData } = await supabase
        .from("quotes")
        .select("content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(); // latest row [web:400][web:402]

      if (myQuoteData) {
        setOwnQuote(myQuoteData);
      } else {
        setOwnQuote(null);
      }

      // 2) Find your pair to know partner id
      const { data: pairData } = await supabase
        .from("pairs")
        .select("user_a, user_b")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .maybeSingle();

      if (!pairData) {
        setPartnerQuote(null);
        setPartnerUsername("");
        setLoadingQuotes(false);
        return;
      }

      const partnerId =
        pairData.user_a === userId ? pairData.user_b : pairData.user_a;

      if (!partnerId) {
        setPartnerQuote(null);
        setPartnerUsername("");
        setLoadingQuotes(false);
        return;
      }

      // partner username from profiles
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", partnerId)
        .maybeSingle();

      if (partnerProfile?.username) {
        setPartnerUsername(partnerProfile.username);
      }

      // partner latest quote
      const { data: theirQuoteData } = await supabase
        .from("quotes")
        .select("content, created_at")
        .eq("user_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (theirQuoteData) {
        setPartnerQuote(theirQuoteData);
      } else {
        setPartnerQuote(null);
      }

      setLoadingQuotes(false);
    };

    loadQuotes();
  }, []);

  const handleSaveQuote = async (e) => {
    e.preventDefault();
    const trimmed = quoteDraft.trim();
    if (!trimmed) return;

    setSavingQuote(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Not logged in.");
      setSavingQuote(false);
      return;
    }

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        user_id: user.id,
        content: trimmed,
      })
      .select()
      .single(); // return inserted row [web:411][web:417]

    if (error) {
      setMessage("Could not post quote.");
    } else {
      setOwnQuote({
        content: data.content,
        created_at: data.created_at,
      });
      setQuoteDraft("");
      setMessage("Quote updated for you two.");
    }

    setSavingQuote(false);
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
                This is your shared little universe. Link your person and keep
                all your chats, games and inside jokes in one place.
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
                onClick={() => go("settings")}
              >
                <span className="home-action-dot" />
                Edit profile & linking
              </button>
              <button
                className="home-action-pill home-action-pill-logout"
                onClick={onLogout}
              >
                <span className="home-action-dot" />
                Log out
              </button>
            </div>

            {/* Your quote composer */}
            <div className="home-quote-card">
              <div className="home-quote-header">
                <span>Your quote for both of you</span>
              </div>
              <form onSubmit={handleSaveQuote} className="home-quote-form">
                <textarea
                  rows={2}
                  placeholder="Write a short thought, promise, or lyric…"
                  value={quoteDraft}
                  onChange={(e) => setQuoteDraft(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={savingQuote || !quoteDraft.trim()}
                >
                  {savingQuote ? "Posting…" : "Post quote"}
                </button>
              </form>
              {ownQuote && (
                <div className="home-quote-meta">
                  Last quote: “{ownQuote.content}”
                </div>
              )}
            </div>
          </aside>

          {/* Right column – feed of quotes / cards */}
          <section className="home-feed">
            {/* “Stories” style row */}
            <div className="home-stories-row">
              <div className="home-story-item home-story-you">
                <div className="home-story-avatar-add">
                  <FiFeather />
                </div>
                <span className="home-story-label">Your quote</span>
              </div>

              <div className="home-story-item">
                <div className="home-story-ring">
                  <div className="home-story-avatar" />
                </div>
                <span className="home-story-label">
                  {partnerUsername
                    ? `@${partnerUsername}'s quote`
                    : "Partner quote"}
                </span>
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

            {/* Partner quote + daily card */}
            {message && <div className="home-status-message">{message}</div>}
            {loadingQuotes ? (
              <div className="home-status-message">Loading quotes…</div>
            ) : (
              <>
                <article className="home-feed-card">
                  <div className="home-feed-meta">
                    <div className="home-feed-avatar" />
                    <div className="home-feed-meta-text">
                      <span className="home-feed-title">
                        {partnerUsername
                          ? `@${partnerUsername}'s latest quote`
                          : "Your person’s latest quote"}
                      </span>
                      <span className="home-feed-subtitle">
                        Visible only to you two
                      </span>
                    </div>
                  </div>
                  <p className="home-feed-quote">
                    {partnerQuote
                      ? `“${partnerQuote.content}”`
                      : "Your person hasn’t posted a quote yet."}
                  </p>
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
                      onClick={() => go("chat")}
                    >
                      Start a round in chat
                    </button>
                    <button className="home-feed-button secondary">
                      Peek prompts
                    </button>
                  </div>
                </article>
              </>
            )}
          </section>
        </main>

        {/* Bottom navigation with icon library (no Games) */}
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
