import React from 'react';
import { Menu, Globe, Bell } from 'lucide-react';
import { Language } from '../../types';
import { formatPercent } from '../../utils/calculations';
import { useApp, useServices } from '../../state';

interface HeaderProps {
    onOpenMobileMenu: () => void;
}

export const Header = ({
    onOpenMobileMenu
}: HeaderProps) => {
    const { t: labels, lang, setLang: onLanguageChange, hibor } = useApp();
    const { unreadCount, showNotifications, setShowNotifications, notifications, setUnreadCount } = useServices();
    return (
        <header className="bg-white sticky top-0 z-30 px-4 md:px-10 py-4 md:py-5 flex items-center justify-between border-b border-slate-200 no-print">
            <div className="flex items-center gap-4">
                <button
                    onClick={onOpenMobileMenu}
                    className="lg:hidden w-11 h-11 -ml-2 flex items-center justify-center text-slate-500 hover:text-[#020617] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded"
                    aria-label="Open menu"
                >
                    <Menu className="w-6 h-6" />
                </button>

                <div className="min-w-0">
                    <h1 className="text-base sm:text-xl md:text-2xl font-serif text-[#020617] truncate">{labels.financingProposal}</h1>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6 flex-shrink-0">
                {/* Language: must stay reachable on phones — the sidebar has no language control */}
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400 hidden sm:block" />
                    <select
                        value={lang}
                        onChange={(e) => onLanguageChange(e.target.value as Language)}
                        aria-label="Language"
                        // 16px + 44px tall on every TOUCH width, which includes tablet
                        // portrait at 768px — iOS Safari zooms the page when a focused
                        // control's font-size is under 16px. Only the lg+ (desktop,
                        // pointer) layout drops to the compact treatment.
                        className="bg-transparent text-base lg:text-xs font-bold text-slate-600 uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded cursor-pointer hover:text-[#020617] min-h-[44px] lg:min-h-0"
                    >
                        <option value="en">English</option>
                        <option value="zh_hk">繁體中文</option>
                        <option value="zh_cn">简体中文</option>
                    </select>
                </div>

                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{labels.hiborRate}</span>
                    <span className="text-lg font-serif font-bold text-[#020617]">{formatPercent(hibor)}</span>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        aria-label="Notifications"
                        className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center hover:border-[#c5a059] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] cursor-pointer transition-colors relative"
                    >
                        <Bell className="w-4 h-4 text-slate-400" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white shadow-xl border border-slate-100 rounded-lg z-50 overflow-hidden">
                            <div className="bg-[#f8fafc] px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{labels.notifications}</span>
                                <button onClick={() => setUnreadCount(0)} className="min-h-[44px] px-2 -my-2 text-[10px] text-[#b45309] font-bold hover:text-[#9a3412] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] rounded">{labels.markRead}</button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.map((n) => (
                                    <div key={n.id} className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${n.type === 'success' ? 'text-emerald-600' :
                                                n.type === 'warning' ? 'text-orange-600' : 'text-blue-600'
                                                }`}>
                                                {n.title}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-mono">{n.time}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{n.message}</p>
                                    </div>
                                ))}
                                {notifications.length === 0 && (
                                    <div className="p-8 text-center text-xs text-slate-400">{labels.noNotifications}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
