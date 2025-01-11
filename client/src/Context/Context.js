import React, { useEffect, useRef, useState } from "react";
import { SimplePool } from "nostr-tools";
import relaysOnPlatform from "../Content/Relays";
import {
  decrypt04,
  filterRelays,
  getBech32,
  getEmptyNostrUser,
  getParsed3000xContent,
  unwrapGiftWrap,
} from "../Helpers/Encryptions";
import axios from "axios";
import { getCurrentLevel, levelCount } from "../Helpers/Helpers";
import axiosInstance from "../Helpers/HTTP_Client";
const Context = React.createContext();

const pool = new SimplePool();
const DMs_pool = new SimplePool();
const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

const toggleColorScheme = (theme) => {
  const stylesheets = document.styleSheets;
  for (const sheet of stylesheets) {
    const rules = sheet.cssRules || sheet.rules;

    for (const rule of rules) {
      if (rule.media && rule.media.mediaText.includes("prefers-color-scheme")) {
        const newMediaText = !theme
          ? "(prefers-color-scheme: dark)"
          : "(prefers-color-scheme: light)";
        console.log(newMediaText);
        rule.media.mediaText = newMediaText;
      }
    }
  }
};

const aggregateUsers = (convo, oldAggregated = [], connectedAccountPubkey) => {
  const arr2 = [];
  const map =
    oldAggregated.length > 0
      ? new Map(oldAggregated.map((item) => [item.pubkey, item]))
      : new Map();

  convo.forEach((item) => {
    let pubkey = item.peer || item.pubkey;
    if (map.has(`${pubkey}`)) {
      let checkConvo = map
        .get(`${pubkey}`)
        .convo.find((item_) => item_.id === item.id);

      if (!checkConvo) {
        let sortedConvo = [...map.get(`${pubkey}`).convo, item].sort(
          (convo_1, convo_2) => convo_1.created_at - convo_2.created_at
        );
        map.get(`${pubkey}`).convo = sortedConvo;
        map.get(`${pubkey}`).checked =
          (map.get(`${pubkey}`).checked &&
            sortedConvo[sortedConvo.length - 1].created_at ===
              map.get(`${pubkey}`).last_message) ||
          (item.peer ? true : false);
        map.get(`${pubkey}`).last_message =
          sortedConvo[sortedConvo.length - 1].created_at;
      }
    } else {
      map.set(`${pubkey}`, {
        pubkey,
        last_message: item.created_at,
        checked: item.peer ? true : false,
        convo: [item],
        id: pubkey,
      });
    }
  });

  arr2.push(...map.values());
  arr2.sort((convo_1, convo_2) => convo_2.last_message - convo_1.last_message);
  return arr2;
};

const ContextProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("yaki-theme") || "0"
  );
  const [nostrUser, setNostrUser] = useState(false);
  const [userFirstLoginYakiChest, setUserFirstLoginYakiChest] = useState(false);
  const [nostrUserBookmarks, setNostrUserBookmarks] = useState([]);
  const [tempUserMeta, setTempUserMeta] = useState(false);
  const [userRelays, setUserRelays] = useState([]);
  const [nostrUserAbout, setNostrUserAbout] = useState(false);
  const [nostrUserTags, setNostrUserTags] = useState([]);
  const [nostrUserLoaded, setNostrUserLoaded] = useState(false);
  const [initDMS, setInitDMS] = useState(false);
  const [nostrUserTopics, setNostrUserTopics] = useState([]);
  const [nostrKeys, setNostrKeys] = useState(false);
  const [nostrAuthors, setNostrAuthors] = useState([]);
  const [globalCuration, setGlobalCuration] = useState([]);
  const [toast, setToast] = useState(false);
  const [toPublish, setToPublish] = useState(false);
  const [isPublishing, setPublishing] = useState(false);
  const [nostrClients, setNostrClients] = useState([]);
  const [buzzFeedSources, setBuzzFeedSources] = useState([]);
  const [loadCacheDB, setLoadCacheDB] = useState(false);
  const [chatrooms, setChatrooms] = useState([]);
  const [chatContacts, setChatContacts] = useState([]);
  const [userFollowings, setUserFollowings] = useState([]);
  const [mutedList, setMutedList] = useState([]);
  const [lastMessageDate, setLastMessageDate] = useState(undefined);
  const [tempChannel, setTempChannel] = useState(false);
  const [isConnectedToYaki, setIsConnectedToYaki] = useState(
    localStorage.getItem("connect_yc") ? true : false
  );
  const [yakiChestStats, setYakiChestStats] = useState(false);
  const [isYakiChestLoaded, setIsYakiChestLoaded] = useState(false);
  const [dmsSub, setDmSub] = useState(null);
  const [updatedActionFromYakiChest, setUpdatedActionFromYakiChest] =
    useState(false);
  const [balance, setBalance] = useState("N/A");
  const isDarkModeRef = useRef(isDarkMode);

  useEffect(() => {
    let getKeys = () => {
      try {
        let keys = localStorage.getItem("_nostruserkeys");
        keys = JSON.parse(keys);
        return keys;
      } catch (err) {
        return false;
      }
    };
    let keys = getKeys();
    let fetchData = async (keys) => {
      getNostrClients();
      getBuzzFeedSources();
      setNostrKeys(keys);
      let user = await getUserFromNOSTR(keys.pub);
      if (user) {
        setNostrUserData(user, keys);
      }
      return;
    };
    setNostrUser(false);
    setNostrUserLoaded(true);

    if (isDarkMode === "0") toggleColorScheme(false);
    if (isDarkMode === "1") toggleColorScheme(true);
    if (keys) {
      fetchData(keys);
      cacheDBInit(keys);
    }
  }, []);

  useEffect(() => {
    let sub = null;
    if (loadCacheDB && nostrKeys && (nostrKeys.ext || nostrKeys.sec)) {
      setInitDMS(true);

      let tempInbox = [];
      let tempAuthors = [];
      let tempUserFollowings;
      let tempMutedList;
      let eose = false;
      sub = DMs_pool.subscribeMany(
        relaysOnPlatform,
        [
          {
            kinds: [4],
            authors: [nostrKeys.pub],
            since: lastMessageDate ? lastMessageDate + 1 : lastMessageDate,
          },
          {
            kinds: [4],
            "#p": [nostrKeys.pub],
            since: lastMessageDate ? lastMessageDate + 1 : lastMessageDate,
          },
          {
            kinds: [1059],
            "#p": [nostrKeys.pub],
            since: lastMessageDate ? lastMessageDate - 604800 : lastMessageDate,
          },
          {
            kinds: [3, 10000],
            authors: [nostrKeys.pub],
          },
        ],
        {
          async onevent(event) {
            if (event.kind === 4) {
              let decryptedMessage = "";
              tempAuthors = [...new Set([...tempAuthors, event.pubkey])];
              let peer =
                event.pubkey === nostrKeys.pub
                  ? event.tags.find(
                      (tag) => tag[0] === "p" && tag[1] !== nostrKeys.pub
                    )[1]
                  : "";
              let reply = event.tags.find((tag) => tag[0] === "e");
              let replyID = reply ? reply[1] : "";

              decryptedMessage = await decrypt04(event, nostrKeys);
              let tempEvent = {
                id: event.id,
                created_at: event.created_at,
                content: decryptedMessage,
                pubkey: event.pubkey,
                kind: event.kind,
                peer,
                replyID,
              };
              tempInbox.push(tempEvent);
              if (eose) handleDM(tempInbox, [event.pubkey], chatrooms);
            }
            if (
              event.kind === 1059 &&
              (nostrKeys.sec || window?.nostr?.nip44)
            ) {
              try {
                let unwrappedEvent = await unwrapGiftWrap(event, nostrKeys.sec);
                if (unwrappedEvent && unwrappedEvent.kind === 14) {
                  tempAuthors = [
                    ...new Set([...tempAuthors, unwrappedEvent.pubkey]),
                  ];
                  let peer =
                    unwrappedEvent.pubkey === nostrKeys.pub
                      ? unwrappedEvent.tags.find(
                          (tag) => tag[0] === "p" && tag[1] !== nostrKeys.pub
                        )[1]
                      : "";
                  let reply = unwrappedEvent.tags.find((tag) => tag[0] === "e");
                  let replyID = reply ? reply[1] : "";
                  let tempEvent = {
                    id: unwrappedEvent.id,
                    created_at: unwrappedEvent.created_at,
                    content: unwrappedEvent.content,
                    pubkey: unwrappedEvent.pubkey,
                    kind: unwrappedEvent.kind,
                    peer,
                    replyID,
                  };

                  tempInbox.push(tempEvent);

                  if (eose)
                    handleDM(tempInbox, [unwrappedEvent.pubkey], chatrooms);
                }
              } catch (err) {
                console.log(err);
              }
            }
            if (event.kind === 3) {
              tempUserFollowings = { ...event };
              if (eose) handleUserFollowings(event);
            }
            if (event.kind === 10000) {
              tempMutedList = { ...event };
              if (eose) handleMutedList(event);
            }
          },
          oneose() {
            handleDM(tempInbox, tempAuthors, chatrooms);
            handleUserFollowings(tempUserFollowings);
            handleMutedList(tempMutedList);
            eose = true;
            setInitDMS(false);
          },
        }
      );
      setDmSub(sub);
    }
    return () => {
      sub && sub.close();
    };
  }, [loadCacheDB, nostrKeys]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsYakiChestLoaded(false);
        const data = await axiosInstance.get("/api/v1/yaki-chest/stats");
        if (data.data.user_stats.pubkey !== nostrKeys.pub) {
          userLogout();
          setIsYakiChestLoaded(false);
          return;
        }
        let { user_stats, platform_standards } = data.data;
        updateYakiChestStats(user_stats);
        setIsYakiChestLoaded(true);
      } catch (err) {
        console.log(err);
        localStorage.removeItem("connect_yc");
        setIsYakiChestLoaded(true);
      }
    };
    if (nostrKeys && isConnectedToYaki) fetchData();
    if (nostrKeys && !isConnectedToYaki) setIsYakiChestLoaded(true);
  }, [nostrKeys, isConnectedToYaki]);

  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
  }, [isDarkMode]);

  const handleDM = (inbox, authors, oldAggregated) => {
    addNostrAuthors(authors);
    let sortedInbox = aggregateUsers(inbox, oldAggregated, nostrKeys.pub);
    let openDB = indexedDB.open("yaki-nostr", 3);
    openDB.onsuccess = () => {
      let db = openDB.result;
      db.onversionchange = function () {
        db.close();
      };
      let transaction = db.transaction(
        ["chatrooms", "chatContacts"],
        "readwrite"
      );
      let chatrooms_ = transaction.objectStore("chatrooms");

      for (let ibx of sortedInbox) {
        chatrooms_.put(ibx, `${ibx.pubkey},${nostrKeys.pub}`);
      }

      setChatrooms(sortedInbox);
    };
  };

  const handleUserFollowings = (event) => {
    if (!event) return;

    let user_followings = event.tags
      .filter((tag) => tag[0] === "p")
      .map((tag) => tag[1]);
    let openDB = indexedDB.open("yaki-nostr", 3);
    openDB.onsuccess = () => {
      let db = openDB.result;
      db.onversionchange = function () {
        db.close();
      };
      let transaction = db.transaction(["followings"], "readwrite");
      let followings = transaction.objectStore("followings");

      followings.put(user_followings, nostrKeys.pub);

      setUserFollowings(user_followings);
    };
  };

  const handleMutedList = (event) => {
    if (!event) return;
    let muted_list = event.tags
      .filter((tag) => tag[0] === "p")
      .map((tag) => tag[1]);
    let openDB = indexedDB.open("yaki-nostr", 3);
    openDB.onsuccess = () => {
      let db = openDB.result;
      db.onversionchange = function () {
        db.close();
      };
      let transaction = db.transaction(["muted"], "readwrite");
      let muted = transaction.objectStore("muted");
      muted.put(muted_list, nostrKeys.pub);
      setMutedList(muted_list);
    };
  };
  const setNostrUserData = async (data, nostrKeys) => {
    if (data) {
      setNostrUserLoaded(false);
      let content = data;

      let userAbout = JSON.parse(content.content) || {};
      let [relays, userTopics] = await Promise.all([
        getRelaysOfUser(content.pubkey),
        getUserTopics(content.pubkey),
      ]);
      let userData = {
        pubkey: content.pubkey,
        added_date: new Date(content.created_at * 1000).toISOString(),
        picture: userAbout?.picture || "",
        banner: userAbout?.banner || "",
        display_name:
          userAbout?.display_name ||
          userAbout?.name ||
          getBech32("npub", content.pubkey),
        name:
          userAbout?.name ||
          userAbout?.display_name ||
          getBech32("npub", content.pubkey),
        about: userAbout?.about || "",
        nip05: userAbout?.nip05 || "",
        lud06: userAbout?.lud06 || "",
        lud16: userAbout?.lud16 || "",
        website: userAbout?.website || "",
        relays,
      };
      addConnectedAccounts(userData, nostrKeys);
      setNostrUser(userData);
      setNostrUserAbout(userAbout);
      setUserRelays(filterRelays(relays, relaysOnPlatform));
      setTempUserMeta(userAbout);
      getUserBookmarks(content.pubkey);
      setNostrUserTopics(userTopics);
      setNostrUserLoaded(true);
      return;
    }
    setNostrUser(false);
    setNostrUserLoaded(true);
  };
  const getUserRelaysAndTopics = async (pubkey) => {
    try {
      let [relays, userTopics] = await Promise.all([
        getRelaysOfUser(pubkey),
        getUserTopics(pubkey),
      ]);
      setUserRelays(filterRelays(relays, relaysOnPlatform));
      setNostrUserTopics(userTopics);
    } catch (err) {
      console.log(err);
    }
  };
  const getConnectedAccounts = () => {
    try {
      let accounts = localStorage.getItem("yaki-accounts") || [];
      accounts = Array.isArray(accounts) ? [] : JSON.parse(accounts);
      return accounts;
    } catch (err) {
      console.log(err);
      return [];
    }
  };
  const addConnectedAccounts = (account, nostrKeys) => {
    try {
      let accounts = getConnectedAccounts() || [];
      let isAccount = accounts.findIndex(
        (account_) => account_.pubkey === account.pubkey
      );
      if (isAccount === -1) {
        accounts.push({ ...account, nostrKeys });
        localStorage.setItem("yaki-accounts", JSON.stringify(accounts));
      } else {
        accounts.splice(isAccount, 1, { ...account, nostrKeys });
        localStorage.setItem("yaki-accounts", JSON.stringify(accounts));
      }
    } catch (err) {
      console.log(err);
    }
  };
  const setNostrKeysData = (data) => {
    if (data) {
      localStorage.setItem("_nostruserkeys", JSON.stringify(data));
      setInitDMS(true);
      if (chatrooms.length > 0) {
        setChatrooms([]);
        cacheDBInit(data);
      }
      setNostrKeys(data);
      return;
    }
    setNostrKeys(false);
  };

  const handleSwitchAccount = (account) => {
    let keys = account.nostrKeys;
    let about = { ...account };
    delete about.nostrKeys;
    if (dmsSub) dmsSub.close();
    getUserRelaysAndTopics(keys.pub);
    setUserFollowings([]);
    setChatrooms([]);
    setLoadCacheDB(false);
    setNostrKeysData(keys);
    setNostrUserAbout(about);
    setNostrUserBookmarks([]);
    setNostrUserTopics([]);
    setChatContacts([]);
    yakiChestDisconnect();
    setInitDMS(true);
    cacheDBInit(account.nostrKeys);
  };

  const yakiChestDisconnect = async () => {
    try {
      setIsConnectedToYaki(false);
      setYakiChestStats(false);
      const data = await axiosInstance.post("/api/v1/logout");
    } catch (err) {
      console.log(err);
    }
  };

  const logoutAllAccounts = async () => {
    localStorage.removeItem("_nostruser");
    localStorage.removeItem("_nostruserkeys");
    localStorage.removeItem("comment-with-prefix");
    localStorage.removeItem("connect_yc");
    localStorage.removeItem("yaki-wallets");
    localStorage.removeItem("yaki-accounts");
    setIsConnectedToYaki(false);
    setYakiChestStats(false);
    setBalance("N/A");
    let openDB = window.indexedDB.open("yaki-nostr", 3);
    openDB.onsuccess = () => {
      let db = openDB.result;
      db.onversionchange = function () {
        db.close();
      };
      let transaction = db.transaction(
        ["chatrooms", "chatContacts", "followings", "muted"],
        "readwrite"
      );
      let chatrooms_ = transaction.objectStore("chatrooms");
      let chatContacts_ = transaction.objectStore("chatContacts");
      let followings_ = transaction.objectStore("followings");
      let muted = transaction.objectStore("muted");
      let cR = chatrooms_.clear();
      let cC = chatContacts_.clear();
      let uF = followings_.clear();
      let mL = muted.clear();

      cR.onsuccess = (event) => {
        console.log("DB cleared");
      };
      cC.onsuccess = (event) => {
        console.log("DB cleared");
      };
      uF.onsuccess = (event) => {
        console.log("DB cleared");
      };
      mL.onsuccess = (event) => {
        console.log("DB cleared");
      };
    };
    setNostrUser(false);
    setNostrKeys(false);
    setNostrUserAbout(false);
    setTempUserMeta(false);
    setNostrUserBookmarks([]);
    setNostrUserTopics([]);
    setChatContacts([]);
    setChatrooms([]);
    setMutedList([]);
    setLastMessageDate(undefined);
    try {
      const data = await axiosInstance.post("/api/v1/logout");
    } catch (err) {
      console.log(err);
    }
  };
  const userLogout = async () => {
    let accounts = getConnectedAccounts();
    if (accounts.length < 2) {
      logoutAllAccounts();
      return;
    }
    let accountIndex = accounts.findIndex(
      (account) => account.nostrKeys.pub === nostrKeys.pub
    );
    if (accountIndex !== -1) {
      accounts.splice(accountIndex, 1);
      localStorage.setItem("yaki-accounts", JSON.stringify(accounts));
      if (accounts.length > 0) handleSwitchAccount(accounts[0]);
    }
  };

  const getUserFromNOSTR = (pubkey) => {
    return new Promise((resolve, reject) => {
      try {
        const subscription = pool.subscribeMany(
          relaysOnPlatform,
          [
            {
              kinds: [0],
              authors: [pubkey],
            },
          ],
          {
            onevent(event) {
              resolve(event);
            },
            oneose() {
              resolve(getEmptyNostrUser(pubkey));
            },
          }
        );
      } catch (err) {
        resolve(getEmptyNostrUser(pubkey));
      }
    });
  };

  const getNostrClients = async () => {
    try {
      let clients = await pool.querySync(
        [...relaysOnPlatform, "wss://relay.nostr.band"],
        {
          kinds: [31990],
        }
      );
      setNostrClients(clients);
    } catch (err) {
      console.log(err);
    }
  };
  const getBuzzFeedSources = async () => {
    try {
      const data = await axios.get(API_BASE_URL + "/api/v1/af-sources");
      setBuzzFeedSources(data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const getUserTopics = (pubkey) => {
    return new Promise((resolve, reject) => {
      try {
        let topics = [];
        const subscription = pool.subscribeMany(
          relaysOnPlatform,
          [
            {
              kinds: [30078],
              authors: [pubkey],
              "#d": ["MyFavoriteTopicsInYakihonne"],
            },
          ],
          {
            onevent(event) {
              const newTopics = event.tags
                .filter((tag) => tag[0] === "t")
                .map((tag) => tag[1]);
              topics = [...new Set([...topics, ...newTopics])];
              resolve(topics);
            },
            oneose() {
              resolve(topics);
            },
          }
        );
      } catch (err) {
        resolve([]);
      }
    });
  };

  const getUserFollowing = (pubkey) => {
    return new Promise((resolve, reject) => {
      try {
        let following = [];
        const subscription = pool.subscribeMany(
          relaysOnPlatform,
          [
            {
              kinds: [3],
              authors: [pubkey],
            },
          ],
          {
            onevent(event) {
              const newFollowing = event.tags.filter((tag) => tag[0] === "p");
              following = [...new Set([...following, ...newFollowing])];
              resolve(following);
            },
            oneose() {
              resolve([]);
            },
          }
        );
      } catch (err) {
        resolve([]);
      }
    });
  };

  const getUserBookmarks = async (pubkey) => {
    try {
      let sub = pool.subscribeMany(
        relaysOnPlatform,
        [
          {
            kinds: [30003],
            authors: [pubkey],
          },
        ],
        {
          onevent(event) {
            let eventD = event.tags.find((tag) => tag[0] === "d")[1];
            setNostrUserBookmarks((bookmarks) => {
              let bookmarkContent = getParsed3000xContent(event.tags);
              return [
                { ...event, bookmarkContent },
                ...bookmarks.filter(
                  (bookmark) =>
                    bookmark.tags.find((tag) => tag[0] === "d")[1] !== eventD
                ),
              ];
            });
          },
        }
      );
    } catch (err) {
      console.log(err);
      return [];
    }
  };

  const getRelaysOfUser = (pubkey) => {
    return new Promise((resolve, reject) => {
      try {
        let relays = [];
        const subscription = pool.subscribeMany(
          relaysOnPlatform,
          [
            {
              kinds: [10002],
              authors: [pubkey],
            },
          ],
          {
            onevent(event) {
              const newRelays = event.tags
                .filter((tag) => tag[0] === "r")
                .map((tag) => tag[1]);
              relays = [...new Set([...relays, ...newRelays])];
              resolve(relays);
            },
            oneose() {
              resolve(relays);
            },
          }
        );
      } catch (err) {
        resolve([]);
      }
    });
  };

  const addNostrAuthors = async (pubkeys) => {
    let BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;
    let tempNostrAuthors_1 = Array.from(nostrAuthors);
    let tempNostrAuthors_2 = [];
    let tempNostrAuthors_3 = [];
    for (let author of pubkeys) {
      if (!tempNostrAuthors_1.find((item) => item.pubkey === author))
        tempNostrAuthors_2.push(author);
    }

    if (tempNostrAuthors_2.length === 0) return;
    let data = await axios.post(BASE_URL + "/api/v1/users", {
      users_pubkeys: tempNostrAuthors_2,
    });
    let res = data.data;
    if (res.length === 0 && pubkeys.length === 1)
      setNostrAuthors((prev) => [...prev, getEmptyNostrUser(pubkeys[0])]);

    setNostrAuthors((prev) => {
      return [...prev, ...res].filter((item, index) => {
        if (
          [...prev, ...res].findIndex(
            (item_) => item_.pubkey === item.pubkey
          ) === index
        )
          return item;
      });
    });
    let openDB = indexedDB.open("yaki-nostr", 3);
    openDB.onsuccess = (event) => {
      let db = openDB.result;
      db.onversionchange = function () {
        db.close();
      };
      let transaction = db.transaction(["chatContacts"], "readwrite");
      let chatContacts_ = transaction.objectStore("chatContacts");

      for (let auth of [...nostrAuthors, ...res])
        chatContacts_.put(auth, auth.pubkey);

      setChatContacts((prev) => [...prev, ...nostrAuthors, ...res]);
    };
  };

  const getNostrAuthor = (pubkey) => {
    return nostrAuthors.find((item) => item.pubkey === pubkey);
  };

  const setTheme = () => {
    if (isDarkMode === "0") {
      localStorage.setItem("yaki-theme", "1");
      toggleColorScheme(true);
      setIsDarkMode("1");
    }
    if (isDarkMode === "1") {
      localStorage.setItem("yaki-theme", "0");
      toggleColorScheme(false);
      setIsDarkMode("0");
    }
  };

  const cacheDBInit = (keys) => {
    let openDB = indexedDB.open("yaki-nostr", 3);
    openDB.onupgradeneeded = () => {
      let db = openDB.result;
      db.onerror = (event) => {
        console.log("error upgrading db");
      };
      if (!db.objectStoreNames.contains("chatrooms"))
        db.createObjectStore("chatrooms", { autoIncrement: true });
      if (!db.objectStoreNames.contains("chatContacts"))
        db.createObjectStore("chatContacts", { autoIncrement: true });
      if (!db.objectStoreNames.contains("followings"))
        db.createObjectStore("followings", { autoIncrement: true });
      if (!db.objectStoreNames.contains("muted"))
        db.createObjectStore("muted", { autoIncrement: true });
      setLoadCacheDB(openDB);
    };

    openDB.onsuccess = () => {
      let db = openDB.result;
      db.onversionchange = function () {
        db.close();
      };
      try {
        let chatRecords = [];
        let transaction = db.transaction(
          ["chatrooms", "chatContacts", "followings", "muted"],
          "readonly"
        );
        let chatrooms_ = transaction.objectStore("chatrooms").openCursor();
        let chatContacts_ = transaction.objectStore("chatContacts").getAll();
        let userFollowings_ = transaction
          .objectStore("followings")
          .get(keys.pub);
        let muted = transaction.objectStore("muted").get(keys.pub);

        chatrooms_.onsuccess = (event) => {
          let cursor = event.target.result;
          if (cursor) {
            if (cursor.key.includes(`,${keys.pub}`)) {
              chatRecords.push(cursor.value);
            }
            cursor.continue();
          } else {
            let sortedInbox =
              chatRecords.length > 0
                ? chatRecords.sort(
                    (conv_1, conv_2) =>
                      conv_2.last_message - conv_1.last_message
                  )
                : chatRecords;
            setLastMessageDate(sortedInbox[0]?.last_message || undefined);

            setChatrooms(sortedInbox);
            setLoadCacheDB(openDB);
          }
        };

        chatContacts_.onsuccess = () => {
          setChatContacts(chatContacts_.result);
        };
        userFollowings_.onsuccess = (event) => {
          setUserFollowings(event.target.result || []);
        };
        muted.onsuccess = (event) => {
          setMutedList(event.target?.result || []);
        };
      } catch (err) {
        console.log(err);
        db.close();
        let req = indexedDB.deleteDatabase("yaki-nostr");
        req.onsuccess = function () {
          cacheDBInit(keys);
          console.log("Deleted database successfully");
        };
      }
    };

    openDB.onerror = (event) => {
      console.log(event);
      setChatContacts([]);
      setChatrooms([]);
      setMutedList([]);
    };

    openDB.onblocked = (ev) => {
      console.log(ev);
      setChatContacts([]);
      setChatrooms([]);
      setMutedList([]);
    };
  };
  const updateYakiChestStats = (user_stats) => {
    let xp = user_stats.xp;
    let currentLevel = getCurrentLevel(xp);
    let nextLevel = currentLevel + 1;
    let toCurrentLevelPoints = levelCount(currentLevel);
    let toNextLevelPoints = levelCount(nextLevel);
    let totalPointInLevel = toNextLevelPoints - toCurrentLevelPoints;
    let inBetweenLevelPoints = xp - toCurrentLevelPoints;
    let remainingPointsToNextLevel = totalPointInLevel - inBetweenLevelPoints;

    setYakiChestStats({
      xp,
      currentLevel,
      nextLevel,
      toCurrentLevelPoints,
      toNextLevelPoints,
      totalPointInLevel,
      inBetweenLevelPoints,
      remainingPointsToNextLevel,
    });
  };
  const initiFirstLoginStats = (user_stats) => {
    let xp = user_stats.xp;
    let lvl = getCurrentLevel(xp);
    let nextLevel = lvl + 1;
    let toCurrentLevelPoints = levelCount(lvl);
    let toNextLevelPoints = levelCount(nextLevel);
    let totalPointInLevel = toNextLevelPoints - toCurrentLevelPoints;
    let inBetweenLevelPoints = xp - toCurrentLevelPoints;
    let actions = user_stats.actions.map((item) => {
      return {
        ...item,
        display_name: user_stats.platform_standards[item.action].display_name,
      };
    });

    setUserFirstLoginYakiChest({
      xp,
      lvl,
      percentage: (inBetweenLevelPoints * 100) / totalPointInLevel,
      actions,
    });
  };
  return (
    <Context.Provider
      value={{
        toast,
        setToast,
        nostrUser,
        nostrUserAbout,
        setNostrUserAbout,
        tempUserMeta,
        setTempUserMeta,
        nostrUserTags,
        setNostrUserData,
        setNostrUser,
        nostrUserLoaded,
        setNostrKeysData,
        nostrKeys,
        globalCuration,
        setGlobalCuration,
        nostrUserBookmarks,
        setNostrUserBookmarks,
        addNostrAuthors,
        getNostrAuthor,
        nostrAuthors,
        toPublish,
        setToPublish,
        isPublishing,
        setPublishing,
        nostrUserTopics,
        setNostrUserTopics,
        setNostrUserBookmarks,
        nostrClients,
        isDarkMode,
        setTheme,
        initDMS,
        chatrooms,
        setChatrooms,
        chatContacts,
        userFollowings,
        buzzFeedSources,
        mutedList,
        setMutedList,
        tempChannel,
        setTempChannel,
        isConnectedToYaki,
        setIsConnectedToYaki,
        yakiChestStats,
        isYakiChestLoaded,
        updateYakiChestStats,
        userFirstLoginYakiChest,
        setUserFirstLoginYakiChest,
        initiFirstLoginStats,
        updatedActionFromYakiChest,
        setUpdatedActionFromYakiChest,
        balance,
        setBalance,
        setNostrAuthors,
        handleSwitchAccount,
        logoutAllAccounts,
        userLogout,
        userRelays,
        setUserRelays,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export { Context, ContextProvider };
