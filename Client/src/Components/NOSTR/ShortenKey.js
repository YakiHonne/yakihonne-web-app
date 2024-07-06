import React, { useContext } from "react";
import { Context } from "../../Context/Context";

export default function ShortenID({ id }) {
  const { setToast } = useContext(Context);
  if (!id) return;
  let firstHalf = id.substring(0, 10);
  const copyID = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setToast({
      type: 1,
      desc: `Pubkey was copied! 👏`,
    });
  };
  return (
    <span
      className="to-copy pointer sticker sticker-small sticker-c1"
      style={{ position: "relative", overflow: "hidden" }}
      onClick={copyID}
    >
      {firstHalf}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: "32px",
          backgroundColor: "var(--c1)",
        }}
        className="copy-icon fx-centered"
      >
        <div
          className="copy-24"
          style={{ filter: "invert()", minWidth: "18px", minHeight: "18px" }}
        ></div>
      </div>
    </span>
  );
}
