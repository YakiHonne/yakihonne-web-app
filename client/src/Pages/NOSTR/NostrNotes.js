import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import ArrowUp from "../../Components/ArrowUp";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { Helmet } from "react-helmet";
import { Context } from "../../Context/Context";

import relaysOnPlatform from "../../Content/Relays";
import { SimplePool, nip19 } from "nostr-tools";
import {
  filterRelays,
  getBech32,
  getEmptyNostrUser,
} from "../../Helpers/Encryptions";
import { getNoteTree } from "../../Helpers/Helpers";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import LoadingDots from "../../Components/LoadingDots";
import TopCreators from "../../Components/NOSTR/TopCreators";
import Footer from "../../Components/Footer";
import KindOne from "../../Components/NOSTR/KindOne";
import WriteNote from "../../Components/NOSTR/WriteNote";
import KindSix from "../../Components/NOSTR/KindSix";
import axios from "axios";
import TrendingNotes from "../../Components/NOSTR/TrendingNotes";

var pool = new SimplePool();

export default function NostrNotes() {
  const { nostrKeys, nostrUser, addNostrAuthors, mutedList, userFollowings } =
    useContext(Context);
  const [notes, setNotes] = useState([]);
  const memoNotes = useMemo(() => notes, [notes]);
  const [trendingNotes, setTrendingNotes] = useState([]);
  const [activeRelay, setActiveRelay] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contentFrom, setContentFrom] = useState("all");
  const [sub, setSub] = useState();
  const [lastEventTime, setLastTimeEventTime] = useState(undefined);
  const [topCreators, setTopCreators] = useState([]);
  const extrasRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoaded(false);
        setIsLoading(true);
        let { filter, relaysToFetchFrom } = getFilter();
        let events = [];
        let sub_ = pool.subscribeMany(relaysToFetchFrom, filter, {
          async onevent(event) {
            if (![...mutedList].includes(event.pubkey)) {
              events.push(event.pubkey);
              let event_ = await onEvent(event);
              if (event_) {
                if (event.kind === 6) {
                  events.push(event_.repostPubkey);
                }
                setNotes((prev) => {
                  let existed = prev.find((note) => note.id === event.id);
                  if (existed) return prev;
                  else
                    return [...prev, event_].sort(
                      (note_1, note_2) => note_2.created_at - note_1.created_at
                    );
                });
                setIsLoading(false);
              }
            }
          },
          oneose() {
            onEOSE(events);
            setIsLoading(false);
          },
        });
        setSub(sub_);
      } catch (err) {
        console.log(err);
        setIsLoading(false);
      }
    };

    if (Array.isArray(mutedList)) fetchData();
  }, [lastEventTime, activeRelay, mutedList, contentFrom]);

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

  useEffect(() => {
    const handleScroll = () => {
      if (notes.length === 0) return;
      if (
        document.querySelector(".main-page-nostr-container").scrollHeight -
          document.querySelector(".main-page-nostr-container").scrollTop -
          60 >
        document.documentElement.offsetHeight
      ) {
        return;
      }
      setLastTimeEventTime(notes[notes.length - 1].created_at);
    };
    document
      .querySelector(".main-page-nostr-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".main-page-nostr-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [isLoaded]);

  useEffect(() => {
    if (!nostrKeys) {
      switchContentSource("all");
    }
  }, [nostrKeys]);

  const getFilter = () => {
    let relaysToFetchFrom;
    let filter;

    if (activeRelay) relaysToFetchFrom = [activeRelay];
    if (!activeRelay)
      relaysToFetchFrom = !nostrUser
        ? relaysOnPlatform
        : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])];
    if (contentFrom === "followings") {
      let authors =
        userFollowings && userFollowings.length > 0 ? userFollowings : [];
      filter = [{ authors, kinds: [1, 6], limit: 10, until: lastEventTime }];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    if (contentFrom === "smart-widget") {
      filter = [
        { kinds: [1], limit: 10, "#l": ["smart-widget"], until: lastEventTime },
      ];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    filter = [{ kinds: [1, 6], limit: 10, until: lastEventTime }];
    return {
      relaysToFetchFrom,
      filter,
    };
  };

  const onEOSE = (events) => {
    if (events) {
      addNostrAuthors(events);
    }
    if (activeRelay) pool.close([activeRelay]);
    if (!activeRelay)
      pool.close(
        !nostrUser
          ? relaysOnPlatform
          : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])]
      );
    setIsLoaded(true);
    setIsLoading(false);
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

  const switchContentSource = (source) => {
    let relaysToFetchFrom = !nostrUser
      ? relaysOnPlatform
      : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])];
    if (source === contentFrom) return;
    if (sub) sub.close();
    setContentFrom(source);
    setNotes([]);
    setIsLoading(true);
    setLastTimeEventTime(undefined);
    pool.close(relaysToFetchFrom);
  };

  return (
    <div>
      <Helmet>
        <title>Yakihonne | Notes</title>
        <meta name="description" content={"Enjoy what people write on NOSTR"} />
        <meta
          property="og:description"
          content={"Enjoy what people write on NOSTR"}
        />
        <meta property="og:url" content={`https://yakihonne.com/notes`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content={"Yakihonne | Notes"} />
        <meta property="twitter:title" content={"Yakihonne | Notes"} />
        <meta
          property="twitter:description"
          content={"Enjoy what people write on NOSTR"}
        />
      </Helmet>
      <div className="fit-container fx-centered" style={{ columnGap: 0 }}>
        <div className="main-container">
          <SidebarNOSTR />
          <main className="main-page-nostr-container">
            <ArrowUp />
            <div className="fit-container fx-centered fx-start-h">
              <div
                style={{ gap: 0 }}
                className="fx-centered fx-start-v fx-start-h"
              >
                <div
                  style={{ flex: 1.8, maxWidth: "700px" }}
                  className={`fx-centered  fx-wrap box-pad-h `}
                >
                  <div className="fit-container fx-centered sticky">
                    {nostrKeys && (
                      <div
                        className={`list-item fx-centered fx ${
                          contentFrom === "followings"
                            ? "selected-list-item"
                            : ""
                        }`}
                        onClick={() => switchContentSource("followings")}
                      >
                        Following
                      </div>
                    )}
                    <div
                      className={`list-item fx-centered fx ${
                        contentFrom === "all" ? "selected-list-item" : ""
                      }`}
                      onClick={() => switchContentSource("all")}
                    >
                      Universal
                    </div>
                    <div
                      className={`list-item fx-centered fx ${
                        contentFrom === "smart-widget"
                          ? "selected-list-item"
                          : ""
                      }`}
                      onClick={() => switchContentSource("smart-widget")}
                    >
                      Widget notes
                    </div>
                  </div>
                  {nostrKeys && (nostrKeys.sec || nostrKeys.ext) && (
                    <WriteNote />
                  )}
                  {memoNotes.map((note) => {
                    if (note.kind === 6)
                      return <KindSix event={note} key={note.id} />;
                    return <KindOne event={note} key={note.id} />;
                  })}
                  {isLoading && (
                    <div
                      className="fit-container fx-centered fx-col"
                      style={{ height: "50vh" }}
                    >
                      <p>Loading notes</p>
                      <LoadingDots />
                    </div>
                  )}
                </div>
                <div
                  style={{
                    flex: 1,
                    top:
                      extrasRef.current?.getBoundingClientRect().height >=
                      window.innerHeight
                        ? `calc(95vh - ${
                            extrasRef.current?.getBoundingClientRect().height ||
                            0
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
                    <TopCreators top_creators={topCreators} kind="Followers" />
                  </div>
                  <Footer />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
