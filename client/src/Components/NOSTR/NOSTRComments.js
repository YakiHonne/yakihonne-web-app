import { nip19 } from "nostr-tools";
import React, { useContext, useState, useEffect, useMemo } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { filterRelays } from "../../Helpers/Encryptions";
import Date_ from "../Date_";
import LoadingDots from "../LoadingDots";
import LoginNOSTR from "./LoginNOSTR";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { getNoteTree } from "../../Helpers/Helpers";

const filterRootComments = async (all) => {
  let temp = [];
  for (let comment of all) {
    if (!comment.tags.find((item) => item[0] === "e")) {
      let [content_tree, count] = await Promise.all([
        getNoteTree(comment.content.split(" — This is a comment on:")[0]),
        countReplies(comment.id, all),
      ]);
      temp.push({
        ...comment,
        content_tree,
        count,
      });
    }
  }
  return temp;
};

const countReplies = async (id, all) => {
  let count = [];

  for (let comment of all) {
    let ev = comment.tags.find(
      (item) => item[3] === "reply" && item[0] === "e" && item[1] === id
    );
    if (ev) {
      let cr = await countReplies(comment.id, all);
      count.push(comment, ...cr);
    }
  }
  let res = await Promise.all(
    count
      .sort((a, b) => a.created_at - b.created_at)
      .map(async (com) => {
        let content_tree = await getNoteTree(
          com.content.split(" — This is a comment on:")[0]
        );
        return {
          ...com,
          content_tree,
        };
      })
  );
  return res;
};

const getOnReply = (comments, comment_id) => {
  let tempCom = comments.find((item) => item.id === comment_id);
  return tempCom;
};

export default function NOSTRComments({
  comments = [],
  aTag = "",
  refresh,
  setNetComments,
}) {
  const {
    nostrUser,
    nostrKeys,
    addNostrAuthors,
    setToPublish,
    isPublishing,
    setToast,
  } = useContext(Context);
  const [mainComments, setMainComments] = useState([]);
  const [login, setLogin] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [selectedComment, setSelectedComment] = useState(false);
  const [selectedCommentIndex, setSelectedCommentIndex] = useState(false);
  const [showCommentsSuffixOption, setShowCommentsSuffixOption] =
    useState(false);
  const [netComments, setNetComments_] = useState([]);
  const [showCommentBox, setShowCommentBox] = useState(
    netComments.length > 0 ? true : false
  );
  let aTagSplit = {
    kind: parseInt(aTag.split(":")[0]),
    pubkey: aTag.split(":")[1],
    identifier: aTag.split(":").splice(2, 100).join(":"),
    relays: relaysOnPlatform,
  };
  useEffect(() => {
    if (selectedComment) {
      let sC = netComments.find((item) => item.id === selectedComment.id);
      setSelectedComment(sC);
    }
    setNetComments(netComments);
    setShowCommentBox(netComments.length > 0 ? true : false);
  }, [netComments]);

  useEffect(() => {
    const parsedCom = async () => {
      let res = await filterRootComments(mainComments);
      setNetComments_(res);
    };
    parsedCom();
  }, [mainComments]);
  useEffect(() => {
    setMainComments(comments);
    addNostrAuthors(comments.map((item) => item.pubkey));
  }, [comments]);

  const postNewComment = async (suffix) => {
    try {
      if (!nostrKeys || !newComment) {
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
      let tempComment = suffix
        ? `${newComment} — This is a comment on: https://yakihonne.com/${
            aTagSplit.kind === 30023 ? "article" : "curations"
          }/${nip19.naddrEncode(aTagSplit)}`
        : newComment;
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 1,
        content: tempComment,
        tags: [
          ["a", aTag, "", "root"],
          ["p", aTagSplit.pubkey],
        ],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });
      setIsLoading(false);
      setNewComment("");
    } catch (err) {
      console.log(err);
    }
  };

  const refreshRepleis = (index) => {
    let tempArray_1 = Array.from(mainComments);
    let tempArray_2 = Array.from(netComments[selectedCommentIndex].count);
    let idToDelete = tempArray_2[index].id;
    let indexToDelete = tempArray_1.findIndex((item) => item.id === idToDelete);
    tempArray_1.splice(indexToDelete, 1);
    setMainComments(tempArray_1);
  };

  return (
    <>
      {showReplies && (
        <CommentsReplies
          refresh={refreshRepleis}
          comment={selectedComment}
          all={selectedComment.count}
          exit={() => {
            setShowReplies(false);
            setSelectedComment(false);
          }}
          aTag={aTag}
        />
      )}
      {login && !nostrKeys && <LoginNOSTR exit={() => setLogin(false)} />}
      {showCommentsSuffixOption && (
        <AddSuffixToComment
          post={postNewComment}
          comment={newComment}
          exit={() => setShowCommentsSuffixOption(false)}
          aTag={aTag}
        />
      )}
      <div className="fit-container">
        {nostrKeys && showCommentBox && (
          <div className="fit-container fx-end-v fx-centered fx-col">
            <textarea
              className="txt-area ifs-full"
              placeholder="Comment on..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              className="btn btn-normal btn-full fx-centered"
              onClick={() => newComment && setShowCommentsSuffixOption(true)}
            >
              {isLoading && <LoadingDots />}
              {!isLoading && (
                <>
                  {" "}
                  Comment as{" "}
                  <UserProfilePicNOSTR mainAccountUser={true} size={28} />{" "}
                  {nostrUser.name}{" "}
                </>
              )}
            </button>
          </div>
        )}
        {!nostrKeys && showCommentBox && netComments.length > 0 && (
          <div className="fit-container fx-centered">
            <button
              className="btn btn-normal fx-centered"
              onClick={() => setLogin(true)}
            >
              Login to comment
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
              Be first to comment on this article
            </p>
            <div className="comment-24"></div>
            {!showCommentBox && (
              <button
                className="btn btn-normal"
                onClick={() => setShowCommentBox(true)}
              >
                Post a comment
              </button>
            )}
            {!nostrKeys && showCommentBox && (
              <div className="fit-container fx-centered">
                <button
                  className="btn btn-normal fx-centered"
                  onClick={() => setLogin(true)}
                >
                  Login to comment
                </button>
              </div>
            )}
          </div>
        )}

        {netComments.length > 0 && (
          <div className="fit-container fx-centered fx-start-h box-pad-v-m">
            <h4>
              {netComments.map((item) => item.count).flat().length +
                netComments.length}{" "}
              Comment(s)
            </h4>
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
                  setSelectedCommentIndex(index);
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
  const { nostrUser, nostrKeys, setToPublish, isPublishing, setToast } =
    useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationPrompt, setConfirmationPrompt] = useState(false);

  const handleCommentDeletion = async () => {
    try {
      if (isPublishing) {
        setToast({
          type: 3,
          desc: "An event publishing is in process!",
        });
        return;
      }
      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 5,
        content: "This comment will be deleted!",
        tags: [["e", comment.id]],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });
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

          <div>{comment.content_tree}</div>
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
                {comment.count.length}{" "}
                <span className="gray-c">Reply(ies)</span>{" "}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const Reply = ({ comment, refresh, index, all, setSelectReplyTo }) => {
  const { nostrUser, nostrKeys, setToPublish, isPublishing, setToast } =
    useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationPrompt, setConfirmationPrompt] = useState(false);
  const [seeReply, setSeeReply] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const repliedOn = useMemo(() => {
    return getOnReply(
      all,
      comment.tags.find((item) => item[0] === "e" && item.length === 4)[1] || ""
    );
  }, [all]);

  const handleCommentDeletion = async () => {
    try {
      if (isPublishing) {
        setToast({
          type: 3,
          desc: "An event publishing is in process!",
        });
        return;
      }
      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 5,
        content: "This comment will be deleted!",
        tags: [["e", comment.id]],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });
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
      {showLogin && <LoginNOSTR exit={() => setShowLogin(false)} />}
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
          <div className="fx-start-h fx-centerd fit-container">
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
          <div>{comment.content_tree}</div>
        </div>

        <div
          className="fx-centered fx-start-h fit-container"
          style={{ columnGap: "16px" }}
          onClick={() =>
            nostrKeys
              ? setSelectReplyTo({
                  id: comment.id,
                  content: comment.content,
                })
              : setShowLogin(true)
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
  const { getNostrAuthor, nostrAuthors } = useContext(Context);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let auth = getNostrAuthor(author.author_pubkey);

        if (auth)
          setAuthorData({
            author_img: auth.picture,
            author_name: auth.name,
            author_pubkey: auth.pubkey,
          });
        return;
      } catch (err) {
        console.log(err);
      }
    };
    if (!authorData) fetchData();
  }, [nostrAuthors]);

  if (!authorData)
    return (
      <div className="fx-centered" style={{ opacity: ".5" }}>
        <UserProfilePicNOSTR
          size={24}
          ring={false}
          img={author.author_img}
          mainAccountUser={false}
          user_id={author.author_pubkey}
        />
        <div>
          <p className="gray-c p-medium">
            On <Date_ time={true} toConvert={author.on} />
          </p>
          <p className="p-one-line p-medium">
            By: <span className="c1-c">{author.author_name}</span>
          </p>
        </div>
      </div>
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
          On <Date_ time={true} toConvert={author.on} />
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
          <span className="orange-c" style={{ wordBreak: "break-word" }}>
            "
            {comment.content
              .split(" — This is a comment on:")[0]
              .substring(0, 100)}
            "?
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

const CommentsReplies = ({ comment, exit, all, aTag, refresh }) => {
  const { nostrUser, nostrKeys, setToPublish, isPublishing, setToast } =
    useContext(Context);
  const [login, setLogin] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectReplyTo, setSelectReplyTo] = useState(false);
  const [showCommentsSuffixOption, setShowCommentsSuffixOption] =
    useState(false);
  let aTagSplit = {
    kind: parseInt(aTag.split(":")[0]),
    pubkey: aTag.split(":")[1],
    identifier: aTag.split(":").splice(2, 100).join(":"),
    relays: relaysOnPlatform,
  };
  const postNewComment = async (suffix) => {
    try {
      if (!nostrKeys || !newComment) {
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

      let tempComment = suffix
        ? `${newComment} — This is a comment on: https://yakihonne.com/${
            aTagSplit.kind === 30023 ? "article" : "curations"
          }/${nip19.naddrEncode(aTagSplit)}`
        : newComment;
      let tags = [["a", aTag, "", "root"]];
      if (selectReplyTo) tags.push(["e", selectReplyTo.id, "", "reply"]);
      if (!selectReplyTo) tags.push(["e", comment.id, "", "reply"]);

      setToPublish({
        nostrKeys: nostrKeys,
        kind: 1,
        content: tempComment,
        tags,
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });
      setIsLoading(false);
      setNewComment("");
      setSelectReplyTo(false);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {showCommentsSuffixOption && (
        <AddSuffixToComment
          post={postNewComment}
          comment={newComment}
          exit={() => setShowCommentsSuffixOption(false)}
          aTag={aTag}
        />
      )}
      <div className="fixed-container fx-centered">
        <div
          className="sc-s box-pad-h box-pad-v"
          style={{
            width: "min(100%, 500px)",
            maxHeight: "85vh",
            position: "relative",
            overflow: "scroll",
            overflowX: "hidden",
          }}
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
                  refresh={refresh}
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
                className="btn btn-normal  fx-centered"
                onClick={() => newComment && setShowCommentsSuffixOption(true)}
              >
                {isLoading && <LoadingDots />}
                {!isLoading && (
                  <>
                    {" "}
                    Comment as{" "}
                    <UserProfilePicNOSTR
                      mainAccountUser={true}
                      size={28}
                    />{" "}
                    {nostrUser.name}{" "}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const checkForSavedCommentOptions = () => {
  try {
    let options = localStorage.getItem("comment-with-suffix");
    if (options) {
      let res = JSON.parse(options);
      return res.keep_suffix;
    }
    return -1;
  } catch {
    return -1;
  }
};

const AddSuffixToComment = ({ exit, post, comment = "", aTag }) => {
  const isSaved = checkForSavedCommentOptions();
  const [isSave, setIsSave] = useState(true);
  let aTagSplit = {
    kind: parseInt(aTag.split(":")[0]),
    pubkey: aTag.split(":")[1],
    identifier: aTag.split(":").splice(2, 100).join(":"),
    relays: relaysOnPlatform,
  };

  let naddr = nip19.naddrEncode(aTagSplit);
  const saveOption = () => {
    localStorage.setItem(
      "comment-with-suffix",
      JSON.stringify({ keep_suffix: isSave })
    );
  };

  if (isSaved !== -1) {
    post(isSaved);
    exit();
  }
  if (isSaved === -1)
    return (
      <div
        className="fixed-container fx-centered box-pad-h"
        style={{ zIndex: "10000" }}
      >
        <section
          className="sc-s box-pad-h box-pad-v"
          style={{ width: "min(100%, 500px)" }}
        >
          <h4 className="p-centered">Be meaningful 🥳</h4>
          <p className="p-centered box-pad-v-m">
            Let your comments be recognized on NOSTR notes clients by adding
            where did you comment. <br />
            Choose what suits you best!
          </p>

          <div className="fit-container fx-centered fx-col">
            <label
              className="sc-s-18 fit-container fx-centered box-pad-h-m box-pad-v-m fx-start-h fx-start-v"
              htmlFor="suffix"
              style={{
                opacity: !isSave ? ".6" : 1,
                filter: !isSave ? "grayscale(100%)" : "none",
              }}
            >
              <input
                type="radio"
                id="suffix"
                name="suffix"
                checked={isSave}
                value={isSave}
                onChange={() => setIsSave(true)}
              />
              <div>
                <p className="gray-c p-small">Your comment with suffix</p>
                <p className="p-two-lines p-medium">{comment}</p>
                <p className="p-medium orange-c">
                  {aTagSplit === 30023 && (
                    <> — This is a comment on: https://yakihonne.com/article/</>
                  )}
                  {aTagSplit !== 30023 && (
                    <>
                      {" "}
                      — This is a comment on: https://yakihonne.com/curations/
                    </>
                  )}
                  {naddr}
                </p>
              </div>
            </label>
            <label
              className="sc-s-18 fit-container fx-centered box-pad-h-m box-pad-v-m fx-start-v fx-start-h"
              htmlFor="no-suffix"
              style={{
                opacity: isSave ? ".6" : 1,
                filter: isSave ? "grayscale(100%)" : "none",
              }}
            >
              <input
                type="radio"
                id="no-suffix"
                name="suffix"
                checked={!isSave}
                value={isSave}
                onChange={() => setIsSave(false)}
              />
              <div>
                <p className="gray-c p-small">Your comment without suffix</p>
                <p className="p-two-lines p-medium">{comment}</p>
              </div>
            </label>
            <div>
              <p className="p-medium gray-c box-pad-v-s">
                {" "}
                This can always be changed in your account settings
              </p>
            </div>
            <div className="fit-container fx-centered fx-col">
              <button
                className="btn btn-normal btn-full"
                onClick={() => {
                  saveOption();
                  post(isSave);
                  exit();
                }}
              >
                Post &amp; remember my choice
              </button>
              <button
                className="btn btn-text"
                onClick={exit}
                style={{ height: "max-content" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      </div>
    );
};
