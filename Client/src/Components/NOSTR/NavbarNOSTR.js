import React, { useContext, useEffect, useRef, useState } from "react";
import { Context } from "../../Context/Context";
import { getBech32, minimizeKey } from "../../Helpers/Encryptions";
import LoginNOSTR from "./LoginNOSTR";
import SearchbarNOSTR from "./SearchbarNOSTR";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import ShortenKey from "./ShortenKey";
import { Link, useNavigate } from "react-router-dom";
import MenuMobile from "./MenuMobile";
import SearchMobile from "./SearchMobile";
import { nip19 } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";

const triggerLoginTime = () => {
  let time = localStorage.getItem("login-off");

  if (!time) {
    localStorage.setItem("login-off", `${new Date().getTime()}`);
    return true;
  }

  if (parseInt(time) + 20 * 60 * 1000 < new Date().getTime()) {
    localStorage.setItem("login-off", `${new Date().getTime()}`);
    return true;
  }
  return false;
};

export default function NavbarNOSTR() {
  const { nostrUser, nostrUserLoaded, nostrKeys, nostrUserLogout } =
    useContext(Context);
  const navigateTo = useNavigate();
  const ref = useRef();
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const [triggerLogin, setTriggerLogin] = useState("");
  const [pubkey, setPubkey] = useState(
    nostrKeys.pub ? getBech32("npub", nostrKeys.pub) : ""
  );
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    nostrKeys.pub ? setPubkey(getBech32("npub", nostrKeys.pub)) : setPubkey("");
  }, [nostrKeys]);

  useEffect(() => {
    if (nostrUserLoaded) {
      let timer = triggerLoginTime();
      let status = nostrUser;
      if (status) {
        setTriggerLogin(false);
        return;
      }
      if (timer) {
        setTimeout(() => {
          setTriggerLogin(true);
        }, 300000);
      }
    }
  }, [nostrUser, nostrUserLoaded]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);

  if (!nostrUserLoaded)
    return (
      <div className="fit-container fx-scattered box-marg">
        <div
          className="sc-s skeleton-container"
          style={{
            width: "300px",
            height: "54px",
            backgroundColor: "var(--dim-gray)",
            border: "none",
          }}
        >
          {" "}
        </div>
        <div
          className="sc-s skeleton-container"
          style={{
            width: "300px",
            height: "54px",
            backgroundColor: "var(--dim-gray)",
            border: "none",
          }}
        >
          {" "}
        </div>
      </div>
    );

  return (
    <>
      {triggerLogin && <LoginNOSTR exit={() => setTriggerLogin(false)} />}
      {showMobileMenu && (
        <MenuMobile
          toggleLogin={() => {
            setShowMobileMenu(false);
            setTriggerLogin(true);
          }}
          exit={() => {
            setShowMobileMenu(false);
          }}
        />
      )}
      {showSearchMobile && (
        <SearchMobile
          exit={() => {
            setShowSearchMobile(false);
          }}
        />
      )}
      <div className="fit-container fx-scattered box-marg navbar-mobile">
        <Link to={"/"}>
          <div className="yakihonne-logo-128"></div>
        </Link>
        <div className="fx-centered">
          <div
            className="menu-toggle"
            onClick={() => setShowSearchMobile(!showSearchMobile)}
          >
            <div className="search"></div>
          </div>
          <div
            className={`menu-toggle ${
              showMobileMenu ? "menu-toggle-active" : ""
            }`}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <div className="menu-24"></div>
          </div>
        </div>
      </div>
      <div className="fit-container fx-scattered box-marg navbar">
        <SearchbarNOSTR />
        {nostrUser && nostrUserLoaded && (
          <div
            className="fx-centered"
            style={{ columnGap: "0", position: "relative", zIndex: 200 }}
            ref={ref}
          >
            <div className="fx-centered" style={{ columnGap: "16px" }}>
              <UserProfilePicNOSTR
                size={48}
                mainAccountUser={true}
                allowClick={true}
              />
              <div className="fx-centered fx-start-h fx-start-v fx-col">
                <p>{nostrUser.name || minimizeKey(pubkey)}</p>
                <ShortenKey id={pubkey} />
              </div>
            </div>
            <div
              className="box-pad-h-m box-pad-v-m pointer"
              onClick={() => setShowSettings(!showSettings)}
            >
              <div className="arrow"></div>
            </div>
            {showSettings && (
              <div
                className="sc-s-18 fx-centered fx-start-v fx-col pointer"
                style={{
                  position: "absolute",
                  bottom: "-10px",
                  transform: "translateY(100%)",
                  width: "220px",
                  height: "max-content",
                  zIndex: "900",
                  rowGap: 0,
                }}
              >
                <div
                  className="fx-centered fx-col fx-start-v fit-container"
                  style={{ rowGap: "0" }}
                >
                  <div
                    className="fit-container fx-centered fx-start-h  box-pad-h-m box-pad-v-m nostr-navbar-link"
                    onClick={() =>
                      navigateTo(
                        `/users/${nip19.nprofileEncode({
                          pubkey: nostrKeys.pub,
                          relays: relaysOnPlatform,
                        })}`
                      )
                    }
                  >
                    <div className="user"></div>
                    <p>Profile</p>
                  </div>
                  <hr />

                  <div
                    className="fit-container fx-centered fx-start-h box-pad-h-m  box-pad-v-m nostr-navbar-link"
                    onClick={() => navigateTo(`/bookmarks`)}
                  >
                    <div className="bookmark"></div>
                    <p>Bookmarks</p>
                  </div>
                  <hr />
                  <div
                    className="fit-container fx-centered fx-start-h box-pad-h-m  box-pad-v-m nostr-navbar-link"
                    onClick={() => navigateTo(`/settings`)}
                  >
                    <div className="setting"></div>
                    <p>Settings</p>
                  </div>
                </div>
                <hr />
                <div
                  className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-m nostr-navbar-link"
                  onClick={() => {
                    setShowSettings(false);
                    nostrUserLogout();
                  }}
                >
                  <div className="logout"></div>
                  <p className="c1-c">Logout</p>
                </div>
              </div>
            )}
          </div>
        )}
        {!nostrUser && nostrUserLoaded && (
          <button
            className="btn btn-normal"
            onClick={() => setTriggerLogin(true)}
          >
            Login
          </button>
        )}
      </div>
    </>
  );
}
