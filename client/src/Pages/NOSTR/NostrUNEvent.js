import React, { useContext, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import ArrowUp from "../../Components/ArrowUp";
import axios from "axios";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import UN from "../../Components/NOSTR/UN";
import Date_ from "../../Components/Date_";
import { Link, useNavigate, useParams } from "react-router-dom";
import { encryptEventData, filterRelays } from "../../Helpers/Encryptions";
import { nip19, finalizeEvent } from "nostr-tools";
import LoadingScreen from "../../Components/LoadingScreen";
import { Context } from "../../Context/Context";
import relaysOnPlatform from "../../Content/Relays";
import LoadingDots from "../../Components/LoadingDots";
import PagePlaceholder from "../../Components/PagePlaceholder";
import { getNoteTree } from "../../Helpers/Helpers";
import LoginNOSTR from "../../Components/NOSTR/LoginNOSTR";
import Footer from "../../Components/Footer";
import ShareLink from "../../Components/ShareLink";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";

const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;
const MAX_CHAR = 500;

export default function NostrUNEvent() {
  const {
    nostrUserAbout,
    nostrUser,
    nostrKeys,
    isPublishing,
    setToPublish,
    setToast,
  } = useContext(Context);
  const { nevent } = useParams();
  const navigateTo = useNavigate();
  const [flashNews, setFlashNews] = useState({});
  const [source, setSource] = useState();
  const [uncensoredNotes, setUncensoredNotes] = useState([]);
  const [note, setNote] = useState("");
  const [sealedNote, setSealedNote] = useState(false);
  const [noteType, setNoteType] = useState(true);
  const [content, setContent] = useState("");
  const [balance, setBalance] = useState(0);
  const [contentType, setContentType] = useState("new");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now());
  const [toLogin, setToLogin] = useState(false);
  const isContributed = useMemo(() => {
    let isThereInNH = flashNews
      ? flashNews?.sealed_not_helpful_notes?.find(
          (un) => JSON.parse(un.content).pubkey === nostrKeys?.pub
        )
      : false;
    let isThereInUN = uncensoredNotes.find(
      (un) => un.pubkey === nostrKeys?.pub
    );
    return isThereInUN || isThereInNH ? true : false;
  }, [uncensoredNotes, nostrKeys, flashNews]);
  const currentWordsCount = useMemo(() => {
    let value = note.replace(/[^\S\r\n]+/g, " ");
    let wordsArray = value
      .trim()
      .split(" ")
      .filter(
        (word) => !/(https?:\/\/[^ ]*\.(?:gif|png|jpg|jpeg))/i.test(word)
      );
    let countedWords = wordsArray.join(" ").length;
    return countedWords || 0;
  }, [note]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        let parsedData = nip19.decode(nevent);

        let [FN, BALANCE] = await Promise.all([
          axios.get(API_BASE_URL + "/api/v1/flashnews/" + parsedData.data.id),
          axios.get(API_BASE_URL + "/api/v1/balance"),
        ]);

        const content = await getNoteTree(FN.data.content);
        setBalance(BALANCE.data.balance);
        setFlashNews(FN.data);
        setUncensoredNotes(
          FN.data.uncensored_notes.filter((note) => {
            let sn_id = FN.data.sealed_note
              ? JSON.parse(FN.data.sealed_note.content).id
              : false;
            let not_hn = FN.data.sealed_not_helpful_notes.find(
              (un) => note.id === JSON.parse(un.content).id
            );
            if (note.id !== sn_id && !not_hn) return note;
          })
        );
        setSealedNote(FN.data.sealed_note);
        setContent(content);
        setIsLoaded(true);
      } catch (err) {
        setIsLoaded(true);
        console.log(err);
      }
    };
    fetchData();
  }, [timestamp]);

  useEffect(() => {
    if (!isLoaded) return;
    let textArea = document.querySelector(".txt-area");
    if (!textArea) return;

    textArea.style.height = `${textArea.scrollHeight}px`;
  }, [note]);

  const handleNoteOnChange = (e) => {
    let value = e.target.value.replace(/[^\S\r\n]+/g, " ");
    setNote(value);
  };
  const handlePublishing = async () => {
    try {
      let parsedData = nip19.decode(nevent);
      if (currentWordsCount === 0) {
        setToast({
          type: 3,
          desc: "You must write something!",
        });
        return;
      }
      if (MAX_CHAR - currentWordsCount < 0) {
        setToast({
          type: 3,
          desc: "Your note has exceeded the maximum character number.",
        });
        return;
      }
      if (isPublishing) {
        setToast({
          type: 3,
          desc: "An event publishing is in process!",
        });
        return;
      }
      setIsLoading(true);
      let relaysToPublish = filterRelays(
        nostrUser?.relays || [],
        relaysOnPlatform
      );
      let tags = [];
      let created_at = Math.floor(Date.now() / 1000);

      tags.push([
        "client",
        "Yakihonne",
        "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
      ]);
      tags.push(["e", parsedData.data.id]);
      tags.push(["l", "UNCENSORED NOTE"]);
      tags.push(["yaki_flash_news", encryptEventData(`${created_at}`)]);
      tags.push(["type", noteType ? "-" : "+"]);
      if (source) tags.push(["source", source]);

      let event = {
        kind: 1,
        content: note,
        created_at,
        tags,
      };
      if (nostrKeys.ext) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          console.log(err);
          setIsLoading(false);
          return false;
        }
      } else {
        event = finalizeEvent(event, nostrKeys.sec);
      }

      setToPublish({
        eventInitEx: event,
        allRelays: relaysToPublish,
      });

      setTimeout(() => {
        setIsLoading(false);
        setNote("");
        setSource("");
        setTimestamp(Date.now());
      }, 3000);
    } catch (err) {
      setIsLoading(true);
      console.log(err);
      setToast({
        type: 2,
        desc: "An error occurred while publishing this note",
      });
    }
  };

  if (!isLoaded) return <LoadingScreen />;
  return (
    <div>
      <Helmet>
        <title>
          Yakihonne | {flashNews.author.display_name || flashNews.author.name}
        </title>
        <meta name="description" content={flashNews.content} />
        <meta property="og:description" content={flashNews.content} />
        <meta
          property="og:image"
          content={API_BASE_URL + "/event/" + flashNews.nEvent + ".png"}
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="700" />
        <meta
          property="og:url"
          content={`https://yakihonne.com/flash-news/${flashNews.nEvent}`}
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta
          property="og:title"
          content={flashNews.author.display_name || flashNews.author.name}
        />
        <meta
          property="twitter:title"
          content={flashNews.author.display_name || flashNews.author.name}
        />
        <meta property="twitter:description" content={flashNews.content} />
        <meta
          property="twitter:image"
          content={API_BASE_URL + "/event/" + flashNews.nEvent + ".png"}
        />
      </Helmet>
      <div className="fit-container fx-centered">
        <div className="main-container">
          <SidebarNOSTR />
          <main className="main-page-nostr-container">
            <ArrowUp />
            {toLogin && <LoginNOSTR exit={() => setToLogin(false)} />}{" "}
            <div className="fit-container fx-centered fx-start-v fx-start-h">
              <div style={{ flex: 1.5 }} className="box-pad-h-s">
                <Link className="fit-container" to="/uncensored-notes">
                  <div
                    className="fit-container fx-centered fx-start-h box-pad-v-m sticky"
                    style={{
                      columnGap: "16px",
                    }}
                  >
                    <div className="round-icon">
                      <div className="arrow" style={{ rotate: "90deg" }}></div>
                    </div>
                    <h4>Back to news</h4>
                  </div>
                </Link>
                <div className="fit-container fx-centered fx-col">
                  <div
                    className="fit-container fx-centered fx-start-h fx-start-v box-marg-s box-pad-h-m box-pad-v-m"
                    style={{ columnGap: "10px" }}
                  >
                    <div>
                      <UserProfilePicNOSTR
                        img={flashNews.author.picture}
                        size={38}
                        user_id={flashNews.author.pubkey}
                        ring={false}
                      />
                    </div>
                    <div
                      className="fx-centered fx-col fx-start-h"
                      style={{ width: "calc(100% - 40px)" }}
                    >
                      <div className="fit-container fx-scattered">
                        <div className="fx-centered fx-start-h fit-container">
                          <p className="gray-c">By {flashNews.author.name}</p>
                          <p className="gray-c">&#x2022;</p>
                          <p className="gray-c">
                            <Date_
                              toConvert={new Date(
                                flashNews.created_at * 1000
                              ).toISOString()}
                              time={true}
                            />
                          </p>
                        </div>
                        <ShareLink
                          path={`/uncensored-notes/${flashNews.nEvent}`}
                          title={
                            flashNews.author.display_name ||
                            flashNews.author.name
                          }
                          description={flashNews.content}
                          kind={1}
                          shareImgData={{
                            post: flashNews,
                            author: flashNews.author,
                            extra: {
                              ...flashNews.sealed_note,
                              is_sealed: flashNews.sealed_note ? true : false,
                            },
                            label: "Uncensored note",
                          }}
                        />
                      </div>

                      <div className="fit-container">
                        <div className="fit-container">{content}</div>
                      </div>
                      {nostrKeys &&
                        nostrKeys.pub !== flashNews.author.pubkey &&
                        !isContributed &&
                        !sealedNote && (
                          <div
                            className="fit-container fx-centered fx-start-v fx-start-h sc-s-18"
                            style={{ columnGap: "16px", rowGap: 0 }}
                          >
                            <div className="fit-container">
                              <div className="fit-container fx-scattered box-pad-h-s box-pad-v-s">
                                <div
                                  className="fx-centered fx-start-h"
                                  style={{ columnGap: "16px" }}
                                >
                                  <UserProfilePicNOSTR
                                    mainAccountUser={true}
                                    ring={false}
                                    size={38}
                                  />
                                  <div>
                                    <p className="p-medium gray-c">
                                      See anything you want to improve?
                                    </p>
                                    <p className="p-bold">Write a note</p>
                                  </div>
                                </div>
                                <button
                                  className="btn btn-normal"
                                  onClick={handlePublishing}
                                  disabled={isLoading}
                                >
                                  {isLoading ? <LoadingDots /> : "Post"}
                                </button>
                              </div>
                              <hr />
                              <div className="box-pad-h-m box-pad-v-m">
                                <textarea
                                  className="txt-area fit-container no-scrollbar if-no-border"
                                  style={{
                                    padding: "0",
                                    borderRadius: 0,
                                    color:
                                      MAX_CHAR - currentWordsCount < 0
                                        ? "var(--red-main)"
                                        : "",
                                  }}
                                  placeholder={`What do you think about this ${
                                    nostrUserAbout.name || ""
                                  }?`}
                                  value={note}
                                  onChange={handleNoteOnChange}
                                />
                                <div className="fit-container">
                                  {MAX_CHAR - currentWordsCount <= 0 && (
                                    <p className="red-c p-medium">
                                      {MAX_CHAR - currentWordsCount} characters
                                      left
                                    </p>
                                  )}
                                  {MAX_CHAR - currentWordsCount > 0 && (
                                    <p className="gray-c p-medium">
                                      {MAX_CHAR - currentWordsCount} characters
                                      left
                                    </p>
                                  )}
                                </div>
                              </div>
                              <hr />
                              <div className="fit-container">
                                <input
                                  type="text"
                                  className="if ifs-full if-no-border"
                                  placeholder="Source (Recommended)"
                                  value={source}
                                  onChange={(e) => setSource(e.target.value)}
                                />
                              </div>
                              <hr />
                              <label
                                htmlFor="check-note-type"
                                className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-m"
                              >
                                <input
                                  type="checkbox"
                                  id="check-note-type"
                                  checked={noteType}
                                  onChange={() => setNoteType(!noteType)}
                                />
                                <p className={noteType ? "" : "gray-c"}>
                                  I find this misleading
                                </p>
                              </label>
                            </div>
                          </div>
                        )}
                      {!nostrKeys && (
                        <div className="fit-container fx-centered fx-col box-pad-h box-pad-v sc-s-18">
                          <h4>Spread your voice!</h4>
                          <p
                            className="gray-c p-centered"
                            style={{ maxWidth: "400px" }}
                          >
                            Login to your account now and be a contributor for a
                            better community
                          </p>
                          <button
                            className="btn btn-normal"
                            onClick={() => setToLogin(true)}
                          >
                            Login
                          </button>
                        </div>
                      )}
                      {sealedNote && (
                        <UN
                          data={JSON.parse(sealedNote.content)}
                          flashNewsAuthor={flashNews.author.pubkey}
                          sealedCauses={sealedNote.tags
                            .filter((tag) => tag[0] === "cause")
                            .map((tag) => tag[1])}
                          setTimestamp={null}
                          state="sealed"
                        />
                      )}
                      {isContributed && (
                        <div
                          className="fx-centered fx-start-h fit-container option if pointer"
                          style={{
                            border: "none",
                            backgroundColor: "var(--green-side)",
                          }}
                        >
                          <div className="checkmark"></div>
                          <p className="green-c">
                            You have already contributed!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {(uncensoredNotes.length > 0 ||
                  flashNews.sealed_not_helpful_notes.length > 0) && (
                  <>
                    <h4 className="box-marg-s">Notes from the community</h4>
                    <div className="fx-centered fx-col fit-container">
                      {uncensoredNotes.map((note) => {
                        return (
                          <UN
                            data={note}
                            key={note.id}
                            flashNewsAuthor={flashNews.author.pubkey}
                            setTimestamp={setTimestamp}
                            action={sealedNote ? false : true}
                          />
                        );
                      })}
                      {flashNews.sealed_not_helpful_notes.map((_note) => {
                        let note = JSON.parse(_note.content);
                        return (
                          <UN
                            data={note}
                            key={note.id}
                            flashNewsAuthor={flashNews.author.pubkey}
                            setTimestamp={() => null}
                            sealedCauses={_note.tags
                              .filter((tag) => tag[0] === "cause")
                              .map((tag) => tag[1])}
                            state="nh"
                            action={false}
                          />
                        );
                      })}
                    </div>
                  </>
                )}
                {!isLoading &&
                  uncensoredNotes.length === 0 &&
                  flashNews.sealed_not_helpful_notes.length === 0 && (
                    <PagePlaceholder page={"nostr-un"} />
                  )}
              </div>
              <div
                style={{
                  flex: "1",
                  // width: "400px",
                  position: "sticky",
                  top: 0,
                }}
                className="box-pad-h-m  fx-centered fx-col un-banners"
              >
                <div className="sticky fit-container">
                  <SearchbarNOSTR />
                </div>
                <div
                  className="sc-s-18 fit-container box-pad-h box-pad-v fx-centered fx-start-h"
                  style={{
                    position: "relative",
                    backgroundColor: "var(--c3)",
                    border: "none",
                  }}
                >
                  <div
                    className="cup-24"
                    style={{
                      minHeight: "120px",
                      minWidth: "120px",
                      position: "absolute",
                      right: "-20px",
                      bottom: "-10px",
                      filter: "brightness(0) invert()",
                      opacity: ".2",
                      rotate: "20deg",
                    }}
                  ></div>
                  <div className="fx-centered fx-col fx-start-v">
                    <p className="p-medium" style={{ color: "white" }}>
                      Community wallet
                    </p>
                    <div className="fx-centered fx-end-v">
                      <h2 className="orange-c">{balance || "N/A"}</h2>
                      <p style={{ color: "white" }}>Sats.</p>
                    </div>
                  </div>
                </div>
                <div className="sc-s-18 fit-container box-pad-h-m box-pad-v-m fx-centered fx-col fx-start-v">
                  <div
                    className="note-24"
                    style={{ minHeight: "48px", minWidth: "48px" }}
                  >
                    {" "}
                  </div>
                  <h4>Read about Uncensored Notes</h4>
                  <p className="gray-c">
                    We've made an article for you to help you understand our
                    purpose
                  </p>
                  <Link
                    target="_blank"
                    to={
                      "/article/naddr1qq252nj4w4kkvan8dpuxx6f5x3n9xstk23tkyq3qyzvxlwp7wawed5vgefwfmugvumtp8c8t0etk3g8sky4n0ndvyxesxpqqqp65wpcr66x"
                    }
                  >
                    <button className="btn btn-normal">Read article</button>
                  </Link>
                </div>
                <div className="sc-s-18 fit-container box-pad-h-m box-pad-v-m fx-centered fx-col fx-start-v box-marg-s">
                  <h4>Uncensored notes values</h4>
                  <ul>
                    <li className="gray-c">
                      Contribute to build understanding
                    </li>
                    <li className="gray-c">Act in good faith</li>
                    <li className="gray-c">
                      Be helpful, even to those who disagree
                    </li>
                  </ul>
                  <Link
                    target="_blank"
                    to={
                      "/article/naddr1qq2kw52htue8wez8wd9nj36pwucyx33hwsmrgq3qyzvxlwp7wawed5vgefwfmugvumtp8c8t0etk3g8sky4n0ndvyxesxpqqqp65w6998qf"
                    }
                  >
                    <button className="btn btn-normal">Read article</button>
                  </Link>
                </div>
                <Footer />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
