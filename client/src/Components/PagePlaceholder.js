import React, { useState } from "react";
import HeroTopics from "../media/images/topics-hero.png";
import HeroTopics2 from "../media/images/topics-hero-2.png";
import Hero404 from "../media/images/404-hero.png";
import HeroNostrNotConnected from "../media/images/nostr-not-connected.png";
import HeroNostrunauthorized from "../media/images/nostr-unauthorized.png";
import HeroNostrNoPosts from "../media/images/posts-hero.png";
import HeroNostrNoNews from "../media/images/news-hero.png";
import HeroNostrNoUN from "../media/images/un-hero.png";
import HeroNostrunauthorizedMessages from "../media/images/unauthorized-messages.png";
import HeroDMS from "../media/images/DMS.png";
import HeroDMSWaiting from "../media/images/DMS-waiting.gif";
import HeroYakiChest from "../media/images/trophy.png";
import HeroWallet from "../media/images/wallet.png";
import HeroWidgets from "../media/images/widgets.png";
import HeroWidgetsDraft from "../media/images/draft.png";
import LoginNOSTR from "./NOSTR/LoginNOSTR";
import { useContext } from "react";
import { Context } from "../Context/Context";
import { Link } from "react-router-dom";
import LoginWithAPI from "./NOSTR/LoginWithAPI";
import AddWallet from "./NOSTR/AddWallet";

export default function PagePlaceholder({ page, onClick = null }) {
  const { userLogout, nostrKeys } = useContext(Context);
  const [triggerLogin, setTriggerLogin] = useState(false);
  const [showYakiChest, setShowYakiChest] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  if (page === "404")
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ height: "100vh" }}>
          <h2 className="box-marg-s p-centered">You're lost!</h2>
          <p
            className="p-centered gray-c box-pad-h"
            style={{ maxWidth: "450px" }}
          >
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
        <div className="fit-container fx-centered">
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
          <button className="btn btn-normal" onClick={userLogout}>
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
  if (page === "nostr-news")
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ height: "70vh" }}>
          <div
            className="bg-img contained-bg"
            style={{
              backgroundImage: `url(${HeroNostrNoNews})`,
              width: "min(300px, 500px)",
              height: "300px",
            }}
          ></div>
          <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
            There are no news here, change dates or wait until some magic to
            happen
          </p>
        </div>
      </div>
    );
  if (page === "nostr-un")
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ height: "20vh" }}>
          <div
            className="bg-img contained-bg"
            style={{
              backgroundImage: `url(${HeroNostrNoUN})`,
              width: "min(300px, 500px)",
              height: "200px",
            }}
          ></div>
          <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
            It's quiet here! No community notes yet.
          </p>
        </div>
      </div>
    );
  if (page === "nostr-unauthorized-messages")
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ height: "80vh" }}>
          <h2 className="box-marg-s p-centered">Private key required!</h2>
          <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
            It seems that you don't own this account, messages are personals,
            please reconnect with the secret key or extension to use this page
          </p>
          <div
            className="bg-img contained-bg"
            style={{
              backgroundImage: `url(${HeroNostrunauthorizedMessages})`,
              width: "min(300px, 500px)",
              height: "300px",
            }}
          ></div>
          <button className="btn btn-normal" onClick={userLogout}>
            Logout
          </button>
        </div>
      </div>
    );
  if (page === "nostr-DMS")
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ height: "90vh" }}>
          <h2 className="box-marg-s p-centered">Here is your room!</h2>
          <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
            Pick a friend to talk to, we promise you'll enjoy it
          </p>
          <div
            className="bg-img contained-bg"
            style={{
              backgroundImage: `url(${HeroDMS})`,
              width: "min(300px, 500px)",
              height: "300px",
            }}
          ></div>
        </div>
      </div>
    );
  if (page === "nostr-DMS-waiting")
    return (
      <div className="fit-container">
        <div className="fx-centered fx-col" style={{ height: "80vh" }}>
          <h2 className="box-marg-s p-centered">We got ya!</h2>
          <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
            We're getting your inbox ready, we promise we won't take long...
          </p>
          <div
            className="bg-img contained-bg"
            style={{
              backgroundImage: `url(${HeroDMSWaiting})`,
              width: "min(300px, 500px)",
              height: "300px",
            }}
          ></div>
        </div>
      </div>
    );
  if (page === "nostr-yaki-chest")
    return (
      <>
        {showYakiChest && <LoginWithAPI exit={() => setShowYakiChest(false)} />}
        <div className="fit-container">
          <div className="fx-centered fx-col" style={{ height: "80vh" }}>
            <div
              className="bg-img contained-bg"
              style={{
                backgroundImage: `url(${HeroYakiChest})`,
                width: "min(300px, 500px)",
                height: "300px",
              }}
            ></div>
            <h3 className="box-marg-s p-centered">Yakihonne point system</h3>
            <p
              className="p-centered gray-c box-marg-s "
              style={{ maxWidth: "450px" }}
            >
              You need to connect to Yakihonne point system in order to gain
              points and win rewards.
            </p>
            {nostrKeys && (nostrKeys.ext || nostrKeys.sec) && (
              <button
                className="btn btn-normal"
                onClick={() => setShowYakiChest(true)}
              >
                Connect to Yaki chest
              </button>
            )}
          </div>
        </div>
      </>
    );
  if (page === "nostr-wallet")
    return (
      <>
        {triggerLogin && <LoginNOSTR exit={() => setTriggerLogin(false)} />}
        <div className="fit-container fx-centered">
          <div className="fx-centered fx-col" style={{ height: "80vh" }}>
            <div
              className="bg-img contained-bg"
              style={{
                backgroundImage: `url(${HeroWallet})`,
                width: "min(300px, 500px)",
                height: "300px",
              }}
            ></div>
            <h3 className=" p-centered">Full connection is required</h3>
            <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
              It seems that you're not connected using an extension nor a secret
              key, please reconnect using either methods to access this page
            </p>
            <button
              className="btn btn-normal"
              onClick={() =>
                nostrKeys ? userLogout() : setTriggerLogin(true)
              }
            >
              {nostrKeys ? "reconnect" : "Login"}
            </button>
          </div>
        </div>
      </>
    );
  if (page === "nostr-add-wallet")
    return (
      <>
        {showAddWallet && <AddWallet exit={() => setShowAddWallet(false)} />}
        <div className="fit-container fx-centered">
          <div
            className="fx-centered fx-col"
            style={{ height: "80vh", rowGap: "24px" }}
          >
            <div style={{ position: "relative" }}>
              <div className="round-icon" style={{ width: "140px" }}>
                <div
                  className="wallet-add"
                  style={{ width: "60px", height: "60px" }}
                ></div>
              </div>
              <div
                className="box-pad-h-s box-pad-v-s"
                style={{
                  borderRadius: "var(--border-r-50)",
                  backgroundColor: "var(--white)",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                <div
                  className="alby-logo-24"
                  style={{ width: "32px", height: "32px" }}
                ></div>
              </div>
              <div
                className="box-pad-h-s box-pad-v-s"
                style={{
                  borderRadius: "var(--border-r-50)",
                  backgroundColor: "var(--white)",
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                }}
              >
                <div
                  className="nwc-logo-24"
                  style={{ width: "32px", height: "32px" }}
                ></div>
              </div>
            </div>

            <p className="p-centered gray-c" style={{ maxWidth: "400px" }}>
              To be able to send zaps, please make sure to connect your bitcoin
              lightning wallet.
            </p>
            <button
              className="btn btn-orange fx-centered"
              onClick={() => setShowAddWallet(!showAddWallet)}
            >
              <div className="plus-sign"></div> Add wallet
            </button>
          </div>
        </div>
      </>
    );
  if (page === "widgets")
    return (
      <>
        {showYakiChest && <LoginWithAPI exit={() => setShowYakiChest(false)} />}
        <div className="fit-container">
          <div className="fx-centered fx-col" style={{ height: "60vh" }}>
            <div
              className="bg-img contained-bg"
              style={{
                backgroundImage: `url(${HeroWidgets})`,
                width: "500px",
                height: "280px",
              }}
            ></div>
            <h4>Smart widget checker</h4>
            <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
              Enter a smart widget naddr to check for its validity
            </p>
          </div>
        </div>
      </>
    );
  if (page === "widgets-draft")
    return (
      <>
        <div className="fit-container">
          <div className="fx-centered fx-col" style={{ height: "80vh" }}>
            <div
              className="bg-img contained-bg"
              style={{
                backgroundImage: `url(${HeroWidgetsDraft})`,
                width: "500px",
                height: "280px",
              }}
            ></div>
            <h4>No drafts</h4>
            <p className="p-centered gray-c" style={{ maxWidth: "450px" }}>
              Your drafts list is empty, any created or cloned widgets will be
              automatically saved here!
            </p>
            <button className="btn btn-normal" onClick={onClick}>Add a widget</button>
          </div>
        </div>
      </>
    );
}
