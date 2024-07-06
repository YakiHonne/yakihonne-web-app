import React, { useEffect, useRef, useState } from "react";
import hero from "../media/images/yaki-intro.jpg";
import Follow from "./NOSTR/Follow";

export default function YakiIntro() {
  const [swipe, setSwipe] = useState(false);
  const ref = useRef(null);

  useEffect(() => {}, []);

  return (
    <>
      {swipe && <Banner exit={() => setSwipe(false)} />}
      <div
        style={{
          position: "fixed",
          right: "0px",
          top: "50%",
          transform: "translateY(-50%)",
          transition: ".2s ease-in-out",
          // width: "100vw",
          // height: "100vh",
          zIndex: "1000000",
        }}
        className="fx-centered fx-end-h"
      >
        {!swipe && (
          <div className="slide-right">
            <div
              style={{
                // width: "max-content",
                border: "none",
                background: "var(--dim-gray)",
                transform: "rotate(-90deg) translateY(40px)",
              }}
              className="fx-centered pointer sc-s box-pad-h box-pad-v-m "
              onClick={() => setSwipe(!swipe)}
            >
              <div>Hey 👋🏻 Check me!</div>
            </div>
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
      className="fx-centered fx-end-h box-pad-h"
      onClick={(e) => {
        e.stopPropagation();
        exit();
      }}
    >
      <div
        style={{
          height: "90%",
          width: "min(100%, 400px)",
          backgroundImage: `url(${hero})`,
          border: "none",
          position: "relative",
        }}
        className="sc-s bg-img cover-bg fx-centered fx-end-v box-pad-h slide-right"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
            background:
              "linear-gradient(179.82deg, rgba(0, 0, 0, 0) 19.91%, #000000 93.18%)",
          }}
          className="fx-centered fx-end-v"
        ></div>
        <div
          className="fit-container fx-centered fx-col"
          style={{ height: "50%", position: "relative", zIndex: "1" }}
        >
          <div
            className="yakihonne-logo"
            style={{ filter: "brightness(0) invert()" }}
          ></div>
          <p className="white-c p-centered" style={{ maxWidth: "400px" }}>
            YakiHonne is a Nostr-based decentralized content media protocol,
            which supports free curation, creation, publishing, and reporting by
            various media.
          </p>
          <div className="fit-container fx-centered box-pad-v fx-col">
            <Follow
              toFollowKey={
                "20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3"
              }
              toFollowName={"Yakihonne"}
            />
            {/* <button className="btn btn-normal">Read about us</button> */}
          </div>
        </div>
      </div>
    </div>
  );
};
