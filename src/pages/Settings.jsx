// src/pages/Settings.jsx
import React from "react";

function Settings({ currentUser, onBack }) {
  return (
    <div className="page-root">
      <button className="page-back" onClick={onBack}>
        ← Back home
      </button>
      <h1>Profile & linking</h1>
      <p>Signed in as: {currentUser || "Unknown"}</p>
    </div>
  );
}

export default Settings;
