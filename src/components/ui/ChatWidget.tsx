import { useEffect, useRef, useState } from 'react';
import { Bot, LoaderCircle, MessageCircle, Send, Undo2, X } from 'lucide-react';
import { useApp } from '../../state';
import type { InputPatch } from '../../hooks/useAppState';

// `applied` records an input change the assistant made: the patch it set and the
// previous values, so Undo is just another applyInputPatch of `previous`.
type Applied = { patch: InputPatch; previous: InputPatch; undone: boolean };
type Message = { role: 'user' | 'assistant'; content: string; toolCalls?: { name: string }[]; applied?: Applied };
type ApiResponse = { reply: string; toolCalls?: { name: string; args?: InputPatch }[]; error?: string };

export const ChatWidget = () => {
    const { t, lang, simulationInput, applyInputPatch } = useApp();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<'generic' | 'unavailable' | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const send = async (text: string, retry = false) => {
        const trimmed = text.trim();
        if (!trimmed || busy) return;
        const next = retry ? messages : [...messages, { role: 'user' as const, content: trimmed }];
        setMessages(next); setDraft(''); setError(null); setBusy(true);
        try {
            const windowed = next.slice(-10);
            while (windowed[0]?.role === 'assistant') windowed.shift();
            const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: windowed.map(({ role, content }) => ({ role, content })), context: { input: simulationInput, lang } }) });
            const data = await response.json() as ApiResponse;
            if (!response.ok || typeof data.reply !== 'string') { setError(data.error === 'chat_unavailable' || response.status === 503 ? 'unavailable' : 'generic'); return; }
            // Every set_inputs call in the reply is merged into one patch and applied
            // once, so `previous` snapshots the state from before any of them landed.
            const patches = (data.toolCalls ?? []).flatMap(call => call.name === 'set_inputs' && call.args ? [call.args] : []);
            let applied: Applied | undefined;
            if (patches.length > 0) {
                const patch: InputPatch = Object.assign({}, ...patches);
                const previous = applyInputPatch(patch);
                if (Object.keys(previous).length > 0) applied = { patch, previous, undone: false };
            }
            setMessages(value => [...value, { role: 'assistant', content: data.reply, toolCalls: data.toolCalls, applied }]);
        } catch { setError('generic'); }
        finally { setBusy(false); }
    };

    const undo = (index: number) => {
        const applied = messages[index]?.applied;
        if (!applied || applied.undone) return;
        applyInputPatch(applied.previous);
        setMessages(value => value.map((message, i) => i === index && message.applied ? { ...message, applied: { ...message.applied, undone: true } } : message));
    };

    return <>
        <button ref={triggerRef} type="button" aria-label={t.chat.openLabel} onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 rounded-full bg-[#c5a059] p-4 text-white shadow-lg hover:bg-[#9a7b35] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"><MessageCircle className="h-6 w-6" /></button>
        {open && <section role="dialog" aria-modal="false" aria-label={t.chat.title} className="fixed bottom-5 right-5 z-50 flex h-[min(34rem,calc(100vh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-[#c5a05966] bg-white shadow-2xl">
            <header className="flex items-start gap-3 bg-[#fffaf0] px-4 py-3"><Bot className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#9a7b35]" /><div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-800">{t.chat.title}</h2><p className="mt-1 truncate text-xs text-slate-500">{t.chat.disclaimer}</p></div><button type="button" aria-label={t.chat.closeLabel} onClick={() => { setOpen(false); triggerRef.current?.focus(); }} className="rounded p-1 text-slate-400 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"><X className="h-4 w-4" /></button></header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
                {messages.length === 0 && <p className="text-sm text-slate-500">{t.chat.emptyState}</p>}
                {messages.map((message, index) => {
                    const computed = message.toolCalls?.filter(call => call.name !== 'set_inputs') ?? [];
                    return <div key={`${index}-${message.role}`} className={`rounded-lg px-3 py-2 text-sm ${message.role === 'user' ? 'ml-8 bg-[#fffaf0] text-slate-700' : 'mr-4 bg-slate-50 text-slate-700'}`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.applied && <div className="mt-2 rounded border border-[#c5a05933] bg-white px-2 py-1.5 text-xs text-slate-600">
                            <p className="font-semibold">{t.chat.changed}</p>
                            {Object.keys(message.applied.previous).map(field => <p key={field}>{field}: {String(message.applied?.previous[field])} → {String(message.applied?.patch[field])}</p>)}
                            {message.applied.undone
                                ? <p className="mt-1 text-slate-400">{t.chat.undone}</p>
                                : <button type="button" onClick={() => undo(index)} className="mt-1 flex items-center gap-1 font-semibold text-[#9a7b35] underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"><Undo2 className="h-3 w-3" />{t.chat.undo}</button>}
                        </div>}
                        {computed.length ? <p className="mt-2 text-xs text-slate-400">{t.chat.computedVia}: {computed.map(call => call.name).join(', ')}</p> : null}
                    </div>;
                })}
                {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error === 'unavailable' ? t.chat.errorUnavailable : t.chat.errorGeneric} <button type="button" disabled={busy} onClick={() => { const last = messages[messages.length - 1]; if (last?.role === 'user') void send(last.content, true); }} className="ml-2 font-semibold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] disabled:opacity-50">{t.chat.retry}</button></div>}
                {busy && <div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" />{t.chat.thinking}</div>}
            </div>
            <form onSubmit={event => { event.preventDefault(); void send(draft); }} className="flex gap-2 border-t border-slate-100 p-3"><label htmlFor="chat-input" className="sr-only">{t.chat.inputLabel}</label><input id="chat-input" value={draft} onChange={event => setDraft(event.target.value)} disabled={busy} placeholder={t.chat.placeholder} className="min-w-0 flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]" /><button type="submit" aria-label={t.chat.send} disabled={busy || draft.trim().length === 0} className="rounded bg-[#c5a059] p-2 text-white hover:bg-[#9a7b35] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]"><Send className="h-4 w-4" /></button></form>
        </section>}
    </>;
};
