import React, { useState, useEffect, useContext, useMemo } from "react";
import { nip19 } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import SidebarNOSTR from "./SidebarNOSTR";
import { useParams } from "react-router-dom";
import Date_ from "../Date_";
import { useNavigate } from "react-router-dom";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import LoadingScreen from "../LoadingScreen";
import {
  checkForLUDS,
  convertDate,
  decodeBolt11,
  filterRelays,
  getBech32,
  getBolt11,
  getEmptyNostrUser,
  getParsed3000xContent,
  getZapper,
  removeDuplicants,
} from "../../Helpers/Encryptions";
import { SimplePool } from "nostr-tools";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import Helmet from "react-helmet";
import ZapTip from "./ZapTip";
import NumberShrink from "../NumberShrink";
import LoginNOSTR from "./LoginNOSTR";
import NOSTRComments from "./NOSTRComments";
import ShowUsersList from "./ShowUsersList";
import SaveArticleAsBookmark from "./SaveArticleAsBookmark";
import { getImagePlaceholder } from "../../Content/NostrPPPlaceholder";
import { getAuthPubkeyFromNip05, getVideoContent } from "../../Helpers/Helpers";
import ShareLink from "../ShareLink";
import Footer from "../Footer";
import VideosPreviewCards from "./VideosPreviewCards";
import CheckNOSTRClient from "./CheckNOSTRClient";
import SearchbarNOSTR from "./SearchbarNOSTR";
import HomeFN from "./HomeFN";
import axios from "axios";
const pool = new SimplePool();
const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

const filterRootComments = (all) => {
  let temp = [];
  for (let comment of all) {
    if (!comment.tags.find((item) => item[0] === "e")) {
      temp.push({ ...comment, count: countReplies(comment.id, all) });
    }
  }
  return temp;
};

const countReplies = (id, all) => {
  let count = [];

  for (let comment of all) {
    let ev = comment.tags.find(
      (item) => item[3] === "reply" && item[0] === "e" && item[1] === id
    );
    if (ev) {
      count.push(comment, ...countReplies(comment.id, all));
    }
  }
  return count.sort((a, b) => a.created_at - b.created_at);
};

export default function NostrCuration() {
  const {
    setToast,
    getNostrAuthor,
    nostrAuthors,
    nostrKeys,
    isPublishing,
    nostrUser,
    setToPublish,
    addNostrAuthors,
  } = useContext(Context);
  const { id, CurationKind, AuthNip05, ArtIdentifier } = useParams();
  const navigateTo = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isArtsLoaded, setIsArtsLoaded] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [curation, setCuration] = useState(false);
  const [curationDet, setCurationDet] = useState({});
  const [articlesOnCuration, setArticlesOnCuration] = useState([]);
  const [curationAuthor, setCurationAuthor] = useState({});
  const [showSharing, setShowSharing] = useState(false);
  const [toLogin, setToLogin] = useState(false);
  const [zapsCount, setZapsCount] = useState(0);
  const [upvoteReaction, setUpvoteReaction] = useState([]);
  const [downvoteReaction, setDownvoteReaction] = useState([]);
  const [comments, setComments] = useState([]);
  const [netComments, setNetComments] = useState([]);
  const [zappers, setZappers] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [usersList, setUsersList] = useState(false);
  const [importantFN, setImportantFN] = useState(false);
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
        let naddrData = await checkURL();

        let _curation = { created_at: 0 };
        addNostrAuthors([naddrData.pubkey]);
        let sub = pool.subscribeMany(
          !nostrUser
            ? relaysOnPlatform
            : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])],
          [
            {
              kinds: [naddrData.kind],
              "#d": [naddrData.identifier],
            },
          ],
          {
            onevent(event) {
              if (event.created_at > _curation.created_at) {
                _curation = { ...event };
                let modified_date = new Date(
                  event.created_at * 1000
                ).toISOString();
                let added_date = new Date(
                  event.created_at * 1000
                ).toISOString();
                let published_at = event.created_at;
                for (let tag of event.tags) {
                  if (tag[0] === "published_at") {
                    published_at = tag[1];
                    added_date =
                      tag[1].length > 10
                        ? new Date(parseInt(tag[1])).toISOString()
                        : new Date(parseInt(tag[1]) * 1000).toISOString();
                  }
                }
                setCuration({ ..._curation, naddr: id });
                setCurationDet({
                  pubkey: event.pubkey,
                  ...getParsed3000xContent(_curation.tags),
                  author: { name: event.pubkey.substring(0, 10), img: "" },
                  added_date,
                  modified_date,
                  published_at,
                  naddrData,
                });
                setIsLoaded(true);
              }
            },
            oneose() {
              if (!_curation) {
                setToast({
                  type: 2,
                  desc: "This curation does not exist",
                });
                setTimeout(() => {
                  navigateTo("/curations");
                }, 2000);
              } else {
                let authPubkeys = removeDuplicants(
                  getAuthPubkeys(_curation.tags)
                );
                addNostrAuthors(authPubkeys);
                let dRefs = getDRef(_curation.tags);
                if (dRefs.length === 0) setIsArtsLoaded(true);
                let articles = [];
                let sub_2 = pool.subscribeMany(
                  [...relaysOnPlatform, "wss://nos.lol"],
                  [
                    {
                      kinds: naddrData.kind === 30004 ? [30023] : [34235],
                      "#d": dRefs,
                    },
                  ],
                  {
                    onevent(article) {
                      articles.push(article);
                      setArticlesOnCuration((_articles) => {
                        let post =
                          article.kind === 30023
                            ? getPostsInCuration(article)
                            : getVideoContent(article);
                        let newArts = [post, ..._articles];

                        return sortPostsOnCuration(dRefs, newArts);
                      });
                    },
                    oneose() {
                      setIsArtsLoaded(true);
                    },
                  }
                );
              }
              sub.close();
            },
          }
        );
      } catch (err) {
        console.log(err);
        setToast({
          type: 2,
          desc: "Problem in connecting with the relay",
        });
        setTimeout(() => {
          navigateTo("/curations");
        }, 2000);
        return;
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const initSubscription = async () => {
      let naddrData = await checkURL();
      const sub = pool.subscribeMany(
        [
          ...filterRelays(relaysOnPlatform, nostrUser?.relays || []),
          "wss://nostr.wine",
        ],
        [
          {
            kinds: [7, 1],
            "#a": [
              `${naddrData.kind}:${naddrData.pubkey}:${naddrData.identifier}`,
            ],
          },
          {
            kinds: [9735],
            "#p": [naddrData.pubkey],
            "#a": [
              `${naddrData.kind}:${naddrData.pubkey}:${naddrData.identifier}`,
            ],
          },
        ],
        {
          onevent(event) {
            if (event.kind === 1) {
              setComments((prev) => {
                let newCom = [...prev, event];
                return newCom.sort(
                  (item_1, item_2) => item_2.created_at - item_1.created_at
                );
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

            if (event.content === "+")
              setUpvoteReaction((upvoteArticle) => [...upvoteArticle, event]);
            if (event.content === "-")
              setDownvoteReaction((downvoteArticle) => [
                ...downvoteArticle,
                event,
              ]);
          },
        }
      );
    };
    if (curation) initSubscription();
  }, [curation]);

  useEffect(() => {
    const initAuth = async () => {
      let naddrData = await checkURL();
      let auth = getNostrAuthor(naddrData.pubkey);
      if (auth) setCurationAuthor(auth);
      else {
        setCurationAuthor(getEmptyNostrUser(naddrData.pubkey));
      }
    };
    initAuth();
  }, [nostrAuthors]);

  useEffect(() => {
    setNetComments(filterRootComments(comments));
  }, [comments]);

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        let tempArts = await Promise.all(
          articlesOnCuration.map(async (article) => {
            let auth = getNostrAuthor(article.author_pubkey);
            let tempArticle = { ...article };

            if (auth) {
              tempArticle.author_img = auth.picture;
              tempArticle.author_name =
                auth.display_name || auth.name || tempArticle.author_name;

              return tempArticle;
            } else {
              return tempArticle;
            }
          })
        );

        setArticlesOnCuration(tempArts);
      } catch (err) {
        console.log(err);
      }
    };
    if (isArtsLoaded) {
      fetchAuth();
    }
  }, [isArtsLoaded]);

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
  }, []);

  const checkURL = async () => {
    try {
      if (AuthNip05 && ArtIdentifier) {
        let temPubkey = await getAuthPubkeyFromNip05(AuthNip05);
        return {
          pubkey: temPubkey,
          identifier: ArtIdentifier,
          kind: CurationKind === "a" ? 30004 : 30005,
        };
      }
      if (id) {
        let tempNaddrData = nip19.decode(id);
        return tempNaddrData.data;
      }
    } catch (err) {
      navigateTo("/curations");
    }
  };

  const getDRef = (tags) => {
    let tempArray = [];
    for (let tag of tags) {
      if (tag[0] === "a") {
        tempArray.push(tag[1].split(":").splice(2, 100).join(":"));
      }
    }
    return tempArray;
  };
  const getAuthPubkeys = (tags) => {
    let tempArray = [];
    for (let tag of tags) {
      if (tag[0] === "a") {
        tempArray.push(tag[1].split(":")[1]);
      }
    }
    return tempArray;
  };

  const getPostsInCuration = (article) => {
    if (!article?.pubkey || article.kind !== 30023) return {};

    let author_img = "";
    let author_name = getBech32("npub", article.pubkey).substring(0, 10);
    let author_pubkey = article.pubkey;
    let thumbnail = "";
    let title = "";
    let d = "";
    let added_date = new Date(article.created_at * 1000).toDateString();
    for (let tag of article.tags) {
      if (tag[0] === "image") thumbnail = tag[1];
      if (tag[0] === "title") title = tag[1];
      if (tag[0] === "d") d = tag[1];
    }
    let naddr = nip19.naddrEncode({
      identifier: d,
      pubkey: author_pubkey,
      kind: article.kind,
    });
    return {
      id: article.id,
      thumbnail: thumbnail || getImagePlaceholder(),
      author_img,
      author_name,
      author_pubkey,
      title,
      added_date,
      d,
      naddr,
      artURL: naddr,
      kind: 30023,
    };
  };

  const sortPostsOnCuration = (original, toSort) => {
    let tempArray = [];
    for (let post of original) {
      tempArray.push(toSort.find((item) => item.d === post));
    }
    return tempArray.filter((item) => item);
  };

  const upvoteCuration = async () => {
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
                ...filterRelays(relaysOnPlatform, nostrUser.relays),
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
          [
            "a",
            `${curationDet.naddrData.kind}:${curation.pubkey}:${curationDet.d}`,
          ],
          ["p", curation.pubkey],
        ],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });

      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };
  const downvoteCuration = async () => {
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
                ...filterRelays(relaysOnPlatform, nostrUser.relays),
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
          [
            "a",
            `${curationDet.naddrData.kind}:${curation.pubkey}:${curationDet.d}`,
          ],
          ["p", curation.pubkey],
        ],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });

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

  const getURLToShare = () => {
    if (AuthNip05 && ArtIdentifier) {
      return `/curations/${AuthNip05}/${ArtIdentifier}`;
    }
    if (curationAuthor?.nip05) {
      return `/curations/${curationAuthor.nip05}/${curationDet.naddrData.identifier}`;
    }
    if (id) {
      return `/curations/${id}`;
    }
  };

  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      {toLogin && <LoginNOSTR exit={() => setToLogin(false)} />}
      {usersList && (
        <ShowUsersList
          exit={() => setUsersList(false)}
          title={usersList.title}
          list={usersList.list}
          extras={usersList.extras}
        />
      )}
      {showComments && (
        <div className="fixed-container fx-centered">
          <div
            className="sc-s-18 box-pad-h box-pad-v"
            style={{ position: "relative", width: "min(100%,500px)" }}
          >
            <div className="close" onClick={() => setShowComments(false)}>
              <div></div>
            </div>
            <NOSTRComments
              comments={comments}
              aTag={`${curationDet.naddrData.kind}:${curation.pubkey}:${curationDet.d}`}
              refresh={refreshComments}
              setNetComments={setNetComments}
            />
          </div>
        </div>
      )}
      <div>
        <Helmet>
          <title>Yakihonne | {curationDet.title}</title>
          <meta name="description" content={curationDet.description} />
          <meta property="og:description" content={curationDet.description} />
          <meta property="og:image" content={curationDet.image} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="700" />
          <meta
            property="og:url"
            content={`https://yakihonne.com/curations/${id}`}
          />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content={curationDet.title} />
          <meta property="twitter:title" content={curationDet.title} />
          <meta
            property="twitter:description"
            content={curationDet.description}
          />
          <meta property="twitter:image" content={curationDet.image} />
        </Helmet>
        <div className="fit-container fx-centered">
          <div className="main-container">
            <SidebarNOSTR />
            <main className="main-page-nostr-container">
              {/* <NavbarNOSTR /> */}
              <div className="fit-container fx-centered fx-start-h fx-start-v">
                <div
                  className="fit-container fx-centered fx-start-v fx-col box-pad-h-m box-pad-v-m"
                  style={{ columnGap: "32px", flex: 2 }}
                >
                  <div
                    className="fit-container sc-s-18 bg-img cover-bg fx-centered fx-end-v box-marg-s"
                    style={{
                      backgroundImage: `url(${curationDet.image})`,
                      aspectRatio: "10 / 3",
                      border: "none",
                    }}
                  ></div>
                  <div className="fx-centered fx-start-v fx-col fit-container box-pad-h-m">
                    <div className="fx-scattered fit-container fx-start-v">
                      <div className="fx-centered fx-col fx-start-v">
                        <div className="fx-start-h fx-centered">
                          <p
                            className="pointer gray-c round-icon-tooltip"
                            data-tooltip={`created at ${convertDate(
                              curationDet.added_date
                            )}, edited on ${convertDate(
                              curationDet.modified_date
                            )}`}
                          >
                            Last modified{" "}
                            <Date_ toConvert={curationDet.modified_date} />
                          </p>
                          <p className="gray-c p-medium">|</p>
                          <p className="gray-c">
                            Posted from{" "}
                            <span className="orange-c">
                              {" "}
                              <CheckNOSTRClient
                                client={curationDet.client}
                              />{" "}
                            </span>
                          </p>
                        </div>
                        <h3>{curationDet.title}</h3>
                        <p
                          className="p-three-lines box-marg-s gray-c"
                          style={{ marginLeft: 0 }}
                        >
                          {curationDet.description}
                        </p>
                      </div>

                      <div
                        className="round-icon round-icon-tooltip"
                        data-tooltip={"Bookmark curation"}
                      >
                        <SaveArticleAsBookmark
                          pubkey={curationDet.naddrData.pubkey}
                          kind={curationDet.naddrData.kind}
                          d={curationDet.naddrData.identifier}
                          image={curationDet.image}
                        />
                      </div>
                    </div>
                    <div className="fit-container fx-centered fx-start-h">
                      <div
                        className="fx-centered fx-start-h"
                        style={{ columnGap: "16px" }}
                      >
                        <AuthorPreview_1 author={curationAuthor} />
                      </div>
                      <div>
                        <p className="gray-c">&#9679;</p>
                      </div>
                      <div className="fx-centered fx-start-h">
                        <div className="fx-centered">
                          <div className="posts"></div>
                          <p className="gray-c">
                            {getDRef(curation.tags).length} <span>items</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div
                      className="fx-centered fit-container fx-start-h box-pad-v-m"
                      style={{ columnGap: "12px", marginBottom: "1rem" }}
                    >
                      <div className="fx-centered" style={{ columnGap: "8px" }}>
                        <div
                          className="icon-tooltip"
                          data-tooltip="Tip article"
                        >
                          <ZapTip
                            recipientLNURL={checkForLUDS(
                              curationAuthor.lud06,
                              curationAuthor.lud16
                            )}
                            recipientPubkey={curationAuthor.pubkey}
                            senderPubkey={nostrUser.pubkey}
                            recipientInfo={{
                              name: curationAuthor.name,
                              img: curationAuthor.picture,
                            }}
                            aTag={`${curationDet.naddrData.kind}:${curation.pubkey}:${curationDet.d}`}
                            forContent={curationDet.title}
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
                          setShowComments(true);
                        }}
                      >
                        <div className="comment-24"></div>
                        <NumberShrink
                          value={
                            netComments.map((item) => item.count).flat()
                              .length + netComments.length
                          }
                        />
                      </div>
                      <div
                        className={`fx-centered pointer ${
                          isLoading ? "flash" : ""
                        }`}
                        style={{ columnGap: "8px" }}
                      >
                        <div
                          className={" icon-tooltip"}
                          data-tooltip="Upvote"
                          onClick={upvoteCuration}
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
                          onClick={downvoteCuration}
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
                      <ShareLink
                        path={getURLToShare()}
                        title={curationDet.title}
                        description={curationDet.description}
                        kind={30004}
                        shareImgData={{
                          post: curationDet,
                          author: curationAuthor,
                          likes: upvoteReaction.length,
                          dislikes: downvoteReaction.length,
                        }}
                      />
                    </div>
                    {!articlesOnCuration.length && !isArtsLoaded && (
                      <div
                        className="fx-centered fit-container"
                        style={{ height: "20vh" }}
                      >
                        <p className="gray-c p-medium">Loading</p>
                        <LoadingDots />
                      </div>
                    )}
                    <div className="fit-container fx-scattered box-pad-v">
                      {articlesOnCuration.length > 0 && (
                        <div
                          className="fx-centered fx-start-h fx-wrap"
                          style={{ columnGap: "32px", rowGap: "32px" }}
                        >
                          {articlesOnCuration.map((item, index) => {
                            if (item?.id && item.kind === 30023)
                              return (
                                <div
                                  className="sc-s-18 bg-img cover-bg  fx-centered fx-end-v fx-shrink pointer"
                                  style={{
                                    backgroundImage: `url(${item.thumbnail})`,
                                    backgroundColor: "var(--dim-gray)",

                                    flex: "1 1 200px",
                                    height: "300px",
                                  }}
                                  key={`${item.id}-${index}`}
                                  onClick={() =>
                                    navigateTo(`/article/${item.artURL}`)
                                  }
                                >
                                  <div
                                    className="fit-container sc-s-18 fx-centered fx-wrap fx-start-h fx-start-v  carousel-card-desc box-pad-h-m box-pad-v-m"
                                    style={{ maxHeight: "60%", border: "none" }}
                                  >
                                    <p
                                      className="p-three-lines fit-container"
                                      style={{ color: "white" }}
                                    >
                                      {item.title}
                                    </p>
                                    <div className="fx-centered fx-start-h fit-container">
                                      <UserProfilePicNOSTR
                                        size={16}
                                        img={item.author_img}
                                        mainAccountUser={false}
                                        user_id={item.author_pubkey}
                                        ring={false}
                                      />
                                      <p className="gray-c p-medium">
                                        By{" "}
                                        {item.author_name ||
                                          getBech32(
                                            "npub",
                                            item.author_pubkey
                                          ).substring(0, 10)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            if (item?.id && item.kind === 34235)
                              return (
                                <div
                                  className="  fx-centered fx-end-v fx-shrink pointer"
                                  style={{
                                    flex: "1 1 350px",
                                  }}
                                >
                                  <VideosPreviewCards
                                    item={item}
                                    duration={false}
                                  />
                                </div>
                              );
                          })}
                          {CurationKind === "v" && (
                            <>
                              <div style={{ flex: "1 1 350px" }}></div>
                            </>
                          )}
                          {CurationKind === "a" && (
                            <>
                              <div style={{ flex: "1 1 200px" }}></div>
                              <div style={{ flex: "1 1 200px" }}></div>
                              <div style={{ flex: "1 1 200px" }}></div>
                            </>
                          )}
                        </div>
                      )}

                      {articlesOnCuration.length === 0 && isArtsLoaded && (
                        <div className="fx-centered fx-col">
                          <p className="gray-c box-pad-v-s">
                            more articles will join this topic, stay tuned!
                          </p>
                        </div>
                      )}
                    </div>
                    {/* )} */}
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

const AuthorPreview_1 = ({ author }) => {
  if (!author) return;
  return (
    <>
      <UserProfilePicNOSTR
        size={24}
        img={author.picture}
        mainAccountUser={false}
        allowClick={true}
        user_id={author.pubkey}
        ring={false}
      />
      <p>
        Posted by <span className="c1-c">{author.name}</span>
      </p>
    </>
  );
};
