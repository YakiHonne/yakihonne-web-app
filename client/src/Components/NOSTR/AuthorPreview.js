import React from "react";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";

export default function AuthorPreview({ author, size = "big" }) {
  return (
    <div className="fx-centered fx-start-h ">
      <UserProfilePicNOSTR
        size={size === "big" ? 40 : 30}
        mainAccountUser={false}
        ring={false}
        user_id={author.pubkey}
        img={author.picture}
        metadata={author}
      />
      {size === "big" && (
        <div>
          <p className="p-bold">{author.display_name || author.name}</p>
          <p className="p-medium gray-c">
            @{author.name || author.display_name}
          </p>
        </div>
      )}
      {size !== "big" && (
        <div>
          <p className="p-bold p-medium">
            {author.display_name || author.name}
          </p>
          <p className="p-small gray-c">
            @{author.name || author.display_name}
          </p>
        </div>
      )}
    </div>
  );
}
