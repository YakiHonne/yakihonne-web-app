import React, { useState } from "react";
import { Link } from "react-router-dom";
import s1 from "../../media/images/s1-yma.png";
import s2 from "../../media/images/s2-yma.png";
import s3 from "../../media/images/s3-yma.png";
import s4 from "../../media/images/s4-yma.png";
import s5 from "../../media/images/s5-yma.png";
import s6 from "../../media/images/s6-yma.png";
import s7 from "../../media/images/s7-yma.png";
import s8 from "../../media/images/s8-yma.png";
import s8e from "../../media/images/s8-e-yma.png";
import { Helmet } from "react-helmet";

export default function YakiMobileApp() {
  const [showTuto, setShowTuto] = useState(false);

  return (
    <div
      className="fit-container fx-centered box-pad-h box-pad-v fx-start-v"
      style={{ backgroundColor: "black", minHeight: "100vh" }}
    >
      <Helmet>
        <title>Yakihonne | Yakihonne mobile app</title>
        <meta
          name="description"
          content={
            "Check the yakihonne mobile app available for both Android and iOS"
          }
        />
        <meta
          property="og:description"
          content={
            "Check the yakihonne mobile app available for both Android and iOS"
          }
        />

        <meta
          property="og:url"
          content={`https://yakihonne.com/yakihonne-mobile-app`}
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content="Yakihonne | Yakihonne mobile app" />
        <meta
          property="twitter:title"
          content="Yakihonne | Yakihonne mobile app"
        />
        <meta
          property="twitter:description"
          content={
            "Check the yakihonne mobile app available for both Android and iOS"
          }
        />
      </Helmet>
      {showTuto && (
        <div
          className="fixed-container fx-centered fx-col box-pad-h"
          style={{ background: "rgba(0, 0, 0, 0.75)" }}
        >
          <iframe
            style={{
              aspectRatio: "16/9",
              width: "min(100%, 800px)",
            }}
            src="https://www.youtube.com/embed/w5yCsULjwxw"
            title="YakiHonne mobile app demo"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
          <div
            className="close box-pad-v"
            style={{ position: "static" }}
            onClick={() => setShowTuto(false)}
          >
            <div></div>
          </div>
        </div>
      )}
      <div
        style={{
          position: "fixed",
          right: "32px",
          bottom: "48px",
          minWidth: "64px",
          aspectRatio: "1/1",
          borderRadius: "var(--border-r-50)",
          backgroundColor: "#202020",
          zIndex: 1000,
        }}
        data-tooltip="Watch tutorial"
        className="pointer fx-centered plus-btn round-icon-tooltip"
        onClick={() => setShowTuto(true)}
      >
        <div
          className="play-b-24"
          style={{ filter: "brightness(0) invert()" }}
        ></div>
      </div>
      <div
        style={{ width: "min(100%,1200px)", rowGap: "24px", columnGap: "24px" }}
        className="fx-centered fx-col"
      >
        <div
          className="box-pad-h-s box-pad-v-s sc-s-18 fit-container fx-scattered"
          style={{
            backgroundColor: "#202020",
            position: "sticky",
            border: "none",
            top: "1rem",
            zIndex: 100,
          }}
        >
          <Link to={"/"} className="fx-centered">
            <div
              className="yakihonne-logo"
              style={{
                filter: "brightness(0) invert()",
                width: "128px",
                height: "48px",
              }}
            ></div>
          </Link>
          <h5 className="gray-c">Mobile App Preview</h5>
          <div className="fx-centered">
            <Link to={"/yakihonne-mobile-app-links"} target={"_blank"}>
              <button
                className="btn btn-normal fx-centered"
                style={{ padding: "1rem", height: "32px" }}
              >
                <div
                  className="mobile"
                  style={{ filter: "brightness(0) invert()" }}
                ></div>
                <span className="p-medium">Get the app</span>
              </button>
            </Link>
          </div>
        </div>
        <video
          autoPlay="autoplay"
          loop="loop"
          muted
          playsInline
          onContextMenu={() => {
            return false;
          }}
          preload="auto"
          id="myVideo"
          style={{
            position: "relative",
            border: "none",
            zIndex: "0",
            borderRadius: "var(--border-r-18)",
          }}
          className="fit-container"
        >
          <source
            src="https://yakihonne.s3.ap-east-1.amazonaws.com/videos/yakihonne-mobile-app-promo.mp4"
            type="video/mp4"
          />{" "}
          Your browser does not support HTML5 video.
        </video>
        <div
          className="fit-container fx-centered fx-stretch fx-wrap"
          style={{ rowGap: "24px", columnGap: "24px" }}
        >
          <div
            className="fx-scattered fx-col  fx-stretch"
            style={{
              borderRadius: "var(--border-r-18)",
              backgroundColor: "#202020",
              flex: "1 1 400px",
            }}
          >
            <div className="box-pad-h box-pad-v fx-scattered fx-col fx-start-v">
              <div>
                <h2 className="  gray-c" style={{ color: "white" }}>
                  Elevate Your <span className="p-bold">Insights</span>
                </h2>
                <h2 className="  gray-c" style={{ color: "white" }}>
                  Where <span className="c1-c">writing</span> Shines Bright!
                </h2>
              </div>
            </div>
            <img
              style={{ objectFit: "contain" }}
              src={s1}
              className="fit-container"
            />
          </div>
          <div
            className="fx-scattered fx-col  fx-stretch"
            style={{
              borderRadius: "var(--border-r-18)",
              backgroundColor: "#202020",
              flex: "1 1 400px",
            }}
          >
            <div className="box-pad-h box-pad-v fx-centered fx-start-h fx-start-v">
              <h2 className=" " style={{ color: "white" }}>
                Limitless <span className="p-bold">content</span> for you to{" "}
                <span className="c1-c">engage.</span>
              </h2>
            </div>
            <div className="fit-container box-pad-h box-pad-v fx-centered">
              <img
                style={{ width: "70%", objectFit: "contain" }}
                src={s2}
                className="fit-container"
              />
            </div>
          </div>
        </div>
        <div
          className="fit-container fx-centered fx-stretch fx-wrap"
          style={{ rowGap: "24px", columnGap: "24px" }}
        >
          <div
            className="fx-scattered fx-col fx fx-stretch"
            style={{
              borderRadius: "var(--border-r-18)",
              backgroundColor: "var(--c1)",
            }}
          >
            <div className="box-pad-h box-pad-v fx-scattered fx-col fx-start-v">
              <div>
                <h2 className=" " style={{ color: "white" }}>
                  Discover <span className="white-c">curations.</span>
                </h2>
                <h2 className=" " style={{ color: "white" }}>
                  Craft your <span className="white-c">collections.</span>
                </h2>
                <h2 className=" " style={{ color: "white" }}>
                  Captivate your <span className="white-c">audience.</span>
                </h2>
              </div>
            </div>
            <img
              style={{ objectFit: "contain" }}
              src={s3}
              className="fit-container"
            />
          </div>
        </div>
        <div
          className="fit-container fx-centered fx-stretch fx-wrap"
          style={{ rowGap: "24px", columnGap: "24px" }}
        >
          <div
            className="fx-scattered fx fx-stretch"
            style={{
              borderRadius: "var(--border-r-18)",
              backgroundColor: "#202020",
            }}
          >
            <div className="box-pad-h box-pad-v fx-scattered fx-col fx-start-v">
              <div>
                <h2 className=" " style={{ color: "white" }}>
                  Stay connected with your{" "}
                  <span className="c1-c">followers, followings.</span>
                </h2>
              </div>
            </div>
            <img style={{ width: "50%", objectFit: "contain" }} src={s4} />
          </div>
        </div>
        <div
          className="fit-container fx-centered fx-stretch fx-wrap"
          style={{ rowGap: "24px", columnGap: "24px" }}
        >
          <div
            className="fx-scattered fx-col  fx-stretch"
            style={{
              borderRadius: "var(--border-r-18)",
              backgroundColor: "#202020",
              flex: "1 1 400px",
            }}
          >
            <div className="box-pad-h box-pad-v fx-scattered fx-col fx-start-v">
              <div>
                <h2 className=" " style={{ color: "white" }}>
                  <span className="c1-c">Write</span> your content.
                </h2>
                <h2 className=" " style={{ color: "white" }}>
                  <span className="c1-c">Refine</span> it effortlessly.
                </h2>
                <h2 className=" " style={{ color: "white" }}>
                  <span className="c1-c">Preview</span> it to perfection.
                </h2>
              </div>
            </div>
            <img
              style={{ objectFit: "contain" }}
              src={s5}
              className="fit-container"
            />
          </div>
          <div
            className="fx-scattered fx-col  fx-stretch"
            style={{
              borderRadius: "var(--border-r-18)",
              backgroundColor: "var(--c3)",
              flex: "1 1 400px",
            }}
          >
            <div className="box-pad-h box-pad-v fx-centered fx-col fx-start-h fx-start-v">
              <h2 className=" " style={{ color: "white" }}>
                Dive into <span className="c1-c">discussions.</span>
              </h2>
              <h2 className=" " style={{ color: "white" }}>
                Share your <span className="c1-c">voice.</span>
              </h2>
              <h2 className=" " style={{ color: "white" }}>
                Show your support with <span className="c1-c">votes.</span>
              </h2>
            </div>

            <img
              style={{ objectFit: "contain" }}
              src={s6}
              className="fit-container"
            />
          </div>
        </div>
        <div
          className="fit-container fx-centered fx-stretch fx-wrap"
          style={{ rowGap: "24px", columnGap: "24px" }}
        >
          <div
            className="fx-scattered fx-col fx fx-stretch"
            style={{
              borderRadius: "var(--border-r-18)",
              backgroundColor: "var(--gray)",
            }}
          >
            <div className="box-pad-h box-pad-v fx-scattered fx-col fx-start-v">
              <div className="fx-centered fit-container fx-wrap">
                <h2
                  className="   p-centered"
                  style={{ flex: "1 1 300px", color: "white" }}
                >
                  Boundless <span className="c3-c">freedom.</span>
                </h2>
                <h2
                  className="   p-centered"
                  style={{ flex: "1 1 300px", color: "white" }}
                >
                  Experience <span className="c3-c">NOSTR.</span>
                </h2>
                <h2
                  className="   p-centered"
                  style={{ flex: "1 1 300px", color: "white" }}
                >
                  Your own <span className="c3-c">control.</span>
                </h2>
              </div>
            </div>
            <img
              style={{ objectFit: "contain" }}
              src={s7}
              className="fit-container"
            />
          </div>
        </div>
        <div
          className="fit-container fx-centered fx-stretch fx-wrap"
          style={{ rowGap: "24px", columnGap: "24px" }}
        >
          <div
            className="fx-scattered fx fx-stretch fx-wrap"
            style={{
              borderRadius: "var(--border-r-18)",
              backgroundColor: "#202020",
            }}
          >
            <img
              style={{ width: "50%", objectFit: "contain", flex: "1 1 500px" }}
              src={s8}
              className="fit-container"
            />
            <div
              className="box-pad-h box-pad-v fx-centered fx-col "
              style={{ flex: "1 1 500px" }}
            >
              <h2 className="  p-centered" style={{ color: "white" }}>
                <span className="c1-c">Seamless account access</span> anytime,
                anywhere in <span className="c1-c">blink!</span>
              </h2>
              <Link to={"/yakihonne-mobile-app-links"} target={"_blank"}>
                <div className="fit-container fx-centered box-pad-v-m">
                  <img
                    style={{ width: "80%", objectFit: "contain" }}
                    src={s8e}
                    className="fit-container"
                  />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
