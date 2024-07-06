import React, { useEffect, useState } from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import PagePlaceholder from "../../Components/PagePlaceholder";
import relaysOnPlatform from "../../Content/Relays";
import { nip19, relayInit } from "nostr-tools";
import LoadingScreen from "../../Components/LoadingScreen";
import NavbarNOSTR from "../../Components/NOSTR/NavbarNOSTR";
import Date_ from "../../Components/Date_";
import { Link, useNavigate } from "react-router-dom";
import { getEmptyNostrUser } from "../../Helpers/Encryptions";
import { SimplePool } from "nostr-tools";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import TopicElementNOSTR from "../../Components/NOSTR/TopicElementNOSTR";
import { Helmet } from "react-helmet";
import ArrowUp from "../../Components/ArrowUp";

const pool = new SimplePool();

export default function NostrCurations() {
  const [curations, setCurations] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const navigateTo = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // const relay = relayInit(relaysOnPlatform[0]);
        // await relay.connect();
        // // let curations = await relay.list([{ kinds: [31000] }]);
        // let curations = await relay.list([
        //   { kinds: [30001], "#c": ["curation"] },
        // ]);
        // let tempCurations = await Promise.all(
        //   curations.map(async (item) => {
        //     let author = await getUserFromNOSTR(item.pubkey);
        //     let parsedAuthor = JSON.parse(author.content) || {};
        //     let naddr = nip19.naddrEncode({
        //       identifier: item.tags.find((tag) => tag[0] === "d")[1],
        //       pubkey: item.pubkey,
        //       kind: 30001,
        //     });
        //     return {
        //       ...item,
        //       naddr,
        //       author: {
        //         name: parsedAuthor.name || item.pubkey.substring(0, 10),
        //         img: parsedAuthor.picture || "",
        //       },
        //     };
        //   })
        // );

        // setCurations(tempCurations.reverse());
        // setIsLoaded(true);
        const relay = relayInit(relaysOnPlatform[0]);
        await relay.connect();
        // let curationsInNostr = await relay.list([{ kinds: [31000] }]);
        let tempCuration = [];
        let sub = relay.sub([{ kinds: [30001], "#c": ["curation"] }]);
        sub.on("event", (curation) => {
          let naddr = nip19.naddrEncode({
            identifier: curation.tags.find((tag) => tag[0] === "d")[1],
            pubkey: curation.pubkey,
            kind: 30001,
          });
          tempCuration.push({
            ...curation,
            naddr,
            author: {
              name: curation.pubkey.substring(0, 10),
              img: "",
            },
          });
          setCurations((_curations) => {
            return [
              {
                ...curation,
                naddr,
                author: {
                  name: curation.pubkey.substring(0, 10),
                  img: "",
                },
              },
              ..._curations,
            ];
          });

          setIsLoaded(true);
        });
        sub.on("eose", () => {
          relay.close();
          sub.unsub();
        });
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  const getDRef = (tags) => {
    let tempArray = [];
    for (let tag of tags) {
      if (tag[0] === "a") {
        tempArray.push(tag[1].split(":")[2]);
      }
    }
    return tempArray;
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

  const getParsedContent = (tags) => {
    try {
      let content = {
        title: "",
        excerpt: "",
        thumbnail: "",
      };

      for (let tag of tags) {
        if (tag[0] === "title") {
          content.title = tag[1];
        }
        if (tag[0] === "thumbnail") {
          content.thumbnail = tag[1];
        }
        if (tag[0] === "excerpt") {
          content.excerpt = tag[1];
        }
      }

      return content;
    } catch {
      return false;
    }
  };
  if (!isLoaded) return <LoadingScreen />;
  if (curations.length === 0)
    return (
      <div>
        <SidebarNOSTR />
        <main className="main-page-nostr-container">
          <PagePlaceholder page={"nostr-curations-2"} />
        </main>
      </div>
    );
  return (
    <div>
      <Helmet>
        <title>Yakihonne | Curations</title>
      </Helmet>
      <SidebarNOSTR />
      <main className="main-page-nostr-container">
        <ArrowUp />
        <NavbarNOSTR />
        <div className="fit-container box-marg-full">
          <div className="fit-container fx-centered">
            <h2>Curations</h2>
          </div>
          <div
            className="fx-centered fit-container box-marg-full fx-wrap"
            style={{ rowGap: "32px", columnGap: "32px" }}
          >
            {curations.map((item) => {
              return <TopicElementNOSTR key={item.id} topic={item} />;
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
