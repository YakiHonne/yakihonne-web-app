import React, { useState, useMemo } from "react";
import { useEffect } from "react";

const getMonth = (month, year) => {
  let desiredMonth = new Date(year, month);

  let monthDays = [];

  for (let i = 0; i < getDay(desiredMonth); i++) monthDays.push("");

  while (desiredMonth.getMonth() == month) {
    monthDays.push(desiredMonth.getDate());
    desiredMonth.setDate(desiredMonth.getDate() + 1);
  }

  if (getDay(desiredMonth) !== 0) {
    for (let i = getDay(desiredMonth); i < 7; i++) monthDays.push("");
  }

  return monthDays;
};

const getDay = (date) => {
  let day = date.getDay();
  if (day == 0) day = 7;
  return day - 1;
};

export default function Calendar({ selected_day, onClick, clear }) {
  const [month, setMonth] = useState(
    selected_day ? selected_day.getMonth() : new Date().getMonth()
  );
  const [year, setYear] = useState(
    selected_day ? selected_day.getFullYear() : new Date().getFullYear()
  );
  const [curentDay, setCurrentDay] = useState({
    day: new Date().getDate(),
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const currentMonth = useMemo(() => getMonth(month, year), [month, year]);
  const [selectedDay, setSelectedDay] = useState(
    selected_day
      ? {
          day: selected_day.getDate(),
          month: selected_day.getMonth(),
          year: selected_day.getFullYear(),
        }
      : {}
  );

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

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    if (selected_day) {
      setMonth(selected_day.getMonth());
      setYear(selected_day.getFullYear());
      setSelectedDay({
        day: selected_day.getDate(),
        month: selected_day.getMonth(),
        year: selected_day.getFullYear(),
      });
    }
  }, [selected_day]);

  const nextMonth = (e) => {
    e.stopPropagation();
    if (month + 1 >= 12) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  };

  const setDesiredDate = (e, item) => {
    e.stopPropagation();
    if (
      selectedDay.day === item &&
      selectedDay.month === month &&
      selectedDay.year === year
    )
      return;
    onClick(e, new Date(year, month, item));
  };

  const checkCurrentDay = (day) => {
    if (
      selectedDay.day === day &&
      selectedDay.month === month &&
      selectedDay.year === year
    )
      return true;

    return false;
  };
  const checkToday = (day) => {
    if (
      new Date().getDay() === day &&
      new Date().getMonth() === month &&
      new Date().getFullYear() === year
    )
      return true;

    return false;
  };

  return (
    <div className="calendar-card box-pad-v-m fx-centered fx-col">
      <div className="fx-scattered fit-container box-pad-h">
        <div className="box-pad-h-s pointer" onClick={prevMonth}>
          <div
            className="arrow"
            style={{
              margin: 0,
              transform: "rotate(90deg)",
              opacity:
                month - 1 >= new Date().getMonth() ||
                (month - 1 < new Date().getMonth() &&
                  year > new Date().getFullYear())
                  ? 1
                  : 0.5,
            }}
          ></div>
        </div>
        <p className="p-bold c1-c">
          {months[month]} {year}
        </p>
        <div className="box-pad-h-s pointer" onClick={nextMonth}>
          <div
            className="arrow"
            style={{ transform: "rotate(-90deg)", margin: 0 }}
          ></div>
        </div>
      </div>
      <hr style={{ margin: ".5rem 0" }} />
      <div className="calendar-grid box-marg-s fit-container">
        {days.map((item, index) => {
          return (
            <p className="gray-c p-small" key={index}>
              {item}
            </p>
          );
        })}
      </div>
      <div className="calendar-grid fit-container">
        {currentMonth.map((item, index) => {
          return (
            <p
              className={`available-day pointer ${
                checkCurrentDay(item) ? "selected-day white-c" : checkToday(item) ? "" : ""
              }`}
              key={index}
              onClick={(e) => {
                setDesiredDate(e, item);
              }}
            >
              {item}
            </p>
          );
        })}
      </div>
      <hr />
      {selected_day && (
        <div
          className="fit-container box-pad-h-s fx-centered pointer"
          onClick={clear}
        >
          <p className="p-medium gray-c">Clear date</p>
        </div>
      )}
    </div>
  );
}
