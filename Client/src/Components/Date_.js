import React from "react";

export default function Date_({ toConvert, time = false }) {

  const months = 
     [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]

  const year = new Date(toConvert).getFullYear();
  const month = months[new Date(toConvert).getMonth()];
  const day = new Date(toConvert).getDate();
  const hour = new Date(toConvert).getHours();
  const min = new Date(toConvert).getMinutes();

  return (
    <>
      {month} {day}, {year}{" "}
      {time && (
        <>
          at {hour}:{min}
        </>
      )}
    </>
  );
}
