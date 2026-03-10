import React from 'react';
import { Menu, Globe, Bell } from 'lucide-react';
import { Language } from '../../types';
import { formatPercent } from '../../utils/calculations';

interface HeaderProps {
    onOpenMobileMenu: () => void;
    lang: Language;
    onLanguageChange: (lang: Language) => void;
    hibor: number;
    unreadCount: number;
    showNotifications: boolean;
    setShowNotifications: (show: boolean) => void;
    notifications: any[];
    setUnreadCount: (count: number) => void;
    labels: any;
}

export const Header = ({
    onOpenMobileMenu,
    lang,
    onLanguageChange,
    hibor,
    unreadCount,
    showNotifications,
    setShowNotifications,
    notifications,
    setUnreadCount,
    labels
}: HeaderProps) => {
    return (
        <header className="bg-white sticky top-0 z-30 px-4 md:px-10 py-4 md:py-5 flex items-center justify-between border-b border-slate-200 no-print">
            <div className="flex items-center gap-4">
                <button
                    onClick={onOpenMobileMenu}
                    className="lg:hidden text-slate-500 hover:text-[#020617] transition-colors"
                    aria-label="Open menu"
                >
                    <Menu className="w-6 h-6" />
                </button>

                <div>
                    <h1 className="text-xl md:text-2xl font-serif text-[#020617]">{labels.financingProposal}</h1>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center space-x-2 mr-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <select
                        value={lang}
                        onChange={(e) => onLanguageChange(e.target.value as Language)}
                        className="bg-transparent text-xs font-bold text-slate-600 uppercase tracking-wide focus:outline-none cursor-pointer hover:text-[#020617]"
                    >
                        <option value="en">English</option>
                        <option value="zh_hk">繁體中文</option>
                        <option value="zh_cn">简体中文</option>
                    </select>
                </div>

                <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{labels.hiborRate}</span>
                    <span className="text-lg font-serif font-bold text-[#020617]">{formatPercent(hibor)}</span>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:border-[#c5a059] cursor-pointer transition-colors relative"
                    >
                        <Bell className="w-4 h-4 text-slate-400" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-12 w-80 bg-white shadow-xl border border-slate-100 rounded-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-[#f8fafc] px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{labels.notifications}</span>
                                <button onClick={() => setUnreadCount(0)} className="text-[10px] text-[#c5a059] font-bold hover:text-[#b45309]">{labels.markRead}</button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.map((n) => (
                                    <div key={n.id} className="p-4 border-b border-slate-5 :hover:bg-slate-50 transition-colors">
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
