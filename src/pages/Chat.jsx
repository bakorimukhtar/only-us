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

const TYPING_IDLE_MS = 2000;
const ONLINE_WINDOW_SEC = 20;

function Chat({ currentUser, onBack, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showGames, setShowGames] = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [linkUsername, setLinkUsername] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkStatus, setLinkStatus] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [roomId, setRoomId] = useState(null); // pair.id used as room id
  const [partnerUsername, setPartnerUsername] = useState("");
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const lastReadRef = useRef(Date.now());
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingChannelRef = useRef(null);
  const presenceChannelRef = useRef(null);

  // prompts
  const promptSets = {
    truth: {
      label: "Truth or Dare",
      icon: <FiPlayCircle />,
      categories: {
        Friend: [
          "Truth (friend): What is one memory with me you’ll never forget?",
          "Truth (friend): What is something you wish we did more together?",
        ],
        Crush: [
          "Truth (crush): When did you first start liking me?",
          "Truth (crush): What’s one small thing I do that you secretly love?",
        ],
        Partner: [
          "Truth (partner): What’s something you’re scared to tell me but want to?",
          "Truth (partner): When do you feel closest to me?",
        ],
      },
    },
    dare: {
      label: "Dare prompts",
      icon: <FiZap />,
      categories: {
        Friend: [
          "Dare (friend): Send me your most unfiltered selfie right now.",
          "Dare (friend): Voice note a random story from today.",
        ],
        Crush: [
          "Dare (crush): Send a 10‑second voice note describing me without using my name.",
          "Dare (crush): Change my name in your phone to something sweet and send a screenshot.",
        ],
        Partner: [
          "Dare (partner): Send a voice note telling me 3 things you love about us.",
          "Dare (partner): Plan a tiny date idea and send it as a message.",
        ],
      },
    },
    wyr: {
      label: "Would you rather",
      icon: <FiHelpCircle />,
      categories: {
        Friend: [
          "Would you rather: movie night in or late walk outside?",
          "Would you rather: unlimited trips with friends or unlimited gadgets?",
        ],
        Crush: [
          "Would you rather: endless late‑night calls or surprise dates?",
          "Would you rather: hold hands in public or cuddle indoors?",
        ],
        Partner: [
          "Would you rather: travel the world together or build a home together?",
          "Would you rather: always be honest even if it hurts or keep small secrets to protect feelings?",
        ],
      },
    },
  };

  // Load user + pair (room) + partner username
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

      setRoomId(pairData.id); // pair id = room id

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

  // Messages + realtime for this room
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

  // Scroll
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mark read on focus
  useEffect(() => {
    const onFocus = () => {
      lastReadRef.current = Date.now();
      setUnreadCount(0);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Typing indicator for this room
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

  // Presence per room
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

  return (
    <div className="chat-root">
      <div className="chat-shell">
        {/* Header */}
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

        {/* Link drawer */}
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

        {/* Messages */}
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

        {/* Floating games bar */}
        <div className="chat-floating-bar">
          <button
            className="chat-games-toggle"
            onClick={() => setShowGames(true)}
          >
            <FiPlus />
          </button>
          <span className="chat-floating-label">Games & prompts</span>
        </div>

        {/* Games bottom sheet */}
        {showGames && (
          <div className="chat-games-sheet">
            <div className="chat-games-sheet-header">
              <div>
                <h3>Play inside the chat</h3>
                <p>Choose a game, pick a category, send the prompt.</p>
              </div>
              <button
                className="chat-games-sheet-close"
                onClick={() => setShowGames(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="chat-games-card-row">
              {Object.entries(promptSets).map(([key, set]) => (
                <button
                  key={key}
                  className="chat-game-card"
                  onClick={() =>
                    document
                      .getElementById(`game-${key}`)
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <div className="chat-game-card-icon">{set.icon}</div>
                  <div className="chat-game-card-text">
                    <span className="chat-game-card-title">{set.label}</span>
                    <span className="chat-game-card-sub">
                      Friend · Crush · Partner
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="chat-games-sections">
              {Object.entries(promptSets).map(([key, set]) => (
                <div key={key} id={`game-${key}`} className="chat-games-section">
                  <h4>{set.label}</h4>
                  {Object.entries(set.categories).map(
                    ([categoryLabel, prompts]) => (
                      <div
                        key={categoryLabel}
                        className="chat-games-category-block"
                      >
                        <span className="chat-games-category-pill">
                          {categoryLabel}
                        </span>
                        <div className="chat-games-pills">
                          {prompts.map((p) => (
                            <button
                              key={p}
                              className="chat-games-pill"
                              onClick={() => injectPrompt(p)}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>

            <div className="chat-games-sheet-footer">
              Tap a prompt to drop it into the box below, then hit send.
            </div>
          </div>
        )}

        {/* Input row */}
        <form className="chat-input-row" onSubmit={handleSend}>
          <input
            className="chat-input"
            type="text"
            placeholder={
              roomId
                ? "Type a message or pick a prompt…"
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

        {/* Bottom nav with unread badge */}
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
