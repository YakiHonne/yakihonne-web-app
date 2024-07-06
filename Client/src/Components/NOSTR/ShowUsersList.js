import { SimplePool } from "nostr-tools";
import React, { useEffect, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { getParsedAuthor } from "../../Helpers/Encryptions";
import LoadingScreen from "../LoadingScreen";
import Follow from "./Follow";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import ShortenKey from "./ShortenKey";
import NumberShrink from "../NumberShrink";

const pool = new SimplePool();

export default function ShowPeople({ exit, list, title, extras }) {
  const [people, setPeople] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let sub = pool.sub(relaysOnPlatform, [{ kinds: [0], authors: list }]);
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
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  const getZaps = (pubkey) => {
    let sats = extras.reduce(
      (total, item) =>
        item.pubkey === pubkey ? (total += item.amount) : (total = total),
      0
    );
    return sats;
  };

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
            <h3 className="p-caps">{title}</h3>
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
                  <div className="fx-centered">
                    {extras.length > 0 && (
                      <div className="fx-centered box-pad-h-m" style={{minWidth: "32px"}}>
                        <div className="bolt"></div>
                        <NumberShrink value={getZaps(item.pubkey)}/>
                      </div>
                    )}
                    <Follow
                      toFollowKey={item.pubkey}
                      toFollowName={item.name}
                    />
                  </div>
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
