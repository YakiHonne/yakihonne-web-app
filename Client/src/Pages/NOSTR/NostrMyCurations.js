import React, { useContext, useEffect, useState } from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import NavbarNOSTR from "../../Components/NOSTR/NavbarNOSTR";
import { Context } from "../../Context/Context";
import LoadingScreen from "../../Components/LoadingScreen";
import PagePlaceholder from "../../Components/PagePlaceholder";
import relaysOnPlatform from "../../Content/Relays";
import { relayInit } from "nostr-tools";
import AddCurationNOSTR from "../../Components/NOSTR/AddCurationNOSTR";
import Date_ from "../../Components/Date_";
import ToDeletePostNOSTR from "../../Components/NOSTR/ToDeletePostNOSTR";
import AddArticlesToCuration from "../../Components/NOSTR/AddArticlesToCuration";
import { Helmet } from "react-helmet";

export default function NostrMyCurations() {
  const { nostrKeys, nostrUser, nostrUserLoaded } = useContext(Context);
  const [curations, setCurations] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date().getTime());
  const [showAddCuration, setShowAddCuration] = useState(false);
  const [curationToEdit, setCurationToEdit] = useState(false);
  const [postToDelete, setPostToDelete] = useState(false);
  const [showAddArticlesToCuration, setShowAddArticlesToCuration] =
    useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const relay = relayInit(relaysOnPlatform[0]);
        await relay.connect();
        // let curations = await relay.list([
        //   { kinds: [31000], authors: [nostrKeys.pub] },
        // ]);
        let curations = await relay.list([
          { kinds: [30001], authors: [nostrKeys.pub] },
        ]);
        // let article = await relay.list([
        //   {
        //     kinds: [30023],
        //     "#client": ["blogstack.io"],
        //   },
        // ]);
        // let article = await relay.list([
        //   {
        //     kinds: [30023],
        //     "#d": ["80608402.the-ultimate-bitcoin-contradiction"],
        //   },
        // ]);

        setCurations(curations);
        setIsLoading(false);
        setIsLoaded(true);
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
  }, [nostrKeys, nostrUserLoaded, timestamp]);

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
  const initDeletedPost = (state) => {
    if (!state) {
      setPostToDelete(false);
      return;
    }
    setPostToDelete(false);
    setTimestamp(new Date().getTime());
    setIsLoading(true);
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

  if (!nostrUserLoaded) return <LoadingScreen />;
  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      {showAddCuration && (
        <AddCurationNOSTR
          exit={() => setShowAddCuration(false)}
          exitAndRefresh={() => {
            setShowAddCuration(false);
            setTimestamp(new Date().getTime());
          }}
          curation={curationToEdit.curation}
          tags={curationToEdit.tags}
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
          relayToDeleteFrom={relaysOnPlatform[0]}
        />
      )}
      {showAddArticlesToCuration && (
        <AddArticlesToCuration
          curation={curationToEdit.curation}
          tags={curationToEdit.tags}
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
      </Helmet>
        <SidebarNOSTR />
        <main
          className={`main-page-nostr-container ${isLoading ? "flash" : ""}`}
        >
          <NavbarNOSTR />
          {nostrUser && (
            <>
              {(nostrKeys.sec || (!nostrKeys.sec && nostrKeys.ext)) && (
                <>
                  <div className="fit-container nostr-article">
                    {curations.length === 0 && (
                      <PagePlaceholder
                        page={"nostr-curations"}
                        onClick={() => setShowAddCuration(true)}
                      />
                    )}
                    {curations.length > 0 && (
                      <div className="fit-container">
                        <div className="fit-container fx-scattered">
                          <h3>
                            {curations.length >= 10
                              ? curations.length
                              : `0${curations.length}`}{" "}
                            curations
                          </h3>
                          <button
                            className="btn btn-normal"
                            onClick={() => setShowAddCuration(true)}
                          >
                            create curation
                          </button>
                        </div>
                        <div className="fit-container fx-centered fx-stretch fx-wrap box-marg-full">
                          {curations.map((curation) => {
                            let content = getParsedContent(curation.tags);
                            let numberorArticles = getDRef(curation.tags);
                            numberorArticles =
                              numberorArticles.length >= 10
                                ? numberorArticles.length
                                : `0${numberorArticles.length}`;
                            if (content)
                              return (
                                <div
                                  key={curation.id}
                                  className="sc-s fx-scattered fx-col"
                                  style={{
                                    flex: "1 1 400px",
                                    position: "relative",
                                  }}
                                >
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPostToDelete({
                                        id: curation.id,
                                        title: content.title,
                                        thumbnail: content.thumbnail,
                                      });
                                    }}
                                  >
                                    <div className="trash-24"></div>
                                  </div>
                                  <div className="fit-container">
                                    <div
                                      className="bg-img cover-bg fit-container"
                                      style={{
                                        backgroundImage: `url(${content.thumbnail})`,
                                        height: "200px",
                                      }}
                                    ></div>
                                    <div className="fit-container box-pad-v box-pad-h">
                                      <div className="fit-container fx-centered fx-start-v fx-col">
                                        <div className="fx-centered fx-start-h">
                                          <p className="gray-c">
                                            <Date_
                                              toConvert={new Date(
                                                curation.created_at * 1000
                                              ).toISOString()}
                                            />
                                          </p>
                                          <p className="gray-c p-medium">&#9679;</p>
                                          <div className="posts"></div>
                                          <p className="gray-c">{numberorArticles} arts.{" "}</p>
                                        </div>

                                        <h4 className="p-maj">
                                          {content.title}
                                        </h4>
                                        <p className="p-three-lines">
                                          {content.excerpt}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="fit-container">
                                    <hr />
                                    <div className="fit-container fx-scattered box-pad-h box-pad-v">
                                      <button
                                        className="btn btn-gst fx"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowAddCuration(true);
                                          setCurationToEdit({
                                            curation: content,
                                            tags: curation.tags,
                                          });
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="btn btn-normal fx"
                                        onClick={() => {
                                          setShowAddArticlesToCuration(true);
                                          setCurationToEdit({
                                            curation: content,
                                            tags: curation.tags,
                                          });
                                        }}
                                      >
                                        Add articles
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                          })}
                          <div style={{ flex: "1 1 400px" }}></div>
                          <div style={{ flex: "1 1 400px" }}></div>
                          <div style={{ flex: "1 1 400px" }}></div>
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
          {!nostrUser && <PagePlaceholder page={"nostr-not-connected"} />}
        </main>
      </div>
    </>
  );
}
