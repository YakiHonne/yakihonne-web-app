import React, { useContext } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import ProfilePictureUploaderNOSTR from "./ProfilePictureUploaderNOSTR";

export default function ToChangeProfilePic({ exit, cancel }) {
  const { nostrUser, nostrUserAbout, nostrUserTags } = useContext(Context);

  return (
    <section className="fixed-container fx-centered">
      <div
        className="fx-centered fx-col slide-up"
        style={{
          width: "500px",
        }}
      >
        <ProfilePictureUploaderNOSTR
          relays={relaysOnPlatform}
          current={nostrUser.img}
          cancelButton={true}
          validateButton={"Update Photo"}
          prevUserData={nostrUserAbout}
          tags={nostrUserTags}
          exit={exit}
          cancel={cancel}
        />
      </div>
    </section>
  );
}
