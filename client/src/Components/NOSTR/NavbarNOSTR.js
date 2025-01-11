import React, { useContext, useEffect, useRef, useState } from "react";
import { Context } from "../../Context/Context";
import { getBech32 } from "../../Helpers/Encryptions";
import LoginNOSTR from "./LoginNOSTR";
import { Link } from "react-router-dom";
import MenuMobile from "./MenuMobile";
import SearchMobile from "./SearchMobile";

export default function NavbarNOSTR({ margin = true }) {
  const { nostrUser, nostrUserLoaded, nostrKeys } = useContext(Context);
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

  if (
    [
      "/yakihonne-mobile-app",
      "/yakihonne-flash-news",
      "/yakihonne-smart-widgets",
      "/privacy",
      "/terms",
      "/points-system",
    ].includes(window.location.pathname)
  )
    return;

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
      <div
        className={`fit-container fx-scattered  navbar-mobile box-pad-h-m box-pad-v-m`}
      >
        <Link to={"/"}>
          <div
            className="yakihonne-logo"
            style={{
              filter: "brightness(0) invert()",
              width: "100px",
              height: "60px",
            }}
          ></div>
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
    </>
  );
}
