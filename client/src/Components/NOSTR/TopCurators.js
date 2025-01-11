import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../Context/Context";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import Follow from "./Follow";
import LoadingDots from "../LoadingDots";

export default function TopCurators() {
  const { globalCuration } = useContext(Context);
  const [isLoaded, setIsLoaded] = useState(false);
  const [curators, setCurators] = useState([]);

  useEffect(() => {
    let dataFetching = () => {
      try {
        let tempCurationsInNostr = globalCuration.map((item) => {
          return {
            articles_number: item.tags.filter((post) => post[0] === "a").length,
            name: item.pubkey.substring(0, 10),
            picture: "",
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
            picture: curator.picture,
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

  if (!isLoaded)
    return (
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
    );
  return (
    <div
      className="fit-container fx-centered fx-wrap fx-start-v"
      style={{ rowGap: "16px" }}
    >
      {curators.map((curator) => {
        return (
          <div
            key={curator.pubkey}
            className=" fx-wrap fit-container fx-scattered"
            style={{ marginLeft: 0, columnGap: "16px" }}
          >
            <AuthorPreview curator={curator} />
            <Follow
              size="small"
              toFollowKey={curator.pubkey}
              toFollowName={""}
              bulkList={[]}
            />
          </div>
        );
      })}
    </div>
  );
}

const AuthorPreview = ({ curator }) => {
  const [authorData, setAuthorData] = useState("");
  const { getNostrAuthor, nostrAuthors } = useContext(Context);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let auth = getNostrAuthor(curator.pubkey);

        if (auth)
          setAuthorData({
            picture: auth.picture,
            name: auth.display_name || auth.name || "",
          });
        return;
      } catch (err) {
        console.log(err);
      }
    };
    if (!authorData) fetchData();
  }, [nostrAuthors]);

  if (!authorData)
    return (
      <div className="fx-centered" style={{ maxWidth: "60%" }}>
        <UserProfilePicNOSTR
          img={curator.picture}
          size={32}
          user_id={curator.pubkey}
          ring={false}
        />
        <div>
          <p>{curator.name}</p>
          <div className="fx-centered fx-start-h">
            <p className="c1-c p-medium">
              {curator.curations_number} <span className="gray-c">cur.</span>
            </p>
            <p className="gray-c p-medium">&#9679;</p>
            <p className="c1-c p-medium">
              {curator.articles_number} <span className="gray-c">arts.</span>
            </p>
          </div>
        </div>
      </div>
    );
  return (
    <div className="fx-centered" style={{ maxWidth: "60%" }}>
      <UserProfilePicNOSTR
        img={authorData.picture}
        size={32}
        user_id={curator.pubkey}
        ring={false}
      />
      <div>
        <p>{authorData.name}</p>
        <div className="fx-centered fx-start-h">
          <p className="c1-c p-medium">
            {curator.curations_number} <span className="gray-c">cur.</span>
          </p>
          <p className="gray-c p-medium">&#9679;</p>
          <p className="c1-c p-medium">
            {curator.articles_number} <span className="gray-c">arts.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
