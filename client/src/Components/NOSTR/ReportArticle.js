import React, { useContext, useState } from "react";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import { filterRelays } from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
export default function ReportArticle({
  title,
  exit,
  naddrData,
  isReported = false,
  kind = 30023,
}) {
  const [selectedReason, setSelectedReason] = useState("");
  const { nostrUser, nostrKeys, setToast, isPublishing, setToPublish } =
    useContext(Context);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const reasons = ["nudity", "profanity", "illegal", "spam", "impersonation"];

  const reportArticle = async () => {
    if (!nostrKeys || !selectedReason) {
      setToast({
        type: 2,
        desc: "You need to select a reason for your report.",
      });
      return false;
    }
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    try {
      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 1984,
        content: comment,
        tags: [
          ["p", naddrData.pubkey],
          [
            "a",
            `${kind}:${naddrData.pubkey}:${naddrData.identifier}`,
            selectedReason,
          ],
        ],
        allRelays: [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])],
      });
      exit();
      setIsLoading(false);
    } catch (err) {
      console.log(err);
    }
  };

  if (isReported && !isLoading)
    return (
      <div className="fixed-container fx-centered box-pad-h">
        <section
          className="sc-s box-pad-h box-pad-v fx-centered fx-col"
          style={{ width: "min(100%, 400px)", position: "relative" }}
        >
          <div className="close" onClick={exit}>
            <div></div>
          </div>
          <div className="box-pad-h-m box-pad-v-m fx-centered fx-col fit-container">
            <h4 className="p-centered box-pad-h-s">We got you!</h4>
            <p className="p-centered gray-c box-pad-v-m">
              You have already reported{" "}
              <span className="orange-c">"{title}"</span>, the content of this
              article will be banned if more people agreed on it!
            </p>
            <button className="btn btn-normal btn-full" onClick={exit}>
              Ok
            </button>
          </div>
        </section>
      </div>
    );

  return (
    <div className="fixed-container fx-centered box-pad-h">
      <section
        className="sc-s box-pad-h box-pad-v fx-centered fx-col"
        style={{ width: "min(100%, 500px)", position: "relative" }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <div className="box-pad-h-m box-pad-v-m fx-centered fx-col fit-container">
          <h4 className="p-centered box-pad-h-s">
            Report <span className="orange-c">"{title}"</span>?
          </h4>
          <p className="p-centered gray-c">
            We are sorry to hear that you have faced an inconvenice by reading
            this article, please state the reason behind your report.
          </p>
          {reasons.map((item, index) => {
            return (
              <div
                className="if ifs-full fx-centered p-caps pointer"
                style={{
                  backgroundColor:
                    selectedReason === item ? "var(--dim-gray)" : "",
                }}
                key={`${item}-${index}`}
                onClick={() => setSelectedReason(item)}
              >
                {item}
              </div>
            );
          })}

          <input
            type={"text"}
            className="if ifs-full p-centered"
            placeholder="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {nostrUser && (
            <button
              className="btn btn-normal btn-full"
              onClick={reportArticle}
              disabled={isLoading}
            >
              {isLoading ? <LoadingDots /> : "Report"}
            </button>
          )}
          {!nostrUser && (
            <button className="btn btn-disabled btn-full">
              Login to report
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
