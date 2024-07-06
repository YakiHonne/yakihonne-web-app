import React, { useContext, useMemo, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { publishPost } from "../../Helpers/NostrPublisher";
import LoginNOSTR from "./LoginNOSTR";

export default function SaveArticleAsBookmark({ pubkey = "", d = "" }) {
  const { nostrKeys, nostrUserBookmarks, setNostrUserBookmarks } =
    useContext(Context);
  const [toLogin, setToLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isBookmarked = useMemo(() => {
    return nostrKeys
      ? nostrUserBookmarks.find((item) => item === `30023:${pubkey}:${d}`)
      : false;
  }, [nostrUserBookmarks, nostrKeys]);

  const bookmarkArticle = async () => {
    if (!nostrKeys) {
      setToLogin(true);
      return false;
    }
    if (isLoading) return;
    if (isBookmarked) {
      setIsLoading(true);

      let index = nostrUserBookmarks.findIndex(
        (item) => item === `30023:${pubkey}:${d}`
      );
      let tempArr = Array.from(nostrUserBookmarks);
      tempArr.splice(index, 1);

      let temPublishingState = await publishPost(
        nostrKeys,
        30001,
        "My bookmarked articles on Yakihonne",
        [
          ["d", "MyYakihonneBookmarkedArticles"],
          ...tempArr.map((item) => {
            return ["a", item];
          }),
        ],
        relaysOnPlatform
      );
      if (!temPublishingState) {
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setNostrUserBookmarks(tempArr);
      return;
    }
    try {
      setIsLoading(true);
      let temPublishingState = await publishPost(
        nostrKeys,
        30001,
        "My bookmarked articles on Yakihonne",
        [
          ["d", "MyYakihonneBookmarkedArticles"],
          ["a", `30023:${pubkey}:${d}`],
          ...nostrUserBookmarks.map((item) => {
            return ["a", item];
          }),
        ],
        relaysOnPlatform
      );
      if (!temPublishingState) {
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setNostrUserBookmarks([...nostrUserBookmarks, `30023:${pubkey}:${d}`]);
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <>
      {toLogin && <LoginNOSTR exit={() => setToLogin(false)} />}{" "}
      <div onClick={bookmarkArticle} className={isLoading ? "flash" : ""}>
        <div className={isBookmarked ? "bookmark-24-b" : "bookmark-24"}></div>
      </div>
    </>
  );
}
