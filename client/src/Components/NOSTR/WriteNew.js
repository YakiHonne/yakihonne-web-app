import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoginNOSTR from "./LoginNOSTR";
import { Context } from "../../Context/Context";

export default function WriteNew({ exit }) {
  const { nostrKeys } = useContext(Context);
  const [redirectLinks, setRedirectLinks] = useState(false);
  const [login, setLogin] = useState(false);
  return (
    <>
      {redirectLinks && (
        <RedictingLinks
          exit={() => {
            setRedirectLinks(false);
            exit();
          }}
          internalExit={() => setRedirectLinks(false)}
        />
      )}
      {login && <LoginNOSTR exit={() => setLogin(false)} />}
      <button
        className="btn btn-full btn-orange fx-centered "
        style={{ padding: 0 }}
        onClick={() =>
          !(nostrKeys.ext || nostrKeys.sec)
            ? setLogin(true)
            : setRedirectLinks(true)
        }
      >
        <div className="plus-sign-w"></div>
        <div className="link-label">Post new</div>
      </button>
    </>
  );
}

const RedictingLinks = ({ exit, internalExit }) => {
  const navigateTo = useNavigate();
  return (
    <div
      className="fixed-container fx-centered box-pad-h"
      style={{ zIndex: "1000" }}
      onClick={(e) => {
        e.stopPropagation();
        internalExit();
      }}
    >
      <div
        className="sc-s-18 box-pad-h-m box-pad-v fx-centered fx-col"
        style={{ width: "min(100%,400px)", position: "relative" }}
      >
        <div
          className="close"
          onClick={(e) => {
            e.stopPropagation();
            internalExit();
          }}
        >
          <div></div>
        </div>
        <h4 className="box-marg-s">New publication</h4>
        <div className="fx-centered fx-wrap" onClick={exit}>
          <Link
            to={"/notes"}
            state={{ addFN: true }}
            className={`pointer fit-container fx-centered fx-col box-pad-h-s box-pad-v-s option sc-s-18`}
            style={{
              width: "48%",
              padding: "2rem",
              backgroundColor: "var(--c1-side)",
            }}
          >
            <div
              className="note-plus-24"
              style={{ width: "32px", height: "32px" }}
            ></div>
            <div>Note</div>
          </Link>
          <div
            onClick={() => navigateTo("/write-article")}
            className={`pointer fit-container fx-centered fx-col box-pad-h-s box-pad-v-s option sc-s-18`}
            style={{
              width: "48%",
              padding: "2rem",
              backgroundColor: "var(--c1-side)",
            }}
          >
            <div
              className="posts-plus-24"
              style={{ width: "32px", height: "32px" }}
            ></div>
            <div>Article</div>
          </div>
          <Link
            to={"/my-flash-news"}
            state={{ addFN: true }}
            className={`pointer fit-container fx-centered fx-col box-pad-h-s box-pad-v-s option sc-s-18`}
            style={{
              width: "48%",
              padding: "2rem",
              backgroundColor: "var(--c1-side)",
            }}
          >
            <div
              className="news-plus-24"
              style={{ width: "32px", height: "32px" }}
            ></div>
            <div>Flash news</div>
          </Link>

          <Link
            to={"/my-curations"}
            state={{ addCuration: true }}
            className={`pointer fit-container fx-centered fx-col box-pad-h-s box-pad-v-s option sc-s-18`}
            style={{
              width: "48%",
              padding: "2rem",
              backgroundColor: "var(--c1-side)",
            }}
          >
            <div
              className="curation-plus-24"
              style={{ width: "32px", height: "32px" }}
            ></div>
            <div>Curation</div>
          </Link>

          <Link
            to={"/smart-widget-builder"}
            className={`pointer fit-container fx-centered fx-col box-pad-h-s box-pad-v-s option sc-s-18`}
            style={{
              width: "48%",
              padding: "2rem",
              backgroundColor: "var(--c1-side)",
            }}
          >
            <div
              className="smart-widget-add-24"
              style={{ width: "32px", height: "32px" }}
            ></div>
            <div style={{ width: "max-content" }}>Smart widget</div>
          </Link>
          <Link
            to={"/my-videos"}
            state={{ addVideo: true }}
            className={`pointer fit-container fx-centered fx-col box-pad-h-s box-pad-v-s option sc-s-18`}
            style={{
              width: "48%",
              padding: "2rem",
              backgroundColor: "var(--c1-side)",
            }}
          >
            <div
              className="play-plus-24"
              style={{ width: "32px", height: "32px" }}
            ></div>
            <div>Video</div>
          </Link>
        </div>
      </div>
    </div>
  );
};
