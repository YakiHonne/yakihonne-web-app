import axios from "axios";
import { nip19, finalizeEvent, SimplePool } from "nostr-tools";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import QRCode from "react-qr-code";
import { Link } from "react-router-dom";
import ArrowUp from "../../Components/ArrowUp";
import Calendar from "../../Components/Calendar";
import Date_ from "../../Components/Date_";
import LoadingDots from "../../Components/LoadingDots";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import PagePlaceholder from "../../Components/PagePlaceholder";
import { getImagePlaceholder } from "../../Content/NostrPPPlaceholder";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import {
  encryptEventData,
  filterRelays,
  getParsed3000xContent,
  shortenKey,
} from "../../Helpers/Encryptions";
import { getZapEventRequest } from "../../Helpers/NostrPublisher";
import ToDeleteNote from "../../Components/NOSTR/ToDeleteNote";
import { getNoteTree } from "../../Helpers/Helpers";
import FlashNewsCard from "../../Components/NOSTR/FlashNewsCard";
import Footer from "../../Components/Footer";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import HomeFN from "../../Components/NOSTR/HomeFN";

const pool = new SimplePool();
const MAX_CHAR = 1000;
const TIME_THRESHOLD = 1706482800;

const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

const extractPostData = (post) => {
  let modified_date = new Date(post.created_at * 1000).toISOString();
  let added_date = new Date(post.created_at * 1000).toISOString();
  let published_at = post.created_at;
  let title = "";
  let thumbnail = "";
  let summary = "";
  let d = "";
  let cat = [];

  for (let tag of post.tags) {
    if (tag[0] === "d") d = tag[1];
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
    if (tag[0] === "t") cat.push(tag[1]);
  }

  let naddr = nip19.naddrEncode({
    identifier: d,
    pubkey: post.pubkey,
    kind: post.kind,
  });

  return {
    id: post.id,
    kind: post.kind,
    content: post.content,
    title,
    thumbnail: thumbnail || getImagePlaceholder(),
    summary,
    d,
    cat,
    added_date,
    modified_date,
    published_at,
    created_at: post.created_at,
    naddr,
  };
};

const getTimes = () => {
  let since = new Date();
  let until = new Date();
  since.setHours(0, 0, 0);
  until.setHours(23, 59, 59);
  return {
    since: Math.floor(since.getTime() / 1000),
    until: Math.floor(until.getTime() / 1000),
  };
};

const timeInit = getTimes();

export default function NostrFlashNews() {
  const { nostrUser, nostrKeys, mutedList, setToast } = useContext(Context);

  const [showAddNews, setShowAddNews] = useState(false);
  const [contentType, setContentType] = useState("all");
  const [flashNews, setFlashNews] = useState([]);
  const [importantFN, setImportantFN] = useState([]);
  const [onlyImportant, setOnlyImportant] = useState(false);
  const [onlyHasNews, setOnlyHasNews] = useState(true);
  const [firstEventTime, setFirstEventTime] = useState(timeInit.since);
  const [lastEventTime, setLastEventTime] = useState(timeInit.until);
  const [isLoading, setIsLoading] = useState(false);
  const [specificDate, setSpecificDate] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(false);
  const [page, setPage] = useState(0);
  const [elPerPage, setElPerPage] = useState(4);
  const [total, setTotal] = useState(0);
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    let fetchData = async () => {
      setIsLoading(true);
      var data = { data: [] };
      if (contentType === "all") {
        data = await axios.get(API_BASE_URL + "/api/v2/flashnews", {
          params: { from: firstEventTime, to: lastEventTime, page, elPerPage },
        });
        let parsedData = await Promise.all(
          data.data.flashnews.map(async (fn) => {
            let note_tree = await getNoteTree(fn.content, fn.is_important);
            return {
              ...fn,
              note_tree,
            };
          })
        );
        setTotal(data.data.total);
        setFlashNews((prev) => {
          let tempArr = Array.from(prev);
          let tempArrIndex = tempArr.findIndex(
            (item) => item.date === firstEventTime
          );
          if (tempArrIndex !== -1) {
            tempArr[tempArrIndex].news = [
              ...tempArr[tempArrIndex].news,
              ...parsedData,
            ];
            return tempArr;
          }
          return [...prev, { date: firstEventTime, news: parsedData }];
        });
      }

      if (contentType === "self") {
        if (specificDate)
          data = await axios.get(API_BASE_URL + "/api/v2/flashnews", {
            params: {
              from: firstEventTime,
              to: lastEventTime,
              pubkey: nostrKeys.pub,
              page,
              elPerPage,
            },
          });
        if (!specificDate)
          data = await axios.get(API_BASE_URL + "/api/v2/flashnews", {
            params: { pubkey: nostrKeys.pub, page, elPerPage },
          });

        let tempFN = [{ date: firstEventTime, news: [] }];
        let parsedData = await Promise.all(
          data.data.flashnews.map(async (fn) => {
            let note_tree = await getNoteTree(fn.content, fn.is_important);
            return {
              ...fn,
              note_tree,
            };
          })
        );
        for (let event of parsedData) {
          let index = tempFN.findIndex(
            (prevNote) =>
              new Date(prevNote.date * 1000).toDateString() ===
              new Date(event.created_at * 1000).toDateString()
          );
          if (index !== -1) {
            tempFN[index].news = [...tempFN[index].news, event];
          }
          if (index === -1)
            tempFN.push({
              date: event.created_at,
              news: [event],
            });
        }
        setFlashNews(tempFN);
        setTotal(data.data.total);
      }

      if (
        !specificDate &&
        firstEventTime - 86400 > TIME_THRESHOLD &&
        ([...flashNews.map((fn) => fn.news), ...data.data.flashnews].flat()
          .length < 2 ||
          data.data.length === 0) &&
        contentType === "all"
      ) {
        setFirstEventTime(firstEventTime - 86400);
        setLastEventTime(firstEventTime);
        setPage(0);
        return;
      }
      setIsLoading(false);
    };

    if (Array.isArray(mutedList)) fetchData();
  }, [lastEventTime, contentType, page, mutedList]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        flashNews.length === 0 ||
        isLoading ||
        firstEventTime - 86400 < TIME_THRESHOLD ||
        contentType === "self"
      )
        return;

      if (
        document.querySelector(".main-page-nostr-container").scrollHeight -
          document.querySelector(".main-page-nostr-container").scrollTop -
          60 >
        document.documentElement.offsetHeight
      ) {
        return;
      }
      if (!isLoading && flashNews[flashNews.length - 1].news.length < total) {
        setPage(
          (prev) => flashNews[flashNews.length - 1].news.length / elPerPage
        );
        return;
      }
      if (specificDate) return;
      setFirstEventTime(firstEventTime - 86400);
      setLastEventTime(firstEventTime);
      setPage(0);
    };
    document
      .querySelector(".main-page-nostr-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".main-page-nostr-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [isLoading]);

  useEffect(() => {
    if (!nostrKeys && contentType === "self") {
      setFirstEventTime(timeInit.since);
      setLastEventTime(timeInit.until);
      setShowOptions(false);
      setShowCalendar(false);
      setFlashNews([]);
      setOnlyImportant(false);
      setSpecificDate(false);
      setContentType("all");
      setPage(0);
      setTotal(0);
    }
  }, [nostrKeys]);

  useEffect(() => {
    const fetchImportantFlashNEws = async () => {
      try {
        let data = await axios.get(
          API_BASE_URL + "/api/v1/mb/flashnews/important"
        );

        setImportantFN(data.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchImportantFlashNEws();
  }, []);

  useEffect(() => {
    let flashNewsIDs =
      flashNews.length > 0
        ? flashNews.map((n) => n.news.map((fn) => fn.id)).flat()
        : [];
    flashNewsIDs = flashNewsIDs.filter(
      (id) =>
        !ratings.find((rating) => rating.tags.find((tag) => tag[1] === id))
    );

    let tempRating = [];
    if (flashNewsIDs.length === 0 || isLoading) return;
    let relaysToUse = nostrUser
      ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
      : relaysOnPlatform;

    const sub = pool.subscribeMany(
      relaysToUse,
      [
        {
          kinds: [7],
          "#e": flashNewsIDs,
        },
      ],
      {
        onevent(event) {
          tempRating.push(event);
          setRatings((prev) => [...prev, event]);
        },
      }
    );
  }, [isLoading]);

  const handleSelectingDates = (e, data) => {
    let tempDateFirst = new Date(data);
    let tempDateLast = new Date(data);
    tempDateFirst.setHours(0, 0, 0);
    tempDateLast.setHours(23, 59, 59);
    if (Math.floor(tempDateLast.getTime() / 1000) === lastEventTime) {
      setToast({
        type: 3,
        desc: "The date you're choosing is already on screen!",
      });
      return;
    }
    setSpecificDate(true);
    setFirstEventTime(Math.floor(tempDateFirst.getTime() / 1000));
    setLastEventTime(Math.floor(tempDateLast.getTime() / 1000));
    setFlashNews([]);
    setShowCalendar(false);
    setPage(0);
    setTotal(0);
  };

  const clearDates = () => {
    if (timeInit.until !== lastEventTime) setFlashNews([]);
    setSpecificDate(false);
    setShowCalendar(false);
    setFirstEventTime(timeInit.since);
    setLastEventTime(timeInit.until);
  };
  const refreshMyFlashNews = () => {
    let tempFlashNews = Array.from(flashNews);
    tempFlashNews[noteToDelete.index_1].news.splice(noteToDelete.index_2, 1);
    if (tempFlashNews[noteToDelete.index_1].news.length === 0)
      tempFlashNews.splice(noteToDelete.index_1, 1);
    setFlashNews(tempFlashNews);
    setNoteToDelete(false);
  };

  const getRatingStats = (id) => {
    let upvotes = [];
    let downvotes = [];
    for (let rating of ratings) {
      let eID = rating.tags.find((tag) => tag[1] === id);
      if (eID) {
        if (rating.content === "+") upvotes.push(rating);
        if (rating.content === "-") downvotes.push(rating);
      }
    }
    return {
      upvotes,
      downvotes,
    };
  };

  const refreshRating = (id) => {
    let tempArray = Array.from(ratings);
    let index = tempArray.findIndex((item) => item.id === id);
    tempArray.splice(index, 1);
    setRatings(tempArray);
  };

  return (
    <div>
      <Helmet>
        <title>Yakihonne | Flash News</title>
        <meta
          name="description"
          content={"Check out the latest news from all around the world"}
        />
        <meta
          property="og:description"
          content={"Check out the latest news from all around the world"}
        />

        <meta property="og:url" content={`https://yakihonne.com/flash-news`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content="Yakihonne | Flash News" />
        <meta property="twitter:title" content="Yakihonne | Flash News" />
        <meta
          property="twitter:description"
          content={"Check out the latest news from all around the world"}
        />
      </Helmet>
      {showAddNews && <AddNews exit={() => setShowAddNews(false)} />}
      {noteToDelete && (
        <ToDeleteNote
          title={noteToDelete.content.substring(0, 40)}
          post_id={noteToDelete.id}
          exit={() => setNoteToDelete(false)}
          exitAndRefresh={refreshMyFlashNews}
        />
      )}
      <div className="fit-container fx-centered">
        <div className="main-container">
          <SidebarNOSTR />
          <main className="main-page-nostr-container">
            <ArrowUp />
            <div className="fx-centered fit-container  fx-start-h fx-start-v">
              <div style={{ flex: 1.5, paddingLeft: "1rem" }}>
                <div
                  className="fit-container fx-scattered"
                  style={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: "var(--white)",
                    paddingTop: "1.5rem",
                    zIndex: "101",
                  }}
                >
                  {contentType === "all" && <h4>Flash news</h4>}

                  <div className="fx-centered">
                    <div className="fx-centered">
                      <div className="fx-centered">
                        <div
                          className="round-icon-tooltip round-icon"
                          style={{
                            backgroundColor: onlyImportant ? "var(--c1)" : "",
                          }}
                          data-tooltip="Show only importants"
                          onClick={() => setOnlyImportant(!onlyImportant)}
                        >
                          <svg
                            viewBox="0 0 14 13"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{
                              fill: onlyImportant
                                ? "var(--white)"
                                : "var(--gray)",
                              height: "24px",
                              width: "24px",
                              margin: 0,
                            }}
                            className="hot"
                          >
                            <path d="M10.0632 3.02755C8.69826 3.43868 8.44835 4.60408 8.5364 5.34427C7.56265 4.13548 7.60264 2.74493 7.60264 0.741577C4.47967 1.98517 5.20595 5.57072 5.11255 6.65955C4.32705 5.98056 4.17862 4.35822 4.17862 4.35822C3.3494 4.80884 2.93359 6.01229 2.93359 6.98846C2.93359 9.34905 4.7453 11.2626 6.98011 11.2626C9.21492 11.2626 11.0266 9.34905 11.0266 6.98846C11.0266 5.58561 10.0514 4.93848 10.0632 3.02755Z"></path>
                          </svg>
                        </div>
                      </div>
                      <div className="days-picker">
                        <div
                          className="round-icon round-icon-tooltip"
                          data-tooltip="Choose date"
                          onClick={() => {
                            setShowCalendar(!showCalendar);
                            setShowOptions(false);
                          }}
                        >
                          <div className="calendar"></div>
                        </div>
                        {showCalendar && (
                          <>
                            <Calendar
                              selected_day={
                                specificDate
                                  ? new Date(firstEventTime * 1000)
                                  : null
                              }
                              onClick={handleSelectingDates}
                              clear={clearDates}
                            />
                          </>
                        )}
                      </div>
                    </div>
                    {nostrKeys && (
                      <div style={{ position: "relative" }}>
                        <div
                          className="round-icon round-icon-tooltip"
                          data-tooltip="Options"
                          onClick={() => {
                            setShowOptions(!showOptions);
                            setShowCalendar(false);
                          }}
                        >
                          <div
                            className="fx-centered fx-col"
                            style={{ rowGap: 0 }}
                          >
                            <p
                              className="gray-c fx-centered"
                              style={{ height: "6px" }}
                            >
                              &#x2022;
                            </p>
                            <p
                              className="gray-c fx-centered"
                              style={{ height: "6px" }}
                            >
                              &#x2022;
                            </p>
                            <p
                              className="gray-c fx-centered"
                              style={{ height: "6px" }}
                            >
                              &#x2022;
                            </p>
                          </div>
                        </div>
                        {showOptions && (
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              bottom: "-5px",
                              backgroundColor: "var(--dim-gray)",
                              border: "none",
                              transform: "translateY(100%)",
                              minWidth: "150px",
                              zIndex: 1000,
                              rowGap: "12px",
                            }}
                            className="box-pad-h box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v"
                          >
                            <Link
                              className="fit-container fx-centered fx-start-h pointer"
                              to={"/my-flash-news"}
                            >
                              <p className="gray-c">My news</p>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="fx-centered fit-container fx-col fx-start-v fx-start-h"
                  style={{ rowGap: 0 }}
                >
                  {flashNews.map((fn, fnIndex) => {
                    return (
                      <div
                        key={`${fn.date}-${fnIndex}`}
                        className="fit-container"
                      >
                        {((specificDate && fn.news.length > 1) ||
                          (!specificDate &&
                            onlyHasNews &&
                            fn.news.length > 0)) && (
                          <div
                            className="fit-container box-pad-v fx-scattered"
                            style={{
                              position: "sticky",
                              top: "50px",
                              backgroundColor: "var(--white)",
                              zIndex: "100",
                            }}
                          >
                            <h4 className="gray-c">
                              <Date_
                                toConvert={new Date(
                                  fn.date * 1000
                                ).toISOString()}
                              />
                            </h4>
                          </div>
                        )}
                        {fn.news.map((news, index) => {
                          let ratingStats = getRatingStats(news.id);
                          let isBanned = [...mutedList].includes(
                            news.author.pubkey
                          );

                          if (!onlyImportant && !isBanned)
                            return (
                              <div
                                className="fx-centered fx-start-v fx-stretch fit-container"
                                style={{ columnGap: "10px" }}
                                key={news.id}
                              >
                                <div className="fx-centered fx-start-v">
                                  <div
                                    className="fx-centered fx-col fx-start-h"
                                    style={{ rowGap: 0, height: "100%" }}
                                  >
                                    <h4 className="gray-c">&#x2022;</h4>
                                  </div>
                                </div>
                                <FlashNewsCard
                                  newsContent={news}
                                  self={!(contentType === "all")}
                                  upvoteReaction={ratingStats.upvotes}
                                  downvoteReaction={ratingStats.downvotes}
                                  refreshRating={refreshRating}
                                />
                                {contentType === "self" && (
                                  <div>
                                    <div
                                      className="round-icon"
                                      onClick={() => {
                                        setNoteToDelete({
                                          id: news.id,
                                          content: news.content,
                                          index_1: fnIndex,
                                          index_2: index,
                                        });
                                      }}
                                    >
                                      <div className="trash"></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          if (
                            (onlyImportant === news.is_important) === true &&
                            news.is_authentic &&
                            !isBanned
                          )
                            return (
                              <div
                                className="fx-centered fx-start-v fx-stretch fit-container"
                                style={{ columnGap: "10px" }}
                                key={news.id}
                              >
                                <div className="fx-centered fx-start-v">
                                  <div
                                    className="fx-centered fx-col fx-start-h"
                                    style={{ rowGap: 0, height: "100%" }}
                                  >
                                    <h4 className="gray-c h4-big">&#x2022;</h4>
                                  </div>
                                </div>
                                <FlashNewsCard
                                  newsContent={news}
                                  self={!(contentType === "all")}
                                  upvoteReaction={ratingStats.upvotes}
                                  downvoteReaction={ratingStats.downvotes}
                                  refreshRating={refreshRating}
                                />
                              </div>
                            );
                        })}
                        {!specificDate &&
                          !onlyHasNews &&
                          fn.news.length === 0 && (
                            <div className="fit-container fx-centered fx-start-h">
                              <p className="gray-c">No news on this day</p>
                            </div>
                          )}
                      </div>
                    );
                  })}
                  {!isLoading &&
                    specificDate &&
                    flashNews[0]?.news?.length === 0 && (
                      <PagePlaceholder page={"nostr-news"} />
                    )}
                  {isLoading && (
                    <div
                      className="fit-container fx-centered box-marg"
                      style={{ height: "30vh" }}
                    >
                      <p className="gray-c">Loading</p>
                      <LoadingDots />
                    </div>
                  )}
                </div>
              </div>
              <div
                className="box-pad-h-s fx-centered fx-col fx-start-v extras-homepage"
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
                  className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v box-marg-s"
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
  );
}

const AddNews = ({ exit }) => {
  const {
    nostrUserAbout,
    nostrUserLoaded,
    nostrUser,
    nostrKeys,
    setToPublish,
    setToast,
    isPublishing,
  } = useContext(Context);
  const [note, setNote] = useState("");
  const [postAsType, setPostAsType] = useState(0);
  const [source, setSource] = useState("");
  const [flag, setFlag] = useState(false);
  const [tempKeyword, setTempKeyword] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [posts, setPosts] = useState([]);
  const [curations, setCurations] = useState([]);
  const [showLinksOptions, setShowLinksOptions] = useState(false);
  const [selectedLinkedOption, setSelectedLinkedOption] = useState(false);
  const [showPostinOptions, setShowPostinOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [invoice, setInvoice] = useState("");
  const currentWordsCount = useMemo(() => {
    let value = note.replace(/[^\S\r\n]+/g, " ");
    let wordsArray = value
      .trim()
      .split(" ")
      .filter(
        (word) => !/(https?:\/\/[^ ]*\.(?:gif|png|jpg|jpeg))/i.test(word)
      );
    let countedWords = wordsArray.join(" ").length;
    return countedWords || 0;
  }, [note]);

  useEffect(() => {
    if (isPublishing) exit();
  }, [isPublishing]);

  useEffect(() => {
    let textArea = document.querySelector(".txt-area");
    textArea.style.height = "200px";
    textArea.style.height = `${textArea.scrollHeight}px`;
  }, [note]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setPosts([]);
        let relaysToFetchFrom = filterRelays(
          nostrUser?.relays || [],
          relaysOnPlatform
        );

        var sub = pool.subscribeMany(
          relaysToFetchFrom,
          [{ kinds: [30023, 30004], authors: [nostrKeys.pub] }],
          {
            onevent(event) {
              let d = event.tags.find((tag) => tag[0] === "d")[1];
              let naddr = nip19.naddrEncode({
                identifier: d,
                pubkey: event.pubkey,
                kind: event.kind,
              });
              if (event.kind === 30023)
                setPosts((prev) => {
                  let index = prev.findIndex(
                    (item) => item.d === d && item.kind === event.kind
                  );
                  let newP = Array.from(prev);
                  if (index === -1) newP = [...newP, extractPostData(event)];
                  if (index !== -1) {
                    if (prev[index].created_at < event.created_at) {
                      newP.splice(index, 1);
                      newP.push(extractPostData(event));
                    }
                  }

                  newP = newP.sort(
                    (item_1, item_2) => item_2.created_at - item_1.created_at
                  );

                  return newP;
                });
              if (event.kind === 30004)
                setCurations((prev) => {
                  let content = getParsed3000xContent(event.tags);
                  let index = prev.findIndex((item) => item.d === d);
                  let newP = Array.from(prev);
                  if (index === -1)
                    newP = [
                      ...newP,
                      {
                        ...event,
                        ...content,
                        naddr,
                        created_at: event.created_at,
                        d,
                      },
                    ];
                  if (index !== -1) {
                    if (prev[index].created_at < event.created_at) {
                      newP.splice(index, 1);
                      newP.push({
                        ...event,
                        ...content,
                        naddr,
                        created_at: event.created_at,
                        d,
                      });
                    }
                  }

                  newP = newP.sort(
                    (item_1, item_2) => item_2.created_at - item_1.created_at
                  );

                  return newP;
                });
            },
          }
        );
      } catch (err) {
        console.log(err);
      }
    };
    if (nostrKeys && nostrUserLoaded) {
      fetchData();
      return;
    }
  }, [nostrKeys, nostrUserLoaded]);

  const handleNoteOnChange = (e) => {
    let value = e.target.value.replace(/[^\S\r\n]+/g, " ");
    setNote(value);
  };

  const handlePublishing = async () => {
    try {
      if (currentWordsCount === 0 && !note) {
        setToast({
          type: 3,
          desc: "Your note is empty!",
        });
        return;
      }
      if (MAX_CHAR - currentWordsCount < 0) {
        setToast({
          type: 3,
          desc: "Your note has exceeded the maximum character number.",
        });
        return;
      }
      if (isPublishing) {
        setToast({
          type: 3,
          desc: "An event publishing is in process!",
        });
        return;
      }
      if (!pricing) {
        setToast({
          type: 3,
          desc: "An error occured while communicating with the server!",
        });
        return;
      }
      setIsLoading(true);
      let tags = [];
      let created_at = Math.floor(Date.now() / 1000);
      if (flag) tags.push(["important", `${created_at}`]);
      tags.push([
        "client",
        "Yakihonne",
        "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
      ]);
      tags.push(["source", source]);
      tags.push(["l", "FLASH NEWS"]);
      tags.push(["yaki_flash_news", encryptEventData(`${created_at}`)]);
      for (let tag of keywords) tags.push(["t", tag]);

      let event = {
        kind: 1,
        content: note,
        created_at,
        tags,
      };
      if (nostrKeys.ext) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          console.log(err);
          setIsLoading(false);
          return false;
        }
      } else {
        event = finalizeEvent(event, nostrKeys.sec);
      }

      let extras = flag ? pricing?.flag_pricing || 21 : 0;
      let sats = ((pricing.fn_pricing || 800) + extras) * 1000;

      let zapTags = [
        ["relays", ...relaysOnPlatform],
        ["amount", sats.toString()],
        ["lnurl", process.env.REACT_APP_YAKI_FUNDS_ADDR],
        ["p", process.env.REACT_APP_YAKI_PUBKEY],
        ["e", event.id],
      ];

      var zapEvent = await getZapEventRequest(
        nostrKeys,
        `${nostrUserAbout.name} paid for a flash news note.`,
        zapTags
      );
      if (!zapEvent) {
        setIsLoading(false);
        return;
      }

      const res = await axios(
        `${process.env.REACT_APP_YAKI_FUNDS_ADDR_CALLBACK}?amount=${sats}&nostr=${zapEvent}&lnurl=${process.env.REACT_APP_YAKI_FUNDS_ADDR}`
      );

      if (res.data.status === "ERROR") {
        setIsLoading(false);
        setToast({
          type: 2,
          desc: "Something went wrong when processing payment!",
        });
        return;
      }

      setInvoice(res.data.pr);

      const { webln } = window;
      if (webln) {
        try {
          await webln.enable();
          await webln.sendPayment(res.data.pr);
        } catch (err) {
          console.log(err);
          setIsLoading(false);
          setInvoice("");
        }
      }

      let sub = pool.subscribeMany(
        relaysOnPlatform,
        [
          {
            kinds: [9735],
            "#p": [process.env.REACT_APP_YAKI_PUBKEY],
            "#e": [event.id],
          },
        ],
        {
          onevent() {
            setInvoice("");
            setToPublish({
              eventInitEx: event,
              allRelays: filterRelays(
                nostrUser?.relays || [],
                relaysOnPlatform
              ),
            });
            localStorage.setItem("fn_yaki_postAsType", `${0}`);
            localStorage.setItem("fn_yaki_selectedLinkedOption", "");
            localStorage.setItem("fn_yaki_note", "");
            localStorage.setItem("fn_yaki_source", "");
            localStorage.setItem("fn_yaki_keywords", JSON.stringify([]));
            localStorage.setItem("fn_yaki_flag", `${false}`);
            setTimeout(() => {
              window.location.href = "/flash-news";
            }, 3000);
          },
        }
      );
    } catch (err) {
      setIsLoading(false);
      console.log(err);
      setToast({
        type: 2,
        desc: "An error occurred while publishing this note",
      });
    }
  };

  const handleAddKeyword = () => {
    let checkNewInput = keywords.find(
      (keyword) => keyword.toLowerCase() === tempKeyword.trim().toLowerCase()
    );
    if (checkNewInput) {
      setTempKeyword("");
      return;
    }
    setKeywords([...keywords, tempKeyword.trim()]);
    setTempKeyword("");
  };
  const handleRemoveKeyword = (index) => {
    let tempKeywords = Array.from(keywords);
    tempKeywords.splice(index, 1);
    setKeywords(tempKeywords);
  };
  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setToast({
      type: 1,
      desc: `LNURL was copied! 👏`,
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        let data = await axios.get(API_BASE_URL + "/api/v1/pricing");
        let FNPricing = data.data.find((item) => item.kind === 1);
        setPricing({
          fn_pricing: FNPricing.flash_news.amount,
          flag_pricing: FNPricing.flash_news_important_flag.amount,
        });
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
    const temp_postAsType = localStorage.getItem("fn_yaki_postAsType") || 0;
    const temp_selectedLinkedOption =
      localStorage.getItem("fn_yaki_selectedLinkedOption") || false;
    const temp_note = localStorage.getItem("fn_yaki_note") || "";
    const temp_source = localStorage.getItem("fn_yaki_source") || "";
    const temp_keywords = localStorage.getItem("fn_yaki_keywords")
      ? JSON.parse(localStorage.getItem("fn_yaki_keywords"))
      : [];
    const temp_flag = localStorage.getItem("fn_yaki_flag")
      ? !(localStorage.getItem("fn_yaki_flag") == "false")
      : false;

    setPostAsType(parseInt(temp_postAsType));
    setSelectedLinkedOption(
      temp_selectedLinkedOption ? { title: temp_selectedLinkedOption } : ""
    );
    setNote(temp_note);
    setSource(temp_source);
    setKeywords(temp_keywords);
    setFlag(temp_flag);
  }, []);

  useEffect(() => {
    localStorage.setItem("fn_yaki_postAsType", `${postAsType}`);
    localStorage.setItem(
      "fn_yaki_selectedLinkedOption",
      selectedLinkedOption ? `${selectedLinkedOption.title}` : ""
    );
    localStorage.setItem("fn_yaki_note", `${note}`);
    localStorage.setItem("fn_yaki_source", `${source}`);
    localStorage.setItem("fn_yaki_keywords", JSON.stringify(keywords));
    localStorage.setItem("fn_yaki_flag", `${flag}`);
  }, [postAsType, selectedLinkedOption, note, source, keywords, flag]);

  return (
    <>
      {invoice && (
        <div
          className="fixed-container fx-centered box-pad-h fx-col"
          style={{ zIndex: 10001 }}
        >
          <div
            className="fx-centered fx-col fit-container sc-s-18 box-pad-h-s box-pad-v-s"
            style={{ width: "400px" }}
          >
            <QRCode
              style={{ width: "100%", aspectRatio: "1/1" }}
              size={400}
              value={invoice}
            />
            <div
              className="fx-scattered if pointer dashed-onH fit-container box-marg-s"
              style={{ borderStyle: "dashed" }}
              onClick={() => copyKey(invoice)}
            >
              <p>{shortenKey(invoice)}</p>
              <div className="copy-24"></div>
            </div>
            <div className="fit-container fx-centered box-marg-s">
              <p className="gray-c p-medium">Waiting for response</p>
              <LoadingDots />
            </div>
          </div>
          <div
            className="round-icon-tooltip"
            data-tooltip="By closing this, you will lose publishing to this flash news"
          >
            <div
              style={{ position: "static" }}
              className="close"
              onClick={() => setInvoice("")}
            >
              <div></div>
            </div>
          </div>
        </div>
      )}
      <div
        className="fixed-container fx-centered fx-start-v box-pad-h  no-scrollbar"
        style={{ overflow: "scroll" }}
      >
        <div
          style={{
            position: "relative",
            width: "min(100%, 700px)",
            minHeight: "100vh",
            borderRadius: 0,
            paddingTop: "4rem",
            paddingBottom: "4rem",
          }}
          className="sc-s-18 box-pad-h box-pad-v"
        >
          <div className="fit-container fx-scattered  box-marg-s">
            <div className="fx-centered">
              <UserProfilePicNOSTR
                mainAccountUser={true}
                size={48}
                ring={false}
              />
              <div className="fx-centered fx-col fx-start-v box-pad-h-s">
                <h4>Create News</h4>
              </div>
            </div>
            <div
              className="close"
              onClick={exit}
              style={{ position: "static" }}
            >
              <div></div>
            </div>
          </div>
          <div
            className="fit-container fx-scattered box-marg-s"
            style={{ position: "relative" }}
          >
            <div
              className="if fx-centered pointer"
              style={{ backgroundColor: "var(--dim-gray)", border: "none" }}
              onClick={() => {
                setShowPostinOptions(!showPostinOptions);
                setShowLinksOptions(false);
              }}
            >
              {postAsType === 0 && (
                <span style={{ paddingRight: ".5rem" }}>Plain post</span>
              )}
              {postAsType === 1 && (
                <span style={{ paddingRight: ".5rem" }}>Link to article</span>
              )}
              {postAsType === 2 && (
                <span style={{ paddingRight: ".5rem" }}>Link to curation</span>
              )}
              <div
                className="arrow"
                style={{ minWidth: "10px", minHeight: "10px" }}
              ></div>
            </div>
            {postAsType !== 0 && (
              <div
                className="if fx-scattered pointer fx"
                onClick={() => {
                  setShowPostinOptions(false);
                  setShowLinksOptions(!showLinksOptions);
                }}
              >
                {!selectedLinkedOption && (
                  <span style={{ paddingRight: ".5rem" }}>
                    {postAsType === 1 && <>-- Pick an article --</>}
                    {postAsType === 2 && <>-- Pick a curation --</>}
                  </span>
                )}
                {selectedLinkedOption && (
                  <span
                    className="p-one-line"
                    style={{ paddingRight: ".5rem" }}
                  >
                    {selectedLinkedOption.title}
                  </span>
                )}
                <div
                  className="arrow"
                  style={{ minWidth: "10px", minHeight: "10px" }}
                ></div>
              </div>
            )}
            {showPostinOptions && (
              <div
                className=" sc-s-18 fx-centered fx-col box-pad-v-m fx-start-v"
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: "-10px",
                  transform: "translateY(100%)",
                  width: "fit-content",
                  maxHeight: "500px",
                  overflow: "scroll",
                  overflowX: "hidden",
                  backgroundColor: "var(--dim-gray)",
                  // boxShadow: "0 10px 30px -5px rgba(0,0,0,0.1)",
                  border: "none",
                }}
              >
                <div
                  className={`box-pad-h pointer ${
                    postAsType === 0 ? "" : "gray-c"
                  }`}
                  onClick={() => {
                    setPostAsType(0);
                    setShowPostinOptions(false);
                    setNote("");
                    setSource("");
                    setSelectedLinkedOption(false);
                  }}
                >
                  Plain post
                </div>
                <div
                  className={`box-pad-h pointer ${
                    postAsType === 1 ? "" : "gray-c"
                  }`}
                  onClick={() => {
                    setPostAsType(1);
                    setShowPostinOptions(false);
                    setNote("");
                    setSource("");
                    setSelectedLinkedOption(false);
                  }}
                >
                  Link to your article
                </div>
                <div
                  className={`box-pad-h pointer ${
                    postAsType === 2 ? "" : "gray-c"
                  }`}
                  onClick={() => {
                    setPostAsType(2);
                    setShowPostinOptions(false);
                    setNote("");
                    setSource("");
                    setSelectedLinkedOption(false);
                  }}
                >
                  Link to your curation
                </div>
              </div>
            )}
            {showLinksOptions && (
              <div
                className="box-pad-h-m box-pad-v-m sc-s-18 fx-centered fx-wrap fx-start-v"
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: "-10px",
                  transform: "translateY(100%)",
                  width: "100%",
                  maxHeight: "500px",
                  overflow: "scroll",
                  overflowX: "hidden",
                  boxShadow: "0 10px 30px -5px rgba(0,0,0,0.1)",
                  border: "none",
                  zIndex: "100",
                }}
              >
                {postAsType === 1 && (
                  <>
                    {posts.map((item) => {
                      return (
                        <div
                          className="fit-container sc-s-18 box-pad-h-s box-pad-v-s fx-centered fx-start-h option pointer"
                          style={{ background: "transparent" }}
                          key={item.id}
                          onClick={() => {
                            setSelectedLinkedOption({ title: item.title });
                            setNote(item.summary);
                            setSource(
                              `https://yakihonne.com/article/${item.naddr}`
                            );
                            setShowLinksOptions(false);
                          }}
                        >
                          <div
                            className="bg-img cover-bg"
                            style={{
                              borderRadius: "var(--border-r-50)",
                              aspectRatio: "1/1",
                              minWidth: "48px",
                              backgroundImage: `url(${item.thumbnail})`,
                            }}
                          ></div>
                          <p>{item.title}</p>
                        </div>
                      );
                    })}
                  </>
                )}
                {postAsType === 2 && (
                  <>
                    {curations.map((item) => {
                      return (
                        <div
                          className="fit-container sc-s-18 box-pad-h-s box-pad-v-s fx-centered fx-start-h option pointer"
                          style={{ background: "transparent" }}
                          key={item.id}
                          onClick={() => {
                            setSelectedLinkedOption({ title: item.title });
                            setNote(item.description);
                            setSource(
                              `https://yakihonne.com/curations/${item.naddr}`
                            );
                            setShowLinksOptions(false);
                          }}
                        >
                          <div
                            className="bg-img cover-bg"
                            style={{
                              borderRadius: "var(--border-r-50)",
                              aspectRatio: "1/1",
                              minWidth: "48px",
                              backgroundImage: `url(${item.image})`,
                            }}
                          ></div>
                          <p>{item.title}</p>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
          <textarea
            className="txt-area fit-container no-scrollbar"
            style={{
              color: MAX_CHAR - currentWordsCount < 0 ? "var(--red-main)" : "",
            }}
            placeholder={`What's on your mind, ${nostrUserAbout.name}?`}
            value={note}
            onChange={handleNoteOnChange}
          />
          <div className="fit-container fx-centered fx-start-h box-marg-s">
            {MAX_CHAR - currentWordsCount <= 0 && (
              <p className="red-c p-medium">
                {MAX_CHAR - currentWordsCount} characters left
              </p>
            )}
            {MAX_CHAR - currentWordsCount > 0 && (
              <p className="gray-c p-medium">
                {MAX_CHAR - currentWordsCount} characters left
              </p>
            )}
          </div>
          <input
            type="text"
            className={`if ifs-full box-marg-s ${
              postAsType !== 0 ? "if-disabled" : ""
            }`}
            placeholder="Original source (recommended)"
            disabled={postAsType !== 0}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          {keywords.length < 3 && (
            <div className="fx-centered box-marg-s">
              <input
                type="text"
                className="if ifs-full "
                placeholder="Keywords (optional)"
                value={tempKeyword}
                onChange={(e) => setTempKeyword(e.target.value)}
              />
              {tempKeyword && (
                <button className="btn btn-normal" onClick={handleAddKeyword}>
                  &#43;
                </button>
              )}
            </div>
          )}
          {keywords.length > 0 && (
            <div className="fx-centered fx-start-h box-marg-s">
              {keywords.map((item, index) => {
                return (
                  <div
                    className="sticker sticker-gray-black fx-scattered"
                    key={`${item}-${index}`}
                    style={{ paddingRight: 0 }}
                  >
                    <p className="p-medium">{item}</p>
                    <div onClick={() => handleRemoveKeyword(index)}>
                      <div className="close" style={{ position: "static" }}>
                        <div></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div
            onClick={() => setFlag(!flag)}
            className="if ifs-full fx-scattered box-marg-s pointer"
            style={{ position: "relative" }}
          >
            <div className="fx-centered">
              <div
                className="bolt-24"
                style={{ pointerEvents: "none", opacity: flag ? 1 : 0.3 }}
              ></div>
              <div>
                <p className={`p-medium ${flag ? "" : "gray-c"}`}>
                  Flag it as important
                </p>
                <p className={`${flag ? "c1-c" : "gray-c"} p-small`}>
                  +{pricing?.flag_pricing || "N/A"} Sats
                </p>
              </div>
            </div>
            <div
              style={{
                minHeight: "16px",
                aspectRatio: "1/1",
                borderRadius: "var(--border-r-50)",
                backgroundColor: flag ? "var(--c1)" : "var(--dim-gray)",
              }}
            ></div>
          </div>
          <button
            className="btn btn-normal btn-full"
            onClick={handlePublishing}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingDots />
            ) : (
              <>
                Publish & Pay{" "}
                {(flag
                  ? pricing?.fn_pricing + pricing?.flag_pricing
                  : pricing?.fn_pricing) || "N/A"}{" "}
                Sats
              </>
            )}
          </button>
          <p className="orange-c p-medium p-centered box-pad-v-m box-pad-h">
            Ensure that all the content that you provided is final since the
            publishing is deemed irreversible & the spent SATS are non
            refundable
          </p>
        </div>
      </div>
    </>
  );
};
