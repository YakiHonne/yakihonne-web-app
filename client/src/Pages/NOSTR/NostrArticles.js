import React, { useContext, useMemo } from "react";
import { Context } from "../../Context/Context";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { useState } from "react";
import { useEffect } from "react";
import { nip19, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import { useNavigate } from "react-router-dom";
import LoadingDots from "../../Components/LoadingDots";
import { Helmet } from "react-helmet";
import { filterRelays, getBech32 } from "../../Helpers/Encryptions";
import { getImagePlaceholder } from "../../Content/NostrPPPlaceholder";
import Footer from "../../Components/Footer";
import PostPreviewCardNOSTR from "../../Components/NOSTR/PostPreviewCardNOSTR";
import ArrowUp from "../../Components/ArrowUp";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import TopCreators from "../../Components/NOSTR/TopCreators";
import { getEmptyNostrUser } from "../../Helpers/Encryptions";
var pool = new SimplePool();

const getTopCreators = (posts) => {
  if (!posts) return [];
  let netCreators = posts.filter((creator, index, posts) => {
    if (index === posts.findIndex((item) => item.pubkey === creator.pubkey))
      return creator;
  });

  let tempCreators = [];

  for (let creator of netCreators) {
    let stats = getCreatorStats(creator.pubkey, posts);
    tempCreators.push({
      ...getEmptyNostrUser(creator.pubkey),
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

const getCreatorStats = (pubkey, posts) => {
  let articles_number = 0;

  for (let creator of posts) {
    if (creator.author_pubkey === pubkey) {
      articles_number += 1;
    }
  }
  return {
    articles_number,
  };
};

export default function NostrArticles() {
  const { nostrUser, addNostrAuthors, mutedList } = useContext(Context);
  const navigateTo = useNavigate();
  const [relays, setRelays] = useState(relaysOnPlatform);
  const [activeRelay, setActiveRelay] = useState("");
  const [posts, setPosts] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [postToDelete, setPostToDelete] = useState(false);
  const [showRelaysList, setShowRelaysList] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [artsLastEventTime, setArtsLastEventTime] = useState(undefined);
  const topCreators = useMemo(() => {
    return getTopCreators(posts);
  }, [posts]);

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
              let parsedEvent = onArticlesEvent(event);
              events.push(parsedEvent);
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
  }, [artsLastEventTime, activeRelay, mutedList]);

  useEffect(() => {
    const handleScroll = () => {
      if (posts.length === 0) return;
      if (
        document.querySelector(".main-page-nostr-container").scrollHeight -
          document.querySelector(".main-page-nostr-container").scrollTop -
          60 >
        document.documentElement.offsetHeight
      ) {
        return;
      }
      setArtsLastEventTime(posts[posts.length - 1].created_at);
    };
    document
      .querySelector(".main-page-nostr-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".main-page-nostr-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [isLoaded]);

  const getArtsFilter = () => {
    let relaysToFetchFrom;
    let filter;

    if (activeRelay) relaysToFetchFrom = [activeRelay];
    if (!activeRelay)
      relaysToFetchFrom = !nostrUser
        ? relaysOnPlatform
        : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])];

    filter = [{ kinds: [30023], limit: 10, until: artsLastEventTime }];
    return {
      relaysToFetchFrom,
      filter,
    };
  };

  const onArticlesEvent = (event) => {
    let author_img = "";
    let author_name = getBech32("npub", event.pubkey).substring(0, 10);
    let author_pubkey = event.pubkey;
    let thumbnail = "";
    let title = "";
    let summary = "";
    let from = "";
    let contentSensitive = false;
    let postTags = [];
    let d = "";
    let modified_date = new Date(event.created_at * 1000).toISOString();
    let added_date = new Date(event.created_at * 1000).toISOString();
    let published_at = event.created_at;
    for (let tag of event.tags) {
      if (tag[0] === "published_at") {
        published_at = tag[1];
        added_date =
          tag[1].length > 10
            ? new Date(parseInt(tag[1])).toISOString()
            : new Date(parseInt(tag[1]) * 1000).toISOString();
      }
      if (tag[0] === "image") thumbnail = tag[1];
      if (tag[0] === "client") from = tag[1];
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

    setPosts((_posts) => {
      let index = _posts.findIndex((item) => item.d === d);
      let newP = Array.from(_posts);
      if (index === -1)
        newP = [
          ...newP,
          {
            id: event.id,
            pubkey: event.pubkey,
            kind: event.kind,
            thumbnail: thumbnail || getImagePlaceholder(),
            content: event.content,
            summary,
            author_img,
            author_pubkey,
            author_name,
            title,
            added_date,
            created_at: event.created_at,
            modified_date,
            published_at,
            postTags,
            naddr,
            d,
            contentSensitive,
            from: from || "N/A",
          },
        ];
      if (index !== -1) {
        if (_posts[index].created_at < event.created_at) {
          newP.splice(index, 1);
          newP.push({
            id: event.id,
            pubkey: event.pubkey,
            kind: event.kind,
            thumbnail: thumbnail || getImagePlaceholder(),
            content: event.content,
            summary,
            author_img,
            author_pubkey,
            author_name,
            title,
            added_date,
            created_at: event.created_at,
            modified_date,
            published_at,
            postTags,
            naddr,
            d,
            contentSensitive,
            from: from || "N/A",
          });
        }
      }

      newP = newP.sort(
        (item_1, item_2) => item_2.created_at - item_1.created_at
      );

      return newP;
    });
    setIsLoading(false);
    return {
      id: event.id,
      pubkey: event.pubkey,
      kind: event.kind,
      thumbnail: thumbnail || getImagePlaceholder(),
      summary,
      author_img,
      author_pubkey,
      author_name,
      title,
      added_date,
      created_at: event.created_at,
      modified_date,
      published_at,
      postTags,
      naddr,
      d,
      contentSensitive,
      from: from || "N/A",
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
    setPosts([]);
    setActiveRelay(source);
    setArtsLastEventTime(undefined);
  };

  return (
    <>
      <div>
        <Helmet>
          <title>Yakihonne | My articles</title>
          <meta
            name="description"
            content={"Browse all published articles on Nostr"}
          />
          <meta
            property="og:description"
            content={"Browse all published articles on Nostr"}
          />

          <meta property="og:url" content={`https://yakihonne.com/articles`} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content="Yakihonne | Articles" />
          <meta property="twitter:title" content="Yakihonne | Articles" />
          <meta
            property="twitter:description"
            content={"Browse all published articles on Nostr"}
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
                setShowFilter(false);
              }}
            >
              <div className="fx-centered fit-container fx-start-h fx-start-v">
                <div
                  style={{ width: "min(100%,700px)" }}
                  className="box-pad-h-m"
                >
                  <div className="box-pad-v-m fit-container fx-scattered sticky">
                    <div className="fx-centered fx-col fx-start-v">
                      <div className="fx-centered">
                        <h4>{posts.length} Articles</h4>
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
                  <div className="fit-container fx-scattered fx-wrap fx-stretch">
                    {posts.length > 0 && (
                      <>
                        {posts.map((post) => {
                          if (post.kind === 30023 && post.title)
                            return (
                              <div
                                key={post.id}
                                className="fit-container fx-centered "
                              >
                                <PostPreviewCardNOSTR item={post} />
                              </div>
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
                        <p>Loading articles</p>
                        <LoadingDots />
                      </div>
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
                  </div>
                </div>
                <div
                  className="box-pad-h-s fx-centered fx-col fx-start-v sticky extras-homepage"
                  style={{
                    position: "sticky",

                    zIndex: "100",
                    width: "min(100%, 400px)",
                  }}
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
                      overflow: "visible",
                    }}
                  >
                    <div className="fx-centered fx-start-h">
                      <h4>Top creators</h4>
                      {isLoading && (
                        <p className="gray-c p-medium">(Getting stats...)</p>
                      )}
                    </div>
                    <TopCreators top_creators={topCreators} />
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
