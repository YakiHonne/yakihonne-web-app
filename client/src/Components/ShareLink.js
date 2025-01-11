import React, { useContext, useEffect, useState } from "react";
import { Context } from "../Context/Context";
import { nip19 } from "nostr-tools";
import { getAuthPubkeyFromNip05 } from "../Helpers/Helpers";
import QRCode from "react-qr-code";
import UserProfilePicNOSTR from "./NOSTR/UserProfilePicNOSTR";
import { useToPng } from "@hugocxl/react-to-image";
import axios from "axios";
import { getBech32 } from "../Helpers/Encryptions";
import Date_ from "./Date_";
import UN from "./NOSTR/UN";

const getNostrLink = async (path) => {
  let pathSplit = path.split("/");
  let type = pathSplit[1];
  let kind = 0;
  switch (type) {
    case "curations":
      kind = 30004;
      break;
    case "article":
      kind = 30023;
      break;
    case "videos":
      kind = 34235;
      break;
  }
  if (kind !== 0) {
    let naddr = pathSplit[2];
    if (pathSplit.length === 4) {
      let pubkey = await getAuthPubkeyFromNip05(pathSplit[2]);
      if (!pubkey) return "nostr:";
      naddr = nip19.naddrEncode({
        identifier: pathSplit[3],
        kind,
        pubkey,
      });
      return `nostr:${naddr}`;
    }
    return `nostr:${naddr}`;
  }

  let naddr = pathSplit[2] || pathSplit[1];
  return `nostr:${naddr}`;
};

let kind1BG = {
  fn: "linear-gradient(45deg, #6a3093, #a044ff)",
  un: "linear-gradient(45deg, #DA4453, #89216B)",
  bf: "linear-gradient(45deg, #a8c0ff, #3f2b96)",
  nt: "linear-gradient(45deg, #3a3400, #a8ccaf)",
};

export default function ShareLink({
  label = false,
  path = "",
  title = "",
  description = "",
  shareImgData = false,
  kind = false,
}) {
  const { setToast } = useContext(Context);
  const [showSharing, setShowSharing] = useState(false);
  const [showCopyURL, setShowCopyURL] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nostrURL, setNostURL] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [_, convert, ref] = useToPng({
    selector: "#to-print",
    quality: 0.8,
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.download = "shared-from-YAKIHONNE.jpeg";
      link.href = data;
      link.click();
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      let url = await getNostrLink(path);
      setNostURL(url);
    };
    fetchData();
  }, []);

  const copyLink = (toCopy, type = "URL") => {
    navigator.clipboard.writeText(toCopy);
    setToast({
      type: 1,
      desc: `${type} was copied! 👏`,
    });
  };
  const handleSharing = async (e) => {
    e.stopPropagation();
    let isTouchScreen = window.matchMedia("(pointer: coarse)").matches;
    if (navigator.share && isTouchScreen) {
      setIsMobile(true);
      setShowSharing(true);
    } else {
      setShowSharing(true);
      console.log(
        "Web share is currently not supported on this browser. Please provide a callback"
      );
    }
  };

  const handleSharingInMobile = async () => {
    if (navigator.share) {
      try {
        let shareDetails = {
          url: `${window.location.protocol}//${window.location.hostname}${path}`,
          title: title,
          text: description,
        };
        await navigator
          .share(shareDetails)
          .then(() =>
            console.log("Hooray! Your content was shared to tha world")
          );
      } catch (error) {
        console.log(`Oops! I couldn't share to the world because: ${error}`);
      }
    } else {
      setShowSharing(true);
      console.log(
        "Web share is currently not supported on this browser. Please provide a callback"
      );
    }
  };

  return (
    <>
      {showSharing && (
        <div
          className="fixed-container fx-centered"
          onClick={(e) => {
            e.stopPropagation();
            setShowSharing(false);
          }}
        >
          <div
            className="box-pad-v box-pad-h fx-centered fx-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Share on</h3>
            {shareImgData && !showCopyURL && (
              <ShareImg
                data={shareImgData}
                kind={kind}
                path={`${window.location.protocol}//${window.location.hostname}${path}`}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}
            <div className="fx-centered" style={{ columnGap: "30px" }}>
              {!showCopyURL && (
                <>
                  {shareImgData && (
                    <div
                      className={isLoading ? "flash" : "icon-tooltip"}
                      data-tooltip="Download image"
                      onClick={() => (isLoading ? null : convert())}
                    >
                      <div className="download-file-24"></div>
                    </div>
                  )}
                  {!isMobile && (
                    <>
                      <a
                        className="twitter-share-button icon-tooltip"
                        href={`https://twitter.com/intent/tweet?text=${`${window.location.protocol}//${window.location.hostname}${path}`}`}
                        target="_blank"
                        data-tooltip="Share on X"
                      >
                        <div className="twitter-logo-24"></div>
                      </a>
                      <div
                        className="fb-share-button"
                        data-href={`${`${
                          window.location.protocol
                        }//${"yakihonne.com"}${path}`}`}
                        data-layout=""
                        data-size=""
                      >
                        <a
                          target="_blank"
                          href={`https://www.facebook.com/sharer/sharer.php?u=${`${
                            window.location.protocol
                          }//${"yakihonne.com"}${path}`}%2F&amp;src=sdkpreparse`}
                          className="fb-xfbml-parse-ignore icon-tooltip"
                          data-tooltip="Share on Facebook"
                        >
                          <div className="fb-icon-24"></div>
                        </a>
                      </div>
                      <a
                        href={`whatsapp://send?text=${`${window.location.protocol}//${window.location.hostname}${path}`}`}
                        data-action="share/whatsapp/share"
                        target="_blank"
                        className="twitter-share-button icon-tooltip"
                        data-tooltip="Share on Whatsapp"
                      >
                        <div className="whatsapp-icon-24"></div>
                      </a>
                      <a
                        href={`https://www.linkedin.com/shareArticle?mini=true&url=${`${
                          window.location.protocol
                        }//${"yakihonne.com"}${path}`}&title=${title}&summary=${description}&source=${"https://yakihonne.com"}`}
                        data-action="share/whatsapp/share"
                        target="_blank"
                        className="twitter-share-button icon-tooltip"
                        data-tooltip="Share on LinkedIn"
                      >
                        <div className="in-icon-24"></div>
                      </a>
                      <div
                        className="icon-tooltip"
                        data-tooltip="Copy link"
                        onClick={() => setShowCopyURL(true)}
                      >
                        <div className="link-24 "></div>
                      </div>
                    </>
                  )}
                  {isMobile && (
                    <div
                      className="icon-tooltip"
                      data-tooltip="Copy link"
                      onClick={handleSharingInMobile}
                    >
                      <div className="link-24 "></div>
                    </div>
                  )}
                  <div
                    className="icon-tooltip"
                    data-tooltip="Copy n*"
                    onClick={() => copyLink(nostrURL.split("nostr:")[1], "n*")}
                  >
                    <div className="copy-24"></div>
                  </div>
                </>
              )}
            </div>
            {showCopyURL && (
              <div
                className="fit-container fx-centered fx-col fx-start-v sc-s-18 box-pad-h-m box-pad-v-m slide-up"
                style={{ marginTop: "1rem", maxWidth: "400px" }}
              >
                <p className="c1-c p-left fit-container">Human-readable URL</p>
                <div
                  className={`fx-scattered if pointer fit-container dashed-onH`}
                  style={{ borderStyle: "dashed" }}
                  onClick={() =>
                    copyLink(
                      `${window.location.protocol}//${window.location.hostname}${path}`
                    )
                  }
                >
                  <p className="p-one-line">{`${window.location.protocol}//${window.location.hostname}${path}`}</p>
                  <div className="copy-24"></div>
                </div>
                <p className="c1-c p-left fit-container">Nostr URL</p>
                <div
                  className="fx-scattered if pointer dashed-onH fit-container"
                  style={{ borderStyle: "dashed" }}
                  onClick={() => copyLink(nostrURL)}
                >
                  <p className="p-one-line">{nostrURL}</p>
                  <div className="copy-24"></div>
                </div>
              </div>
            )}
            {showCopyURL && (
              <div
                className="close"
                style={{ position: "static" }}
                onClick={() => setShowCopyURL(false)}
              >
                <div></div>
              </div>
            )}
            <button
              className="btn-text btn"
              onClick={() => setShowSharing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div
        className={label ? "fx-scattered fit-container" : "icon-tooltip"}
        data-tooltip="Share"
        onClick={handleSharing}
      >
        {label && <p>{label}</p>}
        <div className="share-v2-24"></div>
      </div>
    </>
  );
}

const ShareImg = ({ data, kind, path, setIsLoading }) => {
  const { tempChannel } = useContext(Context);
  const [ppBase64, setPpBase64] = useState(data.author.picture || "");
  const [thumbnailBase64, setThumbnailBase64] = useState(data.post.image || "");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        let [_pp, _thumbnail] = await Promise.all([
          axios.post("/api/v1/url-to-base64", {
            images: [data.author.picture],
          }),
          axios.post("/api/v1/url-to-base64", {
            images: [data.post.image],
          }),
        ]);
        setIsLoading(false);
        setThumbnailBase64(_thumbnail.data[0] || data.post.image);
        setPpBase64(_pp.data[0] || data.author.picture);
      } catch (err) {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getBG = () => {
    if (data.label.toLowerCase() === "flash news") return kind1BG.fn;
    if (data.label.toLowerCase() === "uncensored note") return kind1BG.un;
    if (data.label.toLowerCase() === "buzz feed") return kind1BG.bf;
    if (data.label.toLowerCase() === "note") return kind1BG.nt;
  };

  if (kind === 1)
    return (
      <div
        className="box-pad-h box-pad-v fx-centered fx-col"
        id="to-print"
        style={{ width: "380px", maxHeight: "600px", minHeight: "400px" }}
      >
        <div
          className="fit-container fx-centered fx-col sc-s-18"
          style={{
            border: "none",
            height: "100%",
            position: "relative",
            rowGap: 0,
            background: getBG(),
          }}
        >
          <div>
            <div
              className="yakihonne-logo"
              style={{
                width: "128px",
                height: "60px",
                filter: "brightness(0) invert()",
              }}
            ></div>
          </div>
          <div style={{ backgroundColor: "white" }} className="fit-container">
            <div className="fit-container box-pad-h-m box-pad-v-m ">
              <p
                style={{
                  color: "black",
                  maxHeight: "250px",
                  overflow: "hidden",
                }}
                className=" p-medium gray-c"
              >
                {data.post.content}
              </p>
              <p style={{ color: "black" }}>...</p>
              {data.post.description && (
                <p className="p-three-lines p-medium gray-c">
                  {data.post.description}
                </p>
              )}
              {thumbnailBase64 && (
                <div
                  className="fit-container bg-img cover-bg sc-s-18"
                  style={{
                    aspectRatio: "16/9",
                    margin: ".5rem auto",
                    backgroundImage: `url(${thumbnailBase64})`,
                  }}
                ></div>
              )}
              {data.extra && data.extra.is_sealed && (
                <div style={{ marginTop: ".5rem" }} className="fit-container">
                  <UN
                    data={JSON.parse(data.extra.content)}
                    state="sealed"
                    scaled={true}
                    setTimestamp={() => null}
                    flashNewsAuthor={data.author.pubkey}
                    sealedCauses={data.extra.tags
                      .filter((tag) => tag[0] === "cause")
                      .map((cause) => cause[1])}
                  />
                </div>
              )}
              {data.extra && !data.extra.is_sealed && (
                <div style={{ marginTop: ".5rem" }} className="fit-container">
                  <div
                    className="fit-container sc-s-18 fx-centered fx-col"
                    style={{ rowGap: 0, overflow: "visible" }}
                  >
                    <div className="fit-container  box-pad-h-m box-pad-v-s">
                      <div className="fit-container fx-scattered">
                        <div className="fx-centered fit-container ">
                          <p className="p-bold p-medium green-c">Earn sats!</p>
                        </div>
                      </div>
                    </div>
                    <hr />
                    <div
                      className="fit-container fx-centered box-pad-h-m box-pad-v-s"
                      style={{ rowGap: "0px" }}
                    >
                      <p className="p-medium p-centered">
                        Help us provide more decentralized insights to review
                        this flash news.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ height: "50px" }}></div>
            <div className="fx-centered fx-start-h box-pad-h-m box-pad-v-s ">
              <UserProfilePicNOSTR
                mainAccountUser={false}
                size={24}
                ring={true}
                img={ppBase64}
                // img={`${data.author.picture}?test=123`}
                allowClick={false}
              />
              <div>
                <p className="p-small" style={{ color: "black" }}>
                  By{" "}
                </p>
                <p className="c1-c p-medium">
                  {data.author.display_name ||
                    data.author.name ||
                    getBech32("npub", data.post.author_pubkey).substring(0, 10)}
                </p>
              </div>
            </div>
          </div>
          <div className="fit-container box-pad-h-m box-pad-v-s">
            <p className="p-bold" style={{ color: "white" }}>
              {data.label}
            </p>
            <p style={{ color: "white" }} className="p-medium">
              <Date_
                toConvert={new Date(data.post.created_at * 1000).toISOString()}
                time={true}
              />
            </p>
          </div>
          <div
            className="fx-centered"
            style={{ position: "absolute", right: "8px", bottom: "8px" }}
          >
            <div
              className="fx-centered fx-col box-pad-h-s box-pad-v-s sc-s-18"
              style={{ background: "white", border: "none" }}
            >
              <QRCode value={path} size={100} />
            </div>
          </div>
        </div>
      </div>
    );
  if (kind === 0)
    return (
      <div className="box-pad-h box-pad-v fx-centered fx-col" id="to-print">
        <div
          className="fx-centered fx-col fx-end-h fx-end-h sc-s-18"
          style={{
            width: "380px",
            height: "600px",
            border: "none",
            position: "relative",
          }}
        >
          <div
            className="fx-centered sc-s-18 bg-img cover-bg fit-container"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              zIndex: 0,
              height: "100%",
              border: "none",
              backgroundImage: `url(${thumbnailBase64})`,
              filter: "blur(10px) brightness(70%)",
            }}
          ></div>
          <div
            className="sc-s-18 fx-scattered fx-col"
            style={{
              backgroundColor: "white",
              width: "90%",
              aspectRatio: "1/1",
              position: "relative",
              overflow: "visible",
              zIndex: 1,
              rowGap: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "-49px",
                transform: "translateX(-50%)",
              }}
            >
              <UserProfilePicNOSTR
                mainAccountUser={false}
                size={98}
                ring={true}
                img={ppBase64}
                allowClick={false}
              />
            </div>
            <div
              className="fit-container fx-centered fx-col box-pad-h-m "
              style={{ padding: "4.5rem 1rem 1rem" }}
            >
              <h4 className="p-one-line" style={{ color: "black" }}>
                {data.author.display_name || data.author.name}
              </h4>
              <p className="gray-c p-three-lines p-medium p-centered box-pad-h-m">
                {data.author.about}
              </p>
              {data.author.nip05 && (
                <div className="fx-centered  box-pad-h-m">
                  <p className="orange-c p-medium p-centered">
                    {data.author.nip05}
                  </p>
                  <div className="checkmark-c1"></div>
                </div>
              )}
            </div>
            <hr style={{ margin: 0 }} />
            <div className="fit-container fx-centered  box-pad-h-m box-pad-v-s">
              <div className="fx-centered">
                <p style={{ color: "black" }}>{data.followings}</p>
                <p className="p-medium gray-c">Followings</p>
              </div>
              <div className="fx-centered">
                <p style={{ color: "black" }}>{tempChannel.length}</p>
                <p className="p-medium gray-c">Followers</p>
              </div>
            </div>
            <hr />
            <div
              className="fx-scattered fx-stretch fit-container"
              style={{ columnGap: 0, marginTop: "1rem" }}
            >
              <div style={{ width: "100%" }} className="fx-centered fx-col">
                <QRCode value={path} size={160} />
              </div>
            </div>

            <div
              className="fit-container fx-centered box-pad-h-m "
              style={{ height: "50px" }}
            >
              <div>
                <div
                  className="yakihonne-logo"
                  style={{ width: "70px", filter: "brightness(0)" }}
                ></div>
              </div>
            </div>
          </div>
          <div className="box-marg-s"></div>
        </div>
      </div>
    );
  if ([30023, 34235, 30004].includes(kind))
    return (
      <div
        className="box-pad-h box-pad-v fx-centered fx-col"
        id="to-print"
        style={{ maxHeight: "70dvh" }}
      >
        <div
          className="fx-centered sc-s-18"
          style={{
            width: "380px",
            height: "600px",
            border: "none",
            position: "relative",
          }}
        >
          <div
            className="fx-centered sc-s-18 bg-img cover-bg fit-container"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              zIndex: 0,
              height: "100%",
              border: "none",
              backgroundImage: `url(${thumbnailBase64})`,
              filter: "blur(10px) brightness(70%)",
            }}
          ></div>
          <div
            className="sc-s-18 fx-scattered fx-col"
            style={{
              backgroundColor: "white",
              width: "90%",
              aspectRatio: "1/1",
              position: "relative",
              zIndex: 1,
              rowGap: 0,
            }}
          >
            <div
              className="fit-container fx-scattered box-pad-h-m "
              style={{ height: "40px" }}
            >
              {kind === 30023 && (
                <div className="fx-centered">
                  <div
                    className="posts"
                    style={{ filter: "brightness(0)" }}
                  ></div>
                  <p className="p-medium" style={{ color: "black" }}>
                    Article
                  </p>
                </div>
              )}
              {kind === 30004 && (
                <div className="fx-centered">
                  <div
                    className="curation"
                    style={{ filter: "brightness(0)" }}
                  ></div>
                  <p className="p-medium" style={{ color: "black" }}>
                    Curation
                  </p>
                </div>
              )}
              {kind === 34235 && (
                <div className="fx-centered">
                  <div
                    className="video"
                    style={{ filter: "brightness(0)" }}
                  ></div>
                  <p className="p-medium" style={{ color: "black" }}>
                    Video
                  </p>
                </div>
              )}
              <div className="fx-centered">
                <div className="fx-centered">
                  <p className="p-medium" style={{ color: "black" }}>
                    {data.likes}
                  </p>
                  <div
                    className="like"
                    style={{ filter: "brightness(0)" }}
                  ></div>
                  <p className="p-medium" style={{ color: "black" }}>
                    {data.dislikes}
                  </p>
                  <div
                    className="like"
                    style={{ filter: "brightness(0)", rotate: "-180deg" }}
                  ></div>
                  {kind === 34235 && (
                    <p className="p-medium" style={{ color: "black" }}>
                      {data.views} view(s)
                    </p>
                  )}
                </div>
              </div>
            </div>
            <hr style={{ margin: 0 }} />
            <div
              className="fx-scattered fx-stretch fit-container"
              style={{ height: "260px", columnGap: 0 }}
            >
              <div style={{ width: "100%" }} className="fx-centered fx-col">
                <p
                  style={{ color: "black" }}
                  className="p-medium p-centered box-pad-h-m p-three-lines"
                >
                  {data.post.title}
                </p>

                <p className="p-medium p-centered box-pad-h-m p-two-lines">
                  {data.post.description}
                </p>
                <QRCode value={path} size={100} />
                {data.author.nip05 && (
                  <p className="c1-c p-medium p-centered box-pad-h-m">
                    yakihonne.com/users/{data.author.nip05}
                  </p>
                )}
              </div>
            </div>
            <hr style={{ margin: 0 }} />
            <div
              className="fit-container fx-scattered box-pad-h-m "
              style={{ height: "50px" }}
            >
              <div className="fx-centered">
                <UserProfilePicNOSTR
                  mainAccountUser={false}
                  size={24}
                  ring={true}
                  img={ppBase64}
                  allowClick={false}
                />
                <div>
                  <p className="p-small" style={{ color: "black" }}>
                    By{" "}
                  </p>
                  <p className="c1-c p-medium">
                    {data.author.display_name ||
                      data.author.name ||
                      getBech32("npub", data.post.author_pubkey).substring(
                        0,
                        10
                      )}
                  </p>
                </div>
              </div>
              <div>
                <div
                  className="yakihonne-logo"
                  style={{ width: "70px", filter: "brightness(0)" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};
