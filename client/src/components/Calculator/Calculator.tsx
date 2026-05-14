import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { analyticsApi } from '../../services/api';
import './Calculator.css';

const INSTRUMENTS = [
  'NZD-CHF', 'EUR-USD', 'USD-JPY', 'AUD-NZD', 'NZD-CAD',
  'AUD-CAD', 'AUD-CHF', 'AUD-USD', 'EUR-JPY', 'USD-CAD',
  'EUR-AUD', 'EUR-CAD', 'EUR-CHF', 'NZD-USD', 'GBP-AUD',
  'GBP-JPY', 'GBP-NZD', 'NZD-JPY', 'GBP-CAD', 'XAU-USD',
  'GBP-CHF', 'EUR-GBP', 'GBP-USD', 'BTC-USD', 'ETH-USD',
  'CHF-JPY'
] as const;

export default function Calculator() {
  const { t } = useTranslation();
  const { initialBalance, setInitialBalance } = useSettings();
  const [netPnl, setNetPnl] = useState(0);
  
  // Custom states that track the active balance
  const currentBalance = initialBalance + netPnl;
  // Fallback to manual if needed, but prefill with true bal
  const [balance, setBalance] = useState<string>(currentBalance.toString());
  const [riskType, setRiskType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [riskFixed, setRiskFixed] = useState<string>('100');
  
  const [instrument, setInstrument] = useState<string>('EUR-USD');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    lots: number;
    units: number;
    riskUsd: number;
    distance: number;
    contractSize: number;
  } | null>(null);

  // Fetch exchange rates and Net Pnl
  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data?.rates) setExchangeRates(data.rates);
      })
      .catch(console.error);

    analyticsApi.overview().then(data => {
       if (data && data.totalPnl) {
          setNetPnl(data.totalPnl);
       }
    }).catch(console.error);
  }, []);

  // Update visually whenever balance changes from DB or user
  useEffect(() => {
     setBalance((initialBalance + netPnl).toString());
  }, [initialBalance, netPnl]);

  const handleCalculate = () => {
    const bal = parseFloat(balance) || 0;
    const e = parseFloat(entryPrice);
    const s = parseFloat(stopLoss);
    
    // Determine target risk USD
    let targetRiskUsd = 0;
    if (riskType === 'PERCENT') {
      targetRiskUsd = (bal * riskPercent) / 100;
    } else {
      targetRiskUsd = parseFloat(riskFixed);
    }
    
    if (isNaN(e) || isNaN(s) || targetRiskUsd <= 0 || Math.abs(e - s) === 0) {
      setResult(null);
      return;
    }

    const distance = Math.abs(e - s);
    const cSize = instrument === 'XAU-USD' ? 100 : 100000;
    
    const parts = instrument.split('-');
    const quoteCurrency = parts.length === 2 ? parts[1] : 'USD';
    const rate = exchangeRates[quoteCurrency] || 1; 
    
    const lots = (targetRiskUsd * rate) / (cSize * distance);
    const units = targetRiskUsd / distance; // Standard base units before lot contract size

    setResult({
      lots,
      units,
      riskUsd: targetRiskUsd,
      distance,
      contractSize: cSize
    });
  };

  return (
    <div className="calc-page">
      <div className="calc-header">
        <h1 className="calc-title">{t('layout.calculator', 'Máy tính Vị thế')}</h1>
        <p className="calc-subtitle">{t('calculator.subtitle', 'Tính toán chính xác Khối lượng vào lệnh (Lots) dựa trên tỷ giá Cross-pairs theo thời gian thực.')}</p>
      </div>

      <div className="calc-container">
        
        {/* Left Side: Inputs */}
        <div className="calc-panel">
          <h2 className="calc-panel-title">{t('calculator.params', 'Tham số')}</h2>
          
          <div className="calc-field">
            <label>{t('calculator.initialBalance', 'Số dư ban đầu (Vốn gốc) [$]')}</label>
            <input 
              type="number" 
              value={initialBalance} 
              onChange={e => setInitialBalance(parseFloat(e.target.value) || 0)}
              className="calc-input" 
              placeholder="VD: 10000"
            />
            <small style={{display:'block',marginTop:4,color:'var(--text-muted)'}}>
              {t('calculator.currentPnl', 'P/L Hiện tại:')} <strong>{netPnl > 0 ? '+' : ''}{netPnl.toFixed(2)}$</strong> 
              <br/>
              {t('calculator.autoBalance', 'Balance tự động (dùng để tính toán):')} <strong>${currentBalance.toFixed(2)}</strong>
            </small>
          </div>
          <div className="calc-field" style={{display: 'none'}}>
            {/* Ẩn balance input cũ nhưng giữ logic */}
            <input value={balance} onChange={e => setBalance(e.target.value)} />
          </div>

          <div className="calc-risk-tabs">
            <button 
              className={`calc-tab ${riskType === 'PERCENT' ? 'calc-tab--active' : ''}`}
              onClick={() => setRiskType('PERCENT')}
            >
              {t('calculator.riskModePercent', 'Theo % Tài khoản')}
            </button>
            <button 
              className={`calc-tab ${riskType === 'FIXED' ? 'calc-tab--active' : ''}`}
              onClick={() => setRiskType('FIXED')}
            >
              {t('calculator.riskFixed', 'Theo $ Cố định')}
            </button>
          </div>

          {riskType === 'PERCENT' ? (
            <div className="calc-field calc-field--highlight">
              <div className="calc-field-row">
                <label>{t('calculator.riskLabel', 'Rủi ro')}: {riskPercent}%</label>
                <span className="calc-computed-risk">
                  ≈ ${( (parseFloat(balance) || 0) * riskPercent / 100 ).toFixed(2)}
                </span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="10" 
                step="0.1" 
                value={riskPercent} 
                onChange={e => setRiskPercent(parseFloat(e.target.value))}
                className="calc-slider"
              />
              <input 
                type="number" 
                min="0.1" 
                step="0.1" 
                value={riskPercent} 
                onChange={e => setRiskPercent(parseFloat(e.target.value) || 0)}
                className="calc-input calc-input--small" 
                style={{ marginTop: '8px' }}
              />
            </div>
          ) : (
            <div className="calc-field calc-field--highlight">
              <label>{t('calculator.riskUsd', 'Số tiền rủi ro ($)')}</label>
              <input 
                type="number" 
                value={riskFixed} 
                onChange={e => setRiskFixed(e.target.value)}
                className="calc-input" 
                placeholder="VD: 100"
              />
            </div>
          )}

          <h2 className="calc-panel-title" style={{ marginTop: '24px' }}>{t('calculator.tradeParams', 'Tham số Giao dịch')}</h2>
          
          <div className="calc-field">
            <label>{t('calculator.instrument', 'Cặp tiền (Instrument)')}</label>
            <select 
              value={instrument} 
              onChange={e => setInstrument(e.target.value)}
              className="calc-input"
            >
              <option value="" disabled>Chọn cặp tiền...</option>
              {INSTRUMENTS.map(pair => (
                <option key={pair} value={pair}>{pair}</option>
              ))}
            </select>
          </div>

          <div className="calc-row">
            <div className="calc-field">
              <label>{t('calculator.entry', 'Giá vào (Entry)')}</label>
              <input 
                type="number" 
                value={entryPrice} 
                onChange={e => setEntryPrice(e.target.value)}
                className="calc-input" 
                step="any"
              />
            </div>
            <div className="calc-field">
              <label>{t('calculator.sl', 'Giá cắt lỗ (Stop Loss)')}</label>
              <input 
                type="number" 
                value={stopLoss} 
                onChange={e => setStopLoss(e.target.value)}
                className="calc-input" 
                step="any"
              />
            </div>
          </div>

          <button className="calc-btn calc-btn--primary" onClick={handleCalculate}>
            {t('calculator.calcBtn', 'Tính Toán Lệnh')}
          </button>
        </div>

        {/* Right Side: Output */}
        <div className="calc-panel calc-panel--result">
          <h2 className="calc-panel-title">{t('calculator.result', 'Kết quả')}</h2>
          
          {result ? (
            <div className="calc-results-wrap">
              <div className="calc-result-main">
                <span className="calc-result-label">{t('calculator.positionLots', 'Khối lượng (Lots)')}</span>
                <span className="calc-result-value">{result.lots >= 1 ? result.lots.toFixed(2) : result.lots.toFixed(4)} <small>Lot</small></span>
              </div>
              
              <div className="calc-result-grid">
                <div className="calc-result-item">
                  <span>{t('calculator.riskUsd', 'Tiền cược (Risk)')}</span>
                  <strong>${result.riskUsd.toFixed(2)}</strong>
                </div>
                <div className="calc-result-item">
                  <span>Price Distance</span>
                  <strong>{result.distance.toFixed(5)}</strong>
                </div>
                <div className="calc-result-item">
                  <span>Giá trị 1 Lot</span>
                  <strong>{result.contractSize.toLocaleString()}</strong>
                </div>
                <div className="calc-result-item">
                  <span>Total Base Units</span>
                  <strong>{Math.round(result.units).toLocaleString()}</strong>
                </div>
              </div>
              
              <div className="calc-info-alert">
                💡 <strong>Dành cho người mới:</strong> Hãy nhập đúng khối lượng <strong>{result.lots >= 1 ? result.lots.toFixed(2) : result.lots.toFixed(4)}</strong> vào sàn giao dịch của bạn. Nếu bạn chạm giá cắt lỗ, bạn sẽ mất đúng <strong>${result.riskUsd.toFixed(2)}</strong> (chưa bao gồm phí giao dịch / trượt giá).
              </div>
            </div>
          ) : (
            <div className="calc-empty-state">
              <span>{t('calculator.errorMsg', 'Hãy điền đầy đủ thông tin: Rủi ro, Giá Entry và Giá Stop Loss rồi bấm tính.')}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
