import React, { useContext, useEffect, useMemo, useState } from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { Context } from "../../Context/Context";
import LoadingScreen from "../../Components/LoadingScreen";
import PagePlaceholder from "../../Components/PagePlaceholder";
import relaysOnPlatform from "../../Content/Relays";
import { nip19 } from "nostr-tools";
import AddCurationNOSTR from "../../Components/NOSTR/AddCurationNOSTR";
import Date_ from "../../Components/Date_";
import ToDeletePostNOSTR from "../../Components/NOSTR/ToDeletePostNOSTR";
import AddArticlesToCuration from "../../Components/NOSTR/AddArticlesToCuration";
import { Helmet } from "react-helmet";
import { SimplePool } from "nostr-tools";
import { filterRelays, getParsed3000xContent } from "../../Helpers/Encryptions";
import LoadingDots from "../../Components/LoadingDots";
import { useLocation, useNavigate } from "react-router-dom";
import Footer from "../../Components/Footer";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import HomeFN from "../../Components/NOSTR/HomeFN";
import axios from "axios";
var pool = new SimplePool();

const randomColors = Array(100)
  .fill(0, 0, 100)
  .map((item) => {
    let randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
    while (randomColor.toLowerCase() === "#ffffff" || randomColor.length < 7)
      randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
    return randomColor;
  });

export default function NostrMyCurations() {
  const { nostrKeys, nostrUser, nostrUserLoaded } = useContext(Context);
  const { state } = useLocation();
  const navigateTo = useNavigate();
  const [curations, setCurations] = useState([]);
  const [tempCurations, setTempCurations] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date().getTime());
  const [showAddCuration, setShowAddCuration] = useState(
    state?.addCuration ? true : false
  );
  const [importantFN, setImportantFN] = useState(false);
  const [curationToEdit, setCurationToEdit] = useState(false);
  const [postToDelete, setPostToDelete] = useState(false);
  const [showAddArticlesToCuration, setShowAddArticlesToCuration] =
    useState(false);
  const [showRelaysList, setShowRelaysList] = useState(false);
  const [activeRelay, setActiveRelay] = useState("");
  const [relays, setRelays] = useState(relaysOnPlatform);

  const curationsNumber = useMemo(() => {
    return curations.length >= 10 ? curations.length : `0${curations.length}`;
  }, [curations]);

  const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [important] = await Promise.all([
          axios.get(API_BASE_URL + "/api/v1/mb/flashnews/important"),
        ]);

        setImportantFN(important.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCurations([]);
        let tempCur = [];
        let relaysToFetchFrom =
          activeRelay == ""
            ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
            : [activeRelay];
        pool.trackRelays = true;
        var sub = pool.subscribeMany(
          relaysToFetchFrom,
          [{ kinds: [30004, 30005], authors: [nostrKeys.pub] }],
          {
            onevent(curation) {
              let modified_date = new Date(
                curation.created_at * 1000
              ).toISOString();
              let added_date = new Date(
                curation.created_at * 1000
              ).toISOString();
              let published_at = curation.created_at;
              let d = "";
              for (let tag of curation.tags) {
                if (tag[0] === "published_at") {
                  published_at = tag[1];
                  added_date =
                    tag[1].length > 10
                      ? new Date(parseInt(tag[1])).toISOString()
                      : new Date(parseInt(tag[1]) * 1000).toISOString();
                }
                if (tag[0] === "d") d = tag[1];
              }
              let naddr = nip19.naddrEncode({
                pubkey: curation.pubkey,
                identifier: d,
                relays: relaysToFetchFrom,
                kind: curation.kind,
              });
              tempCur.push({ id: curation.id, d });
              setCurations((prev) => {
                let content = getParsed3000xContent(curation.tags);
                let index = prev.findIndex((item) => item.d === d);
                let newP = Array.from(prev);
                if (index === -1)
                  newP = [
                    ...newP,
                    {
                      ...curation,
                      content,
                      modified_date,
                      added_date,
                      published_at,
                      created_at: curation.created_at,
                      d,
                      naddr,
                      kind: curation.kind,
                    },
                  ];
                if (index !== -1) {
                  if (prev[index].created_at < curation.created_at) {
                    newP.splice(index, 1);
                    newP.push({
                      ...curation,
                      content,
                      modified_date,
                      added_date,
                      published_at,
                      created_at: curation.created_at,
                      d,
                      naddr,
                      kind: curation.kind,
                    });
                  }
                }

                newP = newP.sort(
                  (item_1, item_2) => item_2.created_at - item_1.created_at
                );

                return newP;
              });
              setIsLoaded(true);
            },
            oneose() {
              setIsLoading(false);
              setIsLoaded(true);
              setTempCurations(tempCur);
            },
          }
        );
      } catch (err) {
        console.log(err);
      }
    };
    if (nostrKeys && nostrUserLoaded) {
      fetchData();
      return;
    }
    if (!nostrKeys && nostrUserLoaded) {
      setIsLoaded(true);
    }
  }, [nostrKeys, nostrUserLoaded, activeRelay]);

  const initDeletedPost = (state) => {
    if (!state) {
      setPostToDelete(false);
      return;
    }
    let tempArray = Array.from(curations);
    let index = tempArray.findIndex((item) => item.id === postToDelete.id);
    tempArray.splice(index, 1);
    setCurations(tempArray);
    setPostToDelete(false);
  };

  const getDRef = (tags) => {
    let tempArray = [];
    for (let tag of tags) {
      if (tag[0] === "a") {
        tempArray.push(tag[1].split(":")[2]);
      }
    }
    return tempArray;
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
    setIsLoading(true);
    setCurations([]);
    setActiveRelay(source);
  };

  const checkSeenOn = (d) => {
    let filteredCurations = tempCurations.filter(
      (curation) => curation.d === d
    );
    let seenOn = [];
    let seenOnPool = [...pool.seenOn];
    for (let curation of filteredCurations) {
      let postInPool = seenOnPool.find((item) => item[0] === curation.id);
      let relaysPool = postInPool
        ? [...postInPool[1]].map((item) => item.url)
        : [];
      seenOn.push(...relaysPool);
    }
    return [...new Set(seenOn)];
  };

  if (!nostrUserLoaded) return <LoadingScreen />;
  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      {showAddCuration && (
        <AddCurationNOSTR
          exit={() => {
            setShowAddCuration(false);
            setCurationToEdit(false);
          }}
          curation={
            curationToEdit
              ? { ...curationToEdit.curation, kind: curationToEdit.kind }
              : null
          }
          tags={curationToEdit.tags}
          relaysToPublish={
            curationToEdit.relays ||
            (activeRelay == ""
              ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
              : [activeRelay])
          }
        />
      )}
      {postToDelete && (
        <ToDeletePostNOSTR
          exit={() => initDeletedPost(false)}
          exitAndRefresh={() => initDeletedPost(true)}
          post_id={postToDelete.id}
          title={postToDelete.title}
          thumbnail={postToDelete.thumbnail}
          curation={true}
          relayToDeleteFrom={
            activeRelay == ""
              ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
              : [activeRelay]
          }
        />
      )}
      {showAddArticlesToCuration && (
        <AddArticlesToCuration
          curation={curationToEdit.curation}
          tags={curationToEdit.tags}
          relaysToPublish={curationToEdit.relays}
          curationKind={curationToEdit.kind}
          postKind={curationToEdit.kind === 30004 ? 30023 : 34235}
          exit={() => {
            setShowAddArticlesToCuration(false);
            setCurationToEdit(false);
          }}
          exitAndRefresh={() => {
            setShowAddArticlesToCuration(false);
            setCurationToEdit(false);
            setTimestamp(new Date().getTime());
          }}
        />
      )}
      <div>
        <Helmet>
          <title>Yakihonne | My curations</title>
          <meta
            name="description"
            content={
              "Browse your published curations and keep them updated across relays"
            }
          />
          <meta
            property="og:description"
            content={
              "Browse your published curations and keep them updated across relays"
            }
          />

          <meta
            property="og:url"
            content={`https://yakihonne.com/my-curations`}
          />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content="Yakihonne | My curations" />
          <meta property="twitter:title" content="Yakihonne | My curations" />
          <meta
            property="twitter:description"
            content={
              "Browse your published curations and keep them updated across relays"
            }
          />
        </Helmet>
        <div className="fit-container fx-centered">
          <div className="main-container">
            <SidebarNOSTR />
            <main
              className={`main-page-nostr-container`}
              onClick={(e) => {
                e.stopPropagation();
                setShowRelaysList(false);
              }}
            >
              <div className="fx-centered fit-container fx-start-h fx-start-v">
                <div style={{ flex: 1.75 }} className="box-pad-h-m">
                  {nostrUser && (
                    <>
                      {(nostrKeys.sec || (!nostrKeys.sec && nostrKeys.ext)) && (
                        <>
                          {(curations.length > 0 ||
                            (curations.length === 0 && activeRelay)) && (
                            <div
                              className="fit-container fx-scattered box-pad-v-m"
                              style={{ position: "relative", zIndex: "99" }}
                            >
                              <div className="fx-centered fx-start-v fx-col">
                                <h4>{curationsNumber} curations</h4>
                                {activeRelay && (
                                  <p className="orange-c">
                                    Switch to all relays to edit curations
                                  </p>
                                )}
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
                                          color:
                                            activeRelay === ""
                                              ? "var(--c1)"
                                              : "",
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
                                              {isLoading &&
                                              relay === activeRelay ? (
                                                <>Connecting...</>
                                              ) : (
                                                relay.split("wss://")[1]
                                              )}
                                            </button>
                                          );
                                        })}
                                      {(!nostrUser ||
                                        (nostrUser &&
                                          nostrUser.relays.length === 0)) &&
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
                                              {isLoading &&
                                              relay === activeRelay ? (
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
                                <div
                                  className="round-icon round-icon-tooltip"
                                  data-tooltip={"Add curation"}
                                  onClick={() => setShowAddCuration(true)}
                                >
                                  <p className="p-big">&#xFF0B;</p>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="fit-container nostr-article">
                            {curations.length === 0 &&
                              !isLoading &&
                              activeRelay && (
                                <div
                                  className="fit-container fx-centered fx-col"
                                  style={{ height: "40vh" }}
                                >
                                  <h4>No curations were found!</h4>
                                  <p className="gray-c p-centered">
                                    No curations were found in this relay
                                  </p>
                                </div>
                              )}
                            {curations.length === 0 &&
                              !isLoading &&
                              !activeRelay && (
                                <PagePlaceholder
                                  page={"nostr-curations"}
                                  onClick={() => setShowAddCuration(true)}
                                />
                              )}
                            {isLoading && curations.length === 0 && (
                              <div
                                className="fit-container fx-centered fx-col"
                                style={{ height: "50vh" }}
                              >
                                <p>Loading curations</p>
                                <LoadingDots />
                              </div>
                            )}
                            {curations.length > 0 && (
                              <div className="fit-container">
                                <div className="fit-container fx-centered fx-start-h fx-stretch fx-wrap box-pad-v">
                                  {curations.map((curation) => {
                                    let seenOn = checkSeenOn(curation.d);

                                    let numberorArticles = getDRef(
                                      curation.tags
                                    );
                                    numberorArticles =
                                      numberorArticles.length >= 10
                                        ? numberorArticles.length
                                        : `0${numberorArticles.length}`;

                                    return (
                                      <div
                                        key={curation.id}
                                        className="sc-s-18 fx-scattered fx-col pointer fit-container"
                                        style={{
                                          // width: "min(100%, 330px)",
                                          position: "relative",
                                          overflow: "visible",
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigateTo(
                                            `/curations/${curation.naddr}`
                                          );
                                        }}
                                      >
                                        <div
                                          style={{
                                            position: "absolute",
                                            right: "16px",
                                            top: "16px",
                                          }}
                                          className="fx-centered"
                                        >
                                          {!activeRelay && (
                                            <>
                                              <div
                                                style={{
                                                  width: "48px",
                                                  height: "48px",
                                                  backgroundColor:
                                                    "var(--dim-gray)",
                                                  borderRadius:
                                                    "var(--border-r-50)",
                                                }}
                                                className="fx-centered pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setShowAddArticlesToCuration(
                                                    true
                                                  );
                                                  setCurationToEdit({
                                                    curation: curation.content,
                                                    kind: curation.kind,
                                                    tags: curation.tags,
                                                    relays: seenOn,
                                                  });
                                                }}
                                              >
                                                <div className="add-curation-24"></div>
                                              </div>
                                              <div
                                                style={{
                                                  width: "48px",
                                                  height: "48px",
                                                  backgroundColor:
                                                    "var(--dim-gray)",
                                                  borderRadius:
                                                    "var(--border-r-50)",
                                                }}
                                                className="fx-centered pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setShowAddCuration(true);
                                                  setCurationToEdit({
                                                    curation: curation.content,
                                                    tags: curation.tags,
                                                    kind: curation.kind,
                                                    relays: seenOn,
                                                  });
                                                }}
                                              >
                                                <div className="write-24"></div>
                                              </div>
                                            </>
                                          )}

                                          <div
                                            style={{
                                              width: "48px",
                                              height: "48px",
                                              backgroundColor:
                                                "var(--dim-gray)",
                                              borderRadius:
                                                "var(--border-r-50)",
                                            }}
                                            className="fx-centered pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPostToDelete({
                                                id: curation.id,
                                                title: curation.content.title,
                                                thumbnail:
                                                  curation.content.image,
                                              });
                                            }}
                                          >
                                            <div className="trash-24"></div>
                                          </div>
                                        </div>
                                        <div className="fit-container">
                                          <div
                                            className="bg-img cover-bg fit-container"
                                            style={{
                                              backgroundImage: `url(${curation.content.image})`,
                                              height: "150px",
                                              borderTopLeftRadius: "18px",
                                              borderTopRightRadius: "18px",
                                            }}
                                          ></div>
                                          <div className="fit-container box-pad-v-m box-pad-h-m">
                                            <div className="fit-container fx-centered fx-start-v fx-col">
                                              <div className="fit-container fx-scattered">
                                                <div className="fx-centered fx-start-h">
                                                  <div className="fx-start-h fx-centered">
                                                    <p
                                                      className="pointer p-medium gray-c round-icon-tooltip"
                                                      data-tooltip={`created at ${
                                                        curation.added_date.split(
                                                          "T"
                                                        )[0]
                                                      }, edited on ${
                                                        curation.modified_date.split(
                                                          "T"
                                                        )[0]
                                                      }`}
                                                    >
                                                      Last modified{" "}
                                                      <Date_
                                                        toConvert={
                                                          curation.modified_date
                                                        }
                                                      />
                                                    </p>
                                                  </div>
                                                  <p className="gray-c p-medium">
                                                    &#9679;
                                                  </p>
                                                  <div className="posts"></div>
                                                  <p className="gray-c p-medium">
                                                    {numberorArticles} arts.{" "}
                                                  </p>
                                                </div>

                                                {curation.kind === 30004 && (
                                                  <div className="sticker sticker-normal sticker-green">
                                                    Article
                                                  </div>
                                                )}
                                                {curation.kind === 30005 && (
                                                  <div className="sticker sticker-normal sticker-orange">
                                                    Video
                                                  </div>
                                                )}
                                              </div>

                                              <p className="p-maj">
                                                {curation.content.title}
                                              </p>
                                              <p className="p-two-lines gray-c">
                                                {curation.content.description}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="fit-container">
                                          <hr />
                                          <div className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-m pointer">
                                            <p className="gray-c p-medium">
                                              Posted on
                                            </p>
                                            <div className="fx-centered">
                                              {seenOn.map((relay, index) => {
                                                return (
                                                  <div
                                                    style={{
                                                      backgroundColor:
                                                        randomColors[index],
                                                      minWidth: "10px",
                                                      aspectRatio: "1/1",
                                                      borderRadius:
                                                        "var(--border-r-50)",
                                                    }}
                                                    className="pointer round-icon-tooltip"
                                                    data-tooltip={relay}
                                                    key={relay}
                                                  ></div>
                                                );
                                              })}
                                              {isLoading && <LoadingDots />}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <div
                                    style={{ width: "min(100%, 330px)" }}
                                  ></div>
                                  <div
                                    style={{ width: "min(100%, 330px)" }}
                                  ></div>
                                  <div
                                    style={{ width: "min(100%, 330px)" }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {!nostrKeys.sec && !nostrKeys.ext && (
                        <PagePlaceholder page={"nostr-unauthorized"} />
                      )}
                    </>
                  )}
                  {!nostrUser && (
                    <PagePlaceholder page={"nostr-not-connected"} />
                  )}
                </div>
                <div
                  className=" fx-centered fx-col fx-start-v extras-homepage"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: "100",
                    flex: 1,
                  }}
                >
                  <div className="sticky fit-container">
                    <SearchbarNOSTR />
                  </div>
                  <div
                    className=" fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v box-marg-s"
                    style={{
                      backgroundColor: "var(--c1-side)",
                      rowGap: "24px",
                      border: "none",
                    }}
                  >
                    <h4>Important Flash News</h4>
                    <HomeFN flashnews={importantFN} />
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
