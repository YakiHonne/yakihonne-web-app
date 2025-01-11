import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../../Context/Context";
import DtoLToggleButton from "../DtoLToggleButton";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { minimizeKey } from "../../Helpers/Encryptions";
import { nip19 } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import LoginNOSTR from "./LoginNOSTR";
import { useMemo } from "react";
import NotificationCenter from "./NotificationCenter";
import { useEffect } from "react";
import { useRef } from "react";
import ProgressCirc from "../ProgressCirc";
import LoadingDots from "../LoadingDots";
import LoginWithAPI from "./LoginWithAPI";
import WriteNew from "./WriteNew";
import UserBalance from "./UserBalance";
import NumberShrink from "../NumberShrink";
import { getConnectedAccounts } from "../../Helpers/Helpers";

export default function SidebarNOSTR() {
  const {
    handleSwitchAccount,
    userLogout,
    logoutAllAccounts,
    nostrKeys,
    nostrUserAbout,
    chatrooms,
    yakiChestStats,
    isYakiChestLoaded,
    updatedActionFromYakiChest,
  } = useContext(Context);
  const navigateTo = useNavigate();
  const [triggerLogin, setTriggerLogin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMyContent, setShowMyContent] = useState(false);
  const [showWritingOptions, setShowWritingOptions] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const settingsRef = useRef(null);
  const myContentRef = useRef(null);
  const mediaRef = useRef(null);
  const writingOptRef = useRef(null);
  const mainFrame = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [showYakiChest, setShowYakiChest] = useState(false);
  const accounts = useMemo(() => {
    return getConnectedAccounts();
  }, [nostrKeys, nostrUserAbout]);
  const [isAccountSwitching, setIsAccountSwitching] = useState(false);

  const isNewMsg = useMemo(() => {
    return chatrooms.find((chatroom) => !chatroom.checked);
  }, [chatrooms]);
  const isPage = (url) => {
    if (url === window.location.pathname) return true;
    return false;
  };

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
    let handleOffClick = (e) => {
      if (myContentRef.current && !myContentRef.current.contains(e.target))
        setShowMyContent(false);
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [myContentRef]);

  useEffect(() => {
    let handleOffClick = (e) => {
      if (writingOptRef.current && !writingOptRef.current.contains(e.target))
        setShowWritingOptions(false);
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [writingOptRef]);

  useEffect(() => {
    let handleOffClick = (e) => {
      if (mainFrame.current && !mainFrame.current.contains(e.target))
        setIsActive(false);
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [mainFrame]);

  useEffect(() => {
    let handleOffClick = (e) => {
      if (mediaRef.current && !mediaRef.current.contains(e.target)) {
        setShowMedia(false);
      }
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [mediaRef]);

  return (
    <>
      {showYakiChest && <LoginWithAPI exit={() => setShowYakiChest(false)} />}
      {isAccountSwitching && (
        <AccountSwitching exit={() => setIsAccountSwitching(false)} />
      )}
      <div
        className="fx-scattered fx-end-v nostr-sidebar box-pad-v-m fx-col "
        style={{
          paddingBottom: "1em",
          paddingRight: ".5rem",
          zIndex: isActive ? 1000 : 200,
        }}
        onClick={() => setIsActive(true)}
        ref={mainFrame}
      >
        {triggerLogin && <LoginNOSTR exit={() => setTriggerLogin(false)} />}
        <div
          className="fx-scattered fx-start-v fx-col fit-container"
          style={{ height: "100%" }}
        >
          <div className="fx-start-h fx-centered fx-col fit-container">
            <div className="fx-centered fx-start-h fit-container">
              <div
                className="yakihonne-logo-128"
                onClick={() => navigateTo("/")}
              ></div>
            </div>
            <div className="mb-show" style={{ height: "200px" }}></div>
            <UserBalance />
            <div
              className="fit-container link-items fx-scattered fx-col fx-start-v "
              style={{ rowGap: 0, maxHeight: "71vh" }}
            >
              <div
                onClick={() => {
                  navigateTo("/");
                }}
                className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                  isPage("/") ? "active-link" : "inactive-link"
                }`}
              >
                <div className={isPage("/") ? "home-bold-24" : "home-24"}></div>
                <div className="link-label">Home</div>
              </div>
              <div
                className="fit-container fx-centered fx-col fx-end-v"
                ref={mediaRef}
                style={{
                  position: "relative",
                }}
              >
                <div
                  className={`pointer fit-container  fx-scattered box-pad-h-s box-pad-v-s ${
                    showMedia ||
                    isPage("/flash-news") ||
                    isPage("/curations") ||
                    isPage("/articles") ||
                    isPage("/uncensored-notes") ||
                    isPage("/videos")
                      ? "active-link"
                      : "inactive-link"
                  }`}
                  onClick={() => setShowMedia(!showMedia)}
                >
                  <div className="fx-centered">
                    <div
                      className={
                        showMedia ||
                        isPage("/flash-news") ||
                        isPage("/curations") ||
                        isPage("/articles") ||
                        isPage("/uncensored-notes") ||
                        isPage("/videos")
                          ? "media-bold-24"
                          : "media-24"
                      }
                    ></div>
                    <div className="link-label">Media</div>
                  </div>
                  <div className="link-label arrow"></div>
                </div>
                {showMedia && (
                  <div
                    className="fx-centered fx-start-v fx-col pointer slide-left"
                    style={{
                      height: "max-content",
                      zIndex: "900",
                      rowGap: 0,
                      zIndex: 200,
                    }}
                  >
                    <div
                      className="fx-centered fx-col fx-start-v fit-container"
                      style={{ rowGap: "0" }}
                    >
                      <div
                        onClick={() => navigateTo("/articles")}
                        className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                          isPage("/articles") ? "active-link" : "inactive-link"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        <div
                          className={
                            isPage("/articles") ? "posts-bold-24" : "posts-24"
                          }
                        ></div>
                        <div>Articles</div>
                      </div>
                      <div
                        onClick={() => navigateTo("/flash-news")}
                        className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                          isPage("/flash-news")
                            ? "active-link"
                            : "inactive-link"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        <div
                          className={
                            isPage("/flash-news") ? "news-bold-24" : "news-24"
                          }
                        ></div>
                        <div>Flash news</div>
                      </div>
                      <div
                        onClick={() => navigateTo("/uncensored-notes")}
                        className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                          isPage("/uncensored-notes")
                            ? "active-link"
                            : "inactive-link"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        <div
                          className={
                            isPage("/uncensored-notes")
                              ? "note-bold-24"
                              : "note-24"
                          }
                        ></div>
                        <div>Uncensored notes</div>
                      </div>
                      <div
                        onClick={() => navigateTo("/videos")}
                        className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                          isPage("/videos") ? "active-link" : "inactive-link"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        <div
                          className={
                            isPage("/videos") ? "play-bold-24" : "play-24"
                          }
                        ></div>
                        <div>Videos</div>
                      </div>
                      <div
                        onClick={() => navigateTo("/curations")}
                        className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                          isPage("/curations") ? "active-link" : "inactive-link"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        <div
                          className={
                            isPage("/curations")
                              ? "curation-bold-24"
                              : "curation-24"
                          }
                        ></div>
                        <div>Curations</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div
                onClick={() => {
                  navigateTo("/notes");
                }}
                className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                  isPage("/notes") ? "active-link" : "inactive-link"
                }`}
              >
                <div
                  className={isPage("/notes") ? "note-2-bold-24" : "note-2-24"}
                ></div>
                <div className="link-label">Notes</div>
              </div>
              <div
                onClick={() => {
                  navigateTo("/smart-widgets");
                }}
                className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                  isPage("/smart-widgets") ? "active-link" : "inactive-link"
                }`}
              >
                <div
                  className={
                    isPage("/smart-widgets")
                      ? "smart-widget-24"
                      : "smart-widget-24"
                  }
                ></div>
                <div className="link-label">Smart widgets</div>
              </div>
              {!(showMedia || showMyContent || showWritingOptions) && (
                <>
                  <div
                    onClick={() => navigateTo("/buzz-feed")}
                    className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                      isPage("/buzz-feed") ? "active-link" : "inactive-link"
                    }`}
                  >
                    <div
                      className={
                        isPage("/buzz-feed") ? "buzz-bold-24" : "buzz-24"
                      }
                    ></div>
                    <div className="link-label">Buzz feed</div>
                  </div>
                  <div
                    onClick={() => navigateTo("/messages")}
                    className={`pointer fit-container fx-scattered box-pad-h-s box-pad-v-s ${
                      isPage("/messages") ? "active-link" : "inactive-link"
                    }`}
                  >
                    <div className="fx-centered">
                      <div
                        className={
                          isPage("/messages") ? "env-bold-24" : "env-24"
                        }
                      ></div>
                      <div className="link-label">Messages</div>
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
                </>
              )}
              {nostrKeys && (
                <div
                  className="fit-container fx-centered fx-col fx-end-v"
                  ref={myContentRef}
                  style={{
                    position: "relative",
                  }}
                >
                  <div
                    className={`pointer fit-container fx-scattered box-pad-h-s box-pad-v-s ${
                      showMyContent ||
                      isPage("/my-flash-news") ||
                      isPage("/my-curations") ||
                      isPage("/my-articles") ||
                      isPage("/my-notes") ||
                      isPage("/bookmarks")
                        ? "active-link"
                        : "inactive-link"
                    }`}
                    onClick={() => setShowMyContent(!showMyContent)}
                  >
                    <div className="fx-centered">
                      <div
                        className={
                          showMyContent ||
                          isPage("/my-flash-news") ||
                          isPage("/my-curations") ||
                          isPage("/my-articles") ||
                          isPage("/my-videos") ||
                          isPage("/my-notes") ||
                          isPage("/bookmarks")
                            ? "folder-bold-24"
                            : "folder-24"
                        }
                      ></div>
                      <div className="link-label">My content</div>
                    </div>
                    <div className="link-label arrow"></div>
                  </div>
                  {showMyContent && (
                    <div
                      className="fx-centered fx-start-v fx-col pointer slide-left"
                      style={{
                        height: "max-content",
                        zIndex: "900",
                        rowGap: 0,
                        zIndex: 200,
                      }}
                    >
                      <div
                        className="fx-centered fx-col fx-start-v fit-container"
                        style={{ rowGap: "0" }}
                      >
                        <div
                          onClick={() => navigateTo("/my-notes")}
                          className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                            isPage("/my-notes")
                              ? "active-link"
                              : "inactive-link"
                          }`}
                          style={{ borderRadius: 0 }}
                        >
                          <div
                            className={
                              isPage("/my-notes") ? "note-bold-24" : "note-24"
                            }
                          ></div>
                          <div>Notes</div>
                        </div>
                        <div
                          onClick={() => navigateTo("/my-articles")}
                          className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                            isPage("/my-articles")
                              ? "active-link"
                              : "inactive-link"
                          }`}
                          style={{ borderRadius: 0 }}
                        >
                          <div
                            className={
                              isPage("/my-articles")
                                ? "posts-bold-24"
                                : "posts-24"
                            }
                          ></div>
                          <div>Articles</div>
                        </div>
                        <div
                          onClick={() => navigateTo("/my-flash-news")}
                          className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                            isPage("/my-flash-news")
                              ? "active-link"
                              : "inactive-link"
                          }`}
                          style={{ borderRadius: 0 }}
                        >
                          <div
                            className={
                              isPage("/my-flash-news")
                                ? "news-bold-24"
                                : "news-24"
                            }
                          ></div>
                          <div>Flash news</div>
                        </div>
                        <div
                          onClick={() => navigateTo("/my-videos")}
                          className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                            isPage("/my-videos")
                              ? "active-link"
                              : "inactive-link"
                          }`}
                          style={{ borderRadius: 0 }}
                        >
                          <div
                            className={
                              isPage("/my-videos") ? "play-bold-24" : "play-24"
                            }
                          ></div>
                          <div>Videos</div>
                        </div>
                        <div
                          onClick={() => navigateTo("/my-curations")}
                          className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                            isPage("/my-curations")
                              ? "active-link"
                              : "inactive-link"
                          }`}
                          style={{ borderRadius: 0 }}
                        >
                          <div
                            className={
                              isPage("/my-curations")
                                ? "curation-bold-24"
                                : "curation-24"
                            }
                          ></div>
                          <div>Curations</div>
                        </div>
                        <div
                          onClick={() => navigateTo("/bookmarks")}
                          className={`pointer fit-container fx-start-h fx-centered box-pad-h-s box-pad-v-s ${
                            isPage("/bookmarks")
                              ? "active-link"
                              : "inactive-link"
                          }`}
                          style={{ borderRadius: 0 }}
                        >
                          <div
                            className={
                              isPage("/bookmarks")
                                ? "bookmark-i-bold-24"
                                : "bookmark-i-24"
                            }
                          ></div>
                          <div>Bookmarks</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!nostrKeys &&
                !(showMedia || showMyContent || showWritingOptions) && (
                  <div>
                    <div className="pointer fx-centered inactive-link">
                      <DtoLToggleButton />
                    </div>
                  </div>
                )}
              <div style={{ height: ".5rem" }}></div>
              <WriteNew exit={() => null} />
            </div>
            {(showMedia || showMyContent || showWritingOptions) && (
              <div className="fit-container fx-start-h fx-centered box-pad-h-s">
                <div
                  className="fx-centered fx-col round-icon"
                  style={{ rowGap: 0, rotate: "-90deg" }}
                >
                  <p className="gray-c fx-centered" style={{ height: "6px" }}>
                    &#x2022;
                  </p>
                  <p className="gray-c fx-centered" style={{ height: "6px" }}>
                    &#x2022;
                  </p>
                  <p className="gray-c fx-centered" style={{ height: "6px" }}>
                    &#x2022;
                  </p>
                </div>
              </div>
            )}
          </div>
          {nostrKeys && (
            <div
              className="fx-scattered fx-col fit-container sidebar-user-settings "
              style={{ position: "relative" }}
              ref={settingsRef}
            >
              <div
                className="fit-container sidebar-user-settings-button"
                style={{ overflow: "visible" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsActive(true);
                  setShowSettings(!showSettings);
                }}
              >
                <div
                  className="fx-centered fx-start-h pointer"
                  style={{ columnGap: "16px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsActive(true);
                    setShowSettings(!showSettings);
                  }}
                >
                  <div className="mb-hide" style={{ pointerEvents: "none" }}>
                    <UserProfilePicNOSTR
                      size={50}
                      mainAccountUser={true}
                      allowClick={false}
                      ring={false}
                    />
                  </div>
                  <div className="mb-show" style={{ pointerEvents: "none" }}>
                    <UserProfilePicNOSTR
                      size={40}
                      mainAccountUser={true}
                      allowClick={false}
                      ring={false}
                    />
                  </div>
                  <div className="mb-hide">
                    <p className="p-one-line">
                      {nostrUserAbout.display_name ||
                        nostrUserAbout.name ||
                        minimizeKey(nostrKeys.pub)}
                    </p>
                    <p className="gray-c p-medium p-one-line">
                      @
                      {nostrUserAbout.name ||
                        nostrUserAbout.display_name ||
                        minimizeKey(nostrKeys.pub)}
                    </p>
                  </div>
                </div>
                {isYakiChestLoaded && !yakiChestStats && (
                  <div
                    className="round-icon round-icon-tooltip purple-pulse"
                    data-tooltip={"Yaki chest"}
                    style={{ minWidth: "40px", minHeight: "40px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowYakiChest(true);
                    }}
                  >
                    <div className="cup"></div>
                  </div>
                )}
                {isYakiChestLoaded && yakiChestStats && (
                  <div style={{ position: "relative" }}>
                    {updatedActionFromYakiChest && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          bottom: "calc(100% + 5px)",
                          width: "54px",
                          aspectRatio: "1/1",
                          borderRadius: "var(--border-r-50)",
                          backgroundColor: "var(--c1-side)",
                        }}
                        className="fx-centered slide-up-down"
                      >
                        <p>
                          <NumberShrink
                            value={updatedActionFromYakiChest.points}
                          />
                          <span className="gray-c p-medium">xp</span>
                        </p>
                      </div>
                    )}
                    <ProgressCirc
                      sidebar={true}
                      size={50}
                      percentage={
                        (yakiChestStats.inBetweenLevelPoints * 100) /
                        yakiChestStats.totalPointInLevel
                      }
                      innerComp={
                        <div
                          className="fx-centered fx-col"
                          style={{ rowGap: 0 }}
                        >
                          <p className="orange-c p-small mb-hide">
                            {yakiChestStats.xp} xp
                          </p>
                          <p className="gray-c p-small">
                            Lvl {yakiChestStats.currentLevel}
                          </p>
                        </div>
                      }
                      tooltip={`Level ${yakiChestStats.currentLevel}`}
                    />
                  </div>
                )}
                {!isYakiChestLoaded && <LoadingDots />}
              </div>
              {showSettings && (
                <div
                  className="sc-s-18 fx-centered fx-start-v fx-col pointer slide-left"
                  style={{
                    position: "absolute",
                    bottom: "110%",
                    left: "0",
                    width: "240px",
                    height: "max-content",
                    backgroundColor: "var(--very-dim-gray)",
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
                      style={{ padding: ".75rem 1rem" }}
                    >
                      <div className="user"></div>
                      <p className="gray-c">Profile</p>
                    </div>
                    <div
                      className="fit-container fx-centered fx-start-h box-pad-h-m  box-pad-v-m nostr-navbar-link"
                      onClick={() => navigateTo(`/yaki-points`)}
                      style={{ padding: ".75rem 1rem" }}
                    >
                      <div className="cup"></div>
                      <p className="gray-c">Yaki points</p>
                    </div>

                    <div
                      className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-m nostr-navbar-link"
                      onClick={() => navigateTo(`/settings`)}
                      style={{ padding: ".75rem 1rem" }}
                    >
                      <div className="setting"></div>
                      <p className="gray-c">Settings</p>
                    </div>

                    <div
                      className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-m nostr-navbar-link"
                      style={{ padding: ".75rem 1rem" }}
                    >
                      <DtoLToggleButton small={true} />
                    </div>
                    <div
                      className="fit-container fx-centered fx-start-h box-pad-h-s box-pad-v-m nostr-navbar-link"
                      onClick={() => {
                        setShowSettings(false);
                        userLogout();
                      }}
                      style={{ padding: ".75rem 1rem" }}
                    >
                      <div className="logout"></div>
                      <p className="fx-centered">
                        Logout
                        <span className="sticker sticker-normal sticker-small sticker-orange-side">
                          {" "}
                          {nostrUserAbout.name ||
                            nostrUserAbout.display_name ||
                            minimizeKey(nostrKeys.pub)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <hr />
                  <div className="fit-container fx-centered fx-col box-pad-h-s box-pad-v-s">
                    <div className="fit-container">
                      <p className="gray-c p-small">SWITCH ACCOUNT</p>
                    </div>
                    <div className="fit-container">
                      {accounts.map((account) => {
                        return (
                          <div
                            className="fit-container sc-s-18 box-pad-h-s box-pad-v-s fx-scattered option"
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
                              setIsAccountSwitching(true);
                              setShowSettings(false);
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
                                <p className="p-one-line p-medium">
                                  {account.display_name ||
                                    account.name ||
                                    minimizeKey(nostrKeys.pub)}
                                </p>
                                <p className="gray-c p-small p-one-line">
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
                      className="fit-container fx-centered box-pad-h-m box-pad-v-s sc-s-d option"
                      style={{
                        backgroundColor: "transparent",
                        borderColor: "var(--gray)",
                        borderRadius: "10px",
                      }}
                      onClick={(e) => {
                        setTriggerLogin(true);
                      }}
                    >
                      <div className="plus-sign"></div>
                      <p className="gray-c p-medium">Add account</p>
                    </div>
                  </div>
                  <div
                    className="fit-container fx-centered fx-start-h box-pad-h-s box-pad-v-s"
                    onClick={() => {
                      setShowSettings(false);
                      logoutAllAccounts();
                    }}
                  >
                    <div
                      className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-s sc-s-18"
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
              )}
            </div>
          )}
          {!nostrKeys && (
            <button
              className="btn btn-normal btn-full fx-centered"
              onClick={() => setTriggerLogin(true)}
            >
              <div className="link-label">Login</div>
              <div className="connect-24"></div>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

const AccountSwitching = ({ exit }) => {
  const { nostrUserAbout } = useContext(Context);
  useEffect(() => {
    let timeout = setTimeout(() => {
      exit();
    }, 2000);
    return () => {
      clearTimeout(timeout);
    };
  }, []);
  return (
    <div className="fixed-container fx-centered">
      <div className="fx-centered fx-col">
        <div className="fx-centered popout">
          <div
            className="purple-pulse"
            style={{ borderRadius: "var(--border-r-50)" }}
          >
            <UserProfilePicNOSTR
              size={200}
              mainAccountUser={true}
              allowClick={false}
              ring={false}
            />
          </div>
        </div>
        <div className="box-pad-v fx-centered fx-col">
          <p className="orange-c p-medium">Switching to</p>
          <h3>{nostrUserAbout.display_name || nostrUserAbout.name}</h3>
          <p className="gray-c">@{nostrUserAbout.name}</p>
        </div>
      </div>
    </div>
  );
};
