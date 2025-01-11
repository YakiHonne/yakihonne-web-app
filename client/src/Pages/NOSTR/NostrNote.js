import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingScreen from "../../Components/LoadingScreen";
import { nip19, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import {
  checkForLUDS,
  decodeBolt11,
  filterRelays,
  getBolt11,
  getEmptyNostrUser,
  getZapper,
} from "../../Helpers/Encryptions";
import { Context } from "../../Context/Context";
import { Helmet } from "react-helmet";
import ArrowUp from "../../Components/ArrowUp";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import NumberShrink from "../../Components/NumberShrink";
import ShowUsersList from "../../Components/NOSTR/ShowUsersList";
import Date_ from "../../Components/Date_";
import ZapTip from "../../Components/NOSTR/ZapTip";
import LoadingDots from "../../Components/LoadingDots";
import axios from "axios";
import SaveArticleAsBookmark from "../../Components/NOSTR/SaveArticleAsBookmark";
import { getNoteTree } from "../../Helpers/Helpers";
import LoginNOSTR from "../../Components/NOSTR/LoginNOSTR";
import Footer from "../../Components/Footer";
import ShareLink from "../../Components/ShareLink";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import HomeFN from "../../Components/NOSTR/HomeFN";
import QuoteNote from "../../Components/NOSTR/QuoteNote";
import NotesComment from "../../Components/NOSTR/NotesComment";
const pool = new SimplePool();
const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

const checkForSavedCommentOptions = () => {
  try {
    let options = localStorage.getItem("comment-with-suffix");
    if (options) {
      let res = JSON.parse(options);
      return res.keep_suffix;
    }
    return -1;
  } catch {
    return -1;
  }
};

const filterRootComments = async (all) => {
  let temp = [];
  for (let comment of all) {
    if (!comment.tags.find((item) => item[0] === "e" && item[3] === "reply")) {
      let [note_tree, count] = await Promise.all([
        getNoteTree(comment.content.split(" — This is a comment on:")[0]),
        countReplies(comment.id, all),
      ]);
      temp.push({
        ...comment,
        note_tree,
        count,
      });
    }
  }
  return temp;
};

const countReplies = async (id, all) => {
  let count = [];

  for (let comment of all) {
    let ev = comment.tags.find(
      (item) => item[3] === "reply" && item[0] === "e" && item[1] === id
    );
    if (ev) {
      let cr = await countReplies(comment.id, all);
      count.push(comment, ...cr);
    }
  }
  let res = await Promise.all(
    count
      .sort((a, b) => b.created_at - a.created_at)
      .map(async (com) => {
        let note_tree = await getNoteTree(
          com.content.split(" — This is a comment on:")[0]
        );
        return {
          ...com,
          note_tree,
        };
      })
  );
  return res;
};

const getOnReply = (comments, comment_id) => {
  let tempCom = comments.find((item) => item.id === comment_id);
  return tempCom;
};

export default function NostrNote() {
  const {
    nostrUser,
    nostrKeys,
    isPublishing,
    setToPublish,
    setToast,
    mutedList,
  } = useContext(Context);
  const { nevent } = useParams();
  const navigateTo = useNavigate();
  const [note, setNote] = useState(false);
  const [importantFN, setImportantFN] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toLogin, setToLogin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [author, setAuthor] = useState("");
  const [usersList, setUsersList] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [reposts, setReposts] = useState([]);
  const [netCommentsCount, setNetCommentsCount] = useState(0);
  const [isRelatedEventLoaded, setIsRelatedEventLoaded] = useState(false);
  const [zapsCount, setZapsCount] = useState(0);
  const [zappers, setZappers] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  const [relatedEvent, setRelatedEvent] = useState(false);
  const [showQuoteBox, setShowQuoteBox] = useState(false);
  const optionsRef = useRef(null);

  const isVoted = useMemo(() => {
    return nostrKeys
      ? reactions.find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [reactions, nostrKeys]);
  const isReposted = useMemo(() => {
    return nostrKeys
      ? reposts.find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [reposts, nostrKeys]);
  const isQuoted = useMemo(() => {
    return nostrKeys
      ? quotes.find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [quotes, nostrKeys]);

  const isMuted = useMemo(() => {
    let checkProfile = () => {
      if (!Array.isArray(mutedList)) return false;
      let index = mutedList.findIndex((item) => item === author?.pubkey);
      if (index === -1) {
        return false;
      }
      return { index };
    };
    return checkProfile();
  }, [mutedList, author]);

  useEffect(() => {
    try {
      const id = nip19.decode(nevent)?.data.id;
      const auth_pubkey = nip19.decode(nevent)?.data.author;

      setAuthor(getEmptyNostrUser(auth_pubkey));
      let sub = pool.subscribeMany(
        nostrUser
          ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
          : relaysOnPlatform,
        [
          { kinds: [0], authors: [auth_pubkey] },
          { kinds: [1], ids: [id] },

          {
            kinds: [6, 7],
            "#e": [id],
          },
          {
            kinds: [1],
            "#q": [id],
          },
          {
            kinds: [9735],
            "#p": [auth_pubkey],
            "#e": [id],
          },
        ],
        {
          async onevent(event) {
            if (event.kind === 9735) {
              let sats = decodeBolt11(getBolt11(event));
              let zapper = getZapper(event);
              setZappers((prev) => {
                return [...prev, zapper];
              });
              setZapsCount((prev) => prev + sats);
            }
            if (event.kind === 7) {
              setReactions((reactions) => [...reactions, event]);
            }
            if (event.kind === 6) {
              setReposts((reposts) => [...reposts, event]);
            }
            if (event.kind === 1) {
              let tempNote = await onEvent(event);
              if (event.id !== id) {
                setQuotes((quotes) => [...quotes, event]);
              } else {
                setNote(tempNote);

                setIsLoaded(true);
              }
            }
            if (event.kind === 0) {
              setAuthor(JSON.parse(event.content));
            }
          },
        }
      );
    } catch (err) {
      console.log(err);
      setIsLoaded(true);
    }
  }, [nevent]);

  useEffect(() => {
    const handleOffClick = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target))
        setShowOptions(false);
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [optionsRef]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoaded(false);
        const [important] = await Promise.all([
          axios.get(API_BASE_URL + "/api/v1/mb/flashnews/important"),
        ]);

        setImportantFN(important.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, [nevent]);

  const reactToNote = async (e) => {
    e.stopPropagation();
    if (isLoading) return;
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    try {
      if (!nostrKeys) {
        setToLogin(true);
        return false;
      }
      if (isVoted) {
        setIsLoading(true);
        setToPublish({
          nostrKeys: nostrKeys,
          kind: 5,
          content: "This reaction will be deleted!",
          tags: [["e", isVoted.id]],
          allRelays: nostrUser
            ? [
                ...filterRelays(relaysOnPlatform, nostrUser?.relays || []),
                "wss://nostr.wine",
              ]
            : [...relaysOnPlatform, "wss://nostr.wine"],
        });

        setIsLoading(false);

        let tempArray = Array.from(reactions);
        let index = tempArray.findIndex((item) => item.id === isVoted.id);
        tempArray.splice(index, 1);
        setReactions(tempArray);
        return false;
      }

      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 7,
        content: "+",
        tags: [
          ["e", note.id],
          ["p", note.pubkey],
        ],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])]
          : relaysOnPlatform,
      });

      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };
  const repostNote = async (e) => {
    e.stopPropagation();
    if (isLoading) return;
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    try {
      if (!nostrKeys) {
        setToLogin(true);
        return false;
      }
      if (isReposted) {
        setIsLoading(true);
        setToPublish({
          nostrKeys: nostrKeys,
          kind: 5,
          content: "This repost will be deleted!",
          tags: [["e", isReposted.id]],
          allRelays: nostrUser
            ? [
                ...filterRelays(relaysOnPlatform, nostrUser?.relays || []),
                "wss://nostr.wine",
              ]
            : [...relaysOnPlatform, "wss://nostr.wine"],
        });

        setIsLoading(false);

        let tempArray = Array.from(reposts);
        let index = tempArray.findIndex((item) => item.id === isVoted.id);
        tempArray.splice(index, 1);
        setReposts(tempArray);
        return false;
      }

      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 6,
        content: note.stringifiedEvent,
        tags: [
          ["e", note.id],
          ["p", note.pubkey],
        ],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])]
          : relaysOnPlatform,
      });

      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };

  const onEvent = async (event) => {
    try {
      let checkForQuote = event.tags.find((tag) => tag[0] === "q");
      let checkForLabel = event.tags.find((tag) => tag[0] === "l");
      if (
        checkForLabel &&
        ["UNCENSORED NOTE", "FLASH NEWS"].includes(checkForLabel[1])
      )
        return false;

      let nEvent = nip19.neventEncode({
        id: event.id,
        author: event.pubkey,
      });
      let stringifiedEvent = JSON.stringify(event);
      if (event.kind === 1) {
        let note_tree = await getNoteTree(event.content);
        return {
          ...event,
          note_tree,
          stringifiedEvent,
          checkForQuote:
            checkForQuote && !event.content.includes("nostr:nevent")
              ? checkForQuote[1]
              : "",
          nEvent,
        };
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const muteUnmute = async () => {
    try {
      if (!Array.isArray(mutedList)) return;
      if (isPublishing) {
        setToast({
          type: 3,
          desc: "An event publishing is in process!",
        });
        return;
      }

      let tempTags = Array.from(mutedList.map((pubkey) => ["p", pubkey]));
      if (isMuted) {
        tempTags.splice(isMuted.index, 1);
      } else {
        tempTags.push(["p", author.pubkey]);
      }

      setToPublish({
        nostrKeys: nostrKeys,
        kind: 10000,
        content: "",
        tags: tempTags,
        allRelays: [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])],
      });
    } catch (err) {
      console.log(err);
    }
  };

  const copyID = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(nevent);
    setToast({
      type: 1,
      desc: `Note ID was copied! 👏`,
    });
  };

  if (!isLoaded) return <LoadingScreen />;
  if (!note) return navigateTo("/notes");
  return (
    <>
      {toLogin && <LoginNOSTR exit={() => setToLogin(false)} />}{" "}
      {usersList && (
        <ShowUsersList
          exit={() => setUsersList(false)}
          title={usersList.title}
          list={usersList.list}
          extras={usersList.extras}
        />
      )}
      {showQuoteBox && (
        <QuoteNote note={note} exit={() => setShowQuoteBox(false)} />
      )}
      <div>
        <Helmet>
          <title>Yakihonne | {author.display_name || author.name}</title>
          <meta name="description" content={note.content} />
          <meta property="og:description" content={note.content} />
          <meta
            property="og:image"
            content={API_BASE_URL + "/event/" + note.nEvent + ".png"}
          />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="700" />
          <meta
            property="og:url"
            content={`https://yakihonne.com/notes/${note.nEvent}`}
          />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta
            property="og:title"
            content={author.display_name || author.name}
          />
          <meta
            property="twitter:title"
            content={author.display_name || author.name}
          />
          <meta property="twitter:description" content={note.content} />
          <meta
            property="twitter:image"
            content={API_BASE_URL + "/event/" + note.nEvent + ".png"}
          />
        </Helmet>
        <div className="fit-container fx-centered">
          <div className="main-container">
            <SidebarNOSTR />
            <main className="main-page-nostr-container">
              <ArrowUp />

              <div
                className="fx-centered fit-container fx-start-h fx-start-v"
                style={{ gap: 0 }}
              >
                <div style={{ flex: 1.8 }} className="box-pad-h-m">
                  <div
                    className="fit-container fx-centered fx-col fx-start-v box-pad-v"
                    style={{ paddingBottom: "3rem" }}
                  >
                    <div className="fx-centered fit-container fx-start-h">
                      <UserProfilePicNOSTR
                        img={author.picture}
                        size={64}
                        mainAccountUser={false}
                        user_id={note.pubkey}
                        ring={false}
                      />
                      <div className="box-pad-h-m fx-centered fx-col fx-start-v">
                        <h4>By {author.name}</h4>
                        <p className="gray-c">
                          <Date_
                            toConvert={new Date(
                              note.created_at * 1000
                            ).toString()}
                            time={true}
                          />
                        </p>
                      </div>
                    </div>

                    <div className="fit-container">{note.note_tree}</div>

                    <div className="fit-container fx-scattered box-pad-v-s">
                      <div
                        className="fx-centered"
                        style={{ columnGap: "20px" }}
                      >
                        <div
                          className={`fx-centered pointer ${
                            isLoading ? "flash" : ""
                          }`}
                          style={{ columnGap: "8px" }}
                        >
                          <div className="comment-24"></div>
                          <div>
                            <NumberShrink value={netCommentsCount} />
                          </div>
                        </div>
                        <div
                          className={`fx-centered pointer ${
                            isLoading ? "flash" : ""
                          }`}
                          style={{ columnGap: "8px" }}
                        >
                          <div
                            className={"icon-tooltip"}
                            data-tooltip="React"
                            onClick={reactToNote}
                          >
                            <div
                              className={isVoted ? "heart-bold-24" : "heart-24"}
                            ></div>
                          </div>
                          <div
                            className={`icon-tooltip ${
                              isVoted ? "orange-c" : ""
                            }`}
                            data-tooltip="Reactions from"
                            onClick={(e) => {
                              e.stopPropagation();
                              reactions.length > 0 &&
                                setUsersList({
                                  title: "Reactions from",
                                  list: reactions.map((item) => item.pubkey),
                                  extras: [],
                                });
                            }}
                          >
                            <NumberShrink value={reactions.length} />
                          </div>
                        </div>
                        <div
                          className={`fx-centered pointer ${
                            isLoading ? "flash" : ""
                          }`}
                          style={{ columnGap: "8px" }}
                        >
                          <div
                            className={"icon-tooltip"}
                            data-tooltip="Repost note"
                            onClick={repostNote}
                          >
                            <div
                              className={
                                isReposted
                                  ? "switch-arrows-bold-24"
                                  : "switch-arrows-24"
                              }
                            ></div>
                          </div>
                          <div
                            className={`icon-tooltip ${
                              isReposted ? "orange-c" : ""
                            }`}
                            data-tooltip="Reposts from"
                            onClick={(e) => {
                              e.stopPropagation();
                              reposts.length > 0 &&
                                setUsersList({
                                  title: "Reposts from",
                                  list: reposts.map((item) => item.pubkey),
                                  extras: [],
                                });
                            }}
                          >
                            <NumberShrink value={reposts.length} />
                          </div>
                        </div>
                        <div
                          className={`fx-centered pointer ${
                            isLoading ? "flash" : ""
                          }`}
                          style={{ columnGap: "8px" }}
                        >
                          <div
                            className={"icon-tooltip"}
                            data-tooltip="Quote note"
                            onClick={() => setShowQuoteBox(!showQuoteBox)}
                          >
                            <div
                              className={
                                isQuoted ? "quote-bold-24" : "quote-24"
                              }
                            ></div>
                          </div>
                          <div
                            className={`icon-tooltip ${
                              isQuoted ? "orange-c" : ""
                            }`}
                            data-tooltip="Quoters"
                            onClick={(e) => {
                              e.stopPropagation();
                              quotes.length > 0 &&
                                setUsersList({
                                  title: "Quoters",
                                  list: quotes.map((item) => item.pubkey),
                                  extras: [],
                                });
                            }}
                          >
                            <NumberShrink value={quotes.length} />
                          </div>
                        </div>
                        <div
                          className="fx-centered"
                          style={{ columnGap: "8px" }}
                        >
                          <div className="icon-tooltip" data-tooltip="Tip note">
                            <ZapTip
                              recipientLNURL={checkForLUDS(
                                author.lud06,
                                author.lud16
                              )}
                              recipientPubkey={note.pubkey}
                              senderPubkey={nostrUser.pubkey}
                              recipientInfo={{
                                name: author.name,
                                picture: author.picture,
                              }}
                              eTag={note.id}
                              forContent={note.content.substring(0, 40)}
                              onlyIcon={true}
                            />
                          </div>
                          <div
                            data-tooltip="See zappers"
                            className="icon-tooltip pointer"
                            onClick={() =>
                              zapsCount &&
                              setUsersList({
                                title: "Zappers",
                                list: zappers.map((item) => item.pubkey),
                                extras: zappers,
                              })
                            }
                          >
                            <NumberShrink value={zapsCount} />
                          </div>
                        </div>
                      </div>
                      <div style={{ position: "relative" }} ref={optionsRef}>
                        <div
                          className="round-icon-small round-icon-tooltip"
                          style={{ border: "none" }}
                          data-tooltip="Options"
                          onClick={() => {
                            setShowOptions(!showOptions);
                          }}
                        >
                          <div
                            className="fx-centered fx-col"
                            style={{ rowGap: 0 }}
                          >
                            <p
                              className="gray-c fx-centered"
                              style={{ height: "6px" }}
                            >
                              &#x2022;
                            </p>
                            <p
                              className="gray-c fx-centered"
                              style={{ height: "6px" }}
                            >
                              &#x2022;
                            </p>
                            <p
                              className="gray-c fx-centered"
                              style={{ height: "6px" }}
                            >
                              &#x2022;
                            </p>
                          </div>
                        </div>
                        {showOptions && (
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              top: "110%",
                              backgroundColor: "var(--dim-gray)",
                              border: "none",

                              minWidth: "200px",
                              width: "max-content",
                              zIndex: 1000,
                              rowGap: "12px",
                            }}
                            className="box-pad-h box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v"
                          >
                            <div onClick={copyID} className="pointer">
                              <p>Copy note ID</p>
                            </div>
                            {nostrKeys && nostrKeys.pub !== note.pubkey && (
                              <>
                                <SaveArticleAsBookmark
                                  label="Bookmark note"
                                  pubkey={note.id}
                                  kind={"1"}
                                  itemType="e"
                                />
                              </>
                            )}
                            <div className="fit-container fx-centered fx-start-h pointer">
                              <ShareLink
                                label="Share note"
                                path={`/notes/${note.nEvent}`}
                                title={author.display_name || author.name}
                                description={note.content}
                                kind={1}
                                shareImgData={{
                                  post: note,
                                  author,
                                  label: "Note",
                                }}
                              />
                            </div>
                            <div onClick={muteUnmute} className="pointer">
                              {isMuted ? (
                                <p className="red-c">Unmute user</p>
                              ) : (
                                <p className="red-c">Mute user</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <CommentsSection
                      id={note.id}
                      nEvent={nevent}
                      setNetCommentsCount={setNetCommentsCount}
                    />
                  </div>
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

const CommentsSection = ({ id, nEvent, setNetCommentsCount }) => {
  const [comments, setComments] = useState([]);

  const {
    nostrUser,
    nostrKeys,
    addNostrAuthors,
    setToPublish,
    isPublishing,
    setToast,
  } = useContext(Context);

  const [toLogin, setToLogin] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [selectedComment, setSelectedComment] = useState(false);
  const [selectedCommentIndex, setSelectedCommentIndex] = useState(false);
  const [showCommentsSuffixOption, setShowCommentsSuffixOption] =
    useState(false);
  const [netComments, setNetComments] = useState([]);

  useEffect(() => {
    if (selectedComment) {
      let sC = netComments.find((item) => item.id === selectedComment.id);
      setSelectedComment(sC);
    }
    setNetCommentsCount(
      netComments.map((cm) => cm.count).flat().length + netComments.length
    );
  }, [netComments]);

  useEffect(() => {
    let parsedCom = async () => {
      let res = await filterRootComments(comments);
      setNetComments(res);
    };
    parsedCom();
  }, [comments]);

  const postNewComment = async (suffix) => {
    try {
      if (!nostrKeys || !newComment) {
        return;
      }
      if (isPublishing) {
        setToast({
          type: 3,
          desc: "An event publishing is in process!",
        });
        return;
      }
      setIsLoading(true);
      let tempComment = newComment;

      setToPublish({
        nostrKeys: nostrKeys,
        kind: 1,
        content: tempComment,
        tags: [["e", id, "", "root"]],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });

      setIsLoading(false);
      setNewComment("");
    } catch (err) {
      console.log(err);
    }
  };

  const refreshRepleis = (index) => {
    let tempArray_1 = Array.from(comments);
    let tempArray_2 = Array.from(netComments[selectedCommentIndex].count);
    let idToDelete = tempArray_2[index].id;
    let indexToDelete = tempArray_1.findIndex((item) => item.id === idToDelete);
    tempArray_1.splice(indexToDelete, 1);
    setComments(tempArray_1);
  };

  useEffect(() => {
    let tempComment = [];
    const sub = pool.subscribeMany(
      nostrUser
        ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
        : relaysOnPlatform,
      [
        {
          kinds: [1],
          "#e": [id],
        },
      ],
      {
        onevent(event) {
          let is_un = event.tags.find((tag) => tag[0] === "l");
          if (!(is_un && is_un[1] === "UNCENSORED NOTE")) {
            tempComment.push(event);
            setComments((prev) => {
              let newCom = [...prev, event];
              return newCom.sort(
                (item_1, item_2) => item_2.created_at - item_1.created_at
              );
            });
          }
        },
        oneose() {
          addNostrAuthors(tempComment.map((item) => item.pubkey));
        },
      }
    );
  }, []);

  const refreshComments = (index) => {
    let tempArray = Array.from(comments);
    tempArray.splice(index, 1);
    setComments(tempArray);
  };
  return (
    <div className="fit-container fx-centered fx-col box-pad-v-m">
      {showCommentsSuffixOption && (
        <AddSuffixToComment
          post={postNewComment}
          comment={newComment}
          exit={() => setShowCommentsSuffixOption(false)}
          nEvent={nEvent}
        />
      )}
      {toLogin && <LoginNOSTR exit={() => setToLogin(false)} />}{" "}
      <div className="fit-container fx-centered fx-col fx-start-h fx-start-v">
        {nostrKeys && (
          <div className="fit-container fx-end-v fx-centered">
            <UserProfilePicNOSTR
              ring={false}
              mainAccountUser={true}
              size={54}
            />
            <input
              className="if ifs-full"
              placeholder="Post a comment.."
              value={newComment}
              type="text"
              onChange={(e) => setNewComment(e.target.value)}
            />

            <button
              className="btn btn-normal fx-centered"
              onClick={() => newComment && setShowCommentsSuffixOption(true)}
            >
              {isLoading && <LoadingDots />}
              {!isLoading && <>Post</>}
            </button>
          </div>
        )}
        {netComments.length == 0 && (
          <div
            className="fit-container fx-centered fx-col"
            style={{ height: "20vh" }}
          >
            <h4>No comments</h4>
            <p className="p-centered gray-c">Nobody commented on this note</p>
            <div className="comment-24"></div>
          </div>
        )}
        {!nostrKeys && (
          <div className="fit-container fx-centered">
            <button
              className="btn btn-normal fx-centered"
              onClick={() => setToLogin(true)}
            >
              Login to comment
            </button>
          </div>
        )}
        {netComments.length > 0 && (
          <div className="fit-container fx-centered fx-start-h box-pad-v-m">
            <h4>
              {netComments.map((item) => item.count).flat().length +
                netComments.length}{" "}
              Comment(s)
            </h4>
          </div>
        )}

        {netComments.map((comment, index) => {
          return (
            <Comment
              comment={comment}
              key={comment.id}
              refresh={refreshComments}
              refreshRepleis={refreshRepleis}
              index={index}
              onClick={() => {
                setShowReplies(true);
                setSelectedComment(comment);
                setSelectedCommentIndex(index);
              }}
              nEvent={nEvent}
              noteID={id}
            />
          );
        })}
      </div>
    </div>
  );
};

const AddSuffixToComment = ({ exit, post, comment = "", nEvent }) => {
  const isSaved = checkForSavedCommentOptions();
  const [isSave, setIsSave] = useState(true);

  const saveOption = () => {
    localStorage.setItem(
      "comment-with-suffix",
      JSON.stringify({ keep_suffix: isSave })
    );
  };

  if (isSaved !== -1) {
    post(isSaved);
    exit();
    return;
  }
  if (isSaved === -1)
    return (
      <div
        className="fixed-container fx-centered box-pad-h"
        style={{ zIndex: "10000" }}
      >
        <section
          className="sc-s box-pad-h box-pad-v"
          style={{ width: "min(100%, 500px)" }}
        >
          <h4 className="p-centered">Be meaningful 🥳</h4>
          <p className="p-centered box-pad-v-m">
            Let your comments be recognized on NOSTR notes clients by adding
            where did you comment. <br />
            Choose what suits you best!
          </p>

          <div className="fit-container fx-centered fx-col">
            <label
              className="sc-s-18 fit-container fx-centered box-pad-h-m box-pad-v-m fx-start-h fx-start-v"
              htmlFor="suffix"
              style={{
                opacity: !isSave ? ".6" : 1,
                filter: !isSave ? "grayscale(100%)" : "none",
              }}
            >
              <input
                type="radio"
                id="suffix"
                name="suffix"
                checked={isSave}
                value={isSave}
                onChange={() => setIsSave(true)}
              />
              <div>
                <p className="gray-c p-small">Your comment with suffix</p>
                <p className="p-two-lines p-medium">{comment}</p>
                <p className="p-medium orange-c">
                  — This is a comment on: https://yakihonne.com/notes/
                  {nEvent}
                </p>
              </div>
            </label>
            <label
              className="sc-s-18 fit-container fx-centered box-pad-h-m box-pad-v-m fx-start-v fx-start-h"
              htmlFor="no-suffix"
              style={{
                opacity: isSave ? ".6" : 1,
                filter: isSave ? "grayscale(100%)" : "none",
              }}
            >
              <input
                type="radio"
                id="no-suffix"
                name="suffix"
                checked={!isSave}
                value={isSave}
                onChange={() => setIsSave(false)}
              />
              <div>
                <p className="gray-c p-small">Your comment without suffix</p>
                <p className="p-two-lines p-medium">{comment}</p>
              </div>
            </label>
            <div>
              <p className="p-medium gray-c box-pad-v-s">
                {" "}
                This can always be changed in your account settings
              </p>
            </div>
            <div className="fit-container fx-centered fx-col">
              <button
                className="btn btn-normal btn-full"
                onClick={() => {
                  saveOption();
                  post(isSave);
                  exit();
                }}
              >
                Post &amp; remember my choice
              </button>
              <button
                className="btn btn-text"
                onClick={exit}
                style={{ height: "max-content" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      </div>
    );
};

const Comment = ({ comment, action = true, noteID }) => {
  return (
    <>
      <NotesComment event={comment} rootNoteID={noteID} />
      {action && (
        <div className="fit-container fx-centered fx-end-h">
          <CommentsReplies all={comment.count} noteID={noteID} />
        </div>
      )}
    </>
  );
};

const CommentsReplies = ({ all, noteID }) => {
  return (
    <>
      <div
        className="fx-col fit-container fx-centered"
        style={{
          width: "calc(100% - 64px)",
        }}
      >
        {all.map((comment, index) => {
          return (
            <Reply
              comment={{ ...comment, count: [] }}
              index={index}
              all={all || []}
              noteID={noteID}
            />
          );
        })}
      </div>
    </>
  );
};

const Reply = ({ comment, all, noteID }) => {
  const [seeReply, setSeeReply] = useState(false);

  const repliedOn = useMemo(() => {
    let replyTo_ = comment.tags.find(
      (item) => item[0] === "e" && item.length === 4 && item[3] === "reply"
    );
    return getOnReply(all, replyTo_ ? replyTo_[1] : "");
  }, [all]);

  return (
    <>
      <div
        className={`fit-container  sc-s-18 fx-centered fx-col fx-shrink  ${
          repliedOn ? "box-pad-h-s box-pad-v-s" : ""
        }`}
        style={{
          backgroundColor: repliedOn ? "var(--c1-side)" : "",
          border: "none",
          overflow: "visible",
        }}
      >
        {repliedOn && (
          <div className="fx-start-h fx-centerd fit-container">
            <div
              className="fx-centered fit-container fx-start-h pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSeeReply(!seeReply);
              }}
            >
              <p className="c1-c p-medium">
                This is a reply to : {repliedOn.content.substring(0, 10)}...
                (See more)
              </p>
              <div
                className="arrow"
                style={{ transform: seeReply ? "rotate(180deg)" : "" }}
              ></div>
            </div>
            <div
              className="fit-container box-pad-v-s"
              style={{ display: seeReply ? "flex" : "none" }}
            >
              <NotesComment event={repliedOn} noReactions={true} />
            </div>
            <hr />
          </div>
        )}
        <div
          className="fx-centered fx-start-h fit-container"
          style={{ columnGap: "16px" }}
        >
          <NotesComment event={comment} rootNoteID={noteID} />
        </div>
      </div>
    </>
  );
};
