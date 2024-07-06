import React, { useContext, useEffect, useState } from "react";
import Date_ from "../Date_";
import { useNavigate, Link } from "react-router-dom";
import relaysOnPlatform from "../../Content/Relays";
import { nip19, relayInit } from "nostr-tools";
import { getEmptyNostrUser } from "../../Helpers/Encryptions";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import TopicElementNOSTR from "./TopicElementNOSTR";
import { SimplePool } from "nostr-tools";
import { Context } from "../../Context/Context";
const pool = new SimplePool();

export default function HomeCarouselNOSTR({ homeCarousel = null }) {
  const { setGlobalCuration } = useContext(Context);
  const [carouselElements, setCarouselElements] = useState(homeCarousel || []);
  const [isLoaded, setIsLoaded] = useState(false);
  const [translationIndex, setTranslationIndex] = useState(0);
  const [carouselState, setCarouselState] = useState(true);

  useEffect(() => {
    let dataFetching = async () => {
      try {
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
          setCarouselElements((_curations) => {
            let newC = [
              ..._curations,
              {
                ...curation,
                naddr,
                author: {
                  name: curation.pubkey.substring(0, 10),
                  img: "",
                },
              },
            ];
            newC = newC.sort((el_1, el_2) => el_2.created_at - el_1.created_at);
            return newC;
          });

          // setCarouselElements([...tempCurationsInNostr.reverse()]);
          setIsLoaded(true);
        });
        sub.on("eose", () => {
          setGlobalCuration(tempCuration);
          relay.close();
          sub.unsub();
        });
      } catch (err) {
        console.log(err);
        setIsLoaded(true);
      }
    };
    if (homeCarousel) {
      setIsLoaded(true);
      return;
    }
    dataFetching();
  }, []);
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
  //           let naddr = nip19.naddrEncode({
  //             identifier: item.tags.find(tag => tag[0] === "d")[1],
  //             pubkey: item.pubkey,
  //             kind: 30001,
  //           });

  //           return {
  //             ...item,
  //             naddr,
  //             author: {
  //               name: parsedAuthor.name || item.pubkey.substring(0, 10),
  //               img: parsedAuthor.picture || "",
  //             },
  //           };
  //         })
  //       );

  //       setCarouselElements([...tempCurationsInNostr.reverse()]);
  //       setIsLoaded(true);
  //       return;
  //     } catch (err) {
  //       console.log(err);
  //       setIsLoaded(true);
  //     }
  //   };
  //   if (homeCarousel) {
  //     setIsLoaded(true);
  //     return;
  //   }
  //   dataFetching();
  // }, []);

  useEffect(() => {
    var timeout = setTimeout(null);
    if (isLoaded && carouselState) {
      timeout = setTimeout(() => {
        if (translationIndex < carouselElements.length - 2)
          setTranslationIndex(translationIndex + 1);
        else setTranslationIndex(0);
      }, 4000);
    } else {
      clearTimeout(timeout);
    }
    return () => {
      clearTimeout(timeout);
    };
  }, [translationIndex, carouselState, isLoaded]);

  const nextSlide = () => {
    setCarouselState(false);
    if (
      carouselElements.length > 1 &&
      translationIndex < carouselElements.length - 1
    )
      setTranslationIndex(translationIndex + 1);
    else {
      setTranslationIndex(0);
    }
  };
  const prevSlide = () => {
    setCarouselState(false);
    if (translationIndex > 0) setTranslationIndex(translationIndex - 1);
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
        className="fit-container fx-centered sc-s skeleton-container"
        style={{
          height: "300px",
          backgroundColor: "var(--dim-gray)",
          border: "none",
        }}
      >
        {/* <span className="loader"></span> */}
      </div>
    );
  if (carouselElements.length === 0) return;
  return (
    <div className="fit-container fx-scattered carousel-container">
      <div className="browsing-arrows-mobile">
        <div className="browsing-arrow" onClick={prevSlide}>
          <div className="arrow" style={{ transform: "rotate(90deg)" }}></div>
        </div>
        <div className="browsing-arrow" onClick={nextSlide}>
          <div className="arrow" style={{ transform: "rotate(-90deg)" }}></div>
        </div>
      </div>
      <div className="browsing-arrow" onClick={prevSlide}>
        <div className="arrow" style={{ transform: "rotate(90deg)" }}></div>
      </div>
      <div
        style={{
          overflow: "hidden",
          columnGap: "32px",
          width: "100%",
        }}
        className="carousel"
      >
        <div
          className="fx-centered fx-start-h fit-container carousel-inner-container"
          style={{
            columnGap: "32px",
            transition: ".4s ease-in-out",
            transform: `translateX(-${485 * translationIndex}px)`,
          }}
        >
          {carouselElements.map((item) => {
            if (item.kind === 30001)
              return <TopicElementNOSTR key={item.id} topic={item} />;
          })}
        </div>
        <div
          className="fx-centered fx-start-h fit-container carousel-inner-container-mobile"
          style={{
            columnGap: "0",
            transition: ".4s ease-in-out",
            transform: `translateX(-${100 * translationIndex}%)`,
          }}
        >
          {carouselElements.map((item) => {
            if (item.kind === 30001)
              return <TopicElementNOSTR key={item.id} topic={item} />;
          })}
        </div>
      </div>
      <div className="browsing-arrow" onClick={nextSlide}>
        <div className="arrow" style={{ transform: "rotate(-90deg)" }}></div>
      </div>
    </div>
  );
}

{
  /* <div
      className="bg-img cover-bg sc-s fx-shrink box-pad-h-m box-pad-v-m pointer carousel-item"
      style={{
        backgroundImage: `url(${content.thumbnail})`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        navigateTo(`/curations/${topic.id}`);
      }}
    >
      <section
        className="fx-scattered fx-col fx-start-v sc-s carousel-card-desc box-pad-h box-pad-v"
        style={{
          height: "100%",
        }}
      >
        <div>
          <div className="box-marg-s fx-centered fx-start-v fx-col fit-container">
            <h4 className="white-c p-two-lines">{content.title}</h4>
            <div className="fit-container fx-centered fx-start-h">
              <p className="gray-c p-medium">
                On{" "}
                <Date_
                  toConvert={new Date(topic.created_at * 1000).toISOString()}
                />
              </p>
            </div>
          </div>
          <p className="white-c p-medium p-four-lines">{content.excerpt}</p>
        </div>
        <div className="fit-container fx-centered fx-start-h">
          <div className="fx-centered fx-start-h" style={{ columnGap: "16px" }}>
            <UserProfilePicNOSTR
              size={32}
              img={topic.author.img}
              mainAccountUser={false}
              allowClick={true}
              user_id={topic.pubkey}
            />
            <p className="white-c">
              Posted by <span className="green-c">{topic.author.name}</span>
            </p>
          </div>
          <div>
            <p className="white-c">&#9679;</p>
          </div>
          <div
            className="fx-centered fx-start-h"
            style={{ filter: "invert()" }}
          >
            <div className="fx-centered">
              <div className="posts-24"></div>
              <p>
                {getDRef()} <span>arts.</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div> */
}
