import { SimplePool } from "nostr-tools";
import React, { useEffect, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { getParsedAuthor } from "../../Helpers/Encryptions";
import LoadingScreen from "../LoadingScreen";
import Follow from "./Follow";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import ShortenKey from "./ShortenKey";

const pool = new SimplePool();

export default function ShowPeople({ exit, list, type = "following" }) {
  const [people, setPeople] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let _list =
          type === "following"
            ? list.map((item) => item[1])
            : list.map((item) => item.pubkey);

        let sub = pool.sub(relaysOnPlatform, [{ kinds: [0], authors: _list }]);
        sub.on("event", (event) => {
          setPeople((data) => {
            let newF = [...data, getParsedAuthor(event)];
            let netF = newF.filter((item, index, newF) => {
              if (
                newF.findIndex((_item) => item.pubkey === _item.pubkey) ===
                index
              )
                return item;
            });
            return netF;
          });
          setIsLoaded(true);
        });
        // setPeople(data.map((item) => getParsedAuthor(item)));
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       let _list =
  //         type === "following"
  //           ? list.map((item) => item[1])
  //           : list.map((item) => item.pubkey);

  //       let data = await pool.list(relaysOnPlatform, [
  //         { kinds: [0], authors: _list },
  //       ]);

  //       setPeople(data.map((item) => getParsedAuthor(item)));
  //       setIsLoaded(true);
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   };
  //   fetchData();
  // }, []);

  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      <ArrowUp />
      <div
        className="fixed-container box-pad-h box-pad-v fx-centered fx-start-v "
        style={{
          padding: "4rem",
          overflow: "scroll",
          scrollBehavior: "smooth",
        }}
        onClick={(e) => {
          e.stopPropagation();
          exit();
        }}
      >
        <div style={{ width: "min(100%, 500px)", position: "relative" }}>
          <div className="close" onClick={exit}>
            <div></div>
          </div>
          <div className="fit-container fx-centered">
            <h3 className="p-caps">{type}</h3>
          </div>
          <div
            className="fit-container fx-centered fx-start-v fx-col box-marg-full"
            style={{ rowGap: "24px" }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {people.map((item) => {
              return (
                <div
                  className="fx-scattered fit-container fx-start-v "
                  key={item.pubkey + item.name}
                >
                  <div
                    className="fx-centered fx-start-v"
                    style={{ columnGap: "24px" }}
                  >
                    <UserProfilePicNOSTR
                      size={48}
                      img={item.img}
                      user_id={item.pubkey}
                    />
                    <div className="fx-centered fx-col fx-start-v">
                      <ShortenKey id={item.pubkeyhashed} />
                      <p>{item.name}</p>
                      <p className="gray-c p-medium p-four-lines">
                        {item.about}
                      </p>
                    </div>
                  </div>
                  <Follow toFollowKey={item.pubkey} toFollowName={item.name} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

const ArrowUp = () => {
  const [showArrow, setShowArrow] = useState(false);

  useEffect(() => {
    const handleScroll = (e) => {
      if (document.querySelector(".fixed-container").scrollTop >= 600)
        setShowArrow(true);
      else setShowArrow(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  const straightUp = () => {
    document.querySelector(".fixed-container").scrollTop = 0;
  };

  if (!showArrow) return null;
  return (
    <div
      style={{
        position: "fixed",
        right: "32px",
        bottom: "32px",
        minWidth: "40px",
        aspectRatio: "1/1",
        borderRadius: "var(--border-r-50)",
        backgroundColor: "var(--white)",
        filter: "invert()",
        zIndex: 100000,
        // transform: "rotate(180deg)",
      }}
      className="pointer fx-centered slide-up"
      onClick={straightUp}
    >
      <div className="arrow" style={{ transform: "rotate(180deg)" }}></div>
    </div>
  );
};
