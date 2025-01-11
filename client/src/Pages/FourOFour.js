import React, { useEffect } from "react";
import PagePlaceholder from "../Components/PagePlaceholder";
import { useNavigate, useParams } from "react-router-dom";
import { getLinkFromAddr } from "../Helpers/Helpers";

export default function FourOFour() {
  const { nevent } = useParams();
  const navigateTo = useNavigate();

  useEffect(() => {
    if (nevent) {
      const url = getLinkFromAddr(nevent);
      
      if (url !== nevent) {
        navigateTo(url);
      }
    }
  }, [nevent]);

  if (!nevent) {
    return <PagePlaceholder page={"404"} />;
  }

  return <PagePlaceholder page={"404"} />;
}