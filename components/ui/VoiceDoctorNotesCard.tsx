"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "./Button";

export interface VoiceDoctorNotesCardProps {
    notes?: string[];
    onSaveNext?: () => void;
    className?: string;
}

export function VoiceDoctorNotesCard({
    notes = [
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris dapibus tincidunt dui, bibendum tempus tellus mollis ut. Donec iaculis consectetur est, sed elementum augue venenatis placerat. Morbi lacinia metus vel ligula pretium mattis. Vivamus felis odio, gravida nec sem vitae, laoreet posuere arcu. Fusce dapibus iaculis orci at luctus. Ut posuere odio eu sagittis hendrerit. Morbi a elementum neque, at iaculis justo. Cras nec commodo urna. In at lacus lacinia, semper velit in, eleifend purus. In quis erat eu quam sodales semper. Aenean ultricies, sem at rhoncus condimentum, sapien purus euismod leo, id commodo dolor diam dignissim erat. Quisque non lobortis massa, sed iaculis metus. Quisque libero eros, sodales pulvinar.",
        "Proin tincidunt odio ac urna convallis, aliquet vulputate nibh molestie. Donec nec libero sed sapien tempor dictum. Vestibulum a molestie ipsum. Nulla facilisi. Phasellus rutrum, lacus ac finibus varius, mauris nibh blandit mi, et efficitur mi purus nec metus. Vivamus justo magna, varius ut consectetur a, porttitor id mauris. Vivamus in elit ultrices, sodales dui vitae, elementum arcu. Ut mattis urna a mauris bibendum, at pretium elit vulputate. Sed convallis mollis mi ut sodales. Fusce eleifend scelerisque volutpat. Maecenas in tortor purus. Vestibulum luctus eros eu sapien laoreet vehicula.",
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris dapibus tincidunt dui, bibendum tempus tellus mollis ut. Donec iaculis consectetur est, sed elementum augue venenatis placerat. Morbi lacinia metus vel ligula pretium mattis. Vivamus felis odio, gravida nec sem vitae, laoreet posuere arcu. Fusce dapibus iaculis orci at luctus. Ut posuere odio eu sagittis hendrerit. Morbi a elementum neque, at iaculis justo. Cras nec commodo urna."
    ],
    onSaveNext,
    className = "",
}: VoiceDoctorNotesCardProps) {
    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [seconds, setSeconds] = useState(0);

    // Collapsible Doctor's Notes state
    const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);

    // Record timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isRecording && !isPaused) {
            interval = setInterval(() => {
                setSeconds((prev) => prev + 1);
            }, 1000);
        } else if (!isRecording) {
            setSeconds(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording, isPaused]);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const handleStartStopRecording = () => {
        if (!isRecording) {
            setIsRecording(true);
            setIsPaused(false);
        } else {
            setIsRecording(false);
            setIsPaused(false);
        }
    };

    const handlePauseResumeRecording = () => {
        if (isRecording) {
            setIsPaused(!isPaused);
        }
    };

    const handleStopRecording = () => {
        setIsRecording(false);
        setIsPaused(false);
        setSeconds(0);
    };

    return (
        <div className={`rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 ${className}`}>
            
            {/* Voice Dictation Centered Controls */}
            <div className="flex justify-center w-full">
                <div className="flex items-center gap-4 bg-[#FCF5E9] px-6 py-2.5 rounded-[32px] border border-[#F3E6D0]">
                    
                    {/* Mic Icon */}
                    <div className="flex items-center justify-center">
                        <Image src="/icons/mic.svg" alt="Mic Icon" width={18} height={18} />
                    </div>

                    {/* Timer text */}
                    <span className="font-mono text-sm font-semibold text-[#434956]">{formatTime(seconds)}</span>

                    {/* Record Button (Red Dot Icon) */}
                    <button
                        onClick={handleStartStopRecording}
                        className="focus:outline-none flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                        title={isRecording ? "Stop Recording" : "Start Recording"}
                    >
                        <Image
                            src="/icons/redCircle.svg"
                            alt="Record Icon"
                            width={24}
                            height={24}
                            className={`${isRecording && !isPaused ? "animate-pulse border border-red-500 rounded-full" : ""}`}
                        />
                    </button>

                    {/* Pause/Resume Button */}
                    <button
                        onClick={handlePauseResumeRecording}
                        disabled={!isRecording}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${!isRecording ? "opacity-30 cursor-not-allowed" : isPaused ? "bg-[#0B8C00]/10 border border-[#0B8C00] scale-105" : "hover:bg-[#9A7909]/10"}`}
                        title={isPaused ? "Resume" : "Pause"}
                    >
                        <Image
                            src={isPaused ? "/icons/play.svg" : "/icons/pause.svg"}
                            alt={isPaused ? "Play Icon" : "Pause Icon"}
                            width={14}
                            height={14}
                            className={`${!isRecording ? "grayscale" : ""}`}
                        />
                    </button>

                    {/* Stop Button */}
                    <button
                        onClick={handleStopRecording}
                        disabled={!isRecording}
                        className={`px-4 py-1.5 rounded-[20px] font-medium text-xs border transition-all ${!isRecording ? "opacity-40 cursor-not-allowed border-gray-300 text-gray-400 bg-gray-100" : "border-gray-300 text-[#434956] bg-[#E5E7EB] hover:bg-gray-300"}`}
                    >
                        Stop
                    </button>
                </div>
            </div>

            {/* Doctor's Notes Section */}
            <div className="space-y-4">
                <div
                    onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
                    className="flex items-center justify-between cursor-pointer"
                >
                    <span className="font-inter font-semibold text-base text-[#262D3B]">Doctor's Notes:</span>
                    <button className="text-gray-500 hover:text-gray-700">
                        <svg
                            className={`w-5 h-5 transform transition-transform duration-200 ${isNotesCollapsed ? "" : "rotate-180"}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {!isNotesCollapsed && (
                    <div className="rounded-xl border border-[#E3EEE1] bg-[#F2F8F2]/30 p-5">
                        {notes.map((paragraph, idx) => (
                            <p
                                key={idx}
                                className={`font-inter text-sm text-[#434956] leading-relaxed ${idx === notes.length - 1 ? "" : "mb-4"}`}
                            >
                                {paragraph}
                            </p>
                        ))}
                    </div>
                )}


            </div>
        </div>
    );
}
