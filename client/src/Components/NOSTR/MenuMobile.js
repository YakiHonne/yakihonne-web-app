import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../../Context/Context";
import ShortenKey from "./ShortenKey";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { getBech32, minimizeKey } from "../../Helpers/Encryptions";
import { nip19 } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import DtoLToggleButton from "../DtoLToggleButton";
import { useMemo } from "react";
import WriteNew from "./WriteNew";
import NotificationCenter from "./NotificationCenter";
import { getConnectedAccounts } from "../../Helpers/Helpers";
import LoginNOSTR from "./LoginNOSTR";

export default function MenuMobile({ toggleLogin, exit }) {
  const {
    nostrUser,
    nostrUserLoaded,
    userLogout,
    logoutAllAccounts,
    nostrKeys,
    chatrooms,
    nostrUserAbout,
    handleSwitchAccount,
  } = useContext(Context);
  const isNewMsg = useMemo(() => {
    return chatrooms.find((chatroom) => !chatroom.checked);
  }, [chatrooms]);
  const [pubkey, setPubkey] = useState(
    nostrKeys.pub ? getBech32("npub", nostrKeys.pub) : ""
  );
  const [triggerLogin, setTriggerLogin] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigateTo = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showMyContent, setShowMyContent] = useState(false);
  const [showWritingOptions, setShowWritingOptions] = useState(false);
  const accounts = useMemo(() => {
    return getConnectedAccounts();
  }, [nostrKeys, nostrUserAbout]);
  const settingsRef = useRef(null);
  const myContentRef = useRef(null);
  const writingOpt = useRef(null);
  useEffect(() => {
    nostrKeys.pub ? setPubkey(getBech32("npub", nostrKeys.pub)) : setPubkey("");
  }, [nostrKeys]);

  useEffect(() => {
    const handleOffClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target))
        setShowSettings(false);
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [settingsRef]);
  useEffect(() => {
    const handleOffClick = (e) => {
      if (myContentRef.current && !myContentRef.current.contains(e.target))
        setShowMyContent(false);
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [myContentRef]);
  useEffect(() => {
    const handleOffClick = (e) => {
      if (writingOpt.current && !writingOpt.current.contains(e.target))
        setShowWritingOptions(false);
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [writingOpt]);

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
      <div className="fit-container fx-centered sticky" onClick={dismiss}>
        <div className="arrow"></div>
      </div>
      {triggerLogin && <LoginNOSTR exit={() => setTriggerLogin(false)} />}
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
            size={32}
            mainAccountUser={true}
            allowClick={true}
            ring={false}
          />
          <div className="fx-centered fx-start-h fx-start-v">
            <p>{nostrUser.name || minimizeKey(pubkey)}</p>
            <ShortenKey id={pubkey} />
          </div>
        </div>
      )}
      <div className="fx-scattered fx-col" style={{ rowGap: "8px" }}>
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
            navigateTo("/articles");
            dismiss();
          }}
          className={`fx-scattered fit-container fx-start-h pointer box-pad-h-s box-pad-v-s ${
            isPage("/articles") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="posts-24"></div>
          <div className="p-big">Articles</div>
        </div>
        <div
          onClick={() => {
            navigateTo("/notes");
            dismiss();
          }}
          className={`fx-scattered fit-container fx-start-h pointer box-pad-h-s box-pad-v-s ${
            isPage("/notes") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="posts-24"></div>
          <div className="p-big">Notes</div>
        </div>
        <div
          onClick={() => {
            navigateTo("/smart-widgets");
            dismiss();
          }}
          className={`fx-scattered fit-container fx-start-h pointer box-pad-h-s box-pad-v-s ${
            isPage("/smart-widgets") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="smart-widget-24"></div>
          <div className="p-big">Smart widget</div>
        </div>
        <div
          onClick={() => {
            navigateTo("/flash-news");
            dismiss();
          }}
          className={`fx-scattered fit-container fx-start-h pointer box-pad-h-s box-pad-v-s ${
            isPage("/flash-news") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="note-24"></div>
          <div className="p-big">Flash news</div>
        </div>
        <div
          onClick={() => {
            navigateTo("/uncensored-notes");
            dismiss();
          }}
          className={`fx-scattered fit-container fx-start-h pointer box-pad-h-s box-pad-v-s ${
            isPage("/uncensored-notes") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="news-24"></div>
          <div className="p-big">Uncensored notes</div>
        </div>
        <div
          onClick={() => {
            navigateTo("/videos");
            dismiss();
          }}
          className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
            isPage("/videos") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="play-24"></div>
          <div className="link-label p-big">Videos</div>
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
            navigateTo("/buzz-feed");
            dismiss();
          }}
          className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
            isPage("/buzz-feed") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="buzz-24"></div>
          <div className="link-label p-big">Buzz feed</div>
        </div>

        <div
          onClick={() => {
            navigateTo("/messages");
            dismiss();
          }}
          className={`pointer fit-container fx-scattered box-pad-h-s box-pad-v-s ${
            isPage("/messages") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="fx-centered">
            <div className="env-24"></div>
            <div className="link-labe p-big">Messages</div>
          </div>
          {isNewMsg && (
            <div
              style={{
                minWidth: "8px",
                aspectRatio: "1/1",
                backgroundColor: "var(--red-main)",
                borderRadius: "var(--border-r-50)",
              }}
            ></div>
          )}
        </div>
        <NotificationCenter />
        <div
          className="fx-start-h fx-centered fit-container fx-col"
          ref={myContentRef}
        >
          {nostrKeys && (
            <div
              className={`pointer fit-container fx-scattered box-pad-h-s box-pad-v-s ${
                showMyContent ||
                isPage("/my-flash-news") ||
                isPage("/my-curations") ||
                isPage("/my-articles") ||
                isPage("/bookmarks")
                  ? "active-link"
                  : "inactive-link"
              }`}
              style={{ position: "relative" }}
              onClick={(e) => {
                e.stopPropagation();
                setShowMyContent(!showMyContent);
              }}
            >
              <div className="fx-centered">
                <div className="folder-24"></div>
                <div className="link-label p-big">My content</div>
              </div>
              <div className="arrow"></div>
            </div>
          )}
          {showMyContent && nostrKeys && (
            <div
              className="fit-container fx-centered fx-start-v fx-col pointer slide-down"
              style={{
                paddingLeft: "2rem",
                zIndex: "900",
                rowGap: 0,
              }}
            >
              <div
                className="fx-centered fx-col fx-start-v fit-container"
                style={{ rowGap: "6px" }}
              >
                <div
                  onClick={() => {
                    navigateTo("/my-notes");
                    dismiss();
                  }}
                  className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                    isPage("/my-notes") ? "active-link" : "inactive-link"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="note-24"></div>
                  <div className="link-label p-big">Notes</div>
                </div>
                <hr />

                <div
                  onClick={() => {
                    navigateTo("/my-articles");
                    dismiss();
                  }}
                  className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                    isPage("/my-articles") ? "active-link" : "inactive-link"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="posts-24"></div>
                  <div className="link-label p-big">Articles</div>
                </div>
                <hr />

                <div
                  onClick={() => {
                    navigateTo("/my-flash-news");
                    dismiss();
                  }}
                  className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                    isPage("/my-flash-news") ? "active-link" : "inactive-link"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="news-24"></div>
                  <div className="link-label p-big">Flash news</div>
                </div>
                <hr />

                <div
                  onClick={() => {
                    navigateTo("/my-videos");
                    dismiss();
                  }}
                  className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                    isPage("/my-videos") ? "active-link" : "inactive-link"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="stories-24"></div>
                  <div className="link-label p-big">Videos</div>
                </div>
                <hr />
                <div
                  onClick={() => {
                    navigateTo("/my-curations");
                    dismiss();
                  }}
                  className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                    isPage("/my-curations") ? "active-link" : "inactive-link"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="stories-24"></div>
                  <div className="link-label p-big">Curations</div>
                </div>
                <hr />
                <div
                  onClick={() => {
                    navigateTo("/bookmarks");
                    dismiss();
                  }}
                  className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                    isPage("/bookmarks") ? "active-link" : "inactive-link"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="bookmark-i-24"></div>
                  <div className="link-label p-big">Bookmarks</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <WriteNew exit={dismiss} />
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
                  navigateTo(
                    `/users/${nip19.nprofileEncode({
                      pubkey: nostrKeys.pub,
                      relays: relaysOnPlatform,
                    })}`
                  );
                  dismiss();
                }}
              >
                <div className="user-24"></div>
                <p className="p-big">Profile</p>
              </div>
              <div
                className="fit-container fx-centered fx-start-h  box-pad-v-s  box-pad-h-s"
                onClick={() => navigateTo(`/yaki-points`)}
              >
                <div className="cup-24"></div>
                <p className="p-big">Yaki points</p>
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
                userLogout();
              }}
            >
              <div className="logout-24"></div>
              <p className="fx-centered p-big">
                Logout
                <span className="sticker sticker-normal sticker-orange-side">
                  {" "}
                  {nostrUserAbout.name ||
                    nostrUserAbout.display_name ||
                    minimizeKey(nostrKeys.pub)}
                </span>
              </p>
            </div>
          </div>
          <hr style={{ margin: "1rem 0" }} />
          <div className="fit-container fx-centered fx-col box-pad-h-s box-pad-v-s">
            <div className="fit-container">
              <p className="gray-c">SWITCH ACCOUNT</p>
            </div>
            <div className="fit-container">
              {accounts.map((account) => {
                return (
                  <div
                    className="fit-container sc-s-18 box-pad-h-s box-pad-v-s fx-scattered option pointer"
                    style={{
                      backgroundColor:
                        nostrKeys.pub !== account.pubkey
                          ? "transparent"
                          : "var(--dim-gray)",
                      border: "none",
                      borderRadius: "10px",
                    }}
                    key={account.pubkey}
                    onClick={() => {
                      handleSwitchAccount(account);
                      setShowSettings(false);
                      dismiss();
                    }}
                  >
                    <div className="fx-centered">
                      <div style={{ pointerEvents: "none" }}>
                        <UserProfilePicNOSTR
                          size={32}
                          mainAccountUser={false}
                          img={account.picture}
                          allowClick={false}
                          ring={false}
                        />
                      </div>
                      <div>
                        <p className="p-one-line">
                          {account.display_name ||
                            account.name ||
                            minimizeKey(nostrKeys.pub)}
                        </p>
                        <p className="gray-c p-medium p-one-line">
                          @
                          {account.name ||
                            account.display_name ||
                            minimizeKey(account.pubkey)}
                        </p>
                      </div>
                    </div>
                    <div>
                      {nostrKeys.pub !== account.pubkey && (
                        <div
                          className="fx-centered"
                          style={{
                            border: "1px solid var(--gray)",
                            borderRadius: "var(--border-r-50)",
                            minWidth: "14px",
                            aspectRatio: "1/1",
                          }}
                        ></div>
                      )}
                      {nostrKeys.pub === account.pubkey && (
                        <div
                          className="fx-centered"
                          style={{
                            borderRadius: "var(--border-r-50)",
                            backgroundColor: "var(--orange-main)",
                            minWidth: "14px",
                            aspectRatio: "1/1",
                          }}
                        >
                          <div
                            style={{
                              borderRadius: "var(--border-r-50)",
                              backgroundColor: "white",
                              minWidth: "6px",
                              aspectRatio: "1/1",
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="fit-container fx-centered box-pad-h-m box-pad-v-m sc-s-d option pointer"
              style={{
                backgroundColor: "transparent",
                borderColor: "var(--gray)",
                borderRadius: "10px",
              }}
              onClick={(e) => {
                // e.stopPropagation();
                setTriggerLogin(true);
              }}
            >
              <div className="plus-sign"></div>
              <p className="gray-c">Add account</p>
            </div>
            <div
              className="fit-container fx-centered fx-start-h"
              onClick={() => {
                logoutAllAccounts();
              }}
            >
              <div
                className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-m sc-s-18"
                style={{
                  backgroundColor: "var(--dim-gray)",
                  borderRadius: "10px",
                }}
              >
                <div className="logout"></div>
                <p>Logout of all accounts</p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="fit-container fx-centered fx-start-h  box-pad-v-s  box-pad-h-s">
        <div>
          <div className="pointer fx-centered ">
            <DtoLToggleButton isMobile={true} />
          </div>
        </div>
      </div>
      <div
        className="fit-container fx-centered fx-start-h  box-pad-v-s  box-pad-h-s"
        onClick={() => {
          navigateTo(`/yakihonne-mobile-app`);
          dismiss();
        }}
      >
        <div className="mobile-24"></div>
        <p className="p-big">Get the app</p>
      </div>
    </div>
  );
}
