import React, { useContext, useEffect, useMemo, useState } from "react";
import Date_ from "../Date_";
import { useNavigate } from "react-router-dom";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { Context } from "../../Context/Context";
import { getParsed3000xContent } from "../../Helpers/Encryptions";
import { getAuthPubkeyFromNip05 } from "../../Helpers/Helpers";

export default function TopicElementNOSTR({ topic, full = false }) {
  
  const navigateTo = useNavigate();
  const [showDesc, setShowDesc] = useState(false);
  const { getNostrAuthor, nostrAuthors } = useContext(Context);
  const [authorData, setAuthorData] = useState({
    author_img: "",
    author_pubkey: topic.pubkey,
    author_name: topic.author.name,
  });
  const [curURL, setCurURL] = useState(`${topic.naddr}`);
  const content = useMemo(() => {
    return getParsed3000xContent(topic.tags);
  }, [topic]);
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
    const fetchData = async () => {
      try {
        let auth = getNostrAuthor(topic.pubkey);

        if (auth) {
          setAuthorData({
            author_img: auth.picture,
            author_name: auth.name,
            author_pubkey: auth.pubkey,
          });
          if (auth.nip05) {
            let authPubkey = await getAuthPubkeyFromNip05(auth.nip05);
            if (authPubkey) setCurURL(`${auth.nip05}/${topic.identifier}`);
          }
        }
        return;
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
  }, [nostrAuthors]);

  if (content?.items?.length === 0) return;
  return (
    <div
      className={`bg-img cover-bg sc-s-18 fx-shrink pointer carousel-item  fx-centered fx-start-h box-pad-h-m box-pad-v-m ${
        full ? "posts-card" : ""
      }`}
      style={{
        backgroundImage: `url(${content.image})`,
        border: "none",
        height: "150px",
      }}
      onClick={(e) => {
        e.stopPropagation();
        !showDesc && navigateTo(`/curations/${curURL}`);
      }}
      id={`carousel-item-${topic.id}`}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          navigateTo(`/curations/${curURL}`);
        }}
        style={{ height: "100%" }}
        className="fx-scattered fx-col fx-start-v"
      >
        <div className="fx-centered fx-start-v fx-col fit-container">
          <div className="fit-container fx-centered fx-start-h">
            <div
              className="fx-centered fx-start-h"
              style={{ columnGap: "10px" }}
            >
              <AuthorPreview author={authorData} />
            </div>
            <div>
              <p className="gray-c p-small">&#9679;</p>
            </div>

            <p className=" gray-c">
              <Date_ toConvert={topic.modified_date} />
            </p>
            <div>
              <p className="gray-c p-small">&#9679;</p>
            </div>
            <p className=" orange-c">
              {getDRef()} <span>arts.</span>
            </p>
          </div>
        </div>
        <p className="p-big p-two-lines" style={{ color: "white" }}>
          {content.title}
        </p>
      </div>
    </div>
  );
}

const AuthorPreview = ({ author }) => {
  return (
    <div className="fx-centered">
      <UserProfilePicNOSTR
        size={18}
        img={author.author_img}
        mainAccountUser={false}
        allowClick={true}
        user_id={author.author_pubkey}
        ring={false}
      />
      <p style={{ color: "white" }}>{author.author_name}</p>
    </div>
  );
};
