import React, { useContext, useEffect, useState } from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import relaysOnPlatform from "../../Content/Relays";
import { nip19 } from "nostr-tools";
import Date_ from "../../Components/Date_";
import { Link } from "react-router-dom";
import {
  filterRelays,
  getBech32,
  getEmptyNostrUser,
  getParsed3000xContent,
} from "../../Helpers/Encryptions";
import { SimplePool } from "nostr-tools";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import { Helmet } from "react-helmet";
import ArrowUp from "../../Components/ArrowUp";
import { Context } from "../../Context/Context";
import LoadingDots from "../../Components/LoadingDots";
import Footer from "../../Components/Footer";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";

const pool = new SimplePool();

export default function NostrCurations() {
  const { addNostrAuthors, nostrUser, mutedList } = useContext(Context);
  const [relays, setRelays] = useState(relaysOnPlatform);
  const [showRelaysList, setShowRelaysList] = useState(false);
  const [activeRelay, setActiveRelay] = useState("");
  const [curations, setCurations] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastEventTime, setLastEventTime] = useState(undefined);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        let curationsAuthors = [];
        let relaysToFetchFrom =
          (activeRelay && [activeRelay]) ||
          (!nostrUser
            ? relaysOnPlatform
            : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])]);
        let sub = pool.subscribeMany(
          relaysToFetchFrom,
          [{ kinds: [30004, 30005], limit: 50, until: lastEventTime }],
          {
            onevent(curation) {
              if (![...mutedList].includes(curation.pubkey)) {
                curationsAuthors.push(curation.pubkey);
                let content = getParsed3000xContent(curation.tags);
                let identifier = curation.tags.find((tag) => tag[0] === "d")[1];
                let naddr = nip19.naddrEncode({
                  identifier: curation.tags.find((tag) => tag[0] === "d")[1],
                  pubkey: curation.pubkey,
                  kind: curation.kind,
                });
                delete content.published_at;
                let modified_date = new Date(
                  curation.created_at * 1000
                ).toISOString();
                let added_date = new Date(
                  curation.created_at * 1000
                ).toISOString();
                let published_at = curation.created_at;
                for (let tag of curation.tags) {
                  if (tag[0] === "published_at") {
                    published_at = tag[1] || curation.created_at;
                    added_date =
                      tag[1].length > 10
                        ? new Date(parseInt(tag[1])).toISOString()
                        : new Date(parseInt(tag[1]) * 1000).toISOString();
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
                        ...curation,
                        naddr,
                        identifier,
                        naddrData: {
                          identifier: curation.tags.find(
                            (tag) => tag[0] === "d"
                          )[1],
                          pubkey: curation.pubkey,
                          kind: curation.kind,
                        },
                        author: {
                          name: curation.pubkey.substring(0, 10),
                          img: "",
                        },
                        added_date,
                        modified_date,
                        published_at,
                        ...content,
                      },
                    ];
                  if (index !== -1) {
                    if (prev[index].created_at < curation.created_at) {
                      newP.splice(index, 1);
                      newP.push({
                        ...curation,
                        naddr,
                        identifier,
                        naddrData: {
                          identifier: curation.tags.find(
                            (tag) => tag[0] === "d"
                          )[1],
                          pubkey: curation.pubkey,
                          kind: curation.kind,
                        },
                        author: {
                          name: curation.pubkey.substring(0, 10),
                          img: "",
                        },
                        added_date,
                        modified_date,
                        published_at,
                        ...content,
                      });
                    }
                  }

                  newP = newP.sort(
                    (item_1, item_2) => item_2.created_at - item_1.created_at
                  );

                  return newP;
                });
                setIsLoaded(true);
              }
            },
            oneose() {
              setIsLoaded(true);
              setIsLoading(false);
              addNostrAuthors(curationsAuthors);
              pool.close(relaysToFetchFrom);
              sub.close();
            },
          }
        );
      } catch (err) {
        console.log(err);
      }
    };
    if (Array.isArray(mutedList)) fetchData();
  }, [lastEventTime, activeRelay, mutedList]);

  useEffect(() => {
    if (isLoading) return;
    const handleScroll = () => {
      if (curations.length === 0) return;
      if (
        document.querySelector(".main-page-nostr-container").scrollHeight -
          document.querySelector(".main-page-nostr-container").scrollTop -
          60 >
        document.documentElement.offsetHeight
      ) {
        return;
      }
      setLastEventTime(curations[curations.length - 1].created_at);
    };
    document
      .querySelector(".main-page-nostr-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".main-page-nostr-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [isLoading]);

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
    if (source === activeRelay) return;

    setIsLoading(false);
    setCurations([]);
    setActiveRelay(source);

    setLastEventTime(undefined);
  };

  return (
    <div>
      <Helmet>
        <title>Yakihonne | Curations</title>
        <meta
          name="description"
          content={
            "Check out the latest curated content from yakihonne top curators"
          }
        />
        <meta
          property="og:description"
          content={
            "Check out the latest curated content from yakihonne top curators"
          }
        />

        <meta property="og:url" content={`https://yakihonne.com/curations`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content="Yakihonne | Curations" />
        <meta property="twitter:title" content="Yakihonne | Curations" />
        <meta
          property="twitter:description"
          content={
            "Check out the latest curated content from yakihonne top curators"
          }
        />
      </Helmet>
      <div className="fit-container fx-centered">
        <div className="main-container">
          <SidebarNOSTR />
          <main className="main-page-nostr-container" style={{ padding: 0 }}>
            <ArrowUp />
            <div
              className="fit-container fx-centered fx-start-h box-pad-h-m"
              style={{ columnGap: "32px" }}
            >
              <div
                style={{ columnGap: "32px", width: "min(100%,1400px)" }}
                className="fx-centered fx-start-v fx-start-h"
              >
                <div
                  style={{ width: "min(100%, 700px)" }}
                  className={`fx-centered  fx-wrap posts-cards`}
                >
                  <div className="fit-container fx-scattered box-marg-s sticky">
                    <span className="fx-centered">
                      <h4>{curations.length} Curations</h4>
                      {activeRelay && (
                        <p className="orange-c">
                          (From {activeRelay.replace("wss://", "")})
                        </p>
                      )}
                    </span>
                    <div style={{ position: "relative", zIndex: 100 }}>
                      <div
                        style={{ position: "relative" }}
                        className="round-icon round-icon-tooltip"
                        data-tooltip={
                          activeRelay
                            ? `${activeRelay} is ${
                                isLoading ? "connecting" : "connected"
                              }`
                            : "All relays"
                        }
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
                                      activeRelay === relay ? "var(--c1)" : "",
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
                                      activeRelay === relay ? "var(--c1)" : "",
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
                  <div
                    className="fx-centered fit-container fx-wrap fx-stretch"
                    style={{ rowGap: "8px", columnGap: "32px" }}
                  >
                    {curations.map((item, index) => {
                      return (
                        <CurationPreviewCard
                          key={`${item.id}-${index}`}
                          curation={item}
                        />
                      );
                    })}
                    <div style={{ flex: "1 1 300px" }}></div>
                    <div style={{ flex: "1 1 300px" }}></div>
                    <div style={{ flex: "1 1 300px" }}></div>
                    <div style={{ flex: "1 1 300px" }}></div>
                  </div>
                  {isLoading && (
                    <div className="fit-container fx-centered box-marg-full">
                      <p className="gray-c">Loading</p>
                      <LoadingDots />
                    </div>
                  )}
                </div>
                <div
                  className=" fx-centered fx-col fx-start-v extras-homepage"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: "100",
                    width: "min(100%, 300px)",
                  }}
                >
                  <div className="sticky fit-container">
                    <SearchbarNOSTR />
                  </div>
                  <div
                    className="fx-centered gradient-border box-marg-s"
                    style={{
                      height: "300px",
                    }}
                  >
                    <div
                      className="fit-container fx-scattered fx-col fx-start-v box-pad-h box-pad-v sc-s-18"
                      style={{
                        height: "100%",
                        border: "none",
                        animation:
                          "animatedgradient 3s ease alternate infinite",
                      }}
                    >
                      <div className="fx-centered fx-start-v fx-col">
                        <h3 className="c1-c">Join the community!</h3>
                        <p style={{ maxWidth: "400px" }}>
                          Enjoy what people are curating or create your own for
                          the community to see!
                        </p>
                      </div>
                      <Link to={"/my-curations"} state={{ addCuration: true }}>
                        <button className="btn btn-normal">
                          Start curating
                        </button>
                      </Link>
                    </div>
                  </div>
                  <Footer />
                </div>
              </div>
            </div>
            <div className="fit-container"></div>
          </main>
        </div>
      </div>
    </div>
  );
}

const CurationPreviewCard = ({ curation }) => {
  const { getNostrAuthor, nostrAuthors } = useContext(Context);
  const [artURL, setArtURL] = useState(`${curation.naddr}`);
  const [authorData, setAuthorData] = useState({
    author_img: "",
    author_pubkey: curation.pubkey,
    author_name: getBech32("npub", curation.pubkey).substring(0, 10),
  });
  useEffect(() => {
    const fetchData = async () => {
      try {
        let auth = getNostrAuthor(curation.pubkey);

        if (auth) {
          setAuthorData({
            author_img: auth.picture,
            author_name: auth.name,
            author_pubkey: auth.pubkey,
          });
        }
        return;
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
  }, [nostrAuthors]);
  if (!curation.items.length) return;
  return (
    <div style={{ flex: "1 1 300px" }}>
      <Link to={`/curations/${artURL}`}>
        <div
          className="bg-img cover-bg sc-s-18 pointer fit-container"
          style={{
            height: "200px",
            backgroundImage: `url(${curation.image})`,
            filter: "brightness(90%)",
          }}
        >
          {curation.kind === 30004 && (
            <div
              className="sticker sticker-normal sticker-green"
              style={{
                color: "white",
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 0,
              }}
            >
              Article
            </div>
          )}
          {curation.kind === 30005 && (
            <div
              className="sticker sticker-normal sticker-orange"
              style={{
                color: "white",
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 0,
              }}
            >
              Video
            </div>
          )}
        </div>
      </Link>
      <div className="fit-container fx-centered fx-wrap box-pad-h-s box-pad-v-m">
        <Link className="fit-container" to={`/curations/${artURL}`}>
          {curation.title && <h4 className="p-one-line">{curation.title}</h4>}
          {!curation.title && <h4 className="p-one-line gray-c">Untitled</h4>}
        </Link>
        <div className="fx-scattered fit-container">
          <div className="fx-centered">
            <UserProfilePicNOSTR
              size={20}
              ring={false}
              img={authorData.author_img}
              mainAccountUser={false}
              user_id={authorData.author_pubkey}
            />
            <p className="p-one-line p-medium">{authorData.author_name}</p>
            <p className="orange-c p-medium">{curation.items.length} items</p>
          </div>
          <p className="gray-c p-medium">
            <Date_ toConvert={new Date(curation.published_at * 1000)} />
          </p>
        </div>
      </div>
    </div>
  );
};
