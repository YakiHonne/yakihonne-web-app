import React, { Fragment, useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import ArrowUp from "../../Components/ArrowUp";
import { SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import { getAIFeedContent } from "../../Helpers/Helpers";
import Slider from "../../Components/Slider";
import Date_ from "../../Components/Date_";
import { Link } from "react-router-dom";
import LoadingDots from "../../Components/LoadingDots";
import { Context } from "../../Context/Context";

export default function BuzzFeed() {
  const { buzzFeedSources } = useContext(Context);
  const [posts, setPosts] = useState([]);
  const [contentFrom, setContentFrom] = useState("all");
  const [lastEventTimestamp, setLastEventTimestamp] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const pool = new SimplePool();

    let sub = pool.subscribeMany(
      relaysOnPlatform,
      [
        {
          kinds: [1],
          "#l": ["YAKI AI FEED"],
          "#t": contentFrom === "all" ? undefined : [contentFrom],
          limit: 20,
          until: lastEventTimestamp,
        },
      ],
      {
        onevent(event) {
          let parsedEvent = getAIFeedContent(event);
          if (parsedEvent.is_authentic)
            setPosts((prev) => {
              if (!prev.find((post) => post.title === event.content))
                return [parsedEvent, ...prev].sort(
                  (p1, p2) => p2.created_at - p1.created_at
                );
              return prev;
            });
        },
        oneose() {
          setIsLoading(false);
        },
      }
    );
  }, [contentFrom, lastEventTimestamp]);

  const switchContentSource = (source) => {
    if (source === contentFrom) return;
    setContentFrom(source);
    setPosts([]);
    setLastEventTimestamp(undefined);
  };

  useEffect(() => {
    if (isLoading) return;
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

      setLastEventTimestamp(posts[posts.length - 1].created_at);
    };
    document
      .querySelector(".main-page-nostr-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".main-page-nostr-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [isLoading]);

  return (
    <div>
      <Helmet>
        <title>Yakihonne | Buzz feed</title>
        <meta
          name="description"
          content={"News from all around the globe at the hour"}
        />
        <meta
          property="og:description"
          content={"News from all around the globe at the hour"}
        />

        <meta property="og:url" content={`https://yakihonne.com/buzz-feed`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content="Yakihonne | Buzz feed" />
        <meta property="twitter:title" content="Yakihonne | Buzz feed" />
        <meta
          property="twitter:description"
          content={"News from all around the globe at the hour"}
        />
      </Helmet>
      <div className="fit-container fx-centered">
        <div className="main-container">
          <SidebarNOSTR />
          <main className="main-page-nostr-container" style={{ padding: 0 }}>
            <ArrowUp />
            <div className="box-pad-h-m box-pad-v-m">
              <div className="fx-centered fx-start-h fit-container">
                <div style={{ width: "min(100%,1000px)" }}>
                  <div
                    className="fit-container fx-centered fx-col fx-start-v box-pad-v"
                    style={{
                      position: "sticky",
                      top: "0px",
                      backgroundColor: "var(--white)",
                      paddingTop: "1.5rem",
                      zIndex: "101",
                    }}
                  >
                    <h4>Buzz feed ({posts.length})</h4>
                    <div className="box-pad-v-s"></div>
                    <Slider
                      items={[
                        <button
                          className={`btn  fx-centered fx-shrink ${
                            contentFrom === "all"
                              ? "btn-normal-gray"
                              : "btn-gst-nc"
                          }`}
                          onClick={() => switchContentSource("all")}
                        >
                          Globe
                        </button>,
                        ...buzzFeedSources.map((source, index) => {
                          return (
                            <button
                              className={`btn  fx-centered fx-shrink ${
                                source.name === contentFrom
                                  ? "btn-normal-gray"
                                  : "btn-gst-nc"
                              }`}
                              onClick={() => {
                                switchContentSource(source.name);
                              }}
                              key={`${source.name}-${index}`}
                            >
                              <div
                                style={{
                                  minWidth: "24px",
                                  minHeight: "24px",
                                  borderRadius: "var(--border-r-50)",
                                  backgroundImage: `url(${source.icon})`,
                                }}
                                className="bg-img cover-bg"
                              ></div>
                              {source.name}
                            </button>
                          );
                        }),
                      ]}
                    />
                  </div>
                  <div className="fit-container fx-centered fx-start-h fx-start-v fx-wrap fx-stretch">
                    {posts.map((post) => {
                      return (
                        <Fragment>
                          <Link
                            key={post.id}
                            to={`/buzz-feed/${post.nEvent}`}
                            className="fit-container fx-scattered  slide-up pointer box-pad-h-m "
                          >
                            <div className="fx-scattered fx-start-v fx-col">
                              <div className="fx-centered">
                                <a
                                  className="fx-centered"
                                  href={post.source_domain}
                                  target="_blank"
                                  style={{ minWidth: "max-content" }}
                                >
                                  <div
                                    style={{
                                      minWidth: "16px",
                                      minHeight: "16px",
                                      borderRadius: "var(--border-r-50)",
                                      backgroundImage: `url(${post.source_icon})`,
                                    }}
                                    className="bg-img cover-bg"
                                  ></div>

                                  <p className="p-medium gray-c">
                                    {post.source_name}
                                  </p>
                                </a>
                                <p className="p-medium gray-c">|</p>
                                <p className="fit-container p-medium gray-c">
                                  <Date_
                                    toConvert={
                                      new Date(post.published_at * 1000)
                                    }
                                  />
                                </p>
                              </div>
                              <p className="fit-container">{post.title}</p>
                            </div>
                            <div
                              className="sc-s-18 bg-img cover-bg"
                              style={{
                                minWidth: "50px",
                                aspectRatio: "1/1",
                                backgroundImage: `url(${post.image})`,
                              }}
                            ></div>
                          </Link>
                          <hr />
                        </Fragment>
                      );
                    })}
                    <div style={{ flex: "1 1 200px" }}></div>
                    <div style={{ flex: "1 1 200px" }}></div>
                    <div style={{ flex: "1 1 200px" }}></div>
                  </div>
                  {isLoading && (
                    <div className="fit-container fx-centered box-marg-full">
                      <p className="gray-c">Loading</p>
                      <LoadingDots />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
