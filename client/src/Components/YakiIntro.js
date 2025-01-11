import React, { useContext, useEffect, useRef, useState } from "react";
import { Context } from "../Context/Context";
import hero from "../media/images/yaki-intro.jpg";
import Follow from "./NOSTR/Follow";
import { Link } from "react-router-dom";

const content = [
  {
    url: "/yakihonne-smart-widgets",
    thumbnail:
      "https://yakihonne.s3.ap-east-1.amazonaws.com/sw-thumbnails/update-smart-widget.png",
    tag: "Smart widgets",
    new: true,
  },
  {
    url: "/points-system",
    thumbnail:
      "https://yakihonne.s3.ap-east-1.amazonaws.com/sw-thumbnails/update-points-system.png",
    tag: "Points system",
    new: false,
  },
  {
    url: "/yakihonne-flash-news",
    thumbnail:
      "https://yakihonne.s3.ap-east-1.amazonaws.com/sw-thumbnails/update-flash-news.png",
    tag: "Flash news",
    new: false,
  },
  {
    url: "/yakihonne-mobile-app",
    thumbnail:
      "https://yakihonne.s3.ap-east-1.amazonaws.com/sw-thumbnails/update-mobile-app.png",
    tag: "Mobile app",
    new: false,
  },
];

export default function YakiIntro() {
  const [swipe, setSwipe] = useState(false);
  const ref = useRef(null);

  const [up, setUp] = useState(false);

  useEffect(() => {
    const handleScroll = (e) => {
      let el = document.querySelector(".main-page-nostr-container");
      if (!el) return;
      if (el.scrollTop >= 600) setUp(true);
      else setUp(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {swipe && <Banner exit={() => setSwipe(false)} />}
      <div
        style={{
          position: "fixed",
          right: "0px",
          bottom: up ? "74px" : "16px",
          transition: ".2s ease-in-out",
          zIndex: "1000000",
        }}
        className="fx-centered fx-end-h"
      >
        {!swipe && (
          <div className="slide-right" onClick={() => setSwipe(!swipe)}>
            <div className="bunny-icon"></div>
          </div>
        )}
      </div>
    </>
  );
}

const Banner = ({ exit }) => {
  return (
    <div
      style={{
        position: "fixed",
        right: "0",
        top: 0,
        transition: ".2s ease-in-out",
        width: "100vw",
        height: "100vh",
        zIndex: "100000000",
      }}
      className="fixed-container fx-centered fx-col fx-end-v  box-pad-h"
      onClick={(e) => {
        e.stopPropagation();
        exit();
      }}
    >
      <div
        className="fx-scattered box-pad-v-s"
        style={{ width: "min(100%, 400px)" }}
      >
        <h4>Updates news</h4>
        <div className="close" style={{ position: "static" }} onClick={exit}>
          <div></div>
        </div>
      </div>
      <div
        style={{
          height: "90%",
          width: "min(100%, 400px)",
          position: "relative",
          backgroundColor: "transparent",
          border: "none",
        }}
        className="sc-s-18 bg-img cover-bg fx-centered fx-start-v slide-right carouselX"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div
          className="fit-container fit-height fx-centered fx-col fx-start-h fx-start-v box-pad-h-s box-pad-v-s"
          style={{ overflow: "scroll" }}
        >
          {content.map((card, index) => {
            return (
              <Link
                to={card.url}
                target="_blank"
                className="box-pad-h box-pad-v fit-container sc-s-18 pointer option fx-shrink bg-img cover-bg"
                style={{
                  aspectRatio: "16/9",
                  position: "relative",
                  borderColor: card.new ? "var(--orange-main)" : "",
                  backgroundImage: `url(${card.thumbnail})`,
                }}
                key={index}
              >
                <div
                  className="sticker sticker-normal "
                  style={{
                    position: "absolute",
                    left: card.new ? "50px" : 0,
                    paddingLeft: card.new ? "25px" : "",
                    top: 0,
                    color: "white",
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: 0,
                    backgroundColor: "#555555",
                  }}
                >
                  <p className="p-medium p-italic ">{card.tag}</p>
                </div>
                {card.new && (
                  <div
                    className="sticker sticker-normal "
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      color: card.new ? "white" : "var(--gray)",
                      borderTopRightRadius: 0,
                      borderBottomLeftRadius: 0,
                      backgroundColor: card.new
                        ? "var(--orange-main)"
                        : "var(--dim-gray)",
                    }}
                  >
                    <p className="p-medium p-italic ">New</p>
                  </div>
                )}
              </Link>
            );
          })}
          <div
            className="box-pad-h-m box-pad-v-m fit-container sc-s-18 fx-shrink"
            style={{
              position: "relative",
            }}
          >
            <div className="fit-container fx-scattered">
              <div>
                <p>Updates</p>
                <p className="gray-c p-italic p-medium">
                  Last updated Aug 30, 2024
                </p>
              </div>
              <p className="orange-c p-medium">v3.124.0</p>
            </div>
            <p>{`
- The ability to have and manage multiple users.
- Smart widget sharing.
- Smart widget editor optimization.
- Optimizing overall performance.
- Addressing the issue where users can not login using nos2x extension in Chrome and Brave browsers.
- General bug fix.
`}</p>
            <div className="fit-container fx-centered box-pad-v">
              <p className="orange-c p-medium">
                {" "}
                {">>"} The end 😁 {"<<"}{" "}
              </p>
            </div>
            <div className="box-pad-v"></div>
            <div className="box-pad-v"></div>
          </div>
        </div>
      </div>
    </div>
  );
};