import React, { useContext, useEffect, useRef, useState } from "react";
import { Context } from "../../Context/Context";
import { nip19, SimplePool } from "nostr-tools";
import { Helmet } from "react-helmet";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { getNoteTree } from "../../Helpers/Helpers";
import ArrowUp from "../../Components/ArrowUp";
import relaysOnPlatform from "../../Content/Relays";
import {
  filterRelays,
  getEmptyNostrUser,
  getParsed3000xContent,
} from "../../Helpers/Encryptions";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import LoadingDots from "../../Components/LoadingDots";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import { Link } from "react-router-dom";
import Footer from "../../Components/Footer";
import ToDeleteGeneral from "../../Components/NOSTR/ToDeleteGeneral";
import WidgetCard from "../../Components/NOSTR/WidgetCard";
const pool = new SimplePool();

export default function NostrSmartWidgets() {
  const { nostrUser, nostrKeys, addNostrAuthors } = useContext(Context);
  const [comWidgets, setComWidgets] = useState([]);
  const [myWidgets, setMyWidgets] = useState([]);
  const [notes, setNotes] = useState([]);
  const [contentSource, setContentSource] = useState("community");
  const [myWidgetsLE, setMyWidgetsLE] = useState(undefined);
  const [comWidgetsLE, setComWidgetsLE] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWidgetID, setSelectedWidgetID] = useState(false);
  const [sub, setSub] = useState(false);
  const extrasRef = useRef(null);

  useEffect(() => {
    const { relays, filter } = getFilter();
    let events = [];
    setIsLoading(true);
    let subscription = pool.subscribeMany(relays, filter, {
      onevent(event) {
        try {
          let metadata = JSON.parse(event.content);
          let parsedContent = getParsed3000xContent(event.tags);
          events.push(event.pubkey);
          if (contentSource === "community") {
            setComWidgets((prev) => {
              let element = prev.find((widget) => widget.id === event.id);
              if (element) return prev;
              return [
                {
                  ...parsedContent,
                  metadata,
                  ...event,
                  author: getEmptyNostrUser(event.pubkey),
                },
                ...prev,
              ].sort((el_1, el_2) => el_2.created_at - el_1.created_at);
            });
          }
          if (contentSource === "self") {
            setMyWidgets((prev) => {
              let element = prev.find((widget) => widget.id === event.id);
              if (element) return prev;
              return [
                {
                  ...parsedContent,
                  metadata,
                  ...event,
                  author: getEmptyNostrUser(event.pubkey),
                },
                ...prev,
              ].sort((el_1, el_2) => el_2.created_at - el_1.created_at);
            });
          }
        } catch (err) {
          console.log(err);
          setIsLoading(false);
        }
      },
      oneose() {
        addNostrAuthors([...new Set(events)]);
        setIsLoading(false);
      },
    });
    setSub(subscription);
  }, [contentSource, myWidgetsLE, comWidgetsLE]);

  useEffect(() => {
    if (!nostrKeys) handleContentSource("community");
  }, [nostrKeys]);

  useEffect(() => {
    let relaysToUse = filterRelays(nostrUser?.relays || [], relaysOnPlatform);
    let events = [];
    setIsLoading(true);
    let subscription = pool.subscribeMany(
      relaysToUse,
      [{ kinds: [1], "#l": ["smart-widget"], limit: 6 }],
      {
        async onevent(event) {
          try {
            let parsedContent = await getNoteTree(event.content, true);
            events.push(event.pubkey);
            let nEvent = nip19.neventEncode({
              author: event.pubkey,
              id: event.id,
            });
            setNotes((prev) => {
              let element = prev.find((widget) => widget.id === event.id);
              if (element) return prev;
              return [
                {
                  parsedContent,
                  nEvent,
                  ...event,
                },
                ...prev,
              ].sort((el_1, el_2) => el_2.created_at - el_1.created_at);
            });
          } catch (err) {
            console.log(err);
          }
        },
        oneose() {
          addNostrAuthors([...new Set(events)]);
        },
      }
    );
  }, []);

  const getFilter = () => {
    let relaysToUse = filterRelays(nostrUser?.relays || [], relaysOnPlatform);
    if (contentSource === "self") {
      return {
        relays: relaysToUse,
        filter: [
          {
            kinds: [30031],
            authors: [nostrKeys.pub],
            until: myWidgetsLE,
            limit: 10,
          },
        ],
      };
    }
    return {
      relays: relaysToUse,
      filter: [{ kinds: [30031], until: comWidgetsLE, limit: 4 }],
    };
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isLoading) return;
      let container = document.querySelector(".main-page-nostr-container");

      if (!container) return;
      if (
        container.scrollHeight - container.scrollTop - 60 >
        document.documentElement.offsetHeight
      ) {
        return;
      }

      setComWidgetsLE(
        comWidgets[comWidgets.length - 1]?.created_at || undefined
      );
      setMyWidgetsLE(myWidgets[myWidgets.length - 1]?.created_at || undefined);
    };

    document
      .querySelector(".main-page-nostr-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".main-page-nostr-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [isLoading]);

  const handleContentSource = (source) => {
    if (source === contentSource) return;
    sub?.close();
    setContentSource(source);
  };

  const handleRefreshData = async () => {
    setMyWidgets((widgets) =>
      widgets.filter((widget) => widget.id !== selectedWidgetID)
    );
    setComWidgets((widgets) =>
      widgets.filter((widget) => widget.id !== selectedWidgetID)
    );
    setSelectedWidgetID(false);
  };

  return (
    <div>
      <Helmet>
        <title>Yakihonne | Smart widgets</title>
        <meta
          name="description"
          content={"Interact with the community smart widgets"}
        />
        <meta
          property="og:description"
          content={"Interact with the community smart widgets"}
        />

        <meta
          property="og:url"
          content={`https://yakihonne.com/smart-widget`}
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content="Yakihonne | Smart widget" />
        <meta property="twitter:title" content="Yakihonne | Smart widget" />
        <meta
          property="twitter:description"
          content={"Interact with the community smart widgets"}
        />
      </Helmet>
      {selectedWidgetID && (
        <ToDeleteGeneral
          cancel={() => setSelectedWidgetID(false)}
          title={""}
          kind="Smart widget"
          eventId={selectedWidgetID}
          refresh={handleRefreshData}
        />
      )}
      <div className="fit-container fx-centered">
        <ArrowUp />
        <div className="main-container">
          <SidebarNOSTR />
          <main className="main-page-nostr-container">
            <div className="fx-centered fit-container fx-start-h fx-start-v">
              <div
                className="box-pad-h-m  fit-container fx-col fx-centered fx-start-h fx-start-v"
                style={{ flex: 1.5, maxWidth: "700px" }}
              >
                <div
                  className="fit-container sticky fx-centered fx-col"
                  style={{ rowGap: "16px" }}
                >
                  <div className="fit-container fx-centered ">
                    <Link to="/smart-widget-checker">
                      <div
                        className="round-icon-small round-icon-tooltip"
                        data-tooltip="Checker"
                      >
                        <div className="smart-widget-checker"></div>
                      </div>
                    </Link>
                    <div
                      className={`list-item fx-centered fx ${
                        contentSource === "community"
                          ? "selected-list-item"
                          : ""
                      }`}
                      onClick={() => handleContentSource("community")}
                    >
                      <p>Community</p>
                    </div>
                    {nostrKeys && (
                      <div
                        className={`list-item fx-centered fx ${
                          contentSource === "self" ? "selected-list-item" : ""
                        }`}
                        onClick={() => handleContentSource("self")}
                      >
                        <p>My smart widget</p>
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={`fit-container fx-col fx-centered fx-start-h fx-start-v ${
                    !nostrKeys ? "box-pad-v" : ""
                  }`}
                  style={{ width: "min(100%,700px)" }}
                >
                  {contentSource === "community" &&
                    comWidgets.map((widget) => {
                      return (
                        <WidgetCard
                          widget={widget}
                          key={widget.id}
                          deleteWidget={() => setSelectedWidgetID(widget.id)}
                        />
                      );
                    })}
                  {contentSource === "self" &&
                    myWidgets.map((widget) => {
                      return (
                        <WidgetCard
                          widget={widget}
                          key={widget.id}
                          deleteWidget={() => setSelectedWidgetID(widget.id)}
                        />
                      );
                    })}
                </div>
                {isLoading && (
                  <div
                    className="fit-container fx-centered"
                    style={{ height: "30vh" }}
                  >
                    <p className="gray-c">Loading</p>
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
                          extrasRef.current?.getBoundingClientRect().height || 0
                        }px)`
                      : 0,
                }}
                className={`fx-centered  fx-wrap  box-pad-v sticky extras-homepage`}
                ref={extrasRef}
              >
                <div className="sticky fit-container">
                  <SearchbarNOSTR />
                </div>
                <div className="sc-s-18 fit-container box-pad-h-m box-pad-v-m fx-centered fx-col fx-start-v">
                  <div
                    className="smart-widget"
                    style={{ minHeight: "48px", minWidth: "48px" }}
                  >
                    {" "}
                  </div>
                  <h4>What are smart widgets?</h4>
                  <p className="gray-c">We got your back! Check our demo</p>
                  <Link target="_blank" to={"/yakihonne-smart-widgets"}>
                    <button className="btn btn-normal">Read more</button>
                  </Link>
                </div>
                {notes.length > 0 && (
                  <div
                    className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v box-marg-s"
                    style={{
                      backgroundColor: "var(--c1-side)",
                      rowGap: "24px",
                      border: "none",
                    }}
                  >
                    <div className="fx-centered fx-start-h">
                      <h4>Trending notes</h4>
                    </div>
                    {notes.map((note) => {
                      return <NoteCard note={note} key={note.id} />;
                    })}
                  </div>
                )}
                <Footer />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const NoteCard = ({ note }) => {
  const { nostrAuthors, getNostrAuthor } = useContext(Context);
  const [authorData, setAuthorData] = useState(getEmptyNostrUser(note.pubkey));

  useEffect(() => {
    const fetchData = async () => {
      try {
        let auth = getNostrAuthor(note.pubkey);

        if (auth) {
          setAuthorData(auth);
        }
        return;
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, [nostrAuthors]);

  return (
    <div className="fit-container" key={note.id}>
      <div className="fit-container fx-scattered  box-marg-s">
        <AuthorPreview author={authorData} size={"small"} />
        <Link to={`/notes/${note.nEvent}`}>
          <div className="share-icon"></div>
        </Link>
      </div>
      <div className="fit-container">{note.parsedContent}</div>
    </div>
  );
};

const AuthorPreview = ({ author, size = "big" }) => {
  return (
    <div className="fx-centered fx-start-h ">
      <UserProfilePicNOSTR
        size={size === "big" ? 40 : 30}
        mainAccountUser={false}
        ring={false}
        user_id={author.pubkey}
        img={author.picture}
        metadata={author}
      />
      {size === "big" && (
        <div>
          <p className="p-bold">{author.display_name || author.name}</p>
          <p className="p-medium gray-c">
            @{author.name || author.display_name}
          </p>
        </div>
      )}
      {size !== "big" && (
        <div>
          <p className="p-bold p-medium">
            {author.display_name || author.name}
          </p>
          <p className="p-small gray-c">
            @{author.name || author.display_name}
          </p>
        </div>
      )}
    </div>
  );
};
