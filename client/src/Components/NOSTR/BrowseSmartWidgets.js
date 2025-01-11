import React, { useContext, useEffect, useRef, useState } from "react";
import { Context } from "../../Context/Context";
import { nip19, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import {
  filterRelays,
  getEmptyNostrUser,
  getParsed3000xContent,
} from "../../Helpers/Encryptions";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import LoadingDots from "../LoadingDots";
import PreviewWidget from "../SmartWidget/PreviewWidget";
const pool = new SimplePool();

export default function BrowseSmartWidgets({ setWidget, exit }) {
  
  const { nostrUser, nostrKeys, addNostrAuthors } = useContext(Context);
  const [comWidgets, setComWidgets] = useState([]);
  const [myWidgets, setMyWidgets] = useState([]);
  const [contentSource, setContentSource] = useState("community");
  const [myWidgetsLE, setMyWidgetsLE] = useState(undefined);
  const [comWidgetsLE, setComWidgetsLE] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [sub, setSub] = useState(false);

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
      filter: [{ kinds: [30031], until: comWidgetsLE, limit: 10 }],
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
      setMyWidgetsLE(
        comWidgets[comWidgets.length - 1]?.created_at || undefined
      );
      setComWidgetsLE(myWidgets[myWidgets.length - 1]?.created_at || undefined);
    };
    document
      .querySelector(".overlay-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".overlay-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [isLoading]);

  const handleContentSource = (source) => {
    if (source === contentSource) return;
    sub?.close();
    setContentSource(source);
  };

  return (
    <div
      className="fixed-container fx-centered fx-start-v"
      onClick={(e) => {
        e.stopPropagation();
        exit();
      }}
    >
      <div
        className="fit-height overlay-container fx-centered fx-start-v fx-start-h fx-col"
        style={{
          width: "min(100%,700px)",
          overflow: "scroll",
          border: "1px solid var(--pale-gray)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="box-pad-h-m  fit-container fx-col fx-centered fx-start-h fx-start-v"
          style={{ flex: 1.5, maxWidth: "700px" }}
        >
          <div
            className="fit-container sticky fx-centered fx-col"
            style={{ rowGap: "16px" }}
          >
            <div className="fit-container fx-centered ">
              <div
                className={`list-item fx-centered fx ${
                  contentSource === "community" ? "selected-list-item" : ""
                }`}
                onClick={() => handleContentSource("community")}
              >
                <p>Community</p>
              </div>
              <div
                className={`list-item fx-centered fx ${
                  contentSource === "self" ? "selected-list-item" : ""
                }`}
                onClick={() => handleContentSource("self")}
              >
                <p>My smart widget</p>
              </div>
              <div
                className="close"
                style={{ position: "static" }}
                onClick={exit}
              >
                <div></div>
              </div>
            </div>
          </div>
          <div
            className="fit-container fx-col fx-centered fx-start-h fx-start-v"
            style={{ width: "min(100%,700px)" }}
          >
            {contentSource === "community" &&
              comWidgets.map((widget) => {
                return (
                  <WidgetCard
                    widget={widget}
                    key={widget.id}
                    setWidget={setWidget}
                  />
                );
              })}
            {contentSource === "self" &&
              myWidgets.map((widget) => {
                return (
                  <WidgetCard
                    widget={widget}
                    key={widget.id}
                    setWidget={setWidget}
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
      </div>
    </div>
  );
}

const WidgetCard = ({ setWidget, widget }) => {
  const { nostrAuthors, getNostrAuthor, nostrKeys } = useContext(Context);
  const [authorData, setAuthorData] = useState(widget.author);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let auth = getNostrAuthor(widget.author.pubkey);

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
    <div
      className="box-pad-h-m box-pad-v-m sc-s-18 fx-centered fx-col fit-container fx-start-h fx-start-v"
      style={{ overflow: "visible" }}
    >
      <div className="fit-container fx-scattered">
        <AuthorPreview author={authorData} />
        <div
          className="fx-centered"
          onClick={() =>
            setWidget({
              ...widget,
              naddr: nip19.naddrEncode({
                pubkey: widget.pubkey,
                identifier: widget.d,
                kind: widget.kind,
              }),
            })
          }
        >
          <div
            className="round-icon-small round-icon-tooltip"
            data-tooltip="Add widget"
          >
            <div className="plus-sign"></div>
          </div>
        </div>
      </div>
      <PreviewWidget widget={widget.metadata} />
      {(widget.title || widget.description) && (
        <>
          <div
            className="fx-centered fx-col fx-start-h fx-start-v fit-container box-pad-v-s"
            style={{ rowGap: 0 }}
          >
            <p>{widget.title || "Untitled"}</p>
            {widget.description && (
              <p className="gray-c p-medium">{widget.description}</p>
            )}
            {!widget.description && (
              <p className="gray-c p-italic p-medium">No description</p>
            )}
          </div>
          <hr />
        </>
      )}
    </div>
  );
};

const AuthorPreview = ({ author }) => {
  return (
    <div className="fx-centered fx-start-h ">
      <UserProfilePicNOSTR
        size={40}
        mainAccountUser={false}
        ring={false}
        user_id={author.pubkey}
        img={author.picture}
        metadata={author}
      />
      <div>
        <p className="p-bold">{author.display_name || author.name}</p>
        <p className="p-medium gray-c">@{author.name || author.display_name}</p>
      </div>
    </div>
  );
};
