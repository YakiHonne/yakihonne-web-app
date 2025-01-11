import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingScreen from "../../Components/LoadingScreen";
import { nip19, finalizeEvent, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import { filterRelays } from "../../Helpers/Encryptions";
import { Context } from "../../Context/Context";
import { Helmet } from "react-helmet";
import ArrowUp from "../../Components/ArrowUp";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import NumberShrink from "../../Components/NumberShrink";
import ShowUsersList from "../../Components/NOSTR/ShowUsersList";
import { Link } from "react-router-dom";
import Date_ from "../../Components/Date_";
import LoadingDots from "../../Components/LoadingDots";
import SaveArticleAsBookmark from "../../Components/NOSTR/SaveArticleAsBookmark";
import { getAIFeedContent, getNoteTree } from "../../Helpers/Helpers";
import LoginNOSTR from "../../Components/NOSTR/LoginNOSTR";
import Footer from "../../Components/Footer";
import ShareLink from "../../Components/ShareLink";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
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

export default function NostrBuzzFeed() {
  const { nostrUser, nostrKeys, isPublishing, setToPublish, setToast } =
    useContext(Context);
  const { nevent } = useParams();
  const navigateTo = useNavigate();
  const [news, setNews] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toLogin, setToLogin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [author, setAuthor] = useState("");
  const [usersList, setUsersList] = useState(false);
  const [upvoteReaction, setUpvoteReaction] = useState([]);
  const [downvoteReaction, setDownvoteReaction] = useState([]);
  const [netCommentsCount, setNetCommentsCount] = useState(0);
  const [sourceName, setSourceName] = useState("");
  const [morePosts, setMorePosts] = useState([]);
  const extrasRef = useRef(null);

  const isVoted = useMemo(() => {
    return nostrKeys
      ? upvoteReaction
          .concat(downvoteReaction)
          .find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [upvoteReaction, downvoteReaction, nostrKeys]);

  useEffect(() => {
    try {
      setUpvoteReaction([]);
      setDownvoteReaction([]);
      setNetCommentsCount(0);
      const id = nip19.decode(nevent)?.data.id;

      let sub = pool.subscribeMany(
        nostrUser
          ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
          : relaysOnPlatform,
        [
          {
            kinds: [1],
            ids: [id],
          },
          {
            kinds: [7],
            "#e": [id],
          },
        ],
        {
          onevent(event) {
            if (event.kind === 7) {
              if (event.content === "+")
                setUpvoteReaction((upvoteNews) => [...upvoteNews, event]);
              if (event.content === "-")
                setDownvoteReaction((downvoteNews) => [...downvoteNews, event]);
            }
            if (event.kind === 1) {
              let parsedEvent = getAIFeedContent(event);
              if (parsedEvent.is_authentic) {
                setNews(parsedEvent);
                setSourceName(parsedEvent.source_name);
                setIsLoaded(true);
              }
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
    try {
      if (!sourceName) return;
      let count = 0;
      let sub = pool.subscribeMany(
        nostrUser
          ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
          : relaysOnPlatform,
        [
          {
            kinds: [1],
            "#l": ["YAKI AI FEED"],
            "#t": [sourceName],
            limit: 10,
          },
        ],
        {
          onevent(event) {
            let parsedEvent = getAIFeedContent(event);
            if (parsedEvent.is_authentic && count <= 12) {
              count += 1;
              setMorePosts((prev) => {
                if (
                  !prev.find(
                    (prev_) =>
                      prev_.id === event.id || prev_.title === event.content
                  )
                )
                  return [...prev, parsedEvent];
                else return prev;
              });
            }
          },
        }
      );
    } catch (err) {
      console.log(err);
      setIsLoaded(true);
    }
  }, [sourceName]);

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
          ["e", news.id],
          ["p", news.pubkey],
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
          ["e", news.id],
          ["p", news.pubkey],
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

  if (!isLoaded) return <LoadingScreen />;
  if (!news) return navigateTo("/buzz-feed");
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
      <div>
        <Helmet>
          <title>Yakihonne | {news.title}</title>
          <meta name="description" content={news.description} />
          <meta property="og:description" content={news.description} />
          <meta property="og:image" content={news.image} />
          <meta
            property="og:url"
            content={`https://yakihonne.com/buzz-feed/${news.nEvent}`}
          />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content={news.title} />
          <meta property="twitter:title" content={news.title} />
          <meta property="twitter:description" content={news.description} />
          <meta property="twitter:image" content={news.image} />
        </Helmet>

        <div className="fit-container fx-centered" style={{ columnGap: 0 }}>
          <div className="main-container">
            <SidebarNOSTR />
            <main className="main-page-nostr-container">
              <ArrowUp />

              <div className="fit-container fx-centered fx-start-h fx-start-v">
                <div style={{ width: "min(100%,700px)" }}>
                  {news.image && (
                    <div
                      className="fit-container profile-cover fx-centered fx-end-h  fx-col bg-img cover-bg"
                      style={{
                        height: "40vh",
                        position: "relative",
                        backgroundImage: `url(${news.image})`,
                        backgroundColor: "var(--very-dim-gray)",
                      }}
                    ></div>
                  )}
                  <div className="box-pad-h-m">
                    <div className="fx-centered fx-col fx-start-h fx-start-v ">
                      <h3>{news.title}</h3>
                      <div>
                        {news.description}{" "}
                        <a
                          target={"_blank"}
                          href={news.source_url}
                          onClick={(e) => e.stopPropagation()}
                          className="c1-c"
                        >
                          Read more
                        </a>
                      </div>
                    </div>
                    <div className="fx-scattered fit-container box-pad-v-m">
                      <div className="fx-centered">
                        <UserProfilePicNOSTR
                          img={news.source_icon}
                          size={24}
                          user_id={false}
                          allowClick={false}
                          ring={false}
                        />
                        <Link
                          to={`/buzz-feed/source/${news.source_name}`}
                          target="_blank"
                        >
                          By {news.source_name}
                        </Link>
                      </div>
                      <p className="gray-c p-medium">
                        <Date_
                          toConvert={new Date(
                            news.published_at * 1000
                          ).toString()}
                          time={true}
                        />
                      </p>
                    </div>
                    <div className="fit-container fx-scattered box-pad-v-s">
                      <div className="fx-centered">
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
                            data-tooltip="Upvote"
                            onClick={upvoteNews}
                          >
                            <div
                              className={
                                isVoted?.content === "+"
                                  ? "arrow-up-bold"
                                  : "arrow-up"
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
                          className={`fx-centered pointer ${
                            isLoading ? "flash" : ""
                          }`}
                          style={{ columnGap: "8px" }}
                        >
                          <div
                            className="icon-tooltip"
                            data-tooltip="Downvote"
                            onClick={downvoteNews}
                          >
                            <div
                              className={
                                isVoted?.content === "-"
                                  ? "arrow-up-bold"
                                  : "arrow-up"
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
                        <p>|</p>
                        <ShareLink
                          path={`/buzz-feed/${news.nEvent}`}
                          title={news.source_name}
                          description={news.content}
                          kind={1}
                          shareImgData={{
                            post: {
                              content: news.title,
                              description: news.description,
                              image: news.image,
                              created_at: news.published_at,
                            },
                            author: {
                              display_name: news.source_name,
                              picture: news.source_icon,
                            },
                            label: "Buzz feed",
                          }}
                        />
                      </div>
                      <div className="fx-centered">
                        <div
                          className="round-icon round-icon-tooltip"
                          data-tooltip="Bookmark news"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SaveArticleAsBookmark
                            pubkey={news.id}
                            itemType="e"
                            kind="1"
                          />
                        </div>
                      </div>
                    </div>
                    <CommentsSection
                      id={news.id}
                      nEvent={nevent}
                      setNetCommentsCount={setNetCommentsCount}
                    />
                  </div>
                </div>
                {sourceName && morePosts.length > 0 && (
                  <div
                    className=" fx-centered fx-col fx-start-v box-pad-h-m extras-homepage"
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
                      <h4>More from {sourceName}</h4>
                      <div className="fit-container fx-centered fx-wrap">
                        {morePosts.map((post) => {
                          if (post.id !== news.id)
                            return (
                              <Link
                                key={post.id}
                                className="fit-container fx-centered fx-start-h"
                                to={`/buzz-feed/${post.nEvent}`}
                              >
                                <div
                                  style={{
                                    minWidth: "64px",
                                    aspectRatio: "1/1",
                                    borderRadius: "var(--border-r-18)",
                                    backgroundImage: `url(${post.image})`,
                                  }}
                                  className="bg-img cover-bg"
                                ></div>
                                <div>
                                  <p className="p-medium gray-c">
                                    <Date_
                                      toConvert={
                                        new Date(post.published_at * 1000)
                                      }
                                    />
                                  </p>
                                  <p className="p-two-lines">{post.title}</p>
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
      let tempComment = suffix
        ? `${newComment} — This is a comment on: https://yakihonne.com/buzz-feed/${nEvent}`
        : newComment;
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
              {!isLoading && "Post"}
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
                  — This is a comment on: https://yakihonne.com/buzz-feed/
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
  noteID,
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
            noteID={noteID}
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
  noteID,
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
        ? `${newComment} — This is a comment on: https://yakihonne.com/buzz-feed/${nEvent}`
        : newComment;
      let tags = [["e", noteID, "", "root"]];
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
                  <div className="fit-container">{comment.content_tree}</div>
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
                  content: comment.content,
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
