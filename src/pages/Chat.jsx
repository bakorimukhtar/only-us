// src/pages/Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Chat.css";
import {
  FiArrowLeft,
  FiSend,
  FiHome,
  FiMessageCircle,
  FiUser,
  FiPlus,
  FiLink2,
  FiX,
  FiPlayCircle,
  FiHelpCircle,
  FiZap,
  FiTrash2,
} from "react-icons/fi";

import { truthPrompts } from "../assets/games/truthOrDare/truth";
import { darePrompts } from "../assets/games/truthOrDare/dare";
import { wyrPrompts } from "../assets/games/wouldYouRather/wyr";
import { pickNumberPrompts } from "../assets/games/pickNumber/pickNumber";

const TYPING_IDLE_MS = 2000;
const ONLINE_WINDOW_SEC = 20;

function Chat({ currentUser, onBack, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showGames, setShowGames] = useState(false);
  const [activeGameKey, setActiveGameKey] = useState("truth");
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [linkUsername, setLinkUsername] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkStatus, setLinkStatus] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [partnerUsername, setPartnerUsername] = useState("");
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const lastReadRef = useRef(Date.now());
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingChannelRef = useRef(null);
  const presenceChannelRef = useRef(null);

  const promptSets = {
    truth: {
      label: "Truth",
      icon: <FiPlayCircle />,
      categories: truthPrompts,
      tagline: "Deep questions to get you two talking.",
      tone: "soft",
    },
    dare: {
      label: "Dare",
      icon: <FiZap />,
      categories: darePrompts,
      tagline: "Fun actions that bring you closer.",
      tone: "bold",
    },
    wyr: {
      label: "Would you rather",
      icon: <FiHelpCircle />,
      categories: wyrPrompts,
      tagline: "Pick between two ‘us’ scenarios.",
      tone: "soft",
    },
    pickNumber: {
      label: "Pick a number",
      icon: <FiHelpCircle />,
      categories: pickNumberPrompts,
      tagline: "Choose a number, unlock a moment.",
      tone: "soft",
    },
  };

  useEffect(() => {
    const loadUserAndPair = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: pairData } = await supabase
        .from("pairs")
        .select("id, user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .maybeSingle();

      if (!pairData) {
        setError("You are not linked with anyone yet.");
        return;
      }

      setRoomId(pairData.id);

      const partnerId =
        pairData.user_a === user.id ? pairData.user_b : pairData.user_a;

      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", partnerId)
        .maybeSingle();

      if (partnerProfile?.username) {
        setPartnerUsername(partnerProfile.username);
      }
    };

    loadUserAndPair();
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (error) {
        setError("Could not load messages.");
        return;
      }
      setMessages(data || []);
      lastReadRef.current = Date.now();
      setUnreadCount(0);
    };

    loadMessages();

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          setUnreadCount((prev) => {
            if (!currentUserId) return prev;
            const fromPartner = payload.new.sender_id !== currentUserId;
            return fromPartner ? prev + 1 : prev;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (!payload.old?.id) return;
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const onFocus = () => {
      lastReadRef.current = Date.now();
      setUnreadCount(0);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`typing:${roomId}`);

    channel.on("broadcast", { event: "typing" }, (payload) => {
      if (!currentUserId || payload.payload.userId === currentUserId) return;
      setPartnerTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setPartnerTyping(false);
      }, TYPING_IDLE_MS);
    });

    channel.subscribe();
    typingChannelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId]);

  const sendTypingEvent = () => {
    if (!typingChannelRef.current || !currentUserId) return;
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  };

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`presence:${roomId}`, {
      config: { presence: { key: currentUserId || "anon" } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const onlineIds = Object.keys(state || {});
      setPartnerOnline(onlineIds.length > 1);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && currentUserId) {
        channel.track({ userId: currentUserId, updatedAt: Date.now() });
      }
    });

    presenceChannelRef.current = channel;

    const heartbeat = setInterval(() => {
      if (!presenceChannelRef.current || !currentUserId) return;
      presenceChannelRef.current.track({
        userId: currentUserId,
        updatedAt: Date.now(),
      });
    }, ONLINE_WINDOW_SEC * 500);

    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !roomId) return;

    setSending(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to send messages.");
      setSending(false);
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content: trimmed,
      })
      .select()
      .single();

    if (error) {
      setError("Could not send message.");
      setSending(false);
      return;
    }

    setMessages((prev) => [...prev, data]);
    setText("");
    setSending(false);
    lastReadRef.current = Date.now();
    setUnreadCount(0);
  };

  const handleDeleteMessage = async (id) => {
    await supabase.from("messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleLink = async (e) => {
    e.preventDefault();
    const trimmed = linkUsername.trim();
    if (!trimmed) return;

    setLinkLoading(true);
    setLinkStatus("");
    setError("");

    try {
      await new Promise((res) => setTimeout(res, 600));
      setLinkStatus(`Linked with @${trimmed}.`);
      setLinkUsername("");
    } catch {
      setError("Could not link with that username.");
    } finally {
      setLinkLoading(false);
    }
  };

  const injectPrompt = (prompt) => {
    setShowGames(false);
    setText(prompt);
  };

  const go = (target) => {
    if (target === "back") {
      onBack && onBack();
    } else if (onNavigate) {
      onNavigate(target);
    }
  };

  const chatSubtitle = partnerUsername
    ? `Chat with @${partnerUsername}`
    : "Private DM with your person";

  const activeGame = promptSets[activeGameKey];

  return (
    <div className="chat-root">
      <div className="chat-shell">
        <header className="chat-header">
          <button
            className="chat-header-back"
            onClick={() => go("back")}
            aria-label="Back home"
          >
            <FiArrowLeft />
          </button>

          <div className="chat-header-main">
            <span className="chat-header-title">
              Only Us{" "}
              {partnerOnline && <span className="chat-online-dot" />}
            </span>
            <span className="chat-header-subtitle">
              {chatSubtitle}
              {partnerTyping && (
                <span className="chat-typing-indicator"> · typing…</span>
              )}
            </span>
          </div>

          <button
            className="chat-header-link-chip"
            onClick={() => setShowLinkPanel((v) => !v)}
          >
            <FiLink2 />
            <span>Link</span>
          </button>

          <div className="chat-header-avatar">
            {(currentUser || "You").charAt(0).toUpperCase()}
          </div>
        </header>

        {showLinkPanel && (
          <section className="chat-link-panel">
            <div className="chat-link-panel-header">
              <span>Link with a friend using their username</span>
              <button
                className="chat-link-panel-close"
                onClick={() => setShowLinkPanel(false)}
              >
                <FiX />
              </button>
            </div>
            <form onSubmit={handleLink} className="chat-link-form">
              <input
                className="chat-link-input"
                type="text"
                placeholder="@hername"
                value={linkUsername}
                onChange={(e) => setLinkUsername(e.target.value)}
              />
              <button
                type="submit"
                className="chat-link-submit"
                disabled={linkLoading || !linkUsername.trim()}
              >
                {linkLoading ? "Linking…" : "Link"}
              </button>
            </form>
            {linkStatus && (
              <div className="chat-link-status">{linkStatus}</div>
            )}
          </section>
        )}

        <main className="chat-main">
          {error && <div className="chat-error">{error}</div>}

          <div className="chat-messages">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isOwn={currentUserId && m.sender_id === currentUserId}
                onDelete={handleDeleteMessage}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </main>

        <div className="chat-floating-bar">
          <button
            className="chat-games-toggle"
            onClick={() => setShowGames(true)}
          >
            <FiPlus />
          </button>
          <span className="chat-floating-label">
            Keep it fun. Open games.
          </span>
        </div>

        {showGames && (
          <div className="chat-games-sheet">
            <div className="chat-games-drag-handle" />
            <div className="chat-games-sheet-header">
              <div>
                <h3>Games for just you two</h3>
                <p>
                  Choose a game, pick how you feel, then drop a prompt into the chat.
                </p>
              </div>
              <button
                className="chat-games-sheet-close"
                onClick={() => setShowGames(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="chat-games-tabs-row">
              {Object.entries(promptSets).map(([key, set]) => (
                <button
                  key={key}
                  className={
                    "chat-games-tab" +
                    (key === activeGameKey ? " chat-games-tab-active" : "")
                  }
                  onClick={() => setActiveGameKey(key)}
                >
                  <span className="chat-games-tab-icon">{set.icon}</span>
                  <span className="chat-games-tab-label">{set.label}</span>
                </button>
              ))}
            </div>

            <div className="chat-games-active-meta">
              <span className="chat-games-active-title">
                {activeGame.label}
              </span>
              <span className="chat-games-active-tagline">
                {activeGame.tagline}
              </span>
            </div>

            <div className="chat-games-sections">
              {Object.entries(activeGame.categories).map(
                ([categoryLabel, prompts]) => (
                  <div
                    key={categoryLabel}
                    className="chat-games-section"
                  >
                    <div className="chat-games-category-header">
                      <span className="chat-games-category-pill">
                        {categoryLabel}
                      </span>
                      <span className="chat-games-count">
                        {Array.isArray(prompts)
                          ? `${prompts.length} prompts`
                          : `${Object.keys(prompts).length} prompts`}
                      </span>
                    </div>
                    <div className="chat-games-pills">
                      {Array.isArray(prompts)
                        ? prompts.map((p) => (
                            <button
                              key={p}
                              className="chat-games-pill"
                              onClick={() => injectPrompt(p)}
                            >
                              {p}
                            </button>
                          ))
                        : Object.entries(prompts).map(([num, p]) => (
                            <button
                              key={num}
                              className="chat-games-pill"
                              onClick={() => injectPrompt(p)}
                            >
                              <span className="chat-games-pill-number">
                                #{num}
                              </span>
                              <span className="chat-games-pill-text">
                                {p}
                              </span>
                            </button>
                          ))}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="chat-games-sheet-footer">
              Tap a prompt to fill the message box, then add your own twist and hit send.
            </div>
          </div>
        )}

        <form className="chat-input-row" onSubmit={handleSend}>
          <input
            className="chat-input"
            type="text"
            placeholder={
              roomId
                ? "Type a message or drop a prompt…"
                : "Link with your person to start chatting"
            }
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              sendTypingEvent();
            }}
            disabled={!roomId}
          />
          <button
            type="submit"
            className="chat-send-button"
            disabled={sending || !text.trim() || !roomId}
          >
            <FiSend />
          </button>
        </form>

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
          <button className="home-nav-item active">
            <span className="home-nav-icon">
              <FiMessageCircle />
              {unreadCount > 0 && (
                <span className="chat-unread-badge">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
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

function MessageBubble({ message, isOwn, onDelete }) {
  return (
    <div
      className={
        "chat-bubble-row " +
        (isOwn ? "chat-bubble-row-own" : "chat-bubble-row-other")
      }
    >
      <div className={"chat-bubble " + (isOwn ? "own" : "other")}>
        <span>{message.content}</span>
        {isOwn && (
          <button
            className="chat-bubble-delete"
            type="button"
            onClick={() => onDelete(message.id)}
          >
            <FiTrash2 />
          </button>
        )}
      </div>
    </div>
  );
}

export default Chat;
