import React, { useContext, useEffect, useMemo, useState } from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { SimplePool, relayInit } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import PostPreviewCardNOSTR from "../../Components/NOSTR/PostPreviewCardNOSTR";
import LoadingScreen from "../../Components/LoadingScreen";
import NavbarNOSTR from "../../Components/NOSTR/NavbarNOSTR";
import HomeCarouselNOSTR from "../../Components/NOSTR/HomeCarouselNOSTR";
import LoadingDots from "../../Components/LoadingDots";
import { Context } from "../../Context/Context";
import { getBech32 } from "../../Helpers/Encryptions";
import { nip19 } from "nostr-tools";
import TopCurators from "../../Components/NOSTR/TopCurators";
import { Link } from "react-router-dom";
import TopCreators from "../../Components/NOSTR/TopCreators";
import { Helmet } from "react-helmet";
import ArrowUp from "../../Components/ArrowUp";
import YakiIntro from "../../Components/YakiIntro";

const pool = new SimplePool();

const getTopCreators = (posts) => {
  if (!posts) return [];
  let netCreators = posts.filter((creator, index, posts) => {
    if (
      index ===
      posts.findIndex((item) => item.author_pubkey === creator.author_pubkey)
    )
      return creator;
  });

  let tempCreators = [];

  for (let creator of netCreators) {
    let stats = getCreatorStats(creator.author_pubkey, posts);
    tempCreators.push({
      pubkey: creator.author_pubkey,
      name: creator.author_name,
      img: creator.author_img,
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

export default function NostrHome() {
  const { nostrUser, nostrUserLoaded } = useContext(Context);
  const [posts, setPosts] = useState([]);
  const [relays, setRelays] = useState(relaysOnPlatform);
  const [activeRelay, setActiveRelay] = useState("");
  const [usersRelays, setUsersRelays] = useState([...relaysOnPlatform]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentTags, setRecentTags] = useState([]);
  const topCreators = useMemo(() => {
    return getTopCreators(posts);
  }, [posts]);
  const [contentFrom, setContentFrom] = useState("relays");
  const [lastEventTime, setLastEventTime] = useState(undefined);
  useEffect(() => {
    // if (!nostrUser || contentFrom === "relays") {
    //   if (!nostrUser) setContentFrom("relays");
    //   contentFromRelays();
    //   return;
    // }
    // contentFromContact();
    setIsLoaded(false);
    contentFromRelays();
  }, [activeRelay, contentFrom, lastEventTime]);

  const contentFromRelays = async () => {
    // setIsLoading(true);
    // setPosts([]);

    let events = [];
    var sub = null;
    if (!nostrUser || contentFrom === "relays") {
      if (!nostrUser) setContentFrom("relays");
      if (activeRelay) {
        const relay = relayInit(activeRelay);
        await relay.connect();
        sub = relay.sub([{ kinds: [30023], limit: 20, until: lastEventTime }]);
        // sub = pool.sub([activeRelay], [{ kinds: [30023], limit: page }]);
      } else {
        sub = pool.sub(nostrUser?.relays || relaysOnPlatform, [
          { kinds: [30023], limit: 20, until: lastEventTime },
        ]);
      }
    } else {
      if (!nostrUser.following || nostrUser.following.length === 0) {
        setRecentTags([]);
        setPosts([]);
        setIsLoading(false);
        setIsLoaded(true);
        return;
      }
      sub = pool.sub(relaysOnPlatform, [
        {
          kinds: [30023],
          authors: [...nostrUser.following.map((item) => item[1])],
          limit: 20,
          until: lastEventTime,
        },
      ]);
    }
    if (!sub) return;

    sub.on("event", (event) => {
      let author_img = "";
      let author_name = getBech32("npub", event.pubkey).substring(0, 10);
      let author_pubkey = event.pubkey;
      let thumbnail = "";
      let title = "";
      let summary = "";
      let contentSensitive = false;
      let postTags = [];

      let d = "";
      let added_date = new Date(event.created_at * 1000).toDateString();
      for (let tag of event.tags) {
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

      events.push({
        id: event.id,
        thumbnail,
        summary,
        author_img,
        author_pubkey,
        author_name,
        title,
        added_date,
        created_at: event.created_at,
        postTags,
        naddr,
        d,
        contentSensitive,
      });
      setPosts((_posts) => {
        // let newP = [
        //   ..._posts,
        //   {
        //     id: event.id,
        //     thumbnail,
        //     summary,
        //     author_img,
        //     author_pubkey,
        //     author_name,
        //     title,
        //     added_date,
        //     created_at: event.created_at,
        //     postTags,
        //     naddr,
        //   },
        // ];
        let newP = posts.find((item) => item.id === event.id)
          ? [..._posts]
          : [
              ..._posts,
              {
                id: event.id,
                thumbnail,
                summary,
                author_img,
                author_pubkey,
                author_name,
                title,
                added_date,
                created_at: event.created_at,
                postTags,
                naddr,
                d,
                contentSensitive,
              },
            ];

        newP = newP.sort(
          (item_1, item_2) => item_2.created_at - item_1.created_at
        );
        // let tempNewP = newP.sort(
        //   (item_1, item_2) => item_2.created_at - item_1.created_at
        // );
        // if (activeRelay && activeRelay === relaysOnPlatform[0])
        //   tempNewP = tempNewP.reverse();
        return newP;
        // return tempNewP;
      });
      setIsLoading(false);
    });
    sub.on("eose", () => {
      setRecentTags(
        [...new Set(events.map((item) => item.postTags.flat()).flat())].splice(
          0,
          30
        )
      );
      if (activeRelay) pool.close([activeRelay]);
      if (!activeRelay) pool.close(nostrUser?.relays || relaysOnPlatform);
      setIsLoaded(true);
      sub.unsub();
    });
  };

  // const contentFromRelays = async () => {
  //   setIsLoading(true);
  //   if (activeRelay) {
  //     const relay = relayInit(activeRelay);
  //     await relay.connect();
  //     var events = await relay.list([{ kinds: [30023] }]);
  //     var authorsIDs = events.map((event) => event.pubkey);
  //     var authors = await pool.list(
  //       [relaysOnPlatform[2]],
  //       [{ kinds: [0], authors: authorsIDs }]
  //     );
  //   } else {
  //     // var sub =  pool.sub(nostrUser?.relays || relaysOnPlatform, [
  //     //   { kinds: [30023] },
  //     // ]);
  //     // sub.on("event", events => {
  //     //   var events = events
  //     //   console.log(events)
  //     // })
  //     var events = await pool.list(nostrUser?.relays || relaysOnPlatform, [
  //       { kinds: [30023] },
  //     ]);

  //     var authorsIDs = events.map((event) => event.pubkey);
  //     var authors = await pool.list(
  //       [relaysOnPlatform[2]],
  //       [{ kinds: [0], authors: authorsIDs }]
  //     );
  //   }

  //   let posts = events.map((event) => {
  //     let author = authors.find((item) => item.pubkey === event.pubkey) || "";
  //     let author_img = author ? JSON.parse(author.content).picture : "";
  //     let author_name = author
  //       ? JSON.parse(author.content).name?.substring(0, 20)
  //       : getBech32("npub", event.pubkey).substring(0, 10);
  //     let author_pubkey = event.pubkey;
  //     let thumbnail = "";
  //     let title = "";
  //     let summary = "";
  //     let postTags = [];

  //     let d = "";
  //     let added_date = new Date(event.created_at * 1000).toDateString();
  //     for (let tag of event.tags) {
  //       if (tag[0] === "image") thumbnail = tag[1];
  //       if (tag[0] === "title") title = tag[1];
  //       if (tag[0] === "summary") summary = tag[1];
  //       if (tag[0] === "t") postTags.push(tag[1]);
  //       if (tag[0] === "d") d = tag[1];
  //     }

  //     let naddr = nip19.naddrEncode({
  //       identifier: d,
  //       pubkey: author_pubkey,
  //       kind: 30023,
  //     });
  //     return {
  //       id: event.id,
  //       thumbnail,
  //       summary,
  //       author_img,
  //       author_pubkey,
  //       author_name,
  //       title,
  //       added_date,
  //       created_at: event.created_at,
  //       postTags,
  //       naddr,
  //     };
  //   });
  //   if (activeRelay && activeRelay === relaysOnPlatform[0])
  //     posts = posts.reverse();
  //   if (!activeRelay)
  //     posts = posts.sort(
  //       (item_1, item_2) => item_2.created_at - item_1.created_at
  //     );
  //   setRecentTags(
  //     [...new Set(posts.map((item) => item.postTags.flat()).flat())].splice(
  //       0,
  //       30
  //     )
  //   );
  //   setPosts(posts);
  //   // setIsLoaded(true);
  //   setIsLoading(false);
  // };

  const contentFromContact = async () => {
    if (!nostrUser.following || nostrUser.following.length === 0) {
      setRecentTags([]);
      setPosts([]);
      setIsLoading(false);
      return;
    }

    let events = [];
    var sub = null;

    console.log(nostrUser.following);

    sub = pool.sub(relaysOnPlatform, [
      {
        kinds: [30023],
        authors: [...nostrUser.following.map((item) => item[1])],
        limit: 50,
      },
    ]);

    if (!sub) return;

    sub.on("event", (event) => {
      let author_img = "";
      let author_name = getBech32("npub", event.pubkey).substring(0, 10);
      let author_pubkey = event.pubkey;
      let thumbnail = "";
      let title = "";
      let summary = "";
      let postTags = [];

      let d = "";
      let added_date = new Date(event.created_at * 1000).toDateString();
      for (let tag of event.tags) {
        if (tag[0] === "image") thumbnail = tag[1];
        if (tag[0] === "title") title = tag[1];
        if (tag[0] === "summary") summary = tag[1];
        if (tag[0] === "t") postTags.push(tag[1]);
        if (tag[0] === "d") d = tag[1];
      }

      let naddr = nip19.naddrEncode({
        identifier: d,
        pubkey: author_pubkey,
        kind: 30023,
      });

      events.push({
        id: event.id,
        thumbnail,
        summary,
        author_img,
        author_pubkey,
        author_name,
        title,
        added_date,
        created_at: event.created_at,
        postTags,
        naddr,
      });
      setPosts((_posts) => {
        let newP = posts.find((item) => item.id === event.id)
          ? [..._posts]
          : [
              ..._posts,
              {
                id: event.id,
                thumbnail,
                summary,
                author_img,
                author_pubkey,
                author_name,
                title,
                added_date,
                created_at: event.created_at,
                postTags,
                naddr,
              },
            ];

        let tempNewP = newP.sort(
          (item_1, item_2) => item_2.created_at - item_1.created_at
        );
        if (activeRelay && activeRelay === relaysOnPlatform[0])
          tempNewP = tempNewP.reverse();
        return tempNewP;
      });
      setIsLoading(false);
    });
    sub.on("eose", () => {
      setRecentTags(
        [...new Set(events.map((item) => item.postTags.flat()).flat())].splice(
          0,
          30
        )
      );
      if (activeRelay) pool.close([activeRelay]);
      if (!activeRelay) pool.close(nostrUser?.relays || relaysOnPlatform);
      // sub.unsub();
    });
  };
  // const contentFromContact = async () => {
  //   setIsLoading(true);
  //   if (!nostrUser.following || nostrUser.following.length === 0) {
  //     setRecentTags([]);
  //     setPosts([]);
  //     setIsLoading(false);
  //     return;
  //   }

  //   var events = await pool.list(relaysOnPlatform, [
  //     {
  //       kinds: [30023],
  //       authors: [...nostrUser.following.map((item) => item[1])],
  //     },
  //   ]);
  //   var authorsIDs = events.map((event) => event.pubkey);
  //   var authors = await pool.list(
  //     [relaysOnPlatform[2]],
  //     [{ kinds: [0], authors: authorsIDs }]
  //   );

  //   let posts = events.map((event) => {
  //     let author = authors.find((item) => item.pubkey === event.pubkey) || "";
  //     let author_img = author ? JSON.parse(author.content).picture : "";
  //     let author_name = author
  //       ? JSON.parse(author.content).name?.substring(0, 20)
  //       : getBech32("npub", event.pubkey).substring(0, 10);
  //     let author_pubkey = event.pubkey;
  //     let thumbnail = "";
  //     let title = "";
  //     let summary = "";
  //     let postTags = [];
  //     let d = "";
  //     let added_date = new Date(event.created_at * 1000).toDateString();

  //     for (let tag of event.tags) {
  //       if (tag[0] === "image") thumbnail = tag[1];
  //       if (tag[0] === "title") title = tag[1];
  //       if (tag[0] === "summary") summary = tag[1];
  //       if (tag[0] === "t") postTags.push(tag[1]);
  //       if (tag[0] === "d") d = tag[1];
  //     }

  //     let naddr = nip19.naddrEncode({
  //       identifier: d,
  //       pubkey: author_pubkey,
  //       kind: 30023,
  //     });

  //     return {
  //       id: event.id,
  //       thumbnail,
  //       summary,
  //       author_img,
  //       author_pubkey,
  //       author_name,
  //       title,
  //       added_date,
  //       created_at: event.created_at,
  //       postTags,
  //       naddr,
  //     };
  //   });

  //   if (activeRelay && activeRelay === relaysOnPlatform[0])
  //     posts = posts.reverse();
  //   if (!activeRelay)
  //     posts = posts.sort(
  //       (item_1, item_2) => item_2.created_at - item_1.created_at
  //     );
  //   setRecentTags(
  //     [...new Set(posts.map((item) => item.postTags.flat()).flat())].splice(
  //       0,
  //       30
  //     )
  //   );
  //   setPosts(posts);
  //   setIsLoading(false);
  // };

  const switchContentSource = () => {
    if (!nostrUser || !isLoaded) return;
    setIsLoading(true);
    setPosts([]);
    setRecentTags([]);
    if (contentFrom !== "relays") {
      setContentFrom("relays");
      return;
    }
    setContentFrom("contact");
  };

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
      // if (
      //   window.innerHeight + document.documentElement.scrollTop + 60 <
      //   document.documentElement.offsetHeight
      // ) {
      //   return;
      // }

      setLastEventTime(posts[posts.length - 1].created_at);
    };
    document
      .querySelector(".main-page-nostr-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".main-page-nostr-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [recentTags]);

  // console.log(de);
  // if (!nostrUserLoaded) return <LoadingScreen />;
  // if (!isLoaded) return <LoadingScreen />;

  const handleRelaySelection = (e) => {
    document.querySelector(".main-page-nostr-container").scrollTo(0, 0);
    setActiveRelay(e.target.value);
    setLastEventTime(undefined);
    setIsLoading(true);
    setPosts([]);
    setRecentTags([]);
  };

  return (
    <div style={{ overflow: "auto" }}>
      <Helmet>
        <title>Yakihonne | Home</title>
      </Helmet>
      <SidebarNOSTR />
      <main className="main-page-nostr-container">
        <YakiIntro />
        <ArrowUp />
        <NavbarNOSTR />
        <div className="fit-container box-marg-s">
          <HomeCarouselNOSTR />
        </div>

        <div
          className="fit-container fx-even fx-start-v"
          style={{ columnGap: "32px" }}
        >
          <div className={`fx-centered  fx-wrap posts-cards`}>
            <div
              className="fit-container fx-centered box-pad-v"
              style={{
                position: "sticky",
                top: "-34px",
                backgroundColor: "var(--white)",
                zIndex: "100",
              }}
            >
              <div className="fx-scattered fit-container">
                {nostrUser && (
                  <div
                    className="fx-scattered sc-s pointer profile-switcher"
                    style={{
                      position: "relative",
                      width: "150px",
                      height: "45px",
                      border: "none",
                      backgroundColor: "var(--dim-gray)",
                      columnGap: 0,
                      opacity: !isLoaded ? ".4" : 1,
                    }}
                    onClick={switchContentSource}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        transform:
                          contentFrom !== "relays" ? "translateX(100%)" : "",
                        transition: ".2s ease-in-out",
                        height: "100%",
                        width: "50%",
                        backgroundColor: "var(--c1)",
                        borderRadius: "var(--border-r-32)",
                      }}
                    ></div>
                    <p
                      className={`p-medium fx p-centered pointer ${
                        contentFrom !== "relays" ? "" : "white-c"
                      }`}
                      style={{
                        position: "relative",
                        zIndex: 10,
                        transition: ".2s ease-in-out",
                      }}
                    >
                      Relays
                    </p>
                    <p
                      className={`p-medium fx p-centered pointer ${
                        contentFrom !== "relays" ? "white-c" : ""
                      }`}
                      style={{
                        position: "relative",
                        zIndex: 10,
                        transition: ".2s ease-in-out",
                      }}
                    >
                      Follows
                    </p>
                  </div>
                )}
                {!nostrUser && <h4>Selected relays</h4>}
                {contentFrom === "relays" && (
                  <select
                    className="if"
                    onChange={handleRelaySelection}
                    value={activeRelay}
                  >
                    <option value="">All relays</option>
                    {nostrUser &&
                      nostrUser.relays.length > 0 &&
                      nostrUser.relays.map((relay) => {
                        return (
                          <option
                            key={relay}
                            value={relay}
                            className="box-pad-h box-pad-v-m sc-s fx-shrink pointer fx-centered"
                            style={{
                              width: "max-content",
                              // filter: activeRelay === relay ? "invert()" : "",
                              transition: ".4s ease-in-out",
                            }}
                            // onClick={() => setActiveRelay(relay)}
                          >
                            {isLoading && relay === activeRelay ? (
                              <>Connecting...</>
                            ) : (
                              relay.split("wss://")[1]
                            )}
                          </option>
                        );
                      })}
                    {(!nostrUser ||
                      (nostrUser && nostrUser.relays.length === 0)) &&
                      relays.map((relay) => {
                        return (
                          <option
                            key={relay}
                            className="box-pad-h box-pad-v-m sc-s fx-shrink pointer fx-centered"
                            style={{
                              width: "max-content",
                              // filter: activeRelay === relay ? "invert()" : "",
                              transition: ".4s ease-in-out",
                            }}
                            value={relay}
                            // onClick={() => setActiveRelay(relay)}
                          >
                            {isLoading && relay === activeRelay ? (
                              <>Connecting..</>
                            ) : (
                              relay.split("wss://")[1]
                            )}
                          </option>
                        );
                      })}
                  </select>
                )}
              </div>
            </div>
            {isLoading && (
              <>
                <div
                  className="fit-container fx-centered sc-s skeleton-container posts-card"
                  style={{
                    height: "200px",
                    backgroundColor: "var(--dim-gray)",
                    border: "none",
                  }}
                ></div>
                <div
                  className="fit-container fx-centered sc-s skeleton-container posts-card"
                  style={{
                    height: "200px",
                    backgroundColor: "var(--dim-gray)",
                    border: "none",
                  }}
                ></div>
              </>
            )}
            {!isLoading &&
              posts.map((item) => {
                if (item.title)
                  return (
                    <div key={item.id} className="fit-container fx-centered">
                      {" "}
                      <PostPreviewCardNOSTR item={item} />
                    </div>
                  );
              })}
            {/* <button
              className="btn btn-normal"
              onClick={() => setPage((prev) => prev + 50)}
            >
              more
            </button> */}
            {!isLoaded && (
              <div className="fit-container box-pad-v fx-centered fx-col">
                <p className="gray-c">Loading</p>
                <LoadingDots />
              </div>
            )}
            {!isLoading &&
              (!nostrUser?.following || nostrUser?.following?.length === 0) &&
              contentFrom !== "relays" && (
                <div
                  className="fit-container fx-centered fx-col"
                  style={{ height: "30vh" }}
                >
                  <h4>No content to show!</h4>
                  <p
                    className="gray-c p-centered"
                    style={{ maxWidth: "500px" }}
                  >
                    You are not following anyone, start to follow people or
                    switch to all relays tab
                  </p>
                </div>
              )}
            {!isLoading &&
              nostrUser?.following?.length > 0 &&
              posts.length === 0 &&
              contentFrom !== "relays" && (
                <div
                  className="fit-container fx-centered fx-col"
                  style={{ height: "30vh" }}
                >
                  <h4>No articles</h4>
                  <p
                    className="gray-c p-centered"
                    style={{ maxWidth: "500px" }}
                  >
                    Your follows have not yet posted any articles
                  </p>
                </div>
              )}
          </div>
          <div
            className=" fx-centered box-pad-v-s fx-col fx-start-v extras-homepage"
            style={{
              position: "sticky",
              top: "-40px",
              backgroundColor: "var(--white)",
              zIndex: "100",
              width: "min(100%, 500px)",
            }}
          >
            <div className="box-pad-v">
              <h4>Top curators</h4>
            </div>
            <TopCurators />

            {posts.length > 0 && (
              <>
                <div className="box-pad-v fx-centered fx-col fx-start-v">
                  <h4>Top creators</h4>
                  {contentFrom === "relays" && (
                    <p className="c1-c p-medium">
                      ({activeRelay ? `in ${activeRelay}` : "in all relays"})
                    </p>
                  )}
                  {contentFrom !== "relays" && (
                    <p className="c1-c p-medium">(From your follows)</p>
                  )}
                </div>
                <div className={`fit-container ${isLoading ? "flash" : ""}`}>
                  <TopCreators top_creators={topCreators} />
                </div>
              </>
            )}

            {recentTags.length > 0 && (
              <>
                <div className="box-pad-v">
                  <h4>Latest tags</h4>
                </div>
                <div className="fx-centered fx-start-h fx-wrap">
                  {recentTags.map((tag, index) => {
                    return (
                      <Link
                        key={index}
                        className="sticker sticker-small sticker-gray-gray pointer"
                        to={`/tags/${tag}`}
                      >
                        {tag}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const Placeholder = () => {
  return (
    <>
      <div style={{ flex: "1 1 200px" }}>
        <div style={{ width: "300px" }}></div>
      </div>
      <div style={{ flex: "1 1 200px" }}>
        <div style={{ width: "300px" }}></div>
      </div>
      <div style={{ flex: "1 1 200px" }}>
        <div style={{ width: "300px" }}></div>
      </div>
      <div style={{ flex: "1 1 200px" }}>
        <div style={{ width: "300px" }}></div>
      </div>
    </>
  );
};
