import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Bot, Loader2, Send, Key, AlertCircle } from 'lucide-react';
import { ProjectionData, formatCurrency } from '../utils/calculations';

interface GeminiAnalysisProps {
    projectionData: ProjectionData[];
    lang: 'en' | 'zh_hk' | 'zh_cn';
    roi: number;
    netEquity: number;
    leverageLTV: number;
    bondYield: number;
    hibor: number;
}

const GeminiAnalysis: React.FC<GeminiAnalysisProps> = ({
    projectionData,
    lang,
    roi,
    netEquity,
    leverageLTV,
    bondYield,
    hibor
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState<string>('');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for environment variable
        const envKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (envKey) {
            setApiKey(envKey);
        } else {
            const storedKey = localStorage.getItem('gemini_api_key');
            if (storedKey) setApiKey(storedKey);
        }
    }, []);

    const handleSaveKey = (key: string) => {
        setApiKey(key);
        localStorage.setItem('gemini_api_key', key);
        setShowKeyInput(false);
    };

    const generatePrompt = () => {
        const dataSummary = {
            roi: roi.toFixed(2) + '%',
            netEquityAtY30: formatCurrency(netEquity),
            leverageLTV: leverageLTV + '%',
            bondYield: bondYield + '%',
            currentHibor: hibor + '%',
            year10NetEquity: formatCurrency(projectionData[10]?.netEquity || 0),
            year20NetEquity: formatCurrency(projectionData[20]?.netEquity || 0),
        };

        const prompts = {
            en: `You are a private wealth consultant analysis AI. Analyze this Premium Financing proposal:
      - ROI: ${dataSummary.roi}
      - projected Net Equity (Y30): ${dataSummary.netEquityAtY30}
      - Leverage: ${dataSummary.leverageLTV}
      - Bond Yield: ${dataSummary.bondYield}
      - Cost of Fund (HIBOR): ${dataSummary.currentHibor}
      
      Please provide a "Total Solution" analysis including:
      1. Strategy Strengths
      2. Key Risks (Rate risk, periodic performance)
      3. Suitability for High Net Worth clients.
      Keep it concise, professional, and within 200 words.`,

            zh_hk: `你是一位私人財富管理顧問 AI。請分析這份保費融資方案：
      - 投資回報率 (ROI): ${dataSummary.roi}
      - 第30年預期淨權益: ${dataSummary.netEquityAtY30}
      - 槓桿比率 (LTV): ${dataSummary.leverageLTV}
      - 債券收益率: ${dataSummary.bondYield}
      - 融資成本 (HIBOR): ${dataSummary.currentHibor}
      
      請提供一個「全方位解決方案」分析，包括：
      1. 策略優勢
      2. 主要風險（利率風險、週期性表現）
      3. 對高淨值客戶的適用性分析。
      請保持簡潔、專業，並控制在 300 字以內。使用繁體中文（香港）。`,

            zh_cn: `你是一位私人财富管理顾问 AI。请分析这份保费融资方案：
      - 投资回报率 (ROI): ${dataSummary.roi}
      - 第30年预期净权益: ${dataSummary.netEquityAtY30}
      - 杠杆比率 (LTV): ${dataSummary.leverageLTV}
      - 债券收益率: ${dataSummary.bondYield}
      - 融资成本 (HIBOR): ${dataSummary.currentHibor}
      
      请提供一个“全方位解决方案”分析，包括：
      1. 策略优势
      2. 主要风险（利率风险、周期性表现）
      3. 对高净值客户的适用性分析。
      请保持简洁、专业，并控制在 300 字以内。使用简体中文。`
        };

        return prompts[lang] || prompts['en'];
    };

    const handleAnalyze = async () => {
        if (!apiKey) {
            setShowKeyInput(true);
            return;
        }

        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const prompt = generatePrompt();
            const result = await model.generateContent(prompt);
            const output = result.response.text();

            setResponse(output);
        } catch (err: any) {
            console.error("Gemini Error:", err);
            setError(err.message || "Failed to generate analysis. Check API Key.");
            if (err.message && (err.message.includes("API key") || err.message.includes("403"))) {
                setShowKeyInput(true); // Re-prompt if key is invalid
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Messages / Modal */}
            <div className={`pointer-events-auto bg-white border border-slate-200 shadow-2xl rounded-xl w-80 mb-4 overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 h-0 mb-0'}`}>
                <div className="bg-[#020617] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <Bot className="w-5 h-5 text-[#c5a059]" />
                        <span className="font-serif font-medium">AI Strategy Consultant</span>
                    </div>
                    {/* Settings / Key */}
                    <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-slate-400 hover:text-white">
                        <Key className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 max-h-[400px] overflow-y-auto">
                    {showKeyInput && (
                        <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200">
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Gemini API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter API Key..."
                                    className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                                />
                                <button
                                    onClick={() => handleSaveKey(apiKey)}
                                    className="bg-[#020617] text-white px-3 py-1 rounded text-xs"
                                >
                                    Save
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1">Key is stored locally in your browser.</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded mb-3 flex gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-[#c5a059] animate-spin mb-2" />
                            <span className="text-xs text-slate-500 animate-pulse">Analyzing Portfolio Strategy...</span>
                        </div>
                    ) : response ? (
                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {response}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-slate-500 text-sm">
                            Ready to analyze your current financing strategy?
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="w-full bg-[#c5a059] hover:bg-[#b45309] text-white py-2 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : (
                            <>
                                <Send className="w-4 h-4" />
                                Generate Analysis
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto w-14 h-14 bg-[#020617] rounded-full shadow-xl flex items-center justify-center text-[#c5a059] hover:scale-105 transition-transform group"
            >
                <Bot className={`w-8 h-8 transition-transform ${isOpen ? 'rotate-12' : 'group-hover:rotate-12'}`} />
            </button>
        </div>
    );
};

export default GeminiAnalysis;
