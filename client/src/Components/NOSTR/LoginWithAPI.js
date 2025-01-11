import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import { LoginToAPI } from "../../Helpers/Helpers";

export default function LoginWithAPI({ exit }) {
  const { nostrKeys, setToast, setIsConnectedToYaki, initiFirstLoginStats } =
    useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (nostrKeys && !(nostrKeys.ext || nostrKeys.sec)) exit();
  }, [nostrKeys]);

  const connect = async (e) => {
    try {
      e.stopPropagation();
      setIsLoading(true);
      let secretKey = nostrKeys.ext ? false : nostrKeys.sec;

      let data = await LoginToAPI(nostrKeys.pub, secretKey);
      if (data) {
        localStorage.setItem("connect_yc", `${new Date().getTime()}`);
        if (data.is_new) {
          initiFirstLoginStats(data);
        }
        setIsConnectedToYaki(true);
        exit();
      }
      if (!data)
        setToast({
          type: 2,
          desc: "An error occured while connecting, please try again.",
        });
      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      setToast({
        type: 2,
        desc: "An error occured while connecting, please try again.",
      });
    }
  };

  return (
    <div className="fixed-container fx-centered box-pad-h">
      <div
        className="sc-s-18  fx-centered fx-col"
        style={{ width: "min(100%, 400px)", padding: "2rem" }}
      >
        <h4>Yakihonne's Chest!</h4>
        <p className="gray-c p-centered">
          Login to Yakihonne's chest, accumulate points by being active on the
          platform and win precious awards!
        </p>
        <div className="chest"></div>
        <button
          className="btn btn-normal btn-full"
          onClick={connect}
          disabled={isLoading}
        >
          {isLoading ? <LoadingDots /> : "Log in"}
        </button>
        {!isLoading && (
          <button className="btn btn-text btn-small" onClick={exit}>
            No, I'm good
          </button>
        )}
      </div>
    </div>
  );
}
