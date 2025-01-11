import React, { useContext, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import ArrowUp from "../../Components/ArrowUp";
import { SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import { getAIFeedContent } from "../../Helpers/Helpers";
import Date_ from "../../Components/Date_";
import { Link, useParams } from "react-router-dom";
import LoadingDots from "../../Components/LoadingDots";
import { Context } from "../../Context/Context";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import { filterRelays } from "../../Helpers/Encryptions";
import Footer from "../../Components/Footer";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";

const checkTopicInList = (list, topic) => {
  return list.find(
    (item) => item.trim().toLowerCase() === topic.trim().toLowerCase()
  );
};
export default function BuzzFeedSource() {
  const { source } = useParams();
  const {
    setToast,
    nostrUserTopics,
    nostrUser,
    isPublishing,
    setNostrUserTopics,
    setToPublish,
    nostrKeys,
    buzzFeedSources
  } = useContext(Context);
  const [posts, setPosts] = useState([]);

  const [sourceMetadata, setSourceMetadata] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isSubscribed = useMemo(() => {
    return checkTopicInList(nostrUserTopics, source);
  }, [nostrUserTopics, source]);

  useEffect(() => {
    if (buzzFeedSources.length === 0 || !source) return;

    let source_ = buzzFeedSources.find((source_) => source_.name === source);
    if (!source_) {
      setToast({
        type: 2,
        desc: "This Buzz Feed source does not belong to Yakhonne.",
      });
      return;
    }
    source_.domain = source_.icon.split("/")[2];
    setSourceMetadata(source_);
    const pool = new SimplePool();
    setIsLoading(true);
    let sub = pool.subscribeMany(
      relaysOnPlatform,
      [
        {
          kinds: [1],
          "#l": ["YAKI AI FEED"],
          "#t": [source],
        },
      ],
      {
        onevent(event) {
          let parsedEvent = getAIFeedContent(event);
          if (parsedEvent.is_authentic) {
            setPosts((prev) => {
              if (!prev.find((post) => post.title === event.content))
                return [parsedEvent, ...prev].sort(
                  (p1, p2) => p2.published_at - p1.published_at
                );
              return prev;
            });
            setIsLoading(false);
          }
        },
        oneose() {
          setIsLoading(false);
        },
      }
    );
  }, [buzzFeedSources]);

  const subscribe = () => {
    if (!nostrUser) {
      return;
    }
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    setToPublish({
      nostrKeys: nostrKeys,
      kind: 30078,
      content: "",
      tags: [
        ["d", "MyFavoriteTopicsInYakihonne"],
        ...nostrUserTopics.map((item) => ["t", item]),
        ["t", source],
      ],
      allRelays: [...filterRelays(relaysOnPlatform, nostrUser.relays)],
    });
    setNostrUserTopics([...nostrUserTopics, source]);
  };

  const unsubscribe = () => {
    if (!nostrUser) {
      return;
    }
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    setToPublish({
      nostrKeys: nostrKeys,
      kind: 30078,
      content: "",
      sources: [
        ["d", "MyFavoriteTopicsInYakihonne"],
        ...nostrUserTopics
          .filter((item) => item !== source)
          .map((item) => ["t", item]),
      ],
      allRelays: [...filterRelays(relaysOnPlatform, nostrUser.relays)],
    });
    setNostrUserTopics([...nostrUserTopics.filter((item) => item !== source)]);
  };

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
            <div className="fx-centered fx-start-h fx-start-v fit-container">
              <div style={{ width: "min(100%,800px)" }}>
                <div className="sc-s-18 fit-container">
                  <div
                    className="fit-container fx-centered fx-end-h  fx-col bg-img cover-bg"
                    style={{
                      height: "20vh",
                      position: "relative",
                      backgroundImage: `url(${sourceMetadata.icon})`,
                      backgroundColor: "var(--very-dim-gray)",
                      filter: "blur(50px)",
                    }}
                  ></div>
                </div>
                <div className="fx-centered fit-container box-pad-v-m">
                  <div
                    className="fx-centered fx-col fx-start-v"
                    style={{ width: "min(100%, 800px)" }}
                  >
                    <div className="fx-scattered fit-container">
                      <div
                        className="fx-centered"
                        style={{ columnGap: "16px" }}
                      >
                        <UserProfilePicNOSTR
                          size={48}
                          ring={false}
                          img={sourceMetadata.icon}
                          mainAccountUser={false}
                          allowClick={false}
                          user_id={false}
                        />
                        <a
                          href={`https://${sourceMetadata.domain}`}
                          target="_blank"
                          className="fx-centered fx-col fx-start-v"
                        >
                          <div >
                            <h4 className="p-caps">
                              {sourceMetadata.name || <LoadingDots />}
                            </h4>
                            {sourceMetadata && (
                              <div className="fx-centered fx-start-h">
                                <p className="gray-c">
                                  {sourceMetadata.domain || <LoadingDots />}
                                </p>
                                <div className="share-icon"></div>
                              </div>
                            )}
                          </div>
                        </a>
                      </div>
                      <button
                        className={`btn fx-centered ${
                          isSubscribed ? "btn-normal-gray" : "btn-gst-nc"
                        }`}
                        style={{ scale: ".8" }}
                        onClick={isSubscribed ? unsubscribe : subscribe}
                      >
                        {" "}
                        {isSubscribed && (
                          <>
                            <span className="p-big">&#x2212;</span> Unsubscribe
                          </>
                        )}
                        {!isSubscribed && (
                          <>
                            <span className="p-big">&#xFF0B;</span> Subscribe
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <h4 className="box-pad-v">Buzz feed ({posts.length})</h4>
                <div className="fit-container fx-centered fx-start-h fx-start-v fx-wrap fx-stretch">
                  {posts.map((post) => {
                    return (
                      <Link
                        key={post.id}
                        style={{
                          flex: "1 1 200px",
                          backgroundImage: `url(${post.image})`,
                        }}
                        to={`/buzz-feed/${post.nEvent}`}
                        className="fit-container sc-s-18 fx-scattered fx-col slide-up bg-img cover-bg pointer"
                      >
                        <div style={{ height: "100px" }}></div>
                        <div
                          className="fit-container fx-centered fx-wrap box-pad-h-m box-pad-v-m"
                          style={{
                            background:
                              "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 87%)",
                          }}
                        >
                          <div className="fit-container box-marg-full"></div>
                          <div>
                            <p className="fit-container p-medium gray-c">
                              <Date_
                                toConvert={new Date(post.published_at * 1000)}
                              />
                            </p>
                            <p
                              className="fit-container"
                              style={{ color: "white" }}
                            >
                              {post.title}
                            </p>
                          </div>
                          <div className="fit-container fx-scattered">
                            <a
                              className="fx-centered"
                              href={post.source_domain}
                              target="_blank"
                            >
                              <div
                                style={{
                                  minWidth: "20px",
                                  minHeight: "20px",
                                  borderRadius: "var(--border-r-50)",
                                  backgroundImage: `url(${post.source_icon})`,
                                }}
                                className="bg-img cover-bg"
                              ></div>
                              <p
                                className="p-medium"
                                style={{ color: "white" }}
                              >
                                {post.source_name}
                              </p>
                            </a>
                            <a
                              href={post.source_url}
                              target="_blank"
                              className="round-icon-tooltip"
                              data-tooltip="source"
                            >
                              <div className="share-icon"></div>
                            </a>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {isLoading && (
                  <div className="fit-container fx-centered box-marg-full">
                    <p className="gray-c">Loading</p>
                    <LoadingDots />
                  </div>
                )}
              </div>
              <div
                className=" fx-centered fx-col fx-start-v box-pad-h-m extras-homepage"
                style={{
                  position: "sticky",
                  top: 0,
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
                  }}
                >
                  <h4>More sources</h4>
                  <div className="fit-container fx-centered fx-wrap">
                    {buzzFeedSources.map((s) => {
                      if (s.name !== source)
                        return (
                          <a
                            key={s.id}
                            className="fit-container fx-scattered "
                            href={`/buzz-feed/source/${s.name}`}
                          >
                            <div className="fx-centered">
                              <UserProfilePicNOSTR
                                size={32}
                                ring={false}
                                img={s.icon}
                                mainAccountUser={false}
                                allowClick={false}
                                user_id={false}
                              />
                              <div>
                                <p className="p-caps">{s.name}</p>
                                <div className="fx-centered">
                                  <p className="gray-c">
                                    {s.icon.split("/")[2]}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="share-icon"></div>
                          </a>
                        );
                    })}
                  </div>
                </div>
                <Footer />
                <div className="box-marg-full"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
