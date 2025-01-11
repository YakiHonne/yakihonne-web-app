import React, { useContext, useMemo, useRef } from "react";
import { Context } from "../../Context/Context";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { useState } from "react";
import { useEffect } from "react";
import { nip19, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import Date_ from "../../Components/Date_";
import { Link, useNavigate } from "react-router-dom";
import LoadingDots from "../../Components/LoadingDots";
import { Helmet } from "react-helmet";
import {
  filterRelays,
  getBech32,
  getEmptyNostrUser,
} from "../../Helpers/Encryptions";
import Footer from "../../Components/Footer";
import ArrowUp from "../../Components/ArrowUp";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import TopCreators from "../../Components/NOSTR/TopCreators";
import { getNoteTree, getVideoContent } from "../../Helpers/Helpers";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import axios from "axios";

var pool = new SimplePool();

const getTopCreators = (videos) => {
  if (!videos) return [];
  let netCreators = videos.filter((creator, index, videos) => {
    if (index === videos.findIndex((item) => item.pubkey === creator.pubkey))
      return creator;
  });

  let tempCreators = [];

  for (let creator of netCreators) {
    let stats = getCreatorStats(creator.pubkey, videos);
    tempCreators.push({
      pubkey: creator.pubkey,
      name: getBech32("npub", creator.pubkey).substring(0, 10),
      img: "",
      articles_number: stats.articles_number,
    });
  }

  return (
    tempCreators
      .sort(
        (curator_1, curator_2) =>
          curator_2.articles_number - curator_1.articles_number
      )
      .splice(0, 6) || []
  );
};

const getCreatorStats = (pubkey, videos) => {
  let articles_number = 0;

  for (let creator of videos) {
    if (creator.pubkey === pubkey) {
      articles_number += 1;
    }
  }
  return {
    articles_number,
  };
};

export default function NostrVideos() {
  const { nostrUser, addNostrAuthors, mutedList } = useContext(Context);
  const navigateTo = useNavigate();
  const [relays, setRelays] = useState(relaysOnPlatform);
  const [activeRelay, setActiveRelay] = useState("");
  const [videos, setVideos] = useState([]);
  const [trendingNotes, setTrendingNotes] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRelaysList, setShowRelaysList] = useState(false);
  const [landscapeMode, setLandscapeMode] = useState(true);
  const [vidsLastEventTime, setVidsLastEventTime] = useState(undefined);
  const extrasRef = useRef(null);
  const topCreators = useMemo(() => {
    return getTopCreators(videos);
  }, [videos]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoaded(false);
        setIsLoading(true);

        let { filter, relaysToFetchFrom } = getArtsFilter();

        let events = [];
        pool.subscribeMany(relaysToFetchFrom, filter, {
          onevent(event) {
            if (![...mutedList].includes(event.pubkey)) {
              let parsedEvent = getVideoContent(event);
              events.push(parsedEvent);
              setVideos((prev) => {
                return prev.find((video) => video.id === event.id)
                  ? prev
                  : [parsedEvent, ...prev].sort(
                      (video_1, video_2) =>
                        video_2.created_at - video_1.created_at
                    );
              });
            }
          },
          oneose() {
            onEOSE(events);
          },
        });
      } catch (err) {
        console.log(err);
        setIsLoading(false);
      }
    };
    if (Array.isArray(mutedList)) fetchData();
  }, [vidsLastEventTime, activeRelay, landscapeMode, mutedList]);

  useEffect(() => {
    const handleScroll = () => {
      if (videos.length === 0) return;
      if (
        document.querySelector(".main-page-nostr-container").scrollHeight -
          document.querySelector(".main-page-nostr-container").scrollTop -
          60 >
        document.documentElement.offsetHeight
      ) {
        return;
      }
      setVidsLastEventTime(videos[videos.length - 1].created_at);
    };
    document
      .querySelector(".main-page-nostr-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".main-page-nostr-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [isLoaded]);

  useEffect(() => {
    const getExternalData = async () => {
      try {
        let [trendingNotes] = await Promise.all([
          axios.get("https://api.nostr.band/v0/trending/videos"),
        ]);

        if (trendingNotes.data?.videos) {
          let tempTrendingNotes = await Promise.all(
            trendingNotes.data?.videos.slice(0, 5).map(async (item) => {
              let note_tree = await getNoteTree(item.event.content);
              let author_parsed = getEmptyNostrUser(item.pubkey);
              let nEvent = nip19.neventEncode({
                id: item.id,
                author: item.pubkey,
                relays: item.relays,
              });
              try {
                author_parsed = JSON.parse(item.author.content);
              } catch (err) {
                console.log(err);
              }
              return {
                author_parsed,
                ...item,
                note_tree,
                nEvent,
              };
            })
          );
          setTrendingNotes(tempTrendingNotes);
        }
      } catch (err) {
        console.log(err);
      }
    };
    getExternalData();
  }, []);

  const getArtsFilter = () => {
    let relaysToFetchFrom;
    let filter;

    if (activeRelay) relaysToFetchFrom = [activeRelay];
    if (!activeRelay)
      relaysToFetchFrom = !nostrUser
        ? relaysOnPlatform
        : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])];

    filter = [
      {
        kinds: landscapeMode ? [34235] : [34236],
        limit: 50,
        until: vidsLastEventTime,
      },
    ];
    return {
      relaysToFetchFrom,
      filter,
    };
  };

  const onEOSE = (events) => {
    if (events) {
      let filteredEvents = events.filter((event) => event);
      addNostrAuthors(filteredEvents.map((item) => item.pubkey));
    }
    if (activeRelay) pool.close([activeRelay]);
    if (!activeRelay)
      pool.close(
        !nostrUser
          ? relaysOnPlatform
          : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])]
      );
    setIsLoaded(true);
    setIsLoading(false);
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
    setVidsLastEventTime(undefined);
    setVideos([]);
    setActiveRelay(source);
  };

  const handleVideoTypes = () => {
    if (!isLoaded) return;
    setVideos([]);
    setVidsLastEventTime(undefined);
    setLandscapeMode(!landscapeMode);
  };

  return (
    <>
      <div>
        <Helmet>
          <title>Yakihonne | Videos</title>
          <meta
            name="description"
            content={"Browse all published videos on Nostr"}
          />
          <meta
            property="og:description"
            content={"Browse all published videos on Nostr"}
          />

          <meta property="og:url" content={`https://yakihonne.com/videos`} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content="Yakihonne | Videos" />
          <meta property="twitter:title" content="Yakihonne | Videos" />
          <meta
            property="twitter:description"
            content={"Browse all published videos on Nostr"}
          />
        </Helmet>
        <div className="fit-container fx-centered">
          <div className="main-container">
            <SidebarNOSTR />
            <ArrowUp />
            <main
              className={`main-page-nostr-container`}
              onClick={(e) => {
                e.stopPropagation();
                setShowRelaysList(false);
              }}
            >
              <div className="fx-centered fit-container fx-start-h fx-start-v">
                <div
                  style={{ width: "min(100%,550px)" }}
                  className="box-pad-h-m"
                >
                  <div className="box-pad-v-m fit-container fx-scattered sticky">
                    <div className="fx-centered fx-col fx-start-v">
                      <div className="fx-centered">
                        <h4>{videos.length} Videos</h4>
                      </div>
                      <p className="gray-c p-medium">
                        (In{" "}
                        {activeRelay === ""
                          ? "all relays"
                          : activeRelay.split("wss://")[1]}
                        )
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
                                color: activeRelay === "" ? "var(--c1)" : "",
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
                              (nostrUser && nostrUser.relays.length === 0)) &&
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
                    </div>
                  </div>
                  <div
                    className="fit-container fx-scattered fx-wrap fx-stretch"
                    style={{ rowGap: "20px" }}
                  >
                    {videos.length > 0 && (
                      <>
                        {videos.map((video) => {
                          return (
                            <Link
                              key={video.id}
                              className=" fx-start-h fx-start-v fx-centered fx-col"
                              style={{ flexBasis: "48%" }}
                              to={`/videos/${video.naddr}`}
                            >
                              <div
                                className="sc-s-18 bg-img cover-bg fit-container fx-centered fx-end-h fx-end-v box-pad-h-s box-pad-v-s"
                                style={{
                                  aspectRatio: "16/9",
                                  backgroundImage: `url(${video.image})`,
                                  border: "none",
                                }}
                              >
                                <div
                                  className="sticker sticker-small"
                                  style={{
                                    backgroundColor: "black",
                                    color: "white",
                                  }}
                                >
                                  {video.duration}
                                </div>
                              </div>
                              <p className="p-two-lines">{video.title}</p>
                              <div className="fit-container fx-centered fx-start-h">
                                <AuthorPreview pubkey={video.pubkey} />
                                <p className="p-small gray-c">&#9679;</p>
                                <p className="gray-c p-medium">
                                  <Date_
                                    toConvert={
                                      new Date(video.published_at * 1000)
                                    }
                                  />
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                        <div style={{ flex: "1 1 400px" }}></div>
                        <div style={{ flex: "1 1 400px" }}></div>
                        <div style={{ flex: "1 1 400px" }}></div>
                      </>
                    )}
                    {isLoading && (
                      <div
                        className="fit-container fx-centered fx-col"
                        style={{ height: "20vh" }}
                      >
                        <p>Loading videos</p>
                        <LoadingDots />
                      </div>
                    )}
                    {videos.length === 0 && !isLoading && (
                      <div
                        className="fit-container fx-centered fx-col"
                        style={{ height: "40vh" }}
                      >
                        <h4>No videos were found!</h4>
                        <p className="gray-c p-centered">
                          No videos were found in this relay
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="box-pad-h-s fx-centered fx-col fx-start-v sticky extras-homepage"
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
                    zIndex: "100",
                    flex: 1,
                  }}
                  ref={extrasRef}
                >
                  <div className="sticky fit-container">
                    <SearchbarNOSTR />
                  </div>
                  <div
                    className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v"
                    style={{
                      backgroundColor: "var(--c1-side)",
                      rowGap: "24px",
                      border: "none",
                    }}
                  >
                    <div className="fx-centered fx-start-h">
                      <h4>Top creators</h4>
                      {isLoading && (
                        <p className="gray-c p-medium">(Getting stats...)</p>
                      )}
                    </div>
                    <TopCreators top_creators={topCreators} kind={"videos"} />
                  </div>
                  {trendingNotes.length > 0 && (
                    <div
                      className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v box-marg-s"
                      style={{
                        backgroundColor: "var(--c1-side)",
                        rowGap: "24px",
                        border: "none",
                      }}
                    >
                      <div className="fx-centered fx-start-h">
                        <h4>Trending notes</h4>
                      </div>
                      <div className="fit-container fx-col fx-centered">
                        {trendingNotes.map((note) => {
                          return (
                            <div
                              className="fit-container fx-centered fx-col fx-start-v"
                              key={note.id}
                            >
                              <div className="fit-container fx-scattered">
                                <div className="fx-centered">
                                  <UserProfilePicNOSTR
                                    size={30}
                                    mainAccountUser={false}
                                    ring={false}
                                    user_id={note.pubkey}
                                    img={note.author_parsed.picture}
                                  />
                                  <div>
                                    <p className="p-medium">
                                      {note.author_parsed.display_name}
                                    </p>
                                    <p className="p-medium gray-c">
                                      @{note.author_parsed.name}
                                    </p>
                                  </div>
                                </div>
                                <Link to={`/notes/${note.nEvent}`}>
                                  <div className="share-icon"></div>
                                </Link>
                              </div>
                              <div className="fit-container">
                                {note.note_tree}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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

const AuthorPreview = ({ pubkey }) => {
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
    <div className="fx-centered">
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
