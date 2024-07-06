import { nip19, SimplePool } from "nostr-tools";
import React, { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import ArrowUp from "../../Components/ArrowUp";
import LoadingScreen from "../../Components/LoadingScreen";
import NavbarNOSTR from "../../Components/NOSTR/NavbarNOSTR";
import PostPreviewCardNOSTR from "../../Components/NOSTR/PostPreviewCardNOSTR";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import PagePlaceholder from "../../Components/PagePlaceholder";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { getBech32 } from "../../Helpers/Encryptions";
const pool = new SimplePool();

export default function NostrBookmarks() {
  const { nostrUserBookmarks, nostrUserLoaded, nostrKeys } =
    useContext(Context);
  const [posts, setPosts] = useState([]);
  const [isArtsLoaded, setIsArtsLoaded] = useState(false);

  useEffect(() => {
    if (nostrUserBookmarks.length === 0 || posts.length === 0) return;
    let index = -1;
    for (let i = 0; i < posts.length; i++) {
      let post = nostrUserBookmarks.find(
        (item) => item === `30023:${posts[i].author_pubkey}:${posts[i].d}`
      );
      if (!post) {
        index = i;
        break;
      }
    }
    if (index !== -1) {
      let tempArr = Array.from(posts);
      tempArr.splice(index, 1);
      setPosts(tempArr);
    }
  }, [nostrUserBookmarks]);

  useEffect(() => {
    if (nostrUserBookmarks.length === 0) return;
    // removeUnbookmarked()
    let dRefs = getDRef();
    let sub_2 = pool.sub(relaysOnPlatform, [
      {
        kinds: [30023],
        "#d": dRefs,
      },
    ]);

    if (dRefs.length === 0) setIsArtsLoaded(true);

    sub_2.on("event", (event) => {
      let author_img = "";
      let author_name = getBech32("npub", event.pubkey).substring(0, 10);
      let author_pubkey = event.pubkey;
      let thumbnail = "";
      let title = "";
      let summary = "";
      let contentSensitive = false;
      let postTags = [];

      let d = "";
      let added_date = new Date(event.created_at * 1000).toDateString();
      for (let tag of event.tags) {
        if (tag[0] === "image") thumbnail = tag[1];
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

      setPosts((_posts) => {
        let newP = posts.find((item) => item.id === event.id)
          ? [..._posts]
          : [
              ..._posts,
              {
                id: event.id,
                thumbnail,
                summary,
                author_img,
                author_pubkey,
                author_name,
                title,
                added_date,
                created_at: event.created_at,
                postTags,
                naddr,
                contentSensitive,
                d,
              },
            ];

        newP = newP.sort(
          (item_1, item_2) => item_2.created_at - item_1.created_at
        );
        return newP;
      });
      setIsArtsLoaded(true);
    });
    sub_2.on("eose", () => {
      setIsArtsLoaded(true);
      sub_2.unsub();
    });
  }, [nostrUserLoaded]);

  const getDRef = () => {
    let tempArray = [];
    for (let tag of nostrUserBookmarks) {
      tempArray.push(tag.split(":").splice(2, 100).join(":"));
    }
    return tempArray;
  };

  if (!nostrUserLoaded) return <LoadingScreen />;
  return (
    <div>
      <Helmet>
        <title>Yakihonne | Bookmarks</title>
      </Helmet>
      <SidebarNOSTR />
      <main className="main-page-nostr-container">
        <ArrowUp />
        <NavbarNOSTR />
        {!nostrKeys && <PagePlaceholder page={"nostr-not-connected"} />}
        {nostrKeys && (
          <div className="fit-container box-marg-full">
            {nostrUserBookmarks.length > 0 && (
              <>
                <div className="fit-container fx-centered">
                  <h2>Bookmarks</h2>
                </div>
                <div
                  className="fx-centered fit-container box-marg-full fx-wrap"
                  style={{ rowGap: "32px", columnGap: "32px" }}
                >
                  <div
                    style={{ width: "min(100%,800px)" }}
                    className="fx-around fx-wrap posts-cards"
                  >
                    {isArtsLoaded &&
                      posts.map((item) => {
                        if (item.title)
                          return (
                            <div
                              key={item.id}
                              className="fit-container fx-centered"
                            >
                              {" "}
                              <PostPreviewCardNOSTR item={item} />
                            </div>
                          );
                      })}
                  </div>
                </div>
              </>
            )}
            {nostrUserBookmarks.length === 0 && (
              <PagePlaceholder page={"nostr-no-bookmarks"} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
