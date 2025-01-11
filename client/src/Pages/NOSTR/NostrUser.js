import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  Fragment,
  useRef,
} from "react";
import LoadingScreen from "../../Components/LoadingScreen";
import Date_ from "../../Components/Date_";
import {
  checkForLUDS,
  decodeBolt11,
  filterRelays,
  getBech32,
  getBolt11,
  getEmptyNostrUser,
  getParsed3000xContent,
  getParsedAuthor,
  shortenKey,
} from "../../Helpers/Encryptions";
import { useNavigate, useParams } from "react-router-dom";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import relaysOnPlatform from "../../Content/Relays";
import { nip19, SimplePool } from "nostr-tools";
import PostPreviewCardNOSTR from "../../Components/NOSTR/PostPreviewCardNOSTR";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import ZapTip from "../../Components/NOSTR/ZapTip";
import Follow from "../../Components/NOSTR/Follow";
import ShowPeople from "../../Components/NOSTR/ShowPeople";
import TopicElementNOSTR from "../../Components/NOSTR/TopicElementNOSTR";
import Helmet from "react-helmet";
import { Context } from "../../Context/Context";
import axios from "axios";
import NumberShrink from "../../Components/NumberShrink";
import CheckNIP05 from "../../Components/CheckNIP05";
import ArrowUp from "../../Components/ArrowUp";
import { getImagePlaceholder } from "../../Content/NostrPPPlaceholder";
import UN from "../../Components/NOSTR/UN";
import ShowUsersList from "../../Components/NOSTR/ShowUsersList";
import SaveArticleAsBookmark from "../../Components/NOSTR/SaveArticleAsBookmark";
import {
  getAuthPubkeyFromNip05,
  getNoteTree,
  getVideoContent,
} from "../../Helpers/Helpers";
import Footer from "../../Components/Footer";
import VideosPreviewCards from "../../Components/NOSTR/VideosPreviewCards";
import LoadingDots from "../../Components/LoadingDots";
import ShareLink from "../../Components/ShareLink";
import InitiConvo from "../../Components/NOSTR/InitConvo";
import KindOne from "../../Components/NOSTR/KindOne";
import KindSix from "../../Components/NOSTR/KindSix";
import Slider from "../../Components/Slider";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import HomeFN from "../../Components/NOSTR/HomeFN";
import TopCreators from "../../Components/NOSTR/TopCreators";
import QRCode from "react-qr-code";
import Avatar from "boring-avatars";

const pool = new SimplePool();
const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

export default function NostrUser() {
  const { user_id } = useParams();
  const {
    nostrUser,
    getNostrAuthor,
    addNostrAuthors,
    nostrKeys,
    mutedList,
    isPublishing,
    setToast,
    setToPublish,
  } = useContext(Context);
  const [id, setID] = useState(false);
  const navigateTo = useNavigate();
  const [user, setUser] = useState({});
  const [posts, setPosts] = useState([]);
  const [curations, setCurations] = useState([]);
  const [flashNews, setFlashNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [trendingProfiles, setTrendingProfiles] = useState([]);
  const [contentType, setContentType] = useState("np");
  const [importantFN, setImportantFN] = useState(false);
  const [following, setFollowings] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notes, setNotes] = useState([]);
  const [showPeople, setShowPeople] = useState(false);
  const [showWritingImpact, setShowWritingImpact] = useState(false);
  const [showRatingImpact, setShowRatingImpact] = useState(false);
  const [satsSent, setSatsSent] = useState(0);
  const [satsRec, setSatsRec] = useState([]);
  const [timestamp, setTimestamp] = useState(new Date().getTime());
  const [userImpact, setUserImpact] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [initConv, setInitConv] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const optionsRef = useRef(null);
  const extrasRef = useRef(null);

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
    let sub = null;
    let relaysToFetchFrom = nostrUser
      ? [
          ...filterRelays(relaysOnPlatform, nostrUser?.relays || []),
          "wss://nostr.wine",
          "wss://nos.lol",
        ]
      : [...relaysOnPlatform, "wss://nostr.wine", "wss://nos.lol"];
    const dataFetching = async () => {
      try {
        setIsLoaded(false);
        setShowPeople(false);
        setCurations([]);
        setPosts([]);
        setSatsRec([]);
        setSatsSent(0);
        setFlashNews([]);
        setVideos([]);
        setNotes([]);
        setContentType("np");
        let checkAuthorInCache = getNostrAuthor(id);

        if (checkAuthorInCache) {
          setUser(checkAuthorInCache);
          setIsLoaded(true);
        }
        let isUser = checkAuthorInCache ? true : false;
        let lastCreatedAtInUser = 0;

        getFollowerAndFollowing();
        sub = pool.subscribeMany(
          relaysToFetchFrom,
          [
            { kinds: [0], authors: [id] },
            { kinds: [30004, 30023, 34235, 1, 6], authors: [id] },
          ],
          {
            async onevent(event) {
              if (event.kind === 30023)
                setPosts((_posts) => {
                  let d = event.tags.find((tag) => tag[0] === "d");
                  d = d ? d[1] : "";
                  let index = _posts.findIndex((item) => item.d === d);
                  let netP = Array.from(_posts);
                  if (index === -1) netP = [...netP, getPost(event)];
                  if (index !== -1) {
                    if (_posts[index].created_at < event.created_at) {
                      netP.splice(index, 1);
                      netP.push(getPost(event));
                    }
                  }
                  netP = netP.sort(
                    (el_1, el_2) => el_2.created_at - el_1.created_at
                  );
                  return netP;
                });
              if (event.kind === 30004) {
                let parsedContent = getParsed3000xContent(event.tags);
                if (parsedContent.items.length > 0) {
                  let identifier = event.tags.find((tag) => tag[0] === "d")[1];
                  let naddr = nip19.naddrEncode({
                    identifier: identifier,
                    pubkey: event.pubkey,
                    kind: event.kind,
                  });
                  let modified_date = new Date(
                    event.created_at * 1000
                  ).toISOString();
                  let added_date = new Date(
                    event.created_at * 1000
                  ).toISOString();
                  let published_at = event.created_at;
                  for (let tag of event.tags) {
                    if (tag[0] === "published_at") {
                      published_at = tag[1] || published_at;
                      added_date =
                        tag[1].length > 10
                          ? new Date(published_at).toISOString()
                          : new Date(published_at * 1000).toISOString();
                    }
                  }
                  setCurations((prev) => {
                    let index = prev.findIndex(
                      (item) => item.identifier === identifier
                    );
                    let newP = Array.from(prev);
                    if (index === -1)
                      newP = [
                        ...newP,
                        {
                          ...event,
                          naddr,
                          identifier,
                          naddr,
                          author: {
                            name: event.pubkey.substring(0, 10),
                            img: "",
                          },
                          added_date,
                          modified_date,
                          published_at,
                        },
                      ];
                    if (index !== -1) {
                      if (prev[index].created_at < event.created_at) {
                        newP.splice(index, 1);
                        newP.push({
                          ...event,
                          naddr,
                          identifier,
                          naddr,
                          author: {
                            name: event.pubkey.substring(0, 10),
                            img: "",
                          },
                          added_date,
                          modified_date,
                          published_at,
                        });
                      }
                    }

                    newP = newP.sort(
                      (item_1, item_2) => item_2.created_at - item_1.created_at
                    );

                    return newP;
                  });
                }
              }
              if (!isUser && event.kind === 0) {
                isUser = true;
                if (lastCreatedAtInUser < event.created_at) {
                  lastCreatedAtInUser = event.created_at;
                  setUser(getParsedAuthor(event));
                  addNostrAuthors([event.pubkey]);
                  setIsLoaded(true);
                }
              }
              if (event.kind === 34235) {
                let parsedEvent = getVideoContent(event);

                setVideos((prev) => {
                  return prev.find((video) => video.id === event.id)
                    ? prev
                    : [parsedEvent, ...prev].sort(
                        (video_1, video_2) =>
                          video_2.created_at - video_1.created_at
                      );
                });
              }
              if ([1, 6].includes(event.kind)) {
                let tempEvent = await getKindOneSix(event);
                if (tempEvent)
                  setNotes((prev) => {
                    let existed = prev.find((note) => note.id === event.id);
                    if (existed) return prev;
                    else
                      return [...prev, tempEvent].sort(
                        (note_1, note_2) =>
                          note_2.created_at - note_1.created_at
                      );
                  });
              }
            },
            oneose() {
              if (!isUser) setUser(getEmptyNostrUser(id));
              sub.close();
              setIsLoaded(true);
            },
          }
        );
      } catch (err) {
        console.log(err);
        navigateTo("/");
      }
    };
    if (id) {
      dataFetching();
    }
    return () => {
      pool.close(relaysToFetchFrom);
      sub && sub?.close();
    };
  }, [id, timestamp]);

  useEffect(() => {
    const getID = async () => {
      try {
        if (user_id?.includes("@")) {
          let pubkey = await getAuthPubkeyFromNip05(user_id);
          setID(pubkey);
          return;
        }
        let pubkey = nip19.decode(user_id);
        setID(pubkey.data.pubkey);
      } catch (err) {
        console.log(err);
      }
    };
    getID();
  }, [user_id]);

  const getKindOneSix = async (event) => {
    try {
      let checkForComment = event.tags.find(
        (tag) => tag[0] === "e" || tag[0] === "a"
      );
      let checkForLabel = event.tags.find((tag) => tag[0] === "l");
      if (
        checkForLabel &&
        ["UNCENSORED NOTE", "FLASH NEWS"].includes(checkForLabel[1])
      )
        return false;

      let checkForQuote = event.tags.find((tag) => tag[0] === "q");
      if (checkForComment && checkForComment[0] === "a" && event.kind === 1)
        return false;
      let author_img = "";
      let author_name = getBech32("npub", event.pubkey).substring(0, 10);
      let author_pubkey = event.pubkey;
      let nEvent = nip19.neventEncode({
        id: event.id,
        author: event.pubkey,
      });
      if (event.kind === 1) {
        let note_tree = await getNoteTree(event.content);
        return {
          ...event,
          note_tree,
          checkForQuote:
            checkForQuote && !event.content.includes("nostr:nevent")
              ? checkForQuote[1]
              : "",
          author_img,
          author_name,
          author_pubkey,
          checkForComment: checkForComment ? checkForComment[1] : "",
          stringifiedEvent: JSON.stringify(event),
          nEvent,
        };
      }

      let relatedEvent = await getKindOneSix(JSON.parse(event.content));
      if (!relatedEvent) return false;
      return {
        ...event,
        relatedEvent,
      };
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const getFollowerAndFollowing = () => {
    try {
      setFollowings([]);
      let pool2 = new SimplePool();
      let lastFollowingCreated = 0;
      let relaysToFetchFrom = nostrUser
        ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
        : relaysOnPlatform;
      let sub_2 = pool2.subscribeMany(
        relaysToFetchFrom,
        [
          {
            kinds: [3],
            authors: [id],
          },
        ],
        {
          onevent(event) {
            let tempFollowing = event?.tags?.filter((item) => item[0] === "p");
            if (lastFollowingCreated < event.created_at) {
              lastFollowingCreated = event.created_at;
              setFollowings(tempFollowing);
            }
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
  };

  const getPost = (post) => {
    let author_img = "";
    let author_name = getBech32("npub", post.pubkey).substring(0, 10);
    let author_pubkey = post.pubkey;
    let thumbnail = "";
    let title = "";
    let summary = "";
    let contentSensitive = false;
    let postTags = [];

    let d = "";
    let modified_date = new Date(post.created_at * 1000).toISOString();
    let added_date = new Date(post.created_at * 1000).toISOString();
    let published_at = post.created_at;

    for (let tag of post.tags) {
      if (tag[0] === "published_at") {
        published_at =
          parseInt(tag[1]) > 0 ? parseInt(tag[1]) : post.created_at;

        added_date =
          published_at.length > 10
            ? new Date(parseInt(published_at)).toISOString()
            : new Date(parseInt(published_at) * 1000).toISOString();
      }
      if (tag[0] === "image") thumbnail = tag[1];
      if (tag[0] === "title") title = tag[1];
      if (tag[0] === "summary") summary = tag[1];
      if (tag[0] === "t") postTags.push(tag[1]);
      if (tag[0] === "L" && tag[1] === "content-warning")
        contentSensitive = true;
      if (tag[0] === "d") d = tag[1];
    }

    let naddr = nip19.naddrEncode({
      identifier: d,
      pubkey: author_pubkey,
      kind: 30023,
    });

    return {
      id: post.id,
      thumbnail: thumbnail || getImagePlaceholder(),
      content: post.content,
      summary,
      author_img,
      author_pubkey,
      author_name,
      title,
      added_date,
      created_at: post.created_at,
      modified_date,
      published_at,
      postTags,
      naddr,
      d,
      contentSensitive,
    };
  };

  const switchContentType = (type) => {
    setContentType(type);
  };

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
        const [important, nostrBandProfiles, SATS_STATS, USER_IMPACT, fn] =
          await Promise.all([
            axios.get(API_BASE_URL + "/api/v1/mb/flashnews/important"),
            axios.get("https://api.nostr.band/v0/trending/profiles"),
            axios.get("https://api.nostr.band/v0/stats/profile/" + id),
            axios.get(API_BASE_URL + "/api/v1/user-impact", {
              params: { pubkey: id },
            }),
            axios.get(API_BASE_URL + "/api/v1/flashnews", {
              params: { pubkey: id },
            }),
          ]);
        setFlashNews(fn.data);
        setSatsSent((SATS_STATS.data.stats[id]?.zaps_sent?.msats || 0) / 1000);
        setUserImpact(USER_IMPACT.data);
        let profiles = nostrBandProfiles.data.profiles
          ? nostrBandProfiles.data.profiles
              .filter((profile) => profile.profile)
              .map((profile) => {
                let author = getEmptyNostrUser(profile.profile.pubkey);
                try {
                  author = JSON.parse(profile.profile.content);
                } catch (err) {
                  console.log(err);
                }
                return {
                  pubkey: profile.profile.pubkey,
                  articles_number: profile.new_followers_count,
                  ...author,
                };
              })
          : [];
        setImportantFN(important.data);
        setTrendingProfiles(profiles.slice(0, 6));
      } catch (err) {
        console.log(err);
      }
    };
    if (id) fetchData();
  }, [id]);

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
        tempTags.push(["p", user.pubkey]);
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

  const copyID = (e, pubkey) => {
    e.stopPropagation();
    navigator?.clipboard?.writeText(getBech32("npub", pubkey));
    setToast({
      type: 1,
      desc: `Pubkey was copied! 👏`,
    });
  };

  const handleInitConvo = () => {
    if (nostrKeys && (nostrKeys.sec || nostrKeys.ext)) {
      setInitConv(true);
    }
  };
  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      {showPeople === "following" && (
        <ShowPeople
          exit={() => setShowPeople(false)}
          list={following}
          type={showPeople}
        />
      )}
      {showWritingImpact && (
        <WritingImpact
          writingImpact={userImpact.writing_impact}
          exit={() => setShowWritingImpact(false)}
        />
      )}
      {showRatingImpact && (
        <RatingImpact
          ratingImpact={userImpact.rating_impact}
          exit={() => setShowRatingImpact(false)}
        />
      )}
      {initConv && <InitiConvo exit={() => setInitConv(false)} receiver={id} />}
      {showQR && <QRSharing user={user} exit={() => setShowQR(false)} />}
      <div>
        <Helmet>
          <title>Yakihonne | {user.name || "<Anonymous>"}</title>
          <meta name="description" content={user.about} />
          <meta property="og:description" content={user.about} />
          <meta property="og:image" content={user.picture} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="700" />
          <meta
            property="og:url"
            content={`https://yakihonne.com/user/${user_id}`}
          />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta
            property="og:title"
            content={`Yakihonne | ${user.name || "<Anonymous>"}`}
          />
          <meta
            property="twitter:title"
            content={`Yakihonne | ${user.name || "<Anonymous>"}`}
          />
          <meta property="twitter:description" content={user.about} />
          <meta property="twitter:image" content={user.picture} />
        </Helmet>
        <div className="fit-container fx-centered">
          <div className="main-container">
            <SidebarNOSTR />
            <main className="main-page-nostr-container">
              <ArrowUp />
              <div className="fx-centered fit-container fx-start-h fx-start-v">
                <div
                  style={{
                    flex: 1.5,
                    maxWidth: "700px",
                    width: "min(100%, 700px)",
                    zIndex: "11",
                    position: "relative",
                  }}
                  className="box-pad-h-m box-pad-v-m"
                >
                  <div
                    className="fit-container sc-s-18 fx-centered fx-end-h fx-start-v box-pad-h-s box-pad-v-s bg-img cover-bg"
                    style={{
                      height: "20vh",
                      position: "relative",
                      backgroundImage: user.banner ? `url(${user.banner})` : "",
                      backgroundColor: "var(--very-dim-gray)",
                      overflow: "visible",
                    }}
                  >
                    <div style={{ position: "relative" }} ref={optionsRef}>
                      <div
                        className="round-icon-small round-icon-tooltip"
                        data-tooltip="Options"
                        onClick={() => {
                          setShowOptions(!showOptions);
                        }}
                        style={{ backgroundColor: "var(--pale-gray)" }}
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
                            zIndex: 1000,
                            rowGap: "12px",
                          }}
                          className="box-pad-h box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v"
                        >
                          <div
                            className="fit-container fx-centered fx-start-h pointer"
                            onClick={(e) => copyID(e, user.pubkey)}
                          >
                            <p className="fx-centered">Copy user pubkey</p>
                          </div>
                          <div className="fit-container fx-centered fx-start-h pointer">
                            <ShareLink
                              label={"Share profile"}
                              path={`/users/${user_id}`}
                              title={user.display_name || user.name}
                              description={user.about || ""}
                              kind={0}
                              shareImgData={{
                                post: { image: user.cover },
                                author: user,
                                followings: following.length,
                              }}
                            />
                          </div>
                          {nostrKeys && nostrKeys.pub !== user.pubkey && (
                            <div
                              className="fit-container fx-scattered  pointer"
                              onClick={isPublishing ? null : muteUnmute}
                            >
                              <p
                                className="red-c"
                                style={{
                                  opacity: isPublishing ? 0.5 : 1,
                                }}
                              >
                                {isMuted ? "Unmute" : "Mute"} profile
                              </p>
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
                  <div className="fx-centered fit-container box-pad-v-m ">
                    <div
                      className="fx-centered fx-col fx-start-v"
                      style={{ width: "min(100%, 800px)" }}
                    >
                      <div className="fx-scattered fit-container">
                        <div className="fx-centered fx-col fx-start-v">
                          <div
                            className="fx-centered"
                            style={{ columnGap: "16px" }}
                          >
                            <UserPP
                              size={72}
                              src={user.picture}
                              user_id={user.pubkey}
                            />

                            <div className="fx-centered fx-col fx-start-v">
                              <h4 className="p-caps">
                                {user.display_name || user.name}
                              </h4>
                              <p className="p-caps gray-c">
                                @{user.name || user.display_name}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="fx-centered">
                          <div
                            className="round-icon round-icon-tooltip"
                            data-tooltip="Scan QR code"
                            onClick={() => setShowQR(true)}
                          >
                            <div className="qrcode-24"></div>
                          </div>
                          <Follow
                            toFollowKey={user.pubkey}
                            toFollowName={user.name}
                            setTimestamp={setTimestamp}
                            bulkList={[]}
                          />
                          <ZapTip
                            recipientLNURL={checkForLUDS(
                              user.lud06,
                              user.lud16
                            )}
                            recipientPubkey={user.pubkey}
                            senderPubkey={nostrKeys.pub}
                            recipientInfo={{
                              name: user.name,
                              picture: user.picture,
                            }}
                          />
                          <div
                            className="round-icon round-icon-tooltip"
                            data-tooltip={
                              nostrKeys && (nostrKeys.sec || nostrKeys.ext)
                                ? `Message ${user.name || "this profile"}`
                                : `Login to message ${
                                    user.name || "this profile"
                                  }`
                            }
                            onClick={handleInitConvo}
                          >
                            <div className="env-edit-24"></div>
                          </div>
                        </div>
                      </div>
                      <div className="fx-centered">
                        <div className="nip05"></div>{" "}
                        {user.nip05 && (
                          <CheckNIP05
                            address={user.nip05}
                            pubkey={user.pubkey}
                          />
                        )}
                        {!user.nip05 && <p className="p-medium">N/A</p>}
                      </div>

                      <div className="fx-centered fx-start-h">
                        <div className="link"></div>

                        {!user.website && <p className="p-medium">N/A</p>}
                        {user.website && (
                          <a
                            className="p-medium"
                            href={
                              user.website.toLowerCase().includes("http")
                                ? user.website
                                : `https://${user.website}`
                            }
                            target="_blank"
                          >
                            {user.website || "N/A"}
                          </a>
                        )}
                      </div>
                      <div
                        className="fx-centered fx-start-v "
                        style={{ columnGap: "24px" }}
                      >
                        <div className="box-pad-v-s fx-centered fx-start-v fx-col">
                          {user.about && (
                            <p
                              className="p-centered p-medium p-left"
                              style={{ maxWidth: "400px" }}
                            >
                              {user.about}
                            </p>
                          )}
                          <div className="fx-centered">
                            <div
                              className="fx-centered"
                              style={{ columnGap: "10px" }}
                            >
                              <div className="user"></div>
                              <div
                                className="pointer"
                                onClick={() =>
                                  following.length !== 0
                                    ? setShowPeople("following")
                                    : null
                                }
                              >
                                <p className="p-medium">
                                  {following.length}{" "}
                                  <span className="gray-c">Following</span>
                                </p>
                              </div>
                              <UserFollowers id={id} />
                            </div>
                            <div
                              className="fx-centered"
                              style={{ columnGap: "10px" }}
                            >
                              <div className="bolt"></div>
                              <div>
                                <p className="p-medium">
                                  <NumberShrink value={satsSent} />{" "}
                                  <span className="gray-c">Sent</span>
                                </p>
                              </div>
                              <SatsReceived id={id} />
                            </div>
                          </div>
                        </div>
                      </div>
                      {userImpact && (
                        <div className="fx-centered fit-container">
                          <div
                            className="round-icon round-icon-tooltip"
                            data-tooltip="User impact"
                          >
                            <div className="medal-24"></div>
                          </div>
                          <div
                            className="fx-scattered fx option sc-s-18 pointer box-pad-h-m box-pad-v-m"
                            style={{
                              border: "none",
                              backgroundColor: "var(--very-dim-gray)",
                            }}
                            onClick={() => setShowWritingImpact(true)}
                          >
                            <div className="fx-centered">
                              <p>
                                <span className="p-bold">
                                  {userImpact.writing_impact.writing_impact}{" "}
                                </span>
                                <span className="gray-c p-medium">
                                  Writing impact
                                </span>
                              </p>
                            </div>
                            <div
                              className="arrow"
                              style={{ transform: "rotate(-90deg)" }}
                            ></div>
                          </div>
                          <div
                            className="fx-scattered fx option sc-s-18 pointer box-pad-h-m box-pad-v-m"
                            style={{
                              border: "none",
                              backgroundColor: "var(--very-dim-gray)",
                            }}
                            onClick={() => setShowRatingImpact(true)}
                          >
                            <div className="fx-centered">
                              <p>
                                <span className="p-bold">
                                  {userImpact.rating_impact.rating_impact}{" "}
                                </span>
                                <span className="gray-c p-medium">
                                  Rating impact
                                </span>
                              </p>
                            </div>
                            <div
                              className="arrow"
                              style={{ transform: "rotate(-90deg)" }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="fx-centered"
                    style={{
                      marginTop: "1rem",
                    }}
                  >
                    <div
                      className=" fx-col  fit-container"
                      style={{ width: "min(100%,700px)" }}
                    >
                      <div className="fit-container fx-centered fx-start-h">
                        <Slider
                          items={[
                            <div
                              className={`list-item fx-centered fx-shrink ${
                                contentType === "np" ? "selected-list-item" : ""
                              }`}
                              onClick={() => switchContentType("np")}
                            >
                              {contentType === "np" && (
                                <div className="note"></div>
                              )}
                              Notes & replies
                            </div>,
                            <div
                              className={`list-item fx-centered fx-shrink ${
                                contentType === "p" ? "selected-list-item" : ""
                              }`}
                              onClick={() => switchContentType("p")}
                            >
                              {contentType === "p" && (
                                <div className="posts"></div>
                              )}
                              Articles
                            </div>,
                            <div
                              className={`list-item fx-centered fx-shrink ${
                                contentType === "c" ? "selected-list-item" : ""
                              }`}
                              onClick={() => switchContentType("c")}
                            >
                              {contentType === "c" && (
                                <div className="curation"></div>
                              )}
                              Curations
                            </div>,
                            <div
                              className={`list-item fx-centered fx-shrink ${
                                contentType === "f" ? "selected-list-item" : ""
                              }`}
                              onClick={() => switchContentType("f")}
                            >
                              {contentType === "f" && (
                                <div className="news"></div>
                              )}
                              Flash news
                            </div>,
                            <div
                              className={`list-item fx-centered fx-shrink ${
                                contentType === "v" ? "selected-list-item" : ""
                              }`}
                              onClick={() => switchContentType("v")}
                            >
                              {contentType === "v" && (
                                <div className="play"></div>
                              )}
                              Videos
                            </div>,
                          ]}
                        />
                      </div>

                      {contentType === "np" && notes.length > 0 && (
                        <div className="box-pad-v fx-centered fx-start-h fit-container">
                          <h4>{notes.length} Notes & replies</h4>
                        </div>
                      )}
                      {contentType === "c" && curations.length > 0 && (
                        <div className="box-pad-v fx-centered fx-start-h fit-container">
                          <h4>{curations.length} Curations</h4>
                        </div>
                      )}
                      {contentType === "p" && posts.length > 0 && (
                        <div className="box-pad-v fx-centered fx-start-h fit-container">
                          <h4>{posts.length} Articles</h4>
                        </div>
                      )}
                      {contentType === "f" && flashNews.length > 0 && (
                        <div className="box-pad-v fx-centered fx-start-h fit-container">
                          <h4>{flashNews.length} Flash news</h4>
                        </div>
                      )}
                      {contentType === "v" && videos.length > 0 && (
                        <div className="box-pad-v fx-centered fx-start-h fit-container">
                          <h4>{videos.length} Videos</h4>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="it-container fx-centered fx-col "
                    style={{ position: "relative" }}
                  >
                    {contentType === "np" && (
                      <div className="fit-container fx-centered fx-col">
                        {notes.length > 0 && (
                          <>
                            <div
                              style={{ width: "min(100%,800px)" }}
                              className="fx-around fx-wrap posts-cards"
                            >
                              {notes.map((note) => {
                                if (note.kind === 6)
                                  return <KindSix event={note} key={note.id} />;
                                if (note.kind === 1 && note.checkForComment)
                                  return (
                                    <KindOneComments
                                      event={note}
                                      key={note.id}
                                      author={user}
                                    />
                                  );
                                return <KindOne event={note} key={note.id} />;
                              })}
                            </div>
                          </>
                        )}
                        {notes.length === 0 && (
                          <div
                            className="fx-centered fx-col box-pad-v"
                            style={{ height: "30vh" }}
                          >
                            <h4>Oops! Nothing to show here!</h4>
                            <p className="gray-c">
                              {user.name} hasn't written any notes or replies
                            </p>
                            <div
                              className="note-2-24"
                              style={{ width: "48px", height: "48px" }}
                            ></div>
                          </div>
                        )}
                      </div>
                    )}
                    {contentType === "c" && (
                      <div className="fit-container fx-centered fx-col">
                        {curations.length > 0 && (
                          <>
                            <div
                              style={{ width: "min(100%,800px)" }}
                              className="fx-around fx-wrap posts-cards"
                            >
                              {curations.map((item) => {
                                return (
                                  <TopicElementNOSTR
                                    key={item.id}
                                    topic={item}
                                    full={true}
                                  />
                                );
                              })}
                            </div>
                          </>
                        )}
                        {curations.length === 0 && (
                          <div
                            className="fx-centered fx-col box-pad-v"
                            style={{ height: "30vh" }}
                          >
                            <h4>Oops! Nothing to show here!</h4>
                            <p className="gray-c">
                              {user.name} has no curations
                            </p>
                            <div
                              className="curation-24"
                              style={{ width: "48px", height: "48px" }}
                            ></div>
                          </div>
                        )}
                      </div>
                    )}
                    {contentType === "f" && (
                      <div className="fit-container fx-centered fx-col">
                        {flashNews.length === 0 && (
                          <div
                            className="fx-centered fx-col box-pad-v"
                            style={{ height: "30vh" }}
                          >
                            <h4>Oops! Nothing to read here!</h4>
                            <p className="gray-c">
                              {user.name} hasn't written any flash news yet
                            </p>
                            <div
                              className="news"
                              style={{ width: "48px", height: "48px" }}
                            ></div>
                          </div>
                        )}
                        {flashNews.length > 0 && (
                          <>
                            <div
                              style={{ width: "min(100%,800px)" }}
                              className="fx-around fx-wrap posts-cards"
                            >
                              {flashNews.map((news) => {
                                return (
                                  <Fragment key={news.id}>
                                    <FlashNewsCard
                                      newsContent={news}
                                      self={false}
                                    />
                                    <hr style={{ margin: "1rem auto" }} />
                                  </Fragment>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {contentType === "p" && (
                      <div className="fit-container fx-centered fx-col">
                        {posts.length === 0 && (
                          <div
                            className="fx-centered fx-col box-pad-v"
                            style={{ height: "30vh" }}
                          >
                            <h4>Oops! Nothing to read here!</h4>
                            <p className="gray-c">
                              {user.name} hasn't written any article yet
                            </p>
                            <div
                              className="posts"
                              style={{ width: "48px", height: "48px" }}
                            ></div>
                          </div>
                        )}
                        {posts.length > 0 && (
                          <>
                            <div
                              style={{ width: "min(100%,800px)" }}
                              className="fx-around fx-wrap posts-cards"
                            >
                              {posts.map((post) => {
                                let fullPost = {
                                  ...post,
                                  author_img: user.picture,
                                };
                                return (
                                  <div
                                    key={post.id}
                                    className="fx-centered fit-container"
                                  >
                                    <PostPreviewCardNOSTR item={fullPost} />
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {contentType === "v" && (
                      <div className="fit-container fx-centered fx-col">
                        {videos.length === 0 && (
                          <div
                            className="fx-centered fx-col box-pad-v"
                            style={{ height: "30vh" }}
                          >
                            <h4>Oops! Nothing to read here!</h4>
                            <p className="gray-c">
                              {user.name} hasn't posted any videos yet
                            </p>
                            <div
                              className="play-24"
                              style={{ width: "48px", height: "48px" }}
                            ></div>
                          </div>
                        )}
                        {videos.length > 0 && (
                          <>
                            <div
                              style={{ width: "min(100%,800px)" }}
                              className="fx-around fx-wrap posts-cards"
                            >
                              {videos.map((video) => {
                                return (
                                  <div
                                    key={video.id}
                                    className="fx-centered fit-container"
                                  >
                                    <VideosPreviewCards item={video} />
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className=" fx-centered fx-col fx-start-v extras-homepage"
                  style={{
                    position: "sticky",
                    top:
                      extrasRef.current?.getBoundingClientRect().height >=
                      window.innerHeight
                        ? `calc(95vh - ${
                            extrasRef.current?.getBoundingClientRect().height ||
                            0
                          }px)`
                        : 0,
                    zIndex: "10",
                    flex: 1,
                  }}
                  ref={extrasRef}
                >
                  <div className="sticky fit-container">
                    <SearchbarNOSTR />
                  </div>
                  <div
                    className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v "
                    style={{
                      backgroundColor: "var(--c1-side)",
                      rowGap: "24px",
                      border: "none",
                    }}
                  >
                    <h4>Important Flash News</h4>
                    <HomeFN flashnews={importantFN} />
                  </div>
                  {trendingProfiles.length > 0 && (
                    <div
                      className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v"
                      style={{
                        backgroundColor: "var(--c1-side)",
                        rowGap: "24px",
                        border: "none",
                        overflow: "visible",
                      }}
                    >
                      <div className="fx-centered fx-start-h fx-col">
                        <h4>Trending users</h4>
                      </div>
                      <TopCreators
                        top_creators={trendingProfiles}
                        kind="Followers"
                      />
                    </div>
                  )}
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

const UserFollowers = ({ id }) => {
  const { tempChannel, setTempChannel } = useContext(Context);
  const [followers, setFollowers] = useState([]);
  const [showPeople, setShowPeople] = useState(false);

  useEffect(() => {
    let _followers = [];
    let pool3 = new SimplePool();
    let relaysToFetchFrom = [
      ...relaysOnPlatform,
      "wss://nos.lol",
      "wss://nostr-pub.wellorder.net",
    ];
    let sub = pool3.subscribeMany(
      relaysToFetchFrom,
      [
        {
          kinds: [3],
          "#p": [id],
        },
      ],
      {
        onevent(event) {
          _followers.push(event);
          setFollowers((followersPrev) => {
            let newF = [event, ...followersPrev];
            let netF = newF.filter((item, index, newF) => {
              if (
                newF.findIndex((_item) => item.pubkey === _item.pubkey) ===
                index
              )
                return item;
            });
            setTempChannel(netF);
            return netF;
          });
        },
      }
    );
    return () => {
      pool3.close(relaysOnPlatform);
      sub.close();
    };
  }, []);

  return (
    <>
      {showPeople === "followers" && (
        <ShowPeople
          exit={() => setShowPeople(false)}
          list={followers}
          type={showPeople}
        />
      )}
      <div
        className="pointer"
        onClick={() =>
          followers.length !== 0 ? setShowPeople("followers") : null
        }
      >
        <p className="p-medium">
          {followers.length} <span className="gray-c">Followers</span>
        </p>
      </div>
    </>
  );
};

const SatsReceived = ({ id }) => {
  const [satsRec, setSatsRec] = useState([]);
  useEffect(() => {
    let pool4 = new SimplePool();
    let relaysToFetchFrom = [...relaysOnPlatform, "wss://nostr.wine"];
    let sub = pool4.subscribeMany(
      relaysToFetchFrom,
      [
        {
          kinds: [9735],
          "#p": [id],
        },
      ],
      {
        onevent(event) {
          let sats = decodeBolt11(getBolt11(event));
          let tempEv = {
            ...event,
            amount: sats,
          };
          setSatsRec((prev) => [...prev, tempEv]);
        },
      }
    );
    return () => {
      pool4.close(relaysOnPlatform);
      sub.close();
    };
  }, []);
  return (
    <div>
      <p className="p-medium">
        <NumberShrink
          value={satsRec.reduce((total, item) => (total += item.amount), 0)}
        />{" "}
        <span className="gray-c">Received</span>
      </p>
    </div>
  );
};

const WritingImpact = ({ writingImpact, exit }) => {
  return (
    <div className="fixed-container fx-centered box-pad-h">
      <div
        className="sc-s-18"
        style={{ width: "min(100%,500px)", position: "relative" }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <div className="box-pad-h-m box-pad-v-m fit-container">
          <h4>Uncensored notes stats</h4>
        </div>
        <hr />
        <div className="box-pad-h-m box-pad-v-m fit-container">
          <div className="fx-centered fit-container fx-start-h">
            <h3>{writingImpact.writing_impact}</h3>
            <p className="gray-c">Writing Impact</p>
          </div>
        </div>
        <hr />
        <div className="box-pad-h-m box-pad-v-m fit-container fx-centered fx-col">
          <div className="fx-centered fx-col fit-container fx-start-v">
            <h4 className="green-c">
              +{writingImpact.positive_writing_impact}
            </h4>
            <p>Notes that earned the status of Helpful</p>
            <p className="gray-c p-medium">
              These notes are now showing to everyone who sees the post, adding
              context and helping keep people informed.
            </p>
          </div>
          <div className="fx-centered fx-col fit-container fx-start-v">
            <h4 className="red-c">-{writingImpact.negative_writing_impact}</h4>
            <p>Notes that reached the status of Not Helpful</p>
            <p className="gray-c p-medium">
              These notes have been rated Not Helpful by enough contributors,
              including those who sometimes disagree in their past ratings.
            </p>
          </div>
          <div className="fx-centered fx-col fit-container fx-start-v">
            <h4 className="gray-c">{writingImpact.ongoing_writing_impact}</h4>
            <p>Notes that need more ratings</p>
            <p className="gray-c p-medium">
              Notes that don’t yet have a status of Helpful or Not Helpful.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
const RatingImpact = ({ ratingImpact, exit }) => {
  return (
    <div className="fixed-container fx-centered box-pad-h">
      <div
        className="sc-s-18"
        style={{ width: "min(100%,500px)", position: "relative" }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <div className="box-pad-h-m box-pad-v-m fit-container">
          <h4>Uncensored notes stats</h4>
        </div>
        <hr />
        <div className="box-pad-h-m box-pad-v-m fit-container">
          <div className="fx-centered fit-container fx-start-h">
            <h3>{ratingImpact.rating_impact}</h3>
            <p className="gray-c">Rating Impact</p>
          </div>
        </div>
        <hr />
        <div className="box-pad-h-m box-pad-v-m fit-container fx-centered fx-col">
          <div className="fx-centered fx-col fit-container fx-start-v">
            <h4 className="green-c">
              +{ratingImpact.positive_rating_impact_h}
            </h4>
            <p>Ratings that helped a note earn the status of Helpful</p>
            <p className="gray-c p-medium">
              These ratings identified Helpful notes that get shown as context
              on posts and help keep people informed.
            </p>
          </div>
          <div className="fx-centered fx-col fit-container fx-start-v">
            <h4 className="green-c">
              +{ratingImpact.positive_rating_impact_nh}
            </h4>
            <p>Ratings that helped a note reach the status of Not Helpful</p>
            <p className="gray-c p-medium">
              These ratings improve Community Notes by giving feedback to note
              authors, and allowing contributors to focus on the most promising
              notes.
            </p>
          </div>
          <div className="fx-centered fx-col fit-container fx-start-v">
            <h4 className="red-c">-{ratingImpact.negative_rating_impact_h}</h4>
            <p>
              Ratings of Not Helpful on notes that ended up with a status of
              Helpful
            </p>
            <p className="gray-c p-medium">
              These ratings are common and can lead to status changes if enough
              people agree that a "Helpful" note isn’t sufficiently helpful.
            </p>
          </div>
          <div className="fx-centered fx-col fit-container fx-start-v">
            <h4 className="red-c fx-centered">
              -{ratingImpact.negative_rating_impact_nh}{" "}
              <span
                className="sticker sticker-normal sticker-red"
                style={{
                  padding: ".5rem",
                  height: ".75rem",
                  borderRadius: "8px",
                }}
              >
                x2
              </span>
            </h4>
            <p>
              Ratings of Helpful on notes that ended up with a status of Not
              Helpful
            </p>
            <p className="gray-c p-medium">
              These ratings are counted twice because they often indicate
              support for notes that others deemed low-quality.
            </p>
          </div>
          <div className="fx-centered fx-col fit-container fx-start-v">
            <h4 className="gray-c">{ratingImpact.ongoing_rating_impact}</h4>
            <p>Pending</p>
            <p className="gray-c p-medium">
              Ratings on notes that don’t currently have a status of Helpful or
              Not Helpful.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FlashNewsCard = ({ self, newsContent }) => {
  const { nostrKeys, nostrUser, isPublishing, setToast, setToPublish } =
    useContext(Context);
  const navigateTo = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [author, setAuthor] = useState(newsContent.author);
  const [usersList, setUsersList] = useState(false);
  const [content, setContent] = useState("");
  const isMisLeading = newsContent.sealed_note
    ? JSON.parse(newsContent.sealed_note.content).tags.find(
        (tag) => tag[0] === "type" && tag[1] === "-"
      )
    : false;
  const [upvoteReaction, setUpvoteReaction] = useState([]);
  const [downvoteReaction, setDownvoteReaction] = useState([]);
  const isVoted = useMemo(() => {
    return nostrKeys
      ? upvoteReaction
          .concat(downvoteReaction)
          .find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [upvoteReaction, downvoteReaction, nostrKeys]);

  const pool_ = new SimplePool();
  useEffect(() => {
    const sub = pool_.subscribeMany(
      nostrUser
        ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
        : relaysOnPlatform,
      [
        {
          kinds: [7],
          "#e": [newsContent.id],
        },
      ],
      {
        onevent(event) {
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
    const parsedContent = async () => {
      let res = await getNoteTree(newsContent.content);
      setContent(res);
    };
    parsedContent();
  }, []);

  const upvoteArticle = async (e) => {
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
        tags: [["e", newsContent.id]],
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
  const downvoteArticle = async (e) => {
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
        tags: [["e", newsContent.id]],
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

  return (
    <>
      {usersList && (
        <ShowUsersList
          exit={() => setUsersList(false)}
          title={usersList.title}
          list={usersList.list}
          extras={usersList.extras}
        />
      )}

      <div
        className="fx-centered fx-col fx-start-v note-card fit-container"
        onClick={(e) => {
          e.stopPropagation();
          navigateTo(`/flash-news/${newsContent.nEvent}`);
        }}
      >
        {!self && (
          <div className="fx-centered fit-container fx-start-h">
            <UserProfilePicNOSTR
              img={newsContent.author[0].picture}
              size={20}
              user_id={newsContent.author[0].pubkey}
              ring={false}
            />
            <p className="p-medium gray-c">
              by <span className="c1-c">{newsContent.author[0].name}</span>
            </p>
            <span className="gray-c">&#x2022;</span>
            <p className="p-medium gray-c">
              <Date_
                toConvert={new Date(newsContent.created_at * 1000)}
                time={true}
              />
            </p>
          </div>
        )}
        {(newsContent.is_important || newsContent.keywords.length > 0) && (
          <div
            className="fx-centered fx-start-h fx-wrap"
            style={{ rowGap: 0, columnGap: "4px" }}
          >
            {newsContent.is_important && (
              <div className="sticker sticker-small sticker-c1-pale">
                <svg
                  viewBox="0 0 13 12"
                  xmlns="http://www.w3.org/2000/svg"
                  className="hot"
                >
                  <path d="M10.0632 3.02755C8.69826 3.43868 8.44835 4.60408 8.5364 5.34427C7.56265 4.13548 7.60264 2.74493 7.60264 0.741577C4.47967 1.98517 5.20595 5.57072 5.11255 6.65955C4.32705 5.98056 4.17862 4.35822 4.17862 4.35822C3.3494 4.80884 2.93359 6.01229 2.93359 6.98846C2.93359 9.34905 4.7453 11.2626 6.98011 11.2626C9.21492 11.2626 11.0266 9.34905 11.0266 6.98846C11.0266 5.58561 10.0514 4.93848 10.0632 3.02755Z"></path>
                </svg>
                Important
              </div>
            )}
            {newsContent.keywords.map((keyword) => {
              return (
                <div
                  key={keyword}
                  className="sticker sticker-small sticker-gray-black"
                >
                  {keyword}
                </div>
              );
            })}
          </div>
        )}

        <div className="fit-container">{content}</div>
        <div className="fit-container fx-scattered box-pad-v-s">
          <div className="fx-centered">
            <div
              className={`fx-centered pointer ${isLoading ? "flash" : ""}`}
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
                onClick={(e) => {
                  e.stopPropagation();
                  upvoteReaction.length > 0 &&
                    setUsersList({
                      title: "Upvoters",
                      list: upvoteReaction.map((item) => item.pubkey),
                      extras: [],
                    });
                }}
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
                onClick={downvoteArticle}
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
                onClick={(e) => {
                  e.stopPropagation();
                  downvoteReaction.length > 0 &&
                    setUsersList({
                      title: "Downvoters",
                      list: downvoteReaction.map((item) => item.pubkey),
                      extras: [],
                    });
                }}
              >
                <NumberShrink value={downvoteReaction.length} />
              </div>
            </div>
          </div>
          <div className="fx-centered">
            {newsContent.source && (
              <a
                target={"_blank"}
                href={newsContent.source}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="round-icon round-icon-tooltip"
                  data-tooltip="source"
                >
                  <div className="globe-24"></div>
                </div>
              </a>
            )}
            <div
              className="round-icon round-icon-tooltip"
              data-tooltip="Bookmark flash news"
              onClick={(e) => e.stopPropagation()}
            >
              <SaveArticleAsBookmark
                pubkey={newsContent.id}
                itemType="e"
                kind="1"
              />
            </div>
          </div>
        </div>
        {newsContent.sealed_note && isMisLeading && (
          <UN
            data={JSON.parse(newsContent.sealed_note.content)}
            state="sealed"
            setTimestamp={() => null}
            flashNewsAuthor={newsContent.author.pubkey}
            sealedCauses={newsContent.sealed_note.tags
              .filter((tag) => tag[0] === "cause")
              .map((cause) => cause[1])}
          />
        )}
      </div>
    </>
  );
};

let pool5 = new SimplePool();

const KindOneComments = ({ event, author }) => {
  const { nostrUser } = useContext(Context);
  const [user, setUser] = useState(author || getEmptyNostrUser(event.pubkey));
  const [relatedEvent, setRelatedEvent] = useState(false);
  const [isRelatedEventLoaded, setIsRelatedEventLoaded] = useState(false);

  useEffect(() => {
    setUser(author);
  }, [author]);
  useEffect(() => {
    let sub = null;
    let relaysToFetchFrom = !nostrUser
      ? relaysOnPlatform
      : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])];
    if (!relatedEvent) {
      sub = pool5.subscribeMany(
        relaysToFetchFrom,
        [{ kinds: [1], ids: [event.checkForComment] }],
        {
          async onevent(event_) {
            setRelatedEvent(await onEvent(event_));
          },
          oneose() {
            setIsRelatedEventLoaded(true);
          },
        }
      );
    }
    return () => {
      pool5.close(relaysToFetchFrom);
      sub?.close();
    };
  }, []);

  const onEvent = async (event) => {
    try {
      let checkForComment = event.tags.find(
        (tag) => tag[0] === "e" || tag[0] === "a"
      );
      let checkForQuote = event.tags.find((tag) => tag[0] === "q");
      if (checkForComment && event.kind === 1) return false;
      let author_img = "";
      let author_name = getBech32("npub", event.pubkey).substring(0, 10);
      let author_pubkey = event.pubkey;
      let nEvent = nip19.neventEncode({
        id: event.id,
        author: event.pubkey,
      });
      if (event.kind === 1) {
        let note_tree = await getNoteTree(event.content);
        return {
          ...event,
          note_tree,
          checkForQuote: checkForQuote ? checkForQuote[1] : "",
          author_img,
          author_name,
          author_pubkey,
          stringifiedEvent: JSON.stringify(event),
          nEvent,
        };
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  };
  return (
    <div
      className="box-pad-h-m box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v fit-container"
      style={{
        backgroundColor: "var(--c1-side)",
        rowGap: "10px",
        overflow: "visible",
      }}
    >
      <div
        className="fx-centered fx-start-h  round-icon-tooltip pointer"
        style={{ overflow: "visible" }}
        data-tooltip={`commented on ${new Date(
          event.created_at * 1000
        ).toLocaleDateString()}`}
      >
        <UserProfilePicNOSTR
          size={20}
          mainAccountUser={false}
          ring={false}
          user_id={user.pubkey}
          img={user.picture}
        />
        <div>
          <p className="p-medium">
            {user.display_name || user.name}{" "}
            <span className="orange-c">Commented on this</span>
          </p>
        </div>
      </div>
      {relatedEvent && (
        <div className="fit-container">
          <KindOne event={relatedEvent} />
        </div>
      )}
      {!isRelatedEventLoaded && !relatedEvent && (
        <div
          style={{ backgroundColor: "var(--c1-side)" }}
          className="fit-container box-pad-h box-pad-v sc-s-18 fx-centered"
        >
          <p className="p-medium gray-c">Loading note</p>
          <LoadingDots />
        </div>
      )}

      {isRelatedEventLoaded && !relatedEvent && (
        <div
          style={{ backgroundColor: "var(--c1-side)" }}
          className="fit-container box-pad-h-m box-pad-v-m sc-s-18 fx-centered"
        >
          <p className="p-medium orange-c p-italic">
            The note does not seem to be found
          </p>
        </div>
      )}
      <div className="fit-container fx-centered fx-end-h">
        <div
          className="fx-centered fx-start-v fx-start-h box-pad-h-m box-pad-v-m sc-s-18"
          style={{ backgroundColor: "var(--c1-side)", width: "95%" }}
        >
          <UserProfilePicNOSTR
            size={20}
            mainAccountUser={false}
            ring={false}
            user_id={user.pubkey}
            img={user.picture}
          />
          <div className="fit-container p-medium">{event.note_tree}</div>
        </div>
      </div>
    </div>
  );
};

const QRSharing = ({ user, exit }) => {
  const { setToast } = useContext(Context);
  const [selectedTab, setSelectedTab] = useState("pk");
  const copyKey = (keyType, key) => {
    navigator.clipboard.writeText(key);
    setToast({
      type: 1,
      desc: `${keyType} was copied! 👏`,
    });
  };

  return (
    <div className="fixed-container box-pad-h fx-centered">
      <div
        className="sc-s box-pad-h box-pad-v"
        style={{
          width: "min(100%,400px)",
          position: "relative",
        }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <div className="fx-centered fx-col">
          <UserProfilePicNOSTR
            user_id={user.pubkey}
            mainAccountUser={false}
            size={100}
            ring={false}
            img={user.picture}
          />
          <h4>{user.display_name || user.name}</h4>
          <p className="gray-c">@{user.name || user.display_name}</p>
        </div>
        <div className="fx-centered box-pad-v-m">
          <div
            className={`list-item ${
              selectedTab === "pk" ? "selected-list-item" : ""
            }`}
            onClick={() => setSelectedTab("pk")}
          >
            Pubkey
          </div>
          {user.lud16 && (
            <div
              className={`list-item ${
                selectedTab === "ln" ? "selected-list-item" : ""
              }`}
              onClick={() => setSelectedTab("ln")}
            >
              Lightning address
            </div>
          )}
        </div>
        <div className="fx-centered fit-container box-marg-s">
          <div
            className="box-pad-v-m box-pad-h-m sc-s-18"
            style={{ backgroundColor: "white" }}
          >
            {selectedTab === "pk" && (
              <QRCode size={200} value={getBech32("npub", user.pubkey)} />
            )}
            {selectedTab === "ln" && <QRCode size={200} value={user.lud16} />}
          </div>
        </div>
        <div className="fit-container fx-col fx-centered">
          <div
            className={"fx-scattered if pointer fit-container dashed-onH"}
            style={{ borderStyle: "dashed" }}
            onClick={() =>
              copyKey("The pubkey", getBech32("npub", user.pubkey))
            }
          >
            <div className="key-icon-24"></div>
            <p>{shortenKey(getBech32("npub", user.pubkey))}</p>
            <div className="copy-24"></div>
          </div>
          {user.lud16 && (
            <div
              className={"fx-scattered if pointer fit-container dashed-onH"}
              style={{ borderStyle: "dashed" }}
              onClick={() => copyKey("The lightning address", user.lud16)}
            >
              <div className="bolt-24"></div>
              <p>{user.lud16}</p>
              <div className="copy-24"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UserPP = ({ src, size, user_id }) => {
  const [resize, setResize] = useState(false);
  if (!src) {
    return (
      <div style={{ minWidth: `${size}px`, minHeight: `${size}px` }}>
        <Avatar
          size={size}
          name={user_id}
          variant="beam"
          colors={["#0A0310", "#49007E", "#FF005B", "#FF7D10", "#FFB238"]}
        />
      </div>
    );
  }
  return (
    <>
      {resize && (
        <div
          className="fixed-container box-pad-h box-pad-v fx-centered"
          onClick={(e) => {
            e.stopPropagation();
            setResize(false);
          }}
        >
          <div
            style={{
              position: "relative",

              width: "min(100%, 600px)",
            }}
          >
            <div
              className="close"
              onClick={(e) => {
                e.stopPropagation();
                setResize(false);
              }}
            >
              <div></div>
            </div>
            <img
              className="sc-s-18"
              width={"100%"}
              style={{
                objectFit: "contain",
                maxHeight: "60vh",
                backgroundColor: "transparent",
              }}
              src={src}
              alt="el"
              loading="lazy"
            />
          </div>
        </div>
      )}
      <img
        onClick={(e) => {
          e.stopPropagation();
          setResize(true);
        }}
        className="sc-s-18"
        style={{
          cursor: "zoom-in",
          aspectRatio: "1/1",
          objectFit: "cover",
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          maxWidth: `${size}px`,
          maxHeight: `${size}px`,
          borderRadius: "var(--border-r-50)",
        }}
        width={"100%"}
        src={src}
        alt="el"
        loading="lazy"
      />
    </>
  );
};
