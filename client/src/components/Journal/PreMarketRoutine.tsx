import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './PreMarketRoutine.css';

interface PreMarketRoutineProps {
  onComplete: () => void;
}

export default function PreMarketRoutine({ onComplete }: PreMarketRoutineProps) {
  const { t, i18n } = useTranslation();
  const [checks, setChecks] = useState({
    sleep: false,
    calm: false,
    plan: false
  });
  const [affirmation, setAffirmation] = useState('');
  const REQUIRED_AFFIRMATION = t('pm.affirmationTarget');

  const isAffirmationValid = affirmation.trim().toLowerCase() === REQUIRED_AFFIRMATION.toLowerCase();
  const allChecked = Object.values(checks).every(Boolean);
  const isReady = allChecked && isAffirmationValid;

  const handleToggle = (key: keyof typeof checks) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );

  return (
    <div className="pm-overlay">
      <div className="pm-modal">
        <div className="pm-language-switcher">
          <select 
            value={i18n.language} 
            onChange={(e) => changeLanguage(e.target.value)}
            className="pm-lang-select"
          >
            <option value="vi">🇻🇳 VI</option>
            <option value="en">🇬🇧 EN</option>
          </select>
        </div>
        <div className="pm-header">
          <div className="pm-icon-wrapper">
            🧘
          </div>
          <h2 className="pm-title">{t('pm.title')}</h2>
          <p className="pm-subtitle">{t('pm.subtitle')}</p>
        </div>
        
        <div className="pm-checklist">
          <div 
            className={`pm-check-item ${checks.sleep ? 'pm-check-item--active' : ''}`}
            onClick={() => handleToggle('sleep')}
          >
            <div className="pm-checkbox-custom"><CheckIcon /></div>
            <span className="pm-check-label">{t('pm.check1')}</span>
          </div>
          
          <div 
            className={`pm-check-item ${checks.calm ? 'pm-check-item--active' : ''}`}
            onClick={() => handleToggle('calm')}
          >
            <div className="pm-checkbox-custom"><CheckIcon /></div>
            <span className="pm-check-label">{t('pm.check2')}</span>
          </div>

          <div 
            className={`pm-check-item ${checks.plan ? 'pm-check-item--active' : ''}`}
            onClick={() => handleToggle('plan')}
          >
            <div className="pm-checkbox-custom"><CheckIcon /></div>
            <span className="pm-check-label">{t('pm.check3')}</span>
          </div>
        </div>

        <div className="pm-affirmation-box">
          <label className="pm-affirm-label">
            {t('pm.affirmationPrompt')}
            <span className="pm-affirm-target">"{REQUIRED_AFFIRMATION}"</span>
          </label>
          <input 
            type="text" 
            className={`pm-input ${isAffirmationValid ? 'pm-input--valid' : ''}`}
            value={affirmation}
            onChange={e => setAffirmation(e.target.value)}
            placeholder={t('pm.affirmationPlaceholder')}
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        <button 
          className="pm-btn" 
          disabled={!isReady}
          onClick={onComplete}
        >
          <span className="pm-btn-icon">🚀</span> {t('pm.startBtn')}
        </button>
      </div>
    </div>
  );
}
