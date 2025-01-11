import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { nip19 } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
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
import NumberShrink from "../NumberShrink";
import LoginNOSTR from "./LoginNOSTR";
import ShowUsersList from "./ShowUsersList";
import ZapTip from "./ZapTip";
import NOSTRComments from "./NOSTRComments";
import { getImagePlaceholder } from "../../Content/NostrPPPlaceholder";
const pool = new SimplePool();

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

export default function CurationPreviewCard({ curationEv }) {
  const {
    setToast,
    nostrKeys,
    isPublishing,
    nostrUser,
    setToPublish,
    addNostrAuthors,
    getNostrAuthor,
    nostrAuthors,
  } = useContext(Context);
  const navigateTo = useNavigate();
  const carousel_container = useRef();
  const carousel = useRef();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isArtsLoaded, setIsArtsLoaded] = useState(false);
  const [curation, setCuration] = useState({});
  const [curationAuthor, setCurationAuthor] = useState({});
  const [curationDet, setCurationDet] = useState({});
  const [articlesOnCuration, setArticlesOnCuration] = useState([]);
  const [scrollPX, setScrollPX] = useState(0);
  const [showArrows, setShowArrows] = useState(false);
  const [showSharing, setShowSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toLogin, setToLogin] = useState(false);
  const [zapsCount, setZapsCount] = useState(0);
  const [upvoteReaction, setUpvoteReaction] = useState([]);
  const [downvoteReaction, setDownvoteReaction] = useState([]);
  const [comments, setComments] = useState([]);
  const [netComments, setNetComments] = useState([]);
  const [zappers, setZappers] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [usersList, setUsersList] = useState(false);
  const isVoted = useMemo(() => {
    return nostrKeys
      ? upvoteReaction
          .concat(downvoteReaction)
          .find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [upvoteReaction, downvoteReaction, nostrKeys]);

  useEffect(() => {
    const sub = pool.subscribeMany(
      [
        ...filterRelays(relaysOnPlatform, nostrUser?.relays || []),
        "wss://nostr.wine",
      ],
      [
        {
          kinds: [7, 1],
          "#a": [
            `30004:${curationEv.naddrData.pubkey}:${curationEv.naddrData.identifier}`,
          ],
        },
        {
          kinds: [9735],
          "#p": [curationEv.naddrData.pubkey],
          "#a": [
            `30004:${curationEv.naddrData.pubkey}:${curationEv.naddrData.identifier}`,
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
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCuration(curationEv);
        setCurationDet({
          ...curationEv,
          ...getParsed3000xContent(curationEv.tags),
        });
        setIsLoaded(true);

        let authPubkeys = removeDuplicants(getAuthPubkeys(curationEv.tags));

        let dRefs = getDRef(curationEv.tags);
        let articles = [];
        if (dRefs.length === 0) setIsArtsLoaded(true);
        let sub = pool.subscribeMany(
          [...relaysOnPlatform, "wss://nos.lol"],
          [
            {
              kinds: [30023],
              "#d": dRefs,
            },
            { kinds: [0], authors: authPubkeys },
          ],
          {
            onevent(article) {
              articles.push(article);
              let post = getPostsInCuration(article);
              setArticlesOnCuration((_articles) => {
                let newArts = [post, ..._articles];
                newArts = newArts.map((art) => {
                  let author =
                    articles.find(
                      (_event) =>
                        _event.kind === 0 &&
                        _event.pubkey === art?.author_pubkey
                    ) || "";
                  let author_img = author
                    ? JSON.parse(author.content).picture
                    : "";
                  let lud06 = author ? JSON.parse(author.content).lud06 : "";
                  let lud16 = author ? JSON.parse(author.content).lud16 : "";
                  let author_name = author
                    ? JSON.parse(author.content)?.name?.substring(0, 10)
                    : getBech32("npub", article.pubkey).substring(0, 10);

                  return {
                    ...art,
                    author_img,
                    author_name,
                  };
                });
                return sortPostsOnCuration(dRefs, newArts);
              });
              setIsArtsLoaded(true);
            },
            oneose() {
              setIsArtsLoaded(true);
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
    if (curationEv) fetchData();
  }, []);

  useEffect(() => {
    if (!(carousel.current && carousel_container.current)) return;
    if (carousel_container.current.clientWidth < carousel.current.scrollWidth) {
      setShowArrows(true);
      setScrollPX(0);
    } else {
      setShowArrows(false);
      setScrollPX(0);
    }
  }, [articlesOnCuration]);

  useEffect(() => {
    let auth = getNostrAuthor(curationEv.pubkey);
    if (auth) setCurationAuthor(auth);
    else {
      setCurationAuthor(getEmptyNostrUser(curationEv.pubkey));
    }
  }, [nostrAuthors]);

  useEffect(() => {
    setNetComments(filterRootComments(comments));
  }, [comments]);

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
    if (!article?.pubkey || article.kind === 300023) return {};

    let author_img = "";
    let author_name = getBech32("npub", article.pubkey).substring(0, 10);
    let author_pubkey = article.pubkey;
    let image = "";
    let title = "";
    let d = "";
    let added_date = new Date(article.created_at * 1000).toDateString();
    for (let tag of article.tags) {
      if (tag[0] === "image") image = tag[1];
      if (tag[0] === "title") title = tag[1];
      if (tag[0] === "d") d = tag[1];
    }
    let naddr = nip19.naddrEncode({
      identifier: d,
      pubkey: author_pubkey,
      kind: 30004,
    });
    return {
      id: article.id,
      image: image || getImagePlaceholder(),
      author_img,
      author_name,
      author_pubkey,
      title,
      added_date,
      d,
      naddr,
    };
  };

  const sortPostsOnCuration = (original, toSort) => {
    let tempArray = [];
    for (let post of original) {
      tempArray.push(toSort.find((item) => item.d === post));
    }
    return tempArray;
  };

  const slideRight = () => {
    let pxToSlide =
      scrollPX + 208 <
      carousel.current.scrollWidth - carousel_container.current.clientWidth
        ? scrollPX + 208
        : carousel.current.scrollWidth - carousel_container.current.clientWidth;
    setScrollPX(pxToSlide);
  };
  const slideLeft = () => {
    let pxToSlide = scrollPX - 208 > 0 ? scrollPX - 208 : 0;
    setScrollPX(pxToSlide);
  };

  const handleSharing = async () => {
    if (navigator.share) {
      try {
        let shareDetails = {
          url: `${window.location.protocol}//${window.location.hostname}/curations/${curationEv.naddr}`,
          title: curationEv.title,
          text: curationEv.description,
        };
        await navigator
          .share(shareDetails)
          .then(() =>
            console.log("Hooray! Your content was shared to tha world")
          );
      } catch (error) {
        console.log(`Oops! I couldn't share to the world because: ${error}`);
      }
    } else {
      setShowSharing(true);
      console.log(
        "Web share is currently not supported on this browser. Please provide a callback"
      );
    }
  };
  const copyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.protocol}//${window.location.hostname}/curations/${curationEv.naddr}`
    );
    setToast({
      type: 1,
      desc: `Link was copied! 👏`,
    });
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
            `30004:${curationEv.naddrData.pubkey}:${curationEv.naddrData.identifier}`,
          ],
          ["p", curationEv.naddrData.pubkey],
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
            `30004:${curationEv.naddrData.pubkey}:${curationEv.naddrData.identifier}`,
          ],
          ["p", curationEv.naddrData.pubkey],
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

  if (!isLoaded) return <LoadingScreen />;
  if (articlesOnCuration.length === 0) return;
  return (
    <>
      {showSharing && (
        <div
          className="fixed-container fx-centered"
          onClick={(e) => {
            e.stopPropagation();
            setShowSharing(false);
          }}
        >
          <div
            className="box-pad-v box-pad-h fx-centered fx-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="box-marg-s">Share on</h3>
            <div className="fx-centered" style={{ columnGap: "30px" }}>
              <a
                className="twitter-share-button icon-tooltip"
                href={`https://twitter.com/intent/tweet?text=${`${window.location.protocol}//${window.location.hostname}/curations/${curationEv.naddr}`}`}
                target="_blank"
                data-tooltip="Share on X"
              >
                <div className="twitter-logo-24"></div>
              </a>
              <div
                class="fb-share-button"
                data-href={`${`${
                  window.location.protocol
                }//${"yakihonne.com"}/curations/${curationEv.naddr}`}`}
                data-layout=""
                data-size=""
              >
                <a
                  target="_blank"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${`${
                    window.location.protocol
                  }//${"yakihonne.com"}/curations/${
                    curationEv.naddr
                  }`}%2F&amp;src=sdkpreparse`}
                  class="fb-xfbml-parse-ignore icon-tooltip"
                  data-tooltip="Share on Facebook"
                >
                  <div className="fb-icon-24"></div>
                </a>
              </div>
              <a
                href={`whatsapp://send?text=${`${window.location.protocol}//${window.location.hostname}/curations/${curationEv.naddr}`}`}
                data-action="share/whatsapp/share"
                target="_blank"
                className="twitter-share-button icon-tooltip"
                data-tooltip="Share on Whatsapp"
              >
                <div className="whatsapp-icon-24"></div>
              </a>
              <a
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${`${
                  window.location.protocol
                }//${"yakihonne.com"}/curations/${curationEv.naddr}`}&title=${
                  curationEv.title
                }&summary=${
                  curationEv.description
                }&source=${"https://yakihonne.com"}`}
                data-action="share/whatsapp/share"
                target="_blank"
                className="twitter-share-button icon-tooltip"
                data-tooltip="Share on LinkedIn"
              >
                <div className="in-icon-24"></div>
              </a>
              <div
                className="link-24 icon-tooltip"
                data-tooltip="Copy link"
                onClick={copyLink}
              ></div>
            </div>
            <button
              className="btn-text btn"
              onClick={() => setShowSharing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
              aTag={`30004:${curationEv.naddrData.pubkey}:${curationEv.naddrData.identifier}`}
              refresh={refreshComments}
              setNetComments={setNetComments}
            />
          </div>
        </div>
      )}
      <div className="fit-container">
        <div
          className="fit-container fx-centered fx-start-v fx-stretch fx-wrap"
          style={{ columnGap: "32px" }}
        >
          <div
            className="fx bg-img cover-bg sc-s-18 fx-centered fx-end-v fx-break pointer"
            style={{
              flex: "1 1 300px",
              minHeight: "200px",
              backgroundImage: `url(${curationDet.image})`,
            }}
            onClick={() => navigateTo(`/curations/${curationEv.naddr}`)}
          ></div>
          <div
            style={{ flex: "1 1 700px", width: "min(100%,700px)" }}
            className="fx-centered fx-start-v fx-col"
          >
            <div className="fx-start-h fx-centered">
              <p className=" gray-c">
                <Date_ toConvert={curationDet.added_date} />
              </p>
              <div
                className="edit round-icon-tooltip"
                data-tooltip={`created at ${convertDate(
                  curationDet.added_date
                )}, edited on ${convertDate(curationDet.modified_date)}`}
              ></div>
              <p className=" gray-c">
                <Date_ toConvert={curationDet.modified_date} />
              </p>
            </div>
            <h3
              className="pointer"
              onClick={() => navigateTo(`/curations/${curationEv.naddr}`)}
            >
              {curationDet.title}
            </h3>
            <p
              className="p-three-lines box-marg-s gray-c"
              style={{ marginLeft: 0 }}
            >
              {curationDet.description}
            </p>
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
                    {getDRef(curation.tags).length} <span>arts.</span>
                  </p>
                </div>
              </div>
            </div>

            {!isArtsLoaded && (
              <div className="fx-centered fx-col" style={{ height: "70vh" }}>
                <p className="gray-c p-medium">Loading..</p>
                <LoadingDots />
              </div>
            )}
            {isArtsLoaded && (
              <div className="fit-container fx-scattered">
                {showArrows && (
                  <div
                    style={{
                      position: "relative",
                      width: 0,
                      height: "100%",
                      zIndex: 4,
                    }}
                  >
                    <div
                      className="box-pad-h-s pointer slide-left fx-centered"
                      onClick={slideLeft}
                      style={{
                        position: "absolute",
                        right: "-40px",
                        top: "0",
                        height: "100%",
                        width: "50px",
                        background:
                          "linear-gradient(to right,var(--white) 10%,rgba(255,255,255,0) 100%)",
                      }}
                    >
                      <div
                        className="round-icon"
                        style={{ background: "var(--dim-gray)" }}
                      >
                        <div
                          className="arrow"
                          style={{ transform: "rotate(90deg)" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                {articlesOnCuration.length > 0 && (
                  <div
                    className="fx-centered fit-container box-pad-v fx-start-h "
                    style={{ overflow: "hidden" }}
                    ref={carousel_container}
                  >
                    <div
                      className="fx-centered fx-start-h no-scrollbar"
                      style={{
                        rowGap: "24px",

                        transform: `translateX(-${scrollPX}px)`,
                        transition: ".3s ease-in-out",
                      }}
                      ref={carousel}
                    >
                      {articlesOnCuration.map((item, index) => {
                        if (item?.id)
                          return (
                            <div
                              className="sc-s-18 bg-img cover-bg  fx-centered fx-end-v fx-shrink pointer"
                              style={{
                                backgroundImage: `url(${item.image})`,
                                backgroundColor: "var(--dim-gray)",
                                width: "200px",
                                height: "300px",
                              }}
                              key={`${item.id}-${index}`}
                              onClick={() =>
                                navigateTo(`/article/${item.naddr}`)
                              }
                            >
                              <div
                                className="fit-container sc-s-18 fx-centered fx-wrap fx-start-h fx-start-v  carousel-card-desc box-pad-h-m box-pad-v-m"
                                style={{ maxHeight: "60%", border: "none" }}
                              >
                                <p
                                  className="p-four-lines  fx-start-h"
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
                      })}
                    </div>
                  </div>
                )}
                {showArrows && (
                  <div
                    style={{ position: "relative", width: 0, height: "100%" }}
                  >
                    <div
                      className="box-pad-h-s pointer slide-left fx-centered"
                      onClick={slideRight}
                      style={{
                        position: "absolute",
                        right: "-10px",
                        top: "0",
                        height: "100%",
                        width: "50px",
                        background:
                          "linear-gradient(to left,var(--white) 10%,rgba(255,255,255,0) 100%)",
                      }}
                    >
                      <div
                        className="round-icon"
                        style={{ background: "var(--dim-gray)" }}
                      >
                        <div
                          className="arrow"
                          style={{ transform: "rotate(-90deg)" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                {articlesOnCuration.length === 0 && (
                  <div className="fx-centered fx-col">
                    <p className="gray-c box-pad-v-s">
                      more articles will join this topic, stay tuned!
                    </p>
                  </div>
                )}
              </div>
            )}
            <div
              className="fx-centered fit-container fx-start-h box-pad-v-m"
              style={{ columnGap: "12px", marginBottom: "1rem" }}
            >
              <div className="fx-centered" style={{ columnGap: "8px" }}>
                <div className="icon-tooltip" data-tooltip="Tip article">
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
                    aTag={`30004:${curationEv.naddrData.pubkey}:${curationEv.naddrData.identifier}`}
                    forArticle={curationDet.title}
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
                    netComments.map((item) => item.count).flat().length +
                    netComments.length
                  }
                />
              </div>
              <div
                className={`fx-centered pointer ${isLoading ? "flash" : ""}`}
                style={{ columnGap: "8px" }}
              >
                <div
                  className={"icon-tooltip"}
                  data-tooltip="Upvote"
                  onClick={upvoteCuration}
                >
                  <div
                    className={
                      isVoted?.content === "+" ? "arrow-up-bold" : "arrow-up"
                    }
                    style={{ opacity: isVoted?.content === "-" ? ".2" : 1 }}
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
                className={`fx-centered pointer ${isLoading ? "flash" : ""}`}
                style={{ columnGap: "8px" }}
              >
                <div
                  className="icon-tooltip"
                  data-tooltip="Downvote"
                  onClick={downvoteCuration}
                >
                  <div
                    className={
                      isVoted?.content === "-" ? "arrow-up-bold" : "arrow-up"
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
              <div
                className="icon-tooltip "
                data-tooltip="Share"
                onClick={handleSharing}
              >
                <div className="share-icon-24"></div>
              </div>
            </div>
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
