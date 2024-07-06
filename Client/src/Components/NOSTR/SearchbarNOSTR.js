import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBech32, getHex } from "../../Helpers/Encryptions";
import LoadingDots from "../LoadingDots";
import relaysOnPlatform from "../../Content/Relays";
import { getEmptyNostrUser } from "../../Helpers/Encryptions";
import { nip19, SimplePool } from "nostr-tools";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import ShortenKey from "./ShortenKey";
import Date_ from "../Date_";
import axios from "axios";

const pool = new SimplePool();

export default function SearchbarNOSTR() {
  const navigateTo = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [searchAuthorsRes, setSearchAuthorsRes] = useState([]);
  const [searchPostsRes, setSearchPostsRes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    var timer = setTimeout(null);
    if (keyword) {
      setIsLoading(true);
      timer = setTimeout(async () => {
        try {
          let [authors, authorsNB, posts] = await Promise.all([
            getUserFromNOSTR(keyword),
            getUserFromNOSTRBAND(keyword),
            getPostsFromNOSTR(keyword),
          ]);

          // if (authors)
          //   setSearchAuthorsRes([
          //     { ...JSON.parse(authors.content), pubkey: authors.pubkey },
          //   ]);
          // else {
          //   setSearchAuthorsRes([]);
          // }

          if (authors)
            setSearchAuthorsRes([
              ...authorsNB.filter(item => item.pubkey !== authors.pubkey),
              { ...JSON.parse(authors.content), pubkey: authors.pubkey },
            ]);
          else setSearchAuthorsRes([...authorsNB]);
          setSearchPostsRes(posts);
          setIsLoading(false);
        } catch (err) {
          console.log(err);
          setIsLoading(false);
        }
      }, 500);
    } else {
      clearTimeout(timer);
      setSearchAuthorsRes([]);
      setIsLoading(false);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [keyword]);

  const handleOnBlur = (e) => {
    setTimeout(() => {
      setKeyword("");
      setSearchAuthorsRes([]);
    }, 200);
  };

  const getUserFromNOSTRBAND = async (keyword) => {
    try {
      let data = await axios.get(
        `https://api.nostr.band/nostr?method=search&count=10&q=${keyword}`
      );

      return data.data.people;
    } catch (err) {
      console.log(err);
    }
  };
  const getUserFromNOSTR = async (pubkey) => {
    try {
      let hex = pubkey;
      if (pubkey.startsWith("npub")) hex = getHex(pubkey);
      let author = await pool.get(relaysOnPlatform, {
        kinds: [0],
        authors: [hex],
      });

      return author;
    } catch (err) {
      console.log(err);
    }
  };
  const getPostsFromNOSTR = async (tag) => {
    try {
      let posts = await pool.list(relaysOnPlatform, [
        {
          kinds: [30023],
          "#t": [tag],
        },
      ]);

      return posts;
    } catch (err) {
      console.log(err);
    }
  };

  const getPostDetails = (post) => {
    let thumbnail = "";
    let title = "";
    let summary = "";
    let d = "";
    let added_date = new Date(post.created_at * 1000).toDateString();
    for (let tag of post.tags) {
      if (tag[0] === "image") thumbnail = tag[1];
      if (tag[0] === "title") title = tag[1];
      if (tag[0] === "summary") summary = tag[1];
      if (tag[0] === "d") d = tag[1];
    }

    let naddr = nip19.naddrEncode({
      identifier: d,
      pubkey: post.pubkey,
      kind: 30023,
    });
    return {
      id: post.id,
      thumbnail,
      summary,
      author_pubkey: post.pubkey,
      title,
      added_date,
      created_at: post.created_at,
      naddr,
    };
  };
  return (
    <div className="fx-centered" style={{ position: "relative", zIndex: "99" }}>
      <label
        className="fx-centered fx-start-h if search-if"
        htmlFor="search-input"
        style={{ width: "450px", cursor: "default", position: "relative" }}
        onBlur={handleOnBlur}
      >
        <div className="search-24"></div>
        <input
          id="search-input"
          type="search"
          className="if ifs-full"
          placeholder="Search by pubkeys, usernames, tags"
          value={keyword}
          style={{ paddingLeft: ".5rem" }}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {keyword && (
          <div
            className="sc-s-18 fit-container fx-centered fx-start-h fx-wrap box-pad-h-s box-pad-v-s"
            style={{
              position: "absolute",
              left: 0,
              bottom: "-5px",
              transform: "translateY(100%)",
              maxHeight: "30vh",
              overflow: "scroll",
              overflowX: "hidden",
              zIndex: "1000",
              borderColor: "var(--dim-gray)",
            }}
          >
            {isLoading && (
              <div
                className="fx-centered fit-container"
                style={{ height: "50px" }}
              >
                <LoadingDots />
              </div>
            )}
            {searchAuthorsRes.length > 0 && (
              <>
                <h5 className="box-pad-h-s box-pad-v-s">PEOPLE</h5>
                {searchAuthorsRes.map((user) => {
                  return (
                    <div
                      key={user.pubkey}
                      className="fx-centered fx-start-h box-pad-v-s box-pad-h-s fit-container pointer search-bar-post"
                      onClick={() => {
                        navigateTo(
                          `/users/${nip19.nprofileEncode({
                            pubkey: user.pubkey,
                            relays: relaysOnPlatform,
                          })}`
                        );
                      }}
                    >
                      <UserProfilePicNOSTR
                        img={user.picture || ""}
                        size={48}
                        user_id={user.pubkey}
                      />
                      <div className="fx-centered fx-start-h">
                        <div
                          className="fx-centered fx-col fx-start-v box-pad-h-s"
                          style={{ rowGap: 0 }}
                        >
                          <p className="c1-c">{user.name}</p>
                          <ShortenKey id={getBech32("npub", user.pubkey)} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {searchPostsRes.length > 0 && (
              <>
                <h5 className="box-pad-h-s box-pad-v-s">ARTICLES</h5>
                {searchPostsRes.map((post) => {
                  let details = getPostDetails(post);
                  return (
                    <div
                      key={details.id}
                      className="fx-centered fx-start-h box-pad-v-s box-pad-h-s fit-container pointer search-bar-post"
                      onClick={() => {
                        navigateTo(`/article/${details.naddr}`);
                      }}
                    >
                      <div
                        className="bg-img cover-bg"
                        style={{
                          backgroundImage: `url(${details.thumbnail})`,
                          minWidth: "48px",
                          aspectRatio: "1/1",
                          borderRadius: "var(--border-r-50)",
                        }}
                      ></div>
                      <div className="fx-centered fx-start-h">
                        <div
                          className="fx-centered fx-col fx-start-v box-pad-h-s"
                          style={{ rowGap: 0 }}
                        >
                          <p className="c1-c">{details.title}</p>
                          <p className="gray-c p-medium">
                            <Date_ toConvert={details.added_date} />
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {searchAuthorsRes.length === 0 &&
              searchPostsRes.length === 0 &&
              !isLoading && (
                <div className="fit-container fx-col fx-centered box-pad-v">
                  <div className="cancel-24"></div>
                  <h5>No result for this keyword</h5>
                </div>
              )}
          </div>
        )}
      </label>
    </div>
  );
}
