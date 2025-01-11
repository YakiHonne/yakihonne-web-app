import React, { useContext, useRef } from "react";
import { Context } from "../../Context/Context";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { useState } from "react";
import { useEffect } from "react";
import { SimplePool, nip19 } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import ToDeletePostNOSTR from "../../Components/NOSTR/ToDeletePostNOSTR";
import { useLocation } from "react-router-dom";
import LoadingDots from "../../Components/LoadingDots";
import { Helmet } from "react-helmet";
import {
  filterRelays,
  getBech32,
  getEmptyNostrUser,
} from "../../Helpers/Encryptions";
import { getNoteTree } from "../../Helpers/Helpers";
import KindOne from "../../Components/NOSTR/KindOne";
import TopCreators from "../../Components/NOSTR/TopCreators";
import TrendingNotes from "../../Components/NOSTR/TrendingNotes";
import Footer from "../../Components/Footer";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import axios from "axios";

var pool = new SimplePool();

export default function NostrMyNotesHidden() {
  const { state } = useLocation();
  const { nostrKeys, nostrUser, isPublishing, setToast } = useContext(Context);
  const [activeRelay, setActiveRelay] = useState("");
  const [notes, setNotes] = useState([]);
  const [trendingNotes, setTrendingNotes] = useState([]);
  const [topCreators, setTopCreators] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [postToDelete, setPostToDelete] = useState(false);
  const extrasRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setNotes([]);

        let relaysToFetchFrom =
          activeRelay == ""
            ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
            : [activeRelay];

        var sub = pool.subscribeMany(
          relaysToFetchFrom,
          [{ kinds: [1], authors: [nostrKeys.pub] }],
          {
            async onevent(event) {
              let event_ = await onEvent(event);
              if (event_) {
                setNotes((prev) => {
                  let existed = prev.find((note) => note.id === event.id);
                  if (existed) return prev;
                  else return [...prev, event_];
                });
                setIsLoading(false);
              }
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

  const initDeletedPost = (state) => {
    if (!state) {
      setPostToDelete(false);
      return;
    }
    removeCurrentPost();
    setPostToDelete(false);
  };

  const removeCurrentPost = () => {
    let index = notes.findIndex((item) => item.id === postToDelete.id);
    let tempArray = Array.from(notes);

    if (index !== -1) {
      tempArray.splice(index, 1);
      setNotes(tempArray);
    }
  };

  const onEvent = async (event) => {
    try {
      let checkForComment = event.tags.find(
        (tag) => tag[0] === "e" || tag[0] === "a"
      );
      let label = event.tags.find((tag) => tag[0] === "l");
      let checkForQuote = event.tags.find((tag) => tag[0] === "q");
      if (
        (checkForComment && event.kind === 1 && !label) ||
        (label && label[1] !== "smart-widget")
      )
        return false;
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
          checkForQuote: checkForQuote ? checkForQuote[1] : "",
          author_img,
          author_name,
          author_pubkey,
          stringifiedEvent: JSON.stringify(event),
          nEvent,
        };
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  };
  useEffect(() => {
    const getTrendingNotes = async () => {
      try {
        let [nostrBandNotes, nostrBandProfiles] = await Promise.all([
          axios.get("https://api.nostr.band/v0/trending/notes"),
          axios.get("https://api.nostr.band/v0/trending/profiles"),
        ]);
        let tNotes = nostrBandNotes.data?.notes.splice(0, 10) || [];

        let profiles = nostrBandProfiles.data.profiles
          ? nostrBandProfiles.data.profiles
              .filter((profile) => profile.profile)
              .map((profile) => {
                let author = getEmptyNostrUser(profile.profile.pubkey);
                try {
                  author = JSON.parse(profile.profile.content);
                } catch (err) {
                  console.log(err);
                }
                return {
                  pubkey: profile.profile.pubkey,
                  articles_number: profile.new_followers_count,
                  ...author,
                };
              })
          : [];
        setTopCreators(profiles.slice(0, 6));
        setTrendingNotes(
          tNotes.map((note) => {
            return {
              ...note,
              nEvent: nip19.neventEncode({
                id: note.id,
                author: note.pubkey,
                relays: note.relays,
              }),
            };
          })
        );
      } catch (err) {
        console.log(err);
      }
    };
    getTrendingNotes();
  }, []);
  return (
    <>
      {postToDelete && (
        <ToDeletePostNOSTR
          exit={() => initDeletedPost(false)}
          exitAndRefresh={() => initDeletedPost(true)}
          post_id={postToDelete.id}
          title={postToDelete.content}
          thumbnail={""}
          relayToDeleteFrom={
            activeRelay == ""
              ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
              : [activeRelay]
          }
        />
      )}
      <div>
        <Helmet>
          <title>Yakihonne | My notes</title>
          <meta name="description" content={"Browse your posted notes"} />
          <meta
            property="og:description"
            content={"Browse your posted notes"}
          />
          <meta property="og:url" content={`https://yakihonne.com/my-notes`} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content="Yakihonne | My notes" />
          <meta property="twitter:title" content="Yakihonne | My notes" />
          <meta
            property="twitter:description"
            content={"Browse your posted notes"}
          />
        </Helmet>
        <div className="fit-container fx-centered">
          <div className="main-container">
            <div className="fit-container fx-centered">
              <SidebarNOSTR />
              <main className={`main-page-nostr-container`}>
                <div className="fx-centered fit-container fx-start-h fx-start-v">
                  <div
                    style={{ flex: 2, width: "min(100%,700px)" }}
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
                          <h4>{notes.length} Notes</h4>
                        </div>
                      </div>
                    </div>
                    {isLoading && notes.length === 0 && (
                      <div
                        className="fit-container fx-centered fx-col"
                        style={{ height: "50vh" }}
                      >
                        <p>Loading notes</p>
                        <LoadingDots />
                      </div>
                    )}
                    <div className="fit-container fx-scattered fx-wrap fx-stretch">
                      {notes.map((note) => {
                        return (
                          <div
                            className="fit-container fx-start-v fx-scattered"
                            key={note.id}
                          >
                            <KindOne event={note} />
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
                                      id: note.id,
                                      content: note.content,
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
                        );
                      })}
                      {notes.length === 0 && !isLoading && (
                        <div
                          className="fit-container fx-centered fx-col"
                          style={{ height: "40vh" }}
                        >
                          <h4>No notes were found!</h4>
                          <p className="gray-c p-centered">
                            No notes were found in this relay
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      top:
                        extrasRef.current?.getBoundingClientRect().height >=
                        window.innerHeight
                          ? `calc(95vh - ${
                              extrasRef.current?.getBoundingClientRect()
                                .height || 0
                            }px)`
                          : 0,
                    }}
                    className={`fx-centered  fx-wrap  box-pad-v sticky extras-homepage`}
                    ref={extrasRef}
                  >
                    <div className="sticky fit-container">
                      <SearchbarNOSTR />
                    </div>

                    {trendingNotes.length > 0 && (
                      <div
                        className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v "
                        style={{
                          backgroundColor: "var(--c1-side)",
                          rowGap: "24px",
                          border: "none",
                        }}
                      >
                        <h4>Trending notes</h4>
                        <TrendingNotes notes={trendingNotes} />
                      </div>
                    )}
                    <div
                      className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v box-marg-s"
                      style={{
                        backgroundColor: "var(--c1-side)",
                        rowGap: "24px",
                        border: "none",
                        overflow: "visible",
                      }}
                    >
                      <h4>Trending users</h4>
                      <TopCreators
                        top_creators={topCreators}
                        kind="Followers"
                      />
                    </div>
                    <Footer />
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
