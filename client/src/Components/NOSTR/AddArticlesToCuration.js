import React, { useEffect, useState, useContext } from "react";
import LoadingScreen from "../LoadingScreen";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import Date_ from "../Date_";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Relay, SimplePool, nip19 } from "nostr-tools";
import { filterRelays } from "../../Helpers/Encryptions";
import PublishRelaysPicker from "./PublishRelaysPicker";
import { getImagePlaceholder } from "../../Content/NostrPPPlaceholder";
const pool = new SimplePool();

export default function AddArticlesToCuration({
  curation,
  tags,
  relaysToPublish = [],
  exit,
  curationKind = 30004,
  postKind = 30023,
}) {
  const { title, image, description } = curation;
  const {
    nostrUser,
    nostrKeys,
    nostrUserLoaded,
    setToast,
    setToPublish,
    isPublishing,
  } = useContext(Context);
  const [posts, setPosts] = useState([]);
  const [NostrPosts, setNostrPosts] = useState([]);
  const [searchedPostsByNaddr, setSearchedPostByNaddr] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadedTwo, setIsLoadedTwo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRelay, setActiveRelay] = useState(relaysOnPlatform[0]);
  const [searchedPost, setSearchedPost] = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [contentFrom, setContentFrom] = useState("relays");
  const [sub, setSub] = useState(null);
  const [initScreen, setInitScreen] = useState(true);
  const [lastEventTime, setLastEventTime] = useState(undefined);
  const [showRelaysList, setShowRelaysList] = useState(false);
  const [showRelaysPicker, setShowRelaysPicker] = useState(false);
  const label = postKind === 30023 ? "article" : "video";

  useEffect(() => {
    getPostsInNOSTR();
  }, [activeRelay, contentFrom, lastEventTime]);

  useEffect(() => {
    getPostsInCuration();
  }, []);

  const getPostsInNOSTR = async () => {
    if (contentFrom === "relays") {
      const relay = await Relay.connect(activeRelay);
      let sub = relay.subscribe(
        [{ kinds: [postKind], limit: 10, until: lastEventTime }],
        {
          onevent(event) {
            onEvent(event);
          },
          oneose() {
            setIsLoaded(true);
            setIsLoading(false);
          },
        }
      );

      setSub(sub);
    } else {
      let sub = pool.subscribeMany(
        nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
        [
          {
            kinds: [postKind],
            authors: [nostrUser.pubkey],
            limit: 10,
            until: lastEventTime,
          },
        ],
        {
          onevent(event) {
            onEvent(event);
          },
          oneose() {
            setIsLoaded(true);
            setIsLoading(false);
          },
        }
      );
      setSub(sub);
    }
  };
  const onEvent = (event) => {
    let author_pubkey = event.pubkey;
    let thumbnail = "";
    let title = "";
    let d = "";
    let added_date = new Date(event.created_at * 1000).toDateString();
    for (let tag of event.tags) {
      if (tag[0] === "image" || tag[0] === "thumb") thumbnail = tag[1];
      if (tag[0] === "title") title = tag[1];
      if (tag[0] === "d") d = tag[1];
    }

    setNostrPosts((_posts) => {
      let newP = [
        ..._posts,
        {
          id: event.id,
          thumbnail: thumbnail || getImagePlaceholder(),
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
  };
  const getPostsInCuration = async () => {
    let dRefs = getDRef();
    let articlesOnCuration =
      dRefs.length > 0
        ? await Promise.all(
            dRefs.map((dref) => {
              let ev = pool.get(relaysOnPlatform, {
                kinds: [postKind],
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
        if (tag[0] === "image" || tag[0] === "thumb") thumbnail = tag[1];
        if (tag[0] === "title") title = tag[1];
        if (tag[0] === "d") d = tag[1];
      }
      return {
        id: event.id,
        thumbnail: thumbnail || getImagePlaceholder(),
        author_pubkey,
        title,
        d,
        added_date,
      };
    });

    setPosts(sortPostsOnCuration(postsOnCuration));
    setIsLoadedTwo(true);
  };

  const saveUpdate = async (selectedRelays) => {
    setIsLoading(true);
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    let tempTags = [
      [
        "client",
        "Yakihonne",
        "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
      ],
    ];
    let is_published_at = tags.find((item) => item[0] === "published_at");
    let published_at = is_published_at
      ? is_published_at[1]
      : `${Math.floor(Date.now() / 1000)}`;
    tempTags.push(["d", tags.find((item) => item[0] === "d")[1]]);

    tempTags.push(["title", tags.find((item) => item[0] === "title")[1]]);
    tempTags.push(["published_at", published_at]);
    tempTags.push([
      "description",
      tags.find((item) => item[0] === "description")[1],
    ]);
    tempTags.push(["image", tags.find((item) => item[0] === "image")[1]]);

    for (let post of posts) {
      tempTags.push(["a", `${postKind}:${post.author_pubkey}:${post.d}`, ""]);
    }

    setToPublish({
      nostrKeys: nostrKeys,
      kind: curationKind,
      content: "",
      tags: tempTags,
      allRelays: selectedRelays,
    });
    exit();
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

  const switchContentSource = (source) => {
    setNostrPosts([]);
    setLastEventTime(undefined);
    setSearchRes([]);
    setSearchedPost("");
    if (contentFrom === source) return;
    setContentFrom(source);
  };

  const confirmPublishing = (relays) => {
    saveUpdate(relays);
    setShowRelaysPicker(false);
  };

  const handleSearchByNaddr = async (e) => {
    let input = e.target.value;
    if (!input) return;
    try {
      let parsedData = nip19.decode(input);
      setIsLoading(true);
      let post = await pool.get(
        nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
        {
          kinds: [postKind],
          authors: [parsedData.data.pubkey],
          "#d": [parsedData.data.identifier],
        }
      );

      if (post) {
        let author_pubkey = post.pubkey;
        let thumbnail = "";
        let title = "";
        let d = "";
        let added_date = new Date(post.created_at * 1000).toDateString();
        for (let tag of post.tags) {
          if (tag[0] === "image" || tag[0] === "thumb") thumbnail = tag[1];
          if (tag[0] === "title") title = tag[1];
          if (tag[0] === "d") d = tag[1];
        }

        setSearchedPostByNaddr((prev) => [
          {
            id: post.id,
            thumbnail: thumbnail || getImagePlaceholder(),
            author_pubkey,
            title,
            d,
            added_date,
            created_at: post.created_at,
          },
          ...prev,
        ]);
      } else {
        setToast({
          type: 2,
          desc: `Could not found the ${label}.`,
        });
      }
      setIsLoading(false);
    } catch (err) {
      setToast({
        type: 2,
        desc: "Invalid Naddr",
      });
    }
  };

  if (!nostrUserLoaded) return <LoadingScreen />;
  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      {showRelaysPicker && (
        <PublishRelaysPicker
          confirmPublishing={confirmPublishing}
          exit={() => setShowRelaysPicker(false)}
          button={`Add ${label}s`}
        />
      )}
      <section
        className="fixed-container fx-centered fx-col fx-start-h"
        style={{ overflow: "scroll" }}
      >
        <div
          className="box-pad-h box-pad-v fx-centered fx-col  art-t-cur-container"
          style={{ width: "min(100%, 800px)", height: "calc(100vh - 10rem)" }}
        >
          <div className="fit-container fx-start-h fx-centered">
            <button
              className="btn btn-gst-nc fx-centered"
              style={{ scale: ".8" }}
              onClick={exit}
            >
              <div className="arrow" style={{ rotate: "90deg" }}></div>
              Back
            </button>
          </div>
          {!initScreen && (
            <>
              <div
                className="sc-s "
                style={{
                  width: "min(100%, 800px)",
                  height: "90%",
                  overflow: "hidden",
                  backgroundColor: "var(--white)",
                }}
              >
                <div className="fit-container fx-centered box-pad-h-m box-pad-v-s fx-start-h">
                  <div
                    className="bg-img cover-bg sc-s"
                    style={{
                      backgroundImage: `url(${image})`,
                      minWidth: "100px",
                      minHeight: "100px",
                      backgroundColor: "var(--dim-gray)",
                    }}
                  ></div>
                  <div className=" box-pad-v box-pad-h">
                    <div className="fit-container fx-centered fx-start-v fx-col">
                      <h4 className="p-maj">{title}</h4>
                      <p className="p-three-lines p-medium">{description}</p>
                    </div>
                  </div>
                </div>
                <hr />
                <div
                  style={{
                    height: "82%",
                    overflow: "scroll",
                    overflowX: "hidden",
                  }}
                  className="posts-container fx-centered fx-start-v"
                >
                  {posts.length === 0 && (
                    <div
                      className="fit-container fx-centered fx-col"
                      style={{ height: "25vh", width: "min(100%,500px)" }}
                    >
                      <p className="gray-c italic-txt">
                        No {label} belong to this curation
                      </p>
                    </div>
                  )}
                  {posts.length > 0 && (
                    <div
                      className={`fx-centered fx-wrap fx-start-v box-pad-h box-pad-v fit-container`}
                    >
                      <p className="gray-c">{label}s</p>
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
                                              borderRadius:
                                                "var(--border-r-50)",
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
                                            onClick={() =>
                                              handleAddArticle(item)
                                            }
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
              <div className="fx-centered fit-container box-pad-v-m">
                <button
                  className="btn btn-normal fx-centered"
                  onClick={() => setInitScreen(true)}
                >
                  <div
                    className="arrow"
                    style={{ filter: "invert()", transform: "rotate(90deg)" }}
                  ></div>
                  Pick {label}s
                </button>
                <button
                  className="btn btn-normal"
                  onClick={() =>
                    relaysToPublish.length === 0
                      ? setShowRelaysPicker(true)
                      : saveUpdate(relaysToPublish)
                  }
                >
                  {isLoading ? <LoadingDots /> : "Next"}
                </button>
              </div>
            </>
          )}
          {initScreen && (
            <>
              <div
                className="box-pad-h sc-s"
                style={{
                  width: "min(100%, 800px)",
                  height: "100%",
                  overflow: "hidden",
                  backgroundColor: "var(--white)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRelaysList(false);
                }}
              >
                <div
                  className="fx-scattered fit-container"
                  style={{ paddingTop: "1rem" }}
                >
                  <div className="fit-container fx-centered fx-start-h">
                    <button
                      className={`btn btn-small fx-centered fx-shrink ${
                        contentFrom === "relays"
                          ? "btn-normal-gray"
                          : "btn-gst-nc"
                      }`}
                      onClick={() => switchContentSource("relays")}
                    >
                      All relays
                    </button>
                    <button
                      className={`btn btn-small fx-centered fx-shrink ${
                        contentFrom === "user"
                          ? "btn-normal-gray"
                          : "btn-gst-nc"
                      }`}
                      onClick={() => switchContentSource("user")}
                    >
                      My {label}s
                    </button>
                    <button
                      className={`btn btn-small fx-centered fx-shrink ${
                        contentFrom === "search"
                          ? "btn-normal-gray"
                          : "btn-gst-nc"
                      }`}
                      onClick={() => switchContentSource("search")}
                    >
                      Search by Naddr
                    </button>
                  </div>
                  <div className="fx-centered fx-start-h nostr-uer-relays">
                    {contentFrom === "relays" && (
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
                                    onClick={(e) => {
                                      if (sub) {
                                        sub.unsub();
                                        setSub(null);
                                      }
                                      setActiveRelay(relay);
                                      setNostrPosts([]);
                                      setSearchRes([]);
                                      setSearchedPost("");
                                      setLastEventTime(undefined);
                                      setShowRelaysList(!showRelaysList);
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
                              relaysOnPlatform.map((relay) => {
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
                                    onClick={(e) => {
                                      if (sub) {
                                        sub.unsub();
                                        setSub(null);
                                      }
                                      setActiveRelay(relay);
                                      setNostrPosts([]);
                                      setSearchRes([]);
                                      setSearchedPost("");
                                      setLastEventTime(undefined);
                                      setShowRelaysList(!showRelaysList);
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
                    )}
                  </div>
                </div>
                {contentFrom !== "search" && (
                  <>
                    <div className="fit-container box-pad-v-s">
                      <input
                        type="search"
                        value={searchedPost}
                        className="if ifs-full"
                        placeholder={`Search ${label} by title (in ${NostrPosts.length} results)`}
                        onChange={handleSearchPostInNOSTR}
                        style={{ backgroundColor: "var(--white)" }}
                      />
                    </div>
                    {searchedPost ? (
                      <>
                        {searchRes.length === 0 && (
                          <div className="fit-container box-marg-full fx-centered">
                            <p className="gray-c italic-txt">
                              No {label} was found
                            </p>
                          </div>
                        )}
                        {searchRes.length > 0 && (
                          <div
                            className={`fx-centered fx-start-h fx-col posts-cards ${
                              isLoading ? "flash" : ""
                            }`}
                            style={{
                              overflow: "scroll",
                              overflowX: "hidden",
                            }}
                          >
                            {searchRes.map((item) => {
                              let status = checkIfBelongs(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className="fx-scattered sc-s fx-shrink fit-container box-pad-h-s box-pad-v-s pointer"
                                  onClick={() => handleAddArticle(item)}
                                  style={{
                                    borderColor: status
                                      ? "var(--green-main)"
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
                              height: "75%",
                              overflow: "scroll",
                              overflowX: "hidden",
                              marginBottom: "1rem",
                            }}
                          >
                            {NostrPosts.map((item) => {
                              let status = checkIfBelongs(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className="fx-scattered sc-s fx-shrink fit-container box-pad-h-s box-pad-v-s pointer"
                                  onClick={() => handleAddArticle(item)}
                                  style={{
                                    borderColor: status
                                      ? "var(--green-main)"
                                      : "",
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
                        {isLoading && (
                          <div className="fx-centered fit-container">
                            <div className="gray-c">
                              Loading
                              <LoadingDots />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                {contentFrom === "search" && (
                  <>
                    <div className="fit-container box-pad-v-s">
                      <input
                        type="search"
                        className="if ifs-full"
                        placeholder={`Search ${label} by naddr..`}
                        onChange={handleSearchByNaddr}
                        style={{ backgroundColor: "var(--white)" }}
                      />
                    </div>
                    <div
                      className={`fit-container fx-centered fx-start-h fx-col ${
                        isLoading ? "flash" : ""
                      }`}
                      style={{
                        overflow: "scroll",
                        overflowX: "hidden",
                      }}
                    >
                      {searchedPostsByNaddr.map((item) => {
                        let status = checkIfBelongs(item.id);
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
                  </>
                )}
              </div>
              <div className="fx-centered box-pad-v-m">
                {!isLoading && (
                  <button
                    className="btn btn-gst"
                    onClick={() => {
                      setLastEventTime(
                        NostrPosts[NostrPosts.length - 1].created_at
                      );
                      setIsLoading(true);
                    }}
                  >
                    Load more data
                  </button>
                )}
                <button
                  className="btn btn-normal fx-centered"
                  onClick={() => setInitScreen(false)}
                >
                  Review list
                  <div
                    className="arrow"
                    style={{ filter: "invert()", rotate: "-90deg" }}
                  ></div>
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
