import React, { useContext, useMemo } from "react";
import { Context } from "../../Context/Context";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { useState } from "react";
import PagePlaceholder from "../../Components/PagePlaceholder";
import LoadingScreen from "../../Components/LoadingScreen";
import { useEffect } from "react";
import { nip19, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import Date_ from "../../Components/Date_";
import ToDeletePostNOSTR from "../../Components/NOSTR/ToDeletePostNOSTR";
import placeholder from "../../media/images/nostr-thumbnail-ph.svg";
import { Link, useNavigate } from "react-router-dom";
import LoadingDots from "../../Components/LoadingDots";
import { Helmet } from "react-helmet";
import { convertDate, filterRelays } from "../../Helpers/Encryptions";
import { getImagePlaceholder } from "../../Content/NostrPPPlaceholder";
import Footer from "../../Components/Footer";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import HomeFN from "../../Components/NOSTR/HomeFN";
import axios from "axios";

var pool = new SimplePool();

const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

const randomColors = Array(100)
  .fill(0, 0, 100)
  .map((item) => {
    let randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
    while (randomColor.toLowerCase() === "#ffffff" || randomColor.length < 7)
      randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
    return randomColor;
  });

export default function NostrMyPosts() {
  const { nostrKeys, nostrUser, nostrUserLoaded, isPublishing, setToast } =
    useContext(Context);
  const navigateTo = useNavigate();
  const [relays, setRelays] = useState(relaysOnPlatform);
  const [importantFN, setImportantFN] = useState(false);
  const [activeRelay, setActiveRelay] = useState("");
  const [posts, setPosts] = useState([]);
  const [tempPosts, setTempPosts] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [postToDelete, setPostToDelete] = useState(false);
  const [showRelaysList, setShowRelaysList] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [postKind, setPostKind] = useState(0);
  const articlesNumber = useMemo(() => {
    if (postKind === 0)
      return posts.length >= 10 || posts.length === 0
        ? posts.length
        : `0${posts.length}`;
    let num = posts.filter((item) => item.kind === postKind).length;
    return num >= 10 || num === 0 ? num : `0${num}`;
  }, [postKind, posts]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setPosts([]);
        setTempPosts([]);
        let tPosts = [];
        let relaysToFetchFrom =
          activeRelay == ""
            ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
            : [activeRelay];
        pool.trackRelays = true;
        var sub = pool.subscribeMany(
          relaysToFetchFrom,
          [{ kinds: [30023, 30024], authors: [nostrKeys.pub] }],
          {
            onevent(event) {
              let d = event.tags.find((tag) => tag[0] === "d")[1];
              tPosts.push({ id: event.id, kind: event.kind, d });
              setPosts((prev) => {
                let index = prev.findIndex(
                  (item) => item.d === d && item.kind === event.kind
                );
                let newP = Array.from(prev);
                if (index === -1) newP = [...newP, extractData(event)];
                if (index !== -1) {
                  if (prev[index].created_at < event.created_at) {
                    newP.splice(index, 1);
                    newP.push(extractData(event));
                  }
                }

                newP = newP.sort(
                  (item_1, item_2) => item_2.created_at - item_1.created_at
                );

                return newP;
              });
              setIsLoaded(true);
            },
            oneose() {
              setIsLoaded(true);
              setIsLoading(false);
              setTempPosts(tPosts);
            },
          }
        );
      } catch (err) {
        console.log(err);
        setIsLoading(false);
      }
    };
    if (nostrKeys && nostrUserLoaded) {
      fetchData();
      return;
    }
    if (!nostrKeys && nostrUserLoaded) {
      setIsLoaded(true);
    }
  }, [nostrKeys, nostrUserLoaded, activeRelay]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [important] = await Promise.all([
          axios.get(API_BASE_URL + "/api/v1/mb/flashnews/important"),
        ]);

        setImportantFN(important.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  const extractData = (post) => {
    let modified_date = new Date(post.created_at * 1000).toISOString();
    let added_date = new Date(post.created_at * 1000).toISOString();
    let published_at = post.created_at;
    let title = "";
    let thumbnail = "";
    let summary = "";
    let d = "";
    let cat = [];

    for (let tag of post.tags) {
      if (tag[0] === "d") d = tag[1];
      if (tag[0] === "published_at") {
        published_at = tag[1];
        added_date =
          tag[1].length > 10
            ? new Date(parseInt(tag[1])).toISOString()
            : new Date(parseInt(tag[1]) * 1000).toISOString();
      }
      if (tag[0] === "image") thumbnail = tag[1];
      if (tag[0] === "title") title = tag[1];
      if (tag[0] === "summary") summary = tag[1];
      if (tag[0] === "t") cat.push(tag[1]);
    }

    let naddr = nip19.naddrEncode({
      identifier: d,
      pubkey: post.pubkey,
      kind: post.kind,
    });

    return {
      id: post.id,
      kind: post.kind,
      content: post.content,
      title,
      thumbnail: thumbnail || getImagePlaceholder(),
      summary,
      d,
      cat,
      added_date,
      modified_date,
      published_at,
      created_at: post.created_at,
      naddr,
    };
  };

  const initDeletedPost = (state) => {
    if (!state) {
      setPostToDelete(false);
      return;
    }
    removeCurrentPost();
    setPostToDelete(false);
  };

  const removeCurrentPost = () => {
    let index = posts.findIndex((item) => item.id === postToDelete.id);
    let tempArray = Array.from(posts);

    if (index !== -1) {
      tempArray.splice(index, 1);
      setPosts(tempArray);
    }
  };
  const switchActiveRelay = (source) => {
    if (!isLoaded) return;
    if (source === activeRelay) return;
    let relaysToClose =
      activeRelay == ""
        ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
        : [activeRelay];
    pool.close(relaysToClose);
    pool = new SimplePool();
    setPosts([]);
    setActiveRelay(source);
  };

  const checkSeenOn = (d, kind) => {
    let filteredPosts = tempPosts.filter(
      (post) => post.d === d && post.kind === kind
    );
    let seenOn = [];
    let seenOnPool = [...pool.seenOn];

    for (let post of filteredPosts) {
      let postInPool = seenOnPool.find((item) => item[0] === post.id);
      let relaysPool = postInPool
        ? [...postInPool[1]].map((item) => item.url)
        : [];
      seenOn.push(...relaysPool);
    }
    return [...new Set(seenOn)];
  };

  if (!nostrUserLoaded) return <LoadingScreen />;
  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      {postToDelete && (
        <ToDeletePostNOSTR
          exit={() => initDeletedPost(false)}
          exitAndRefresh={() => initDeletedPost(true)}
          post_id={postToDelete.id}
          title={postToDelete.title}
          thumbnail={postToDelete.thumbnail}
          relayToDeleteFrom={
            activeRelay == ""
              ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
              : [activeRelay]
          }
        />
      )}

      <div>
        <Helmet>
          <title>Yakihonne | My articles</title>
          <meta
            name="description"
            content={
              "Browse your published articles and edit them across relays"
            }
          />
          <meta
            property="og:description"
            content={
              "Browse your published articles and edit them across relays"
            }
          />

          <meta
            property="og:url"
            content={`https://yakihonne.com/my-articles`}
          />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content="Yakihonne | My articles" />
          <meta property="twitter:title" content="Yakihonne | My articles" />
          <meta
            property="twitter:description"
            content={
              "Browse your published articles and edit them across relays"
            }
          />
        </Helmet>
        <div className="fit-container fx-centered">
          <div className="main-container">
            <SidebarNOSTR />
            <main
              className={`main-page-nostr-container`}
              onClick={(e) => {
                e.stopPropagation();
                setShowRelaysList(false);
                setShowFilter(false);
              }}
            >
              <div className="fx-centered fit-container fx-start-h fx-start-v">
                <div style={{ flex: 1.75 }} className="box-pad-h-m">
                  {nostrUser && (
                    <>
                      <div
                        className="box-pad-v-m fit-container fx-scattered"
                        style={{
                          position: "relative",
                          zIndex: "100",
                        }}
                      >
                        <div className="fx-centered fx-col fx-start-v">
                          <div className="fx-centered">
                            <h4>{articlesNumber} Articles</h4>
                            <p className="gray-c p-medium">
                              (In{" "}
                              {activeRelay === ""
                                ? "all relays"
                                : activeRelay.split("wss://")[1]}
                              )
                            </p>
                          </div>
                          <p className="orange-c">
                            {activeRelay && "(Switch to all relays to edit)"}
                          </p>
                        </div>
                        <div className="fx-centered">
                          <div style={{ position: "relative" }}>
                            <div
                              style={{ position: "relative" }}
                              className="round-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowRelaysList(!showRelaysList);
                                setShowFilter(false);
                              }}
                            >
                              <div className="server"></div>
                            </div>
                            {showRelaysList && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  bottom: "-5px",
                                  backgroundColor: "var(--dim-gray)",
                                  border: "none",
                                  transform: "translateY(100%)",
                                  maxWidth: "300px",
                                  rowGap: "12px",
                                }}
                                className="box-pad-h box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v"
                              >
                                <h5>Relays</h5>
                                <button
                                  className={`btn-text-gray pointer fx-centered`}
                                  style={{
                                    width: "max-content",
                                    fontSize: "1rem",
                                    textDecoration: "none",
                                    color:
                                      activeRelay === "" ? "var(--c1)" : "",
                                    transition: ".4s ease-in-out",
                                  }}
                                  onClick={() => {
                                    switchActiveRelay("");
                                    setShowRelaysList(false);
                                  }}
                                >
                                  {isLoading && activeRelay === "" ? (
                                    <>Connecting...</>
                                  ) : (
                                    "All relays"
                                  )}
                                </button>
                                {nostrUser &&
                                  nostrUser.relays.length > 0 &&
                                  nostrUser.relays.map((relay) => {
                                    return (
                                      <button
                                        key={relay}
                                        className={`btn-text-gray pointer fx-centered `}
                                        style={{
                                          width: "max-content",
                                          fontSize: "1rem",
                                          textDecoration: "none",
                                          color:
                                            activeRelay === relay
                                              ? "var(--c1)"
                                              : "",
                                          transition: ".4s ease-in-out",
                                        }}
                                        onClick={() => {
                                          switchActiveRelay(relay);
                                          setShowRelaysList(false);
                                        }}
                                      >
                                        {isLoading && relay === activeRelay ? (
                                          <>Connecting...</>
                                        ) : (
                                          relay.split("wss://")[1]
                                        )}
                                      </button>
                                    );
                                  })}
                                {(!nostrUser ||
                                  (nostrUser &&
                                    nostrUser.relays.length === 0)) &&
                                  relays.map((relay) => {
                                    return (
                                      <button
                                        key={relay}
                                        className={`btn-text-gray pointer fx-centered`}
                                        style={{
                                          width: "max-content",
                                          fontSize: "1rem",
                                          textDecoration: "none",
                                          color:
                                            activeRelay === relay
                                              ? "var(--c1)"
                                              : "",
                                          transition: ".4s ease-in-out",
                                        }}
                                        onClick={() => {
                                          switchActiveRelay(relay);
                                          setShowRelaysList(false);
                                        }}
                                      >
                                        {isLoading && relay === activeRelay ? (
                                          <>Connecting..</>
                                        ) : (
                                          relay.split("wss://")[1]
                                        )}
                                      </button>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                          <div style={{ position: "relative" }}>
                            <div
                              style={{ position: "relative" }}
                              className="round-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowFilter(!showFilter);
                                setShowRelaysList(false);
                              }}
                            >
                              <div className="filter"></div>
                            </div>
                            {showFilter && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  bottom: "-5px",
                                  backgroundColor: "var(--dim-gray)",
                                  border: "none",
                                  transform: "translateY(100%)",
                                  maxWidth: "550px",
                                  rowGap: "12px",
                                }}
                                className="box-pad-h box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowRelaysList(false);
                                }}
                              >
                                <h5>Filter</h5>
                                <label
                                  htmlFor="radio-all"
                                  className="fit-container fx-centered fx-start-h"
                                >
                                  <input
                                    type="radio"
                                    name="filter"
                                    id="radio-all"
                                    checked={postKind === 0}
                                    onClick={() => setPostKind(0)}
                                  />{" "}
                                  <span style={{ width: "max-content" }}>
                                    All content
                                  </span>
                                </label>
                                <label
                                  htmlFor="radio-published"
                                  className="fit-container fx-centered fx-start-h"
                                >
                                  <input
                                    type="radio"
                                    name="filter"
                                    id="radio-published"
                                    checked={postKind === 30023}
                                    onClick={() => setPostKind(30023)}
                                  />{" "}
                                  <span style={{ width: "max-content" }}>
                                    Published
                                  </span>
                                </label>
                                <label
                                  htmlFor="radio-drafts"
                                  className="fit-container fx-centered fx-start-h"
                                >
                                  <input
                                    type="radio"
                                    name="filter"
                                    id="radio-drafts"
                                    checked={postKind === 30024}
                                    onClick={() => setPostKind(30024)}
                                  />{" "}
                                  <span style={{ width: "max-content" }}>
                                    Drafts
                                  </span>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {isLoading && posts.length === 0 && (
                        <div
                          className="fit-container fx-centered fx-col"
                          style={{ height: "50vh" }}
                        >
                          <p>Loading articles</p>
                          <LoadingDots />
                        </div>
                      )}

                      <div className="fit-container fx-scattered fx-start-h fx-wrap fx-stretch">
                        {posts.length > 0 && (
                          <>
                            {posts.map((post) => {
                              let seenOn = checkSeenOn(post.d, post.kind);
                              if (!postKind)
                                return (
                                  <div
                                    className="sc-s-18 fx-scattered fx-col"
                                    style={{
                                      width: "min(100%, 275px)",
                                      position: "relative",
                                      overflow: "visible",
                                    }}
                                    key={post.id}
                                  >
                                    {post.kind === 30024 && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          left: "16px",
                                          top: "16px",
                                        }}
                                      >
                                        <div className="sticker sticker-normal sticker-orange">
                                          Draft
                                        </div>
                                      </div>
                                    )}
                                    {(nostrKeys.sec ||
                                      (!nostrKeys.sec && nostrKeys.ext)) && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          right: "16px",
                                          top: "16px",
                                        }}
                                        className="fx-centered"
                                      >
                                        {!activeRelay && (
                                          <div
                                            style={{
                                              width: "48px",
                                              height: "48px",
                                              backgroundColor:
                                                "var(--dim-gray)",
                                              borderRadius:
                                                "var(--border-r-50)",
                                            }}
                                            className="fx-centered pointer"
                                            onClick={() =>
                                              navigateTo("/write-article", {
                                                state: {
                                                  post_id: post.id,
                                                  post_kind: post.kind,
                                                  post_title: post.title,
                                                  post_desc: post.summary,
                                                  post_thumbnail:
                                                    post.thumbnail,
                                                  post_tags: post.cat,
                                                  post_d: post.d,
                                                  post_content: post.content,
                                                  post_published_at:
                                                    post.published_at,
                                                },
                                              })
                                            }
                                          >
                                            <div className="write-24"></div>
                                          </div>
                                        )}
                                        <div
                                          style={{
                                            width: "48px",
                                            height: "48px",
                                            backgroundColor: "var(--dim-gray)",
                                            borderRadius: "var(--border-r-50)",
                                          }}
                                          className="fx-centered pointer"
                                          onClick={() =>
                                            !isPublishing
                                              ? setPostToDelete({
                                                  id: post.id,
                                                  title: post.title,
                                                  thumbnail: post.thumbnail,
                                                })
                                              : setToast({
                                                  type: 3,
                                                  desc: "An event publishing is in process!",
                                                })
                                          }
                                        >
                                          <div className="trash-24"></div>
                                        </div>
                                      </div>
                                    )}
                                    {post.kind === 30023 && (
                                      <Link
                                        to={`/article/${post.naddr}`}
                                        target={"_blank"}
                                        className="fit-container a-no-hover"
                                      >
                                        <div
                                          className="bg-img cover-bg fit-container fx-centered"
                                          style={{
                                            height: "150px",
                                            backgroundColor: "var(--dim-gray)",
                                            backgroundImage: post.thumbnail
                                              ? `url(${post.thumbnail})`
                                              : `url(${placeholder})`,
                                            borderTopLeftRadius: "18px",
                                            borderTopRightRadius: "18px",
                                          }}
                                        ></div>
                                        <div className="box-pad-h-m box-pad-v-m fit-container">
                                          <div className="fx-start-h fx-centered">
                                            <p
                                              className="p-medium gray-c pointer round-icon-tooltip"
                                              data-tooltip={`created at ${convertDate(
                                                post.added_date
                                              )}, edited on ${convertDate(
                                                post.modified_date
                                              )}`}
                                            >
                                              Last modified{" "}
                                              <Date_
                                                toConvert={post.modified_date}
                                              />
                                            </p>
                                          </div>
                                          <p>{post.title}</p>
                                        </div>
                                      </Link>
                                    )}
                                    {post.kind === 30024 && (
                                      <div
                                        onClick={() =>
                                          navigateTo("/write-article", {
                                            state: {
                                              post_id: post.id,
                                              post_kind: post.kind,
                                              post_title: post.title,
                                              post_desc: post.summary,
                                              post_thumbnail: post.thumbnail,
                                              post_tags: post.cat,
                                              post_d: post.d,
                                              post_content: post.content,
                                            },
                                          })
                                        }
                                        className="fit-container pointer"
                                      >
                                        <div
                                          className="bg-img cover-bg fit-container fx-centered"
                                          style={{
                                            height: "150px",
                                            backgroundColor: "var(--dim-gray)",
                                            backgroundImage: post.thumbnail
                                              ? `url(${post.thumbnail})`
                                              : `url(${placeholder})`,
                                            borderTopLeftRadius: "18px",
                                            borderTopRightRadius: "18px",
                                          }}
                                        ></div>
                                        <div className="box-pad-h-m box-pad-v-m fit-container">
                                          <p
                                            className="p-medium gray-c pointer round-icon-tooltip"
                                            data-tooltip={`created at ${convertDate(
                                              post.added_date
                                            )}, edited on ${convertDate(
                                              post.modified_date
                                            )}`}
                                          >
                                            Last modified{" "}
                                            <Date_
                                              toConvert={post.modified_date}
                                            />
                                          </p>
                                          <p>{post.title}</p>
                                        </div>
                                      </div>
                                    )}

                                    <div className="fit-container">
                                      <hr />
                                      <div className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-m pointer">
                                        <p className="gray-c p-medium">
                                          Posted on
                                        </p>
                                        <div className="fx-centered">
                                          {seenOn.map((relay, index) => {
                                            return (
                                              <div
                                                style={{
                                                  backgroundColor:
                                                    randomColors[index],
                                                  minWidth: "10px",
                                                  aspectRatio: "1/1",
                                                  borderRadius:
                                                    "var(--border-r-50)",
                                                }}
                                                className="pointer round-icon-tooltip"
                                                data-tooltip={relay}
                                                key={relay}
                                              ></div>
                                            );
                                          })}
                                          {isLoading && <LoadingDots />}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              if (post.kind === postKind)
                                return (
                                  <div
                                    className="sc-s fx-scattered fx-col"
                                    style={{
                                      width: "min(100%, 330px)",
                                      position: "relative",
                                    }}
                                    key={post.id}
                                  >
                                    {post.kind === 30024 && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          left: "16px",
                                          top: "16px",
                                        }}
                                      >
                                        <div className="sticker sticker-normal sticker-orange">
                                          Draft
                                        </div>
                                      </div>
                                    )}
                                    {(nostrKeys.sec ||
                                      (!nostrKeys.sec && nostrKeys.ext)) && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          right: "16px",
                                          top: "16px",
                                        }}
                                        className="fx-centered"
                                      >
                                        {!activeRelay && (
                                          <div
                                            style={{
                                              width: "48px",
                                              height: "48px",
                                              backgroundColor:
                                                "var(--dim-gray)",
                                              borderRadius:
                                                "var(--border-r-50)",
                                            }}
                                            className="fx-centered pointer"
                                            onClick={() =>
                                              navigateTo("/write-article", {
                                                state: {
                                                  post_id: post.id,
                                                  post_kind: post.kind,
                                                  post_title: post.title,
                                                  post_desc: post.summary,
                                                  post_thumbnail:
                                                    post.thumbnail,
                                                  post_tags: post.cat,
                                                  post_d: post.d,
                                                  post_content: post.content,
                                                  post_published_at:
                                                    post.published_at,
                                                },
                                              })
                                            }
                                          >
                                            <div className="write-24"></div>
                                          </div>
                                        )}
                                        <div
                                          style={{
                                            width: "48px",
                                            height: "48px",
                                            backgroundColor: "var(--dim-gray)",
                                            borderRadius: "var(--border-r-50)",
                                          }}
                                          className="fx-centered pointer"
                                          onClick={() =>
                                            !isPublishing
                                              ? setPostToDelete({
                                                  id: post.id,
                                                  title: post.title,
                                                  thumbnail: post.thumbnail,
                                                })
                                              : setToast({
                                                  type: 3,
                                                  desc: "An event publishing is in process!",
                                                })
                                          }
                                        >
                                          <div className="trash-24"></div>
                                        </div>
                                      </div>
                                    )}
                                    {post.kind === 30023 && (
                                      <Link
                                        to={`/article/${post.naddr}`}
                                        target={"_blank"}
                                        className="fit-container"
                                      >
                                        <div
                                          className="bg-img cover-bg fit-container fx-centered"
                                          style={{
                                            height: "150px",
                                            backgroundColor: "var(--dim-gray)",
                                            backgroundImage: post.thumbnail
                                              ? `url(${post.thumbnail})`
                                              : `url(${placeholder})`,
                                            borderTopLeftRadius: "18px",
                                            borderTopRightRadius: "18px",
                                          }}
                                        ></div>
                                        <div className="box-pad-h-m box-pad-v-m fit-container">
                                          <div className="fx-start-h fx-centered">
                                            <p
                                              className="p-medium gray-c pointer round-icon-tooltip"
                                              data-tooltip={`created at ${convertDate(
                                                post.added_date
                                              )}, edited on ${convertDate(
                                                post.modified_date
                                              )}`}
                                            >
                                              Last modified{" "}
                                              <Date_
                                                toConvert={post.modified_date}
                                              />
                                            </p>
                                          </div>
                                          <p>{post.title}</p>
                                        </div>
                                      </Link>
                                    )}
                                    {post.kind === 30024 && (
                                      <div
                                        onClick={() =>
                                          navigateTo("/write-article", {
                                            state: {
                                              post_id: post.id,
                                              post_kind: post.kind,
                                              post_title: post.title,
                                              post_desc: post.summary,
                                              post_thumbnail: post.thumbnail,
                                              post_tags: post.cat,
                                              post_d: post.d,
                                              post_content: post.content,
                                            },
                                          })
                                        }
                                        className="fit-container pointer"
                                      >
                                        <div
                                          className="bg-img cover-bg fit-container fx-centered"
                                          style={{
                                            height: "150px",
                                            backgroundColor: "var(--dim-gray)",
                                            backgroundImage: post.thumbnail
                                              ? `url(${post.thumbnail})`
                                              : `url(${placeholder})`,
                                            borderTopLeftRadius: "18px",
                                            borderTopRightRadius: "18px",
                                          }}
                                        ></div>
                                        <div className="box-pad-h-m box-pad-v-m fit-container">
                                          <p
                                            className="p-medium gray-c pointer round-icon-tooltip"
                                            data-tooltip={`created at ${convertDate(
                                              post.added_date
                                            )}, edited on ${convertDate(
                                              post.modified_date
                                            )}`}
                                          >
                                            Last modified{" "}
                                            <Date_
                                              toConvert={post.modified_date}
                                            />
                                          </p>
                                          <p>{post.title}</p>
                                        </div>
                                      </div>
                                    )}
                                    <div className="fit-container">
                                      <hr />
                                      <div className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-m pointer">
                                        <p className="gray-c p-medium">
                                          Posted on
                                        </p>
                                        <div className="fx-centered">
                                          {seenOn.map((relay, index) => {
                                            return (
                                              <div
                                                style={{
                                                  backgroundColor:
                                                    randomColors[index],
                                                  minWidth: "10px",
                                                  aspectRatio: "1/1",
                                                  borderRadius:
                                                    "var(--border-r-50)",
                                                }}
                                                className="pointer round-icon-tooltip"
                                                data-tooltip={relay}
                                                key={relay}
                                              ></div>
                                            );
                                          })}
                                          {isLoading && <LoadingDots />}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                            })}
                            <div style={{ flex: "1 1 400px" }}></div>
                            <div style={{ flex: "1 1 400px" }}></div>
                            <div style={{ flex: "1 1 400px" }}></div>
                          </>
                        )}
                        {posts.length === 0 && !isLoading && (
                          <div
                            className="fit-container fx-centered fx-col"
                            style={{ height: "40vh" }}
                          >
                            <h4>No articles were found!</h4>
                            <p className="gray-c p-centered">
                              No articles were found in this relay
                            </p>
                          </div>
                        )}
                        {posts.length > 0 &&
                          postKind !== 0 &&
                          !posts.find((item) => item.kind === postKind) && (
                            <div
                              className="fit-container fx-centered fx-col"
                              style={{ height: "40vh" }}
                            >
                              <h4>No articles were found!</h4>
                              <p className="gray-c p-centered">
                                No articles were found in this relay
                              </p>
                            </div>
                          )}
                      </div>
                    </>
                  )}
                  {!nostrUser && (
                    <PagePlaceholder page={"nostr-not-connected"} />
                  )}
                </div>
                <div
                  className=" fx-centered fx-col fx-start-v extras-homepage"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: "100",
                    flex: 1,
                  }}
                >
                  <div className="sticky fit-container">
                    <SearchbarNOSTR />
                  </div>
                  <div
                    className=" fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v box-marg-s"
                    style={{
                      backgroundColor: "var(--c1-side)",
                      rowGap: "24px",
                      border: "none",
                    }}
                  >
                    <h4>Important Flash News</h4>
                    <HomeFN flashnews={importantFN} />
                  </div>
                  <Footer />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
