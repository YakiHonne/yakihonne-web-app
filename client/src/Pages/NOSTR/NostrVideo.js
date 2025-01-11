import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingScreen from "../../Components/LoadingScreen";
import { nip19, finalizeEvent, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import {
  checkForLUDS,
  decodeBolt11,
  filterRelays,
  getBech32,
  getBolt11,
  getZapper,
} from "../../Helpers/Encryptions";
import { Context } from "../../Context/Context";
import { Helmet } from "react-helmet";
import ArrowUp from "../../Components/ArrowUp";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import NumberShrink from "../../Components/NumberShrink";
import ShowUsersList from "../../Components/NOSTR/ShowUsersList";
import { Link } from "react-router-dom";
import Date_ from "../../Components/Date_";
import ZapTip from "../../Components/NOSTR/ZapTip";
import LoadingDots from "../../Components/LoadingDots";
import SaveArticleAsBookmark from "../../Components/NOSTR/SaveArticleAsBookmark";
import {
  getAuthPubkeyFromNip05,
  getNoteTree,
  getVideoContent,
  getVideoFromURL,
} from "../../Helpers/Helpers";
import LoginNOSTR from "../../Components/NOSTR/LoginNOSTR";
import Footer from "../../Components/Footer";
import ShareLink from "../../Components/ShareLink";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import Follow from "../../Components/NOSTR/Follow";
import AddArticleToCuration from "../../Components/NOSTR/AddArticleToCuration";
import ReportArticle from "../../Components/NOSTR/ReportArticle";
const pool = new SimplePool();

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
      let [content_tree, count] = await Promise.all([
        getNoteTree(comment.content.split(" — This is a comment on:")[0]),
        countReplies(comment.id, all),
      ]);
      temp.push({
        ...comment,
        content_tree,
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
        let content_tree = await getNoteTree(
          com.content.split(" — This is a comment on:")[0]
        );
        return {
          ...com,
          content_tree,
        };
      })
  );
  return res;
};

const getOnReply = (comments, comment_id) => {
  let tempCom = comments.find((item) => item.id === comment_id);
  return tempCom;
};

export default function NostrVideo() {
  const {
    nostrUser,
    nostrKeys,
    isPublishing,
    setToPublish,
    setToast,
    addNostrAuthors,
    getNostrAuthor,
    nostrAuthors,
  } = useContext(Context);
  const { id, AuthNip05, VidIdentifier } = useParams();
  const navigateTo = useNavigate();
  const [video, setVideo] = useState(false);
  const [parsedAddr, setParsedAddr] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [expandDescription, setExpandDescription] = useState(false);
  const [toLogin, setToLogin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [author, setAuthor] = useState({
    picture: "",
    name: "Video author",
    pubkey: "",
  });
  const [videoViews, setVideoViews] = useState(0);
  const [usersList, setUsersList] = useState(false);
  const [upvoteReaction, setUpvoteReaction] = useState([]);
  const [downvoteReaction, setDownvoteReaction] = useState([]);
  const [netCommentsCount, setNetCommentsCount] = useState(0);
  const [morePosts, setMorePosts] = useState([]);
  const extrasRef = useRef(null);
  const [zapsCount, setZapsCount] = useState(0);
  const [zappers, setZappers] = useState([]);
  const [reporters, setReporters] = useState([]);
  const [showReportPrompt, setShowReportPrompt] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showAddArticleToCuration, setShowArticleToCuration] = useState(false);
  const isReported = useMemo(() => {
    return nostrKeys
      ? reporters.find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [reporters]);
  const optionsRef = useRef(null);
  const isVoted = useMemo(() => {
    return nostrKeys
      ? upvoteReaction
          .concat(downvoteReaction)
          .find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [upvoteReaction, downvoteReaction, nostrKeys]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setVideoViews(0);
        setUpvoteReaction([]);
        setDownvoteReaction([]);
        setNetCommentsCount(0);
        let naddrData = await checkURL();
        setParsedAddr(naddrData);
        let sub = pool.subscribeMany(
          nostrUser
            ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
            : relaysOnPlatform,
          [
            {
              kinds: naddrData.kinds,
              authors: [naddrData.pubkey],
              "#d": [naddrData.identifier],
            },
            {
              kinds: [7, 34237],

              "#a": [
                `${34235}:${naddrData.pubkey}:${naddrData.identifier}`,
                `${34236}:${naddrData.pubkey}:${naddrData.identifier}`,
              ],
            },
            {
              kinds: [1984],

              "#a": [
                `${34235}:${naddrData.pubkey}:${naddrData.identifier}`,
                `${34236}:${naddrData.pubkey}:${naddrData.identifier}`,
              ],
            },
          ],
          {
            onevent(event) {
              if (event.kind === 1984) {
                setReporters((prev) => [...prev, event]);
              }
              if (event.kind === 7) {
                if (event.content === "+")
                  setUpvoteReaction((upvoteNews) => [...upvoteNews, event]);
                if (event.content === "-")
                  setDownvoteReaction((downvoteNews) => [
                    ...downvoteNews,
                    event,
                  ]);
              }
              if (event.kind === 34237) {
                setVideoViews((prev) => (prev += 1));
              }
              if (event.kind === 9735) {
                let sats = decodeBolt11(getBolt11(event));
                let zapper = getZapper(event);
                setZappers((prev) => {
                  return [...prev, zapper];
                });
                setZapsCount((prev) => prev + sats);
              }

              if (naddrData.kinds.includes(event.kind)) {
                addNostrAuthors([event.pubkey]);
                let parsedEvent = getVideoContent(event);
                setVideo(parsedEvent);
                setIsLoaded(true);
              }
            },
          }
        );
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, [id, AuthNip05, VidIdentifier]);

  useEffect(() => {
    try {
      let count = 0;
      let moreVideosAuthorsPubkeys = [];
      let sub = pool.subscribeMany(
        nostrUser
          ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
          : relaysOnPlatform,
        [
          {
            kinds: [34235, 34236],
            limit: 5,
          },
        ],
        {
          onevent(event) {
            count += 1;
            if (count < 7) {
              moreVideosAuthorsPubkeys.push(event.pubkey);
              setMorePosts((prev) => {
                if (!prev.find((prev_) => prev_.id === event.id))
                  return [...prev, getVideoContent(event)];
                else return prev;
              });
            }
          },
          oneose() {
            addNostrAuthors(moreVideosAuthorsPubkeys);
          },
        }
      );
    } catch (err) {
      console.log(err);
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    try {
      let auth = getNostrAuthor(video.pubkey);

      if (auth) {
        setAuthor(auth);
      }
    } catch (err) {
      console.log(err);
    }
  }, [nostrAuthors]);

  useEffect(() => {
    if (video && nostrKeys && (nostrKeys.sec || nostrKeys.ext)) {
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 34237,
        content: "",
        tags: [
          ["a", `${video.kind}:${video.pubkey}:${video.d}`],
          ["d", `${video.kind}:${video.pubkey}:${video.d}`],
        ],
        allRelays: relaysOnPlatform,
      });
    }
  }, [video, nostrKeys]);

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

  const upvoteNews = async (e) => {
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
          content: "This vote will be deleted!",
          tags: [["e", isVoted.id]],
          allRelays: nostrUser
            ? [
                ...filterRelays(relaysOnPlatform, nostrUser?.relays || []),
                "wss://nostr.wine",
              ]
            : [...relaysOnPlatform, "wss://nostr.wine"],
        });

        setIsLoading(false);

        if (isVoted.content === "+") {
          let tempArray = Array.from(upvoteReaction);
          let index = tempArray.findIndex((item) => item.id === isVoted.id);
          tempArray.splice(index, 1);
          setUpvoteReaction(tempArray);
          return false;
        }
        let tempArray = Array.from(downvoteReaction);
        let index = tempArray.findIndex((item) => item.id === isVoted.id);
        tempArray.splice(index, 1);
        setDownvoteReaction(tempArray);
      }

      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 7,
        content: "+",
        tags: [
          ["a", `${video.kind}:${video.pubkey}:${parsedAddr.identifier}`],
          ["p", video.pubkey],
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
  const downvoteNews = async (e) => {
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
          content: "This vote will be deleted!",
          tags: [["e", isVoted.id]],
          allRelays: nostrUser
            ? [
                ...filterRelays(relaysOnPlatform, nostrUser?.relays || []),
                "wss://nostr.wine",
              ]
            : [...relaysOnPlatform, "wss://nostr.wine"],
        });
        setIsLoading(false);
        if (isVoted.content === "-") {
          let tempArray = Array.from(downvoteReaction);
          let index = tempArray.findIndex((item) => item.id === isVoted.id);
          tempArray.splice(index, 1);
          setDownvoteReaction(tempArray);
          return false;
        }
        let tempArray = Array.from(upvoteReaction);
        let index = tempArray.findIndex((item) => item.id === isVoted.id);
        tempArray.splice(index, 1);
        setUpvoteReaction(tempArray);
      }
      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 7,
        content: "-",
        tags: [
          ["a", `${video.kind}:${video.pubkey}:${parsedAddr.identifier}`],
          ["p", video.pubkey],
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
  const checkURL = async () => {
    try {
      if (AuthNip05 && VidIdentifier) {
        let temPubkey = await getAuthPubkeyFromNip05(AuthNip05);
        return {
          pubkey: temPubkey,
          identifier: VidIdentifier,
          kinds: [34235, 34236],
        };
      }
      if (id) {
        let tempNaddrData = nip19.decode(id);
        return {
          pubkey: tempNaddrData.data.pubkey,
          identifier: tempNaddrData.data.identifier,
          kinds: [34235, 34236],
        };
      }
    } catch (err) {
      navigateTo("/videos");
    }
  };

  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      {toLogin && <LoginNOSTR exit={() => setToLogin(false)} />}{" "}
      {showReportPrompt && (
        <ReportArticle
          title={video.title}
          exit={() => setShowReportPrompt(false)}
          naddrData={{
            pubkey: parsedAddr.pubkey,
            identifier: parsedAddr.identifier,
          }}
          isReported={isReported}
          kind={video.kind}
        />
      )}
      {usersList && (
        <ShowUsersList
          exit={() => setUsersList(false)}
          title={usersList.title}
          list={usersList.list}
          extras={usersList.extras}
        />
      )}
      {showAddArticleToCuration && (
        <AddArticleToCuration
          d={`34235:${video.pubkey}:${parsedAddr.identifier}`}
          exit={() => setShowArticleToCuration(false)}
          kind={30005}
        />
      )}
      <div>
        <Helmet>
          <title>Yakihonne | {video.title}</title>
          <meta name="description" content={video.content} />
          <meta property="og:description" content={video.content} />
          <meta property="og:picture" content={video.image} />
          <meta
            property="og:url"
            content={`https://yakihonne.com/videos/${
              AuthNip05 && VidIdentifier ? `${AuthNip05}/${VidIdentifier}` : id
            }`}
          />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content={video.title} />
          <meta property="twitter:title" content={video.title} />
          <meta property="twitter:description" content={video.content} />
          <meta property="twitter:image" content={video.image} />
        </Helmet>

        <div className="fit-container fx-centered" style={{ columnGap: 0 }}>
          <div className="main-container">
            <SidebarNOSTR />
            <main className="main-page-nostr-container">
              <ArrowUp />

              <div className="fit-container fx-centered fx-start-h fx-start-v">
                <div
                  style={{ width: "min(100%,700px)" }}
                  className="box-pad-h-m"
                >
                  <Link
                    className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-m"
                    to={"/videos"}
                  >
                    <div className="round-icon-small">
                      <div className="arrow" style={{ rotate: "90deg" }}></div>
                    </div>
                    <div>Back to videos</div>
                  </Link>
                  <div className="box-pad-h-m">
                    {getVideoFromURL(video.url)}
                    <div
                      className="fx-centered fx-col fx-start-h fx-start-v"
                      style={{ marginTop: ".5rem" }}
                    >
                      <h4>{video.title}</h4>
                    </div>
                    <div className="fx-scattered fit-container box-pad-v-m">
                      <div className="fx-centered">
                        <UserProfilePicNOSTR
                          img={author.picture}
                          size={24}
                          user_id={author.pubkey}
                          allowClick={true}
                          ring={false}
                        />
                        <p>{author.name}</p>
                        <Follow
                          size="small"
                          toFollowKey={author.pubkey}
                          toFollowName={""}
                          bulkList={[]}
                        />
                        {video && (
                          <div className="round-icon-small">
                            <ZapTip
                              recipientLNURL={checkForLUDS(
                                author.lud06,
                                author.lud16
                              )}
                              recipientPubkey={author.pubkey}
                              senderPubkey={nostrUser.pubkey}
                              recipientInfo={{
                                name: author.name,
                                img: author.picture,
                              }}
                              aTag={`30023:${video.pubkey}:${video.d}`}
                              forContent={video.title}
                              onlyIcon={true}
                              smallIcon={true}
                            />
                          </div>
                        )}
                      </div>
                      <div className="fx-centered">
                        <div className="fx-centered" style={{ columnGap: 0 }}>
                          <div
                            className={`fx-centered pointer sc-s box-pad-h-m ${
                              isLoading ? "flash" : ""
                            }`}
                            style={{
                              columnGap: "8px",
                              paddingTop: ".25rem",
                              paddingBottom: ".25rem",
                              borderTopRightRadius: 0,
                              borderBottomRightRadius: 0,
                            }}
                          >
                            <div onClick={upvoteNews}>
                              <div
                                className={
                                  isVoted?.content === "+"
                                    ? "like-bold"
                                    : "like"
                                }
                                style={{
                                  opacity: isVoted?.content === "-" ? ".2" : 1,
                                }}
                              ></div>
                            </div>
                            <div
                              className="icon-tooltip"
                              data-tooltip="Upvoters"
                              onClick={(e) => {
                                e.stopPropagation();
                                upvoteReaction.length > 0 &&
                                  setUsersList({
                                    title: "Upvoters",
                                    list: upvoteReaction.map(
                                      (item) => item.pubkey
                                    ),
                                    extras: [],
                                  });
                              }}
                            >
                              <NumberShrink value={upvoteReaction.length} />
                            </div>
                          </div>
                          <div
                            className={`fx-centered pointer sc-s box-pad-h-m ${
                              isLoading ? "flash" : ""
                            }`}
                            style={{
                              columnGap: "8px",
                              paddingTop: ".25rem",
                              paddingBottom: ".25rem",
                              borderTopLeftRadius: 0,
                              borderBottomLeftRadius: 0,
                            }}
                          >
                            <div onClick={downvoteNews}>
                              <div
                                className={
                                  isVoted?.content === "-"
                                    ? "like-bold"
                                    : "like"
                                }
                                style={{
                                  transform: "rotate(180deg)",
                                  opacity: isVoted?.content === "+" ? ".2" : 1,
                                }}
                              ></div>
                            </div>
                            <div
                              className="icon-tooltip"
                              data-tooltip="Downvoters"
                              onClick={(e) => {
                                e.stopPropagation();
                                downvoteReaction.length > 0 &&
                                  setUsersList({
                                    title: "Downvoters",
                                    list: downvoteReaction.map(
                                      (item) => item.pubkey
                                    ),
                                    extras: [],
                                  });
                              }}
                            >
                              <NumberShrink value={downvoteReaction.length} />
                            </div>
                          </div>
                        </div>
                        <div style={{ position: "relative" }} ref={optionsRef}>
                          <div
                            className="round-icon-small round-icon-tooltip"
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
                              {nostrKeys && nostrKeys.pub !== video.pubkey && (
                                <>
                                  <div
                                    className="fit-container fx-centered fx-start-h pointer"
                                    onClick={() =>
                                      setShowArticleToCuration(true)
                                    }
                                  >
                                    <p>Add to curation</p>
                                  </div>
                                  <SaveArticleAsBookmark
                                    label="Bookmark video"
                                    pubkey={video.pubkey}
                                    kind={video.kind}
                                    d={parsedAddr.identifier}
                                    image={video.image}
                                  />
                                </>
                              )}
                              <div className="fit-container fx-centered fx-start-h pointer">
                                <ShareLink
                                  label="Share video"
                                  path={`/videos/${video.naddr}`}
                                  title={author.display_name || author.name}
                                  description={video.content}
                                  kind={34235}
                                  shareImgData={{
                                    post: {
                                      ...video,
                                      description: video.content,
                                    },
                                    author,
                                    likes: upvoteReaction.length,
                                    dislikes: downvoteReaction.length,
                                    views: videoViews,
                                  }}
                                />
                              </div>
                              {!isReported && (
                                <div
                                  className="fit-container fx-centered fx-start-h pointer"
                                  onClick={() => setShowReportPrompt(true)}
                                >
                                  <p>Report this video</p>
                                </div>
                              )}
                              {isReported && (
                                <div className="fit-container fx-centered fx-start-h pointer">
                                  <p className="orange-c">Reported!</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className="fit-container sc-s-18 box-pad-h-m box-pad-v-m fx-centered fx-start-h fx-start-v fx-wrap pointer"
                      style={{
                        border: "none",
                        backgroundColor: "var(--c1-side)",
                      }}
                      onClick={() => setExpandDescription(!expandDescription)}
                    >
                      <div className="fit-container fx-centered fx-start-h">
                        <p className="gray-c p-medium">{videoViews} view(s)</p>
                        <p className="p-small gray-c">&#9679;</p>
                        <p className="gray-c p-medium">
                          <Date_
                            toConvert={new Date(
                              video.published_at * 1000
                            ).toString()}
                            time={true}
                          />
                        </p>
                      </div>
                      <p
                        className={`fit-container ${
                          !expandDescription ? "p-four-lines" : ""
                        }`}
                      >
                        {video.content}
                      </p>
                      {!video.content && (
                        <p className="gray-c p-medium p-italic">
                          No description.
                        </p>
                      )}

                      <div className="fx-centered fx-start-h fx-wrap">
                        {video.keywords.map((tag, index) => {
                          return (
                            <Link
                              key={index}
                              className="sticker sticker-small sticker-gray-gray pointer"
                              to={`/tags/${tag?.replace("#", "%23")}`}
                            >
                              {tag}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                    <CommentsSection
                      id={video.id}
                      aTag={`${video.kind}:${video.pubkey}:${video.d}`}
                      author_pubkey={video.pubkey}
                      nEvent={
                        AuthNip05 && VidIdentifier
                          ? `${AuthNip05}/${VidIdentifier}`
                          : id
                      }
                      setNetCommentsCount={setNetCommentsCount}
                    />
                  </div>
                </div>
                {morePosts.length > 0 && (
                  <div
                    className=" fx-centered fx-col fx-start-v extras-homepage"
                    style={{
                      position: "sticky",
                      top: extrasRef.current
                        ? `min(0,calc(95vh - ${
                            extrasRef.current?.getBoundingClientRect().height
                          }px))`
                        : 0,
                      zIndex: "100",
                      width: "min(100%, 400px)",
                    }}
                    ref={extrasRef}
                  >
                    <div className="sticky fit-container">
                      <SearchbarNOSTR />
                    </div>
                    <div
                      className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v box-marg-s"
                      style={{
                        backgroundColor: "var(--c1-side)",
                        rowGap: "24px",
                        border: "none",
                      }}
                    >
                      <h4>You might also like</h4>
                      <div className="fit-container fx-centered fx-wrap">
                        {morePosts.map((video_) => {
                          if (video_.id !== video.id)
                            return (
                              <Link
                                key={video_.id}
                                className="fit-container fx-centered fx-start-h"
                                to={`/videos/${video_.naddr}`}
                                target="_blank"
                              >
                                <div
                                  style={{
                                    minWidth: "128px",
                                    aspectRatio: "16/9",
                                    borderRadius: "var(--border-r-6)",
                                    backgroundImage: `url(${video_.image})`,
                                    backgroundColor: "black",
                                  }}
                                  className="bg-img cover-bg fx-centered fx-end-v fx-end-h box-pad-h-s box-pad-v-s"
                                >
                                  <div
                                    className="sticker sticker-small"
                                    style={{
                                      backgroundColor: "black",
                                      color: "white",
                                    }}
                                  >
                                    {video_.duration}
                                  </div>
                                </div>
                                <div>
                                  <p className="p-small gray-c">
                                    <Date_
                                      toConvert={
                                        new Date(video_.published_at * 1000)
                                      }
                                    />
                                  </p>
                                  <p className="p-medium p-two-lines">
                                    {video_.title}
                                  </p>
                                  <AuthorPreviewExtra pubkey={video_.pubkey} />
                                </div>
                              </Link>
                            );
                        })}
                      </div>
                    </div>
                    <Footer />
                    <div className="box-marg-full"></div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

const CommentsSection = ({
  author_pubkey,
  aTag,
  nEvent,
  setNetCommentsCount,
}) => {
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
      let tempComment = suffix
        ? `${newComment} — This is a comment on: https://yakihonne.com/videos/${nEvent}`
        : newComment;
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 1,
        content: tempComment,
        tags: [
          ["a", aTag, "", "root"],
          ["p", author_pubkey],
        ],
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

  const refreshRepleis = (index, mainCommentIndex) => {
    let tempArray_1 = Array.from(comments);
    let tempArray_2 = Array.from(netComments[mainCommentIndex].count);
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
          "#a": [aTag],
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
            <p className="p-centered gray-c">Nobody commented on this news</p>
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
              refreshRepleis={(data) => {
                refreshRepleis(data, index);
              }}
              index={index}
              onClick={() => {
                setShowReplies(true);
                setSelectedComment(comment);
                setSelectedCommentIndex(index);
              }}
              nEvent={nEvent}
              aTag={aTag}
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
                  — This is a comment on: https://yakihonne.com/video/
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

const Comment = ({
  comment,
  refresh,
  refreshRepleis,
  index,
  onClick,
  action = true,
  nEvent,
  aTag,
}) => {
  const { nostrUser, nostrKeys, setToPublish, isPublishing, setToast } =
    useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationPrompt, setConfirmationPrompt] = useState(false);
  const [toggleReply, setToggleReply] = useState(false);

  const handleCommentDeletion = async () => {
    try {
      if (isPublishing) {
        setToast({
          type: 3,
          desc: "An event publishing is in process!",
        });
        return;
      }
      setIsLoading(true);
      let relaysToPublish = filterRelays(
        nostrUser?.relays || [],
        relaysOnPlatform
      );
      let created_at = Math.floor(Date.now() / 1000);
      let tags = [["e", comment.id]];

      let event = {
        kind: 5,
        content: "This comment will be deleted!",
        created_at,
        tags,
      };
      if (nostrKeys.ext) {
        try {
          event = await window.nostr.signEvent(event);
          refresh(index);
          setIsLoading(false);
        } catch (err) {
          setIsLoading(false);
          console.log(err);
          return false;
        }
      } else {
        event = finalizeEvent(event, nostrKeys.sec);
      }
      setToPublish({
        eventInitEx: event,
        allRelays: relaysToPublish,
      });

      refresh(index);
      setIsLoading(false);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {confirmationPrompt && (
        <ToDeleteComment
          comment={comment}
          exit={(e) => {
            e.stopPropagation();
            setConfirmationPrompt(false);
          }}
          handleCommentDeletion={(e) => {
            e.stopPropagation();
            setConfirmationPrompt(false);
            handleCommentDeletion();
          }}
        />
      )}

      <div
        className={`fit-container box-pad-h box-pad-v sc-s-18 fx-centered fx-col fx-shrink  ${
          isLoading ? "flash" : ""
        }`}
        style={{
          backgroundColor: "var(--very-dim-gray)",
          border: "none",
          pointerEvents: isLoading ? "none" : "auto",
        }}
      >
        <div className="fit-container fx-scattered fx-start-v">
          <div className="fx-centered" style={{ columnGap: "16px" }}>
            <AuthorPreview
              author={{
                author_img: "",
                author_name: comment.pubkey.substring(0, 20),
                author_pubkey: comment.pubkey,
                on: new Date(comment.created_at * 1000).toISOString(),
              }}
            />
          </div>
          {comment.pubkey === nostrKeys.pub && action && (
            <div
              className="fx-centered pointer"
              style={{ columnGap: "3px" }}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmationPrompt(true);
              }}
            >
              <div className="trash-24"></div>
            </div>
          )}
        </div>
        <div
          className="fx-centered fx-start-h fit-container"
          style={{ columnGap: "16px" }}
        >
          <div style={{ minWidth: "24px" }}></div>
          <div>{comment.content_tree}</div>
        </div>

        {action && (
          <div
            className="fx-centered fx-start-h fit-container"
            style={{ columnGap: "16px" }}
          >
            <div className="fx-centered">
              <div style={{ minWidth: "24px" }}></div>
              <div className="fx-centered">
                <div className="comment-icon"></div>
                <p className="p-medium ">
                  {comment.count.length}{" "}
                  <span className="gray-c">Reply(ies)</span>{" "}
                </p>
              </div>
            </div>
            <div onClick={() => setToggleReply(true)}>
              <p className="gray-c p-medium pointer btn-text">Reply</p>
            </div>
          </div>
        )}
      </div>
      {action && (
        <div className="fit-container fx-centered fx-end-h">
          <CommentsReplies
            refresh={refreshRepleis}
            comment={comment}
            all={comment.count}
            nEvent={nEvent}
            aTag={aTag}
            toggleReply={toggleReply}
            setToggleReply={setToggleReply}
          />
        </div>
      )}
    </>
  );
};

const CommentsReplies = ({
  comment,
  exit,
  all,
  nEvent,
  refresh,
  aTag,
  toggleReply,
  setToggleReply,
}) => {
  const { nostrUser, nostrKeys, setToPublish, isPublishing, setToast } =
    useContext(Context);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectReplyTo, setSelectReplyTo] = useState(false);
  const [showCommentsSuffixOption, setShowCommentsSuffixOption] =
    useState(false);
  const ref = useRef(null);

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

      let tempComment = suffix
        ? `${newComment} — This is a comment on: https://yakihonne.com/video/${nEvent}`
        : newComment;
      let tags = [["a", aTag, "", "root"]];
      if (selectReplyTo) tags.push(["e", selectReplyTo.id, "", "reply"]);
      if (!selectReplyTo) tags.push(["e", comment.id, "", "reply"]);

      setToPublish({
        nostrKeys: nostrKeys,
        kind: 1,
        content: tempComment,
        tags,
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });
      setIsLoading(false);
      setNewComment("");
      setSelectReplyTo(false);
      setToggleReply(false);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {toggleReply && nostrKeys && (
        <div className="fixed-container fx-centered box-pad-h" ref={ref}>
          <div
            className="fx-centered fx-wrap"
            style={{ width: "min(100%, 600px)" }}
          >
            {!selectReplyTo && (
              <div
                className="fit-container box-pad-h box-pad-v sc-s-18 fx-centered fx-col fx-shrink"
                style={{
                  backgroundColor: "var(--very-dim-gray)",
                  border: "none",
                  pointerEvents: isLoading ? "none" : "auto",
                }}
              >
                <div className="fit-container fx-scattered fx-start-v">
                  <div className="fx-centered" style={{ columnGap: "16px" }}>
                    <AuthorPreview
                      author={{
                        author_img: "",
                        author_name: comment.pubkey.substring(0, 20),
                        author_pubkey: comment.pubkey,
                        on: new Date(comment.created_at * 1000).toISOString(),
                      }}
                    />
                  </div>
                </div>
                <div
                  className="fx-centered fx-start-h fit-container"
                  style={{ columnGap: "16px" }}
                >
                  <div style={{ minWidth: "24px" }}></div>
                  <div className="fit-container">{comment.content_tree}</div>
                </div>
              </div>
            )}
            {selectReplyTo && (
              <div
                className="fit-container box-pad-h box-pad-v sc-s-18 fx-centered fx-col fx-shrink"
                style={{
                  backgroundColor: "var(--c1-side)",
                  border: "none",
                }}
              >
                <div className="fit-container fx-scattered fx-start-v">
                  <div className="fx-centered" style={{ columnGap: "16px" }}>
                    <AuthorPreview
                      author={{
                        author_img: "",
                        author_name: selectReplyTo.pubkey.substring(0, 20),
                        author_pubkey: selectReplyTo.pubkey,
                        on: new Date(
                          selectReplyTo.created_at * 1000
                        ).toISOString(),
                      }}
                    />
                  </div>
                </div>
                <div
                  className="fx-centered fx-start-h fit-container"
                  style={{ columnGap: "16px" }}
                >
                  <div style={{ minWidth: "24px" }}></div>
                  <div className="fit-container">{selectReplyTo.content}</div>
                </div>
              </div>
            )}
            <textarea
              className="txt-area ifs-full"
              placeholder={
                selectReplyTo ? "Reply to reply..." : "Reply to comment.."
              }
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="fx-centered fit-container fx-end-h">
              <button
                className="btn btn-normal  fx-centered"
                onClick={() => newComment && setShowCommentsSuffixOption(true)}
              >
                {isLoading && <LoadingDots />}
                {!isLoading && <>Post a comment</>}
              </button>
              <button
                className="btn btn-gst-red"
                onClick={() => {
                  setSelectReplyTo(false);
                  setToggleReply(false);
                }}
              >
                {" "}
                &#10005;
              </button>
            </div>
          </div>
        </div>
      )}
      {showCommentsSuffixOption && (
        <AddSuffixToComment
          post={postNewComment}
          comment={newComment}
          exit={() => setShowCommentsSuffixOption(false)}
          nEvent={nEvent}
        />
      )}
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
              setSelectReplyTo={setSelectReplyTo}
              key={comment.id}
              refresh={refresh}
              setToggleReply={setToggleReply}
            />
          );
        })}
      </div>
    </>
  );
};

const Reply = ({
  comment,
  refresh,
  index,
  all,
  setSelectReplyTo,
  setToggleReply,
}) => {
  const { nostrUser, nostrKeys, setToPublish, isPublishing, setToast } =
    useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationPrompt, setConfirmationPrompt] = useState(false);
  const [seeReply, setSeeReply] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const repliedOn = useMemo(() => {
    return getOnReply(
      all,
      comment.tags.find(
        (item) => item[0] === "e" && item.length === 4 && item[3] === "reply"
      )[1] || ""
    );
  }, [all]);

  const handleCommentDeletion = async () => {
    try {
      if (isPublishing) {
        setToast({
          type: 3,
          desc: "An event publishing is in process!",
        });
        return;
      }
      setIsLoading(true);
      let relaysToPublish = filterRelays(
        nostrUser?.relays || [],
        relaysOnPlatform
      );
      let created_at = Math.floor(Date.now() / 1000);
      let tags = [["e", comment.id]];

      let event = {
        kind: 5,
        content: "This comment will be deleted!",
        created_at,
        tags,
      };
      if (nostrKeys.ext) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          console.log(err);
          refresh(index);
          setIsLoading(false);
          return false;
        }
      } else {
        event = finalizeEvent(event, nostrKeys.sec);
      }
      setToPublish({
        eventInitEx: event,
        allRelays: relaysToPublish,
      });
      refresh(index);
      setIsLoading(false);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {confirmationPrompt && (
        <ToDeleteComment
          comment={comment}
          exit={(e) => setConfirmationPrompt(false)}
          handleCommentDeletion={() => {
            setConfirmationPrompt(false);
            handleCommentDeletion();
          }}
        />
      )}
      <div
        className={`fit-container box-pad-h box-pad-v sc-s-18 fx-centered fx-col fx-shrink  ${
          isLoading ? "flash" : ""
        }`}
        style={{
          backgroundColor: "var(--c1-side)",
          border: "none",
        }}
      >
        <div className="fit-container fx-scattered fx-start-v">
          <div className="fx-centered" style={{ columnGap: "16px" }}>
            <AuthorPreview
              author={{
                author_img: "",
                author_name: comment.pubkey.substring(0, 20),
                author_pubkey: comment.pubkey,
                on: new Date(comment.created_at * 1000).toISOString(),
              }}
            />
          </div>
          {comment.pubkey === nostrKeys.pub && (
            <div
              className="fx-centered pointer"
              style={{ columnGap: "3px" }}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmationPrompt(true);
              }}
            >
              <div className="trash-24"></div>
            </div>
          )}
        </div>
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
                Replied to : {repliedOn.content.substring(0, 10)}... (See more)
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
              {" "}
              <Comment
                comment={{ ...repliedOn, count: [] }}
                action={false}
              />{" "}
            </div>
            <hr />
          </div>
        )}
        <div
          className="fx-centered fx-start-h fit-container"
          style={{ columnGap: "16px" }}
        >
          <div className="fit-container">{comment.content_tree}</div>
        </div>
        <div
          className="fx-centered fx-start-h fit-container"
          style={{ columnGap: "16px" }}
          onClick={() => {
            nostrKeys
              ? setSelectReplyTo({
                  id: comment.id,
                  content: comment.content_tree,
                  created_at: comment.created_at,
                  pubkey: comment.pubkey,
                })
              : setShowLogin(true);
            setToggleReply(true);
          }}
        >
          <p className="gray-c p-medium pointer btn-text">Reply</p>
        </div>
      </div>
    </>
  );
};

const AuthorPreview = ({ author }) => {
  const [authorData, setAuthorData] = useState("");
  const { getNostrAuthor, nostrAuthors } = useContext(Context);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let auth = getNostrAuthor(author.author_pubkey);

        if (auth)
          setAuthorData({
            author_img: auth.picture,
            author_name: auth.name,
            author_pubkey: auth.pubkey,
          });
        return;
      } catch (err) {
        console.log(err);
      }
    };
    if (!authorData) fetchData();
  }, [nostrAuthors]);

  if (!authorData)
    return (
      <div className="fx-centered" style={{ opacity: ".5" }}>
        <UserProfilePicNOSTR
          size={24}
          ring={false}
          img={author.author_img}
          mainAccountUser={false}
          user_id={author.author_pubkey}
        />
        <div>
          <p className="gray-c p-medium">
            On <Date_ time={true} toConvert={author.on} />
          </p>
          <p className="p-one-line p-medium">
            By: <span className="c1-c">{author.author_name}</span>
          </p>
        </div>
      </div>
    );

  return (
    <>
      <UserProfilePicNOSTR
        size={24}
        ring={false}
        img={authorData.author_img}
        mainAccountUser={false}
        user_id={authorData.author_pubkey}
      />
      <div>
        <p className="gray-c p-medium">
          On <Date_ time={true} toConvert={author.on} />
        </p>
        <p className="p-one-line p-medium">
          By: <span className="c1-c">{authorData.author_name}</span>
        </p>
      </div>
    </>
  );
};

const ToDeleteComment = ({ comment, exit, handleCommentDeletion }) => {
  return (
    <div className="fixed-container fx-centered box-pad-h">
      <section
        className="box-pad-h box-pad-v sc-s fx-centered fx-col"
        style={{ position: "relative", width: "min(100%, 350px)" }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <h4 className="p-centered">
          Delete{" "}
          <span className="orange-c" style={{ wordBreak: "break-word" }}>
            "
            {comment.content
              .split(" — This is a comment on:")[0]
              .substring(0, 100)}
            "?
          </span>
        </h4>
        <p className="p-centered gray-c box-pad-v-m">
          Do you wish to delete this comment?
        </p>
        <div className="fit-container fx-centered">
          <button className="btn btn-normal fx" onClick={handleCommentDeletion}>
            Delete
          </button>
          <button className="btn btn-gst fx" onClick={exit}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
};

const AuthorPreviewExtra = ({ pubkey }) => {
  const { nostrAuthors, getNostrAuthor } = useContext(Context);
  const [author, setAuthor] = useState({
    pubkey,
    name: getBech32("npub", pubkey).substring(0, 10),
    picture: "",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    if (!isLoaded) {
      let auth = getNostrAuthor(pubkey);
      if (auth) {
        setAuthor(auth);
        setIsLoaded(true);
      }
    }
  }, [nostrAuthors]);

  return (
    <div className="fx-centered fx-start-h">
      <UserProfilePicNOSTR
        size={16}
        ring={false}
        img={author.picture}
        mainAccountUser={false}
        user_id={author.pubkey}
      />

      <p className="p-one-line p-medium">{author.name}</p>
    </div>
  );
};
