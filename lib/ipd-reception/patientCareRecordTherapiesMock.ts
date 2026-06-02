import type { TherapyWeekDay } from "./patientCareRecordTypes";

export const THERAPY_SCHEDULE_WEEK: TherapyWeekDay[] = [
  {
    id: "mon",
    dayLabel: "Mon",
    dateLabel: "14",
    isToday: true,
    sessions: [
      {
        id: "mon-1",
        time: "09:00 AM",
        name: "Abhyanga",
        status: "done",
      },
      {
        id: "mon-2",
        time: "02:00 PM",
        name: "Shirodhara",
        status: "done",
      },
    ],
  },
  {
    id: "tue",
    dayLabel: "Tue",
    dateLabel: "15",
    sessions: [
      {
        id: "tue-1",
        time: "08:30 AM",
        name: "Basti Treatment",
        sessionLabel: "Session 2/3",
        status: "scheduled",
      },
    ],
  },
  {
    id: "wed",
    dayLabel: "Wed",
    dateLabel: "16",
    sessions: [
      {
        id: "wed-1",
        time: "08:30 AM",
        name: "Basti Treatment",
        sessionLabel: "Session 2/3",
        status: "scheduled",
      },
    ],
  },
  {
    id: "thu",
    dayLabel: "Thu",
    dateLabel: "17",
    sessions: [
      {
        id: "thu-1",
        time: "08:30 AM",
        name: "Basti Treatment",
        sessionLabel: "Session 2/3",
        status: "scheduled",
      },
    ],
  },
  {
    id: "fri",
    dayLabel: "Fri",
    dateLabel: "18",
    sessions: [
      {
        id: "fri-1",
        time: "08:30 AM",
        name: "Basti Treatment",
        sessionLabel: "Session 2/3",
        status: "scheduled",
      },
    ],
  },
  {
    id: "sat",
    dayLabel: "Sat",
    dateLabel: "19",
    sessions: [
      {
        id: "sat-1",
        time: "08:30 AM",
        name: "Basti Treatment",
        status: "missed",
      },
    ],
  },
  {
    id: "sun",
    dayLabel: "Sun",
    dateLabel: "20",
    sessions: [],
  },
];
