import React, { useContext } from "react";
import ProgressCirc from "./ProgressCirc";
import { Context } from "../Context/Context";

export default function UserFirsLogin() {
  const { userFirstLoginYakiChest, setUserFirstLoginYakiChest } = useContext(Context);

  if (!userFirstLoginYakiChest) return;
  return (
    <div
      className="fixed-container fx-centered box-pad-h"
      style={{ zIndex: 10000 }}
    >
      <div
        className="box-pad-h box-pad-v sc-s fx-col fx-centered"
        style={{ width: "min(100%, 400px)", rowGap: "16px" }}
      >
        <h1>🎉</h1>
        <h4>Congratulations!</h4>
        <p className="p-centered gray-c">
          You have been awarded {userFirstLoginYakiChest.xp}xp for the following
          actions, be active more and earn awards!
        </p>

        <ProgressCirc
          percentage={userFirstLoginYakiChest.percentage}
          size={170}
          innerComp={
            <div
              className="fx-centered fx-col fit-container"
              style={{ rowGap: "5px" }}
            >
              <div className="fx-centered">
                <h2>{userFirstLoginYakiChest.xp}</h2>
                <p className="gray-c">xp</p>
              </div>
              <p className="orange-c">Level {userFirstLoginYakiChest.lvl}</p>
            </div>
          }
        />
        <div className="fit-container fx-centered fx-wrap">
          {userFirstLoginYakiChest.actions.map((action, index) => {
            return (
              <div className="fx-centered slide-right" style={{animationDelay: `${index*0.1}s`}} key={index}>
                <p className="p-medium">{action.display_name}</p>
                <div className="checkmark"></div>
              </div>
            );
          })}
        </div>
        <div>
          <button className="btn btn-normal" onClick={() => setUserFirstLoginYakiChest(false)}>Woohoo!</button>
        </div>
      </div>
    </div>
  );
}
