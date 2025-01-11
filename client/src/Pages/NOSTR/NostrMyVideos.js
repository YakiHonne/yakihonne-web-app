import React, { useContext } from "react";
import { Context } from "../../Context/Context";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { useState } from "react";
import { useEffect } from "react";
import { SimplePool, nip19 } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import Date_ from "../../Components/Date_";
import ToDeletePostNOSTR from "../../Components/NOSTR/ToDeletePostNOSTR";
import { Link, useLocation } from "react-router-dom";
import LoadingDots from "../../Components/LoadingDots";
import { Helmet } from "react-helmet";
import { filterRelays } from "../../Helpers/Encryptions";
import { getVideoContent, getVideoFromURL } from "../../Helpers/Helpers";
import UploadFile from "../../Components/UploadFile";
import { nanoid } from "nanoid";
import ToPublishVideo from "../../Components/NOSTR/ToPublishVideo";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import axios from "axios";
import HomeFN from "../../Components/NOSTR/HomeFN";
import Footer from "../../Components/Footer";

var pool = new SimplePool();

export default function NostrMyVideos() {
  const { state } = useLocation();
  const { nostrKeys, nostrUser, isPublishing, setToast } = useContext(Context);
  const [relays, setRelays] = useState(relaysOnPlatform);
  const [activeRelay, setActiveRelay] = useState("");
  const [videos, setVideos] = useState([]);
  const [importantFN, setImportantFN] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [postToDelete, setPostToDelete] = useState(false);
  const [showRelaysList, setShowRelaysList] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(
    state ? state?.addVideo : false
  );

  useEffect(() => {
    setShowAddVideo(state ? state?.addVideo : false);
  }, [state]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setVideos([]);

        let relaysToFetchFrom =
          activeRelay == ""
            ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
            : [activeRelay];

        var sub = pool.subscribeMany(
          relaysToFetchFrom,
          [{ kinds: [34235], authors: [nostrKeys.pub] }],
          {
            onevent(event) {
              let parsedEvent = getVideoContent(event);

              setVideos((prev) => {
                return prev.find((video) => video.id === event.id)
                  ? prev
                  : [parsedEvent, ...prev].sort(
                      (video_1, video_2) =>
                        video_2.created_at - video_1.created_at
                    );
              });

              setIsLoading(false);
            },
            oneose() {
              setIsLoading(false);
            },
          }
        );
      } catch (err) {
        console.log(err);
        setIsLoading(false);
      }
    };
    if (nostrKeys) {
      fetchData();
      return;
    }
  }, [nostrKeys, activeRelay]);
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
  const initDeletedPost = (state) => {
    if (!state) {
      setPostToDelete(false);
      return;
    }
    removeCurrentPost();
    setPostToDelete(false);
  };

  const removeCurrentPost = () => {
    let index = videos.findIndex((item) => item.id === postToDelete.id);
    let tempArray = Array.from(videos);

    if (index !== -1) {
      tempArray.splice(index, 1);
      setVideos(tempArray);
    }
  };
  const switchActiveRelay = (source) => {
    if (isLoading) return;
    if (source === activeRelay) return;
    pool = new SimplePool();
    setVideos([]);
    setActiveRelay(source);
  };

  return (
    <>
      {showAddVideo && (
        <AddVideo
          exit={() => {
            setShowAddVideo(false);
          }}
        />
      )}
      {postToDelete && (
        <ToDeletePostNOSTR
          exit={() => initDeletedPost(false)}
          exitAndRefresh={() => initDeletedPost(true)}
          post_id={postToDelete.id}
          title={postToDelete.title}
          thumbnail={postToDelete.thumbnail}
          relayToDeleteFrom={
            activeRelay == ""
              ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
              : [activeRelay]
          }
        />
      )}
      <div>
        <Helmet>
          <title>Yakihonne | My videos</title>
          <meta name="description" content={"Browse your posted videos"} />
          <meta
            property="og:description"
            content={"Browse your posted videos"}
          />
          <meta property="og:url" content={`https://yakihonne.com/my-videos`} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content="Yakihonne | My videos" />
          <meta property="twitter:title" content="Yakihonne | My videos" />
          <meta
            property="twitter:description"
            content={"Browse your posted videos"}
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
                setShowFilter(false);
              }}
            >
              <div className="fx-centered fit-container fx-start-h fx-start-v">
                <div
                  style={{ width: "min(100%,700px)" }}
                  className="box-pad-h-m"
                >
                  <div
                    className="box-pad-v-m fit-container fx-scattered"
                    style={{
                      position: "relative",
                      zIndex: "100",
                    }}
                  >
                    <div className="fx-centered fx-col fx-start-v">
                      <div className="fx-centered">
                        <h4>{videos.length} Videos</h4>
                        <p className="gray-c p-medium">
                          (In{" "}
                          {activeRelay === ""
                            ? "all relays"
                            : activeRelay.split("wss://")[1]}
                          )
                        </p>
                      </div>
                    </div>
                    <div className="fx-centered">
                      <div style={{ position: "relative" }}>
                        <div
                          style={{ position: "relative" }}
                          className="round-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRelaysList(!showRelaysList);
                            setShowFilter(false);
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
                  </div>
                  {isLoading && videos.length === 0 && (
                    <div
                      className="fit-container fx-centered fx-col"
                      style={{ height: "50vh" }}
                    >
                      <p>Loading videos</p>
                      <LoadingDots />
                    </div>
                  )}

                  <div className="fit-container fx-scattered fx-wrap fx-stretch">
                    {videos.map((video) => {
                      return (
                        <div
                          key={video.id}
                          className=" fx-start-h fx-start-v fx-centered fx-col"
                          style={{ flexBasis: "48%" }}
                        >
                          <Link
                            className="sc-s-18 bg-img cover-bg fit-container fx-centered fx-end-h fx-end-v box-pad-h-s box-pad-v-s"
                            style={{
                              aspectRatio: "16/9",
                              backgroundImage: `url(${video.image})`,
                              backgroundColor: "black",
                              border: "none",
                            }}
                            to={`/videos/${video.naddr}`}
                            target="_blank"
                          >
                            <div
                              className="sticker sticker-small"
                              style={{
                                backgroundColor: "black",
                                color: "white",
                              }}
                            >
                              {video.duration}
                            </div>
                          </Link>
                          <div className="fit-container fx-scattered">
                            <div>
                              <p className="p-two-lines">{video.title}</p>
                              <div className="fit-container fx-centered fx-start-h">
                                <p className="gray-c p-medium">
                                  <Date_
                                    toConvert={
                                      new Date(video.published_at * 1000)
                                    }
                                  />
                                </p>
                              </div>
                            </div>
                            <div
                              style={{
                                minWidth: "48px",
                                minHeight: "48px",
                                backgroundColor: "var(--dim-gray)",
                                borderRadius: "var(--border-r-50)",
                              }}
                              className="fx-centered pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                !isPublishing
                                  ? setPostToDelete({
                                      id: video.id,
                                      title: video.title,
                                      thumbnail: video.thumbnail,
                                    })
                                  : setToast({
                                      type: 3,
                                      desc: "An event publishing is in process!",
                                    });
                              }}
                            >
                              <div className="trash-24"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {videos.length === 0 && !isLoading && (
                      <div
                        className="fit-container fx-centered fx-col"
                        style={{ height: "40vh" }}
                      >
                        <h4>No videos were found!</h4>
                        <p className="gray-c p-centered">
                          No videos were found in this relay
                        </p>
                      </div>
                    )}
                  </div>
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

const AddVideo = ({ exit }) => {
  const { setToast } = useContext(Context);
  const [videoURL, setVideoURL] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState(false);
  const [type, setType] = useState("");
  const [showFinalStep, setShowFinalStep] = useState();
  const [eventTags, setEventTags] = useState([]);

  const initPublishing = async () => {
    if (!(videoURL && videoTitle)) {
      setToast({
        type: 2,
        desc: "Please provide a video URL and title.",
      });
      return;
    }
    let duration = "0";

    try {
    } catch (err) {}
    let tags = [
      ["d", nanoid()],
      ["url", videoURL],
      ["title", videoTitle],
      ["summary", videoDesc],
      ["published_at", `${Math.floor(Date.now() / 1000)}`],
      [
        "client",
        "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
      ],
      ["m", videoMetadata ? videoMetadata.type : "video/mp4"],
      ["duration", duration],
      ["size", videoMetadata ? `${videoMetadata.size}` : "0"],
    ];
    setEventTags(tags);
    setShowFinalStep(true);
  };

  const validate = async () => {
    if (type === "link") {
      setType("");
      return;
    }
    if (type === "1063") {
      try {
        let naddr = nip19.decode(videoURL);
        if (naddr.data.kind !== 1063) {
          setToast({
            type: 2,
            desc: "The nEvent is not a file sharing address.",
          });
          return;
        }
        setIsLoading(true);
        let event = await pool.get(
          filterRelays(relaysOnPlatform, naddr.data?.relays || []),
          {
            kinds: [1063],
            ids: [naddr.data.id],
          }
        );
        if (!event) {
          setToast({
            type: 2,
            desc: "Could not retrieve URL from this nEvent.",
          });
          setIsLoading(false);
          return;
        }
        let mime = "";
        let url = "";

        for (let tag of event.tags) {
          if (tag[0] === "m") mime = tag[1];
          if (tag[0] === "url") url = tag[1];
        }

        if (!mime.includes("video")) {
          setToast({
            type: 2,
            desc: "The file found is not a video",
          });
          setIsLoading(false);
          return;
        }
        if (!url) {
          setToast({
            type: 2,
            desc: "No url found from this nEvent.",
          });
          setIsLoading(false);
          return;
        }

        setVideoURL(url);
        setType("");
        setIsLoading(false);
        return;
      } catch (err) {
        setToast({
          type: 2,
          desc: "Error parsing the nEvent.",
        });
        return;
      }
    }
  };

  return (
    <>
      {showFinalStep && (
        <ToPublishVideo
          title={videoTitle}
          tags={eventTags}
          exit={() => {
            setShowFinalStep(false);
            exit();
          }}
        />
      )}
      <div className="fixed-container fx-centered box-pad-h">
        <div
          className="sc-s-18"
          style={{ position: "relative", width: "min(100%, 600px)" }}
        >
          {!videoURL && !type && (
            <div className="fit-container fx-centered fx-col box-pad-h box-pad-v">
              <p>Pick your video</p>
              <p className="p-medium gray-c p-centered box-marg-s">
                You can upload, paste a link or choose a kind 1063 event to your
                video
              </p>
              <div className="fx-centered" style={{ columnGap: "16px" }}>
                <div className="fx-centered fx-col">
                  <UploadFile
                    kind={"video/mp4,video/x-m4v,video/*"}
                    setImageURL={setVideoURL}
                    setIsUploadsLoading={setIsLoading}
                    setFileMetadata={setVideoMetadata}
                    round={true}
                  />
                  <p className="p-medium gray-c">Local</p>
                </div>
                <p className="p-small gray-c">|</p>
                <div
                  className="fx-centered fx-col"
                  style={{ opacity: isLoading ? ".5" : "1" }}
                  onClick={() => setType("link")}
                >
                  <div className="round-icon">
                    <div className="link-24"></div>
                  </div>
                  <p className="p-medium gray-c">Link</p>
                </div>
                <p className="p-small gray-c">|</p>
                <div
                  className="fx-centered fx-col"
                  style={{ opacity: isLoading ? ".5" : "1" }}
                  onClick={() => setType("1063")}
                >
                  <div className="round-icon">
                    <div className="share-icon-2-24"></div>
                  </div>
                  <p className="p-medium gray-c">Filesharing</p>
                </div>
              </div>
            </div>
          )}
          {videoURL && !type && (
            <div className="fit-container box-pad-h box-pad-v-s">
              <div className="box-pad-v-s fx-scattered fit-container">
                <div>
                  <h4>Preview</h4>
                  <p className="p-medium orange-c p-one-line">{videoURL}</p>
                </div>
                <div
                  className="round-icon"
                  onClick={() => {
                    setType("");
                    setVideoURL("");
                  }}
                >
                  <div className="trash"></div>
                </div>
              </div>
              {getVideoFromURL(videoURL)}
            </div>
          )}
          <hr />
          {type && (
            <div className="fit-container fx-centered fx-start-v fx-col box-pad-h box-pad-v">
              <div>
                <p className="p-left fit-container">
                  {type === "link" ? "Video link" : "Kind 1063"}
                </p>
                {type === "1063" && (
                  <p className="gray-c p-medium">
                    Paste your kind 1063 nEvent.
                  </p>
                )}
              </div>
              <div className="fx-centered fit-container">
                <input
                  type="text"
                  className="if ifs-full"
                  placeholder={
                    type === "link"
                      ? "Link to remote video, Youtube video or Vimeo"
                      : "nEvent"
                  }
                  value={videoURL}
                  onChange={(e) => setVideoURL(e.target.value)}
                  disabled={isLoading}
                />
                <div className="fx-centered">
                  <button
                    className="btn btn-normal"
                    onClick={() => (videoURL ? validate() : null)}
                    disabled={isLoading}
                  >
                    {isLoading ? <LoadingDots /> : "validate"}
                  </button>
                  <button
                    className="btn btn-gst-red"
                    onClick={() => {
                      setType("");
                      setVideoURL("");
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? <LoadingDots /> : "cancel"}
                  </button>
                </div>
              </div>
            </div>
          )}
          <hr />
          <div className="fit-container fx-centered fx-col box-pad-h box-pad-v">
            <input
              type="text"
              placeholder="Video title"
              className="if ifs-full"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
            />
            <textarea
              placeholder="Video description"
              className="txt-area ifs-full"
              value={videoDesc}
              onChange={(e) => setVideoDesc(e.target.value)}
            />
          </div>
          <hr />
          <div className="fit-container fx-centered box-pad-h box-pad-v">
            <button className="btn btn-gst-red" onClick={exit}>
              Cancel
            </button>
            <button
              className="btn btn-normal fx-centered"
              onClick={initPublishing}
            >
              Finilize publishing{" "}
              <div className="arrow" style={{ rotate: "-90deg" }}></div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
