import React from "react";

interface ScrollableContainerProps {
    children: React.ReactNode;
    maxHeight?: string | number;
    className?: string;
    showScrollbar?: boolean;
}

const ScrollableContainer = React.forwardRef<HTMLDivElement, ScrollableContainerProps>(({
    children,
    maxHeight = "400px",
    className = "",
    showScrollbar = true,
}, ref) => {
    const heightStyle = typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;

    return (
        <>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 9px;
                    height: 9px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #0B8C00;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #0a7a00;
                }
                .custom-scrollbar::-webkit-scrollbar-button {
                    display: none;
                    height: 0;
                    width: 0;
                }
                .custom-scrollbar::-webkit-scrollbar-button:start:decrement,
                .custom-scrollbar::-webkit-scrollbar-button:end:increment {
                    display: none;
                }
            `}</style>
            <div
                ref={ref}
                className={`overflow-y-auto ${showScrollbar ? "custom-scrollbar" : "scrollbar-hide"} ${className}`}
                style={{
                    maxHeight: heightStyle,
                }}
            >
                {children}
            </div>
        </>
    );
});

ScrollableContainer.displayName = "ScrollableContainer";

export default ScrollableContainer;
