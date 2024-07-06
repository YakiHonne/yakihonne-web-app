import { nip19, SimplePool } from "nostr-tools";
import React, { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";
import NavbarNOSTR from "../../Components/NOSTR/NavbarNOSTR";
import PostPreviewCardNOSTR from "../../Components/NOSTR/PostPreviewCardNOSTR";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { getBech32 } from "../../Helpers/Encryptions";

const pool = new SimplePool();

export default function NostrSearchTag() {
  const { tag } = useParams();
  const { nostrUser } = useContext(Context);
  const [posts, setPosts] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let events = await pool.list(nostrUser?.relays || relaysOnPlatform, [
          { kinds: [30023], "#t": [tag] },
        ]);
        let authorsIDs = events.map((event) => event.pubkey);
        let authors = await pool.list(
          [relaysOnPlatform[2]],
          [{ kinds: [0], authors: authorsIDs }]
        );

        let posts = events.map((event) => {
          let author =
            authors.find((item) => item.pubkey === event.pubkey) || "";
          let author_img = author ? JSON.parse(author.content).picture : "";
          let author_name = author
            ? JSON.parse(author.content).name?.substring(0, 20)
            : getBech32("npub", event.pubkey).substring(0, 10);
          let author_pubkey = event.pubkey;
          let thumbnail = "";
          let title = "";
          let summary = "";
          let postTags = [];

          let d = "";
          let added_date = new Date(event.created_at * 1000).toDateString();
          for (let tag of event.tags) {
            if (tag[0] === "image") thumbnail = tag[1];
            if (tag[0] === "title") title = tag[1];
            if (tag[0] === "summary") summary = tag[1];
            if (tag[0] === "t") postTags.push(tag[1]);
            if (tag[0] === "d") d = tag[1];
          }

          let naddr = nip19.naddrEncode({
            identifier: d,
            pubkey: author_pubkey,
            kind: 30023,
          });
          return {
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
          };
        });
        setPosts(posts);
        setIsLoaded(true);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
       <Helmet>
        <title>Yakihonne | #{tag}</title>
      </Helmet>
      <SidebarNOSTR />
      <main className="main-page-nostr-container">
        <NavbarNOSTR />
        <div className="fit-container fx-centered">
          <div className="fx-centered fx-col fit-container">
            <h2 className="box-marg">#{tag}</h2>
            <div className={`fx-centered  fx-wrap`} style={{width: "min(100%, 800px)"}}>
              {isLoaded &&
                posts.map((item) => {
                  if (item.title && item.summary)
                    return (
                      <div key={item.id} className="fit-container fx-centered">
                        {" "}
                        <PostPreviewCardNOSTR item={item} highlithedTag={tag}/>
                      </div>
                    );
                })}
              {!isLoaded && (
                <div className="fx-centered fit-container" style={{height:"40vh"}}>
                  <div className="loader"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
