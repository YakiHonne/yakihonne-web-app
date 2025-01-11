import { SimplePool, nip19 } from "nostr-tools";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Context } from "../../Context/Context";
import {
  filterRelays,
  getEmptyNostrUser,
  getParsed3000xContent,
} from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { getVideoContent } from "../../Helpers/Helpers";
import Date_ from "../Date_";
import { Link } from "react-router-dom";
import Slider from "../Slider";
import LoadingDots from "../LoadingDots";

const pool = new SimplePool();

const types = {
  un: "somebody has left an uncensored note to your flash news",
  fn: "has posted a flash news",
  arts: "has published an article",
  cur: "has published a curation",
  vid: "has posted a video",
  mention: "has mentioned you",
  comments: "commented on",
  reactions: "reacted",
  sealed: "An uncensored note you rated got sealed",
  zaps: "Has zapped you",
};

const checkEventType = (event) => {
  if (event.kind === 1) {
    let isThereParent = event.tags.find((tag) => ["e", "a"].includes(tag[0]));
    let isFN = event.tags.find(
      (tag) => tag[0] === "l" && tag[1] === "FLASH NEWS"
    );
    let isUN = event.tags.find(
      (tag) => tag[0] === "l" && tag[1] === "UNCENSORED NOTE"
    );

    if (isThereParent) {
      if (isUN) {
        return { type: "un", part_1: types.un, show_profile: false };
      } else
        return { type: "comments", part_1: types.comments, show_profile: true };
    }
    if (isFN) {
      return { type: "fn", part_1: types.fn, show_profile: true };
    }
    if (!isThereParent)
      return { type: "mention", part_1: types.mention, show_profile: true };
  }

  if (event.kind === 30023) {
    return { type: "arts", part_1: types.arts, show_profile: true };
  }
  if (event.kind === 30004) {
    return { type: "cur", part_1: types.cur, show_profile: true };
  }
  if (event.kind === 34235) {
    return { type: "vid", part_1: types.vid, show_profile: true };
  }
  if (event.kind === 7) {
    return { type: "reactions", part_1: types.reactions, show_profile: true };
  }
  if (event.kind === 30078) {
    return { type: "sealed", part_1: types.sealed, show_profile: true };
  }
  if (event.kind === 9735) {
    return { type: "zaps", part_1: types.zaps, show_profile: true };
  }
};

export default function NotificationCenter({ icon = false }) {
  const { nostrKeys, nostrUser, addNostrAuthors, setToast, userFollowings } =
    useContext(Context);
  const [showNotificationsCenter, setShowNotificationsCenter] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [allEventsIDs, setAllEventsIDs] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [contentFrom, setContentFrom] = useState("all");
  const [subInstance, setSubInstance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const fetchData = () => {
      const relaysToFetchFrom = filterRelays(
        relaysOnPlatform,
        nostrUser?.relays || []
      );
      setIsLoading(true);
      const tempAuth = [];
      const tempEvents = [];
      const sub = pool.subscribeMany(
        relaysToFetchFrom,
        [
          {
            kinds: [1],
            "#p": [nostrKeys.pub],
            limit: 20,
          },
          {
            kinds: [7],
            "#p": [nostrKeys.pub],
            limit: 20,
          },
          {
            kinds: [9735],
            "#p": [nostrKeys.pub],
            limit: 20,
          },
          {
            kinds: [30023, 30004, 34235],
            authors: userFollowings,
            limit: 20,
          },
          {
            kinds: [1],
            authors: userFollowings,
            "#l": ["FLASH NEWS"],
            limit: 20,
          },
          {
            kinds: [30078],
            "#p": [nostrKeys.pub],
            limit: 20,
          },
        ],
        {
          onevent(event) {
            let tempEvent = event.tags.find((tag) => tag[0] === "e");
            if (tempEvent) tempEvents.push(tempEvent[1]);
            if (event.kind === 9735) {
              let description = JSON.parse(
                event.tags.find((tag) => tag[0] === "description")[1]
              );
              tempAuth.push(description.pubkey);
            } else tempAuth.push(event.pubkey);

            setNotifications((prev) => {
              let elem = prev.find((elem) => elem.id === event.id);

              return elem
                ? prev
                : [event, ...prev].sort(
                    (ev1, ev2) => ev2.created_at - ev1.created_at
                  );
            });

            if (Date.now() / 1000 - event.created_at <= 5)
              setToast({
                type: 1,
                desc: "New Notification!",
              });
          },
          oneose() {
            setAllEventsIDs(tempEvents);
            addNostrAuthors(tempAuth);
            setIsLoading(false);
          },
        }
      );
      setSubInstance(sub);
    };
    if (nostrKeys && userFollowings) {
      if (subInstance) {
        subInstance.close();
      }
      setNotifications([]);
      fetchData();
    }
  }, [nostrKeys, userFollowings]);

  useEffect(() => {
    const relaysToFetchFrom = filterRelays(
      relaysOnPlatform,
      nostrUser?.relays || []
    );
    const tempAuth = [];
    const sub = pool.subscribeMany(
      relaysToFetchFrom,
      [
        {
          kinds: [1],
          ids: allEventsIDs,
        },
      ],
      {
        onevent(event) {
          setAllEvents((prev) => {
            return [event, ...prev];
          });
        },
        oneose() {
          addNostrAuthors(tempAuth);
        },
      }
    );
  }, [allEventsIDs]);

  const switchContentSource = (source) => {
    if (source === contentFrom) return;
    setContentFrom(source);
    notificationsRef.current.scrollTop = 0;
  };

  return (
    <>
      {showNotificationsCenter && (
        <div
          className="fixed-container fx-centered"
          onClick={(e) => {
            e.stopPropagation();
            setShowNotificationsCenter(false);
          }}
        >
          <div
            style={{
              width: "min(100%, 600px)",
              height: "100%",
            }}
            className=" fx-centered fx-col fx-start-h fx-start-v"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div
              className="fit-container sticky"
              style={{
                backgroundColor: "transparent",
                zIndex: 100,
                top: "unset",
              }}
            >
              <div
                className="fit-container fx-scattered box-pad-h box-pad-v"
                style={{
                  position: "sticky",
                }}
              >
                <h3>Notifications</h3>
                <div
                  className="close"
                  style={{ position: "static", filter: "invert()" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotificationsCenter(false);
                  }}
                >
                  <div></div>
                </div>
              </div>
              <div className="fit-container box-pad-h">
                <Slider
                  items={[
                    <div
                      className={`list-item fx-centered fx-shrink  ${
                        contentFrom === "all" ? "selected-list-item" : ""
                      }`}
                      style={{ padding: " .5rem 1rem" }}
                      onClick={() => switchContentSource("all")}
                    >
                      All
                    </div>,
                    <div
                      className={`list-item fx-centered fx-shrink ${
                        contentFrom === "mention" ? "selected-list-item" : ""
                      }`}
                      style={{ padding: " .5rem 1rem" }}
                      onClick={() => switchContentSource("mention")}
                    >
                      Mentions
                    </div>,
                    <div
                      className={`list-item fx-centered fx-shrink ${
                        contentFrom === "zaps" ? "selected-list-item" : ""
                      }`}
                      style={{ padding: " .5rem 1rem" }}
                      onClick={() => switchContentSource("zaps")}
                    >
                      Zaps
                    </div>,
                    <div
                      className={`list-item fx-centered fx-shrink ${
                        contentFrom === "reactions" ? "selected-list-item" : ""
                      }`}
                      style={{ padding: " .5rem 1rem" }}
                      onClick={() => switchContentSource("reactions")}
                    >
                      Reactions
                    </div>,
                    <div
                      className={`list-item fx-centered fx-shrink ${
                        contentFrom === "followings" ? "selected-list-item" : ""
                      }`}
                      style={{ padding: " .5rem 1rem" }}
                      onClick={() => switchContentSource("followings")}
                    >
                      Followings
                    </div>,
                  ]}
                />
              </div>
            </div>
            {!isLoading && (
              <div
                className="fit-container fx-centered fx-col fx-start-h"
                style={{
                  rowGap: 0,
                  height: "calc(100dvh - 154px)",
                  overflow: "scroll",
                }}
                ref={notificationsRef}
              >
                {notifications.map((event) => {
                  if (contentFrom === "zaps" && event.kind === 9735)
                    return (
                      <Notification
                        event={event}
                        allEvents={allEvents}
                        key={event.id}
                      />
                    );
                  if (contentFrom === "mention" && event.kind === 1)
                    return (
                      <Notification
                        event={event}
                        allEvents={allEvents}
                        key={event.id}
                        filterByType={["mention", "un", "comments"]}
                      />
                    );
                  if (contentFrom === "reactions" && event.kind === 7)
                    return (
                      <Notification
                        event={event}
                        allEvents={allEvents}
                        key={event.id}
                      />
                    );
                  if (
                    contentFrom === "followings" &&
                    userFollowings.includes(event.pubkey) &&
                    [30004, 30023, 34235, 1].includes(event.kind)
                  )
                    return (
                      <Notification
                        event={event}
                        allEvents={allEvents}
                        key={event.id}
                      />
                    );
                  if (contentFrom === "all")
                    return (
                      <Notification
                        event={event}
                        allEvents={allEvents}
                        key={event.id}
                      />
                    );
                })}
              </div>
            )}

            {isLoading && (
              <div
                className="fx-centered fit-container"
                style={{ height: "50dvh" }}
              >
                Loading <LoadingDots />
              </div>
            )}
          </div>
        </div>
      )}
      <div
        className={
          icon
            ? "round-icon"
            : "pointer fit-container fx-centered fx-start-h box-pad-h-s box-pad-v-s inactive-link"
        }
        onClick={() => setShowNotificationsCenter(true)}
      >
        <div className="ringbell-24"></div>
        {!icon && <div className="link-label">Notifications</div>}
      </div>
    </>
  );
}

const Notification = ({ event, allEvents, filterByType = false }) => {
  const { nostrKeys, nostrAuthors, getNostrAuthor } = useContext(Context);
  const [user, setUser] = useState(getEmptyNostrUser(event.pubkey));
  const [relatedEvent, setRelatedEvent] = useState(false);
  const [isSats, setIfSats] = useState(false);
  const [content, setContent] = useState(event.content);

  let type = useMemo(() => {
    return checkEventType(event);
  }, [event]);

  useEffect(() => {
    let tempPubkey = event.pubkey;
    if (event.kind === 9735) {
      let description = JSON.parse(
        event.tags.find((tag) => tag[0] === "description")[1]
      );

      let amount = description.tags.find((tag) => tag[0] === "amount");
      setIfSats({
        message: description.content,
        amount: amount ? Math.ceil(amount[1] / 1000) : 0,
      });
      tempPubkey = description.pubkey;
    }
    let auth = getNostrAuthor(tempPubkey);
    if (auth) setUser(auth);
  }, [nostrAuthors]);

  useEffect(() => {
    const fetchData = async () => {
      let eventToFetch = event.tags.filter((tag) => tag[0] === "e");
      eventToFetch = eventToFetch ? eventToFetch.reverse()[0][1] : false;
      if (!eventToFetch) return;
      let tempRelatedEvent = allEvents.find((e) => e.id === eventToFetch);

      if (!tempRelatedEvent) return;
      let auth =
        getNostrAuthor(tempRelatedEvent.pubkey) ||
        getEmptyNostrUser(tempRelatedEvent.pubkey);
      const nEvent = nip19.neventEncode({
        author: tempRelatedEvent.pubkey,
        id: tempRelatedEvent.id,
      });
      setRelatedEvent({
        author: auth,
        nEvent,
        ...tempRelatedEvent,
      });
    };
    const fetchData_2 = async () => {
      let auth =
        getNostrAuthor(event.pubkey) || getEmptyNostrUser(event.pubkey);
      let parsedEvent = getParsed3000xContent(event.tags);
      const naddr = nip19.naddrEncode({
        pubkey: event.pubkey,
        identifier: parsedEvent.d,
        kind: event.kind,
      });
      setRelatedEvent({
        author: auth,
        naddr,
        ...parsedEvent,
      });
    };
    const fetchData_3 = async () => {
      let auth =
        getNostrAuthor(event.pubkey) || getEmptyNostrUser(event.pubkey);
      let parsedEvent = getVideoContent(event);
      setRelatedEvent({
        author: auth,
        ...parsedEvent,
      });
    };
    if (
      !relatedEvent &&
      ((event.kind === 1 && ["comments", "un", "fn"].includes(type.type)) ||
        event.kind === 7)
    )
      fetchData();
    if ([30023, 30004].includes(event.kind)) {
      fetchData_2();
    }
    if (event.kind === 34235) {
      fetchData_3();
    }
  }, [allEvents, nostrAuthors]);

  useEffect(() => {
    const fetchData = (noteContent) => {
      try {
        setContent(noteContent);
      } catch (err) {
        console.log(err);
      }
    };
    if (event.kind === 1) fetchData(event.content);
    if (event.kind === 30078) fetchData(JSON.parse(event.content).content);
  }, []);

  const getReatcion = (content) => {
    if (content === "+") return <div className="thumbsup"></div>;
    if (content === "-") return <div className="thumbsdown"></div>;
    return content;
  };

  if (
    !type ||
    event.pubkey === nostrKeys.pub ||
    (event.kind === 7 && !relatedEvent)
  )
    return;
  if ((filterByType && filterByType.includes(type.type)) || !filterByType)
    return (
      <div
        className="fit-container fx-centered fx-col box-pad-v-m box-pad-h"
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          borderTop: "1px solid  var(--c1-side)",
          borderBottom: "1px solid  var(--c1-side)",
        }}
      >
        {event.kind !== 30078 && (
          <div className="fit-container fx-scattered">
            <div className="fx-centered fx-start-h">
              {type.show_profile && (
                <UserProfilePicNOSTR
                  size={30}
                  mainAccountUser={false}
                  ring={false}
                  user_id={user.pubkey}
                  img={user.picture}
                />
              )}
              {!type.show_profile && (
                <UserProfilePicNOSTR
                  size={30}
                  mainAccountUser={false}
                  ring={false}
                  user_id={"Unanymous"}
                  allowClick={false}
                  img={""}
                />
              )}
              <p
                className="orange-c p-medium fx-centered"
                style={{ columnGap: "4px" }}
              >
                {type.show_profile && (
                  <span style={{ color: "var(--black)" }}>{user.name}</span>
                )}{" "}
                {type.part_1} {event.kind === 7 && getReatcion(event.content)}{" "}
                {event.kind === 9735 && `${isSats.amount} Sats`}
              </p>
            </div>
            <p className="gray-c p-medium" style={{ minWidth: "max-content" }}>
              <Date_
                toConvert={new Date(event.created_at * 1000)}
                time={true}
              />
            </p>
          </div>
        )}
        {event.kind === 30078 && (
          <div className="fit-container fx-scattered">
            <div className="fit-container fx-centered fx-start-h">
              <div
                className="round-icon"
                style={{
                  minHeight: "30px",
                  minWidth: "30px",
                  borderColor: "var(--black)",
                }}
              >
                <div className="note"></div>
              </div>
              <p className="gray-c p-medium">{type.part_1}</p>
            </div>
            <p className="gray-c p-medium" style={{ minWidth: "max-content" }}>
              <Date_
                toConvert={new Date(event.created_at * 1000)}
                time={true}
              />
            </p>
          </div>
        )}
        {[30078].includes(event.kind) && (
          <div className="fit-container fx-centered fx-end-h">
            <div
              className="box-pad-h-m box-pad-v-m sc-s-18 fit-container"
              style={{ backgroundColor: "var(--white-transparent)" }}
            >
              <p className="p-medium p-three-lines">{content}</p>
            </div>
          </div>
        )}
        {[1, 30023, 30004, 34235].includes(event.kind) && (
          <div className="fit-container fx-centered fx-wrap fx-end-h">
            {relatedEvent && (
              <div
                className="box-pad-h-m box-pad-v-m sc-s-18 fit-container"
                style={{ backgroundColor: "var(--c1-side)" }}
              >
                <div className="fx-scattered fit-container box-marg-s">
                  <div className="fx-centered fx-start-h">
                    <UserProfilePicNOSTR
                      size={24}
                      mainAccountUser={false}
                      ring={false}
                      user_id={relatedEvent.author.pubkey}
                      img={relatedEvent.author.picture}
                    />
                    <div>
                      <p className="p-medium">
                        {relatedEvent.author.display_name ||
                          relatedEvent.author.name}
                      </p>
                      <p className="p-medium gray-c">
                        @
                        {relatedEvent.author.name ||
                          relatedEvent.author.display_name}
                      </p>
                    </div>
                  </div>
                  {type.type === "un" && (
                    <Link
                      target="_blank"
                      to={`/uncensored-notes/${relatedEvent.nEvent}`}
                    >
                      <div className="share-icon"></div>
                    </Link>
                  )}
                  {type.type === "fn" && (
                    <Link
                      target="_blank"
                      to={`/flash-news/${relatedEvent.nEvent}`}
                    >
                      <div className="share-icon"></div>
                    </Link>
                  )}
                  {type.type === "comments" && (
                    <Link target="_blank" to={`/notes/${relatedEvent.nEvent}`}>
                      <div className="share-icon"></div>
                    </Link>
                  )}
                  {type.type === "arts" && (
                    <Link target="_blank" to={`/article/${relatedEvent.naddr}`}>
                      <div className="share-icon"></div>
                    </Link>
                  )}
                  {type.type === "cur" && (
                    <Link
                      target="_blank"
                      to={`/curations/${relatedEvent.naddr}`}
                    >
                      <div className="share-icon"></div>
                    </Link>
                  )}
                  {type.type === "vid" && (
                    <Link target="_blank" to={`/videos/${relatedEvent.naddr}`}>
                      <div className="share-icon"></div>
                    </Link>
                  )}
                </div>
                {event.kind === 1 && (
                  <p className="p-three-lines">{relatedEvent.content}</p>
                )}
                {[30023, 30004].includes(event.kind) && (
                  <div className="fit-container fx-centered fx-start-h">
                    <div
                      className=" cover-bg bg-img sc-s-18"
                      style={{
                        minWidth: "50px",
                        aspectRatio: "1/1",
                        backgroundImage: `url(${relatedEvent.image})`,
                      }}
                    ></div>
                    <p>{relatedEvent.title}</p>
                  </div>
                )}
                {[34235].includes(event.kind) && (
                  <Link
                    key={relatedEvent.id}
                    className=" bg-img cover-bg fit-container fx-scattered"
                    to={`/videos/${relatedEvent.naddr}`}
                  >
                    <div
                      className=" fx-centered fx-start-v fx-col"
                      style={{
                        height: "100%",

                        position: "relative",
                      }}
                    >
                      <p className="p-two-lines">{relatedEvent.title}</p>
                      <div className="fit-container fx-scattered">
                        <div className="fx-centered">
                          <p className="gray-c p-medium">
                            <Date_
                              toConvert={
                                new Date(relatedEvent.published_at * 1000)
                              }
                              time={true}
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      key={relatedEvent.id}
                      className="sc-s-18 fx-centered bg-img cover-bg  fx-centered fx-end-h fx-end-v"
                      to={`/videos/${relatedEvent.naddr}`}
                      style={{
                        width: "150px",
                        minWidth: "150px",
                        aspectRatio: "16/9",
                        backgroundImage: `url(${relatedEvent.image})`,
                        backgroundColor: "black",
                      }}
                    >
                      <div
                        className="fit-container fx-centered fx-col box-pad-h-m fx-start-v fx-end-h box-pad-v-m"
                        style={{
                          height: "100%",
                          background:
                            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 87%)",
                          position: "relative",
                        }}
                      >
                        <div
                          className="fx-centered"
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          <div className="play-vid-58"></div>
                        </div>
                      </div>
                    </Link>
                  </Link>
                )}
              </div>
            )}
            {event.kind === 1 && (
              <div
                className="box-pad-h-m box-pad-v-m sc-s-18 fit-container p-medium"
                style={{
                  backgroundColor: "var(--white-transparent)",
                  width: "95%",
                }}
              >
                {type.show_profile && (
                  <div className="fx-scattered box-marg-s fit-container">
                    <div className="fx-centered">
                      <UserProfilePicNOSTR
                        size={24}
                        mainAccountUser={false}
                        ring={false}
                        user_id={event.pubkey}
                        img={user.picture}
                      />
                      <div>
                        <p className="p-small">
                          {user.display_name || user.name}
                        </p>
                        <p className="p-small gray-c">
                          @{user.name || user.display_name}
                        </p>
                      </div>
                    </div>
                    {type.type === "fn" && (
                      <Link
                        target="_blank"
                        to={`/flash-news/${nip19.neventEncode({
                          author: event.pubkey,
                          id: event.id,
                        })}`}
                      >
                        <div className="share-icon"></div>
                      </Link>
                    )}
                    {type.type !== "fn" && (
                      <Link
                        target="_blank"
                        to={`/notes/${nip19.neventEncode({
                          author: event.pubkey,
                          id: event.id,
                        })}`}
                      >
                        <div className="share-icon"></div>
                      </Link>
                    )}
                  </div>
                )}
                {!type.show_profile && (
                  <div className="fx-centered fx-start-h box-marg-s fit-container">
                    <UserProfilePicNOSTR
                      size={24}
                      mainAccountUser={false}
                      ring={false}
                      user_id={"Unanymous"}
                      allowClick={false}
                      img={""}
                    />
                    <div>
                      <p className="p-small">{"Unanymous"}</p>
                      <p className="p-small gray-c">@Unanymous</p>
                    </div>
                  </div>
                )}
                <p className="p-medium p-three-lines">{content}</p>
              </div>
            )}
          </div>
        )}
        {[7].includes(event.kind) && (
          <div className="fit-container fx-centered fx-wrap fx-end-h">
            {relatedEvent && (
              <div
                className="box-pad-h-m box-pad-v-m sc-s-18 fit-container"
                style={{ backgroundColor: "var(--white-transparent)" }}
              >
                <div className="fx-scattered fit-container box-marg-s">
                  <div className="fx-centered">
                    <UserProfilePicNOSTR
                      size={24}
                      mainAccountUser={false}
                      ring={false}
                      user_id={event.pubkey}
                      img={relatedEvent.author.picture}
                    />
                    <div>
                      <p className="p-medium">
                        {relatedEvent.author.display_name ||
                          relatedEvent.author.name}
                      </p>
                      <p className="p-medium gray-c">
                        {relatedEvent.author.name ||
                          relatedEvent.author.display_name}
                      </p>
                    </div>
                  </div>
                  <Link
                    target="_blank"
                    to={`/notes/${nip19.neventEncode({
                      author: relatedEvent.pubkey,
                      id: relatedEvent.id,
                    })}`}
                  >
                    <div className="share-icon"></div>
                  </Link>
                </div>
                <p className="p-medium">{relatedEvent.content}</p>
              </div>
            )}
          </div>
        )}
        {[9735].includes(event.kind) && event.content && (
          <div className="fit-container fx-centered fx-wrap fx-end-h">
            <div
              className="box-pad-h-m box-pad-v-m sc-s-18 fit-container"
              style={{ backgroundColor: "var(--white-transparent)" }}
            >
              <p className="p-medium gray-c">Zappers message</p>
              <p>{event.content}</p>
            </div>
          </div>
        )}
      </div>
    );
};
