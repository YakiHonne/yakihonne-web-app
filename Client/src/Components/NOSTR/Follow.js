import React, { useContext, useEffect, useMemo, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { publishPost } from "../../Helpers/NostrPublisher";
import LoadingDots from "../LoadingDots";
import LoginNOSTR from "./LoginNOSTR";

const FOLLOWING = "following";
const FOLLOW = "follow";

const checkFollowing = (list, toFollowKey) => {
  if (!list) return false;
  return list.find((people) => people[1] === toFollowKey) ? true : false;
};

export default function Follow({ toFollowKey, toFollowName, setTimestamp }) {
  const { nostrUser, setNostrUser, nostrKeys } = useContext(Context);
  const [login, setLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    setTags(nostrUser.following);
  }, [nostrUser]);

  const isFollowing = useMemo(() => {
    return checkFollowing(tags, toFollowKey);
  }, [tags]);

  const followUnfollow = async () => {
    try {
      setIsLoading(true);
      let tempTags = Array.from(nostrUser?.following || []);
      if (isFollowing) {
        let index = tempTags.findIndex((item) => item[1] === toFollowKey);
        tempTags.splice(index, 1);
      } else {
        tempTags.push([
          "p",
          toFollowKey,
          relaysOnPlatform[0],
          toFollowName || "yakihonne-user",
        ]);
      }
      const publish = await publishPost(
        nostrKeys,
        3,
        "",
        tempTags,
        relaysOnPlatform
      );

      if (!publish) {
        setTags(nostrUser.following);
        setIsLoading(false);
        return;
      }
      setTags(tempTags);
      setIsLoading(false);
      setTimestamp(new Date().getTime());
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };

  if (!nostrUser || !nostrKeys)
    return (
      <>
        {login && <LoginNOSTR exit={() => setLogin(false)} />}
        <button
          className="btn btn-gst"
          disabled={isLoading}
          onClick={() => setLogin(true)}
        >
          {FOLLOW}
        </button>
      </>
    );
  if (!toFollowKey || toFollowKey === nostrKeys.pub)
    return (
      <button className="btn btn-disabled" disabled={isLoading}>
        {FOLLOW}
      </button>
    );
  return (
    <button
      className={`btn ${isFollowing ? "btn-normal" : "btn-gst"}`}
      disabled={isLoading}
      onClick={followUnfollow}
    >
      {isLoading ? <LoadingDots /> : isFollowing ? FOLLOWING : FOLLOW}
    </button>
  );
}
