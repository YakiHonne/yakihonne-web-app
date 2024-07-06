import React, { useContext } from "react";
import { Context } from "../../Context/Context";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import NavbarNOSTR from "../../Components/NOSTR/NavbarNOSTR";
import { useState } from "react";
import PagePlaceholder from "../../Components/PagePlaceholder";
import LoadingScreen from "../../Components/LoadingScreen";
import { useEffect } from "react";
import { nip19, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import Date_ from "../../Components/Date_";
import ToDeletePostNOSTR from "../../Components/NOSTR/ToDeletePostNOSTR";
import placeholder from "../../media/images/nostr-thumbnail-ph.svg";
import { Link, useNavigate } from "react-router-dom";
import LoadingDots from "../../Components/LoadingDots";
import { Helmet } from "react-helmet";

const pool = new SimplePool();

export default function NostrMyPosts() {
  const { nostrKeys, nostrUser, nostrUserLoaded } = useContext(Context);
  const navigateTo = useNavigate();
  const [relays, setRelays] = useState(relaysOnPlatform);
  const [activeRelay, setActiveRelay] = useState(relaysOnPlatform[0]);
  const [posts, setPosts] = useState([]);
  const [timestamp, setTimestamp] = useState(new Date().getTime());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [postToDelete, setPostToDelete] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setPosts([]);
        // var posts = await pool.list(
        //   [activeRelay],
        //   [{ kinds: [30023], authors: [nostrKeys.pub] }]
        // );
        var sub = pool.sub(
          [activeRelay],
          [{ kinds: [30023, 30024], authors: [nostrKeys.pub] }]
        );
        // var posts = await pool.list(relaysOnPlatform, [
        //   { kinds: [30023], authors: [nostrKeys.pub] },
        // ]);
        sub.on("event", (event) => {
          // posts = posts.map((post) => {
          //   return extractData(post);
          // });

          setPosts((_posts) => {
            let newP = [extractData(event), ..._posts];
            return newP;
          });
          setIsLoaded(true);
          setIsLoading(false);
        });
        sub.on("eose", () => {
          sub.unsub();
          pool.close([activeRelay]);
          setIsLoaded(true);
          setIsLoading(false);
        });
      } catch (err) {
        console.log(err);
        setIsLoading(false);
      }
    };
    if (nostrKeys && nostrUserLoaded) {
      fetchData();
      return;
    }
    if (!nostrKeys && nostrUserLoaded) {
      setIsLoaded(true);
    }
  }, [nostrKeys, nostrUserLoaded, timestamp, activeRelay]);

  const extractData = (post) => {
    let added_date = new Date(post.created_at * 1000).toISOString();
    let title = "";
    let thumbnail = "";
    let summary = "";
    let d = "";
    let cat = [];

    for (let tag of post.tags) {
      if (tag[0] === "d") d = tag[1];
      if (tag[0] === "image") thumbnail = tag[1];
      if (tag[0] === "title") title = tag[1];
      if (tag[0] === "summary") summary = tag[1];
      if (tag[0] === "t") cat.push(tag[1]);
    }

    let naddr = nip19.naddrEncode({
      identifier: d,
      pubkey: post.pubkey,
      kind: post.kind,
    });

    return {
      id: post.id,
      kind: post.kind,
      content: post.content,
      title,
      thumbnail,
      thumbnail,
      summary,
      d,
      cat,
      added_date,
      naddr,
    };
  };

  const initDeletedPost = (state) => {
    if (!state) {
      setPostToDelete(false);
      return;
    }
    setPostToDelete(false);
    setTimestamp(new Date().getTime());
  };

  if (!nostrUserLoaded) return <LoadingScreen />;
  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      {postToDelete && (
        <ToDeletePostNOSTR
          exit={() => initDeletedPost(false)}
          exitAndRefresh={() => initDeletedPost(true)}
          post_id={postToDelete.id}
          title={postToDelete.title}
          thumbnail={postToDelete.thumbnail}
          relayToDeleteFrom={activeRelay}
        />
      )}

      <div>
        <Helmet>
          <title>Yakihonne | My articles</title>
        </Helmet>
        <SidebarNOSTR />
        <main
          className={`main-page-nostr-container ${isLoading ? "flash" : ""}`}
        >
          <NavbarNOSTR />
          {nostrUser && (
            <>
              <div
                className="box-pad-v fx-centered fx-col"
                style={{
                  position: "sticky",
                  top: "-30px",
                  backgroundColor: "var(--white)",
                  zIndex: "50",
                }}
              >
                <div
                  className="fit-container fx-centered fx-start-h nostr-uer-relays"
                  style={{
                    height: "75px",
                    overflow: "scroll",
                    overflowY: "hidden",
                  }}
                >
                  {nostrUser &&
                    nostrUser.relays.length > 0 &&
                    nostrUser.relays.map((relay) => {
                      return (
                        <div
                          key={relay}
                          className="box-pad-h box-pad-v-m sc-s fx-shrink pointer fx-centered"
                          style={{
                            width: "max-content",
                            filter: activeRelay === relay ? "invert()" : "",
                            transition: ".4s ease-in-out",
                          }}
                          onClick={() => {
                            setActiveRelay(relay);
                            setPosts([]);
                          }}
                        >
                          {isLoading && relay === activeRelay ? (
                            <>
                              <span className="gray-c">Connecting</span>
                              <LoadingDots />{" "}
                            </>
                          ) : (
                            relay.split("wss://")[1]
                          )}
                        </div>
                      );
                    })}
                  {(!nostrUser ||
                    (nostrUser && nostrUser.relays.length === 0)) &&
                    relays.map((relay) => {
                      return (
                        <div
                          key={relay}
                          className="box-pad-h box-pad-v-m sc-s fx-shrink pointer fx-centered"
                          style={{
                            width: "max-content",
                            filter: activeRelay === relay ? "invert()" : "",
                            transition: ".4s ease-in-out",
                          }}
                          onClick={() => {
                            setActiveRelay(relay);
                            setPosts([]);
                          }}
                        >
                          {isLoading && relay === activeRelay ? (
                            <>
                              <span className="gray-c">Connecting</span>
                              <LoadingDots />{" "}
                            </>
                          ) : (
                            relay.split("wss://")[1]
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
              {posts.length > 0 && (
                <div className="box-pad-v">
                  <h3>
                    {posts.length >= 10 ? posts.length : `0${posts.length}`}{" "}
                    articles
                  </h3>
                </div>
              )}
              <div className="fit-container fx-scattered fx-wrap fx-stretch">
                {posts.length > 0 && (
                  <>
                    {posts.map((post) => {
                      return (
                        <div
                          className="sc-s fx-scattered fx-col"
                          style={{
                            flex: "1 1 400px",
                            position: "relative",
                            borderColor:
                              post.kind === 30024 ? "var(--orange-main)" : "",
                          }}
                          key={post.id}
                        >
                          {post.kind === 30024 && (
                            <div
                              style={{
                                position: "absolute",
                                left: "16px",
                                top: "16px",
                              }}
                            >
                              <div className="sticker sticker-normal sticker-orange">
                                Draft
                              </div>
                            </div>
                          )}
                          {(nostrKeys.sec ||
                            (!nostrKeys.sec && nostrKeys.ext)) && (
                            <div
                              style={{
                                position: "absolute",
                                right: "16px",
                                top: "16px",
                                width: "48px",
                                height: "48px",
                                backgroundColor: "var(--dim-gray)",
                                borderRadius: "var(--border-r-50)",
                              }}
                              className="fx-centered pointer"
                              onClick={() =>
                                setPostToDelete({
                                  id: post.id,
                                  title: post.title,
                                  thumbnail: post.thumbnail,
                                })
                              }
                            >
                              <div className="trash-24"></div>
                            </div>
                          )}
                          {post.kind === 30023 && (
                            <Link
                              to={`/article/${post.naddr}`}
                              target={"_blank"}
                              className="fit-container"
                            >
                              <div
                                className="bg-img cover-bg fit-container fx-centered"
                                style={{
                                  height: "200px",
                                  backgroundColor: "var(--dim-gray)",
                                  backgroundImage: post.thumbnail
                                    ? `url(${post.thumbnail})`
                                    : `url(${placeholder})`,
                                }}
                              ></div>
                              <div className="box-pad-h-m box-pad-v-m fit-container">
                                <p className="p-medium gray-c">
                                  on <Date_ toConvert={post.added_date} />
                                </p>
                                <p>{post.title}</p>
                              </div>
                            </Link>
                          )}
                          {post.kind === 30024 && (
                            <div
                              onClick={() =>
                                navigateTo("/write", {
                                  state: {
                                    post_id: post.id,
                                    post_kind: post.kind,
                                    post_title: post.title,
                                    post_desc: post.summary,
                                    post_thumbnail: post.thumbnail,
                                    post_tags: post.cat,
                                    post_d: post.d,
                                    post_content: post.content,
                                  },
                                })
                              }
                              className="fit-container pointer"
                            >
                              <div
                                className="bg-img cover-bg fit-container fx-centered"
                                style={{
                                  height: "200px",
                                  backgroundColor: "var(--dim-gray)",
                                  backgroundImage: post.thumbnail
                                    ? `url(${post.thumbnail})`
                                    : `url(${placeholder})`,
                                }}
                              ></div>
                              <div className="box-pad-h-m box-pad-v-m fit-container">
                                <p className="p-medium gray-c">
                                  on <Date_ toConvert={post.added_date} />
                                </p>
                                <p>{post.title}</p>
                              </div>
                            </div>
                          )}
                          {(nostrKeys.sec ||
                            (!nostrKeys.sec && nostrKeys.ext)) && (
                            <div className="fit-container">
                              <hr />
                              <div className="fit-container fx-scattered box-pad-h-m box-pad-v-m pointer">
                                <button
                                  onClick={() =>
                                    navigateTo("/write", {
                                      state: {
                                        post_id: post.id,
                                        post_kind: post.kind,
                                        post_title: post.title,
                                        post_desc: post.summary,
                                        post_thumbnail: post.thumbnail,
                                        post_tags: post.cat,
                                        post_d: post.d,
                                        post_content: post.content,
                                      },
                                    })
                                  }
                                  className="btn btn-gst"
                                >
                                  Edit article
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ flex: "1 1 400px" }}></div>
                    <div style={{ flex: "1 1 400px" }}></div>
                    <div style={{ flex: "1 1 400px" }}></div>
                  </>
                )}
                {posts.length === 0 && !isLoading && (
                  <div
                    className="fit-container fx-centered fx-col"
                    style={{ height: "40vh" }}
                  >
                    {/* <PagePlaceholder page={"nostr-no-posts"} /> */}
                    <h4>No articles were found!</h4>
                    <p className="gray-c p-centered">
                      No articles were found in this relay
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          {!nostrUser && <PagePlaceholder page={"nostr-not-connected"} />}
        </main>
      </div>
    </>
  );
}
