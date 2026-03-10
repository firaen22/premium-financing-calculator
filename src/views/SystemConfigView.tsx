import React from 'react';
import { Server, Link as LinkIcon, CheckCircle2, Clock, Loader2, RefreshCw, Play, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { ToggleField } from '../components/ui/ToggleField';

interface SystemConfigViewProps {
    t: any;
    dataSource: 'live' | 'cached' | 'fallback' | 'manual';
    setDataSource: (source: 'live' | 'manual') => void;
    isFetchingRates: boolean;
    lastRateUpdate: Date | null;
    batchStatus: 'idle' | 'running' | 'success';
    batchLogs: string[];
    batchProgress: number;
    runBatch: () => void;
    globalMinSpread: number;
    setGlobalMinSpread: (val: number) => void;
    globalMaxLTV: number;
    setGlobalMaxLTV: (val: number) => void;
    regulatoryMode: string;
    setRegulatoryMode: (val: string) => void;
    autoHedging: boolean;
    setAutoHedging: (val: boolean) => void;
}

export const SystemConfigView = ({
    t,
    dataSource,
    setDataSource,
    isFetchingRates,
    lastRateUpdate,
    batchStatus,
    batchLogs,
    batchProgress,
    runBatch,
    globalMinSpread,
    setGlobalMinSpread,
    globalMaxLTV,
    setGlobalMaxLTV,
    regulatoryMode,
    setRegulatoryMode,
    autoHedging,
    setAutoHedging
}: SystemConfigViewProps) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Card title={t.dataFeeds} subtitle="Market Data Integration">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Server className="w-5 h-5 text-slate-600" />
                                <h4 className="text-sm font-bold text-slate-800">HIBOR Source</h4>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${dataSource === 'live' ? 'bg-emerald-100 text-emerald-700' : dataSource === 'cached' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                {dataSource === 'cached' ? 'Live' : dataSource} Mode
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            Select the primary source for Interbank rates. 'Live' pulls from the active HKMA Open API integration. 'Manual' allows override for scenario planning.
                        </p>
                        <SelectField
                            label="Primary Feed"
                            value={dataSource === 'cached' ? 'live' : dataSource}
                            onChange={(val: any) => setDataSource(val === 'live' ? 'live' : 'manual')}
                            options={[{ value: 'live', label: 'HKMA (Open API)' }, { value: 'manual', label: 'Manual Input' }]}
                        />

                        {(dataSource === 'live' || dataSource === 'cached' || dataSource === 'fallback') && (
                            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <LinkIcon className="w-3 h-3" />
                                        <span className="font-bold">{t.sourceUrl}</span>
                                    </div>
                                    <a href="https://api.hkma.gov.hk" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#c5a059] hover:underline truncate max-w-[150px]">
                                        api.hkma.gov.hk
                                    </a>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span className="font-bold">{t.cachingStatus}</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-600 font-mono">
                                        {isFetchingRates ? 'Syncing...' : dataSource === 'cached' ? 'Cached (LocalStorage)' : 'Live (HKMA)'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <Clock className="w-3 h-3" />
                                        <span className="font-bold">Data Date</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {lastRateUpdate ? lastRateUpdate.toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Server className="w-5 h-5 text-slate-600" />
                                    <h4 className="text-sm font-bold text-slate-800">Nightly Batch</h4>
                                </div>
                                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${batchStatus === 'running' ? 'bg-blue-100 text-blue-700' : batchStatus === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {batchStatus === 'idle' ? 'Idle' : batchStatus === 'running' ? 'Running' : 'Completed'}
                                </span>
                            </div>

                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Automated overnight processing tasks. Execute manually if needed for off-cycle updates.
                            </p>

                            {batchStatus !== 'idle' && (
                                <div className="mb-4 bg-slate-900 rounded p-3 font-mono text-[10px] text-emerald-400 h-32 overflow-y-auto border border-slate-800">
                                    {batchLogs.map((log, i) => (
                                        <div key={i} className="mb-1 opacity-90">{log}</div>
                                    ))}
                                    {batchStatus === 'running' && (
                                        <div className="animate-pulse">_</div>
                                    )}
                                </div>
                            )}

                            {batchStatus === 'running' && (
                                <div className="w-full bg-slate-200 rounded-full h-1.5 mb-4 overflow-hidden">
                                    <div className="bg-[#c5a059] h-1.5 rounded-full transition-all duration-500" style={{ width: `${batchProgress}%` }}></div>
                                </div>
                            )}

                            <button
                                onClick={runBatch}
                                disabled={batchStatus === 'running'}
                                className={`w-full py-2 px-4 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${batchStatus === 'running'
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-[#c5a059] hover:text-[#c5a059]'
                                    }`}
                            >
                                {batchStatus === 'running' ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Processing...
                                    </>
                                ) : batchStatus === 'success' ? (
                                    <>
                                        <RefreshCw className="w-3 h-3" />
                                        Re-Run Batch
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-3 h-3" />
                                        Run Manually
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            <Card title={t.riskLimits} subtitle="Bank-wide Controls">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField
                        label={t.globalMinSpread}
                        value={globalMinSpread}
                        onChange={setGlobalMinSpread}
                        step={0.05}
                        suffix="%"
                    />
                    <InputField
                        label={t.globalMaxLtv}
                        value={globalMaxLTV}
                        onChange={setGlobalMaxLTV}
                        step={1}
                        suffix="%"
                    />
                </div>
                <div className="mt-2 p-4 bg-yellow-50 border border-yellow-100 rounded flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-none mt-0.5" />
                    <div>
                        <h5 className="text-xs font-bold text-yellow-800 uppercase tracking-wide mb-1">Override Warning</h5>
                        <p className="text-xs text-yellow-700 leading-relaxed">
                            Changing these global parameters will trigger a compliance review for all existing proposals currently in "Draft" status.
                        </p>
                    </div>
                </div>
            </Card>

            <Card title={t.compliance} subtitle="Jurisdiction Settings">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    <SelectField
                        label={t.regulatoryMode}
                        value={regulatoryMode}
                        onChange={setRegulatoryMode}
                        options={[{ value: 'hkma', label: 'HKMA (Hong Kong)' }, { value: 'mas', label: 'MAS (Singapore)' }, { value: 'cbirc', label: 'CBIRC (China)' }]}
                    />
                    <ToggleField
                        label={t.autoHedging}
                        checked={autoHedging}
                        onChange={setAutoHedging}
                    />
                </div>
                <div className="border-t border-slate-100 pt-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Disclaimer Preview</h4>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 font-mono leading-relaxed">
                        {regulatoryMode === 'hkma'
                            ? "This document is for High Net Worth Individuals only. The risks of borrowing to finance the purchase of an insurance policy are significant. If the value of your policy falls below a certain level, you may be called upon to pay margin."
                            : "This document is intended for Accredited Investors. Leverage involves a high degree of risk. Ensure you understand the impact of currency fluctuation and interest rate hikes on your net equity."
                        }
                    </div>
                </div>
            </Card>
        </div>
    );
};
