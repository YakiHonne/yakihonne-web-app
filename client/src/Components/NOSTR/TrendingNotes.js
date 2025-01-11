import React from "react";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import Date_ from "../Date_";
import { Link } from "react-router-dom";
import { getEmptyNostrUser } from "../../Helpers/Encryptions";

export default function TrendingNotes({ notes }) {
  
  return (
    <div className="fit-container fx-centered fx-wrap fx-start-h">
      {notes.map((note) => {
        let author = note.author
          ? JSON.parse(note.author.content)
          : getEmptyNostrUser(note.pubkey);
        return (
          <div className="fit-container fx-scattered" key={note.id}>
            <div className="fx-centered fx-col fx-start-v">
              <div className="fx-centered fit-container fx-start-h">
                <AuthorPreview author={author} pubkey={note.pubkey} />
                <p className="p-small gray-c">|</p>
                <p className="gray-c p-medium">
                  <Date_
                    toConvert={new Date(note.event.created_at * 1000)}
                    time={true}
                  />
                </p>
              </div>
              <p className=" p-two-lines">{note.event.content}</p>
            </div>
            <Link to={"/notes/" + note.nEvent}>
              <div className="share-icon"></div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

const AuthorPreview = ({ author, pubkey }) => {
  return (
    <div className="fx-centered">
      <UserProfilePicNOSTR
        img={author?.picture}
        size={16}
        mainAccountUser={false}
        user_id={pubkey}
        ring={false}
        metadata={author}
      />
      <p className="p-medium gray-c">{author?.display_name || author?.name}</p>
    </div>
  );
};
