import React, { useState } from "react";
import HeroTopics from "../media/images/topics-hero.png";
import HeroTopics2 from "../media/images/topics-hero-2.png";
import Hero404 from "../media/images/404-hero.png";
import HeroNostrNotConnected from "../media/images/nostr-not-connected.png";
import HeroNostrunauthorized from "../media/images/nostr-unauthorized.png";
import HeroNostrNoPosts from "../media/images/posts-hero.png";
import LoginNOSTR from "./NOSTR/LoginNOSTR";
import { useContext } from "react";
import { Context } from "../Context/Context";
import { Link } from "react-router-dom";

export default function PagePlaceholder({ page, onClick = null }) {
  const { nostrUserLogout } = useContext(Context);
  const [triggerLogin, setTriggerLogin] = useState(false);

  if (page === "404")
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ height: "100vh" }}>
          <h2 className="box-marg-s p-centered">You're lost!</h2>
          <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
            No such page is in our platform, head back to the main home to enjoy
            our stories!
          </p>
          <div
            className="bg-img contained-bg"
            style={{
              backgroundImage: `url(${Hero404})`,
              width: "min(300px, 500px)",
              height: "300px",
            }}
          ></div>
          <button
            className="btn btn-normal"
            onClick={() => (window.location = "/")}
          >
            we are this way!
          </button>
        </div>
      </div>
    );
  if (page === "nostr-not-connected")
    return (
      <>
        {triggerLogin && <LoginNOSTR exit={() => setTriggerLogin(false)} />}
        <div className="fit-container">
          <div className="fx-centered fx-col" style={{ height: "80vh" }}>
            <h2 className="box-marg-s p-centered">You're not connected</h2>
            <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
              It seems that you're not connected to the NOSTR network, please
              sign in and join the community.
            </p>
            <div
              className="bg-img contained-bg"
              style={{
                backgroundImage: `url(${HeroNostrNotConnected})`,
                width: "min(300px, 500px)",
                height: "300px",
              }}
            ></div>
            <button
              className="btn btn-normal"
              onClick={() => setTriggerLogin(true)}
            >
              Login
            </button>
          </div>
        </div>
      </>
    );
  if (page === "nostr-unauthorized")
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ height: "80vh" }}>
          <h2 className="box-marg-s p-centered">Private key required!</h2>
          <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
            It seems that you don't own this account, please reconnect with the
            secret key to commit actions on this account.
          </p>
          <div
            className="bg-img contained-bg"
            style={{
              backgroundImage: `url(${HeroNostrunauthorized})`,
              width: "min(300px, 500px)",
              height: "300px",
            }}
          ></div>
          <button className="btn btn-normal" onClick={nostrUserLogout}>
            Logout
          </button>
        </div>
      </div>
    );
  if (page === "nostr-no-posts")
    return (
      <div className="fx-centered fx-col" style={{ height: "80vh" }}>
        <h2 className="box-marg-s p-centered">You have no articles</h2>
        <p className="p-centered gray-c" style={{ maxWidth: "400px" }}>
          Contribute in DAOrayaki NOSTR community by posting interesting
          articles in a variety of categories
        </p>
        <div
          className="bg-img contained-bg"
          style={{
            backgroundImage: `url(${HeroNostrNoPosts})`,
            width: "min(300px, 500px)",
            height: "300px",
          }}
        ></div>
        <Link to={"/write"}>
          <button className="btn btn-normal">write an article</button>
        </Link>
      </div>
    );
  if (page === "nostr-no-bookmarks")
    return (
      <div className="fx-centered fx-col" style={{ height: "80vh" }}>
        <h2 className="box-marg-s p-centered">You have no bookmarks</h2>
        <p className="p-centered gray-c" style={{ maxWidth: "400px" }}>
          You have a busy schedule? No problem! Save your favorite articles to
          read later on your comfortable chair.
        </p>
        <div
          className="bg-img contained-bg"
          style={{
            backgroundImage: `url(${HeroNostrNoPosts})`,
            width: "min(300px, 500px)",
            height: "300px",
          }}
        ></div>
      </div>
    );
  if (page === "nostr-curations")
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ height: "80vh" }}>
          <h2 className="box-marg-s p-centered">You have no curations!</h2>
          <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
            Start creating your favorite curations and gather your preferred
            articles from NOSTR!
          </p>
          <div
            className="bg-img contained-bg"
            style={{
              backgroundImage: `url(${HeroTopics})`,
              width: "min(300px, 500px)",
              height: "300px",
            }}
          ></div>
          <button className="btn btn-normal" onClick={onClick}>
            Create curation
          </button>
        </div>
      </div>
    );
  if (page === "nostr-curations-2")
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ height: "80vh" }}>
          <h2 className="box-marg-s p-centered">Curations coming!</h2>
          <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
            We'll have you dazzled with curations once there is enough content,
            stay tuned!
          </p>
          <div
            className="bg-img contained-bg"
            style={{
              backgroundImage: `url(${HeroTopics2})`,
              width: "min(300px, 500px)",
              height: "300px",
            }}
          ></div>
        </div>
      </div>
    );
}
