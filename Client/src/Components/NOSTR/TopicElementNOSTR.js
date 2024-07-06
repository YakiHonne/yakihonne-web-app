import React, { useContext, useEffect, useState } from "react";
import Date_ from "../Date_";
import { useNavigate } from "react-router-dom";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import relaysOnPlatform from "../../Content/Relays";
import { SimplePool } from "nostr-tools";
import { Context } from "../../Context/Context";

const pool = new SimplePool();

export default function TopicElementNOSTR({ topic, full = false }) {
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
  const [showDesc, setShowDesc] = useState(false);
  const navigateTo = useNavigate();
  const content = getParsedContent(topic.tags);
  const getDRef = () => {
    let tempArray = [];
    for (let tag of topic.tags) {
      if (tag[0] === "a") {
        tempArray.push(tag[1].split(":")[2]);
      }
    }
    return tempArray.length >= 10 ? tempArray.length : `0${tempArray.length}`;
  };
  useEffect(() => {
    if (!topic) return;
    let el = document.querySelector(`#carousel-item-${topic.id}`);
    if (/Android|iPhone/i.test(navigator.userAgent)) return
    el.addEventListener("mouseover", (e) => {
      e.stopPropagation();
      setShowDesc(true);
    });
    el.addEventListener("mouseout", (e) => {
      e.stopPropagation();
      setShowDesc(false);
    });
    return () => {
      el.addEventListener("mouseout", (e) => {
        e.stopPropagation();
        setShowDesc(false);
      });
      el.removeEventListener("mouseover", (e) => {
        e.stopPropagation();
        setShowDesc(true);
      });
    };
  }, [topic]);
  return (
    <div
      className={`bg-img cover-bg sc-s fx-shrink box-pad-h-m box-pad-v-m pointer carousel-item  fx-centered fx-end-v ${
        full ? "posts-card" : ""
      }`}
      style={{
        backgroundImage: `url(${content.thumbnail})`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        !showDesc && navigateTo(`/curations/${topic.naddr}`);
      }}
      id={`carousel-item-${topic.id}`}
    >
      <section
        className="fx-scattered fx-col fx-start-v sc-s-18 carousel-card-desc box-pad-h-m"
        style={{
          height: "max-content",
          position: "relative",
          overflow: "visible",
          paddingBottom: "1rem",
        }}
      >
        <div
          style={
            {
              // position: "absolute",
              // left: "50%",
              // top: "0",
              // transform: "translate(-50%,0%)",
            }
          }
          className="fx-centered fit-container box-pad-v-s"
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowDesc(!showDesc);
            }}
            style={{
              // width: "24px",
              // height: "24px",
              // backgroundColor: "var(--dim-gray)",
              borderRadius: "var(--border-r-50)",
              transform: showDesc ? "" : "rotate(180deg)",
              transition: ".2s ease-in-out",
            }}
            className="fx-centered"
          >
            <div
              className="arrow"
              style={{ filter: "invert()", opacity: ".5" }}
            ></div>
          </div>
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigateTo(`/curations/${topic.naddr}`);
          }}
        >
          <div className="fx-centered fx-start-v fx-col fit-container">
            <div className="fit-container fx-centered fx-start-h">
              <div
                className="fx-centered fx-start-h"
                style={{ columnGap: "10px" }}
              >
                <AuthorPreview author={topic.author} pubkey={topic.pubkey} />
              </div>
              <div>
                <p className="white-c p-medium">&#9679;</p>
              </div>
              <div
                className="fx-centered fx-start-h"
                style={{ filter: "invert()" }}
              >
                <div className="fx-centered">
                  <p className="p-medium">
                    {getDRef()} <span>arts.</span>
                  </p>
                </div>
              </div>
            </div>
            {showDesc && (
              <>
                <p className="white-c p-two-lines">{content.title}</p>
                <div className="fit-container fx-centered fx-start-h">
                  <p className="gray-c p-small">
                    On{" "}
                    <Date_
                      toConvert={new Date(
                        topic.created_at * 1000
                      ).toISOString()}
                    />
                  </p>
                </div>
              </>
            )}
          </div>
          {showDesc && (
            <p className="gray-c p-medium p-three-lines">{content.excerpt}</p>
          )}
        </div>
      </section>
    </div>
  );
}

const AuthorPreview = ({ author, pubkey }) => {
  const [authorData, setAuthorData] = useState("");
  const { relayConnect } = useContext(Context);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await relayConnect.connect();
        let sub = relayConnect.sub([{ kinds: [0], authors: [pubkey] }]);
        // let sub = pool.sub(relaysOnPlatform, [
        //   { kinds: [0], authors: [pubkey] },
        // ]);
        sub.on("event", (event) => {
          let img = event ? JSON.parse(event.content).picture : "";
          let name = event
            ? JSON.parse(event.content).name?.substring(0, 20) ||
              event.pubkey?.substring(0, 20)
            : event.pubkey?.substring(0, 20);
          let pubkey = event.pubkey;
          setAuthorData((auth) => {
            return { img, name };
          });
          return;
        });
        sub.on("eose", () => {
          // pool.close(relaysOnPlatform)
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
          size={20}
          img={author.img}
          mainAccountUser={false}
          allowClick={true}
          user_id={pubkey}
          ring={false}
        />
        <p className="white-c p-medium">
          Posted by <span className="green-c">{author.name}</span>
        </p>
      </>
    );
  return (
    <>
      <UserProfilePicNOSTR
        size={20}
        img={authorData.img}
        mainAccountUser={false}
        allowClick={true}
        user_id={pubkey}
        ring={false}
      />
      <p className="white-c p-medium">
        Posted by <span className="green-c">{authorData.name}</span>
      </p>
    </>
  );
};
