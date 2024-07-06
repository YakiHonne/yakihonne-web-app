import React, { useContext, useMemo, useRef, useState } from "react";
import SidebarNOSTR from "./SidebarNOSTR";
import NavbarNOSTR from "./NavbarNOSTR";
import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { nip19, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import {
  decodeBolt11,
  getBolt11,
  getEmptyNostrUser,
  getZapper,
} from "../../Helpers/Encryptions";
import Markdown from "markdown-to-jsx";
import LoadingScreen from "../LoadingScreen";
import ShortenKey from "./ShortenKey";
import { Context } from "../../Context/Context";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import Date_ from "../Date_";
import { getBech32, minimizeKey } from "../../Helpers/Encryptions";
import { Fragment } from "react";
import { NoComment } from "react-nocomment";
import { unified } from "unified";
import markdown from "remark-parse";
import Follow from "./Follow";
import ZapTip from "./ZapTip";
// import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import { Helmet } from "react-helmet";
import placeholder from "../../media/images/nostr-thumbnail-ph.svg";
import ReactMarkdown, { uriTransformer } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { publishPost, deletePost } from "../../Helpers/NostrPublisher";
import LoginNOSTR from "./LoginNOSTR";
import NOSTRComments from "./NOSTRComments";
import NumberShrink from "../NumberShrink";
import LoadingDots from "../LoadingDots";
import ShowUsersList from "./ShowUsersList";
import ArrowUp from "../ArrowUp";
import SaveArticleAsBookmark from "./SaveArticleAsBookmark";
import katex from "katex";
import "katex/dist/katex.css";
const pool = new SimplePool();

export default function NostrArticle() {
  const { id } = useParams();
  let naddrData = nip19.decode(id);
  const reportRef = useRef(null);
  const {
    setToast,
    nostrUser,
    nostrKeys,
    // nostrUserBookmarks,
    setNostrUserBookmarks,
  } = useContext(Context);
  const [isLoaded, setIsLoaded] = useState(false);
  const [toLogin, setToLogin] = useState(false);
  const [author, setAuthor] = useState("");
  const [post, setPost] = useState({});
  const [curationsOf, setCurationsOf] = useState([]);
  const [naddrParsed, setNaddrParsed] = useState("");
  const [upvoteReaction, setUpvoteReaction] = useState([]);
  const [downvoteReaction, setDownvoteReaction] = useState([]);
  const [zapsCount, setZapsCount] = useState(0);
  const [showReportWindow, setShowReportWindow] = useState(false);
  const [showReportPrompt, setShowReportPrompt] = useState(false);
  const [comments, setComments] = useState([]);
  const [zappers, setZappers] = useState([]);
  const [reporters, setReporters] = useState([]);
  const [usersList, setUsersList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isVoted = useMemo(() => {
    return nostrKeys
      ? upvoteReaction
          .concat(downvoteReaction)
          .find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [upvoteReaction, downvoteReaction, nostrKeys]);
  // const isBookmarked = useMemo(() => {
  //   return nostrKeys
  //     ? nostrUserBookmarks.find(
  //         (item) =>
  //           item ===
  //           `30023:${naddrData.data.pubkey}:${naddrData.data.identifier}`
  //       )
  //     : false;
  // }, [nostrUserBookmarks, nostrKeys]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // let aTag = `30023:${naddrData.data.pubkey}:${naddrData.data.identifier}`;
        let events = await pool.get(relaysOnPlatform, {
          kinds: [30023],
          "#d": [naddrData.data.identifier],
        });

        setNaddrParsed(naddrData);
        let author = await getUserFromNOSTR(events.pubkey);
        setPost(getParsedPostBody(events));
        setAuthor(getParsedAuthor(author));

        setIsLoaded(true);
      } catch (err) {
        console.log(err);
        setToast({
          type: 2,
          desc: "An error has occured",
        });
        setTimeout(() => {
          window.location = "/";
        }, 2000);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const sub = pool.sub(
      [...relaysOnPlatform, "wss://nostr.wine"],
      [
        {
          kinds: [7, 1, 1984],
          "#a": [`30023:${naddrData.data.pubkey}:${naddrData.data.identifier}`],
        },
        {
          kinds: [9735],
          "#p": [naddrData.data.pubkey],
          "#a": [`30023:${naddrData.data.pubkey}:${naddrData.data.identifier}`],
        },
      ]
    );

    sub.on("event", (event) => {
      if (event.kind === 1984) {
        setReporters((prev) => {
          return [...prev, event];
        });
      }
      if (event.kind === 9735) {
        let sats = decodeBolt11(getBolt11(event));
        let zapper = getZapper(event);
        setZappers((prev) => {
          return [...prev, zapper];
        });
        setZapsCount((prev) => prev + sats);
      }
      if (event.kind === 1) {
        setComments((prev) => {
          let newCom = [...prev, event];
          return newCom.sort(
            (item_1, item_2) => item_2.created_at - item_1.created_at
          );
        });
      }
      if (event.content === "+")
        setUpvoteReaction((upvoteArticle) => [...upvoteArticle, event]);
      if (event.content === "-")
        setDownvoteReaction((downvoteArticle) => [...downvoteArticle, event]);
    });
  }, []);

  const getParsedPostBody = (data) => {
    let tempPost = {
      content: data.content,
      added_date: new Date(data.created_at * 1000).toISOString(),
    };
    let tags = [];
    let d = "";
    for (let tag of data.tags) {
      if (tag[0] === "image") tempPost.thumbnail = tag[1];
      if (tag[0] === "title") tempPost.title = tag[1];
      if (tag[0] === "summary") tempPost.description = tag[1];
      if (tag[0] === "client") tempPost.client = tag[1];
      if (tag[0] === "t") tags.push(tag[1]);
      if (tag[0] === "d") d = tag[1];
    }
    tempPost.tags = Array.from(tags);
    tempPost.d = d;
    tempPost.author_pubkey = data.pubkey;
    return tempPost;
  };

  const getParsedAuthor = (data) => {
    let content = JSON.parse(data.content) || {};
    let tempAuthor = {
      name: content?.name || "",
      img: content?.picture || "",
      lud06: content?.lud06 || "",
      lud16: content?.lud16 || "",
      pubkey: data.pubkey,
      pubkeyhashed: getBech32("npub", data.pubkey),
    };
    return tempAuthor;
  };

  const getUserFromNOSTR = async (pubkey) => {
    try {
      let author = await pool.get(relaysOnPlatform, {
        kinds: [0],
        authors: [pubkey],
      });
      return author || getEmptyNostrUser(pubkey);
    } catch (err) {
      console.log(err);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.protocol}//${window.location.hostname}/article/${id}`
    );
    setToast({
      type: 1,
      desc: `Link was copied! 👏`,
    });
  };

  const nostrUriTransformer = (uri) => {
    const nostrProtocol = "nostr:";

    if (uri.startsWith(nostrProtocol)) {
      return uri;
    } else {
      return uriTransformer(uri);
    }
  };

  const upvoteArticle = async () => {
    if (isLoading) return;
    try {
      if (!nostrKeys) {
        setToLogin(true);
        return false;
      }
      if (isVoted) {
        setIsLoading(true);
        await deletePost(nostrKeys, isVoted.id, [
          ...relaysOnPlatform,
          "wss://nostr.wine",
        ]);
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
      let temPublishingState = await publishPost(
        nostrKeys,
        7,
        "+",
        [["a", `30023:${naddrData.data.pubkey}:${naddrData.data.identifier}`]],
        relaysOnPlatform
      );
      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };
  const downvoteArticle = async () => {
    if (isLoading) return;
    try {
      if (!nostrKeys) {
        setToLogin(true);
        return false;
      }
      if (isVoted) {
        setIsLoading(true);
        await deletePost(nostrKeys, isVoted.id, [
          ...relaysOnPlatform,
          "wss://nostr.wine",
        ]);
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
      let temPublishingState = await publishPost(
        nostrKeys,
        7,
        "-",
        [["a", `30023:${naddrData.data.pubkey}:${naddrData.data.identifier}`]],
        relaysOnPlatform
      );
      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };

  const refreshComments = (index) => {
    let tempArray = Array.from(comments);
    tempArray.splice(index, 1);
    setComments(tempArray);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (reportRef.current && !reportRef.current.contains(e.target))
        setShowReportWindow(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [reportRef]);

  if (!isLoaded) return <LoadingScreen />;
  return (
    <div>
      <Helmet>
        <title>Yakihonne | {post.title}</title>
        <meta name="description" content={post.description} />
        <meta property="og:description" content={post.description} />
        <meta property="og:image" content={post.thumbnail} />
        <meta
          property="og:url"
          content={`https://yakihonne.com/article/${id}`}
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content={post.title} />
        <meta property="twitter:title" content={post.title} />
        <meta property="twitter:description" content={post.description} />
        <meta property="twitter:image" content={post.thumbnail} />
      </Helmet>
      {toLogin && <LoginNOSTR exit={() => setToLogin(false)} />}
      {usersList && (
        <ShowUsersList
          exit={() => setUsersList(false)}
          title={usersList.title}
          list={usersList.list}
          extras={usersList.extras}
        />
      )}
      <SidebarNOSTR />
      <main className="main-page-nostr-container">
        <ArrowUp />
        {showReportPrompt && (
          <ReportArticle
            title={post.title}
            exit={() => setShowReportPrompt(false)}
            naddrData={naddrData}
          />
        )}
        <NavbarNOSTR />
        <div className="fit-container nostr-article" dir="auto">
          <div className="box-marg-full fit-container">
            <div
              className="article-cover bg-img cover-bg fit-container sc-s"
              style={{
                backgroundImage: post.thumbnail
                  ? `url(${post.thumbnail})`
                  : `url(${placeholder})`,
                backgroundColor: "var(--very-dim-gray)",
              }}
            ></div>
            <div
              className="fit-container fx-scattered fx-start-v fx-wrap"
              style={{ position: "relative", transform: "none" }}
            >
              <div
                className="fx-centered fx-col author-info-post-p"
                style={{
                  width: "100px",
                  position: "sticky",
                  top: "3rem",
                  flex: ".5 1 200px",
                  zIndex: "100",
                }}
              >
                <div
                  className="box-pad-h box-pad-v"
                  style={{
                    backgroundColor: "var(--white)",
                    borderRadius: "var(--border-r-50)",
                  }}
                >
                  <UserProfilePicNOSTR
                    size={128}
                    img={author.img}
                    mainAccountUser={false}
                    user_id={author.pubkey}
                    allowClick={true}
                  />
                </div>
                <div className="fx-centered fx-col">
                  <p>
                    By{" "}
                    <span className="c1-c">
                      {" "}
                      {author.name || minimizeKey(author.pubkey)}
                    </span>
                  </p>
                  <ShortenKey id={author.pubkeyhashed} />
                </div>
                <div className="fx-centered box-pad-v-m">
                  <Follow
                    toFollowKey={author.pubkey}
                    toFollowName={author.name}
                  />
                  <ZapTip
                    recipientLNURL={author.lud06 || author.lud16}
                    recipientPubkey={author.pubkey}
                    senderPubkey={nostrUser.pubkey}
                    recipientInfo={{ name: author.name, img: author.img }}
                    aTag={`30023:${naddrParsed.data.pubkey}:${naddrParsed.data.identifier}`}
                    forArticle={post.title}
                  />
                </div>
              </div>
              <div
                className="fx-centered box-pad-v fx-start-h box-pad-h m-author-info-post-p"
                style={{
                  flex: "1 1 400px",
                  columnGap: "16px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "var(--white)",
                    borderRadius: "var(--border-r-50)",
                  }}
                >
                  <UserProfilePicNOSTR
                    size={72}
                    img={author.img}
                    mainAccountUser={false}
                    user_id={author.pubkey}
                    allowClick={true}
                  />
                </div>
                <div className="fx-centered fx-col fx-start-v">
                  <p>
                    By:{" "}
                    <span className="c1-c">
                      {" "}
                      {author.name || minimizeKey(author.pubkey)}
                    </span>
                  </p>
                  <ShortenKey id={author.pubkeyhashed} />
                  <div className="fx-centered box-pad-v-m">
                    <Follow
                      toFollowKey={author.pubkey}
                      toFollowName={author.name}
                    />
                    <ZapTip
                      recipientLNURL={author.lud06 || author.lud16}
                      recipientPubkey={author.pubkey}
                      senderPubkey={nostrUser.pubkey}
                      recipientInfo={{ name: author.name, img: author.img }}
                      aTag={`30023:${naddrParsed.data.pubkey}:${naddrParsed.data.identifier}`}
                      forArticle={post.title}
                    />
                  </div>
                </div>
              </div>
              <div
                className="fx-scattered box-pad-h fx-start-v box-pad-v fx-break"
                style={{
                  width: "calc(100% - 200px)",
                  columnGap: "32px",
                  rowGap: "32px",
                  flex: "3 1 500px",
                }}
              >
                <div
                  className="fx-centered fx-start-h fx-start-v fx-col"
                  style={{ flex: "1 1 700px" }}
                  dir="auto"
                >
                  {/* <img
                    className="fit-container sc-s box-marg-s"
                    src={post.thumbnail ? post.thumbnail : placeholder}
                    style={{
                      backgroundColor: "var(--very-dim-gray)",
                    }}
                  /> */}
                  <div
                    className="fit-container fx-scattered fx-start-v"
                    style={{ columnGap: "10px" }}
                    dir="auto"
                  >
                    <h2 dir="auto">{post.title}</h2>
                    <div
                      style={{ position: "relative" }}
                      className="fx-centered fx-stretch box-pad-v-m"
                      dir="auto"
                    >
                      <SaveArticleAsBookmark
                        pubkey={post.author_pubkey}
                        d={post.d}
                      />
                      <div
                        onClick={() => setShowReportWindow(!showReportWindow)}
                      >
                        <div className="flag-24"></div>
                      </div>
                      {showReportWindow && (
                        <div
                          className=" sc-s-18 fx-col fx-centered "
                          style={{
                            position: "absolute",
                            width: "max-content",
                            right: "30px",
                            bottom: "0%",
                          }}
                          ref={reportRef}
                        >
                          <div
                            className="fx-centered box-pad-h-m "
                            style={{ columnGap: "4px", marginTop: "10px" }}
                          >
                            <p className=" p-medium">
                              {reporters.length >= 10
                                ? reporters.length
                                : `0${reporters.length}`}{" "}
                            </p>
                            <p className="p-medium">Report(s) </p>
                          </div>
                          <hr />
                          <div
                            className="fx-centered pointer box-pad-h-m "
                            onClick={() => setShowReportPrompt(true)}
                            style={{ marginBottom: "10px" }}
                          >
                            <div className="flag"></div>
                            <p className="gray-c p-medium">Report</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="fx-centered fit-container fx-start-h">
                    <p className="gray-c">
                      Published on <Date_ toConvert={post.added_date} />
                    </p>
                    <p className="gray-c p-medium">|</p>
                    <p className="gray-c">
                      Posted from{" "}
                      <span className="orange-c"> {post.client || "N/A"}</span>
                    </p>
                  </div>
                  {post.description && (
                    <div className="box-pad-v-m fit-container">
                      <p className="quote-txt">{post.description}</p>
                    </div>
                  )}
                  <div
                    className="fx-centered fx-start-h fx-wrap box-marg-s"
                    style={{ marginLeft: 0 }}
                  >
                    {post.tags.map((tag, index) => {
                      return (
                        <Link
                          key={`${tag}-${index}`}
                          style={{
                            textDecoration: "none",
                            color: "var(--white)",
                          }}
                          className="sticker sticker-c1 sticker-small"
                          to={`/tags/${tag}`}
                          target={"_blank"}
                        >
                          {tag}
                        </Link>
                      );
                    })}
                  </div>
                  <div
                    className="fx-centered fit-container fx-start-h box-pad-v-m"
                    style={{ columnGap: "20px", marginBottom: "1rem" }}
                  >
                    <div className="fx-centered" style={{ columnGap: "8px" }}>
                      <div className="icon-tooltip" data-tooltip="Tip article">
                        <ZapTip
                          recipientLNURL={author.lud06 || author.lud16}
                          recipientPubkey={author.pubkey}
                          senderPubkey={nostrUser.pubkey}
                          recipientInfo={{ name: author.name, img: author.img }}
                          aTag={`30023:${naddrParsed.data.pubkey}:${naddrParsed.data.identifier}`}
                          forArticle={post.title}
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
                    <div
                      className="fx-centered pointer"
                      style={{ columnGap: "8px" }}
                      onClick={() => {
                        !nostrKeys && setToLogin(true);
                      }}
                    >
                      <div className="comment-24"></div>
                      <NumberShrink value={comments.length} />
                    </div>
                    <div
                      className={`fx-centered pointer ${
                        isLoading ? "flash" : ""
                      }`}
                      style={{ columnGap: "8px" }}
                    >
                      <div
                        className={
                          isVoted?.content === "+"
                            ? "arrow-up-bold icon-tooltip"
                            : "arrow-up icon-tooltip"
                        }
                        style={{ opacity: isVoted?.content === "-" ? ".2" : 1 }}
                        data-tooltip="Upvote"
                        onClick={upvoteArticle}
                      ></div>
                      <div
                        className="icon-tooltip"
                        data-tooltip="Upvoters"
                        onClick={() =>
                          upvoteReaction.length > 0 &&
                          setUsersList({
                            title: "Upvoters",
                            list: upvoteReaction.map((item) => item.pubkey),
                            extras: [],
                          })
                        }
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
                        onClick={downvoteArticle}
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
                        onClick={() =>
                          downvoteReaction.length > 0 &&
                          setUsersList({
                            title: "Downvoters",
                            list: downvoteReaction.map((item) => item.pubkey),
                            extras: [],
                          })
                        }
                      >
                        <NumberShrink value={downvoteReaction.length} />
                      </div>
                    </div>
                    <p className="gray-c">|</p>
                    <a
                      className="twitter-share-button icon-tooltip"
                      href={`https://twitter.com/intent/tweet?text=${`${window.location.protocol}//${window.location.hostname}/article/${id}`}`}
                      target="_blank"
                      data-tooltip="Share on X"
                    >
                      <div className="twitter-logo-24"></div>
                    </a>
                    <div
                      className="link-24 icon-tooltip"
                      data-tooltip="Copy link"
                      onClick={copyLink}
                    ></div>
                  </div>
                  {/* <Markdown
                    options={{
                      wrapper: "article",
                      forceWrapper: true,
                      overrides: {
                        h1: {
                          props: {
                            className: "h2-txt",
                          },
                        },
                        h2: {
                          props: {
                            className: "h3-txt",
                          },
                        },
                        img: {
                          props: {
                            className: "sc-s-18",
                          },
                        },
                        blockquote: {
                          props: {
                            className: "quote-txt",
                          },
                        },
                      },
                    }}
                  >
                    {post.content}
                  </Markdown> */}
                  {/* <ReactMarkdown
                  className="article"
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    transformLinkUri={nostrUriTransformer}
                  >
                    {post.content}
                  </ReactMarkdown> */}
                  <MarkdownPreview
                    wrapperElement={{ "data-color-mode": "light" }}
                    source={post.content}
                    components={{
                      p: ({ children }) => {
                        return <p dir="auto">{children}</p>;
                      },
                      h1: ({ children }) => {
                        return <h1 dir="auto">{children}</h1>;
                      },
                      h2: ({ children }) => {
                        return <h2 dir="auto">{children}</h2>;
                      },
                      h3: ({ children }) => {
                        return <h3 dir="auto">{children}</h3>;
                      },
                      h4: ({ children }) => {
                        return <h4 dir="auto">{children}</h4>;
                      },
                      h5: ({ children }) => {
                        return <h5 dir="auto">{children}</h5>;
                      },
                      h6: ({ children }) => {
                        return <h6 dir="auto">{children}</h6>;
                      },
                      li: ({ children }) => {
                        return <li dir="auto">{children}</li>;
                      },
                      code: ({ inline, children, className, ...props }) => {
                        if (!children) return;
                        const txt = children[0] || "";

                        if (inline) {
                          if (
                            typeof txt === "string" &&
                            /^\$\$(.*)\$\$/.test(txt)
                          ) {
                            const html = katex.renderToString(
                              txt.replace(/^\$\$(.*)\$\$/, "$1"),
                              {
                                throwOnError: false,
                              }
                            );
                            return (
                              <code
                                dangerouslySetInnerHTML={{ __html: html }}
                              />
                            );
                          }
                          return <code>{txt}</code>;
                        }
                        if (
                          typeof txt === "string" &&
                          typeof className === "string" &&
                          /^language-katex/.test(className.toLocaleLowerCase())
                        ) {
                          const html = katex.renderToString(txt, {
                            throwOnError: false,
                          });
                          console.log("props", txt, className, props);
                          return (
                            <code dangerouslySetInnerHTML={{ __html: html }} />
                          );
                        }
                        let tempText = "";
                        for (let child of children)
                          tempText = tempText + child.props.children[0];
                        return (
                          <code className={String(className)}>{tempText}</code>
                        );
                      },
                    }}
                  />
                </div>
                <div
                  className="fx-centered fx-col fit-container"
                  style={{
                    position: "sticky",
                    top: "3rem",
                    flex: "1 1 300px",
                    zIndex: 100,
                  }}
                >
                  <NOSTRComments
                    comments={comments}
                    aTag={`30023:${naddrData.data.pubkey}:${naddrData.data.identifier}`}
                    refresh={refreshComments}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const ReportArticle = ({ title, exit, naddrData }) => {
  const [selectedReason, setSelectedReason] = useState("");
  const { nostrUser, nostrKeys, setToast } = useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  const reasons = ["nudity", "profanity", "illegal", "spam", "impersonation"];

  const reportArticle = async () => {
    if (!nostrKeys || !selectedReason) {
      return false;
    }

    try {
      setIsLoading(true);
      let temPublishingState = await publishPost(
        nostrKeys,
        1984,
        "",
        [
          ["p", naddrData.data.pubkey],
          [
            "a",
            `30023:${naddrData.data.pubkey}:${naddrData.data.identifier}`,
            selectedReason,
          ],
        ],
        relaysOnPlatform
      );
      setIsLoading(false);
      setToast({
        type: 1,
        desc: "Your report has been successfully sent!",
      });
      exit();
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div className="fixed-container fx-centered box-pad-h">
      <section
        className="sc-s box-pad-h box-pad-v fx-centered fx-col"
        style={{ width: "min(100%, 500px)", position: "relative" }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <div className="box-pad-h-m box-pad-v-m fx-centered fx-col fit-container">
          <h4 className="p-centered box-pad-h-s">
            Report <span className="orange-c">"{title}"</span>?
          </h4>
          <p className="p-centered gray-c">
            We are sorry to hear that you have faced an inconvenice by reading
            this article, please state the reason behind your report.
          </p>
          {reasons.map((item, index) => {
            return (
              <div
                className="if ifs-full fx-centered pointer p-caps pointer"
                style={{
                  backgroundColor:
                    selectedReason === item ? "var(--dim-gray)" : "",
                }}
                key={`${item}-${index}`}
                onClick={() => setSelectedReason(item)}
              >
                {item}
              </div>
            );
          })}
          {nostrUser && (
            <button
              className="btn btn-normal btn-full"
              onClick={reportArticle}
              disabled={isLoading}
            >
              {isLoading ? <LoadingDots /> : "Report"}
            </button>
          )}
          {!nostrUser && (
            <button className="btn btn-disabled btn-full">
              Login to report
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
