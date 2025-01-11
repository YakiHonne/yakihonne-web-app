import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
} from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import PostPreviewCardNOSTR from "../../Components/NOSTR/PostPreviewCardNOSTR";
import LoadingDots from "../../Components/LoadingDots";
import { Context } from "../../Context/Context";
import {
  filterRelays,
  getBech32,
  getEmptyNostrUser,
} from "../../Helpers/Encryptions";
import { nip19 } from "nostr-tools";
import { Link } from "react-router-dom";
import TopCreators from "../../Components/NOSTR/TopCreators";
import { Helmet } from "react-helmet";
import ArrowUp from "../../Components/ArrowUp";
import YakiIntro from "../../Components/YakiIntro";
import TopicTagsSelection from "../../Components/TopicTagsSelection";
import TopicsTags from "../../Content/TopicsTags";
import LoginNOSTR from "../../Components/NOSTR/LoginNOSTR";
import { getImagePlaceholder } from "../../Content/NostrPPPlaceholder";
import axios from "axios";
import HomeFN from "../../Components/NOSTR/HomeFN";
import {
  getAIFeedContent,
  getFlashnewsContent,
  getNoteTree,
  getVideoContent,
  shuffleArray,
} from "../../Helpers/Helpers";
import Footer from "../../Components/Footer";
import HomeFNMobile from "../../Components/NOSTR/HomeFNMobile";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import FlashNewsPreviewCard from "../../Components/NOSTR/FlashNewsPreviewCard";
import BuzzFeedPreviewCard from "../../Components/NOSTR/BuzzFeedPreviewCard";
import VideosPreviewCards from "../../Components/NOSTR/VideosPreviewCards";
import KindSix from "../../Components/NOSTR/KindSix";
const KindOne = lazy(() => import("../../Components/NOSTR/KindOne"));

const defaultTopicIcon =
  "https://yakihonne.s3.ap-east-1.amazonaws.com/topics_icons/default.png";
const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

const pool = new SimplePool();
const pool_1 = new SimplePool();
const pool_2 = new SimplePool();
const pool_3 = new SimplePool();

const MixEvents = (posts, flashnews, buzzFeed, videos) => {
  const interleavedArray = [];

  const length = Math.max(
    posts.length,
    flashnews.length,
    buzzFeed.length,
    videos.length
  );

  for (let i = 0; i < length; i++) {
    if (i < flashnews.length) {
      interleavedArray.push(flashnews[i]);
    }
    if (i < videos.length) {
      interleavedArray.push(videos[i]);
    }
    if (i < posts.length) {
      interleavedArray.push(posts[i]);
    }
    if (i < buzzFeed.length) {
      interleavedArray.push(buzzFeed[i]);
    }
  }
  return interleavedArray;
};

export default function NostrHome() {
  const {
    nostrKeys,
    buzzFeedSources,
    userFollowings,
    nostrUser,
    nostrUserLoaded,
    addNostrAuthors,
    setNostrAuthors,
    nostrUserTopics,
    mutedList,
  } = useContext(Context);
  const [posts, setPosts] = useState([]);
  const [flashnews, setFlashnews] = useState([]);
  const [buzzFeed, setBuzzFeed] = useState([]);
  const [videos, setVideos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [notesSmartWidgets, setNotesSmartWidgets] = useState([]);
  const [relays, setRelays] = useState(relaysOnPlatform);
  const [activeRelay, setActiveRelay] = useState("");
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [recentTags, setRecentTags] = useState([]);
  const [flashNews, setFlashNews] = useState([]);
  const [topCreators, setTopCreators] = useState([]);
  const [trendingNotes, setTrendingNotes] = useState([]);
  const [mediaContentFrom, setMediaContentFrom] = useState("HOMEFEED");
  const [notesContentFrom, setNotesContentFrom] = useState("universal");
  const [contentSource, setContentSource] = useState("notes");
  const [artsLastEventTime, setArtsLastEventTime] = useState(undefined);
  const [fnLastEventTime, setFnLastEventTime] = useState(undefined);
  const [bfLastEventTime, setBfLastEventTime] = useState(undefined);
  const [videosLastEventTime, setVideosLastEventTime] = useState(undefined);
  const [notesLastEventTime, setNotesLastEventTime] = useState(undefined);
  const [notesSWLastEventTime, setNotesSWLastEventTime] = useState(undefined);
  const [showTopicsPicker, setShowTopicsPicker] = useState(
    !localStorage.getItem("topic-popup") && nostrUser
  );
  const [sub1, setSub1] = useState(false);
  const [sub2, setSub2] = useState(false);
  const [sub3, setSub3] = useState(false);
  const [sub4, setSub4] = useState(false);
  const [showRelaysList, setShowRelaysList] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showArrows, setShowArrows] = useState(false);
  const [scrollPX, setScrollPX] = useState(0);
  const [sideContentType, setSideContentType] = useState("0");
  const [showTabsSettings, setShowTabsSettings] = useState(false);
  const [notesSub, setNotesSub] = useState(false);
  const extrasRef = useRef(null);
  const mixedContent = useMemo(() => {
    return MixEvents(posts, flashnews, buzzFeed, videos);
  }, [posts, flashnews, buzzFeed, videos]);

  useEffect(() => {
    if (!Array.isArray(mutedList)) return;
    initSub();
    getExternalData();
    if (!localStorage.getItem("topic-popup") && nostrUser)
      setShowTopicsPicker(true);
  }, [
    activeRelay,
    mediaContentFrom,
    artsLastEventTime,
    fnLastEventTime,
    bfLastEventTime,
    nostrUser,
    mutedList,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      if (mixedContent.length === 0 || contentSource === "notes") return;
      let container = document.querySelector(".main-page-nostr-container");
      if (!container) return;
      if (
        container.scrollHeight - container.scrollTop - 60 >
        document.documentElement.offsetHeight
      ) {
        return;
      }
      setArtsLastEventTime(posts[posts.length - 1]?.created_at || undefined);
      setFnLastEventTime(
        flashNews[flashNews.length - 1]?.created_at || undefined
      );
      setVideosLastEventTime(
        videos[videos.length - 1]?.created_at || undefined
      );
      setBfLastEventTime(
        buzzFeed[buzzFeed.length - 1]?.created_at || undefined
      );
    };
    document
      .querySelector(".main-page-nostr-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".main-page-nostr-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [isLoadingMedia, contentSource]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        notes.length === 0 ||
        contentSource !== "notes" ||
        notesContentFrom === "trending"
      )
        return;
      let container = document.querySelector(".main-page-nostr-container");
      if (!container) return;
      if (
        container.scrollHeight - container.scrollTop - 60 >
        document.documentElement.offsetHeight
      ) {
        return;
      }
      if (notesContentFrom === "smart-widget")
        setNotesSWLastEventTime(
          notesSmartWidgets[notesSmartWidgets.length - 1]?.created_at ||
            undefined
        );
      else
        setNotesLastEventTime(notes[notes.length - 1]?.created_at || undefined);
    };
    document
      .querySelector(".main-page-nostr-container")
      ?.addEventListener("scroll", handleScroll);
    return () =>
      document
        .querySelector(".main-page-nostr-container")
        ?.removeEventListener("scroll", handleScroll);
  }, [isLoadingNotes, contentSource]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingNotes(true);
        let events = [];
        let { filter, relaysToFetchFrom } = getNotesFilter();

        let sub_ = pool.subscribeMany(relaysToFetchFrom, filter, {
          async onevent(event) {
            if (![...mutedList].includes(event.pubkey)) {
              events.push(event.pubkey);
              let event_ = await onNotesReceived(event);
              if (event_) {
                if (event.kind === 6) {
                  events.push(event_.repostPubkey);
                }
                if (notesContentFrom === "smart-widget")
                  setNotesSmartWidgets((prev) => {
                    let existed = prev.find((note) => note.id === event.id);
                    if (existed) return prev;
                    else
                      return [...prev, event_].sort(
                        (note_1, note_2) =>
                          note_2.created_at - note_1.created_at
                      );
                  });
                else
                  setNotes((prev) => {
                    let existed = prev.find((note) => note.id === event.id);
                    if (existed) return prev;
                    else
                      return [...prev, event_].sort(
                        (note_1, note_2) =>
                          note_2.created_at - note_1.created_at
                      );
                  });
              }
            }
          },
          oneose() {
            addNostrAuthors(events);
            setIsLoadingNotes(false);
            sub_.close();
          },
        });
        setNotesSub(sub_);
      } catch (err) {
        console.log(err);
        setIsLoadingNotes(false);
      }
    };
    if (Array.isArray(mutedList) && notesContentFrom !== "trending")
      fetchData();
  }, [notesLastEventTime, notesSWLastEventTime, mutedList, notesContentFrom]);

  useEffect(() => {
    let carousel_container = document.querySelector(".slider-list");
    let carousel = document.querySelector(".slider-list .no-scrollbar");

    if (
      carousel_container &&
      carousel_container.clientWidth < carousel.scrollWidth
    ) {
      setShowArrows(true);
      setScrollPX(0);
    } else {
      setShowArrows(false);
      setScrollPX(0);
    }
  }, [nostrUserTopics, contentSource]);

  const slideRight = () => {
    let carousel_container = document.querySelector(".slider-list");
    let carousel = document.querySelector(".slider-list .no-scrollbar");
    let pxToSlide =
      scrollPX + 100 < carousel.scrollWidth - carousel_container.clientWidth
        ? scrollPX + 100
        : carousel.scrollWidth - carousel_container.clientWidth;
    setScrollPX(pxToSlide);
  };
  const slideLeft = () => {
    let pxToSlide = scrollPX - 100 > 0 ? scrollPX - 100 : 0;
    setScrollPX(pxToSlide);
  };
  const onNotesReceived = async (event) => {
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

      let relatedEvent = await onNotesReceived(JSON.parse(event.content));
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

  const getExternalData = async () => {
    try {
      getFlashNews();
      getTrendingNotes();
      getTrendingProfiles();
    } catch (err) {
      console.log(err);
    }
  };

  const getFlashNews = async () => {
    try {
      let data = await axios.get(
        API_BASE_URL + "/api/v1/mb/flashnews/important"
      );

      setFlashNews(data.data);
    } catch (err) {
      console.log(err);
    }
  };
  const getTrendingNotes = async () => {
    try {
      let nostrBandNotes = await axios.get(
        "https://api.nostr.band/v0/trending/notes"
      );

      let tags = nostrBandNotes.data.notes
        ? nostrBandNotes.data.notes
            .map((note) =>
              note.event.tags
                .filter((tag) => tag[0] === "t")
                .map((tag) => tag[1].toLowerCase())
            )
            .flat()
        : [];
      setRecentTags([...new Set(tags)]);

      let trendingNotesAuthors = nostrBandNotes.data.notes.map((note) => {
        try {
          let author = getEmptyNostrUser(note.author.pubkey);
          try {
            author = JSON.parse(note.author.content);
          } catch (err) {
            console.log(err);
          }
          return { ...author, pubkey: note.pubkey };
        } catch (err) {
          console.log(err);
          return getEmptyNostrUser(note.pubkey);
        }
      });
      setNostrAuthors((prev) => [...prev, ...trendingNotesAuthors]);

      let tempTrendingNotes = await Promise.all(
        nostrBandNotes.data.notes.map(async (note) => {
          let note_ = onNotesReceived(note.event);
          return note_;
        })
      );
      tempTrendingNotes = tempTrendingNotes.filter((note) => note);
      setTrendingNotes(tempTrendingNotes);

      if (notesContentFrom === "trending") setIsLoadingNotes(false);
    } catch (err) {
      console.log(err);
    }
  };
  const getTrendingProfiles = async () => {
    try {
      let nostrBandProfiles = await axios.get(
        "https://api.nostr.band/v0/trending/profiles"
      );
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
    } catch (err) {
      console.log(err);
    }
  };

  const initSub = async () => {
    let events = [];
    let tags = getTags();
    setIsLoadingMedia(true);
    let { filter: arts_filter, relaysToFetchFrom: arts_relaysToFetchFrom } =
      getArtsFilter(tags);
    let { filter: fn_filter, relaysToFetchFrom: fn_relaysToFetchFrom } =
      getFNFilter(tags);
    let { filter: bf_filter, relaysToFetchFrom: bf_relaysToFetchFrom } =
      getBuzzFilter(tags);
    let { filter: vid_filter, relaysToFetchFrom: vid_relaysToFetchFrom } =
      getVideosFilter(tags);

    let sub_2 = pool_2.subscribeMany(bf_relaysToFetchFrom, bf_filter, {
      async onevent(event) {
        let parsedEvent = await onPostsEvent(event);
        events.push(parsedEvent);
        if (parsedEvent.is_authentic)
          setBuzzFeed((_BF) => {
            let newP = !_BF.find(
              (BF) => BF.id === event.id || event.content === BF.title
            )
              ? [..._BF, parsedEvent]
              : _BF;
            newP = newP.sort(
              (item_1, item_2) => item_2.created_at - item_1.created_at
            );
            return newP;
          });
      },
      oneose() {
        onEOSE(events);
      },
    });
    if (checkTopicInList(mediaContentFrom)?.bfs) return;

    let sub_1 = pool.subscribeMany(arts_relaysToFetchFrom, arts_filter, {
      async onevent(event) {
        if (![...mutedList].includes(event.pubkey)) {
          let parsedEvent = onArticlesEvent(event);
          events.push(parsedEvent);
        }
      },
      oneose() {
        onEOSE(events);
      },
    });
    let sub_3 = pool_1.subscribeMany(fn_relaysToFetchFrom, fn_filter, {
      async onevent(event) {
        if (![...mutedList].includes(event.pubkey)) {
          let parsedEvent = await onPostsEvent(event);
          events.push(parsedEvent);
          if (parsedEvent.is_authentic)
            setFlashnews((_FN) => {
              let newP = !_FN.find((FN) => FN.id === event.id)
                ? [..._FN, parsedEvent]
                : _FN;
              newP = newP.sort(
                (item_1, item_2) => item_2.created_at - item_1.created_at
              );
              return newP;
            });
        }
      },
      oneose() {
        onEOSE(events);
      },
    });

    let sub_4 = pool_3.subscribeMany(vid_relaysToFetchFrom, vid_filter, {
      async onevent(event) {
        if (![...mutedList].includes(event.pubkey)) {
          let parsedEvent = getVideoContent(event);
          events.push(parsedEvent);

          setVideos((_VID) => {
            let newP = !_VID.find(
              (VID) => VID.id === event.id || event.content === VID.title
            )
              ? [..._VID, parsedEvent]
              : _VID;
            newP = newP.sort(
              (item_1, item_2) => item_2.created_at - item_1.created_at
            );
            return newP;
          });
        }
      },
      oneose() {
        onEOSE(events);
      },
    });

    setSub1(sub_1);
    setSub2(sub_2);
    setSub3(sub_3);
    setSub4(sub_4);

    return;
  };

  const getArtsFilter = (tags) => {
    let relaysToFetchFrom;
    let filter;

    if (activeRelay) relaysToFetchFrom = [activeRelay];
    if (!activeRelay)
      relaysToFetchFrom = !nostrUser
        ? relaysOnPlatform
        : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])];

    if (mediaContentFrom === "HOMEFEED") {
      filter = [{ kinds: [30023], limit: 20, until: artsLastEventTime }];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    if (mediaContentFrom.includes("main-")) {
      filter = [
        { kinds: [30023], limit: 20, until: artsLastEventTime, "#t": tags },
      ];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    if (mediaContentFrom === "follows") {
      let authors =
          nostrUser && userFollowings.length > 0
            ? userFollowings
            : [
                "20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3",
              ],
        filter = [
          {
            kinds: [30023],
            authors,
            limit: 20,
            until: artsLastEventTime,
          },
        ];

      return {
        relaysToFetchFrom,
        filter,
      };
    }
    filter = [
      {
        kinds: [30023],
        limit: 20,
        until: artsLastEventTime,
        "#t": tags,
      },
    ];
    return {
      relaysToFetchFrom,
      filter,
    };
  };
  const getFNFilter = (tags) => {
    let relaysToFetchFrom;
    let filter;

    if (activeRelay) relaysToFetchFrom = [activeRelay];
    if (!activeRelay)
      relaysToFetchFrom = !nostrUser
        ? relaysOnPlatform
        : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])];

    if (mediaContentFrom === "HOMEFEED") {
      filter = [
        {
          kinds: [1],
          limit: 20,
          until: fnLastEventTime,
          "#l": ["FLASH NEWS"],
        },
      ];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    if (mediaContentFrom.includes("main-")) {
      filter = [
        {
          kinds: [1],
          limit: 20,
          until: fnLastEventTime,
          "#l": ["FLASH NEWS"],
          "#t": tags,
        },
      ];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    if (mediaContentFrom === "follows") {
      let authors =
          nostrUser && userFollowings.length > 0
            ? userFollowings
            : [
                "20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3",
              ],
        filter = [
          {
            kinds: [1],
            authors,
            limit: 20,
            until: fnLastEventTime,
            "#l": ["FLASH NEWS"],
          },
        ];

      return {
        relaysToFetchFrom,
        filter,
      };
    }
    filter = [
      {
        kinds: [1],
        limit: 20,
        until: fnLastEventTime,
        "#l": ["FLASH NEWS"],
        "#t": tags,
      },
    ];
    return {
      relaysToFetchFrom,
      filter,
    };
  };
  const getBuzzFilter = (tags) => {
    let relaysToFetchFrom;
    let filter;

    if (activeRelay) relaysToFetchFrom = [activeRelay];
    if (!activeRelay)
      relaysToFetchFrom = !nostrUser
        ? relaysOnPlatform
        : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])];

    if (mediaContentFrom === "HOMEFEED") {
      filter = [
        {
          kinds: [1],
          limit: 20,
          until: bfLastEventTime,
          "#l": ["YAKI AI FEED"],
        },
      ];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    if (mediaContentFrom.includes("main-")) {
      filter = [
        {
          kinds: [1],
          limit: 20,
          until: bfLastEventTime,
          "#l": ["YAKI AI FEED"],
          "#t": tags,
        },
      ];
      return {
        relaysToFetchFrom,
        filter,
      };
    }

    filter = [
      {
        kinds: [1],
        limit: 20,
        until: bfLastEventTime,
        "#l": ["YAKI AI FEED"],
        "#t": tags,
      },
    ];
    return {
      relaysToFetchFrom,
      filter,
    };
  };

  const getVideosFilter = (tags) => {
    let relaysToFetchFrom;
    let filter;

    if (activeRelay) relaysToFetchFrom = [activeRelay];
    if (!activeRelay)
      relaysToFetchFrom = !nostrUser
        ? relaysOnPlatform
        : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])];

    if (mediaContentFrom === "HOMEFEED") {
      filter = [
        {
          kinds: [34235],
          limit: 20,
          until: videosLastEventTime,
        },
      ];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    if (mediaContentFrom.includes("main-")) {
      filter = [
        {
          kinds: [34235],
          limit: 20,
          until: videosLastEventTime,

          "#t": tags,
        },
      ];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    if (mediaContentFrom === "follows") {
      let authors =
          nostrUser && userFollowings.length > 0
            ? userFollowings
            : [
                "20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3",
              ],
        filter = [
          {
            kinds: [34235],
            authors,
            limit: 20,
            until: videosLastEventTime,
          },
        ];

      return {
        relaysToFetchFrom,
        filter,
      };
    }
    filter = [
      {
        kinds: [34235],
        limit: 20,
        until: videosLastEventTime,
        "#t": tags,
      },
    ];
    return {
      relaysToFetchFrom,
      filter,
    };
  };

  const getNotesFilter = () => {
    let relaysToFetchFrom;
    let filter;

    relaysToFetchFrom = !nostrUser
      ? relaysOnPlatform
      : [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])];
    if (notesContentFrom === "followings") {
      let authors = Array.from(userFollowings);
      filter = [
        { authors, kinds: [1, 6], limit: 50, until: notesLastEventTime },
      ];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    if (notesContentFrom === "smart-widget") {
      filter = [
        {
          kinds: [1],
          limit: 10,
          until: notesLastEventTime,
          "#l": ["smart-widget"],
        },
      ];
      return {
        relaysToFetchFrom,
        filter,
      };
    }
    filter = [{ kinds: [1, 6], limit: 50, until: notesLastEventTime }];
    return {
      relaysToFetchFrom,
      filter,
    };
  };

  const getTags = () => {
    if (mediaContentFrom.includes("main-")) {
      let tempArray = shuffleArray(TopicsTags);
      let tempArray_2 = tempArray.splice(0, 5);
      return shuffleArray(
        tempArray_2.map((item) => [item.main_tag, ...item.sub_tags]).flat()
      );
    }
    if (mediaContentFrom === "follows") {
      return [];
    }
    if (mediaContentFrom === "HOMEFEED") {
      let searchedTag = TopicsTags.find(
        (item) => item.main_tag === mediaContentFrom
      );

      if (searchedTag) {
        return [searchedTag.main_tag, ...searchedTag.sub_tags];
      }
      return [mediaContentFrom];
    }
    let isBFS = checkTopicInList(mediaContentFrom);

    if (isBFS && !isBFS.bfs) {
      return [isBFS.main_tag, ...isBFS.sub_tags];
    }
    if (isBFS && isBFS.bfs) {
      return [isBFS.name];
    }
    return [mediaContentFrom];
  };

  const onArticlesEvent = (event) => {
    let author_img = "";
    let author_name = getBech32("npub", event.pubkey).substring(0, 10);
    let author_pubkey = event.pubkey;
    let thumbnail = "";
    let title = "";
    let summary = "";
    let from = "";
    let contentSensitive = false;
    let postTags = [];
    let d = "";
    let modified_date = new Date(event.created_at * 1000).toISOString();
    let added_date = new Date(event.created_at * 1000).toISOString();
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
      if (tag[0] === "client") from = tag[1];
      if (tag[0] === "title") title = tag[1];
      if (tag[0] === "summary") summary = tag[1];
      if (tag[0] === "t") postTags.push(tag[1]);
      if (tag[0] === "L" && tag[1] === "content-warning")
        contentSensitive = true;
      if (tag[0] === "d") d = tag[1];
    }

    let naddr = nip19.naddrEncode({
      identifier: d,
      pubkey: author_pubkey,
      kind: 30023,
    });
    let tempEvent = {
      id: event.id,
      pubkey: event.pubkey,
      kind: event.kind,
      content: event.content,
      thumbnail: thumbnail || getImagePlaceholder(),
      summary,
      author_img,
      author_pubkey,
      author_name,
      title,
      added_date,
      created_at: event.created_at,
      modified_date,
      published_at,
      postTags,
      naddr,
      d,
      contentSensitive,
      from: from || "N/A",
    };
    setPosts((_posts) => {
      let index = _posts.findIndex((item) => item.d === d);
      let newP = Array.from(_posts);

      if (index === -1) newP = [...newP, tempEvent];
      if (index !== -1) {
        if (_posts[index].created_at < event.created_at) {
          newP.splice(index, 1);
          newP.push(tempEvent);
        }
      }
      newP = newP.sort(
        (item_1, item_2) => item_2.created_at - item_1.created_at
      );

      return newP;
    });

    return tempEvent;
  };

  const onPostsEvent = async (news) => {
    let l = news.tags.find((tag) => tag[0] === "l")[1];
    if (l === "FLASH NEWS") {
      let parsed = await getFlashnewsContent(news);
      return parsed;
    }
    if (l === "YAKI AI FEED") {
      let parsed = getAIFeedContent(news);
      return parsed;
    }
  };

  const onEOSE = (events) => {
    if (events) {
      let filteredEvents = events.filter((event) => event);
      addNostrAuthors(filteredEvents.map((item) => item.pubkey));
    }
    setIsLoadingMedia(false);
  };

  const switchContentSource = (source) => {
    if (source === mediaContentFrom) return;
    if (sub1) sub1.close();
    if (sub2) sub2.close();
    if (sub3) sub3.close();
    if (sub4) sub4.close();
    setPosts([]);
    setFlashnews([]);
    setBuzzFeed([]);
    setVideos([]);
    setArtsLastEventTime(undefined);
    setFnLastEventTime(undefined);
    setBfLastEventTime(undefined);
    setMediaContentFrom(source);
  };

  const switchActiveRelay = (source) => {
    if (source === activeRelay) return;
    if (sub1) sub1.close();
    if (sub2) sub2.close();
    if (sub3) sub3.close();
    if (sub4) sub4.close();
    setPosts([]);
    setFlashnews([]);
    setBuzzFeed([]);
    setVideos([]);
    setActiveRelay(source);
    setBfLastEventTime(undefined);
    setArtsLastEventTime(undefined);
    setFnLastEventTime(undefined);
  };
  const checkTopicInList = (topic) => {
    let isBFS = buzzFeedSources.find((item) => item.name === topic);
    if (isBFS) {
      isBFS.bfs = true;
      return isBFS;
    }
    return TopicsTags.find((item) => item.main_tag === topic);
  };

  const handleContentSource = (source) => {
    const straightUp = () => {
      let el = document.querySelector(".main-page-nostr-container");
      if (!el) return;
      el.scrollTop = 0;
    };
    straightUp();
    setContentSource(source);
  };

  const handleNotesContentFrom = (from) => {
    if (from === notesContentFrom) return;
    const straightUp = () => {
      let el = document.querySelector(".main-page-nostr-container");
      if (!el) return;
      el.scrollTop = 0;
    };

    straightUp();
    setNotes([]);
    setNotesContentFrom(from);
  };

  return (
    <div style={{ overflow: "auto" }}>
      <Helmet>
        <title>Yakihonne | Home</title>
        <meta
          name="description"
          content={
            "A censorship and data ownership free protocol, you‘ll enjoy a fully decentralized media experience."
          }
        />
        <meta
          property="og:description"
          content={
            "A censorship and data ownership free protocol, you‘ll enjoy a fully decentralized media experience."
          }
        />

        <meta property="og:url" content={`https://yakihonne.com`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content="Yakihonne | Home" />
        <meta property="twitter:title" content="Yakihonne | Home" />
        <meta
          property="twitter:description"
          content={
            "A censorship and data ownership free protocol, you‘ll enjoy a fully decentralized media experience."
          }
        />
      </Helmet>
      <div className="fit-container fx-centered">
        <div className="main-container">
          <SidebarNOSTR />
          <main
            className="main-page-nostr-container"
            onClick={(e) => {
              e.stopPropagation();
              setShowRelaysList(false);
            }}
            style={{ padding: 0 }}
          >
            {showTopicsPicker && (
              <TopicTagsSelection exit={() => setShowTopicsPicker(false)} />
            )}
            {showLogin && <LoginNOSTR exit={() => setShowLogin(false)} />}
            <YakiIntro />
            <ArrowUp />
            <div className="fit-container fx-centered">
              <HomeFNMobile flashnews={flashNews} />
            </div>
            <div className="fit-container fx-centered fx-start-h fx-start-v">
              <div
                className="fit-container fx-centered fx-start-v fx-start-h"
                style={{ gap: 0 }}
              >
                <div
                  style={{ flex: 1.8 }}
                  className={`fx-centered  fx-wrap box-pad-h`}
                >
                  <div
                    className="fit-container sticky fx-centered fx-col"
                    style={{ rowGap: "16px" }}
                  >
                    <div className="fit-container fx-centered ">
                      <div
                        className={`list-item fx-centered fx ${
                          contentSource === "notes" ? "selected-list-item" : ""
                        }`}
                        onClick={() => handleContentSource("notes")}
                      >
                        {contentSource !== "notes" && (
                          <div className="wiggle">
                            <div className="note-2-24"></div>
                          </div>
                        )}
                        <p>Notes</p>
                      </div>
                      <div
                        className={`list-item fx-centered fx ${
                          contentSource === "media" ? "selected-list-item" : ""
                        }`}
                        onClick={() => handleContentSource("media")}
                      >
                        {contentSource !== "media" && (
                          <div className="wiggle">
                            <div className="media-24"></div>
                          </div>
                        )}
                        <p>Media</p>
                      </div>
                    </div>
                    {contentSource === "media" && (
                      <div
                        className="fit-container fx-centered  sticky"
                        style={{
                          padding: 0,
                        }}
                      >
                        <div className="fit-container fx-scattered">
                          {showArrows && (
                            <div
                              className="box-pad-h-s pointer slide-right"
                              onClick={slideLeft}
                            >
                              <div
                                className="arrow"
                                style={{ transform: "rotate(90deg)" }}
                              ></div>
                            </div>
                          )}
                          <div
                            className="fx-centered fx-start-h no-scrollbar slider-list fit-container"
                            style={{
                              overflow: "hidden",
                            }}
                          >
                            <div
                              className="fx-centered fx-start-h no-scrollbar fit-container"
                              style={{
                                transform: `translateX(-${scrollPX}px)`,
                                transition: ".3s ease-in-out",
                                columnGap: "20px",
                                width: "100px",
                              }}
                            >
                              <div
                                className={`list-item fx-centered fx-shrink ${
                                  mediaContentFrom === "HOMEFEED"
                                    ? "selected-list-item"
                                    : ""
                                }`}
                                onClick={() => switchContentSource("HOMEFEED")}
                              >
                                <div className="timeline"></div>
                                Timeline
                              </div>
                              <div
                                className={`list-item fx-centered fx-shrink ${
                                  mediaContentFrom === "follows"
                                    ? "selected-list-item"
                                    : ""
                                }`}
                                onClick={() => switchContentSource("follows")}
                              >
                                <div className="followings"></div>
                                Followings
                              </div>
                              {nostrUserTopics.map((item, index) => {
                                let status = checkTopicInList(item);
                                return (
                                  <div
                                    className={`list-item fx-centered fx-shrink ${
                                      item === mediaContentFrom
                                        ? "selected-list-item"
                                        : ""
                                    }`}
                                    onClick={() => {
                                      switchContentSource(item);
                                    }}
                                    key={`${item}-${index}`}
                                  >
                                    {status && (
                                      <img
                                        width="16"
                                        height="16"
                                        src={status.icon}
                                        alt={item}
                                      />
                                    )}
                                    {!status && (
                                      <img
                                        width="16"
                                        height="16"
                                        src={defaultTopicIcon}
                                        alt={item}
                                      />
                                    )}
                                    {item}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="fx-centered">
                            {showArrows && (
                              <div
                                className="box-pad-h-s pointer slide-left"
                                onClick={slideRight}
                                style={{
                                  background:
                                    "linear-gradient(to left,var(--white) 20%,rgba(255,255,255,0) 100%)",
                                }}
                              >
                                <div
                                  className="arrow"
                                  style={{ transform: "rotate(-90deg)" }}
                                ></div>
                              </div>
                            )}
                            {showTabsSettings && (
                              <>
                                <div
                                  className="round-icon-small round-icon-tooltip slide-right"
                                  data-tooltip={"customize topics"}
                                  onClick={() =>
                                    nostrUserLoaded && nostrUser
                                      ? setShowTopicsPicker(true)
                                      : setShowLogin(true)
                                  }
                                >
                                  <p>&#xFF0B;</p>
                                </div>
                                <div
                                  style={{ position: "relative" }}
                                  className="slide-right"
                                >
                                  <div
                                    style={{ position: "relative" }}
                                    className="round-icon-small round-icon-tooltip"
                                    data-tooltip={
                                      activeRelay
                                        ? `${activeRelay} is ${
                                            isLoadingMedia || isLoadingNotes
                                              ? "connecting"
                                              : "connected"
                                          }`
                                        : "All relays"
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowRelaysList(!showRelaysList);
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
                                          color:
                                            activeRelay === ""
                                              ? "var(--c1)"
                                              : "",
                                          transition: ".4s ease-in-out",
                                        }}
                                        onClick={() => {
                                          switchActiveRelay("");
                                          setShowRelaysList(false);
                                        }}
                                      >
                                        {(isLoadingMedia || isLoadingNotes) &&
                                        activeRelay === "" ? (
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
                                              {(isLoadingMedia ||
                                                isLoadingNotes) &&
                                              relay === activeRelay ? (
                                                <>Connecting...</>
                                              ) : (
                                                relay.split("wss://")[1]
                                              )}
                                            </button>
                                          );
                                        })}
                                      {(!nostrUser ||
                                        (nostrUser &&
                                          nostrUser.relays.length === 0)) &&
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
                                              {(isLoadingMedia ||
                                                isLoadingNotes) &&
                                              relay === activeRelay ? (
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
                              </>
                            )}
                            <div
                              className="setting-24"
                              onClick={() =>
                                setShowTabsSettings(!showTabsSettings)
                              }
                              style={{
                                rotate: showTabsSettings ? "45deg" : "initial",
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {contentSource === "notes" && (
                      <div
                        className="fit-container fx-centered"
                        style={{
                          padding: 0,
                        }}
                      >
                        <div
                          className={`list-item fx-centered fx ${
                            notesContentFrom === "universal"
                              ? "selected-list-item"
                              : ""
                          }`}
                          onClick={() => handleNotesContentFrom("universal")}
                        >
                          <div className="globe"></div>
                          Universal
                        </div>
                        <div
                          className={`list-item fx-centered fx ${
                            notesContentFrom === "smart-widget"
                              ? "selected-list-item"
                              : ""
                          }`}
                          onClick={() => handleNotesContentFrom("smart-widget")}
                        >
                          <div className="smart-widget"></div>
                          Widget
                        </div>
                        <div
                          className={`list-item fx-centered fx ${
                            notesContentFrom === "trending"
                              ? "selected-list-item"
                              : ""
                          }`}
                          onClick={() => handleNotesContentFrom("trending")}
                        >
                          <div className="trending-up"></div>
                          Trending
                        </div>
                        {nostrKeys && (nostrKeys.sec || nostrKeys.ext) && (
                          <div
                            className={`list-item fx-centered fx ${
                              notesContentFrom === "followings"
                                ? "selected-list-item"
                                : ""
                            }`}
                            onClick={() => handleNotesContentFrom("followings")}
                          >
                            <div className="followings"></div>
                            Followings
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {contentSource === "media" && (
                    <>
                      {!isLoadingMedia &&
                        mixedContent.map((item, index) => {
                          if (item.kind === 30023 && item.title)
                            return (
                              <div
                                key={item.id}
                                className="fit-container fx-centered "
                              >
                                <PostPreviewCardNOSTR item={item} />
                              </div>
                            );
                          if (item.l === "FLASH NEWS")
                            return (
                              <div
                                key={item.id}
                                className="fit-container fx-centered "
                              >
                                <FlashNewsPreviewCard item={item} />
                              </div>
                            );
                          if (item.l === "YAKI AI FEED")
                            return (
                              <div
                                key={item.id}
                                className="fit-container fx-centered "
                              >
                                <BuzzFeedPreviewCard item={item} />
                              </div>
                            );
                          if (item.kind === 34235)
                            return (
                              <div
                                key={item.id}
                                className="fit-container fx-centered "
                              >
                                <VideosPreviewCards item={item} />
                              </div>
                            );
                        })}

                      {isLoadingMedia && (
                        <div className="fit-container box-pad-v fx-centered fx-col">
                          <p className="gray-c">Loading</p>
                          <LoadingDots />
                        </div>
                      )}

                      {!isLoadingMedia &&
                        posts.length === 0 &&
                        videos.length === 0 &&
                        flashnews.length === 0 &&
                        buzzFeed.length === 0 && (
                          <div
                            className="fit-container fx-centered fx-col"
                            style={{ height: "30vh" }}
                          >
                            <h4>No content to show!</h4>
                            <p
                              className="gray-c p-centered"
                              style={{ maxWidth: "500px" }}
                            >
                              There's no feeds on this :(
                            </p>
                          </div>
                        )}
                    </>
                  )}
                  {contentSource === "notes" && (
                    <div className={`fx-centered  fx-wrap fit-container`}>
                      {notesContentFrom === "trending" &&
                        trendingNotes.map((note) => {
                          if (note.kind === 6)
                            return <KindSix event={note} key={note.id} />;
                          return <KindOne event={note} key={note.id} />;
                        })}
                      {["universal", "followings"].includes(notesContentFrom) &&
                        notes.map((note) => {
                          if (note.kind === 6)
                            return <KindSix event={note} key={note.id} />;
                          return <KindOne event={note} key={note.id} />;
                        })}
                      {["smart-widget"].includes(notesContentFrom) &&
                        notesSmartWidgets.map((note) => {
                          if (note.kind === 6)
                            return <KindSix event={note} key={note.id} />;
                          return <KindOne event={note} key={note.id} />;
                        })}

                      {isLoadingNotes && (
                        <div
                          className="fit-container box-pad-v fx-centered fx-col"
                          style={{ height: "30vh" }}
                        >
                          <p className="gray-c">Loading</p>
                          <LoadingDots />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className=" fx-centered fx-col fx-start-v extras-homepage"
                  style={{
                    position: "sticky",
                    top:
                      extrasRef.current?.getBoundingClientRect().height >=
                      window.innerHeight
                        ? `calc(95vh - ${
                            extrasRef.current?.getBoundingClientRect().height ||
                            0
                          }px)`
                        : 0,
                    zIndex: "100",
                    flex: 1,
                  }}
                  ref={extrasRef}
                >
                  <div className="sticky fit-container">
                    <SearchbarNOSTR />
                  </div>
                  <div
                    className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v"
                    style={{
                      backgroundColor: "var(--c1-side)",
                      rowGap: "24px",
                      border: "none",
                    }}
                  >
                    <h4>Important Flash News</h4>
                    <HomeFN flashnews={flashNews} />
                  </div>
                  {topCreators.length > 0 && (
                    <div
                      className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v"
                      style={{
                        backgroundColor: "var(--c1-side)",
                        rowGap: "24px",
                        border: "none",
                        overflow: "visible",
                      }}
                    >
                      <div className="fx-centered fx-start-h fx-col">
                        <h4>Trending users</h4>
                      </div>
                      <TopCreators
                        top_creators={topCreators}
                        kind="Followers"
                      />
                    </div>
                  )}

                  {recentTags.length > 0 && (
                    <div
                      className="fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v"
                      style={{
                        backgroundColor: "var(--c1-side)",
                        rowGap: "24px",
                        border: "none",
                      }}
                    >
                      <h4>Trending tags</h4>
                      <div className="fx-centered fx-start-h fx-wrap">
                        {recentTags.map((tag, index) => {
                          return (
                            <Link
                              key={index}
                              className="sticker sticker-small sticker-c1 pointer"
                              to={`/tags/${tag?.replace("#", "%23")}`}
                            >
                              {tag}
                            </Link>
                          );
                        })}
                      </div>
                      {recentTags.length === 0 && (
                        <div
                          className="fit-container fx-centered sc-s posts-card"
                          style={{
                            height: "200px",
                            backgroundColor: "transparent",
                            border: "none",
                          }}
                        >
                          <LoadingDots />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="fx-centered box-pad-v-s fx-col fx-start-v">
                    {recentTags.length > 0 && sideContentType === "2" && (
                      <div className="fx-centered fx-start-h fx-wrap">
                        {recentTags.map((tag, index) => {
                          return (
                            <Link
                              key={index}
                              className="sticker sticker-small sticker-gray-gray pointer"
                              to={`/tags/${tag?.replace("#", "%23")}`}
                            >
                              {tag}
                            </Link>
                          );
                        })}
                      </div>
                    )}
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
