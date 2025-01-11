import React, { useContext, useEffect, useState } from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { Helmet } from "react-helmet";
import { Context } from "../../Context/Context";
import {
  SimplePool,
  nip04,
  nip44,
  getEventHash,
  generateSecretKey,
  finalizeEvent,
} from "nostr-tools";
import { bytesTohex, filterRelays } from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
import { getNoteTree } from "../../Helpers/Helpers";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import Date_ from "../../Components/Date_";
import { useRef } from "react";
import LoadingDots from "../../Components/LoadingDots";
import PagePlaceholder from "../../Components/PagePlaceholder";
import EmojisList from "../../Components/EmojisList";
import UploadFile from "../../Components/UploadFile";
import InitiConvo from "../../Components/NOSTR/InitConvo";
import axiosInstance from "../../Helpers/HTTP_Client";

export default function DMS() {
  const {
    nostrKeys,
    chatrooms,
    setChatrooms,
    chatContacts,
    initDMS,
    userFollowings,
    mutedList,
  } = useContext(Context);
  const [selectedConvo, setSelectedConvo] = useState(false);
  const [isConvoLoading, setIsConvoLoading] = useState(false);
  const [sortedInbox, setSortedInbox] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [searchedConvos, setSearchedConvo] = useState([]);
  const [contentType, setContentType] = useState("following");
  const [showSearch, setShowSearch] = useState("");
  const [initConv, setInitConv] = useState(false);
  const [msgsCount, setMsgsCount] = useState({
    followings: 0,
    known: 0,
    unknown: 0,
  });

  const [mbHide, setMbHide] = useState(true);

  useEffect(() => {
    let followings = 0;
    let known = 0;
    let unknown = 0;
    let tempChatrooms = chatrooms
      .map((chatroom) => {
        let contact = chatContacts.find(
          (contact) => contact.pubkey === chatroom.pubkey
        );

        let isFollowing = userFollowings?.includes(chatroom.pubkey)
          ? "following"
          : false;
        let isUnknown = false;
        let isKnown = false;
        if (!isFollowing) {
          isUnknown = chatroom.convo.find(
            (conv) => conv.pubkey === nostrKeys.pub
          )
            ? false
            : "unknown";

          if (!isUnknown) isKnown = "known";
        }
        if (isFollowing) followings = followings + 1;
        if (isUnknown) unknown = unknown + 1;
        if (isKnown) known = known + 1;
        if (contact)
          return {
            ...contact,
            ...chatroom,
            type: isFollowing || isUnknown || isKnown,
          };
        return {
          ...chatroom,
          picture: "",
          display_name: chatroom.pubkey.substring(0, 10),
          name: chatroom.pubkey.substring(0, 10),
          type: isFollowing || isUnknown || isKnown,
        };
      })
      .filter((chatroom) => !mutedList.includes(chatroom.pubkey));

    setMsgsCount({ followings, known, unknown });
    setSortedInbox(tempChatrooms);
    if (selectedConvo) {
      let updatedConvo = chatrooms.find(
        (inbox) => inbox.pubkey === selectedConvo.pubkey
      );
      handleSelectedConversation(
        {
          ...updatedConvo,
          picture: selectedConvo.picture,
          display_name: selectedConvo.display_name,
          name: selectedConvo.name,
        },
        true
      );
    }
    setInitConv(false);
  }, [chatrooms, chatContacts, userFollowings]);

  useEffect(() => {
    if (!nostrKeys) setSortedInbox([]);
    setSelectedConvo(false);
    setIsConvoLoading(false);
    // }
  }, [nostrKeys]);

  const handleSelectedConversation = async (
    conversation,
    ignoreLoading = false
  ) => {
    try {
      if (!ignoreLoading) {
        setIsConvoLoading(true);
        setSelectedConvo(false);
      }
      let tempConvo = await Promise.all(
        conversation.convo.map(async (convo) => {
          let content = await getNoteTree(convo.content);
          return {
            ...convo,
            content,
            raw_content: convo.content,
          };
        })
      );
      setSelectedConvo({
        ...conversation,
        convo: tempConvo,
      });
      handleUpdateConversation(conversation);
      setMbHide(false);
      if (!ignoreLoading) {
        setIsConvoLoading(false);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleSearch = (e) => {
    let value = e.target.value;

    if (!value) {
      setKeyword("");
      setSearchedConvo([]);
      return;
    }

    let tempConvo = sortedInbox.filter(
      (convo) =>
        convo.display_name.toLowerCase().includes(value.toLowerCase()) ||
        convo.name.toLowerCase().includes(value.toLowerCase())
    );
    setKeyword(value);
    setSearchedConvo(tempConvo);
  };

  const handleContentType = (type) => {
    if (type === contentType) return;
    setContentType(type);
  };

  const handleShowSearch = () => {
    if (showSearch) {
      setShowSearch(false);
      setKeyword("");
      setSearchedConvo([]);
      if (selectedConvo) setContentType(selectedConvo.type);
      return;
    }
    setShowSearch(true);
  };

  const handleUpdateConversation = (event) => {
    if (event.checked) return;
    let tempEvent = {
      pubkey: event.pubkey,
      convo: event.convo,
      id: event.id,
      last_message: event.last_message,
      checked: true,
    };
    let tempSortedInbox = Array.from(sortedInbox);
    let tempUnsortedInbox = Array.from(chatrooms);
    let findIndex = tempSortedInbox.findIndex(
      (item) => item.pubkey === event.pubkey
    );
    tempSortedInbox[findIndex].checked = true;
    tempUnsortedInbox[findIndex].checked = true;
    setSortedInbox(tempSortedInbox);
    setChatrooms(tempUnsortedInbox);
    let openDB = indexedDB.open("yaki-nostr", 3);
    openDB.onsuccess = () => {
      let db = openDB.result;
      db.onversionchange = function () {
        db.close();
        alert("Database is outdated, please reload the page.");
      };
      let transaction = db.transaction(["chatrooms"], "readwrite");
      let chatrooms_ = transaction.objectStore("chatrooms");

      chatrooms_.put(tempEvent, event.pubkey);
    };
  };

  if (!nostrKeys)
    return (
      <div>
        <Helmet>
          <title>Yakihonne | Messages</title>
          <meta
            name="description"
            content={"Your end-to-end encrypted inbox"}
          />
          <meta
            property="og:description"
            content={"Your end-to-end encrypted inbox"}
          />

          <meta property="og:url" content={`https://yakihonne.com/messages`} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content="Yakihonne | Messages" />
          <meta property="twitter:title" content="Yakihonne | Messages" />
          <meta
            property="twitter:description"
            content={"Your end-to-end encrypted inbox"}
          />
        </Helmet>
        <div className="fit-container fx-centered" style={{ columnGap: 0 }}>
          <div className="main-container">
            <SidebarNOSTR />
            <main
              className="main-page-nostr-container"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <PagePlaceholder page={"nostr-not-connected"} />
            </main>
          </div>
        </div>
      </div>
    );

  if (!(nostrKeys.sec || nostrKeys.ext))
    return (
      <div>
        <Helmet>
          <title>Yakihonne | Messages</title>
          <meta
            name="description"
            content={"Your end-to-end encrypted inbox"}
          />
          <meta
            property="og:description"
            content={"Your end-to-end encrypted inbox"}
          />

          <meta property="og:url" content={`https://yakihonne.com/messages`} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content="Yakihonne | Messages" />
          <meta property="twitter:title" content="Yakihonne | Messages" />
          <meta
            property="twitter:description"
            content={"Your end-to-end encrypted inbox"}
          />
        </Helmet>
        <div className="fit-container fx-centered" style={{ columnGap: 0 }}>
          <div className="main-container">
            <SidebarNOSTR />
            <main
              className="main-page-nostr-container"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <PagePlaceholder page={"nostr-unauthorized-messages"} />
            </main>
          </div>
        </div>
      </div>
    );

  if (initDMS)
    return (
      <div>
        <Helmet>
          <title>Yakihonne | Messages</title>
          <meta
            name="description"
            content={"Your end-to-end encrypted inbox"}
          />
          <meta
            property="og:description"
            content={"Your end-to-end encrypted inbox"}
          />

          <meta property="og:url" content={`https://yakihonne.com/messages`} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content="Yakihonne | Messages" />
          <meta property="twitter:title" content="Yakihonne | Messages" />
          <meta
            property="twitter:description"
            content={"Your end-to-end encrypted inbox"}
          />
        </Helmet>
        <div className="fit-container fx-centered" style={{ columnGap: 0 }}>
          <div className="main-container">
            <SidebarNOSTR />
            <main
              className="main-page-nostr-container"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <PagePlaceholder page={"nostr-DMS-waiting"} />
            </main>
          </div>
        </div>
      </div>
    );

  return (
    <div>
      <Helmet>
        <title>Yakihonne | Messages</title>
        <meta name="description" content={"Your end-to-end encrypted inbox"} />
        <meta
          property="og:description"
          content={"Your end-to-end encrypted inbox"}
        />

        <meta property="og:url" content={`https://yakihonne.com/messages`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content="Yakihonne | Messages" />
        <meta property="twitter:title" content="Yakihonne | Messages" />
        <meta
          property="twitter:description"
          content={"Your end-to-end encrypted inbox"}
        />
      </Helmet>
      {initConv && <InitiConvo exit={() => setInitConv(false)} />}
      <div
        className="fit-container fx-centered"
        style={{ columnGap: 0, overflow: "hidden" }}
      >
        <div className="main-container">
          <SidebarNOSTR />
          <main
            className="main-page-nostr-container"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <div
              className="fit-container fx-centered fx-start-h fx-stretch DM-container"
              style={{
                columnGap: 0,
                width: "min(100%,1200px)",
              }}
            >
              <div
                style={{
                  // width: "450px",
                  flex: "1 1 400px",
                  border: "1px solid var(--dim-gray)",

                  overflowY: "scroll",
                }}
                className={!mbHide ? "mb-hide-800" : ""}
              >
                <div className="box-pad-h-m box-pad-v-m fit-container fx-scattered">
                  <h4>Messages</h4>
                  <div className="fx-centered">
                    {!showSearch && (
                      <div onClick={handleShowSearch}>
                        <div className="search-24"></div>
                      </div>
                    )}
                    <div onClick={() => setInitConv(true)}>
                      <div className="env-edit-24"></div>
                    </div>
                  </div>
                </div>
                {showSearch && (
                  <div
                    style={{
                      borderTop: "1px solid var(--very-dim-gray)",
                      borderBottom: "1px solid var(--very-dim-gray)",
                    }}
                    className="slide-down fx-scattered box-pad-h-m"
                  >
                    <input
                      type="text"
                      className="if ifs-full if-no-border"
                      placeholder="Search for conversation"
                      value={keyword}
                      onChange={handleSearch}
                      autoFocus
                    />

                    <div
                      className="close"
                      style={{ position: "static" }}
                      onClick={handleShowSearch}
                    >
                      <div></div>
                    </div>
                  </div>
                )}
                {!showSearch && (
                  <div
                    className="fx-centered fit-container box-marg-s slide-up"
                    style={{ columnGap: 0 }}
                  >
                    <div
                      style={{
                        padding: ".5rem .5rem",
                        borderBottom: `2px solid ${
                          contentType == "following"
                            ? "var(--c1)"
                            : "var(--dim-gray)"
                        }`,
                      }}
                      onClick={() => handleContentType("following")}
                      className="pointer fx fx-centered"
                    >
                      <span
                        className={
                          contentType === "following" ? "c1-c" : "gray-c"
                        }
                      >
                        Contacts ({msgsCount.followings})
                      </span>
                    </div>
                    <div
                      style={{
                        padding: ".5rem .5rem",
                        borderBottom: `2px solid ${
                          contentType == "known"
                            ? "var(--c1)"
                            : "var(--dim-gray)"
                        }`,
                      }}
                      onClick={() => handleContentType("known")}
                      className="pointer fx fx-centered"
                    >
                      <span
                        className={contentType === "known" ? "c1-c" : "gray-c"}
                      >
                        Known ({msgsCount.known})
                      </span>
                    </div>
                    <div
                      style={{
                        padding: ".5rem .5rem",
                        borderBottom: `2px solid ${
                          contentType == "unknown"
                            ? "var(--c1)"
                            : "var(--dim-gray)"
                        }`,
                      }}
                      onClick={() => handleContentType("unknown")}
                      className="pointer fx fx-centered"
                    >
                      <span
                        className={
                          contentType === "unknown" ? "c1-c" : "gray-c"
                        }
                      >
                        Unknown ({msgsCount.unknown})
                      </span>
                    </div>
                  </div>
                )}
                <div
                  className="fit-container fx-centered fx-wrap"
                  style={{ rowGap: 0, overflow: "auto" }}
                >
                  {!showSearch &&
                    sortedInbox.map((convo) => {
                      if (convo.type === contentType)
                        return (
                          <div
                            className="fit-container fx-scattered  box-pad-h option box-pad-v-s pointer slide-up"
                            key={convo.id}
                            style={{
                              backgroundColor:
                                selectedConvo.id === convo.id
                                  ? "var(--very-dim-gray)"
                                  : "",
                            }}
                            onClick={() =>
                              handleSelectedConversation({ ...convo })
                            }
                          >
                            <div className="fx-centered">
                              <div>
                                <UserProfilePicNOSTR
                                  img={convo.picture}
                                  size={40}
                                  user_id={convo.pubkey}
                                  mainAccountUser={false}
                                  ring={false}
                                  allowClick={false}
                                />
                              </div>
                              <div>
                                <p>
                                  {convo.display_name ||
                                    convo.name ||
                                    convo.pubkey.substring(0, 10)}
                                </p>
                                <div className="fx-centered fx-start-h">
                                  {convo.convo[convo.convo.length - 1].peer && (
                                    <p className="p-medium p-one-line">You:</p>
                                  )}
                                  <p
                                    className="gray-c p-medium p-one-line"
                                    style={{ maxWidth: "100px" }}
                                  >
                                    {
                                      convo.convo[convo.convo.length - 1]
                                        .content
                                    }
                                  </p>
                                  <p className="orange-c p-medium">
                                    <Date_
                                      toConvert={
                                        new Date(convo.last_message * 1000)
                                      }
                                    />
                                  </p>
                                </div>
                              </div>
                            </div>
                            {!convo.checked && (
                              <div
                                style={{
                                  minWidth: "8px",
                                  aspectRatio: "1/1",
                                  backgroundColor: "var(--red-main)",
                                  borderRadius: "var(--border-r-50)",
                                }}
                              ></div>
                            )}
                          </div>
                        );
                    })}
                  {keyword &&
                    searchedConvos.map((convo) => {
                      return (
                        <div
                          className="fit-container fx-scattered box-pad-h option box-pad-v-s pointer"
                          key={convo.id}
                          onClick={() =>
                            handleSelectedConversation({ ...convo })
                          }
                        >
                          <div className="fx-centered">
                            <div>
                              <UserProfilePicNOSTR
                                img={convo.picture}
                                size={40}
                                user_id={convo.pubkey}
                                mainAccountUser={false}
                                ring={false}
                                allowClick={false}
                              />
                            </div>
                            <div>
                              <p>
                                {convo.display_name ||
                                  convo.name ||
                                  convo.pubkey.substring(0, 10)}
                              </p>
                              <div className="fx-centered fx-start-h">
                                {convo.convo[convo.convo.length - 1].peer && (
                                  <p className="p-medium p-one-line">You:</p>
                                )}
                                <p
                                  className="gray-c p-medium p-one-line"
                                  style={{ maxWidth: "100px" }}
                                >
                                  {convo.convo[convo.convo.length - 1].content}
                                </p>
                                <p className="orange-c p-medium">
                                  <Date_
                                    toConvert={
                                      new Date(convo.last_message * 1000)
                                    }
                                  />
                                </p>
                              </div>
                            </div>
                          </div>
                          {!convo.checked && (
                            <div
                              style={{
                                minWidth: "8px",
                                aspectRatio: "1/1",
                                backgroundColor: "var(--red-main)",
                                borderRadius: "var(--border-r-50)",
                              }}
                            ></div>
                          )}
                        </div>
                      );
                    })}
                  {keyword && !searchedConvos.length && (
                    <div
                      style={{ height: "50vh" }}
                      className="box-pad-h fx-centered fx-col"
                    >
                      <h4>No Messages</h4>
                      <p className="gray-c p-centered">
                        No messages were found from your search, try another one
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  flex: "1 1 600px",
                  border: "1px solid var(--dim-gray)",
                }}
                className={mbHide ? "mb-hide-800" : ""}
              >
                {isConvoLoading && (
                  <div
                    className="fit-container fx-centered"
                    style={{ height: "100%" }}
                  >
                    <span className="loader"></span>
                  </div>
                )}
                {!selectedConvo && !isConvoLoading && (
                  <PagePlaceholder page={"nostr-DMS"} />
                )}
                {selectedConvo && (
                  <ConversationBox
                    convo={selectedConvo}
                    back={() => setMbHide(!mbHide)}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const ConversationBox = ({ convo, back }) => {
  const {
    nostrKeys,
    nostrUser,
    setToPublish,
    isDarkMode,
    setUpdatedActionFromYakiChest,
    updateYakiChestStats,
  } = useContext(Context);
  const convoContainerRef = useRef(null);
  const inputFieldRef = useRef(null);
  const [message, setMessage] = useState("");
  const [legacy, setLegacy] = useState(true);
  const [replayOn, setReplayOn] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [showEmojisList, setShowEmojisList] = useState(false);
  const [peerName, setPeerName] = useState(
    convo.display_name.substring(0, 10) ||
      convo.name.substring(0, 10) ||
      convo.pubkey.substring(0, 10)
  );
  useEffect(() => {
    if (convoContainerRef.current) {
      convoContainerRef.current.scrollTop =
        convoContainerRef.current.scrollHeight;
    }

    setShowProgress(false);
  }, [convo]);

  const handleSendMessage = async () => {
    if (
      !message ||
      !nostrKeys ||
      (nostrKeys && !(nostrKeys.ext || nostrKeys.sec))
    )
      return;

    let relaysToPublish = nostrUser
      ? filterRelays(relaysOnPlatform, nostrUser?.relays || [])
      : relaysOnPlatform;
    if (legacy) {
      let encryptedMessage = "";
      if (nostrKeys.ext) {
        encryptedMessage = await window.nostr.nip04.encrypt(
          convo.pubkey,
          message
        );
      } else {
        encryptedMessage = await nip04.encrypt(
          nostrKeys.sec,
          convo.pubkey,
          message
        );
      }
      setMessage("");
      setReplayOn(false);
      setShowProgress(true);
      let tags = [];
      tags.push(["p", convo.pubkey, convo.display_name || convo.name || ""]);
      if (replayOn) tags.push(["e", replayOn.id]);
      let created_at = Math.floor(Date.now() / 1000);
      let tempEvent = {
        created_at,
        kind: 4,
        content: encryptedMessage,
        tags,
      };
      if (nostrKeys.ext) {
        try {
          tempEvent = await window.nostr.signEvent(tempEvent);
        } catch (err) {
          console.log(err);
          return false;
        }
      } else {
        tempEvent = finalizeEvent(tempEvent, nostrKeys.sec);
      }
      setToPublish({
        eventInitEx: tempEvent,
        allRelays: relaysToPublish,
      });
    }
    if (!legacy) {
      let { sender_event, receiver_event } = await getGiftWrap();
      setMessage("");
      setReplayOn(false);
      setShowProgress(true);
      let response = await initPublishing(
        relaysToPublish,
        sender_event,
        receiver_event
      );

      if (response) {
        let action_key =
          convo.pubkey ===
          "20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3"
            ? "dms-10"
            : "dms-5";
        updateYakiChest(action_key);
      }
    }
  };

  const updateYakiChest = async (action_key) => {
    try {
      let data = await axiosInstance.post("/api/v1/yaki-chest", {
        action_key,
      });
      let { user_stats, is_updated } = data.data;

      if (is_updated) {
        setUpdatedActionFromYakiChest(is_updated);
        updateYakiChestStats(user_stats);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const getGiftWrap = async () => {
    let g_sk_1 = bytesTohex(generateSecretKey());
    let g_sk_2 = bytesTohex(generateSecretKey());

    let [signedKind13_1, signedKind13_2] = await Promise.all([
      getEventKind13(convo.pubkey),
      getEventKind13(nostrKeys.pub),
    ]);

    let content_1 = nip44.v2.encrypt(
      JSON.stringify(signedKind13_1),
      nip44.v2.utils.getConversationKey(g_sk_1, convo.pubkey)
    );
    let content_2 = nip44.v2.encrypt(
      JSON.stringify(signedKind13_2),
      nip44.v2.utils.getConversationKey(g_sk_2, nostrKeys.pub)
    );
    let event_1 = {
      created_at: Math.floor(Date.now() / 1000) - 432000,
      kind: 1059,
      tags: [["p", convo.pubkey]],
      content: content_1,
    };
    let event_2 = {
      created_at: Math.floor(Date.now() / 1000) - 432000,
      kind: 1059,
      tags: [["p", nostrKeys.pub]],
      content: content_2,
    };
    event_1 = finalizeEvent(event_1, g_sk_1);
    event_2 = finalizeEvent(event_2, g_sk_2);
    return { sender_event: event_2, receiver_event: event_1 };
  };

  const getEventKind14 = () => {
    let event = {
      pubkey: nostrKeys.pub,
      created_at: Math.floor(Date.now() / 1000),
      kind: 14,
      tags: [
        ["p", convo.pubkey],
        ["p", nostrKeys.pub],
      ],
      content: message,
    };

    if (replayOn) event.tags.push(["e", replayOn.id]);
    event.id = getEventHash(event);
    return event;
  };

  const getEventKind13 = async (pubkey) => {
    let unsignedKind14 = getEventKind14();
    let content = nostrKeys.sec
      ? nip44.default.v2.encrypt(
          JSON.stringify(unsignedKind14),
          nip44.v2.utils.getConversationKey(nostrKeys.sec, pubkey)
        )
      : await window.nostr.nip44.encrypt(
          pubkey,
          JSON.stringify(unsignedKind14)
        );
    let event = {
      created_at: Math.floor(Date.now() / 1000) - 432000,
      kind: 13,
      tags: [],
      content,
    };
    event = nostrKeys.sec
      ? finalizeEvent(event, nostrKeys.sec)
      : await window.nostr.signEvent(event);
    return event;
  };

  const getReply = (ID) => {
    let msg = convo.convo.find((conv) => conv.id === ID);
    if (!msg) return false;
    return { content: msg.raw_content, self: msg.pubkey === nostrKeys.pub };
  };

  if (!convo) return;
  return (
    <div
      className="fit-container fx-scattered fx-col"
      style={{ height: "100%", rowGap: 0 }}
      onClick={() => {
        if (inputFieldRef.current) inputFieldRef.current.focus();
        setShowEmojisList(false);
      }}
    >
      <div
        className="fit-container fx-scattered box-pad-h-m box-pad-v-m"
        style={{ position: "sticky", top: 0 }}
      >
        <div className="fx-centered">
          <div className="round-icon desk-hide" onClick={back}>
            <div className="arrow" style={{ rotate: "90deg" }}></div>
          </div>
          <UserProfilePicNOSTR
            img={convo.picture}
            size={40}
            user_id={convo.pubkey}
            mainAccountUser={false}
            ring={false}
          />
          <div>
            <p>
              {convo.display_name.substring(0, 10) ||
                convo.name.substring(0, 10) ||
                convo.pubkey.substring(0, 10)}
            </p>
            <p className="p-medium gray-c">
              @
              {convo.name.substring(0, 10) ||
                convo.display_name.substring(0, 10)}
            </p>
          </div>
        </div>
        {(nostrKeys.sec || window?.nostr?.nip44) && (
          <div
            className="fx-centered round-icon-tooltip"
            data-tooltip={legacy ? "Switch NIP-44 on" : "Switch back to legacy"}
          >
            {!legacy && (
              <p className="p-medium green-c slide-left">NIP-44 ON</p>
            )}
            {legacy && <p className="p-medium gray-c slide-right">NIP-04</p>}
            <div
              className={`toggle ${legacy ? "toggle-dim-gray" : ""} ${
                !legacy ? "toggle-green" : "toggle-dim-gray"
              }`}
              onClick={() => setLegacy(!legacy)}
            ></div>
          </div>
        )}
      </div>
      <div
        className="fx-centered fx-start-h fx-col box-pad-h-m box-pad-v-m fit-container"
        style={{ height: "calc(100% - 160px)", overflow: "auto" }}
        ref={convoContainerRef}
      >
        {convo.convo.map((convo) => {
          let reply = convo.replyID ? getReply(convo.replyID) : false;
          return (
            <div
              key={convo.id}
              className="fit-container fx-centered fx-col"
              style={
                reply
                  ? {
                      borderRight: convo.peer
                        ? "2px solid var(--orange-main)"
                        : "",
                      borderLeft: !convo.peer
                        ? "2px solid var(--orange-main)"
                        : "",
                      paddingRight: convo.peer ? "1rem" : "",
                      paddingLeft: !convo.peer ? "1rem" : "",
                    }
                  : {}
              }
            >
              {reply && (
                <div
                  className={`convo-message fit-container  fx-centered fx-col ${
                    !convo.peer ? "fx-start-v" : "fx-end-v"
                  }`}
                >
                  {convo.peer && reply.self && (
                    <p className="p-italic p-medium orange-c">
                      You replied to yourself
                    </p>
                  )}
                  {convo.peer && !reply.self && (
                    <p className="p-italic p-medium orange-c">
                      You replied to {peerName}
                    </p>
                  )}
                  {!convo.peer && reply.self && (
                    <p className="p-italic p-medium orange-c">
                      {peerName} replied to you
                    </p>
                  )}
                  {!convo.peer && !reply.self && (
                    <p className="p-italic p-medium orange-c">
                      {peerName} replied to {peerName}
                    </p>
                  )}
                  <div
                    className="sc-s-18 box-pad-h-m box-pad-v-m fx-centered fx-start-h fx-start-v fx-col"
                    style={{
                      overflow: "visible",
                      maxWidth: "min(90%, 500px)",
                    }}
                  >
                    <p className="p-one-line">{reply.content}</p>
                  </div>
                </div>
              )}
              <div
                className={`convo-message fit-container  fx-centered ${
                  !convo.peer ? "fx-start-h" : "fx-end-h"
                }`}
              >
                {convo.peer && (
                  <div>
                    <div
                      className="round-icon slide-left"
                      style={{
                        border: "none",
                        minHeight: "32px",
                        minWidth: "32px",
                        backgroundColor: "var(--dim-gray)",
                        transform: "scaleX(-1)",
                      }}
                      onClick={() => setReplayOn(convo)}
                    >
                      <p className="gray-c">&#x27A6;</p>
                    </div>
                  </div>
                )}

                <div
                  className="sc-s-18 box-pad-h-m box-pad-v-m fx-centered fx-start-h fx-start-v fx-col"
                  style={{
                    backgroundColor: convo.peer
                      ? "var(--c1-side)"
                      : "var(--dim-gray)",
                    borderBottomLeftRadius: !convo.peer ? 0 : "inital",
                    borderBottomRightRadius: convo.peer ? 0 : "inital",
                    maxWidth: "min(90%, 500px)",
                    border: "none",
                    overflow: "visible",
                  }}
                >
                  {convo.content || <LoadingDots />}
                  <div
                    className="fx-centered fx-start-h round-icon-tooltip pointer"
                    data-tooltip={
                      convo.kind === 4
                        ? "Legacy standard"
                        : "Protected by the new standard"
                    }
                  >
                    {convo.kind === 4 && (
                      <>
                        <div>
                          <div className="unprotected"></div>
                        </div>
                        <p
                          className="gray-c p-medium"
                          style={{ fontStyle: "italic" }}
                        >
                          <Date_
                            toConvert={new Date(convo.created_at * 1000)}
                            time={true}
                          />
                        </p>
                      </>
                    )}
                    {convo.kind !== 4 && (
                      <>
                        <div>
                          <div className="protected"></div>
                        </div>
                        <p
                          className="green-c p-medium"
                          style={{ fontStyle: "italic" }}
                        >
                          <Date_
                            toConvert={new Date(convo.created_at * 1000)}
                            time={true}
                          />
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {!convo.peer && (
                  <div>
                    <div
                      className="round-icon slide-right"
                      style={{
                        border: "none",
                        minHeight: "32px",
                        minWidth: "32px",
                        backgroundColor: "var(--dim-gray)",
                        transform: "scaleX(-1)",
                      }}
                      onClick={() => setReplayOn(convo)}
                    >
                      <p className="gray-c">&#x27A6;</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showProgress && <SendingInProgress />}
      {replayOn && (
        <div
          className="fit-container box-pad-h-m box-pad-v-m fx-scattered slide-up"
          style={{
            paddingBottom: 0,
            borderTop: "1px solid var(--very-dim-gray)",
          }}
        >
          <div>
            <p className="gray-c p-medium">
              Reply to{" "}
              {replayOn.pubkey === nostrKeys.pub ? (
                "yourself"
              ) : (
                <>
                  {convo.display_name.substring(0, 10) ||
                    convo.name.substring(0, 10) ||
                    convo.pubkey.substring(0, 10)}
                </>
              )}
            </p>
            <p className=" p-one-line" style={{ width: "min(90%, 500px)" }}>
              {replayOn.raw_content}
            </p>
          </div>
          <div
            className="close"
            style={{ position: "static" }}
            onClick={() => setReplayOn(false)}
          >
            <div></div>
          </div>
        </div>
      )}
      <div className="fit-container box-pad-h-m box-pad-v-m fx-scattered">
        <form
          className="fit-container fx-scattered"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            className="if ifs-full"
            placeholder="Type a message.."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            ref={inputFieldRef}
            disabled={showProgress}
          />
          <div>
            {showEmojisList && (
              <div style={{ position: "relative" }}>
                <EmojisList
                  onClick={(e, data) => {
                    e.stopPropagation();
                    setMessage(message ? `${message} ${data}` : data);
                    setShowEmojisList(false);
                    inputFieldRef.current.focus();
                  }}
                />
              </div>
            )}
            <div
              className="round-icon"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojisList(true);
              }}
            >
              <p className="p-big">&#9786;</p>
            </div>
          </div>
          <UploadFile
            round={true}
            setImageURL={(data) => setMessage(`${message} ${data}`)}
            setIsUploadsLoading={() => null}
            setFileMetadata={() => null}
          />
          <button className="round-icon">
            <p style={{ rotate: "-45deg" }}>&#x27A4;</p>
          </button>
        </form>
      </div>
    </div>
  );
};

const SendingInProgress = () => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    let tempW = 0;
    let interval = setInterval(() => {
      setWidth(tempW);
      if (tempW <= 90) tempW = tempW + 2;
    }, 5);
    return () => {
      clearInterval(interval);
    };
  }, []);
  return (
    <div className="fit-container">
      <div
        style={{
          width: `${width}%`,
          height: "4px",
          backgroundColor: "var(--green-main)",
          transition: ".2s ease-in-out",
        }}
      ></div>
    </div>
  );
};

const initPublishing = async (relays, event1, event2) => {
  try {
    let pool_ev1 = new SimplePool();
    let pool_ev2 = new SimplePool();

    let [res1, res2] = await Promise.race([
      Promise.allSettled(pool_ev1.publish(relays, event1)),
      Promise.allSettled(pool_ev2.publish(relays, event2)),
    ]);

    return true;
  } catch (err) {
    console.log(err);
  }
};
