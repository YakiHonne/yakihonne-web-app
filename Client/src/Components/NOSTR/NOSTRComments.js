import React, { useContext, useState, useEffect, useMemo } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { deletePost, publishPost } from "../../Helpers/NostrPublisher";
import Date_ from "../Date_";
import LoadingDots from "../LoadingDots";
import LoginNOSTR from "./LoginNOSTR";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";

const filterRootComments = (all) => {
  let temp = [];
  for (let comment of all) {
    if (!comment.tags.find((item) => item[0] === "e")) {
      temp.push({ ...comment, count: countReplies(comment.id, all) });
    }
  }
  return temp;
};

const countReplies = (id, all) => {
  let count = [];

  for (let comment of all) {
    let ev = comment.tags.find(
      (item) => item[3] === "reply" && item[0] === "e" && item[1] === id
    );
    if (ev) {
      count.push(comment, ...countReplies(comment.id, all));
    }
  }
  return count;
};

const getOnReply = (comments, comment_id) => {
  let tempCom = comments.find((item) => item.id === comment_id);
  return tempCom;
};

export default function NOSTRComments({ comments = [], aTag = "", refresh }) {
  const { nostrUser, nostrKeys } = useContext(Context);
  const [login, setLogin] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [selectedComment, setSelectedComment] = useState(false);
  const netComments = useMemo(() => {
    return filterRootComments(comments);
  }, [comments]);

  useEffect(() => {
    if(selectedComment) {
      let sC = netComments.find(item => item.id === selectedComment.id)
      setSelectedComment(sC)
    }
  }, netComments)

  const postNewComment = async () => {
    try {
      if (!nostrKeys || !newComment) {
        return;
      }
      setIsLoading(true);
      let temPublishingState = await publishPost(
        nostrKeys,
        1,
        newComment,
        [["a", aTag, "", "root"]],
        relaysOnPlatform
      );
      setIsLoading(false);
      setNewComment("");
    } catch (err) {
      console.log(err);
    }
  };

  // console.log(comments);

  return (
    <>
      {showReplies && (
        <CommentsReplies
          comment={selectedComment}
          all={selectedComment.count}
          exit={() => {
            setShowReplies(false);
            setSelectedComment(false);
          }}
          aTag={aTag}
        />
      )}
      {login && !nostrUser && <LoginNOSTR exit={() => setLogin(false)} />}
      <div className="fit-container">
        {nostrUser && (
          <div className="fit-container fx-end-v fx-centered fx-col">
            <textarea
              className="txt-area ifs-full"
              placeholder="Comment on..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              className="btn btn-normal fx-centered"
              onClick={postNewComment}
            >
              {isLoading && <LoadingDots />}
              {!isLoading && (
                <>
                  {" "}
                  Comment as{" "}
                  <UserProfilePicNOSTR img={nostrUser.img} size={28} />{" "}
                  {nostrUser.name}{" "}
                </>
              )}
            </button>
          </div>
        )}
        {netComments.length == 0 && (
          <div
            className="fit-container fx-centered fx-col"
            style={{ height: "20vh" }}
          >
            <h4>No comments</h4>
            <p className="p-centered gray-c">
              Nobody commented on this article
            </p>
            <div className="comment-24"></div>
          </div>
        )}
        {!nostrUser && (
          <div className="fit-container fx-centered">
            <button
              className="btn btn-normal fx-centered"
              onClick={() => setLogin(true)}
            >
              Login to comment
            </button>
          </div>
        )}
        {netComments.length > 0 && (
          <div className="fit-container fx-centered fx-start-h box-pad-v-m">
            <h4>{netComments.length} Comment(s)</h4>
          </div>
        )}
        <div
          className="fit-container fx-col fx-centered  fx-start-h"
          style={{ maxHeight: "60vh", overflow: "scroll", overflowX: "hidden" }}
        >
          {netComments.map((comment, index) => {
            return (
              <Comment
                comment={comment}
                key={comment.id}
                refresh={refresh}
                index={index}
                onClick={() => {
                  setShowReplies(true);
                  setSelectedComment(comment);
                }}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

const Comment = ({ comment, refresh, index, onClick, action = true }) => {
  const { nostrKeys } = useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationPrompt, setConfirmationPrompt] = useState(false);

  const handleCommentDeletion = async () => {
    try {
      setIsLoading(true);
      let data = await deletePost(nostrKeys, comment.id, relaysOnPlatform);
      refresh(index);
      setIsLoading(false);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {confirmationPrompt && (
        <ToDeleteComment
          comment={comment}
          exit={(e) => {
            e.stopPropagation();
            setConfirmationPrompt(false);
          }}
          handleCommentDeletion={(e) => {
            e.stopPropagation();
            setConfirmationPrompt(false);
            handleCommentDeletion();
          }}
        />
      )}

      <div
        className={`fit-container box-pad-h box-pad-v sc-s-18 fx-centered fx-col fx-shrink  ${
          isLoading ? "flash" : ""
        }`}
        style={{
          backgroundColor: "var(--very-dim-gray)",
          border: "none",
          pointerEvents: isLoading ? "none" : "auto",
        }}
      >
        <div className="fit-container fx-scattered fx-start-v">
          <div className="fx-centered" style={{ columnGap: "16px" }}>
            <AuthorPreview
              author={{
                author_img: "",
                author_name: comment.pubkey.substring(0, 20),
                author_pubkey: comment.pubkey,
                on: new Date(comment.created_at * 1000).toISOString(),
              }}
            />
          </div>
          {comment.pubkey === nostrKeys.pub && action && (
            <div
              className="fx-centered pointer"
              style={{ columnGap: "3px" }}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmationPrompt(true);
              }}
            >
              <div className="trash-24"></div>
            </div>
          )}
        </div>
        <div
          className="fx-centered fx-start-h fit-container"
          style={{ columnGap: "16px" }}
        >
          <div style={{ minWidth: "24px" }}></div>
          <p>{comment.content}</p>
        </div>

        {action && (
          <div
            className="fx-centered fx-start-h fit-container pointer"
            style={{ columnGap: "16px" }}
            onClick={onClick}
          >
            <div style={{ minWidth: "24px" }}></div>
            <div className="fx-centered">
              <div className="comment-icon"></div>
              <p className="p-medium ">
                {comment.count.length} <span className="gray-c">Reply(ies)</span>{" "}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
const Reply = ({ comment, refresh, index, all, setSelectReplyTo }) => {
  const { nostrKeys } = useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationPrompt, setConfirmationPrompt] = useState(false);
  const [seeReply, setSeeReply] = useState(false);
  const repliedOn = useMemo(() => {
    return getOnReply(
      all,
      comment.tags.find((item) => item[0] === "e" && item.length === 4)[1] || ""
    );
  }, [all]);

  const handleCommentDeletion = async () => {
    try {
      setIsLoading(true);
      let data = await deletePost(nostrKeys, comment.id, relaysOnPlatform);
      refresh(index);
      setIsLoading(false);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {confirmationPrompt && (
        <ToDeleteComment
          comment={comment}
          exit={(e) => setConfirmationPrompt(false)}
          handleCommentDeletion={() => {
            setConfirmationPrompt(false);
            handleCommentDeletion();
          }}
        />
      )}

      <div
        className={`fit-container box-pad-h box-pad-v sc-s-18 fx-centered fx-col fx-shrink  ${
          isLoading ? "flash" : ""
        }`}
        style={{
          backgroundColor: "var(--dim-gray)",
          border: "none",
          pointerEvents: isLoading ? "none" : "auto",
        }}
      >
        <div className="fit-container fx-scattered fx-start-v">
          <div className="fx-centered" style={{ columnGap: "16px" }}>
            <AuthorPreview
              author={{
                author_img: "",
                author_name: comment.pubkey.substring(0, 20),
                author_pubkey: comment.pubkey,
                on: new Date(comment.created_at * 1000).toISOString(),
              }}
            />
          </div>
          {comment.pubkey === nostrKeys.pub && (
            <div
              className="fx-centered pointer"
              style={{ columnGap: "3px" }}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmationPrompt(true);
              }}
            >
              <div className="trash-24"></div>
            </div>
          )}
        </div>
        {repliedOn && (
          <div
            className="fx-start-h fx-centerd fit-container"
            // style={{ width: seeReply ? "100%" : "max-content" }}
          >
            <div
              className="fx-centered fit-container fx-start-h pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSeeReply(!seeReply);
              }}
            >
              <p className="c1-c p-medium">
                Replied to : {repliedOn.content.substring(0, 10)}... (See more)
              </p>
              <div
                className="arrow"
                style={{ transform: seeReply ? "rotate(180deg)" : "" }}
              ></div>
            </div>
            <div
              className="fit-container box-pad-v-s"
              style={{ display: seeReply ? "flex" : "none" }}
            >
              {" "}
              <Comment
                comment={{ ...repliedOn, count: [] }}
                action={false}
              />{" "}
            </div>
            <hr />
          </div>
        )}
        <div
          className="fx-centered fx-start-h fit-container"
          style={{ columnGap: "16px" }}
        >
          {/* <div style={{ minWidth: "24px" }}></div> */}
          <p>{comment.content}</p>
        </div>

        {/* {repliedOn && (
          <div
            className="fx-start-h fx-centerd fit-container"
            // style={{ width: seeReply ? "100%" : "max-content" }}
          >
            <div
              className="fx-centered fit-container fx-start-h box-pad-h pointer"
              onClick={() => setSeeReply(!seeReply)}
            >
              <p className="c1-c p-medium">Replied to : {repliedOn.content.substring(0,10)}... (See more)</p>
              <div
                className="arrow"
                style={{ transform: seeReply ? "rotate(180deg)" : "" }}
              ></div>
            </div>

            <div
              className="fit-container"
              style={{ display: seeReply ? "flex" : "none" }}
            >
              {" "}
              <Comment comment={{ ...repliedOn, count: [] }} />{" "}
            </div>
          </div>
        )} */}
        <div
          className="fx-centered fx-start-h fit-container"
          style={{ columnGap: "16px" }}
          onClick={() =>
            setSelectReplyTo({
              id: comment.id,
              content: comment.content,
            })
          }
        >
          <p className="gray-c p-medium pointer btn-text">Reply</p>
        </div>
      </div>
    </>
  );
};

const AuthorPreview = ({ author }) => {
  const [authorData, setAuthorData] = useState("");
  const { relayConnect } = useContext(Context);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await relayConnect.connect();
        let sub = relayConnect.sub([
          { kinds: [0], authors: [author.author_pubkey] },
        ]);

        sub.on("event", (event) => {
          let author_img = event ? JSON.parse(event.content).picture : "";
          let author_name = event
            ? JSON.parse(event.content).name?.substring(0, 20) ||
              author.author_pubkey?.substring(0, 20)
            : author.author_pubkey?.substring(0, 20);
          let author_pubkey = author.author_pubkey;
          setAuthorData((auth) => {
            return { author_img, author_name, author_pubkey };
          });
          return;
        });
        sub.on("eose", () => {
          sub.unsub();
        });
      } catch (err) {
        console.log(err);
      }
    };
    if (relayConnect) fetchData();
  }, []);

  if (!authorData)
    return (
      <>
        <UserProfilePicNOSTR
          size={24}
          ring={false}
          img={author.author_img}
          mainAccountUser={false}
          user_id={author.author_pubkey}
        />
        <div>
          <p className="gray-c p-medium">
            On <Date_ toConvert={author.on} />
          </p>
          <p className="p-one-line p-medium">
            By: <span className="c1-c">{author.author_name}</span>
          </p>
        </div>
      </>
    );
  return (
    <>
      <UserProfilePicNOSTR
        size={24}
        ring={false}
        img={authorData.author_img}
        mainAccountUser={false}
        user_id={authorData.author_pubkey}
      />
      <div>
        <p className="gray-c p-medium">
          On <Date_ toConvert={author.on} />
        </p>
        <p className="p-one-line p-medium">
          By: <span className="c1-c">{authorData.author_name}</span>
        </p>
      </div>
    </>
  );
};

const ToDeleteComment = ({ comment, exit, handleCommentDeletion }) => {
  return (
    <div className="fixed-container fx-centered box-pad-h">
      <section
        className="box-pad-h box-pad-v sc-s fx-centered fx-col"
        style={{ position: "relative", width: "min(100%, 350px)" }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <h4 className="p-centered">
          Delete{" "}
          <span className="orange-c">
            "{comment.content.substring(0, 100)}"?
          </span>
        </h4>
        <p className="p-centered gray-c box-pad-v-m">
          Do you wish to delete this comment?
        </p>
        <div className="fit-container fx-centered">
          <button className="btn btn-normal fx" onClick={handleCommentDeletion}>
            Delete
          </button>
          <button className="btn btn-gst fx" onClick={exit}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
};

const CommentsReplies = ({ comment, exit, all, aTag }) => {
  const { nostrUser, nostrKeys } = useContext(Context);
  const [login, setLogin] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectReplyTo, setSelectReplyTo] = useState(false);

  console.log(all)

  const postNewComment = async () => {
    try {
      if (!nostrKeys || !newComment) {
        return;
      }
      setIsLoading(true);
      let tags = [["a", aTag, "", "root"]];
      if (selectReplyTo) tags.push(["e", selectReplyTo.id, "", "reply"]);
      if (!selectReplyTo) tags.push(["e", comment.id, "", "reply"]);
      
      let temPublishingState = await publishPost(
        nostrKeys,
        1,
        newComment,
        tags,
        relaysOnPlatform
      );
      setIsLoading(false);
      if (temPublishingState) {
        setNewComment("");
        setSelectReplyTo(false);
      }
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div className="fixed-container fx-centered">
      <div
        className="sc-s box-pad-h box-pad-v"
        style={{ width: "min(100%, 500px)", position: "relative" }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <Comment comment={comment} refresh={null} action={false} />
        <h5 className="box-pad-v-m">{comment.count.length} Reply(ies)</h5>
        <div
          className="fit-container fx-centered fx-col fx-start-h"
          style={{ maxHeight: "40vh", overflow: "scroll" }}
        >
          {all.map((comment, index) => {
            return (
              <Reply
                comment={{ ...comment, count: [] }}
                index={index}
                all={all || []}
                setSelectReplyTo={setSelectReplyTo}
                key={comment.id}
              />
            );
          })}
        </div>
        {nostrUser && (
          <div className="fit-container fx-end-v fx-centered fx-col">
            {selectReplyTo && (
              <div
                className="fx-scattered fit-container sc-s-18 box-pad-h-m box-pad-v-s"
                style={{ backgroundColor: "var(--dim-gray)", border: "none" }}
              >
                <p className="c1-c p-medium">
                  Reply to: {selectReplyTo.content.substring(0, 20)}...
                </p>
                <div
                  className="pointer"
                  onClick={() => {
                    setSelectReplyTo(false);
                  }}
                >
                  &#10005;
                </div>
              </div>
            )}
            <textarea
              className="txt-area ifs-full"
              placeholder="Reply to comment.."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              className="btn btn-normal fx-centered"
              onClick={postNewComment}
            >
              {isLoading && <LoadingDots />}
              {!isLoading && (
                <>
                  {" "}
                  Comment as{" "}
                  <UserProfilePicNOSTR img={nostrUser.img} size={28} />{" "}
                  {nostrUser.name}{" "}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
