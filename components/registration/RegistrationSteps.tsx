import React from "react";

interface Step {
    number: string;
    label: string;
}

interface RegistrationStepsProps {
    steps: Step[];
    currentStep: number; // 0-based index
    className?: string;
    /** Wraps each step column (circle + labels). Default matches old compact registration layout. */
    stepColumnClassName?: string;
}

export default function RegistrationSteps({
    steps,
    currentStep,
    className = "",
    stepColumnClassName = "w-[70px]",
}: RegistrationStepsProps) {
    return (
        <div 
            className={`w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white shadow-[0px_6px_40px_rgba(0,0,0,0.02)] mb-4 ${className}`}
            style={{
                padding: '20px 0', // No horizontal padding
            }}
        >
            <div className="w-full flex items-start relative" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isLast = index === steps.length - 1;
                    
                    return (
                        <React.Fragment key={index}>
                            {/* Step Circle and Labels */}
                            <div 
                                className={`flex flex-col items-center relative z-10 min-w-0 ${stepColumnClassName} ${isLast ? 'mr-4' : ''}`}
                            >
                                {/* Circle */}
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        isCurrent
                                            ? "border border-[#D6A15A] bg-[#FFF9F2]"
                                            : "border border-[#0B8C00] bg-white"
                                    }`}
                                >
                                    {isCompleted || isCurrent ? (
                                        <div
                                            className={`w-5 h-5 rounded-full ${
                                                isCurrent ? "bg-[#C98935]" : "bg-[#0B8C00]"
                                            }`}
                                        ></div>
                                    ) : null}
                                </div>
                                
                                {/* Step Number */}
                                <p className="font-inter font-normal text-xs leading-[120%] text-center text-[#434956] mt-3">
                                    {step.number}
                                </p>
                                
                                {/* Step Label */}
                                <p className="font-inter font-medium text-base leading-[120%] text-center text-[#434956]">
                                    {step.label}
                                </p>
                            </div>
                            
                            {/* Connector Line - positioned between circles */}
                            {!isLast && (
                                <div 
                                    className="flex-1 relative"
                                    style={{
                                        alignSelf: 'flex-start',
                                        height: '32px', // Match circle height
                                        display: 'flex',
                                        alignItems: 'center',
                                        // marginLeft: '-32px', // Extend back to previous circle center (half of 32px)
                                        // marginRight: '-32px', // Extend forward to next circle center (half of 32px)
                                    }}
                                >
                                    <div 
                                        className="w-full"
                                        style={{
                                            height: '2px',
                                            backgroundImage: 'repeating-linear-gradient(to right, #0B8C00 0px, #0B8C00 4px, transparent 4px, transparent 8px)',
                                            backgroundSize: '8px 2px',
                                        }}
                                    ></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
