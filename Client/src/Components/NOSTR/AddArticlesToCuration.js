import React, { useEffect, useState, useContext } from "react";
import LoadingScreen from "../LoadingScreen";
import { relayInit } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import Date_ from "../Date_";
import { publishPost } from "../../Helpers/NostrPublisher";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { SimplePool } from "nostr-tools";
const pool = new SimplePool();

export default function AddArticlesToCuration({
  curation,
  tags,
  exit,
  exitAndRefresh,
}) {
  const { title, excerpt, thumbnail } = curation;
  const { nostrUser, nostrKeys, nostrUserLoaded, setToast } =
    useContext(Context);
  const [posts, setPosts] = useState([]);
  const [NostrPosts, setNostrPosts] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadedTwo, setIsLoadedTwo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRelay, setActiveRelay] = useState(relaysOnPlatform[0]);
  const [searchedPost, setSearchedPost] = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [contentFrom, setContentFrom] = useState("relays");
  const [sub, setSub] = useState(null);

  useEffect(() => {
    getPostsInNOSTR();
  }, [activeRelay, contentFrom]);
  useEffect(() => {
    if (sub) getArts();
  }, [sub]);
  useEffect(() => {
    getPostsInCuration();
  }, []);

  const getPostsInNOSTR = async () => {
    setIsLoading(true);
    setNostrPosts([]);

    if (contentFrom === "relays") {
      const relay = relayInit(activeRelay);
      await relay.connect();
      setSub(relay.sub([{ kinds: [30023], limit: 1000000 }]));
    } else {
      setSub(
        pool.sub(relaysOnPlatform, [
          {
            kinds: [30023],
            authors: [nostrUser.pubkey],
            limit: 100000,
          },
        ])
      );
    }
  };

  const getArts = () => {
    if (!sub) return;
    sub.on("event", (event) => {
      let author_pubkey = event.pubkey;
      let thumbnail = "";
      let title = "";
      let d = "";
      let added_date = new Date(event.created_at * 1000).toDateString();
      for (let tag of event.tags) {
        if (tag[0] === "image") thumbnail = tag[1];
        if (tag[0] === "title") title = tag[1];
        if (tag[0] === "d") d = tag[1];
      }

      setNostrPosts((_posts) => {
        let newP = [
          ..._posts,
          {
            id: event.id,
            thumbnail,
            author_pubkey,
            title,
            d,
            added_date,
            created_at: event.created_at,
          },
        ];
        newP.sort((el_1, el_2) => el_2.created_at - el_1.created_at);
        return newP;
      });

      setIsLoaded(true);
      setIsLoading(false);
    });
    sub.on("eose", () => {
      setIsLoaded(true);
      setIsLoading(false);
    });
  };

  const getPostsInCuration = async () => {
    const relay = relayInit(relaysOnPlatform[1]);
    await relay.connect();

    let dRefs = getDRef();
    let articlesOnCuration =
      dRefs.length > 0
        ? await Promise.all(
            dRefs.map((dref) => {
              let ev = pool.get(relaysOnPlatform, {
                kinds: [30023],
                "#d": [dref],
              });
              return ev;
            })
          )
        : [];

    let postsOnCuration = articlesOnCuration.map((event) => {
      let author_pubkey = event.pubkey;
      let thumbnail = "";
      let title = "";
      let d = "";
      let added_date = new Date(event.created_at * 1000).toDateString();
      for (let tag of event.tags) {
        if (tag[0] === "image") thumbnail = tag[1];
        if (tag[0] === "title") title = tag[1];
        if (tag[0] === "d") d = tag[1];
      }
      return {
        id: event.id,
        thumbnail,
        author_pubkey,
        title,
        d,
        added_date,
      };
    });

    setPosts(sortPostsOnCuration(postsOnCuration));
    setIsLoadedTwo(true);
  };

  const saveUpdate = async () => {
    setIsLoading(true);
    let tempTags = [];
    tempTags.push(["d", tags.find((item) => item[0] === "d")[1]]);
    tempTags.push(["c", "curation"]);
    tempTags.push(["title", tags.find((item) => item[0] === "title")[1]]);
    tempTags.push(["excerpt", tags.find((item) => item[0] === "excerpt")[1]]);
    tempTags.push([
      "thumbnail",
      tags.find((item) => item[0] === "thumbnail")[1],
    ]);

    for (let post of posts) {
      tempTags.push(["a", `30023:${post.author_pubkey}:${post.d}`, ""]);
    }
    const publish = await publishPost(nostrKeys, 30001, "", tempTags, [
      relaysOnPlatform[0],
    ]);
    if (!publish) {
      setToast({
        type: 2,
        desc: "Publishing was cancelled!",
      });
      setIsLoading(false);
      return;
    }
    if (publish.find((item) => item.status)) {
      setToast({
        type: 1,
        desc: "Your curation has been successfully posted on Nostr.",
      });
      setIsLoading(false);
      exitAndRefresh();
      return;
    }
    setToast({
      type: 2,
      desc: "An error has occurred",
    });
    setIsLoading(false);
  };

  const handleAddArticle = (post) => {
    let tempArray = Array.from(posts);
    let index = tempArray.findIndex((item) => item.id === post.id);
    if (index === -1) {
      setPosts([...posts, post]);
      return;
    }
    tempArray.splice(index, 1);
    setPosts(tempArray);
  };

  const checkIfBelongs = (post_id) => {
    return posts.find((post) => post.id === post_id) ? true : false;
  };

  const getDRef = () => {
    let tempArray = [];
    for (let tag of tags) {
      if (tag[0] === "a") {
        tempArray.push(tag[1].split(":").splice(2, 100).join(":"));
      }
    }
    return tempArray;
  };

  const handleDragEnd = (res) => {
    if (!res.destination) return;
    let tempArr = Array.from(posts);
    let [reorderedArr] = tempArr.splice(res.source.index, 1);
    tempArr.splice(res.destination.index, 0, reorderedArr);

    setPosts(tempArr);
  };

  const sortPostsOnCuration = (toSort) => {
    let original = getDRef();
    let tempArray = [];
    for (let post of original) {
      tempArray.push(toSort.find((item) => item.d === post));
    }
    return tempArray;
  };

  const handleSearchPostInNOSTR = (e) => {
    let search = e.target.value;
    setSearchedPost(search);
    if (!search) {
      setSearchRes([]);
      return;
    }
    let tempArray = Array.from(
      NostrPosts.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      )
    );
    setSearchRes(tempArray);
  };

  const switchContentSource = () => {
    // if (!nostrUser || !isLoaded) return;
    // if (isLoading) return;
    if (sub) {
      sub.unsub();
    }
    setIsLoading(true);
    setNostrPosts([]);
    setSearchRes([]);
    setSearchedPost("");
    if (contentFrom !== "relays") {
      setContentFrom("relays");
      return;
    }
    setContentFrom("user");
  };

  if (!nostrUserLoaded) return <LoadingScreen />;
  if (!isLoaded) return <LoadingScreen />;
  return (
    <section
      className="fixed-container fx-centered fx-start-v"
      style={{ overflow: "scroll" }}
    >
      <div
        className="box-pad-h box-pad-v fx-centered  art-t-cur-container"
        style={{ width: "min(100%, 1000px)" }}
      >
        <section className="box-pad-v" style={{ flex: "1 1 600px",opacity: "1", animation: "none" }}>
          <div className="fit-container fx-centered fx-col box-marg-s scrolldown-mb">
            <p className="p-medium">Scroll down here</p>
            <div className="arrow"></div>
          </div>
          <div
            className="fit-container sc-s fx-scattered fx-col"
            style={{ height: "100%" }}
          >
            <div className="fit-container">
              <div className="fit-container desc">
                <div
                  className="bg-img cover-bg fit-container"
                  style={{
                    backgroundImage: `url(${thumbnail})`,
                    height: "200px",
                  }}
                ></div>
                <div className="fit-container box-pad-v box-pad-h">
                  <div className="fit-container fx-centered fx-start-v fx-col">
                    <h4 className="p-maj">{title}</h4>
                    <p className="p-three-lines">{excerpt}</p>
                  </div>
                </div>
              </div>
              <hr />
              <div
                style={{
                  overflow: "scroll",
                  overflowX: "hidden",
                }}
                className="posts-container"
              >
                {posts.length === 0 && (
                  <div
                    className="fit-container fx-centered fx-col"
                    style={{ height: "25vh", width: "min(100%,500px)" }}
                  >
                    <p className="gray-c italic-txt">
                      No articles belong to this curation
                    </p>
                  </div>
                )}
                {posts.length > 0 && (
                  <div
                    className={`fx-centered fx-wrap fx-start-v box-pad-h box-pad-v`}
                    // style={{ height: "900px" }}
                  >
                    <p className="gray-c">Articles</p>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="set-carrousel">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            style={{
                              borderRadius: "var(--border-r-18)",
                              transition: ".2s ease-in-out",
                              backgroundColor: snapshot.isDraggingOver
                                ? "var(--very-dim-gray)"
                                : "",
                              height: "100%",
                              ...provided.droppableProps.style,
                            }}
                            className="box-pad-v-m fit-container fx-centered fx-start-h fx-start-v fx-col"
                          >
                            {posts.map((item, index) => {
                              // if (item.thumbnail)
                              return (
                                <Draggable
                                  key={item.id}
                                  draggableId={`${item.id}`}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      ref={provided.innerRef}
                                      style={{
                                        borderRadius: "var(--border-r-18)",
                                        boxShadow: snapshot.isDragging
                                          ? "14px 12px 105px -41px rgba(0, 0, 0, 0.55)"
                                          : "",
                                        ...provided.draggableProps.style,
                                      }}
                                      className="fit-container"
                                    >
                                      {/* <div
                                          key={item.id}
                                          className="fx-scattered sc-s fx-shrink fit-container box-pad-h-s box-pad-v-s pointer"
                                        > */}
                                      <div
                                        className="sc-s fx-scattered box-pad-v-s box-pad-h-s fit-container"
                                        style={{
                                          borderColor: snapshot.isDragging
                                            ? "var(--c1)"
                                            : "",
                                        }}
                                      >
                                        <div
                                          className="bg-img cover-bg"
                                          style={{
                                            minWidth: "50px",
                                            minHeight: "50px",
                                            backgroundImage: `url(${item.thumbnail})`,
                                            borderRadius: "var(--border-r-50)",
                                          }}
                                        ></div>
                                        <div
                                          className="fit-container fx-centered fx-start-h fx-start-v fx-col"
                                          style={{ rowGap: 0 }}
                                        >
                                          <p className="gray-c p-medium">
                                            On{" "}
                                            <Date_
                                              toConvert={item.added_date}
                                            />
                                          </p>
                                          <p className="p-one-line">
                                            {item.title}
                                          </p>
                                        </div>
                                        <div
                                          className="box-pad-h-m"
                                          onClick={() => handleAddArticle(item)}
                                        >
                                          <div className="trash"></div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                )}
              </div>
            </div>
            <div className="fit-container">
              <hr />
              <div className="box-pad-h-m box-pad-v-m fit-container fx-centered">
                <button className="btn btn-gst fx" onClick={exit}>
                  {isLoading ? <LoadingDots /> : "cancel"}
                </button>
                <button className="btn btn-normal fx" onClick={saveUpdate}>
                  {isLoading ? <LoadingDots /> : "update"}
                </button>
              </div>
            </div>
          </div>
        </section>
        <section
          className="box-pad-h sc-s box-pad-v"
          style={{
            flex: "1 1 600px",
            overflow: "hidden",
            backgroundColor: "var(--white)",
          }}
        >
          {/* <h3>All articles</h3> */}
          <div className="fx-scattered fit-container">
            <div
              className="fx-scattered sc-s pointer profile-switcher"
              style={{
                position: "relative",
                width: "180px",
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
                  transform: contentFrom !== "relays" ? "translateX(100%)" : "",
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
                All relays
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
                My articles
              </p>
            </div>
            <div
              className="fx-centered fx-start-h nostr-uer-relays"
              // style={{
              //   height: "100px",
              //   overflow: "scroll",
              //   overflowY: "hidden",
              // }}
            >
              {contentFrom === "relays" && (
                <select
                  className="if select"
                  onChange={(e) => {
                    if (sub) {
                      sub.unsub();
                      setSub(null);
                    }
                    setActiveRelay(e.target.value);
                    setNostrPosts([]);
                    setSearchRes([]);
                    setSearchedPost("");
                  }}
                >
                  {nostrUser &&
                    nostrUser.relays.length > 0 &&
                    nostrUser.relays.map((relay) => {
                      return (
                        <option
                          key={relay}
                          className="box-pad-h box-pad-v-m sc-s fx-shrink pointer fx-centered"
                          style={{
                            width: "max-content",
                            filter: activeRelay === relay ? "invert()" : "",
                            transition: ".4s ease-in-out",
                          }}
                          value={relay}
                          // onClick={() => {
                          //   setActiveRelay(relay);
                          //   setNostrPosts([]);
                          //   setSearchedPost("");
                          //   setSearchRes([]);
                          // }}
                        >
                          {isLoading && relay === activeRelay ? (
                            <>
                              <span className="gray-c">Connecting</span>
                              <LoadingDots />{" "}
                            </>
                          ) : (
                            relay.split("wss://")[1]
                          )}
                        </option>
                      );
                    })}
                  {(!nostrUser ||
                    (nostrUser && nostrUser.relays.length === 0)) &&
                    relaysOnPlatform.map((relay) => {
                      return (
                        <option
                          key={relay}
                          className="box-pad-h box-pad-v-m sc-s fx-shrink pointer fx-centered"
                          style={{
                            width: "max-content",
                            filter: activeRelay === relay ? "invert()" : "",
                            transition: ".4s ease-in-out",
                          }}
                          value={relay}
                          // onClick={() => {
                          //   setActiveRelay(relay);
                          //   setNostrPosts([]);
                          //   setSearchedPost("");
                          //   searchedPost([]);
                          // }}
                        >
                          {isLoading && relay === activeRelay ? (
                            <>
                              <span className="gray-c">Connecting</span>
                              <LoadingDots />{" "}
                            </>
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
          <div className="fit-container box-pad-v">
            <input
              type="search"
              value={searchedPost}
              className="if ifs-full"
              placeholder="Search article by title..."
              onChange={handleSearchPostInNOSTR}
              style={{ backgroundColor: "var(--white)" }}
            />
          </div>
          {searchedPost ? (
            <>
              {searchRes.length === 0 && (
                <div className="fit-container box-marg-full fx-centered">
                  <p className="gray-c italic-txt">No article was found</p>
                </div>
              )}
              {searchRes.length > 0 && (
                <div
                  className={`fx-centered fx-start-h fx-col posts-cards ${
                    isLoading ? "flash" : ""
                  }`}
                  style={{
                    height: "70%",
                    overflow: "scroll",
                    overflowX: "hidden",
                  }}
                >
                  {searchRes.map((item) => {
                    let status = checkIfBelongs(item.id);
                    // if (item.thumbnail)
                    return (
                      <div
                        key={item.id}
                        className="fx-scattered sc-s fx-shrink fit-container box-pad-h-s box-pad-v-s pointer"
                        onClick={() => handleAddArticle(item)}
                        style={{
                          borderColor: status ? "var(--green-main)" : "",
                        }}
                      >
                        <div
                          className="bg-img cover-bg"
                          style={{
                            minWidth: "50px",
                            minHeight: "50px",
                            backgroundImage: `url(${item.thumbnail})`,
                            borderRadius: "var(--border-r-50)",
                          }}
                        ></div>
                        <div
                          className="fit-container fx-centered fx-start-h fx-start-v fx-col"
                          style={{ rowGap: 0 }}
                        >
                          <p className="gray-c p-medium">
                            On <Date_ toConvert={item.added_date} />
                          </p>
                          <p className="p-one-line fit-container">
                            {item.title}
                          </p>
                        </div>
                        {status ? (
                          <div className="box-pad-h-m">
                            <p className="green-c p-big">&#10003;</p>
                          </div>
                        ) : (
                          <div className="box-pad-h-m">
                            <p className="p-big">&#43;</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {NostrPosts.length > 0 && (
                <div
                  className={`fx-centered fx-start-h fx-col ${
                    isLoading ? "flash" : ""
                  }`}
                  style={{
                    height: "70%",
                    overflow: "scroll",
                    overflowX: "hidden",
                  }}
                >
                  {NostrPosts.map((item) => {
                    let status = checkIfBelongs(item.id);
                    // if (item.thumbnail)
                    return (
                      <div
                        key={item.id}
                        className="fx-scattered sc-s fx-shrink fit-container box-pad-h-s box-pad-v-s pointer"
                        onClick={() => handleAddArticle(item)}
                        style={{
                          borderColor: status ? "var(--green-main)" : "",
                        }}
                      >
                        <div
                          className="bg-img cover-bg"
                          style={{
                            minWidth: "50px",
                            minHeight: "50px",
                            backgroundImage: `url(${item.thumbnail})`,
                            backgroundColor: "vaR(--dim-gray)",
                            borderRadius: "var(--border-r-50)",
                          }}
                        ></div>
                        <div
                          className="fit-container fx-centered fx-start-h fx-start-v fx-col"
                          style={{ rowGap: 0 }}
                        >
                          <p className="gray-c p-medium">
                            On <Date_ toConvert={item.added_date} />
                          </p>
                          <p className="p-one-line">{item.title}</p>
                        </div>
                        {status ? (
                          <div className="box-pad-h-m">
                            <p className="green-c p-big">&#10003;</p>
                          </div>
                        ) : (
                          <div className="box-pad-h-m">
                            <p className="p-big">&#43;</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </section>
  );
}
