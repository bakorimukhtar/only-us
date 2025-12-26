// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Settings.css";

function Settings({ currentUser, onBack, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    bio: "",
  });
  const [partnerUsernameInput, setPartnerUsernameInput] = useState("");
  const [linkedPartner, setLinkedPartner] = useState(null); // { username } or null
  const [message, setMessage] = useState("");

  // load profile + pair
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Could not load user.");
        setLoading(false);
        return;
      }

      const userId = user.id;

      // 1) profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username, full_name, bio")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        setMessage("Could not load profile.");
      } else if (profileData) {
        setProfile({
          username: profileData.username || "",
          full_name: profileData.full_name || "",
          bio: profileData.bio || "",
        });
      } else {
        setProfile({
          username: "",
          full_name: "",
          bio: "",
        });
      }

      // 2) pair
      const { data: pairData, error: pairError } = await supabase
        .from("pairs")
        .select("id, user_a, user_b")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .maybeSingle();

      if (!pairError && pairData) {
        const partnerId =
          pairData.user_a === userId ? pairData.user_b : pairData.user_a;

        if (partnerId) {
          const { data: partnerProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", partnerId)
            .maybeSingle();

          if (partnerProfile?.username) {
            setLinkedPartner({ id: partnerId, username: partnerProfile.username });
          } else {
            setLinkedPartner({ id: partnerId, username: "Unknown" });
          }
        }
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Not logged in.");
      setSavingProfile(false);
      return;
    }

    const userId = user.id;

    // upsert into profiles
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username: profile.username || null,
        full_name: profile.full_name || null,
        bio: profile.bio || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      setMessage("Could not save profile.");
    } else {
      setMessage("Profile updated.");
    }

    setSavingProfile(false);
  };

  const handleLinkPartner = async (e) => {
    e.preventDefault();
    const targetUsername = partnerUsernameInput.trim();
    if (!targetUsername) return;

    setLinkLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Not logged in.");
      setLinkLoading(false);
      return;
    }

    const userId = user.id;

    // find partner by username
    const { data: partner, error: partnerError } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", targetUsername)
      .maybeSingle();

    if (partnerError || !partner) {
      setMessage("No user found with that username.");
      setLinkLoading(false);
      return;
    }

    if (partner.id === userId) {
      setMessage("You cannot link with yourself.");
      setLinkLoading(false);
      return;
    }

    // remove any existing pair for this user
    await supabase
      .from("pairs")
      .delete()
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);

    // create new pair
    const { error: pairInsertError } = await supabase
      .from("pairs")
      .insert({
        user_a: userId,
        user_b: partner.id,
      });

    if (pairInsertError) {
      setMessage("Could not link with that user.");
    } else {
      setLinkedPartner({ id: partner.id, username: partner.username });
      setMessage(`Linked with @${partner.username}.`);
      setPartnerUsernameInput("");
    }

    setLinkLoading(false);
  };

  const handleUnlinkPartner = async () => {
    setLinkLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Not logged in.");
      setLinkLoading(false);
      return;
    }

    const userId = user.id;

    const { error } = await supabase
      .from("pairs")
      .delete()
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);

    if (error) {
      setMessage("Could not unlink right now.");
    } else {
      setLinkedPartner(null);
      setMessage("Partner unlinked.");
    }

    setLinkLoading(false);
  };

  return (
    <div className="settings-root">
      <header className="settings-header">
        <button className="settings-back" onClick={onBack}>
          ←
        </button>
        <div className="settings-header-main">
          <span className="settings-header-title">Profile & linking</span>
          <span className="settings-header-sub">
            Signed in as {currentUser || "Unknown"}
          </span>
        </div>
      </header>

      <main className="settings-main">
        {loading ? (
          <div className="settings-loading">Loading your details…</div>
        ) : (
          <>
            {message && <div className="settings-message">{message}</div>}

            {/* Profile form */}
            <section className="settings-section">
              <h2>Profile</h2>
              <form onSubmit={handleProfileSave} className="settings-form">
                <label className="settings-field">
                  <span>Username</span>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    placeholder="yourusername"
                  />
                  <small>This is how your partner will find you.</small>
                </label>

                <label className="settings-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    placeholder="Full name"
                  />
                </label>

                <label className="settings-field">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    placeholder="Write something sweet or chaotic about you two…"
                  />
                </label>

                <button
                  type="submit"
                  className="settings-save-btn"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving…" : "Save profile"}
                </button>
              </form>
            </section>

            {/* Linking section */}
            <section className="settings-section">
              <h2>Your person</h2>

              {linkedPartner ? (
                <div className="settings-linked-card">
                  <div>
                    <div className="settings-linked-label">Linked with</div>
                    <div className="settings-linked-username">
                      @{linkedPartner.username}
                    </div>
                  </div>
                  <button
                    className="settings-unlink-btn"
                    onClick={handleUnlinkPartner}
                    disabled={linkLoading}
                  >
                    {linkLoading ? "Unlinking…" : "Unlink"}
                  </button>
                </div>
              ) : (
                <p className="settings-help-text">
                  You are not linked with anyone yet. Link with your person to
                  share a private chat and games.
                </p>
              )}

              <form onSubmit={handleLinkPartner} className="settings-form-inline">
                <input
                  type="text"
                  value={partnerUsernameInput}
                  onChange={(e) => setPartnerUsernameInput(e.target.value)}
                  placeholder="Partner username, e.g. hername"
                />
                <button
                  type="submit"
                  disabled={linkLoading || !partnerUsernameInput.trim()}
                >
                  {linkLoading ? "Linking…" : "Link"}
                </button>
              </form>
            </section>

            {/* Logout */}
            <section className="settings-section">
              <h2>Session</h2>
              <button className="settings-logout-btn" onClick={onLogout}>
                Log out
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Settings;
