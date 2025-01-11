import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Context } from "../../Context/Context";
import relaysOnPlatform from "../../Content/Relays";
import { SimplePool, nip19 } from "nostr-tools";
import {
  checkForLUDS,
  filterRelays,
  getBech32,
  getEmptyNostrUser,
} from "../../Helpers/Encryptions";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import ShowUsersList from "./ShowUsersList";
import { getAuthPubkeyFromNip05, getNoteTree } from "../../Helpers/Helpers";
import Date_ from "../Date_";
import { useNavigate } from "react-router-dom";
import LoadingDots from "../LoadingDots";
import QuoteNote from "./QuoteNote";
import SaveArticleAsBookmark from "./SaveArticleAsBookmark";
import ShareLink from "../ShareLink";
import ZapTip from "./ZapTip";
import NumberShrink from "../NumberShrink";

const pool = new SimplePool();

export default function KindOne({ event, reactions = true }) {
  const {
    nostrKeys,
    nostrUser,
    nostrAuthors,
    getNostrAuthor,
    isPublishing,
    setToPublish,
    setToast,
    mutedList,
  } = useContext(Context);
  const navigate = useNavigate();

  const [user, setUser] = useState(getEmptyNostrUser(event.pubkey));
  const [isNip05Verified, setIsNip05Verified] = useState(false);
  const [toggleComment, setToggleComment] = useState(false);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuoteBox, setShowQuoteBox] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [usersList, setUsersList] = useState(false);
  const [reactions_, setReactions] = useState([]);
  const [zapsCount, setZapsCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [zappers, setZappers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [reposts, setReposts] = useState([]);

  const optionsRef = useRef(null);
  const isVoted = useMemo(() => {
    return nostrKeys
      ? reactions_.find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [reactions_, nostrKeys]);
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
      let index = mutedList.findIndex((item) => item === user?.pubkey);
      if (index === -1) {
        return false;
      }
      return { index };
    };
    return checkProfile();
  }, [mutedList, user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let tempPubkey = event.pubkey;
        let auth = getNostrAuthor(tempPubkey);
        if (auth) {
          setUser(auth);
          let checknip05 = auth.nip05
            ? await getAuthPubkeyFromNip05(auth.nip05)
            : false;
          if (checknip05) setIsNip05Verified(true);
        }
      } catch (err) {}
    };
    fetchData();
  }, [nostrAuthors]);

  useEffect(() => {
    if (!isPublishing) {
      setIsLoading(false);
      setToggleComment(false);
      setComment("");
    }
  }, [isPublishing]);

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

  const onClick = (e) => {
    e.stopPropagation();
    let isSelected = window.getSelection().toString();
    if (!reactions) {
      redirect(e);
      return;
    }
    if (isSelected) return null;
    navigate(`/notes/${event.nEvent}`);
  };

  const redirect = (e) => {
    e.stopPropagation();
    if (window.location.pathname.includes("/notes/"))
      navigate(`/notes/${event.nEvent}`);
    else window.location = `/notes/${event.nEvent}`;
  };

  const commentNote = async (e) => {
    e.stopPropagation();
    if (isLoading || !comment) return;
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    try {
      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 1,
        content: comment,
        tags: [
          ["e", event.id, "", "root"],
          ["p", event.pubkey],
        ],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])]
          : relaysOnPlatform,
      });
    } catch (err) {
      console.log(err);
      setIsLoading(false);
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
        tempTags.push(["p", event.pubkey]);
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
    navigator.clipboard.writeText(event.nEvent);
    setToast({
      type: 1,
      desc: `Note ID was copied! 👏`,
    });
  };

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

        let tempArray = Array.from(reactions_);
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
          ["e", event.id],
          ["p", event.pubkey],
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
        content: event.stringifiedEvent,
        tags: [
          ["e", event.id],
          ["p", event.pubkey],
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

  return (
    <div
      className={`fit-container ${
        !toggleComment ? "" : "box-pad-h-m box-pad-v-m sc-s-18"
      }`}
      style={{
        backgroundColor: !toggleComment ? "" : "var(--c1-side)",
        transition: ".2s ease-in-out",
        overflow: "visible",
      }}
    >
      {showQuoteBox && (
        <QuoteNote note={event} exit={() => setShowQuoteBox(false)} />
      )}
      {usersList && (
        <ShowUsersList
          exit={() => setUsersList(false)}
          title={usersList.title}
          list={usersList.list}
          extras={usersList.extras}
        />
      )}
      <div
        className="box-pad-h-m box-pad-v-m sc-s-18 fit-container pointer"
        style={{
          backgroundColor: "var(--c1-side)",
          transition: ".2s ease-in-out",
          overflow: "visible",
        }}
        onClick={reactions ? null : redirect}
      >
        <div
          className="fit-container fx-scattered box-marg-s"
          onClick={onClick}
        >
          <div className="fx-centered fx-start-h ">
            <UserProfilePicNOSTR
              size={40}
              mainAccountUser={false}
              ring={false}
              user_id={user.pubkey}
              img={user.picture}
              metadata={user}
            />
            <div>
              <p className="p-bold">{user.display_name || user.name}</p>
              <p
                className={`p-medium ${
                  isNip05Verified ? "orange-c round-icon-tooltip" : "gray-c"
                }`}
                data-tooltip="Verified nip05"
              >
                @{user.name || user.display_name}
              </p>
            </div>
          </div>
          <p className="gray-c p-medium">
            <Date_ toConvert={new Date(event.created_at * 1000)} time={true} />
          </p>
        </div>
        <div className="fx-centered fx-col fit-container">
          <div className="fit-container" onClick={onClick}>
            {event.note_tree}
          </div>
        </div>
        {reactions && (
          <div
            className="fx-scattered fit-container"
            style={{ paddingTop: "1rem" }}
          >
            <div className="fx-centered" style={{ columnGap: "16px" }}>
              <div className="fx-centered">
                <div className="icon-tooltip" data-tooltip="Leave a comment">
                  <div
                    className="comment-icon"
                    onClick={() => setToggleComment(!toggleComment)}
                  ></div>
                </div>
                <div
                  className="icon-tooltip"
                  data-tooltip="See comments"
                  onClick={redirect}
                >
                  <p className="p-medium">{comments.length}</p>
                </div>
              </div>
              <div className="fx-centered">
                <div
                  className={"icon-tooltip"}
                  data-tooltip="React"
                  onClick={reactToNote}
                >
                  <div className={isVoted ? "heart-bold" : "heart"}></div>
                </div>
                <div
                  className={`icon-tooltip ${
                    isVoted ? "orange-c" : ""
                  } p-medium`}
                  data-tooltip="Reactions from"
                  onClick={(e) => {
                    e.stopPropagation();
                    reactions_.length > 0 &&
                      setUsersList({
                        title: "Reactions from",
                        list: reactions_.map((item) => item.pubkey),
                        extras: [],
                      });
                  }}
                >
                  <NumberShrink value={reactions_.length} />
                </div>
              </div>
              <div
                className={`fx-centered pointer ${isLoading ? "flash" : ""}`}
                style={{ columnGap: "8px" }}
              >
                <div
                  className={"icon-tooltip"}
                  data-tooltip="Repost note"
                  onClick={repostNote}
                >
                  <div
                    className={
                      isReposted ? "switch-arrows-bold" : "switch-arrows"
                    }
                  ></div>
                </div>
                <div
                  className={`icon-tooltip ${
                    isReposted ? "orange-c" : ""
                  } p-medium`}
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
              <div className="fx-centered">
                <div className="icon-tooltip" data-tooltip="Quote note">
                  <div
                    className={
                      isQuoted ? "quote-bold pointer" : "quote pointer"
                    }
                    onClick={() => setShowQuoteBox(!showQuoteBox)}
                  ></div>
                </div>
                <div
                  className={`icon-tooltip ${
                    isQuoted ? "orange-c" : ""
                  } p-medium`}
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
              <div className="fx-centered">
                <div className="icon-tooltip" data-tooltip="Tip note">
                  <ZapTip
                    recipientLNURL={checkForLUDS(user.lud06, user.lud16)}
                    recipientPubkey={event.pubkey}
                    senderPubkey={nostrUser.pubkey}
                    recipientInfo={{
                      name: user.name,
                      picture: user.picture,
                    }}
                    eTag={event.id}
                    forContent={event.content.substring(0, 40)}
                    onlyIcon={true}
                    smallIcon={true}
                  />
                </div>
                <div
                  className={`icon-tooltip p-medium`}
                  data-tooltip="Zappers"
                  onClick={(e) => {
                    e.stopPropagation();
                    zapsCount > 0 &&
                      setUsersList({
                        title: "Zappers",
                        list: zappers.map((item) => item.pubkey),
                        extras: zappers,
                      });
                  }}
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
                <div className="fx-centered fx-col" style={{ rowGap: 0 }}>
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
                  {nostrKeys && nostrKeys.pub !== event.pubkey && (
                    <>
                      <SaveArticleAsBookmark
                        label="Bookmark note"
                        pubkey={event.id}
                        kind={"1"}
                        itemType="e"
                      />
                    </>
                  )}
                  <div className="fit-container fx-centered fx-start-h pointer">
                    <ShareLink
                      label="Share note"
                      path={`/notes/${event.nEvent}`}
                      title={user.display_name || user.name}
                      description={event.content}
                      kind={1}
                      shareImgData={{
                        post: event,
                        author: user,
                        label: "Note",
                      }}
                    />
                  </div>
                  {event.pubkey !== nostrKeys.pub && (
                    <div
                      onClick={muteUnmute}
                      className="fit-container fx-scattered pointer"
                    >
                      {isMuted ? (
                        <p className="red-c">Unmute user</p>
                      ) : (
                        <p className="red-c">Mute user</p>
                      )}
                      {isMuted ? (
                        <div className="unmute-24"></div>
                      ) : (
                        <div className="mute-24"></div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {toggleComment && (
        <div
          className="fit-container fx-centered fx-start-v slide-up"
          style={{ paddingTop: ".5rem" }}
        >
          <UserProfilePicNOSTR
            size={48}
            mainAccountUser={true}
            allowClick={false}
            ring={false}
          />
          <div className="fit-container fx-centered fx-wrap">
            <div className="fit-container">
              <textarea
                // type="text"
                className="txt-area ifs-full if "
                placeholder="Comment on this note"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="fx-centered fit-container fx-end-h">
              <button
                className="btn btn-gst-red btn-small"
                onClick={() => setToggleComment(!toggleComment)}
                disabled={isLoading}
              >
                {isLoading ? <LoadingDots /> : "Cancel"}
              </button>
              <button
                className="btn btn-normal btn-small"
                onClick={commentNote}
                disabled={isLoading}
              >
                {isLoading ? <LoadingDots /> : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
