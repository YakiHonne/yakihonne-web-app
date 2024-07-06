import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Context } from "../../Context/Context";

export default function NavBar() {
  const { nostrUser, nostrUserLoaded, nostrUserLogout } = useContext(Context);
  const navigateTo = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const isPage = (url) => {
    if (url === window.location.pathname) return true;
    return false;
  };
  const switchPlatform = () => {
    document.body.style.transition = ".2s ease-in-out";
    document.body.style.transformOrigin = "center center";
    document.body.style.opacity = "0";
    document.body.style.transform = "translateY(50px)";
    let timer = setTimeout(() => {
      navigateTo("/");
      document.body.style.opacity = "1";
      document.body.style.transform = "initial";
    }, 300);
  };
  return (
    <div className="fx-scattered nostr-sidebar box-pad-v-m fx-col">
      <div>
        <div className="sidebar-logo fx-centered fit-container">
          <div
            className="yakihonne-logo-128"
            onClick={() => navigateTo("/")}
          ></div>
        </div>
      </div>
      <div className="fx-scattered fx-col">
        <div
          onClick={() => navigateTo("/")}
          className={` pointer box-pad-h-s box-pad-v-s ${
            isPage("/") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="tooltip-sidebar-hover">Home</div>
          <div className="home-24"></div>
        </div>
        <div
          onClick={() => navigateTo("/curations")}
          className={`pointer box-pad-h-s box-pad-v-s ${
            isPage("/curations") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="tooltip-sidebar-hover">Curations</div>
          <div className="curation-24"></div>
        </div>

        <div
          onClick={() => navigateTo("/my-curations")}
          className={`pointer box-pad-h-s box-pad-v-s ${
            isPage("/my-curations") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="tooltip-sidebar-hover">My curations</div>
          <div className="stories-24"></div>
        </div>

        <Link
          to={"/my-articles"}
          // onClick={() => navigateTo("/my-articles")}
          className={`pointer box-pad-h-s box-pad-v-s ${
            isPage("/my-articles") ? "active-link" : "inactive-link"
          }`}
        >
          <div className="tooltip-sidebar-hover">My articles</div>
          <div className="posts-24"></div>
        </Link>
        {nostrUser && (
          <Link
            to={"/write"}
            // onClick={() => navigateTo("/my-articles")}
            className={`pointer box-pad-h-s box-pad-v-s ${
              isPage("/write") ? "active-link" : "inactive-link"
            }`}
          >
            <div className="tooltip-sidebar-hover">Write</div>
            <div className="edit-24"></div>
          </Link>
        )}
        {/*        
        <div className="fx-centered" style={{ position: "relative" }}>
          <div
            className="pointer box-pad-h-s box-pad-v-s 
               active-link"
            style={{ backgroundColor: "var(--c3)" }}
            onClick={switchPlatform}
          >
            <div className="tooltip-sidebar-hover">Switch to DAOrayaki</div>
            <div
              className="switch-arrows-24"
              style={{ filter: "invert()" }}
            ></div>
          </div>
        </div> */}
      </div>
      {/* {nostrUser && nostrUserLoaded && (
        <div className="fx-centered" style={{ position: "relative" }}>
          <div
            className="pointer box-pad-h-s box-pad-v-s 
               active-link"
            onClick={nostrUserLogout}
          >
            <div className="switch-arrows-24"></div>
          </div>
        </div>
      )} */}
    </div>
  );
}
