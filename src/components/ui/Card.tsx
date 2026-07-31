import React, { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export const Card = ({
    children,
    className = "",
    title,
    subtitle,
    action,
    goldAccent = false,
    collapsible = false,
    defaultCollapsed = false
}: {
    children?: React.ReactNode;
    // Must be a static literal at every call site — the build-time Tailwind scanner
    // cannot follow a computed string through this prop.
    className?: string,
    title?: React.ReactNode,
    subtitle?: string,
    action?: React.ReactNode,
    goldAccent?: boolean,
    collapsible?: boolean,
    defaultCollapsed?: boolean
}) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const contentId = useId();

    return (
        <div className={`bg-white shadow-sm border border-slate-200/60 ${goldAccent ? 'border-t-2 border-t-[#c5a059]' : ''} ${className}`}>
            {(title || action || collapsible) && (
                <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                    {/* min-w-0 lets the title shrink instead of pushing the action out of
                        the card at narrow widths / long translations. */}
                    <div className="flex-1 min-w-0">
                        {title && <h3 className="text-lg font-serif font-medium text-slate-900 tracking-tight break-words">{title}</h3>}
                        {subtitle && <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium">{subtitle}</p>}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                        {action}
                        {collapsible && (
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="w-11 h-11 flex items-center justify-center hover:bg-slate-50 rounded-full text-slate-400 hover:text-[#c5a059] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] flex-shrink-0"
                                aria-label={isCollapsed ? "Expand" : "Collapse"}
                                aria-expanded={!isCollapsed}
                                aria-controls={contentId}
                            >
                                <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} />
                            </button>
                        )}
                    </div>
                </div>
            )}
            {!isCollapsed && (
                <div id={contentId} className="p-4 sm:p-6 md:p-8">
                    {children}
                </div>
            )}
        </div>
    );
};
