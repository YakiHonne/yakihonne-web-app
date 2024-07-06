import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles/root.css";
import "./styles/animations.css";
import "./styles/icons.css";
import "./styles/placeholder.css";
import "./styles/essentials.css";
import "./styles/custom.css";
import "./styles/mobile.css";

import { ContextProvider } from "./Context/Context";

import NostrHome from "./Pages/NOSTR/NostrHome";
import NostrWriting from "./Pages/NOSTR/NostrWriting";
import NostrArticle from "./Components/NOSTR/NostrArticle";
import NostrCurations from "./Pages/NOSTR/NostrCurations";
import NostrSettings from "./Pages/NOSTR/NostrSettings";
import NostrUser from "./Pages/NOSTR/NostrUser";
import NostrMyPosts from "./Pages/NOSTR/NostrMyPosts";
import NostrMyCurations from "./Pages/NOSTR/NostrMyCurations";
import NostrCuration from "./Components/NOSTR/NostrCuration";
import ToastMessages from "./Components/ToastMessages";
import FourOFour from "./Pages/FourOFour";
import NostrSearchTag from "./Pages/NOSTR/NostrSearchTag";
import NostrBookmarks from "./Pages/NOSTR/NostrBookmarks";

function App() {
  return (
    <ContextProvider>
      <ToastMessages />
      <Router>
        <Routes>
          <Route path="*" element={<FourOFour />} />
          <Route path="/" element={<NostrHome />} />
          <Route path="/bookmarks" element={<NostrBookmarks />} />
          <Route path="/curations" element={<NostrCurations />} />
          <Route path="/curations/:id" element={<NostrCuration />} />
          <Route path="/my-curations" element={<NostrMyCurations />} />
          <Route path="/write" element={<NostrWriting />} />
          <Route path="/my-articles" element={<NostrMyPosts />} />
          <Route path="/settings" element={<NostrSettings />} />
          <Route path="/article/:id" element={<NostrArticle />} />
          <Route path="/users/:user_id" element={<NostrUser />} />
          <Route path="/tags/:tag" element={<NostrSearchTag />} />
        </Routes>
      </Router>
    </ContextProvider>
  );
}

export default App;
