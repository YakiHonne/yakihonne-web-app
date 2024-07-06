import { relayInit, SimplePool } from "nostr-tools";
import React, { useEffect, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { getEmptyNostrUser } from "../../Helpers/Encryptions";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";

const pool = new SimplePool();

export default function TopCreators({ top_creators = [] }) {
  const [creators, setCreators] = useState(top_creators);

  useEffect(() => {
    setCreators(top_creators);
  }, [top_creators]);

  return (
    <div
      className="fit-container fx-centered fx-wrap fx-start-v fx-start-h"
      style={{ rowGap: "16px", columnGap: "16px" }}
    >
      {creators.map((creator) => {
        return (
          <div
            key={creator.pubkey}
            className=" fx-centered fx-start-h"
            style={{ columnGap: "16px", width: "45%" }}
          >
            <AuthorPreview author={creator} />
            {/* <UserProfilePicNOSTR
              img={creator.img}
              size={32}
              user_id={creator.pubkey}
            />
            <div>
              <p>{creator.name}</p>
              <div className="fx-centered fx-start-h">
                <p className="c1-c p-medium">
                  {creator.articles_number}{" "}
                  <span className="gray-c">articles</span>
                </p>
              </div>
            </div> */}
          </div>
        );
      })}
      <div style={{ columnGap: "16px", width: "45%" }}></div>
    </div>
  );
}

const AuthorPreview = ({ author }) => {
  const [authorData, setAuthorData] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        let sub = pool.sub(relaysOnPlatform, [
          { kinds: [0], authors: [author.pubkey] },
        ]);
        sub.on("event", (event) => {
          let img = event ? JSON.parse(event.content).picture : "";
          let name = event
            ? JSON.parse(event.content).name?.substring(0, 20) || event.pubkey.substring(0,10)
            : author.name;
          let pubkey = event.pubkey;
          setAuthorData((auth) => {
            return { img, name, pubkey };
          });
          return;
        });
        sub.on("eose", () => {
          
          sub.unsub()
        })
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  if (!authorData)
    return (
      <>
        <UserProfilePicNOSTR
          img={author.img}
          size={32}
          user_id={author.pubkey}
        />
        <div>
          <p>{author.name}</p>
          <div className="fx-centered fx-start-h">
            <p className="c1-c p-medium">
              {author.articles_number} <span className="gray-c">articles</span>
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
        user_id={author.pubkey}
      />
      <div>
        <p>{authorData.name}</p>
        <div className="fx-centered fx-start-h">
          <p className="c1-c p-medium">
            {author.articles_number} <span className="gray-c">articles</span>
          </p>
        </div>
      </div>
    </>
  );
};
