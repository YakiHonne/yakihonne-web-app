import React, { useEffect, useState } from "react";
import { relayInit, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../Content/Relays";
import { getEmptyNostrUser } from "../Helpers/Encryptions";

const Context = React.createContext();

const pool = new SimplePool();

const ContextProvider = ({ children }) => {
  const [nostrUser, setNostrUser] = useState(false);
  const [nostrUserBookmarks, setNostrUserBookmarks] = useState([]);
  const [nostrUserAbout, setNostrUserAbout] = useState(false);
  const [nostrUserTags, setNostrUserTags] = useState(false);
  const [nostrUserLoaded, setNostrUserLoaded] = useState(false);
  const [nostrKeys, setNostrKeys] = useState(false);
  const [revLoaded, setRevLoaded] = useState(false);
  const [globalCuration, setGlobalCuration] = useState([]);
  const [toast, setToast] = useState(false);
  const [relayConnect, setRelayConnect] = useState(false);

  useEffect(() => {
    let fetchData = async () => {
      let keys = localStorage.getItem("_nostruserkeys");
      if (keys) {
        let content = JSON.parse(keys);
        setNostrKeys(content);
        let user = await getUserFromNOSTR(content.pub);
        user.relays = await getRelaysOfUser(content.pub);
        if (user) {
          setNostrUserData(user);
        }
        return;
      }
      setNostrUser(false);
      setNostrUserLoaded(true);
    };
    let connectRelay = async () => {
      setRelayConnect(relayInit(relaysOnPlatform[2]));
    };
    connectRelay();
    fetchData();
  }, []);

  const setNostrUserData = async (data) => {
    if (data) {
      setNostrUserLoaded(false);
      let content = data;
      let userAbout = JSON.parse(content.content) || {};

      let [userRelays, userFollowing, userBookmarks] = await Promise.all([
        getRelaysOfUser(content.pubkey),
        getUserFollowing(content.pubkey),
        getUserBookmarks(content.pubkey),
      ]);
      let userData = {
        pubkey: content.pubkey,
        added_date: new Date(content.created_at * 1000).toISOString(),
        img: userAbout?.picture || "",
        banner: userAbout?.banner || "",
        name: userAbout?.name || "",
        about: userAbout?.about || "",
        nip05: userAbout?.nip05 || "",
        relays: userRelays,
        following: userFollowing,
      };
      setNostrUser(userData);
      setNostrUserTags(content.tags);
      setNostrUserAbout(userAbout);
      setNostrUserBookmarks(userBookmarks);
      setNostrUserLoaded(true);
      return;
    }
    setNostrUser(false);
    setNostrUserLoaded(true);
  };

  const setNostrKeysData = (data) => {
    if (data) {
      localStorage.setItem("_nostruserkeys", JSON.stringify(data));
      setNostrKeys(data);
      return;
    }
    setNostrKeys(false);
  };

  const nostrUserLogout = () => {
    localStorage.removeItem("_nostruser");
    localStorage.removeItem("_nostruserkeys");
    setNostrUser(false);
    setNostrKeys(false);
    setNostrUserAbout(false);
    setNostrUserBookmarks([]);
  };

  const getUserFromNOSTR = async (pubkey) => {
    try {
      let author = await pool.get(relaysOnPlatform, {
        kinds: [0],
        authors: [pubkey],
      });
      return author || getEmptyNostrUser(pubkey);
    } catch (err) {
      console.log(err);
    }
  };
  const getUserFollowing = async (pubkey) => {
    try {
      let author = await pool.get(relaysOnPlatform, {
        kinds: [3],
        authors: [pubkey],
      });
      return author?.tags?.filter((people) => people[0] === "p") || [];
    } catch (err) {
      console.log(err);
      return [];
    }
  };
  const getUserBookmarks = async (pubkey) => {
    try {
      let author = await pool.get(relaysOnPlatform, {
        kinds: [30001],
        authors: [pubkey],
        "#d": ["MyYakihonneBookmarkedArticles"]
      });
      return (
        author?.tags
          ?.filter((item) => {
            if (item[0] === "a") return item;
          })
          .map((item) => item[1]) || []
      );
    } catch (err) {
      console.log(err);
      return [];
    }
  };
  const getRelaysOfUser = async (pubkey) => {
    try {
      let [res_1, res_2] = await Promise.all([
        pool.list(relaysOnPlatform, [
          {
            kinds: [3],
            authors: [pubkey],
          },
        ]),
        pool.list(relaysOnPlatform, [
          {
            kinds: [10002],
            authors: [pubkey],
          },
        ]),
      ]);
      res_1 =
        res_1.length > 0
          ? res_1
              .map(
                (item) => item.content && Object.keys(JSON.parse(item.content))
              )
              .filter((item) => item)
              .flat()
          : [];

      res_2 =
        res_2.length > 0
          ? res_2
              .map((item) => item.tags.filter((item) => item[0] === "r"))
              .flat()
          : [];
      res_2 = res_2.length > 0 ? res_2.map((item) => item[1]) : [];

      let final_res = [...new Set([...relaysOnPlatform, ...res_1, ...res_2])];

      return final_res;
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Context.Provider
      value={{
        toast,
        setToast,
        nostrUser,
        nostrUserAbout,
        nostrUserTags,
        setNostrUserData,
        nostrUserLoaded,
        nostrUserLogout,
        setNostrKeysData,
        nostrKeys,
        globalCuration,
        setGlobalCuration,
        relayConnect,
        nostrUserBookmarks,
        setNostrUserBookmarks,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export { Context, ContextProvider };
