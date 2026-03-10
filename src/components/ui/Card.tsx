import React, { useState } from 'react';
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
    className?: string,
    title?: React.ReactNode,
    subtitle?: string,
    action?: React.ReactNode,
    goldAccent?: boolean,
    collapsible?: boolean,
    defaultCollapsed?: boolean
}) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    return (
        <div className={`bg-white shadow-sm border border-slate-200/60 ${goldAccent ? 'border-t-2 border-t-[#c5a059]' : ''} ${className}`}>
            {(title || action || collapsible) && (
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex-1">
                        {title && <h3 className="text-lg font-serif font-medium text-slate-900 tracking-tight">{title}</h3>}
                        {subtitle && <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">{subtitle}</p>}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                        {action}
                        {collapsible && (
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="p-1 hover:bg-slate-50 rounded-full text-slate-400 hover:text-[#c5a059] transition-colors focus:outline-none"
                                aria-label={isCollapsed ? "Expand" : "Collapse"}
                            >
                                <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} />
                            </button>
                        )}
                    </div>
                </div>
            )}
            {!isCollapsed && (
                <div className="p-8">
                    {children}
                </div>
            )}
        </div>
    );
};
