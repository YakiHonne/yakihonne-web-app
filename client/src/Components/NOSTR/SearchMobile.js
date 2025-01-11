import React, { useState } from "react";
import SearchbarNOSTR from "./SearchbarNOSTR";


export default function SearchMobile({ exit }) {
  const [dismissed, setDismissed] = useState(false);
  const dismiss = () => {
    setDismissed(true);
    setTimeout(() => {
      exit();
    }, [600]);
  };
  
  return (
    <div className={`menu-login ${dismissed ? "dismiss" : "slide-up"}`}>
      <div className="fit-container fx-centered" onClick={dismiss}>
        <div className="close-button">
          <div className="arrow"></div>
        </div>
      </div>
      <div className="box-pad-v">
        <SearchbarNOSTR />
      </div>
    </div>
  );
}
