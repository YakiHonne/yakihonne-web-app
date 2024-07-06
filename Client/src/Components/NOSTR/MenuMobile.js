import React, { useContext, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Context } from "../../Context/Context";
import ShortenKey from "./ShortenKey";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { getBech32, minimizeKey } from "../../Helpers/Encryptions";
import { nip19 } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";

export default function MenuMobile({ toggleLogin, exit }) {
  const { nostrUser, nostrUserLoaded, nostrUserLogout, nostrKeys } =
    useContext(Context);
  const [pubkey, setPubkey] = useState(
    nostrKeys.pub ? getBech32("npub", nostrKeys.pub) : ""
  );
  const [dismissed, setDismissed] = useState(false);
  const navigateTo = useNavigate();

  useEffect(() => {
    nostrKeys.pub ? setPubkey(getBech32("npub", nostrKeys.pub)) : setPubkey("");
  }, [nostrKeys]);

  const isPage = (url) => {
    if (url === window.location.pathname) return true;
    return false;
  };
  const dismiss = () => {
    setDismissed(true);
    setTimeout(() => {
      exit();
    }, [600]);
  };

  return (
    <div className={`menu-login ${dismissed ? "dismiss" : "slide-up"}`}>
      <div className="fit-container fx-centered" onClick={dismiss}>
        <div className="close-button">
          <div className="arrow"></div>
        </div>
      </div>
      {!nostrUser && nostrUserLoaded && (
        <>
          <div className="fit-container fx-scattered">
            <h4>Join us</h4>
            <button className="btn btn-normal" onClick={toggleLogin}>
              Login
            </button>
          </div>
          <hr style={{ margin: "1rem 0" }} />
        </>
      )}
      {nostrUser && nostrUserLoaded && (
        <div
          className="fx-centered fx-start-h box-pad-v fit-container"
          style={{ columnGap: "16px" }}
        >
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
      )}
      <div className="fx-scattered fx-col" style={{rowGap: '8px'}}>
        <div
          onClick={() => {
            navigateTo("/");
            dismiss();
          }}
          className={`fx-scattered fit-container fx-start-h pointer box-pad-h-s box-pad-v-s ${
            isPage("/") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="home-24"></div>
          <div className="p-big">Home</div>
        </div>
        <div
          onClick={() => {
            navigateTo("/curations");
            dismiss();
          }}
          className={`fx-scattered fit-container fx-start-h pointer box-pad-h-s box-pad-v-s ${
            isPage("/curations") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="curation-24"></div>
          <div className="p-big">Curations</div>
        </div>
     
          <div
            onClick={() => {
              navigateTo("/my-curations");
              dismiss();
            }}
            className={`fx-scattered fit-container fx-start-h pointer box-pad-h-s box-pad-v-s ${
              isPage("/my-curations") ? "active-link" : "inactive-link"
            }`}
          >
            <div className="stories-24"></div>
            <div className="p-big">My curations</div>
          </div>
     
        <Link
          to={"/my-articles"}
          className={`fx-scattered fit-container fx-start-h pointer box-pad-h-s box-pad-v-s ${
            isPage("/my-articles") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="posts-24"></div>
          <div className="p-big">My articles</div>
        </Link>
        {nostrUser && (
          <Link
            to={"/write"}
            className={`fx-scattered fit-container fx-start-h pointer box-pad-h-s box-pad-v-s ${
              isPage("/write") ? "active-link" : "inactive-link"
            }`}
          >
            <div className="edit-24"></div>
            <div className="p-big">Write</div>
          </Link>
        )}
        {/*        
        <div className="fx-centered" style={{ position: "relative" }}>
          <div
            className="pointer box-pad-h-s box-pad-v-s 
               active-fx-scattered fit-container fx-start-h link"
            style={{ backgroundColor: "var(--c3)" }}
            onClick={switchPlatform}
          >
          <div
          <div>Switch to DAOrayaki</div>
              className="switch-arrows-24"
              style={{ filter: "invert()" }}
            ></div>
          </div>
        </div> */}
      </div>
      {nostrUser && nostrUserLoaded && (
        <>
          <hr style={{ margin: "2rem 0" }} />
          <div className="fit-container fx-centered fx-start-v fx-col pointer">
            <div
              className="fx-centered fx-col fx-start-v fit-container"
              style={{ rowGap: "8px" }}
            >
              <div
                className="fit-container fx-centered fx-start-h  box-pad-v-s  box-pad-h-s"
                onClick={() => {
                  navigateTo(`/users/${nip19.nprofileEncode({pubkey: nostrKeys.pub, relays: relaysOnPlatform})}`);
                  dismiss();
                }}
              >
                <div className="user-24"></div>
                <p className="p-big">Profile</p>
              </div>
              <div
                className="fit-container fx-centered fx-start-h  box-pad-v-s  box-pad-h-s"
                onClick={() => {
                  navigateTo(`/bookmarks`);
                  dismiss();
                }}
              >
                <div className="bookmark-24"></div>
                <p className="p-big">Bookmarks</p>
              </div>
              <div
                className="fit-container fx-centered fx-start-h  box-pad-v-s  box-pad-h-s"
                onClick={() => {
                  navigateTo(`/settings`);
                  dismiss();
                }}
              >
                <div className="setting-24"></div>
                <p className="p-big">Settings</p>
              </div>
            </div>
            <div
              className="fit-container fx-centered fx-start-h box-pad-v-s  box-pad-h-s"
              onClick={() => {
                nostrUserLogout();
              }}
            >
              <div className="logout-24"></div>
              <p className="c1-c p-big">Logout</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
