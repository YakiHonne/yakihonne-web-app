import { relayInit, SimplePool } from "nostr-tools";
import React, { useContext, useEffect, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { getEmptyNostrUser } from "../../Helpers/Encryptions";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";

const pool = new SimplePool();

export default function TopCurators() {
  const { globalCuration } = useContext(Context);
  const [isLoaded, setIsLoaded] = useState(false);
  const [curators, setCurators] = useState([]);

  // useEffect(() => {
  //   let dataFetching = async () => {
  //     try {
  //       const relay = relayInit(relaysOnPlatform[0]);
  //       await relay.connect();
  //       // let curationsInNostr = await relay.list([{ kinds: [31000] }]);
  //       let sub = relay.sub([{ kinds: [30001], "#c": ["curation"] }]);
  //       let tempCurations = [];
  //       sub.on("event", (event) => {
  //         tempCurations.push({
  //           articles_number: event.tags.filter((post) => post[0] === "a")
  //             .length,
  //           name: event.pubkey.substring(0, 10),
  //           img: "",
  //           pubkey: event.pubkey,
  //         });
  //       });
  //       sub.on("eose", () => {
  //         setCurators((_curators) => {
  //           let netCurators = tempCurations.filter(
  //             (curator, index, tempCurations) => {
  //               if (
  //                 index ===
  //                 tempCurations.findIndex(
  //                   (item) => item.pubkey === curator.pubkey
  //                 )
  //               )
  //                 return curator;
  //             }
  //           );
  //           let tempCurators = [];

  //           for (let curator of netCurators) {
  //             let stats = getCuratorStats(curator.pubkey, tempCurations);
  //             tempCurators.push({
  //               pubkey: curator.pubkey,
  //               name: curator.name,
  //               img: curator.img,
  //               articles_number: stats.articles_number,
  //               curations_number: stats.curations_number,
  //             });
  //           }
  //           tempCurators
  //             .sort(
  //               (curator_1, curator_2) =>
  //                 curator_2.curations_number - curator_1.curations_number
  //             )
  //             .splice(0, 6);

  //           return tempCurators;
  //         });
  //         setIsLoaded(true);
  //       });
  //     } catch (err) {
  //       console.log(err);
  //       setIsLoaded(true);
  //     }
  //   };
  //   dataFetching();
  // }, []);

  useEffect(() => {
    let dataFetching = () => {
      try {
        let tempCurationsInNostr = globalCuration.map((item) => {
          return {
            articles_number: item.tags.filter((post) => post[0] === "a").length,
            name: item.pubkey.substring(0, 10),
            img: "",
            pubkey: item.pubkey,
          };
        });

        let netCurators = tempCurationsInNostr.filter(
          (curator, index, tempCurationsInNostr) => {
            if (
              index ===
              tempCurationsInNostr.findIndex(
                (item) => item.pubkey === curator.pubkey
              )
            )
              return curator;
          }
        );
        let tempCurators = [];

        for (let curator of netCurators) {
          let stats = getCuratorStats(curator.pubkey, tempCurationsInNostr);
          tempCurators.push({
            pubkey: curator.pubkey,
            name: curator.name,
            img: curator.img,
            articles_number: stats.articles_number,
            curations_number: stats.curations_number,
          });
        }

        setCurators(
          tempCurators
            .sort(
              (curator_1, curator_2) =>
                curator_2.curations_number - curator_1.curations_number
            )
            .splice(0, 6)
        );
        setIsLoaded(true);
        return;
      } catch (err) {
        console.log(err);
        setIsLoaded(true);
      }
    };
    if (!globalCuration.length) return;
    dataFetching();
  }, [globalCuration]);

  // useEffect(() => {
  //   let dataFetching = async () => {
  //     try {
  //       const relay = relayInit(relaysOnPlatform[0]);
  //       await relay.connect();
  //       // let curationsInNostr = await relay.list([{ kinds: [31000] }]);
  //       let curationsInNostr = await relay.list([
  //         { kinds: [30001], "#c": ["curation"] },
  //       ]);

  //       let tempCurationsInNostr = await Promise.all(
  //         curationsInNostr.map(async (item) => {
  //           let author = await getUserFromNOSTR(item.pubkey);
  //           let parsedAuthor = JSON.parse(author.content) || {};

  //           return {
  //             articles_number: item.tags.filter((post) => post[0] === "a")
  //               .length,
  //             name: parsedAuthor.name || item.pubkey.substring(0, 10),
  //             img: parsedAuthor.picture || "",
  //             pubkey: item.pubkey,
  //           };
  //         })
  //       );
  //       let netCurators = tempCurationsInNostr.filter(
  //         (curator, index, tempCurationsInNostr) => {
  //           if (
  //             index ===
  //             tempCurationsInNostr.findIndex(
  //               (item) => item.pubkey === curator.pubkey
  //             )
  //           )
  //             return curator;
  //         }
  //       );
  //       let tempCurators = [];

  //       for (let curator of netCurators) {
  //         let stats = getCuratorStats(curator.pubkey, tempCurationsInNostr);
  //         tempCurators.push({
  //           pubkey: curator.pubkey,
  //           name: curator.name,
  //           img: curator.img,
  //           articles_number: stats.articles_number,
  //           curations_number: stats.curations_number,
  //         });
  //       }

  //       setCurators(tempCurators.sort((curator_1, curator_2) => curator_2.curations_number - curator_1.curations_number).splice(0,6));
  //       setIsLoaded(true);
  //       return;
  //     } catch (err) {
  //       console.log(err);
  //       setIsLoaded(true);
  //     }
  //   };
  //   dataFetching();
  // }, []);

  const getCuratorStats = (pubkey, curations) => {
    let articles_number = 0;
    let curations_number = 0;

    for (let curator of curations) {
      if (curator.pubkey === pubkey) {
        articles_number += curator.articles_number;
        curations_number += 1;
      }
    }

    return {
      articles_number,
      curations_number,
    };
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
  if (!isLoaded)
    return (
      <div
        className="fit-container fx-centered sc-s skeleton-container posts-card"
        style={{
          height: "200px",
          backgroundColor: "var(--dim-gray)",
          border: "none",
        }}
      ></div>
    );
  return (
    <div
      className="fit-container fx-centered fx-wrap fx-start-v"
      style={{ rowGap: "0px" }}
    >
      {curators.map((curator) => {
        return (
          <div
            key={curator.pubkey}
            className="box-marg-s fx-centered fx-start-h"
            style={{ marginLeft: 0, columnGap: "16px" }}
          >
            <AuthorPreview curator={curator} />
            {/* <UserProfilePicNOSTR
              img={curator.img}
              size={32}
              user_id={curator.pubkey}
            />
            <div>
              <p>{curator.name}</p>
              <div className="fx-centered fx-start-h">
                <p className="c1-c p-medium">
                  {curator.curations_number}{" "}
                  <span className="gray-c">curations</span>
                </p>
                <p className="gray-c p-medium">&#9679;</p>
                <p className="c1-c p-medium">
                  {curator.articles_number}{" "}
                  <span className="gray-c">articles</span>
                </p>
              </div>
            </div> */}
          </div>
        );
      })}
    </div>
  );
}

const AuthorPreview = ({ curator }) => {
  const [authorData, setAuthorData] = useState("");
  const { relayConnect } = useContext(Context);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // let sub = pool.sub(relaysOnPlatform, [
        //   { kinds: [0], authors: [curator.pubkey] },
        // ]);
        await relayConnect.connect();

        let sub = relayConnect.sub([{ kinds: [0], authors: [curator.pubkey] }]);
        sub.on("event", (event) => {
          let img = event ? JSON.parse(event.content).picture : "";
          let name = event
            ? JSON.parse(event.content).name?.substring(0, 20)
            : event.pubkey?.substring(0, 20);

          setAuthorData((auth) => {
            return { img, name };
          });
          return;
        });
        sub.on("eose", () => {
          
          sub.unsub();
        });
      } catch (err) {
        console.log(err);
      }
    };
    if (relayConnect) fetchData();
  }, []);

  if (!authorData)
    return (
      <>
        <UserProfilePicNOSTR
          img={curator.img}
          size={32}
          user_id={curator.pubkey}
        />
        <div>
          <p>{curator.name}</p>
          <div className="fx-centered fx-start-h">
            <p className="c1-c p-medium">
              {curator.curations_number}{" "}
              <span className="gray-c">curations</span>
            </p>
            <p className="gray-c p-medium">&#9679;</p>
            <p className="c1-c p-medium">
              {curator.articles_number} <span className="gray-c">articles</span>
            </p>
          </div>
        </div>
      </>
    );
  return (
    <>
      <UserProfilePicNOSTR
        img={authorData.img}
        size={32}
        user_id={curator.pubkey}
      />
      <div>
        <p>{authorData.name}</p>
        <div className="fx-centered fx-start-h">
          <p className="c1-c p-medium">
            {curator.curations_number} <span className="gray-c">curations</span>
          </p>
          <p className="gray-c p-medium">&#9679;</p>
          <p className="c1-c p-medium">
            {curator.articles_number} <span className="gray-c">articles</span>
          </p>
        </div>
      </div>
    </>
  );
};
