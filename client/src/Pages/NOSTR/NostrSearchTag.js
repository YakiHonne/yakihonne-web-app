import { nip19, SimplePool } from "nostr-tools";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";
import PostPreviewCardNOSTR from "../../Components/NOSTR/PostPreviewCardNOSTR";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { getBech32, filterRelays } from "../../Helpers/Encryptions";
import { getNoteTree } from "../../Helpers/Helpers";
import axios from "axios";
import FlashNewsCard from "../../Components/NOSTR/FlashNewsCard";
import KindOne from "../../Components/NOSTR/KindOne";

const pool = new SimplePool();
const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

const checkTopicInList = (list, topic) => {
  return list.find(
    (item) => item.trim().toLowerCase() === topic.trim().toLowerCase()
  );
};
export default function NostrSearchTag() {
  const { tag } = useParams();
  const {
    nostrUser,
    nostrKeys,
    addNostrAuthors,
    isPublishing,
    setToast,
    setToPublish,
    nostrUserTopics,
    setNostrUserTopics,
  } = useContext(Context);
  const [posts, setPosts] = useState([]);
  const [flashnews, setFlashnews] = useState([]);
  const [notes, setNotes] = useState([]);
  const [contentType, setContentType] = useState("n");
  const [isLoaded, setIsLoaded] = useState(false);
  const isSubscribed = useMemo(() => {
    return checkTopicInList(nostrUserTopics, tag);
  }, [nostrUserTopics, tag]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let authorsIDs = [];
        let sub = pool.subscribeMany(
          filterRelays(nostrUser?.relays || [], relaysOnPlatform),
          [{ kinds: [30023, 1], "#t": [tag] }],
          {
            async onevent(event) {
              authorsIDs.push(event.pubkey);
              if (event.kind === 30023) {
                let author_img = "";
                let author_name = getBech32("npub", event.pubkey).substring(
                  0,
                  10
                );
                let author_pubkey = event.pubkey;
                let thumbnail = "";
                let title = "";
                let summary = "";
                let postTags = [];

                let d = "";

                let modified_date = new Date(
                  event.created_at * 1000
                ).toISOString();
                let added_date = new Date(
                  event.created_at * 1000
                ).toISOString();
                let published_at = event.created_at;
                for (let tag of event.tags) {
                  if (tag[0] === "published_at") {
                    published_at = tag[1];
                    added_date =
                      tag[1].length > 10
                        ? new Date(parseInt(tag[1])).toISOString()
                        : new Date(parseInt(tag[1]) * 1000).toISOString();
                  }
                  if (tag[0] === "image") thumbnail = tag[1];
                  if (tag[0] === "title") title = tag[1];
                  if (tag[0] === "summary") summary = tag[1];
                  if (tag[0] === "t") postTags.push(tag[1]);
                  if (tag[0] === "d") d = tag[1];
                }

                let naddr = nip19.naddrEncode({
                  identifier: d,
                  pubkey: author_pubkey,
                  kind: 30023,
                });

                setPosts((prev) => {
                  return [
                    ...prev,
                    {
                      id: event.id,
                      thumbnail,
                      summary,
                      author_img,
                      author_pubkey,
                      author_name,
                      title,
                      added_date,
                      modified_date,
                      published_at,
                      created_at: event.created_at,
                      postTags,
                      naddr,
                    },
                  ];
                });
              }
              if (event.kind === 1) {
                let parsedNote = await onEvent(event);
                if (parsedNote) {
                  setNotes((prev) => {
                    let existed = prev.find((note) => note.id === event.id);
                    if (existed) return prev;
                    else return [...prev, parsedNote];
                  });
                }
              }
              setIsLoaded(true);
            },
            oneose() {
              addNostrAuthors(authorsIDs);
            },
          }
        );
      } catch (err) {
        console.log(err);
      }
    };
    const fetchFN = async () => {
      try {
        let data = await axios.get(
          API_BASE_URL + "/api/v1/flashnews/search/tags",
          {
            params: { tag },
          }
        );

        let parsedData = await Promise.all(
          data.data.map(async (fn) => {
            let note_tree = await getNoteTree(fn.content, fn.is_important);
            return {
              ...fn,
              note_tree,
            };
          })
        );
        setFlashnews(parsedData);
      } catch (err) {
        console.log(err);
      }
    };

    fetchFN();
    fetchData();
  }, []);

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
        ["t", tag],
      ],
      allRelays: [...filterRelays(relaysOnPlatform, nostrUser.relays)],
    });
    setNostrUserTopics([...nostrUserTopics, tag]);
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
      tags: [
        ["d", "MyFavoriteTopicsInYakihonne"],
        ...nostrUserTopics
          .filter((item) => item !== tag)
          .map((item) => ["t", item]),
      ],
      allRelays: [...filterRelays(relaysOnPlatform, nostrUser.relays)],
    });
    setNostrUserTopics([...nostrUserTopics.filter((item) => item !== tag)]);
  };
  const onEvent = async (event) => {
    try {
      let checkForComment = event.tags.find(
        (tag) => tag[0] === "e" || tag[0] === "a"
      );
      let checkForQuote = event.tags.find((tag) => tag[0] === "q");
      let checkForLabel = event.tags.find((tag) => tag[0] === "l");
      if (
        checkForLabel &&
        ["UNCENSORED NOTE", "FLASH NEWS"].includes(checkForLabel[1])
      )
        return false;
      if (checkForComment && event.kind === 1) return false;
      let author_img = "";
      let author_name = getBech32("npub", event.pubkey).substring(0, 10);
      let author_pubkey = event.pubkey;
      let nEvent = nip19.neventEncode({
        id: event.id,
        author: event.pubkey,
      });
      if (event.kind === 1) {
        let note_tree = await getNoteTree(event.content);
        return {
          ...event,
          note_tree,
          checkForQuote:
            checkForQuote && !event.content.includes("nostr:nevent")
              ? checkForQuote[1]
              : "",
          author_img,
          author_name,
          author_pubkey,
          stringifiedEvent: JSON.stringify(event),
          nEvent,
        };
      }

      let relatedEvent = await onEvent(JSON.parse(event.content));
      if (!relatedEvent) return false;
      return {
        ...event,
        relatedEvent,
      };
    } catch (err) {
      console.log(err);
      return false;
    }
  };
  return (
    <div>
      <Helmet>
        <title>Yakihonne | #{tag}</title>
      </Helmet>
      <div className="fit-container fx-centered">
        <div className="main-container">
          <SidebarNOSTR />
          <main className="main-page-nostr-container">
            <div className="fit-container fx-centered fx-start-h ">
              <div className="fx-centered fx-col fx-start-v box-pad-v box-pad-h-m fit-container">
                <div
                  className="fit-container fx-scattered sticky"
                  style={{ width: "min(100%, 800px)", padding: 0 }}
                >
                  <div className="fx-centered fx-col fx-start-v">
                    <h3 className="">#{tag}</h3>
                    {contentType === "p" && (
                      <p className="gray-c box-pad-h">
                        {posts.length} article(s)
                      </p>
                    )}
                    {contentType === "f" && (
                      <p className="gray-c box-pad-h">
                        {flashnews.length} flash news
                      </p>
                    )}
                    {contentType === "n" && (
                      <p className="gray-c box-pad-h">{notes.length} notes</p>
                    )}
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
                <div
                  className="fx-centered fx-start-h sticky "
                  style={{ width: "min(100%,800px)", top: "64px" }}
                >
                  <div className="fx-col  fit-container">
                    <div
                      className="fit-container fx-centered fx-start-h"
                      style={{ columnGap: "16px" }}
                    >
                      <div
                        className={`list-item fx-centered fx-shrink ${
                          contentType === "n" ? "selected-list-item" : ""
                        }`}
                        onClick={() => setContentType("n")}
                      >
                        Notes
                      </div>
                      <div
                        className={`list-item fx-centered fx-shrink ${
                          contentType === "p" ? "selected-list-item" : ""
                        }`}
                        onClick={() => setContentType("p")}
                      >
                        Articles
                      </div>

                      <div
                        className={`list-item fx-centered fx-shrink ${
                          contentType === "f" ? "selected-list-item" : ""
                        }`}
                        onClick={() => setContentType("f")}
                      >
                        Flash news
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`fx-centered  fx-wrap`}
                  style={{ width: "min(100%, 800px)" }}
                >
                  {isLoaded &&
                    contentType === "n" &&
                    notes.map((note) => {
                      return <KindOne event={note} key={note.id} />;
                    })}
                  {isLoaded &&
                    contentType === "p" &&
                    posts.map((item) => {
                      if (item.title)
                        return (
                          <div
                            key={item.id}
                            className="fit-container fx-centered"
                          >
                            {" "}
                            <PostPreviewCardNOSTR
                              item={item}
                              highlithedTag={tag}
                            />
                          </div>
                        );
                    })}
                  {isLoaded &&
                    contentType === "f" &&
                    flashnews.map((news) => {
                      return (
                        <FlashNewsCard
                          newsContent={news}
                          self={false}
                          timeline={false}
                          key={news.id}
                        />
                      );
                    })}
                  {isLoaded && contentType === "p" && posts.length === 0 && (
                    <div
                      className="fit-container fx-centered fx-col"
                      style={{ height: "40vh" }}
                    >
                      <h4>No related articles</h4>
                      <p
                        className="gray-c p-centered"
                        style={{ maxWidth: "400px" }}
                      >
                        We did not find related articles to this tag switch
                        content type to see more
                      </p>
                    </div>
                  )}
                  {isLoaded &&
                    contentType === "f" &&
                    flashnews.length === 0 && (
                      <div
                        className="fit-container fx-centered fx-col"
                        style={{ height: "40vh" }}
                      >
                        <h4>No related flashnews</h4>
                        <p
                          className="gray-c p-centered"
                          style={{ maxWidth: "400px" }}
                        >
                          We did not find related flashnews to this tag switch
                          content type to see more
                        </p>
                      </div>
                    )}
                  {isLoaded && contentType === "n" && notes.length === 0 && (
                    <div
                      className="fit-container fx-centered fx-col"
                      style={{ height: "40vh" }}
                    >
                      <h4>No related notes</h4>
                      <p
                        className="gray-c p-centered"
                        style={{ maxWidth: "400px" }}
                      >
                        We did not find related notes to this tag switch content
                        type to see more
                      </p>
                    </div>
                  )}
                  {!isLoaded && (
                    <div
                      className="fx-centered fit-container"
                      style={{ height: "40vh" }}
                    >
                      <div className="loader"></div>
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
