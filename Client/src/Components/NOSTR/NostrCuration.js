import React, { useState, useEffect, useContext } from "react";
import { nip19, relayInit } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import SidebarNOSTR from "./SidebarNOSTR";
import NavbarNOSTR from "./NavbarNOSTR";
import { useParams } from "react-router-dom";
import Date_ from "../Date_";
import { useNavigate } from "react-router-dom";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import LoadingScreen from "../LoadingScreen";
import { getBech32, getEmptyNostrUser } from "../../Helpers/Encryptions";
import { SimplePool } from "nostr-tools";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import Helmet from "react-helmet";
import ArrowUp from "../ArrowUp";
const pool = new SimplePool();

export default function NostrCuration() {
  const { setToast } = useContext(Context);
  const { id } = useParams();
  const navigateTo = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isArtsLoaded, setIsArtsLoaded] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [curation, setCuration] = useState({});
  const [curationDet, setCurationDet] = useState({});
  const [articlesOnCuration, setArticlesOnCuration] = useState([]);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const relay = relayInit(relaysOnPlatform[0]);
  //       await relay.connect();

  //       let naddrData = nip19.decode(id);
  //       let aTag = `30023:${naddrData.data.pubkey}:${naddrData.data.identifier}`;
  //       let data = await relay.list([
  //         {
  //           kinds: [30001],
  //           "#d": [naddrData.data.identifier],
  //         },
  //       ]);

  //       if (data.length === 0) {
  //         setToast({
  //           type: 2,
  //           desc: "This curation does not exist",
  //         });
  //         setTimeout(() => {
  //           navigateTo("/curations");
  //         }, 2000);
  //         return;
  //       }

  //       let [articles, author] = await Promise.all([
  //          getPostsInCuration(data[0].tags),
  //          getUserFromNOSTR(data[0].pubkey),
  //       ]);

  //       let parsedAuthor = JSON.parse(author.content) || {};
  //       let temAuthor = {
  //         name: parsedAuthor.name || data[0].pubkey.substring(0, 10),
  //         img: parsedAuthor.picture || "",
  //       };
  //       setArticlesOnCuration(articles);
  //       setCuration(data[0]);

  //       setCurationDet({
  //         ...getParsedContent(data[0].tags),
  //         author: temAuthor,
  //       });
  //       setIsLoaded(true);
  //     } catch (err) {
  //       console.log(err);
  //       setToast({
  //         type: 2,
  //         desc: "This curation does not exist",
  //       });
  //       setTimeout(() => {
  //         navigateTo("/curations");
  //       }, 2000);
  //       return;
  //     }
  //   };
  //   fetchData();
  // }, []);

  useEffect(() => {
    if (!isLoaded) return;
    let el = document.querySelector(".carousel-card");

    el.addEventListener("mouseover", () => {
      setShowDesc(true);
    });
    el.addEventListener("mouseout", () => {
      setShowDesc(false);
    });
    return () => {
      el.addEventListener("mouseout", () => {
        setShowDesc(false);
      });
      el.removeEventListener("mouseover", () => {
        setShowDesc(true);
      });
    };
  }, [isLoaded]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const relay = relayInit(relaysOnPlatform[0]);
        await relay.connect();

        let naddrData = nip19.decode(id);
        let aTag = `30023:${naddrData.data.pubkey}:${naddrData.data.identifier}`;
        let sub = relay.sub([
          {
            kinds: [30001],
            "#d": [naddrData.data.identifier],
          },
        ]);

        let _curation = null;

        sub.on("event", (event) => {
          _curation = { ...event };
          setCuration(_curation);
          setCurationDet({
            pubkey: event.pubkey,
            ...getParsedContent(_curation.tags),
            author: { name: event.pubkey.substring(0, 10), img: "" },
          });
          setIsLoaded(true);
        });
        sub.on("eose", async () => {
          if (!_curation) {
            setToast({
              type: 2,
              desc: "This curation does not exist",
            });
            setTimeout(() => {
              navigateTo("/curations");
            }, 2000);
          } else {
            let authPubkeys = getAuthPubkeys(_curation.tags);
            let dRefs = getDRef(_curation.tags);
            let sub_2 = pool.sub(relaysOnPlatform, [
              {
                kinds: [30023],
                "#d": dRefs,
              },
              { kinds: [0], authors: authPubkeys },
            ]);
            let articles = [];
            if (dRefs.length === 0) setIsArtsLoaded(true);
            sub_2.on("event", (article) => {
              articles.push(article);
              let post = getPostsInCuration(article);

              setArticlesOnCuration((_articles) => {
                let newArts = [post, ..._articles];
                newArts = newArts.map((art) => {
                  let author =
                    articles.find(
                      (_event) =>
                        _event.kind === 0 &&
                        _event.pubkey === art?.author_pubkey
                    ) || "";
                  let author_img = author
                    ? JSON.parse(author.content).picture
                    : "";
                  let author_name = author
                    ? JSON.parse(author.content).name?.substring(0, 10)
                    : getBech32("npub", article.pubkey).substring(0, 10);

                  return {
                    ...art,
                    author_img,
                    author_name,
                  };
                });
                return sortPostsOnCuration(dRefs, newArts);
              });
              setIsArtsLoaded(true);
            });
            sub_2.on("eose", () => {
              setIsArtsLoaded(true);
            });
          }
          relay.close();
          sub.unsub();
        });
      } catch (err) {
        console.log(err);
        setToast({
          type: 2,
          desc: "Problem in connecting with the relay",
        });
        setTimeout(() => {
          navigateTo("/curations");
        }, 2000);
        return;
      }
    };
    fetchData();
  }, []);

  const getParsedContent = (tags) => {
    try {
      let content = {
        title: "",
        excerpt: "",
        thumbnail: "",
      };

      for (let tag of tags) {
        if (tag[0] === "title") {
          content.title = tag[1];
        }
        if (tag[0] === "thumbnail") {
          content.thumbnail = tag[1];
        }
        if (tag[0] === "excerpt") {
          content.excerpt = tag[1];
        }
      }

      return content;
    } catch {
      return false;
    }
  };

  const getDRef = (tags) => {
    let tempArray = [];
    for (let tag of tags) {
      if (tag[0] === "a") {
        tempArray.push(tag[1].split(":").splice(2, 100).join(":"));
      }
    }
    return tempArray;
  };
  const getAuthPubkeys = (tags) => {
    let tempArray = [];
    for (let tag of tags) {
      if (tag[0] === "a") {
        tempArray.push(tag[1].split(":")[1]);
      }
    }
    return tempArray;
  };

  const getPostsInCuration = (article) => {
    if (!article?.pubkey || article.kind === 300023) return {};

    let author_img = "";
    let author_name = getBech32("npub", article.pubkey).substring(0, 10);
    let author_pubkey = article.pubkey;
    let thumbnail = "";
    let title = "";
    let d = "";
    let added_date = new Date(article.created_at * 1000).toDateString();
    for (let tag of article.tags) {
      if (tag[0] === "image") thumbnail = tag[1];
      if (tag[0] === "title") title = tag[1];
      if (tag[0] === "d") d = tag[1];
    }
    let naddr = nip19.naddrEncode({
      identifier: d,
      pubkey: author_pubkey,
      kind: 30023,
    });
    return {
      id: article.id,
      thumbnail,
      author_img,
      author_name,
      author_pubkey,
      title,
      added_date,
      d,
      naddr,
    };

    // return sortPostsOnCuration(dRefs, postsOnCuration);
  };
  // const getPostsInCuration = async (tags) => {
  //   // const relay = relayInit(relaysOnPlatform[0]);
  //   // await relay.connect();

  //   let dRefs = getDRef(tags);
  //   let articlesOnCuration =
  //     dRefs.length > 0
  //       ? await Promise.all(
  //           dRefs.map((dref) => {
  //             let ev = pool.get(relaysOnPlatform, {
  //               kinds: [30023],
  //               "#d": [dref],
  //             });
  //             return ev;
  //           })
  //         )
  //       : [];

  //   articlesOnCuration = Array.from(articlesOnCuration.filter((item) => item));

  //   let authorsIDs = articlesOnCuration.map((event) => event.pubkey);
  //   let authors = await pool.list(relaysOnPlatform, [
  //     { kinds: [0], authors: authorsIDs },
  //   ]);
  //   let postsOnCuration = articlesOnCuration.map((event) => {
  //     if (!event?.pubkey) return {};
  //     let author = authors.find((item) => item.pubkey === event.pubkey) || "";
  //     let author_img = author ? JSON.parse(author.content).picture : "";
  //     let author_name = author
  //       ? JSON.parse(author.content).name?.substring(0, 10)
  //       : getBech32("npub", event.pubkey).substring(0, 10);

  //     let author_pubkey = event.pubkey;
  //     let thumbnail = "";
  //     let title = "";
  //     let d = "";
  //     let added_date = new Date(event.created_at * 1000).toDateString();
  //     for (let tag of event.tags) {
  //       if (tag[0] === "image") thumbnail = tag[1];
  //       if (tag[0] === "title") title = tag[1];
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
  //       author_img,
  //       author_name,
  //       author_pubkey,
  //       title,
  //       added_date,
  //       d,
  //       naddr,
  //     };
  //   });

  //   return sortPostsOnCuration(dRefs, postsOnCuration);
  // };

  const sortPostsOnCuration = (original, toSort) => {
    let tempArray = [];
    for (let post of original) {
      tempArray.push(toSort.find((item) => item.d === post));
    }
    return tempArray;
  };

  const getUserFromNOSTR = async (pubkey) => {
    try {
      let author = await pool.get(relaysOnPlatform, {
        kinds: [0],
        authors: [pubkey],
      });

      return author || getEmptyNostrUser(pubkey);
    } catch (err) {
      console.log(err);
    }
  };

  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      <div>
        <Helmet>
          <title>Yakihonne | {curationDet.title}</title>
          <meta name="description" content={curationDet.excerpt} />
          <meta property="og:description" content={curationDet.excerpt} />
          <meta property="og:image" content={curationDet.thumbnail} />
          <meta
            property="og:url"
            content={`https://yakihonne.com/curations/${id}`}
          />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content={curationDet.title} />
          <meta property="twitter:title" content={curationDet.title} />
          <meta property="twitter:description" content={curationDet.excerpt} />
          <meta property="twitter:image" content={curationDet.thumbnail} />
        </Helmet>
        <SidebarNOSTR />
        <main className="main-page-nostr-container">
          <ArrowUp />
          <NavbarNOSTR />
          <div className="box-marg-full fit-container fx-scattered fx-start-v fx-break">
            <div
              className="fx bg-img cover-bg sc-s box-pad-h box-pad-v fx-centered fx-end-v box-marg carousel-card"
              style={{
                height: "70vh",
                minHeight: "40vh",
                position: "sticky",
                top: "0",
                backgroundImage: `url(${curationDet.thumbnail})`,
              }}
            >
              <div
                className="fit-container fx-centered fx-col fx-start-v box-pad-h sc-s carousel-card-desc "
                style={{
                  transition: ".2s ease-in-out",
                  maxHeight: "max-content",
                  paddingBottom: "1rem"
                }}
              >
                <div
                  style={
                    {
                      // position: "absolute",
                      // left: "50%",
                      // top: "0",
                      // transform: "translate(-50%,0%)",
                    }
                  }
                  className="fx-centered fit-container box-pad-v-s"
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDesc(!showDesc);
                    }}
                    style={{
                      // width: "24px",
                      // height: "24px",
                      // backgroundColor: "var(--dim-gray)",
                      borderRadius: "var(--border-r-50)",
                      transform: showDesc ? "" : "rotate(180deg)",
                      transition: ".2s ease-in-out",
                    }}
                    className="fx-centered"
                  >
                    <div
                      className="arrow"
                      style={{ filter: "invert()", opacity: ".5" }}
                    ></div>
                  </div>
                </div>
                <h3 className="white-c">{curationDet.title}</h3>
                <p className="gray-c">
                  Launched on{" "}
                  <Date_
                    toConvert={new Date(
                      curation.created_at * 1000
                    ).toISOString()}
                  />
                </p>
                {/* {showDesc && ( */}
                <div style={{ display: showDesc ? "block" : "none" }}>
                  <p className="white-c box-marg-s" style={{ marginLeft: 0 }}>
                    {curationDet.excerpt}
                  </p>
                  <div className="fit-container fx-centered fx-start-h">
                    <div
                      className="fx-centered fx-start-h"
                      style={{ columnGap: "16px" }}
                    >
                      <AuthorPreview_1 curation={curationDet} />
                    </div>
                    <div>
                      <p className="white-c">&#9679;</p>
                    </div>
                    <div
                      className="fx-centered fx-start-h"
                      style={{ filter: "invert()" }}
                    >
                      <div className="fx-centered">
                        <div className="posts-24"></div>
                        <p>
                          {getDRef(curation.tags).length} <span>arts.</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* )} */}
              </div>
            </div>
            <div
              className="fx box-pad-v sc-s fit-container"
              style={{
                zIndex: 1,
                backgroundColor: "var(--white)",
                border: "none",
              }}
            >
              {!isArtsLoaded && (
                <div className="fx-centered fx-col" style={{ height: "70vh" }}>
                  <p className="gray-c p-medium">Loading..</p>
                  <LoadingDots />
                </div>
              )}
              {isArtsLoaded && (
                <>
                  {articlesOnCuration.length > 0 && (
                    <div className="box-pad-h fx-centered fx-col">
                      <h3 className="box-marg">Articles on this topic</h3>
                      <div
                        className="fx-centered fx-wrap box-pad-v box-pad-h posts-in-topic-cards "
                        style={{ rowGap: "24px" }}
                      >
                        {articlesOnCuration.map((item, index) => {
                          if (item?.id)
                            return (
                              <div
                                className="fit-container fx-centered box-marg-s"
                                key={item.id}
                              >
                                <div
                                  style={{
                                    flex: "1 2 500px",
                                    order: index % 2 === 0 ? 0 : 1,
                                  }}
                                ></div>
                                <div
                                  className=" sc-s box-pad-h-m box-pad-v-m fx-centered fx-start-h pointer posts-in-topic-card"
                                  onClick={() =>
                                    navigateTo(`/article/${item.naddr}`)
                                  }
                                  style={{
                                    flex: "1 1 500px",
                                    overflow: "visible",
                                    position: "relative",
                                  }}
                                >
                                  <div
                                    className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-s sc-s-18"
                                    style={{
                                      position: "absolute",
                                      right: index % 2 !== 0 ? "" : "1.5rem",
                                      left: index % 2 !== 0 ? "1.5rem" : "",
                                      top: "0",
                                      transform: "translateY(-100%)",
                                      backgroundColor: "var(--orange-main)",
                                      width: "fit-content",
                                      height: "20px",
                                      borderBottomRightRadius: "0",
                                      borderBottomLeftRadius: "0",
                                      border: "none",
                                    }}
                                  >
                                    <div className="fx-centered">
                                      <p className="white-c p-medium p-small">
                                        On <Date_ toConvert={item.added_date} />
                                      </p>
                                    </div>
                                  </div>
                                  <div style={{ position: "relative" }}>
                                    <div
                                      className="bg-img cover-bg"
                                      style={{
                                        minWidth: "50px",
                                        minHeight: "50px",
                                        backgroundImage: `url(${item.thumbnail})`,
                                        borderRadius: "var(--border-r-50)",
                                        backgroundColor: "var(--dim-gray)",
                                      }}
                                    ></div>
                                    <div
                                      className="fx-centered"
                                      style={{
                                        position: "absolute",
                                        bottom: "-10px",
                                        right: "-10px",
                                        backgroundColor: "var(--white)",
                                        borderRadius: "var(--border-r-50)",
                                        padding: ".25rem",
                                      }}
                                    >
                                      <UserProfilePicNOSTR
                                        size={20}
                                        img={item.author_img}
                                        mainAccountUser={false}
                                        user_id={item.author_pubkey}
                                        ring={false}
                                      />
                                    </div>
                                  </div>
                                  <div
                                    className="fx-centered fx-col fx-start-v box-pad-h-m fit-container"
                                    style={{ rowGap: "2px" }}
                                  >
                                    <div className="fit-container fx-scattered">
                                      <p className="gray-c p-medium">
                                        By{" "}
                                        {item?.author_name ||
                                          "DAORayaki Ranger"}
                                      </p>
                                      {/* {item.bounty_winner && (
                                <div className="sticker sticker-small sticker-c1">
                                  bounty winner
                                </div>
                              )} */}
                                    </div>
                                    <p className="p-two-lines">{item.title}</p>
                                    <p className="p-medium p-three-lines">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                        })}
                      </div>
                    </div>
                  )}
                  {articlesOnCuration.length === 0 && (
                    <div
                      className="fx-centered fx-col"
                      style={{ height: "70vh" }}
                    >
                      <h3>Articles coming soon</h3>
                      <p className="gray-c box-pad-v-s">
                        more articles will join this topic, stay tuned!
                      </p>
                      <div
                        className="curation"
                        style={{ width: "64px", height: "64px" }}
                      ></div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

const ShowExcerpt = ({ content, exit }) => {
  return <div className="fixed-container"></div>;
};

const AuthorPreview_1 = ({ curation }) => {
  const [authorData, setAuthorData] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        let sub = pool.sub(relaysOnPlatform, [
          { kinds: [0], authors: [curation.pubkey] },
        ]);
        sub.on("event", (event) => {
          let img = event ? JSON.parse(event.content).picture : "";
          let name = event
            ? JSON.parse(event.content).name?.substring(0, 20)
            : curation.author.name;
          setAuthorData((auth) => {
            return { img, name };
          });
          return;
        });
        sub.on("eose", () => {
          pool.close(relaysOnPlatform);
          sub.unsub();
        });
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  if (!authorData)
    return (
      <>
        <UserProfilePicNOSTR
          size={32}
          img={curation.author.img}
          mainAccountUser={false}
          allowClick={true}
          user_id={curation.pubkey}
        />
        <p className="white-c">
          Posted by <span className="green-c">{curation.author.name}</span>
        </p>
      </>
    );
  return (
    <>
      <UserProfilePicNOSTR
        size={32}
        img={authorData.img}
        mainAccountUser={false}
        allowClick={true}
        user_id={curation.pubkey}
      />
      <p className="white-c">
        Posted by <span className="green-c">{authorData.name}</span>
      </p>
    </>
  );
};
