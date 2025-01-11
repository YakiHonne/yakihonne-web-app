import React from "react";

export default function Date_({ toConvert, time = false, timeOnly = false }) {
  const months = [
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
  ];

  let year = new Date(toConvert).getFullYear();
  let month = months[new Date(toConvert).getMonth()];
  let day = new Date(toConvert).getDate();
  let hour = new Date(toConvert).getHours();
  let min = new Date(toConvert).getMinutes();
  hour = hour >= 10 ? hour : `0${hour}`;
  min = min >= 10 ? min : `0${min}`;

  if (timeOnly)
    return (
      <>
        {hour}:{min}
      </>
    );
  return (
    <>
      {month} {day}, {year}
      {time && (
        <>
          at {hour}:{min}
        </>
      )}
    </>
  );
}
