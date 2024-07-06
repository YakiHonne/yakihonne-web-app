import React, { useState, useEffect, useContext } from "react";
import LoadingScreen from "../../Components/LoadingScreen";
import Date_ from "../../Components/Date_";
import ShortenKey from "../../Components/NOSTR/ShortenKey";
import {
  decodeBolt11,
  getBech32,
  getBolt11,
  getEmptyNostrUser,
  getParsedAuthor,
} from "../../Helpers/Encryptions";
import { useNavigate, useParams } from "react-router-dom";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import relaysOnPlatform from "../../Content/Relays";
import { nip19, SimplePool } from "nostr-tools";
import PostPreviewCardNOSTR from "../../Components/NOSTR/PostPreviewCardNOSTR";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import NavbarNOSTR from "../../Components/NOSTR/NavbarNOSTR";
import ZapTip from "../../Components/NOSTR/ZapTip";
import Follow from "../../Components/NOSTR/Follow";
import ShowPeople from "../../Components/NOSTR/ShowPeople";
import TopicElementNOSTR from "../../Components/NOSTR/TopicElementNOSTR";
import Helmet from "react-helmet";
import { Context } from "../../Context/Context";
import axiosInstance from "../../Helpers/HTTP_Client";
import axios from "axios";
import NumberShrink from "../../Components/NumberShrink";
import CheckNIP05 from "../../Components/CheckNIP05";
import ArrowUp from "../../Components/ArrowUp";

const pool = new SimplePool();

const getID = (id) => {
  try {
    let pubkey = nip19.decode(id);
    return pubkey.data.pubkey;
  } catch {
    return "";
  }
};

export default function NostrUser() {
  const { user_id } = useParams();
  const { nostrUser } = useContext(Context);
  const id = getID(user_id);
  const navigateTo = useNavigate();
  const [user, setUser] = useState({});
  const [posts, setPosts] = useState([]);
  const [curations, setCurations] = useState([]);
  const [contentType, setContentType] = useState("p");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowings] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [satsSent, setSatsSent] = useState(0);
  const [satsRec, setSatsRec] = useState([]);
  const [timestamp, setTimestamp] = useState(new Date().getTime());

  useEffect(() => {
    const dataFetching = async () => {
      try {
        setShowPeople(false);
        setCurations([]);
        setPosts([]);
        setSatsRec([]);
        setSatsSent(0);
        let isUser = false
        setIsLoaded(false);
        getSatsStats();
        let sub = pool.sub(
          [...relaysOnPlatform, "wss://nostr.wine"],
          [
            {
              kinds: [0, 30023],
              authors: [id],
            },
            {
              kinds: [30001],
              authors: [id],
              "#c": ["curation"],
            },
            {
              kinds: [9735],
              "#p": [id],
            },
          ]
        );
        getFollowerAndFollowing();
        sub.on("event", (event) => {
          if (event.kind === 9735) {
            let sats = decodeBolt11(getBolt11(event));
            let tempEv = {
              ...event,
              amount: sats,
            };
            setSatsRec((prev) => [...prev, tempEv]);
          }
          if (event.kind === 30023)
            setPosts((_posts) => {
              let newP = [..._posts, getPost(event)];

              let netP = newP.filter((item, index, newP) => {
                if (
                  newP.findIndex((_item) => item.naddr === _item.naddr) ===
                  index
                )
                  return item;
              });
              netP = netP.sort(
                (el_1, el_2) => el_2.created_at - el_1.created_at
              );
              return netP;
            });
          if (event.kind === 30001) {
            let naddr = nip19.naddrEncode({
              identifier: event.tags.find((tag) => tag[0] === "d")[1],
              pubkey: event.pubkey,
              kind: 30001,
            });

            setCurations((_curations) => {
              let newC = [
                ..._curations,
                {
                  ...event,
                  naddr,
                  author: {
                    name: event.pubkey.substring(0, 10),
                    img: "",
                  },
                },
              ];
              let netC = newC.filter((item, index, newC) => {
                if (
                  newC.findIndex((_item) => item.naddr === _item.naddr) ===
                  index
                )
                  return item;
              });
              netC = netC.sort(
                (el_1, el_2) => el_2.created_at - el_1.created_at
              );
              return netC;
            });
          }
          if (event.kind === 0) {
            isUser = true
            setUser(getParsedAuthor(event));
            setIsLoaded(true);
          }
        });
        sub.on("eose", () => {
          sub.unsub();
          if (!isUser) setUser(getEmptyNostrUser(id));
          pool.close(relaysOnPlatform);
          setIsLoaded(true);
        });
      } catch (err) {
        console.log(err);
        navigateTo("/");
      }
    };
    dataFetching();
  }, [id, timestamp]);

  const getFollowerAndFollowing = () => {
    try {
      setFollowers([]);
      setFollowings([]);
      let _followers = [];
      let sub = pool.sub(relaysOnPlatform, [
        {
          kinds: [3],
          "#p": [id],
        },
      ]);
      let sub_2 = pool.sub(relaysOnPlatform, [
        {
          kinds: [3],
          authors: [id],
        },
      ]);
      sub.on("event", (event) => {
        _followers.push(event);
        setFollowers((followersPrev) => {
          let newF = [event, ...followersPrev];
          let netF = newF.filter((item, index, newF) => {
            if (
              newF.findIndex((_item) => item.pubkey === _item.pubkey) === index
            )
              return item;
          });
          return netF;
        });
      });
      sub.on("eose", () => {
        if (_followers.length === 0) setFollowers([]);
        sub.unsub();
      });
      sub_2.on("event", (event) => {
        setFollowings(event?.tags?.filter((item) => item[0] === "p"));
      });
      sub_2.on("eose", () => {
        sub_2.unsub();
      });
    } catch (err) {
      console.log(err);
    }
  };

  const getSatsStats = async () => {
    try {
      let data = await axios.get(
        "https://api.nostr.band/v0/stats/profile/" + id
      );

      setSatsSent(data.data.stats[id].zaps_sent.msats / 1000);
    } catch (err) {
      console.log(err);
    }
  };

  const getPost = (post) => {
    let author_img = "";
    let author_name = getBech32("npub", post.pubkey).substring(0, 10);
    let author_pubkey = post.pubkey;
    let thumbnail = "";
    let title = "";
    let summary = "";
    let contentSensitive = false;
    let postTags = [];

    let d = "";
    let added_date = new Date(post.created_at * 1000).toDateString();
    for (let tag of post.tags) {
      if (tag[0] === "image") thumbnail = tag[1];
      if (tag[0] === "title") title = tag[1];
      if (tag[0] === "summary") summary = tag[1];
      if (tag[0] === "t") postTags.push(tag[1]);
      if (tag[0] === "L" && tag[1] === "content-warning")
        contentSensitive = true;
      if (tag[0] === "d") d = tag[1];
    }

    let naddr = nip19.naddrEncode({
      identifier: d,
      pubkey: author_pubkey,
      kind: 30023,
    });

    return {
      id: post.id,
      thumbnail,
      summary,
      author_img,
      author_pubkey,
      author_name,
      title,
      added_date,
      created_at: post.created_at,
      postTags,
      naddr,
      contentSensitive,
    };
  };

  const switchContentType = () => {
    if (contentType === "p") {
      setContentType("c");
      return;
    }
    setContentType("p");
  };

  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      {showPeople === "following" && (
        <ShowPeople
          exit={() => setShowPeople(false)}
          list={following}
          type={showPeople}
        />
      )}
      {showPeople === "followers" && (
        <ShowPeople
          exit={() => setShowPeople(false)}
          list={followers}
          type={showPeople}
        />
      )}
      <div>
        <Helmet>
          <title>Yakihonne | {user.name || "<Anonymous>"}</title>
          <meta name="description" content={user.about} />
          <meta property="og:description" content={user.about} />
          <meta property="og:image" content={user.img} />
          <meta
            property="og:url"
            content={`https://yakihonne.com/user/${user_id}`}
          />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta
            property="og:title"
            content={`Yakihonne | ${user.name || "<Anonymous>"}`}
          />
          <meta
            property="twitter:title"
            content={`Yakihonne | ${user.name || "<Anonymous>"}`}
          />
          <meta property="twitter:description" content={user.about} />
          <meta property="twitter:image" content={user.img} />
        </Helmet>
        <SidebarNOSTR />
        <main className="main-page-nostr-container">
          <ArrowUp />
          <NavbarNOSTR />
          <div className="fit-container">
            <div
              className="fit-container sc-s profile-cover fx-centered fx-end-h  fx-col bg-img cover-bg"
              style={{
                height: "40vh",
                position: "relative",
                backgroundImage: user.cover ? `url(${user.cover})` : "",
                backgroundColor: "var(--very-dim-gray)",
              }}
            ></div>
            <div
              className="fx-centered fx-start-v"
              style={{ columnGap: "24px" }}
            >
              <div
                style={{
                  border: "6px solid var(--white)",
                  borderRadius: "var(--border-r-50)",
                }}
              >
                <UserProfilePicNOSTR
                  size={100}
                  ring={false}
                  img={user.img}
                  mainAccountUser={false}
                  allowClick={false}
                />
              </div>
              <div className="box-pad-v-s fx-centered fx-start-v fx-col">
                <p className="gray-c p-medium">
                  <Date_ toConvert={user.joining_date} />
                </p>
                <div className="fx-centered">
                  <h4 className="p-caps">{user.name}</h4>
                  <ShortenKey id={user.pubkeyhashed} />
                </div>
                <CheckNIP05 address={user.nip05} pubkey={user.pubkey} />
                {/* {user.nip05 && <p className="c1-c p-medium">{user.nip05}</p>} */}
                {user.about && (
                  <p
                    className="p-centered p-medium p-left"
                    style={{ maxWidth: "400px" }}
                  >
                    {user.about}
                  </p>
                )}
                <div className="fx-centered" style={{ columnGap: "16px" }}>
                  <div className="user"></div>
                  <div
                    className="pointer"
                    onClick={() =>
                      following.length !== 0 ? setShowPeople("following") : null
                    }
                  >
                    <p className="p-medium">
                      {following.length}{" "}
                      <span className="gray-c">Following</span>
                    </p>
                  </div>
                  <div
                    className="pointer"
                    onClick={() =>
                      followers.length !== 0 ? setShowPeople("followers") : null
                    }
                  >
                    <p className="p-medium">
                      {followers.length}{" "}
                      <span className="gray-c">Followers</span>
                    </p>
                  </div>
                </div>
                <div className="fx-centered" style={{ columnGap: "16px" }}>
                  <div className="bolt"></div>
                  <div>
                    <p className="p-medium">
                      <NumberShrink value={satsSent} />{" "}
                      <span className="gray-c">Sent</span>
                    </p>
                  </div>
                  <div>
                    <p className="p-medium">
                      {/* {satsRec.reduce(
                        (total, item) => (total += item.amount),
                        0
                      )}{" "} */}
                      <NumberShrink
                        value={satsRec.reduce(
                          (total, item) => (total += item.amount),
                          0
                        )}
                      />{" "}
                      <span className="gray-c">Received</span>
                    </p>
                  </div>
                </div>
                <div className="fx-centered">
                  <Follow
                    toFollowKey={user.pubkey}
                    toFollowName={user.name}
                    setTimestamp={setTimestamp}
                  />
                  <ZapTip
                    recipientLNURL={user.lud06 || user.lud16}
                    recipientPubkey={user.pubkey}
                    senderPubkey={nostrUser.pubkey}
                    recipientInfo={{ name: user.name, img: user.img }}
                  />
                </div>
              </div>
            </div>
            {(posts.length > 0 || curations.length > 0) && (
              <div
                className="fx-centered  fit-container box-pad-h"
                style={{
                  marginTop: "2rem",
                }}
              >
                <div
                  className="fx-scattered"
                  style={{ width: "min(100%,800px)" }}
                >
                  {contentType === "c" && (
                    <div className="box-pad-v fx-col fx-centered">
                      <h3>{curations.length} Curations</h3>
                    </div>
                  )}
                  {contentType === "p" && (
                    <div className="box-pad-v fx-col fx-centered">
                      <h3>{posts.length} Articles</h3>
                    </div>
                  )}
                  <div
                    className="fx-scattered sc-s pointer profile-switcher"
                    style={{
                      position: "relative",
                      width: "150px",
                      height: "45px",
                      border: "none",
                      backgroundColor: "var(--dim-gray)",
                      columnGap: 0,
                    }}
                    onClick={switchContentType}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        transform:
                          contentType !== "p" ? "translateX(100%)" : "",
                        transition: ".2s ease-in-out",
                        height: "100%",
                        width: "50%",
                        backgroundColor: "var(--c1)",
                        borderRadius: "var(--border-r-32)",
                      }}
                    ></div>
                    <p
                      className={`p-medium fx p-centered pointer ${
                        contentType !== "p" ? "" : "white-c"
                      }`}
                      style={{
                        position: "relative",
                        zIndex: 10,
                        transition: ".2s ease-in-out",
                      }}
                    >
                      Articles
                    </p>
                    <p
                      className={`p-medium fx p-centered pointer ${
                        contentType !== "p" ? "white-c" : ""
                      }`}
                      style={{
                        position: "relative",
                        zIndex: 10,
                        transition: ".2s ease-in-out",
                      }}
                    >
                      Curations
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* <div style={{ height: "20vh" }}></div> */}

            <div className="box-pad-v fit-container fx-centered fx-col">
              {contentType === "c" && (
                <>
                  {curations.length > 0 && (
                    <>
                      <div
                        style={{ width: "min(100%,800px)" }}
                        className="fx-around fx-wrap posts-cards"
                      >
                        {curations.map((item) => {
                          return (
                            <TopicElementNOSTR
                              key={item.id}
                              topic={item}
                              full={true}
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
                  {curations.length === 0 && (
                    <div className="fx-centered fx-col box-pad-v">
                      <h4>Oops! Nothing to show here!</h4>
                      <p className="gray-c">{user.name} has no curations</p>
                      <div
                        className="posts"
                        style={{ width: "48px", height: "48px" }}
                      ></div>
                    </div>
                  )}
                </>
              )}
              {contentType === "p" && (
                <>
                  {posts.length === 0 && (
                    <div className="fx-centered fx-col box-pad-v">
                      <h4>Oops! Nothing to read here!</h4>
                      <p className="gray-c">
                        {user.name} hasn't written any article yet
                      </p>
                      <div
                        className="posts"
                        style={{ width: "48px", height: "48px" }}
                      ></div>
                    </div>
                  )}

                  {posts.length > 0 && (
                    <>
                      <div
                        style={{ width: "min(100%,800px)" }}
                        className="fx-around fx-wrap posts-cards"
                      >
                        {posts.map((post) => {
                          let fullPost = { ...post, author_img: user.img };
                          return (
                            <div
                              key={post.id}
                              // style={{ flex: "1 1 200px" }}
                              className="fx-centered fit-container"
                            >
                              <PostPreviewCardNOSTR
                                key={post.id}
                                item={fullPost}
                              />
                            </div>
                          );
                        })}
                        {/* <Placeholder /> */}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
