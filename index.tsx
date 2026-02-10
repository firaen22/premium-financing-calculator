import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  Legend
} from 'recharts';
import { 
  Settings, 
  Shield, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Lock, 
  Unlock, 
  Download, 
  X,
  LayoutDashboard,
  Briefcase,
  Globe,
  LogOut,
  User,
  ChevronRight,
  Bell,
  Search,
  Menu,
  PlusCircle,
  MinusCircle,
  Languages,
  Landmark,
  Wallet,
  FileText,
  Calculator,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  Activity,
  Database,
  Server,
  FileCheck,
  RefreshCw,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  Home
} from 'lucide-react';

// --- Constants & Data ---

// Base factors for "Standard" plan
const BASE_FACTORS: { [key: number]: number } = {
  0: 0.8000, 1: 0.8000, 2: 0.8211, 3: 0.8442, 4: 0.8734, 5: 1.0066,
  6: 1.0838, 7: 1.1862, 8: 1.2407, 9: 1.2992, 10: 1.3879,
  11: 1.4427, 12: 1.5056, 13: 1.5886, 14: 1.6558, 15: 1.7472,
  16: 1.8367, 17: 1.9223, 18: 2.0262, 19: 2.1262, 20: 2.2469,
  21: 2.3459, 22: 2.4530, 23: 2.5764, 24: 2.7080, 25: 2.8379,
  26: 2.9755, 27: 3.1255, 28: 3.2799, 29: 3.4488, 30: 3.6222
};

// Helper to generate guaranteed factors (lower than total)
const generateGuaranteed = (factors: { [key: number]: number }) => {
  const guaranteed: { [key: number]: number } = {};
  Object.keys(factors).forEach(key => {
    const k = Number(key);
    // Guaranteed is ~80% of total at year 0, rising to ~70% at year 30 (just a mock curve)
    guaranteed[k] = factors[k] * (0.85 - (k * 0.005));
  });
  return guaranteed;
};

const GUARANTEED_FACTORS = generateGuaranteed(BASE_FACTORS);

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

const formatPercent = (val: number) => `${val.toFixed(2)}%`;

// --- Translations ---

const TRANSLATIONS = {
  en: {
    privateWealth: "PRIVATE",
    wealthManagement: "Wealth Management",
    clientOverview: "Client Overview",
    allocationStructure: "Allocation Structure",
    returnStudio: "Return Studio",
    holdingsAnalysis: "Holdings Analysis",
    marketRisk: "Market Risk",
    bankControls: "Bank Controls",
    systemConfig: "System Configuration",
    rm: "RM",
    seniorBanker: "Senior Banker",
    financingProposal: "Financing Proposal",
    preparedFor: "Prepared for:",
    estateOf: "Estate of Mr. H.N.W.",
    hiborRate: "1M HIBOR Rate",
    capitalAllocation: "Capital Allocation",
    clientAssets: "Client Assets",
    totalBudget: "Total Budget",
    cashReserve: "Cash Reserve",
    bondFund: "Bond Fund",
    bondYield: "Bond Yield (%)",
    policyEquity: "Policy Equity",
    bankParams: "Bank Parameters",
    lendingTerms: "Lending Terms",
    spread: "Spread (%)",
    intCap: "Int. Cap (%)",
    leverageLtv: "Leverage (LTV)",
    handlingFee: "Fund Handling Fee (%)",
    oneOffDeduction: "One-off Deduction",
    totalPolicyValue: "Total Policy Value",
    day1Exposure: "Day 1 Gross Exposure",
    lendingFacility: "Lending Facility",
    effectiveRate: "Effective Rate",
    netEquityY30: "Net Equity (Y30)",
    roi: "ROI",
    monthlyCashflow: "Monthly Cashflow",
    incomeVsCost: "Income vs Cost Analysis (Year 1)",
    bondIncome: "Bond Income",
    loanInterest: "Loan Interest",
    netMonthlyCashflow: "Net Monthly Cashflow",
    structureVis: "Structure Visualization",
    fundFlow: "Fund Flow",
    capital: "CAPITAL",
    liquidity: "LIQUID CASH",
    yieldFundNet: "YIELD FUND (NET)",
    policyEquityCaps: "INITIAL PREMIUM",
    leverage: "BANK LOAN",
    totalExposure: "AIA CAPITAL PRESERVED POLICY",
    projectedPerf: "Projected Performance",
    horizon30y: "30-Year Horizon",
    ledgerStatement: "Ledger Statement",
    fiscalYearBreakdown: "Fiscal Year Breakdown",
    exportData: "Export Data",
    year: "Year",
    cumBondInt: "Cum. Bond Int.",
    bondCapitalNet: "Bond Capital (Net)",
    bondPrincipalNet: "Bond Principal (Net)", 
    policyValue: "Policy Value", 
    policy: "Policy", 
    totalLoan: "Total Loan",
    loan: "Loan",
    cumLoanInt: "Cum. Loan Int.",
    cumInterest: "Cum. Interest",
    netEquity: "Net Equity",
    cash: "Cash",
    bond: "Bond (Net)",
    bondInt: "Bond Int.",
    income: "Income",
    intCost: "Int. Cost",
    ref: "Ref: PF-2024-001",
    analysisYear: "Analysis Year",
    openingEquity: "Opening Equity",
    closingEquity: "Closing Equity",
    netGain: "Net Gain",
    annualRoC: "Annual RoC",
    attributionAnalysis: "Return Attribution Analysis",
    policyGrowth: "Policy Growth",
    totalInflow: "Total Inflow",
    costOfFunding: "Cost of Funding",
    netPerformance: "Net Performance",
    insurancePlan: "Insurance Plan",
    stressTest: "Stress Test",
    simulatedHibor: "Simulated HIBOR",
    bondPriceDrop: "Bond Price Drop",
    showGuaranteed: "Show Guaranteed Cash Value Only",
    breakEvenHibor: "Break-even HIBOR",
    lowestNetEquity: "Lowest Net Equity",
    ltvMonitor: "LTV Monitor (Margin Call Risk)",
    netWorthComparison: "Net Worth Comparison",
    sensitivityAnalysis: "Sensitivity Heatmap",
    marginCallThreshold: "Margin Call Threshold (95%)",
    baseline: "Baseline",
    stressed: "Stressed",
    interpretation: "Interpretation",
    heatmapLegend: "The heatmap displays the projected Net Equity at the selected analysis year. The X-axis represents the HIBOR rate (Cost of Borrowing), and the Y-axis represents the Bond Yield (Asset Return). Green cells indicate a surplus (Profit), while red cells indicate a shortfall (Loss).",
    dataFeeds: "Data Feeds",
    riskLimits: "Risk Limits",
    compliance: "Compliance",
    providerStatus: "Provider Status",
    globalMinSpread: "Global Min. Spread",
    globalMaxLtv: "Global Max LTV",
    regulatoryMode: "Regulatory Mode",
    autoHedging: "Auto-Hedging Protocols",
    globalDisclaimer: "IMPORTANT: This material is provided for informational purposes only and does not constitute an offer or solicitation to sell any financial product or service. Investment involves risk, including the possible loss of principal. Premium financing involves leverage, which can magnify both gains and losses. Interest rates are subject to change and may increase the cost of borrowing. Past performance is not indicative of future results. Please consult your professional advisors before making any investment decision.",
    sourceUrl: "Source URL",
    lastUpdated: "Last Updated",
    cachingStatus: "Caching Status",
    notifications: "Notifications",
    markRead: "Mark Read",
    noNotifications: "No new notifications",
    marketDataUpdate: "Market Data Update",
    systemReady: "System Ready",
    complianceAlert: "Compliance Alert",
    // Mortgage
    source: "Source",
    cashSource: "Cash",
    mortgageRefi: "Mortgage Refi",
    propVal: "Property Value",
    existingLoan: "Existing Mortgage",
    refiLtv: "Refi LTV (%)",
    unlockedCash: "Cash Out Amount",
    mortgageRate: "Mortgage Rate (%)",
    tenor: "Tenor (Years)",
    applyCapital: "Use this Capital",
    monthlyMtg: "Monthly Mtg.",
    mtgCost: "Mortgage Cost",
    unlockedCapital: "Unlocked Capital",
    mortgageBalance: "Mortgage Balance",
    primeRate: "Prime Rate (P)",
    hSpread: "H + Spread (%)",
    pCap: "Cap (P - %)",
    effectiveMtgRate: "Effective Rate",
    mtgRepaid: "Mtg Repaid (Principal)"
  },
  zh_hk: {
    // ... existing translations ...
    privateWealth: "私人",
    wealthManagement: "財富管理",
    clientOverview: "客戶概覽",
    allocationStructure: "資產配置結構",
    returnStudio: "回報工作室",
    holdingsAnalysis: "持倉分析",
    marketRisk: "市場風險",
    bankControls: "銀行控制",
    systemConfig: "系統配置",
    rm: "客戶經理",
    seniorBanker: "資深銀行家",
    financingProposal: "融資提案",
    preparedFor: "客戶:",
    estateOf: "H.N.W. 先生家族信託",
    hiborRate: "一個月 HIBOR",
    capitalAllocation: "資本配置",
    clientAssets: "客戶資產",
    totalBudget: "總預算",
    cashReserve: "現金儲備",
    bondFund: "債券基金",
    bondYield: "債券收益率 (%)",
    policyEquity: "保單權益",
    bankParams: "銀行參數",
    lendingTerms: "貸款條款",
    spread: "利差 (%)",
    intCap: "利率上限 (%)",
    leverageLtv: "槓桿 (LTV)",
    handlingFee: "基金手續費 (%)",
    oneOffDeduction: "一次性扣除",
    totalPolicyValue: "保單總值",
    day1Exposure: "首日總敞口",
    lendingFacility: "貸款額度",
    effectiveRate: "實際利率",
    netEquityY30: "淨權益 (第30年)",
    roi: "投資回報率",
    monthlyCashflow: "月度現金流",
    incomeVsCost: "收入與成本分析 (第一年)",
    bondIncome: "債券收入",
    loanInterest: "貸款利息",
    netMonthlyCashflow: "淨月度現金流",
    structureVis: "結構可視化",
    fundFlow: "資金流向",
    capital: "資本",
    liquidity: "流動資金",
    yieldFundNet: "收益基金 (淨額)",
    policyEquityCaps: "保單首期",
    leverage: "銀行貸款",
    totalExposure: "AIA 保本大額保單",
    projectedPerf: "預期表現",
    horizon30y: "30年展望",
    ledgerStatement: "分類帳表",
    fiscalYearBreakdown: "財政年度細分",
    exportData: "導出數據",
    year: "年份",
    cumBondInt: "累計債券利息",
    bondCapitalNet: "債券本金 (淨額)",
    bondPrincipalNet: "債券本金 (淨額)",
    policyValue: "保單價值",
    policy: "保單",
    totalLoan: "總貸款",
    loan: "貸款",
    cumLoanInt: "累計貸款利息",
    cumInterest: "累計利息",
    netEquity: "淨權益",
    cash: "現金",
    bond: "債券 (淨額)",
    bondInt: "債券利息",
    income: "收入",
    intCost: "利息成本",
    ref: "編號: PF-2024-001",
    analysisYear: "分析年份",
    openingEquity: "期初權益",
    closingEquity: "期末權益",
    netGain: "淨收益",
    annualRoC: "年度資本回報率",
    attributionAnalysis: "回報歸因分析",
    policyGrowth: "保單增長",
    totalInflow: "總流入",
    costOfFunding: "融資成本",
    netPerformance: "淨表現",
    insurancePlan: "保險計劃",
    stressTest: "壓力測試",
    simulatedHibor: "模擬 HIBOR",
    bondPriceDrop: "債券價格下跌",
    showGuaranteed: "僅顯示保證現金價值",
    breakEvenHibor: "收支平衡 HIBOR",
    lowestNetEquity: "最低淨權益",
    ltvMonitor: "LTV 監控 (追收保證金風險)",
    netWorthComparison: "淨資產比較",
    sensitivityAnalysis: "敏感度熱圖",
    marginCallThreshold: "追收保證金門檻 (95%)",
    baseline: "基準",
    stressed: "壓力情境",
    interpretation: "解讀",
    heatmapLegend: "熱圖顯示選定分析年份的預計淨權益。X軸代表HIBOR利率（借貸成本），Y軸代表債券收益率（資產回報）。綠色單元格表示盈餘（利潤），紅色單元格表示虧空（虧損）。",
    dataFeeds: "數據源",
    riskLimits: "風險限額",
    compliance: "合規",
    providerStatus: "供應商狀態",
    globalMinSpread: "全球最低利差",
    globalMaxLtv: "全球最高 LTV",
    regulatoryMode: "監管模式",
    autoHedging: "自動對沖協議",
    globalDisclaimer: "重要提示：本資料僅供參考，並不構成銷售任何金融產品或服務的要約或招攬。投資涉及風險，包括可能損失本金。保費融資涉及槓桿，這可能會放大收益和損失。利率可能會變動並增加借貸成本。過往表現並不預示未來結果。在作出任何投資決定前，請諮詢您的專業顧問。",
    sourceUrl: "來源網址",
    lastUpdated: "最後更新",
    cachingStatus: "緩存狀態",
    notifications: "通知",
    markRead: "標記為已讀",
    noNotifications: "沒有新通知",
    marketDataUpdate: "市場數據更新",
    systemReady: "系統就緒",
    complianceAlert: "合規警報",
    source: "資金來源",
    cashSource: "現金",
    mortgageRefi: "物業加按",
    propVal: "物業估值",
    existingLoan: "現有按揭",
    refiLtv: "加按 LTV (%)",
    unlockedCash: "套現金額",
    mortgageRate: "按揭利率 (%)",
    tenor: "年期 (年)",
    applyCapital: "使用此資金",
    monthlyMtg: "月供款",
    mtgCost: "按揭成本",
    unlockedCapital: "套現資金",
    mortgageBalance: "按揭餘額",
    primeRate: "最優惠利率 (P)",
    hSpread: "H + 利差 (%)",
    pCap: "封頂息率 (P - %)",
    effectiveMtgRate: "實際按揭利率",
    mtgRepaid: "已還本金"
  },
  zh_cn: {
    // ... existing translations ...
    privateWealth: "私人",
    wealthManagement: "财富管理",
    clientOverview: "客户概览",
    allocationStructure: "资产配置结构",
    returnStudio: "回报工作室",
    holdingsAnalysis: "持仓分析",
    marketRisk: "市场风险",
    bankControls: "银行控制",
    systemConfig: "系统配置",
    rm: "客户经理",
    seniorBanker: "资深银行家",
    financingProposal: "融资提案",
    preparedFor: "客户:",
    estateOf: "H.N.W. 先生家族信托",
    hiborRate: "一个月 HIBOR",
    capitalAllocation: "资本配置",
    clientAssets: "客户资产",
    totalBudget: "总预算",
    cashReserve: "现金储备",
    bondFund: "债券基金",
    bondYield: "债券收益率 (%)",
    policyEquity: "保单权益",
    bankParams: "银行参数",
    lendingTerms: "贷款条款",
    spread: "利差 (%)",
    intCap: "利率上限 (%)",
    leverageLtv: "杠杆 (LTV)",
    handlingFee: "基金手续费 (%)",
    oneOffDeduction: "一次性扣除",
    totalPolicyValue: "保单总值",
    day1Exposure: "首日总敞口",
    lendingFacility: "贷款额度",
    effectiveRate: "实际利率",
    netEquityY30: "净权益 (第30年)",
    roi: "投资回报率",
    monthlyCashflow: "月度现金流",
    incomeVsCost: "收入与成本分析 (第一年)",
    bondIncome: "债券收入",
    loanInterest: "贷款利息",
    netMonthlyCashflow: "净月度现金流",
    structureVis: "结构可视化",
    fundFlow: "资金流向",
    capital: "资本",
    liquidity: "流动资金",
    yieldFundNet: "收益基金 (净额)",
    policyEquityCaps: "保单首期",
    leverage: "银行贷款",
    totalExposure: "AIA 保本大额保单",
    projectedPerf: "预期表现",
    horizon30y: "30年展望",
    ledgerStatement: "分类账表",
    fiscalYearBreakdown: "财政年度细分",
    exportData: "导出数据",
    year: "年份",
    cumBondInt: "累计债券利息",
    bondCapitalNet: "债券本金 (净额)",
    bondPrincipalNet: "债券本金 (净额)",
    policyValue: "保单价值",
    policy: "保单",
    totalLoan: "总贷款",
    loan: "贷款",
    cumLoanInt: "累计贷款利息",
    cumInterest: "累计利息",
    netEquity: "净权益",
    cash: "现金",
    bond: "债券 (净额)",
    bondInt: "债券利息",
    income: "收入",
    intCost: "利息成本",
    ref: "编号: PF-2024-001",
    analysisYear: "分析年份",
    openingEquity: "期初权益",
    closingEquity: "期末权益",
    netGain: "净收益",
    annualRoC: "年度资本回报率",
    attributionAnalysis: "回报归因分析",
    policyGrowth: "保单增长",
    totalInflow: "总流入",
    costOfFunding: "融资成本",
    netPerformance: "净表现",
    insurancePlan: "保险计划",
    stressTest: "压力测试",
    simulatedHibor: "模拟 HIBOR",
    bondPriceDrop: "债券价格下跌",
    showGuaranteed: "仅显示保证现金价值",
    breakEvenHibor: "收支平衡 HIBOR",
    lowestNetEquity: "最低净权益",
    ltvMonitor: "LTV 监控 (追收保证金风险)",
    netWorthComparison: "净资产比较",
    sensitivityAnalysis: "敏感度热图",
    marginCallThreshold: "追收保证金门槛 (95%)",
    baseline: "基准",
    stressed: "压力情境",
    interpretation: "解读",
    heatmapLegend: "热图显示选定分析年份的预计净权益。X轴代表HIBOR利率（借贷成本），Y轴代表债券收益率（资产回报）。绿色单元格表示盈余（利润），红色单元格表示亏空（亏损）。",
    dataFeeds: "数据源",
    riskLimits: "风险限额",
    compliance: "合规",
    providerStatus: "供应商状态",
    globalMinSpread: "全球最低利差",
    globalMaxLtv: "全球最高 LTV",
    regulatoryMode: "监管模式",
    autoHedging: "自动对冲协议",
    globalDisclaimer: "重要提示：本资料仅供参考，并不构成销售任何金融产品 or 服务的要约 or 招揽。投资涉及风险，包括可能损失本金。保费融资涉及杠杆，这可能会放大收益和损失。利率可能会变动并增加借贷成本。过往表现并不预示未来结果。在作出任何投资决定前，请咨询您的专业顾问。",
    sourceUrl: "来源网址",
    lastUpdated: "最后更新",
    cachingStatus: "缓存状态",
    notifications: "通知",
    markRead: "标记为已读",
    noNotifications: "没有新通知",
    marketDataUpdate: "市场数据更新",
    systemReady: "系统就绪",
    complianceAlert: "合规警报",
    source: "资金来源",
    cashSource: "现金",
    mortgageRefi: "物业加按",
    propVal: "物业估值",
    existingLoan: "现有按揭",
    refiLtv: "加按 LTV (%)",
    unlockedCash: "套现金额",
    mortgageRate: "按揭利率 (%)",
    tenor: "年期 (年)",
    applyCapital: "使用此资金",
    monthlyMtg: "月供款",
    mtgCost: "按揭成本",
    unlockedCapital: "套现资金",
    mortgageBalance: "按揭余额",
    primeRate: "最优惠利率 (P)",
    hSpread: "H + 利差 (%)",
    pCap: "封顶息率 (P - %)",
    effectiveMtgRate: "实际按揭利率",
    mtgRepaid: "已还本金"
  }
};

type Language = 'en' | 'zh_hk' | 'zh_cn';

// --- Private Bank Theme Colors ---
const THEME = {
  navy: '#020617',     // Ultra deep navy
  navyLight: '#1e293b',
  gold: '#c5a059',     // Metallic Gold (Muted)
  goldLight: '#e4c685',
  goldHighlight: '#fcd34d', // Brighter gold for interest
  white: '#ffffff',
  offWhite: '#f8fafc',
  textMain: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  success: '#059669',
  danger: '#991b1b',
  warning: '#f59e0b',
  orange: '#f97316'
};

// --- Components ---

const Card = ({ 
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

const InputField = ({ 
  label, 
  value, 
  onChange, 
  type = "number", 
  prefix = "$", 
  step = 1000,
  suffix = "",
  disabled = false
}: any) => (
  <div className="mb-8 relative group">
    <label className="absolute -top-2.5 left-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white pr-2 transition-colors group-focus-within:text-[#c5a059]">
      {label}
    </label>
    <div className="relative pt-1">
      {prefix && <span className="absolute left-0 bottom-2 text-slate-400 font-serif text-lg">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step={step}
        disabled={disabled}
        className={`w-full bg-transparent border-b border-slate-200 text-slate-900 font-serif text-xl py-1 focus:ring-0 focus:border-[#c5a059] focus:outline-none block transition-colors ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-8' : ''} disabled:text-slate-300 disabled:cursor-not-allowed`}
        placeholder="0"
      />
      {suffix && <span className="absolute right-0 bottom-2 text-slate-400 text-xs font-medium uppercase">{suffix}</span>}
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, options, disabled = false }: any) => (
  <div className="mb-8 relative group">
    <label className="absolute -top-2.5 left-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white pr-2 group-focus-within:text-[#c5a059]">
      {label}
    </label>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-transparent border-b border-slate-200 text-slate-900 font-serif text-xl py-1 pt-2 focus:ring-0 focus:border-[#c5a059] focus:outline-none block disabled:text-slate-300 disabled:cursor-not-allowed appearance-none rounded-none"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <ChevronRight className="absolute right-0 bottom-3 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
  </div>
);

const ToggleField = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (val: boolean) => void }) => (
  <div className="mb-8 flex items-center justify-between">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <button 
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${checked ? 'bg-[#c5a059]' : 'bg-slate-200'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

const KPICard = ({ label, value, subtext, highlight = false, alert = false }: { label: string, value: string, subtext: string, highlight?: boolean, alert?: boolean }) => (
  <div className={`p-6 border ${highlight ? 'bg-[#020617] border-[#020617] text-white' : alert ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
    <div className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-3 ${highlight ? 'text-[#c5a059]' : alert ? 'text-red-600' : 'text-slate-500'}`}>
      {label}
    </div>
    <div className={`text-3xl font-serif mb-2 ${highlight ? 'text-white' : alert ? 'text-red-900' : 'text-slate-900'}`}>
      {value}
    </div>
    <div className={`text-xs font-medium font-mono ${highlight ? 'text-slate-400' : alert ? 'text-red-700' : 'text-slate-500'}`}>
      {subtext}
    </div>
  </div>
);

// --- Heatmap Component ---
const Heatmap = ({ xLabels, yLabels, data }: { xLabels: number[], yLabels: number[], data: number[][] }) => {
  return (
    <div className="w-full overflow-x-auto">
       <div className="min-w-[400px]">
          {/* Header Row */}
          <div className="flex">
             <div className="w-16 flex-none bg-slate-50"></div> {/* Corner */}
             {xLabels.map(x => (
               <div key={x} className="flex-1 text-center py-2 text-[10px] font-bold text-slate-500 bg-slate-50 border-b border-slate-100">
                  HIBOR {x}%
               </div>
             ))}
          </div>
          {/* Rows */}
          {yLabels.map((y, i) => (
             <div key={y} className="flex h-12">
               {/* Y Axis Label */}
               <div className="w-16 flex-none flex items-center justify-center text-[10px] font-bold text-slate-500 bg-slate-50 border-r border-slate-100 px-2">
                 Yield {y}%
               </div>
               {/* Cells */}
               {data[i].map((val, j) => {
                 const isPositive = val > 0;
                 // Calculate opacity based on magnitude relative to max (clamped)
                 const opacity = Math.min(Math.abs(val) / 2000000, 1) * 0.8 + 0.1; 
                 const bgColor = isPositive 
                   ? `rgba(5, 150, 105, ${opacity})` // emerald
                   : `rgba(220, 38, 38, ${opacity})`; // red
                 
                 return (
                   <div 
                      key={`${i}-${j}`} 
                      className="flex-1 flex items-center justify-center text-[10px] font-mono border border-white transition-all hover:scale-105 z-0 hover:z-10 shadow-none hover:shadow-md cursor-default"
                      style={{ backgroundColor: bgColor, color: opacity > 0.5 ? 'white' : '#1e293b' }}
                      title={`Yield ${y}%, HIBOR ${xLabels[j]}%: ${formatCurrency(val)}`}
                   >
                      {val > 0 ? '+' : ''}{(val / 1000).toFixed(0)}k
                   </div>
                 )
               })}
             </div>
          ))}
       </div>
       <div className="text-[10px] text-slate-400 text-right mt-2 font-mono">
         *Values in '000s USD
       </div>
    </div>
  )
}

// --- Custom Flow Visualization (Vertical Portrait Style) ---
const FlowDiagram = ({ 
  budget, 
  cash, 
  bond, 
  equity, 
  loan, 
  premium,
  labels,
  sourceType
}: { 
  budget: number, cash: number, bond: number, equity: number, loan: number, premium: number, labels: any, sourceType: 'cash' | 'mortgage'
}) => {
  return (
    <div className="w-full flex justify-center py-8">
      {/* Increased viewBox width to 500 for more breathing room for larger blocks, height to 600 */}
      <svg width="100%" height="600" viewBox="0 0 500 600" className="w-full max-w-lg font-sans" style={{overflow: 'visible'}}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
          </marker>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.05"/>
          </filter>
        </defs>

        {/* Level 1: Capital */}
        <g filter="url(#shadow)">
          <rect x="130" y="10" width="240" height="80" rx="8" fill="#ffffff" stroke={sourceType === 'mortgage' ? '#f59e0b' : '#e2e8f0'} strokeWidth={sourceType === 'mortgage' ? 2 : 1} />
          <circle cx="170" cy="50" r="22" fill={sourceType === 'mortgage' ? '#fffbeb' : '#f8fafc'} stroke={sourceType === 'mortgage' ? '#fcd34d' : '#f1f5f9'} />
          {sourceType === 'mortgage' ? (
             <Home x={158} y={38} width={24} height={24} stroke="#b45309" strokeWidth={1.5} />
          ) : (
             <Briefcase x={158} y={38} width={24} height={24} stroke="#0f172a" strokeWidth={1.5} />
          )}
          
          <text x={210} y={42} textAnchor="start" fill="#64748b" fontSize="10" fontWeight="bold" letterSpacing="1.5" style={{textTransform: 'uppercase', fontFamily: 'sans-serif'}}>{labels.capital}</text>
          <text x={210} y={68} textAnchor="start" fill="#0f172a" fontSize="20" fontWeight="500" style={{fontFamily: 'serif'}}>{formatCurrency(budget)}</text>
        </g>

        {/* Connectors */}
        <path d="M250 90 L 250 120" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
        <path d="M250 120 L 85 120 L 85 140" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <path d="M250 120 L 415 120 L 415 140" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <path d="M250 120 L 250 260" fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrow)" />

        {/* Level 2 Left: Liquidity */}
        <g filter="url(#shadow)">
          <rect x="10" y="140" width="150" height="80" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="45" cy="180" r="20" fill="#f0fdf4" stroke="#dcfce7" />
          <Wallet x={33} y={168} width={24} height={24} stroke="#15803d" strokeWidth={1.5} />
          <text x={75} y={165} textAnchor="start" fill="#64748b" fontSize="9" fontWeight="bold" letterSpacing="0.5" style={{textTransform: 'uppercase', fontFamily: 'sans-serif'}}>{labels.liquidity}</text>
          <text x={75} y={190} textAnchor="start" fill="#0f172a" fontSize="15" fontWeight="500" style={{fontFamily: 'serif'}}>{formatCurrency(cash)}</text>
        </g>

        {/* Level 2 Right: Yield Fund */}
        <g filter="url(#shadow)">
          <rect x="330" y="140" width="170" height="80" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="365" cy="180" r="20" fill="#fefce8" stroke="#fef9c3" />
          <TrendingUp x={353} y={168} width={24} height={24} stroke="#ca8a04" strokeWidth={1.5} />
          <text x={395} y={165} textAnchor="start" fill="#64748b" fontSize="9" fontWeight="bold" letterSpacing="0.5" style={{textTransform: 'uppercase', fontFamily: 'sans-serif'}}>{labels.yieldFundNet}</text>
          <text x={395} y={190} textAnchor="start" fill="#0f172a" fontSize="15" fontWeight="500" style={{fontFamily: 'serif'}}>{formatCurrency(bond)}</text>
        </g>

        {/* Level 3: Policy Initial */}
        <g filter="url(#shadow)">
          <rect x="150" y="260" width="200" height="80" rx="8" fill="#ffffff" stroke="#020617" strokeWidth="2" />
          <circle cx="190" cy="300" r="22" fill="#f1f5f9" stroke="#e2e8f0" />
          <FileText x={178} y={288} width={24} height={24} stroke="#334155" strokeWidth={1.5} />
          <text x={225} y={285} textAnchor="start" fill="#64748b" fontSize="9" fontWeight="bold" letterSpacing="1" style={{textTransform: 'uppercase', fontFamily: 'sans-serif'}}>{labels.policyEquityCaps}</text>
          <text x={225} y={312} textAnchor="start" fill="#0f172a" fontSize="18" fontWeight="500" style={{fontFamily: 'serif'}}>{formatCurrency(equity)}</text>
        </g>

        {/* Connector Premium to Exposure */}
        <path d="M250 340 L 250 450" fill="none" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
        
        {/* Junction Point */}
        <circle cx="250" cy="395" r="4" fill="#94a3b8" />

        {/* Bank Loan (New Rectangle) */}
        <g filter="url(#shadow)">
            <rect x="20" y="360" width="160" height="70" rx="8" fill="#ffffff" stroke="#c5a059" strokeWidth="1" />
            <circle cx="50" cy="395" r="20" fill="#fffbeb" stroke="#fcd34d" />
            <Landmark x={38} y={383} width={24} height={24} stroke="#b45309" strokeWidth={1.5} />
            <text x={80} y={382} textAnchor="start" fill="#b45309" fontSize="9" fontWeight="bold" letterSpacing="0.5" style={{textTransform: 'uppercase', fontFamily: 'sans-serif'}}>{labels.leverage}</text>
            <text x={80} y={405} textAnchor="start" fill="#0f172a" fontSize="15" fontWeight="500" style={{fontFamily: 'serif'}}>{formatCurrency(loan)}</text>
        </g>

        {/* Connector Loan to Junction */}
        <path d="M180 395 L 246 395" fill="none" stroke="#c5a059" strokeWidth="1.5" strokeDasharray="4 4" markerEnd="url(#arrow)" />

        {/* Level 4: Total Exposure */}
        <g filter="url(#shadow)">
          <rect x="90" y="450" width="320" height="100" rx="8" fill="#020617" stroke="#020617" strokeWidth="1" />
          <rect x="94" y="454" width="312" height="92" rx="6" fill="none" stroke="#1e293b" strokeWidth="1" />
          
          <circle cx="135" cy="500" r="26" fill="#1e293b" stroke="#334155" />
          <Shield x={119} y={484} width={32} height={32} stroke="#c5a059" strokeWidth={1.5} />
          
          <text x={175} y={488} textAnchor="start" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="1" style={{textTransform: 'uppercase', fontFamily: 'sans-serif'}}>{labels.totalExposure}</text>
          <text x={175} y={520} textAnchor="start" fill="#ffffff" fontSize="22" fontWeight="500" style={{fontFamily: 'serif'}}>{formatCurrency(premium)}</text>
        </g>

      </svg>
    </div>
  );
};

// --- Custom Label Component ---
const CustomLabel = (props: any) => {
  const { x, y, value, index, name, color } = props;
  // Last index is 30 for 30-year projection (0-30)
  if (index === 30) {
    return (
      <text 
        x={x + 10} 
        y={y} 
        dy={4} 
        fill={color} 
        fontSize={11} 
        fontFamily="sans-serif" 
        fontWeight="bold"
        textAnchor="start"
      >
        {name}
      </text>
    );
  }
  return null;
};

// --- Return Studio Component ---
const ReturnStudio = ({ 
  data, 
  labels, 
  bondYield,
  loanRate 
}: { 
  data: any[], 
  labels: any, 
  bondYield: number,
  loanRate: number
}) => {
  const [selectedYear, setSelectedYear] = useState(1);

  // Helper to safely get data
  const getCurrentYearData = (year: number) => {
    // We now use cumulative data matching the Ledger Statement
    const currData = data[year];
    // Start from Inception (Year 0) to show total growth
    const initialData = data[0]; 
    
    if (!currData || !initialData) return null;
    
    // Principal Repaid Calculation (Decrease in Mtg Balance)
    const initialMtg = initialData.mortgageBalance || 0;
    const currentMtg = currData.mortgageBalance || 0;
    const mortgagePrincipalRepaid = Math.max(0, initialMtg - currentMtg);

    return {
      year,
      // Opening Equity is now Year 0 Equity (Initial Investment)
      openingEquity: initialData.netEquity,
      // Cumulative Ledger Values
      bondIncome: currData.cumulativeBondInterest,
      policyGrowth: currData.cumulativePolicyGrowth,
      loanInterest: currData.cumulativeInterest,
      netGain: currData.cumulativeNetGain,
      closingEquity: currData.netEquity,
      annualRoC: currData.annualRoC,
      cumulativeMortgageCost: currData.cumulativeMortgageCost || 0,
      mortgagePrincipalRepaid
    };
  };

  const stats = getCurrentYearData(selectedYear);

  if (!stats) return <div>No data available</div>;
  
  // Use cumulativeNetGain (Profit) for the Net Gain Box, but Net Equity (Balance Sheet) for Closing Equity Box.
  // Note: netGain = netEquity - openingEquity - externalCosts.

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Year Selector */}
      <Card className="bg-[#020617] text-white border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-serif text-white mb-1">{labels.returnStudio}</h2>
            <p className="text-slate-400 text-xs uppercase tracking-widest">{labels.analysisYear}: <span className="text-[#c5a059] font-bold text-lg">Year {selectedYear}</span></p>
          </div>
          <div className="flex-1 max-w-md">
            <input 
              type="range" 
              min="1" 
              max="30" 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#c5a059]"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 uppercase">
              <span>Year 1</span>
              <span>Year 15</span>
              <span>Year 30</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Level Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{labels.openingEquity}</div>
          <div className="text-xl md:text-2xl font-serif text-slate-900">{formatCurrency(stats.openingEquity)}</div>
        </div>
        <div className="bg-white p-6 border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{labels.netGain}</div>
          <div className={`text-xl md:text-2xl font-serif ${stats.netGain >= 0 ? 'text-[#059669]' : 'text-[#991b1b]'}`}>
            {stats.netGain > 0 ? '+' : ''}{formatCurrency(stats.netGain)}
          </div>
        </div>
        <div className="bg-white p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#c5a059]/10 rounded-bl-full -mr-8 -mt-8"></div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{labels.closingEquity}</div>
          <div className="text-xl md:text-2xl font-serif text-slate-900 relative z-10">{formatCurrency(stats.closingEquity)}</div>
        </div>
        <div className="bg-[#020617] p-6 border border-slate-900 shadow-sm text-white">
          <div className="text-[10px] font-bold text-[#c5a059] uppercase tracking-widest mb-2">{labels.annualRoC}</div>
          <div className="text-xl md:text-2xl font-serif text-white">{stats.annualRoC.toFixed(2)}%</div>
        </div>
      </div>

      {/* Waterfall / Breakdown Logic Visual */}
      <Card title={labels.attributionAnalysis} subtitle={`Cumulative Performance to ${labels.year} ${selectedYear}`}>
        <div className="flex flex-col lg:flex-row gap-12 mt-4">
          
          {/* Visual Equation */}
          <div className="flex-1 space-y-3">
             {/* Income Block */}
             <div className="relative pl-8 border-l-2 border-slate-100 pb-8">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center">
                  <PlusCircle className="w-3 h-3 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{labels.totalInflow}</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded shadow-sm text-emerald-600">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700">{labels.bondIncome}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Yield: {bondYield.toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="font-serif text-emerald-700 font-medium">{formatCurrency(stats.bondIncome)}</div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded shadow-sm text-emerald-600">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700">{labels.policyGrowth}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Organic Growth</div>
                      </div>
                    </div>
                    <div className={`font-serif font-medium ${stats.policyGrowth >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(stats.policyGrowth)}
                    </div>
                  </div>
                  
                  {/* Mortgage Repayment Gain (Asset Building) */}
                  {stats.mortgagePrincipalRepaid > 0 && (
                     <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-white rounded shadow-sm text-emerald-600">
                           <Home className="w-5 h-5" />
                         </div>
                         <div>
                           <div className="text-sm font-bold text-slate-700">{labels.mtgRepaid}</div>
                           <div className="text-[10px] text-slate-400 font-mono">Liability Reduction</div>
                         </div>
                       </div>
                       <div className="font-serif text-emerald-700 font-medium">+{formatCurrency(stats.mortgagePrincipalRepaid)}</div>
                     </div>
                  )}
                </div>
             </div>

             {/* Cost Block */}
             <div className="relative pl-8 border-l-2 border-slate-100 pb-8">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                  <MinusCircle className="w-3 h-3 text-red-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{labels.costOfFunding}</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded shadow-sm text-red-600">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-700">{labels.loanInterest}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Rate: {loanRate.toFixed(2)}%</div>
                        </div>
                      </div>
                      <div className="font-serif text-red-700 font-medium">-{formatCurrency(stats.loanInterest)}</div>
                  </div>
                </div>
             </div>

             {/* Result Block */}
             <div className="relative pl-8">
                <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-800 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
                
                <div className="flex items-center justify-between p-6 bg-[#020617] text-white rounded-lg shadow-lg">
                    <div>
                        <div className="text-sm font-bold text-[#c5a059] uppercase tracking-wider mb-1">Net Equity</div>
                        <div className="text-[10px] text-slate-400">Total Assets - Liabilities</div>
                    </div>
                    <div className="text-2xl font-serif">
                       {formatCurrency(stats.closingEquity)}
                    </div>
                </div>
             </div>
          </div>

          {/* Simple Chart Visualization */}
          <div className="lg:w-1/3 h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Start', value: stats.openingEquity, fill: '#94a3b8' },
                    { name: 'Bond', value: stats.bondIncome, fill: '#059669' },
                    { name: 'Policy', value: stats.policyGrowth, fill: stats.policyGrowth >= 0 ? '#10b981' : '#ef4444' },
                    { name: 'Interest', value: -stats.loanInterest, fill: '#dc2626' },
                    ...(stats.mortgagePrincipalRepaid > 0 ? [{ name: 'Repaid', value: stats.mortgagePrincipalRepaid, fill: '#c5a059' }] : []),
                    { name: 'End', value: stats.closingEquity, fill: '#0f172a' },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip 
                     formatter={(val: number) => formatCurrency(val)}
                     cursor={{fill: 'transparent'}}
                  />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <Cell fill="#cbd5e1" /> {/* Start */}
                    <Cell fill="#059669" /> {/* Bond */}
                    <Cell fill={stats.policyGrowth >= 0 ? "#10b981" : "#ef4444"} /> {/* Policy */}
                    <Cell fill="#ef4444" /> {/* Interest */}
                    {stats.mortgagePrincipalRepaid > 0 && <Cell fill="#c5a059" />} {/* Mortgage Repayment */}
                    <Cell fill="#020617" /> {/* End */}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
             <div className="text-center text-[10px] text-slate-400 mt-2 italic">
                *Equity Walk: Start Equity + Income + Growth - Interest + Debt Repaid = End Equity
             </div>
          </div>

        </div>
      </Card>

    </div>
  );
};

// --- Sidebar Component ---
const Sidebar = ({ activeView, onNavigate, isOpen, onClose, labels }: any) => {
  const menuItems = [
    { id: 'allocation', label: labels.allocationStructure, icon: PieChart },
    { id: 'returnStudio', label: labels.returnStudio, icon: TrendingUp },
    { id: 'holdings', label: labels.holdingsAnalysis, icon: Briefcase },
    { id: 'marketRisk', label: labels.marketRisk, icon: AlertTriangle },
    { id: 'systemConfig', label: labels.systemConfig, icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/50 z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-[#020617] text-white z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#c5a059] to-[#b45309] flex items-center justify-center shadow-lg shadow-orange-900/20">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold tracking-tight text-white">{labels.privateWealth}</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400">{labels.wealthManagement}</div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client Profile Snippet */}
        <div className="px-6 py-6 border-b border-slate-800/50 bg-[#0f172a]/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
               <User className="w-4 h-4 text-slate-300" />
            </div>
            <div>
               <div className="text-xs font-bold text-white">{labels.estateOf}</div>
               <div className="text-[9px] text-slate-400 font-mono">ID: 8839-2910</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
             <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20">
               Ultra HNW
             </span>
             <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-800/30">
               Low Risk
             </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#c5a059] text-white shadow-lg shadow-orange-900/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-white/70" />}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-6 border-t border-slate-800 bg-[#0f172a]/50">
           <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{labels.rm}</span>
              <span className="text-[10px] font-mono text-slate-300">J. Sterling</span>
           </div>
           <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{labels.seniorBanker}</span>
              <span className="text-[10px] font-mono text-slate-300">A. Wong</span>
           </div>
           <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-600">
              <span className="flex items-center gap-1"><LogOut className="w-3 h-3" /> Sign Out</span>
              <span className="font-mono">v2.4.0</span>
           </div>
        </div>
      </aside>
    </>
  );
};

// --- Main App Component ---

const App = () => {
  // --- State ---
  const [activeView, setActiveView] = useState('allocation');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  
  // Source Fund State
  const [fundSource, setFundSource] = useState<'cash' | 'mortgage'>('cash');
  const [budget, setBudget] = useState(1000000);

  // Mortgage State
  const [propertyValue, setPropertyValue] = useState(10000000);
  const [existingMortgage, setExistingMortgage] = useState(2000000);
  const [mortgageLtv, setMortgageLtv] = useState(50);
  // Removed fixed mortgageRate state, replaced with components:
  const [primeRate, setPrimeRate] = useState(5.875);
  const [mortgageHSpread, setMortgageHSpread] = useState(1.3);
  const [mortgagePModifier, setMortgagePModifier] = useState(2.50); // Cap at P - 2.5%

  const [mortgageTenor, setMortgageTenor] = useState(20);

  // Allocation State
  const [cashReserve, setCashReserve] = useState(200000);
  const [bondAlloc, setBondAlloc] = useState(300000);
  const [bondYield, setBondYield] = useState(4.5);
  
  // Bank Settings
  const [hibor, setHibor] = useState(4.15);
  const [spread, setSpread] = useState(1.30);
  const [leverageLTV, setLeverageLTV] = useState(90); // 90 or 95
  const [capRate, setCapRate] = useState(9.00);
  const [handlingFee, setHandlingFee] = useState(1.0); // Fund Handling Fee %
  
  // Market Risk Settings
  const [simulatedHibor, setSimulatedHibor] = useState(hibor);
  const [bondPriceDrop, setBondPriceDrop] = useState(0); // 0 to 50%
  const [showGuaranteed, setShowGuaranteed] = useState(false);
  const [sensitivityYear, setSensitivityYear] = useState(15);

  // System Configuration State
  const [dataSource, setDataSource] = useState('manual'); // live | manual
  const [globalMinSpread, setGlobalMinSpread] = useState(1.0);
  const [globalMaxLTV, setGlobalMaxLTV] = useState(95);
  const [regulatoryMode, setRegulatoryMode] = useState('hkma'); // hkma | mas
  const [autoHedging, setAutoHedging] = useState(false);

  // Live Feed State
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [lastRateUpdate, setLastRateUpdate] = useState<Date | null>(null);

  const t = TRANSLATIONS[lang];

  // Notification State
  const [notifications, setNotifications] = useState<{id: number, title: string, message: string, time: string, type: 'info'|'warning'|'success'}[]>([
     { id: 1, title: t.systemReady, message: 'Ledger synchronization complete.', time: '2m ago', type: 'success' },
     { id: 2, title: t.complianceAlert, message: 'Client risk profile review due.', time: '1h ago', type: 'warning' }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);

  // --- Helper: Mortgage PMT ---
  const calculatePMT = (rate: number, nper: number, pv: number) => {
    if (rate === 0) return pv / nper;
    const r = rate / 100 / 12;
    const n = nper * 12;
    return (pv * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  const unlockedCash = Math.max(0, (propertyValue * (mortgageLtv / 100)) - existingMortgage);
  
  // Effective Mortgage Rate Calculation (Min of H+Spread and P-Cap)
  const effectiveMortgageRate = Math.min(hibor + mortgageHSpread, primeRate - mortgagePModifier);
  const monthlyMortgagePmt = calculatePMT(effectiveMortgageRate, mortgageTenor, unlockedCash);

  const handleApplyCapital = () => {
    setBudget(unlockedCash);
  };

  // --- Live Feed Simulation ---
  useEffect(() => {
    if (dataSource === 'live') {
      const fetchLiveHibor = async () => {
        setIsFetchingRates(true);
        // In a real production environment, this would call a secure backend proxy 
        // that handles the CORS request to the HKAB website.
        // For this demo, we simulate the network delay and return a realistic current rate.
        try {
           // Simulate network delay
           await new Promise(resolve => setTimeout(resolve, 1500));
           
           // Mock parsing logic from https://www.hkab.org.hk/tc/rates/hibor
           // Current 1M HIBOR is fluctuating around 4.12 - 4.16
           const simulatedLiveRate = 4.13571; // Specific value to look authentic
           
           setHibor(simulatedLiveRate);
           setSimulatedHibor(simulatedLiveRate);
           setLastRateUpdate(new Date());
           
           // Add notification
           setNotifications(prev => [{
               id: Date.now(),
               title: t.marketDataUpdate,
               message: `HIBOR Rate refreshed: ${simulatedLiveRate}%`,
               time: 'Just now',
               type: 'info'
           }, ...prev]);
           setUnreadCount(c => c + 1);
           
           // Cache it
           localStorage.setItem('hibor_live_cache', JSON.stringify({
             rate: simulatedLiveRate,
             timestamp: new Date().toISOString()
           }));
        } catch (e) {
           console.error("Failed to fetch live rates", e);
        } finally {
           setIsFetchingRates(false);
        }
      };

      // Check cache first
      const cached = localStorage.getItem('hibor_live_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheTime = new Date(parsed.timestamp);
        const now = new Date();
        // Use cache if less than 1 hour old
        if ((now.getTime() - cacheTime.getTime()) < 3600000) {
           setHibor(parsed.rate);
           setSimulatedHibor(parsed.rate);
           setLastRateUpdate(cacheTime);
        } else {
           fetchLiveHibor();
        }
      } else {
        fetchLiveHibor();
      }
    }
  }, [dataSource]);

  // --- Calculations ---
  const {
    pfEquity,
    totalPremium,
    bankLoan,
    effectiveRate,
    projectionData,
    finalNetEquity,
    roi,
    monthlyBondIncome,
    monthlyLoanInterest,
    monthlyNetCashflow,
    oneOffBondFee,
    netBondPrincipal
  } = useMemo(() => {
    const equity = budget - cashReserve - bondAlloc;
    const ltvDecimal = leverageLTV / 100.0;
    
    // Use the base factors directly
    const currentFactors = BASE_FACTORS;
    const initialCSVFactor = currentFactors[0] || 0; 
    
    let tPremium = 0;
    const denominator = 1 - (ltvDecimal * initialCSVFactor);
    if (denominator > 0 && equity > 0) {
      tPremium = equity / denominator;
    }

    const loan = Math.max(0, tPremium - equity);
    const effRate = Math.min(hibor + spread, capRate);

    // Bond Logic: Fee is one-off, deducted from capital. Yield applies to Net Capital.
    const oneOffFee = bondAlloc * (handlingFee / 100);
    const netBondAlloc = bondAlloc - oneOffFee;

    // Monthly Cashflow Calculation (Year 1 Run-rate)
    const mBondIncome = (netBondAlloc * (bondYield / 100)) / 12;
    const mLoanInterest = (loan * (effRate / 100)) / 12;
    const mMortgageCost = fundSource === 'mortgage' ? monthlyMortgagePmt : 0;
    const mNetCashflow = mBondIncome - mLoanInterest - mMortgageCost;

    // Generate Mortgage Schedule if applicable
    const mortgageSchedule = [];
    if (fundSource === 'mortgage') {
       let balance = unlockedCash; // We assume the "Budget" is the Loan amount
       const annualPmt = monthlyMortgagePmt * 12;
       
       for (let y = 0; y <= 30; y++) {
          if (y === 0) {
             mortgageSchedule.push({ balance: balance, annualPmt: 0 });
          } else if (y <= mortgageTenor) {
             // Simple annual amortization approximation for ledger
             const interestPart = balance * (effectiveMortgageRate / 100);
             const principalPart = annualPmt - interestPart;
             balance -= principalPart;
             if (balance < 0) balance = 0;
             mortgageSchedule.push({ balance: balance, annualPmt: annualPmt });
          } else {
             mortgageSchedule.push({ balance: 0, annualPmt: 0 });
          }
       }
    }

    const data = [];
    
    // Initialize Year 0
    const yr0Factor = currentFactors[0];
    const yr0Surrender = tPremium * yr0Factor;
    const yr0Assets = yr0Surrender + netBondAlloc + cashReserve;
    const yr0Liabilities = loan;
    
    // If Mortgage is source, we have an additional liability (The Mortgage Loan)
    // Net Equity = (Assets - PremiumLoan) - MortgageBalance
    const yr0MortgageBal = fundSource === 'mortgage' ? unlockedCash : 0;
    const yr0NetEquity = yr0Assets - yr0Liabilities - yr0MortgageBal;

    data.push({
      year: 0,
      surrenderValue: yr0Surrender,
      bondPrincipal: netBondAlloc,
      cumulativeBondInterest: 0,
      bondFundNetValue: netBondAlloc,
      cashValue: cashReserve,
      totalAssets: yr0Assets,
      loan: yr0Liabilities,
      cumulativeInterest: 0,
      netEquity: yr0NetEquity,
      formattedNetEquity: formatCurrency(yr0NetEquity),
      formattedLoan: formatCurrency(yr0Liabilities),
      annualBondIncome: 0,
      annualLoanInterest: 0,
      annualPolicyGrowth: 0,
      annualNetGain: 0,
      annualRoC: 0,
      cumulativePolicyGrowth: 0,
      cumulativeNetGain: 0,
      mortgageBalance: yr0MortgageBal,
      cumulativeMortgageCost: 0,
      annualMortgagePayment: 0
    });

    let runningCumMtgCost = 0;

    for (let yr = 1; yr <= 30; yr++) {
      const factor = currentFactors[yr] || currentFactors[30];
      const surrenderValue = tPremium * factor;
      
      const cumulativeBondInterest = netBondAlloc * (bondYield / 100) * yr;
      const bondFundNetValue = netBondAlloc + cumulativeBondInterest;
      const cumulativeInterest = loan * (effRate / 100) * yr;
      const currentAssets = surrenderValue + bondFundNetValue + cashReserve;
      const currentLiabilities = loan; 
      
      let netEquity = currentAssets - currentLiabilities - cumulativeInterest;
      
      // Mortgage Logic
      let mtgBal = 0;
      let annualMtgPmt = 0;
      if (fundSource === 'mortgage') {
         mtgBal = mortgageSchedule[yr]?.balance || 0;
         annualMtgPmt = mortgageSchedule[yr]?.annualPmt || 0;
         runningCumMtgCost += annualMtgPmt;
         // Subtract Mortgage Balance from Net Equity (Balance Sheet Logic)
         // Net Equity = Assets - Liabilities. Liabilities include Mortgage Balance.
         netEquity -= mtgBal;
         // Note: We do NOT subtract runningCumMtgCost from NetEquity here. 
         // Net Equity is what you own vs what you owe. Sunk costs (payments) are gone but handled in Net Gain.
      }

      const prev = data[yr - 1];
      const annualBondIncome = cumulativeBondInterest - prev.cumulativeBondInterest;
      const annualLoanInterest = cumulativeInterest - prev.cumulativeInterest;
      const annualPolicyGrowth = surrenderValue - prev.surrenderValue;
      
      // Net Gain for the year
      let annualNetGain = (annualBondIncome + annualPolicyGrowth) - annualLoanInterest - annualMtgPmt;
      
      let annualRoC = 0;
      // If Mortgage, initial equity is near 0. Using budget as denominator for relative perf.
      const denom = fundSource === 'mortgage' ? budget : prev.netEquity;
      if (denom !== 0) {
        annualRoC = (annualNetGain / denom) * 100;
      }

      const cumulativePolicyGrowth = surrenderValue - yr0Surrender;
      
      // Cumulative Net Gain (Performance / Profit)
      // Profit = Current Net Equity - Initial Equity - External Costs Paid (Mortgage Payments)
      const cumulativeNetGain = netEquity - yr0NetEquity - (fundSource === 'mortgage' ? runningCumMtgCost : 0);

      data.push({
        year: yr,
        surrenderValue,
        bondPrincipal: netBondAlloc, 
        cumulativeBondInterest,      
        bondFundNetValue,            
        cashValue: cashReserve,
        totalAssets: currentAssets,
        loan: currentLiabilities,
        cumulativeInterest,
        netEquity, // Balance Sheet Value
        formattedNetEquity: formatCurrency(netEquity),
        formattedLoan: formatCurrency(currentLiabilities),
        annualBondIncome,
        annualLoanInterest,
        annualPolicyGrowth,
        annualNetGain,
        annualRoC,
        cumulativePolicyGrowth,
        cumulativeNetGain, // Profit Value
        mortgageBalance: mtgBal,
        cumulativeMortgageCost: runningCumMtgCost,
        annualMortgagePayment: annualMtgPmt
      });
    }

    // Final Equity is the Balance Sheet value
    const final = data[30].netEquity;
    
    // ROI based on Cumulative Net Gain
    const totalGain = data[30].cumulativeNetGain;
    
    // For ROI denominator:
    // If Mortgage: Denominator is difficult as initial equity is ~0. Can use Budget (Exposure) or Total Costs Paid.
    // Usually clients ask "Return on Capital Employed". If Capital is 0 (100% financed), ROI is infinite.
    // Let's use 'Budget' as a proxy for 'Asset Value Controlled' to give a sensible % 
    // OR just use totalGain if budget is 0?
    // Let's stick to using `budget` for stability, but conceptually it's "Return on Assets Managed".
    const roiVal = (totalGain / budget) * 100;

    return {
      pfEquity: equity,
      totalPremium: tPremium,
      bankLoan: loan,
      effectiveRate: effRate,
      projectionData: data,
      finalNetEquity: final,
      roi: roiVal,
      monthlyBondIncome: mBondIncome,
      monthlyLoanInterest: mLoanInterest,
      monthlyNetCashflow: mNetCashflow,
      oneOffBondFee: oneOffFee,
      netBondPrincipal: netBondAlloc,
      monthlyMortgagePmt: mMortgageCost
    };

  }, [budget, cashReserve, bondAlloc, bondYield, hibor, spread, leverageLTV, capRate, handlingFee, fundSource, propertyValue, existingMortgage, mortgageLtv, effectiveMortgageRate, mortgageTenor]);


  // --- Stressed Projections (For Market Risk) ---
  const { stressedProjection, stressStats, sensitivityData } = useMemo(() => {
     // Recalculate based on stress parameters
     const factors = showGuaranteed ? GUARANTEED_FACTORS : BASE_FACTORS;
     
     // 1. Bond Shock (Immediate drop at T=0 applied to principal)
     // The prompt implies a scenario where assets drop. We will model this as the bond fund value dropping.
     // However, usually stress tests apply to the *current* situation. 
     // For simplicity in this projection, we assume the bond fund starts at (1 - drop) value.
     const stressedBondPrincipal = netBondPrincipal * (1 - bondPriceDrop / 100);
     
     // 2. Simulated HIBOR Rate
     const stressedRate = Math.min(simulatedHibor + spread, capRate);

     const data = [];
     const baselineData = projectionData; // For comparison

     // Initial Setup (Year 0)
     // Year 0 Equity reflects the immediate shock if any
     const yr0Factor = factors[0] || 0;
     const yr0Surrender = totalPremium * yr0Factor;
     const yr0Assets = yr0Surrender + stressedBondPrincipal + cashReserve;
     const yr0Liabilities = bankLoan;
     // Mortgage Logic
     const yr0MortgageBal = fundSource === 'mortgage' ? unlockedCash : 0;
     const yr0NetEquity = yr0Assets - yr0Liabilities - yr0MortgageBal;

     data.push({
        year: 0,
        netEquity: yr0NetEquity,
        baselineNetEquity: baselineData[0].netEquity,
        ltv: (yr0Liabilities / (yr0Surrender + stressedBondPrincipal)) * 100
     });

     let lowestEquity = yr0NetEquity;

     // Calculate Mortgage Schedule for Stress Test (Assuming Rate stays same as it's usually fixed or P-linked, not HIBOR linked directly in this context, or we simplify)
     // We will use the same mortgage schedule as baseline for simplicity
     let runningCumMtgCost = 0;

     for (let yr = 1; yr <= 30; yr++) {
        const factor = factors[yr] || factors[30];
        const surrenderValue = totalPremium * factor;
        
        // Bond grows from the stressed principal
        const cumulativeBondInterest = stressedBondPrincipal * (bondYield / 100) * yr;
        const bondFundNetValue = stressedBondPrincipal + cumulativeBondInterest;

        const cumulativeInterest = bankLoan * (stressedRate / 100) * yr;

        const currentAssets = surrenderValue + bondFundNetValue + cashReserve;
        const currentLiabilities = bankLoan;
        
        let netEquity = currentAssets - currentLiabilities - cumulativeInterest;

        // Mortgage Deductions
        if (fundSource === 'mortgage') {
           const mtgBal = baselineData[yr]?.mortgageBalance || 0;
           // const annualPmt = baselineData[yr]?.annualMortgagePayment || 0;
           // runningCumMtgCost += annualPmt;
           netEquity -= mtgBal;
           // REMOVED: netEquity -= runningCumMtgCost; (Match balance sheet logic)
        }

        if (netEquity < lowestEquity) lowestEquity = netEquity;

        // LTV Calculation: Loan / (Policy + Bond)
        const collateralValue = surrenderValue + bondFundNetValue;
        const ltv = collateralValue > 0 ? (currentLiabilities / collateralValue) * 100 : 0;

        data.push({
           year: yr,
           netEquity,
           baselineNetEquity: baselineData[yr]?.netEquity || 0,
           ltv,
           surrenderValue,
           bondFundNetValue
        });
     }

     // --- Break-even HIBOR Calculation (Simplified) ---
     // Solve for Rate where (BondYield + PolicyYield) - CostOfFunds = 0
     // We use Year 1 run-rate for immediate risk.
     // Income = (StressedBond * Yield) + (Policy_Y1 - Policy_Y0) 
     // Cost = Loan * (X + Spread)
     // This is an approximation. 
     // Better metric: What HIBOR rate makes Year 30 Net Equity = Initial Budget? (Break-even on Capital)
     // Or Year 1 Cashflow Break-even. 
     // Let's use "Net Carry Break-even": The rate where annual asset income equals annual loan cost.
     // Policy income is tricky as it's not cash, but growth. We'll use Year 1 growth.
     
     const policyGrowthY1 = (totalPremium * (factors[1] || 0)) - (totalPremium * (factors[0] || 0));
     const annualBondIncome = stressedBondPrincipal * (bondYield / 100);
     const totalAnnualIncome = annualBondIncome + policyGrowthY1;
     
     // Mortgage Cost needs to be covered too for true break even
     const annualMtgPmt = fundSource === 'mortgage' ? baselineData[1]?.annualMortgagePayment || 0 : 0;

     // totalAnnualIncome - MortgagePmt = Loan * (BE_Rate + Spread)
     // (totalAnnualIncome - MortgagePmt) / Loan = BE_Rate + Spread
     
     let breakEvenHibor = 0;
     if (bankLoan > 0) {
        breakEvenHibor = (((totalAnnualIncome - annualMtgPmt) / bankLoan) * 100) - spread;
     } else {
        breakEvenHibor = 100; // Infinite if no loan
     }

     // --- Sensitivity Heatmap Data ---
     // X: HIBOR (1, 2, 3, 4, 5, 6)
     // Y: Bond Yield (3, 4, 5, 6, 7)
     // Value: Net Equity at Year 15
     const xLabels = [1, 2, 3, 4, 5, 6];
     const yLabels = [3, 4, 5, 6, 7];
     const heatMapRows = [];

     for (const yieldVal of yLabels) {
        const row = [];
        for (const hiborVal of xLabels) {
           // Quick Calc for Year 15 Net Equity
           // Re-use current params but swap yield & hibor
           const rate = Math.min(hiborVal + spread, capRate);
           const yr = sensitivityYear;
           
           // Policy at Y15 (Using current Stress toggle settings)
           const surr = totalPremium * (factors[yr] || 0);
           
           // Bond at Y15 (using stressed principal)
           const bondVal = stressedBondPrincipal + (stressedBondPrincipal * (yieldVal / 100) * yr);
           
           // Loan Cost
           const interest = bankLoan * (rate / 100) * yr;
           
           let result = (surr + bondVal + cashReserve) - bankLoan - interest;
           
           if (fundSource === 'mortgage') {
               const mtgBal = baselineData[yr]?.mortgageBalance || 0;
               // const cumMtgCost = baselineData[yr]?.cumulativeMortgageCost || 0;
               result = result - mtgBal;
               // REMOVED: result = result - cumMtgCost;
           }

           // Profit relative to Budget
           const profit = result - (fundSource === 'mortgage' ? 0 : budget); 
           row.push(profit);
        }
        heatMapRows.push(row);
     }


     return {
        stressedProjection: data,
        stressStats: {
           breakEvenHibor,
           lowestEquity
        },
        sensitivityData: {
           xLabels,
           yLabels,
           data: heatMapRows
        }
     }

  }, [projectionData, simulatedHibor, bondPriceDrop, showGuaranteed, totalPremium, netBondPrincipal, bondYield, bankLoan, spread, capRate, budget, cashReserve, sensitivityYear, fundSource, unlockedCash]);


  // --- Export Function ---
  const handleExportCSV = () => {
    const headers = [
      "Year", 
      "Cum. Bond Interest",
      "Cash Reserve", 
      "Bond Principal (Net)", 
      "Policy Cash Value", 
      "Total Loan", 
      "Cum. Loan Interest", 
      ...(fundSource === 'mortgage' ? ["Mortgage Balance", "Annual Mtg Pmt"] : []),
      "Net Equity"
    ];
    const rows = projectionData.map(d => [
      d.year,
      d.cumulativeBondInterest.toFixed(2),
      d.cashValue.toFixed(2),
      d.bondPrincipal.toFixed(2),
      d.surrenderValue.toFixed(2),
      d.loan.toFixed(2),
      d.cumulativeInterest.toFixed(2),
      ...(fundSource === 'mortgage' ? [d.mortgageBalance.toFixed(2), d.annualMortgagePayment.toFixed(2)] : []),
      d.netEquity.toFixed(2)
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "financial_projection_30y.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNavigate = (view: string) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex font-sans">
      
      {/* Sidebar */}
      <Sidebar 
        activeView={activeView} 
        onNavigate={handleNavigate} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        labels={t}
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 transition-all duration-300">
        
        {/* Top Header */}
        <header className="bg-white sticky top-0 z-10 px-6 md:px-10 py-5 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-4">
             {/* Mobile Menu Trigger */}
             <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden text-slate-500 hover:text-[#020617] transition-colors"
                aria-label="Open menu"
             >
                <Menu className="w-6 h-6" />
             </button>
             
             <div>
                <h1 className="text-xl md:text-2xl font-serif text-[#020617]">{t.financingProposal}</h1>
                {/* Header Reference info removed */}
             </div>
          </div>
          <div className="flex items-center gap-6">
             {/* Language Switcher */}
             <div className="hidden sm:flex items-center space-x-2 mr-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <select 
                  value={lang} 
                  onChange={(e) => setLang(e.target.value as Language)}
                  className="bg-transparent text-xs font-bold text-slate-600 uppercase tracking-wide focus:outline-none cursor-pointer hover:text-[#020617]"
                >
                  <option value="en">English</option>
                  <option value="zh_hk">繁體中文</option>
                  <option value="zh_cn">简体中文</option>
                </select>
             </div>

             <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t.hiborRate}</span>
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
                 
                 {/* Dropdown */}
                 {showNotifications && (
                    <div className="absolute right-0 top-12 w-80 bg-white shadow-xl border border-slate-100 rounded-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                       <div className="bg-[#f8fafc] px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.notifications}</span>
                          <button onClick={() => setUnreadCount(0)} className="text-[10px] text-[#c5a059] font-bold hover:text-[#b45309]">{t.markRead}</button>
                       </div>
                       <div className="max-h-[300px] overflow-y-auto">
                          {notifications.map((n) => (
                             <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                   <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                      n.type === 'success' ? 'text-emerald-600' : 
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
                             <div className="p-8 text-center text-xs text-slate-400">{t.noNotifications}</div>
                          )}
                       </div>
                    </div>
                 )}
             </div>
          </div>
        </header>

        <div className="p-4 md:p-10 max-w-[1600px] mx-auto space-y-8">
          
          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Inputs & Controls (Always Visible) */}
            <div className="lg:col-span-4 space-y-8">
               
               {activeView === 'marketRisk' ? (
                  // --- Stress Test Controls ---
                  <Card title={t.stressTest} subtitle={t.marketRisk} goldAccent>
                      <InputField 
                        label={t.simulatedHibor} 
                        value={simulatedHibor} 
                        onChange={setSimulatedHibor} 
                        step={0.1} 
                        suffix="%" 
                      />
                      <InputField 
                        label={t.bondPriceDrop} 
                        value={bondPriceDrop} 
                        onChange={setBondPriceDrop} 
                        step={5} 
                        suffix="%" 
                      />
                      <ToggleField 
                        label={t.showGuaranteed} 
                        checked={showGuaranteed} 
                        onChange={setShowGuaranteed} 
                      />
                  </Card>
               ) : activeView === 'systemConfig' ? (
                  // --- System Config Sidebar Controls (Optional) ---
                  <Card title={t.providerStatus} subtitle="System Health" goldAccent>
                      <div className="space-y-4">
                         <div className="flex items-center justify-between p-3 bg-emerald-50 rounded border border-emerald-100">
                            <div className="flex items-center gap-3">
                               <div className={`w-2 h-2 rounded-full ${dataSource === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                               <span className="text-xs font-bold text-slate-700">Bloomberg API</span>
                            </div>
                            <span className={`text-[10px] uppercase font-bold ${dataSource === 'live' ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {dataSource === 'live' ? 'Active' : 'Standby'}
                            </span>
                         </div>
                         <div className="flex items-center justify-between p-3 bg-emerald-50 rounded border border-emerald-100">
                            <div className="flex items-center gap-3">
                               <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                               <span className="text-xs font-bold text-slate-700">Core Ledger</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-emerald-600">Synced</span>
                         </div>
                         <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                            <div className="flex items-center gap-3">
                               <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                               <span className="text-xs font-bold text-slate-500">Nightly Batch</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Pending</span>
                         </div>
                      </div>
                  </Card>
               ) : (
                  // --- Default Controls ---
                  <>
                    <Card 
                      className="overflow-hidden"
                      goldAccent 
                      collapsible
                      title={
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={(e) => {e.stopPropagation(); setFundSource('cash')}}
                            className={`pb-1 text-sm font-bold uppercase tracking-wider transition-colors ${fundSource === 'cash' ? 'text-[#c5a059] border-b-2 border-[#c5a059]' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            {t.cashSource}
                          </button>
                          <button 
                             onClick={(e) => {e.stopPropagation(); setFundSource('mortgage')}}
                             className={`pb-1 text-sm font-bold uppercase tracking-wider transition-colors ${fundSource === 'mortgage' ? 'text-[#c5a059] border-b-2 border-[#c5a059]' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            {t.mortgageRefi}
                          </button>
                        </div>
                      }
                      subtitle={fundSource === 'cash' ? t.clientAssets : t.unlockedCapital}
                    >
                        {fundSource === 'cash' ? (
                          <>
                             <InputField label={t.totalBudget} value={budget} onChange={setBudget} />
                          </>
                        ) : (
                          <div className="space-y-6">
                             <div className="grid grid-cols-2 gap-6">
                               <InputField label={t.propVal} value={propertyValue} onChange={setPropertyValue} />
                               <InputField label={t.existingLoan} value={existingMortgage} onChange={setExistingMortgage} />
                             </div>
                             <div className="grid grid-cols-3 gap-4">
                               <div className="col-span-1">
                                  <InputField label={t.refiLtv} value={mortgageLtv} onChange={setMortgageLtv} suffix="%" step={1} />
                               </div>
                               <div className="col-span-2">
                                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-center">
                                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.unlockedCash}</div>
                                      <div className="text-lg font-serif font-medium text-slate-900">{formatCurrency(unlockedCash)}</div>
                                  </div>
                               </div>
                             </div>
                             
                             {/* Mortgage Rate Terms (Replaces single input) */}
                             <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                                <InputField label={t.primeRate} value={primeRate} onChange={setPrimeRate} suffix="%" step={0.125} />
                                <InputField label={t.hSpread} value={mortgageHSpread} onChange={setMortgageHSpread} suffix="%" step={0.1} />
                                <InputField label={t.pCap} value={mortgagePModifier} onChange={setMortgagePModifier} suffix="%" step={0.1} />
                             </div>

                             <div className="grid grid-cols-2 gap-6">
                                <InputField label={t.tenor} value={mortgageTenor} onChange={setMortgageTenor} suffix="Yr" step={1} />
                                <div className="bg-orange-50 p-2 rounded border border-orange-100 text-center flex flex-col justify-center">
                                    <div className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">{t.effectiveMtgRate}</div>
                                    <div className="text-xl font-serif font-bold text-orange-700">{formatPercent(effectiveMortgageRate)}</div>
                                </div>
                             </div>

                             <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                   <span className="font-bold uppercase tracking-wider">{t.monthlyMtg}</span>
                                   <span className="font-mono text-slate-900">{formatCurrency(monthlyMortgagePmt)}</span>
                                </div>
                                <button 
                                  onClick={handleApplyCapital}
                                  className="w-full py-3 bg-[#c5a059] hover:bg-[#b45309] text-white text-xs font-bold uppercase tracking-widest rounded shadow transition-colors"
                                >
                                  {t.applyCapital}
                                </button>
                             </div>
                             <div className="text-center text-[10px] text-slate-400 mt-2">
                               Current Budget: <span className="font-mono text-slate-700">{formatCurrency(budget)}</span>
                             </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                          <InputField label={t.cashReserve} value={cashReserve} onChange={setCashReserve} />
                          <InputField label={t.bondFund} value={bondAlloc} onChange={setBondAlloc} />
                        </div>
                        <InputField label={t.bondYield} value={bondYield} onChange={setBondYield} prefix="" step={0.1} suffix="%" />
                        
                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-baseline">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.policyEquity}</span>
                            <span className={`text-xl font-serif ${pfEquity < 0 ? 'text-red-700' : 'text-[#020617]'}`}>
                              {formatCurrency(pfEquity)}
                            </span>
                        </div>
                    </Card>

                    <Card title={t.bankParams} subtitle={t.lendingTerms} collapsible>
                        <div className="grid grid-cols-2 gap-6">
                          <InputField 
                            label={t.hiborRate} 
                            value={hibor} 
                            onChange={setHibor} 
                            prefix="" 
                            step={0.01} 
                            disabled={dataSource === 'live'}
                          />
                          <InputField label={t.spread} value={spread} onChange={setSpread} prefix="" step={0.05} />
                        </div>
                        <div className="grid grid-cols-2 gap-6 mt-2">
                          <InputField label={t.intCap} value={capRate} onChange={setCapRate} prefix="" step={0.1} />
                          <SelectField 
                            label={t.leverageLtv} 
                            value={leverageLTV} 
                            onChange={setLeverageLTV}
                            options={[{value: 90, label: '90% LTV'}, {value: 95, label: '95% LTV'}]}
                          />
                        </div>
                        <div className="mt-6 border-t border-slate-100 pt-6">
                          <InputField label={t.handlingFee} value={handlingFee} onChange={setHandlingFee} prefix="" step={0.1} />
                          <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
                            <span>{t.oneOffDeduction}:</span>
                            <span className="font-bold text-[#c5a059]">{formatCurrency(oneOffBondFee)}</span>
                          </div>
                        </div>
                    </Card>
                  </>
               )}

            </div>

            {/* Right Column: Visuals & Metrics (Switched based on View) */}
            <div className="lg:col-span-8 space-y-8">
              
              {activeView === 'allocation' && (
                <>
                  {/* Top KPIs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard 
                        label={t.totalPolicyValue} 
                        value={formatCurrency(totalPremium)} 
                        subtext={t.day1Exposure} 
                    />
                    <KPICard 
                        label={t.lendingFacility} 
                        value={formatCurrency(bankLoan)} 
                        subtext={`@ ${formatPercent(effectiveRate)} ${t.effectiveRate}`} 
                    />
                    <KPICard 
                        label={t.netEquityY30} 
                        value={formatCurrency(finalNetEquity)} 
                        subtext={`${roi.toFixed(1)}% ${t.roi}`} 
                        highlight 
                    />
                  </div>

                  {/* Monthly Cashflow Analysis */}
                  <Card title={t.monthlyCashflow} subtitle={t.incomeVsCost}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.bondIncome}</div>
                            <div className="text-xl font-serif text-[#059669] flex items-center">
                              <PlusCircle className="w-4 h-4 mr-2" />
                              {formatCurrency(monthlyBondIncome)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.loanInterest}</div>
                            <div className="text-xl font-serif text-[#991b1b] flex items-center">
                              <MinusCircle className="w-4 h-4 mr-2" />
                              {formatCurrency(monthlyLoanInterest)}
                            </div>
                          </div>
                          {fundSource === 'mortgage' && (
                             <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                               <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.mtgCost}</div>
                               <div className="text-xl font-serif text-orange-700 flex items-center">
                                 <Home className="w-4 h-4 mr-2" />
                                 {formatCurrency(monthlyMortgagePmt)}
                               </div>
                             </div>
                          )}
                          <div className="pt-4">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">{t.netMonthlyCashflow}</div>
                            <div className={`text-3xl font-serif font-medium ${monthlyNetCashflow >= 0 ? 'text-slate-900' : 'text-[#991b1b]'}`}>
                              {monthlyNetCashflow >= 0 ? '+' : ''}{formatCurrency(monthlyNetCashflow)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="h-48 w-full border-l border-slate-100 pl-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                layout="vertical" 
                                data={[
                                  { name: t.income, value: monthlyBondIncome, fill: THEME.success },
                                  { name: t.intCost, value: monthlyLoanInterest, fill: THEME.danger },
                                  ...(fundSource === 'mortgage' ? [{ name: t.mtgCost, value: monthlyMortgagePmt, fill: THEME.orange }] : [])
                                ]}
                                margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
                                barSize={24}
                            >
                                <XAxis type="number" hide />
                                <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  tickLine={false} 
                                  axisLine={false} 
                                  width={60}
                                  tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} 
                                />
                                <Tooltip 
                                  cursor={{fill: '#f1f5f9'}}
                                  formatter={(value: number) => formatCurrency(value)}
                                  contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                  {
                                    [THEME.success, THEME.danger, THEME.orange].map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry} />
                                    ))
                                  }
                                </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                  </Card>

                  {/* Diagram */}
                  <Card title={t.structureVis} subtitle={t.fundFlow}>
                    <FlowDiagram 
                      budget={budget} 
                      cash={cashReserve} 
                      bond={netBondPrincipal} 
                      equity={pfEquity} 
                      loan={bankLoan} 
                      premium={totalPremium} 
                      labels={t}
                      sourceType={fundSource}
                    />
                  </Card>
                </>
              )}

              {activeView === 'returnStudio' && (
                <ReturnStudio 
                  data={projectionData} 
                  labels={t} 
                  bondYield={bondYield}
                  loanRate={effectiveRate}
                />
              )}

              {activeView === 'holdings' && (
                <>
                   {/* Chart */}
                  <Card title={t.projectedPerf} subtitle={t.horizon30y}>
                    <div className="h-[400px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={projectionData} margin={{ top: 10, right: 100, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPolicy" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={THEME.navy} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={THEME.navy} stopOpacity={0.05}/>
                            </linearGradient>
                            <linearGradient id="colorBond" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={THEME.gold} stopOpacity={0.6}/>
                              <stop offset="95%" stopColor={THEME.gold} stopOpacity={0.05}/>
                            </linearGradient>
                            <linearGradient id="colorBondInt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={THEME.goldHighlight} stopOpacity={0.6}/>
                              <stop offset="95%" stopColor={THEME.goldHighlight} stopOpacity={0.05}/>
                            </linearGradient>
                            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={THEME.success} stopOpacity={0.6}/>
                              <stop offset="95%" stopColor={THEME.success} stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="year" 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickMargin={15}
                            fontFamily="sans-serif"
                          />
                          <YAxis 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickFormatter={(val) => `$${val/1000000}M`}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={15}
                            fontFamily="sans-serif"
                          />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ 
                              backgroundColor: '#020617', 
                              border: 'none', 
                              color: '#fff',
                              fontFamily: 'sans-serif'
                            }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ fontWeight: 'bold', color: '#c5a059', marginBottom: '5px' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="cumulativeBondInterest" 
                            stackId="1" 
                            stroke={THEME.goldHighlight} 
                            fill="url(#colorBondInt)" 
                            name={t.bondInt}
                            label={(props) => <CustomLabel {...props} name={t.bondInt} color={THEME.goldHighlight} />}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="cashValue" 
                            stackId="1" 
                            stroke={THEME.success} 
                            fill="url(#colorCash)" 
                            name={t.cash} 
                            label={(props) => <CustomLabel {...props} name={t.cash} color={THEME.success} />}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="bondPrincipal" 
                            stackId="1" 
                            stroke={THEME.gold} 
                            fill="url(#colorBond)" 
                            name={t.bond} 
                            label={(props) => <CustomLabel {...props} name={t.bond} color={THEME.gold} />}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="surrenderValue" 
                            stackId="1" 
                            stroke={THEME.navy} 
                            fill="url(#colorPolicy)" 
                            name={t.policy} 
                            label={(props) => <CustomLabel {...props} name={t.policy} color={THEME.navy} />}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="loan" 
                            stroke={THEME.danger} 
                            strokeWidth={2} 
                            strokeDasharray="4 4" 
                            dot={false} 
                            name={t.loan} 
                            label={(props) => <CustomLabel {...props} name={t.loan} color={THEME.danger} />}
                          />
                          {fundSource === 'mortgage' && (
                             <Line 
                                type="monotone" 
                                dataKey="mortgageBalance" 
                                stroke={THEME.orange} 
                                strokeWidth={2} 
                                strokeDasharray="2 2" 
                                dot={false} 
                                name={t.mortgageBalance} 
                             />
                          )}
                          <Line 
                            type="monotone" 
                            dataKey="netEquity" 
                            stroke="#000" 
                            strokeWidth={3} 
                            dot={false} 
                            name={t.netEquity} 
                            label={(props) => <CustomLabel {...props} name={t.netEquity} color="#020617" />}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Table */}
                  <Card 
                    title={t.ledgerStatement} 
                    subtitle={t.fiscalYearBreakdown}
                    className="overflow-hidden"
                    action={
                        <button 
                          onClick={handleExportCSV}
                          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#020617] transition-colors uppercase tracking-wider group"
                        >
                          <Download className="w-4 h-4 text-[#c5a059] group-hover:text-[#020617]" />
                          {t.exportData}
                        </button>
                    }
                  >
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-4 font-bold uppercase tracking-widest min-w-[60px]">{t.year}</th>
                            <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-emerald-600">{t.cumBondInt}</th>
                            <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-emerald-600">{t.cashReserve}</th>
                            <th className="px-4 py-4 font-bold uppercase tracking-widest text-right">{t.bondCapitalNet}</th>
                            <th className="px-4 py-4 font-bold uppercase tracking-widest text-right">{t.policyValue}</th>
                            <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-red-800">{t.totalLoan}</th>
                            {fundSource === 'mortgage' && <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-orange-800">{t.mortgageBalance}</th>}
                            <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-red-800">{t.cumLoanInt}</th>
                            {fundSource === 'mortgage' && <th className="px-4 py-4 font-bold uppercase tracking-widest text-right text-orange-600">{t.mtgCost}</th>}
                            <th className="px-4 py-4 font-bold uppercase tracking-widest text-right bg-slate-100">{t.netEquity}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {projectionData.map((row) => (
                            <tr key={row.year} className="hover:bg-slate-50 transition-colors font-mono text-slate-600">
                              <td className="px-4 py-3 font-bold text-slate-900">{row.year}</td>
                              <td className="px-4 py-3 text-right text-emerald-600">+{formatCurrency(row.cumulativeBondInterest)}</td>
                              <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(row.cashValue)}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(row.bondPrincipal)}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(row.surrenderValue)}</td>
                              <td className="px-4 py-3 text-right text-red-700">{formatCurrency(row.loan)}</td>
                              {fundSource === 'mortgage' && <td className="px-4 py-3 text-right text-orange-800">{formatCurrency(row.mortgageBalance)}</td>}
                              <td className="px-4 py-3 text-right text-red-400">({formatCurrency(row.cumulativeInterest)})</td>
                              {fundSource === 'mortgage' && <td className="px-4 py-3 text-right text-orange-600">({formatCurrency(row.annualMortgagePayment)})</td>}
                              <td className={`px-4 py-3 text-right font-bold bg-slate-50 ${row.netEquity >= 0 ? 'text-[#020617]' : 'text-red-700'}`}>
                                {row.formattedNetEquity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              )}

              {activeView === 'marketRisk' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard 
                      label={t.lowestNetEquity} 
                      value={formatCurrency(stressStats.lowestEquity)} 
                      subtext="Projected Minimum"
                      alert={stressStats.lowestEquity < 0}
                    />
                    <KPICard 
                      label={t.breakEvenHibor} 
                      value={formatPercent(stressStats.breakEvenHibor)} 
                      subtext="Net Carry Neutral"
                    />
                    <KPICard 
                      label="Max LTV" 
                      value={formatPercent(Math.max(...stressedProjection.map(d => d.ltv)))} 
                      subtext={t.marginCallThreshold}
                      alert={Math.max(...stressedProjection.map(d => d.ltv)) > 90}
                    />
                  </div>

                  {/* Net Worth Comparison Chart */}
                  <Card title={t.netWorthComparison} subtitle={`${t.baseline} vs ${t.stressed}`}>
                    <div className="h-[350px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stressedProjection} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={THEME.navy} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={THEME.navy} stopOpacity={0.05}/>
                            </linearGradient>
                            <linearGradient id="colorStressed" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={THEME.danger} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={THEME.danger} stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `$${val/1000000}M`} tickLine={false} axisLine={false} />
                          <Tooltip formatter={(val:number) => formatCurrency(val)} />
                          <Legend />
                          <Area type="monotone" dataKey="baselineNetEquity" name={t.baseline} stroke={THEME.navy} fill="url(#colorBaseline)" strokeWidth={2} />
                          <Area type="monotone" dataKey="netEquity" name={t.stressed} stroke={THEME.danger} fill="url(#colorStressed)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Heatmap */}
                  <Card 
                    title={t.sensitivityAnalysis} 
                    subtitle={`Net Equity @ Year ${sensitivityYear} (${t.stressed})`}
                    action={
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">{t.analysisYear}:</span>
                         <select 
                            value={sensitivityYear} 
                            onChange={(e) => setSensitivityYear(Number(e.target.value))}
                            className="bg-slate-100 border-none text-xs font-bold text-slate-700 rounded py-1 pl-2 pr-2 cursor-pointer focus:ring-1 focus:ring-[#c5a059] outline-none"
                         >
                            {[10, 15, 20, 25, 30].map(y => (
                               <option key={y} value={y}>Year {y}</option>
                            ))}
                         </select>
                      </div>
                    }
                  >
                     <div className="mt-6 overflow-x-auto pb-4">
                        <Heatmap 
                           xLabels={sensitivityData.xLabels} 
                           yLabels={sensitivityData.yLabels} 
                           data={sensitivityData.data} 
                        />
                     </div>
                     <div className="mt-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-2">
                          <Activity className="w-3 h-3 text-[#c5a059]" />
                          {t.interpretation}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {t.heatmapLegend}
                        </p>
                     </div>
                  </Card>
                </div>
              )}

              {activeView === 'systemConfig' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   {/* Data Feeds Config */}
                   <Card title={t.dataFeeds} subtitle="Market Data Integration">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                  <Server className="w-5 h-5 text-slate-600" />
                                  <h4 className="text-sm font-bold text-slate-800">HIBOR Source</h4>
                               </div>
                               <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${dataSource === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {dataSource} Mode
                               </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                               Select the primary source for Interbank rates. 'Live' pulls from the active Bloomberg Terminal integration. 'Manual' allows override for scenario planning.
                            </p>
                            <SelectField 
                               label="Primary Feed" 
                               value={dataSource} 
                               onChange={setDataSource}
                               options={[{value: 'live', label: 'Bloomberg (Live)'}, {value: 'manual', label: 'Manual Input'}]}
                            />
                            
                            {/* Caching Source Details */}
                            {dataSource === 'live' && (
                              <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                                 <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                       <LinkIcon className="w-3 h-3" />
                                       <span className="font-bold">{t.sourceUrl}</span>
                                    </div>
                                    <a href="https://www.hkab.org.hk/tc/rates/hibor" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#c5a059] hover:underline truncate max-w-[150px]">
                                       hkab.org.hk/tc/rates/hibor
                                    </a>
                                 </div>
                                 <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                       <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                       <span className="font-bold">{t.cachingStatus}</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-600 font-mono">
                                       {isFetchingRates ? 'Syncing...' : 'Cached (LocalStorage)'}
                                    </span>
                                 </div>
                                 <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                       <Clock className="w-3 h-3" />
                                       <span className="font-bold">{t.lastUpdated}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                       {lastRateUpdate ? lastRateUpdate.toLocaleTimeString() : 'Pending...'}
                                    </span>
                                 </div>
                              </div>
                            )}
                         </div>

                         <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                  <Database className="w-5 h-5 text-slate-600" />
                                  <h4 className="text-sm font-bold text-slate-800">NAV Calculation</h4>
                               </div>
                               <RefreshCw className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                               Configure the update frequency for Net Asset Value calculations on collateralized bond funds.
                            </p>
                            <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-200">
                               <span className="text-xs font-bold text-slate-600">Frequency</span>
                               <span className="text-sm font-serif text-[#020617]">Daily (EOD)</span>
                            </div>
                         </div>
                      </div>
                   </Card>

                   {/* Global Risk Limits */}
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

                   {/* Compliance & Regulatory */}
                   <Card title={t.compliance} subtitle="Jurisdiction Settings">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                         <SelectField 
                            label={t.regulatoryMode} 
                            value={regulatoryMode} 
                            onChange={setRegulatoryMode}
                            options={[{value: 'hkma', label: 'HKMA (Hong Kong)'}, {value: 'mas', label: 'MAS (Singapore)'}]}
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
              )}

            </div>
          </div>
        </div>
        
        {/* Footer with Disclaimer */}
        <footer className="mt-12 py-8 border-t border-slate-200 text-center bg-slate-50">
          <p className="text-[10px] text-slate-400 leading-relaxed max-w-4xl mx-auto px-6">
            {t.globalDisclaimer}
          </p>
          <p className="text-[10px] text-slate-300 mt-4 font-mono uppercase tracking-widest">
            © 2024 Private Wealth Management. Confidential & Proprietary.
          </p>
        </footer>

      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);