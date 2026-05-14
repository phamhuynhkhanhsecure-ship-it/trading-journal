import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { billingApi } from '../../services/billingService';
import './Pricing.css';

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function Pricing() {
  const { token, refreshProfile, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already Premium
  const isPremium = user?.permissions?.includes('ROLE_SUPER_ADMIN') || user?.permissions?.includes('nav-analytics');

  const handleUpgrade = async () => {
    if (!token) {
      navigate('/');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // 1. Call Payment API
      await billingApi.purchasePremium(token);
      
      // 2. Start Short Polling - directly fetch and check permissions
      let attempts = 0;
      const maxAttempts = 15; // 15 * 2s = 30 seconds timeout
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          // Fetch user profile directly and check permissions in the response
          const response = await fetch('http://localhost:8000/api/v1/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const result = await response.json();
          
          if (result.success && result.data) {
            const permissions: string[] = result.data.permissions || [];
            const hasPremium = permissions.includes('nav-analytics') || permissions.includes('ROLE_SUPER_ADMIN');
            
            if (hasPremium) {
              clearInterval(pollInterval);
              // Also refresh the global auth context so sidebar updates
              await refreshProfile();
              setIsProcessing(false);
              setIsSuccess(true);
              
              // Redirect after 3 seconds
              setTimeout(() => {
                navigate('/analytics');
              }, 3000);
              return;
            }
          }
        } catch (err) {
          console.error("Polling error", err);
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          await refreshProfile();
          setError(t('pricing.timeoutError'));
          setIsProcessing(false);
        }
      }, 2000);

      // Save interval ID for cleanup
      (window as any).sagaPollInterval = pollInterval;

    } catch (err: any) {
      setError(err.message || t('pricing.genericError'));
      setIsProcessing(false);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if ((window as any).sagaPollInterval) {
        clearInterval((window as any).sagaPollInterval);
      }
    };
  }, []);

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1 className="pricing-title">{t('pricing.title')}</h1>
        <p className="pricing-subtitle">{t('pricing.subtitle')}</p>
      </div>

      <div className="pricing-cards">
        {/* Free Card */}
        <div className="pricing-card pricing-card--free">
          <div className="card-header">
            <h2 className="card-title">{t('pricing.basicTitle')}</h2>
            <div className="card-price">{t('pricing.basicPrice')}<span>{t('pricing.perMonth')}</span></div>
          </div>
          <ul className="card-features">
            <li><CheckIcon className="feature-icon-free" /> {t('pricing.basicFeature1')}</li>
            <li><CheckIcon className="feature-icon-free" /> {t('pricing.basicFeature2')}</li>
            <li><CheckIcon className="feature-icon-free" /> {t('pricing.basicFeature3')}</li>
            <li style={{ opacity: 0.5 }}><CheckIcon className="feature-icon-free" /> {t('pricing.basicFeature4')}</li>
            <li style={{ opacity: 0.5 }}><CheckIcon className="feature-icon-free" /> {t('pricing.basicFeature5')}</li>
          </ul>
          <button className="btn-pricing btn-free" disabled>{t('pricing.currentPlan')}</button>
        </div>

        {/* Premium Card */}
        <div className="pricing-card pricing-card--premium">
          <div className="card-badge">{t('pricing.recommended')}</div>
          <div className="card-header">
            <h2 className="card-title">{t('pricing.premiumTitle')}</h2>
            <div className="card-price">{t('pricing.premiumPrice')}<span>{t('pricing.perMonth')}</span></div>
          </div>
          <ul className="card-features">
            <li><CheckIcon className="feature-icon-premium" /> {t('pricing.premiumFeature1')}</li>
            <li><CheckIcon className="feature-icon-premium" /> <strong>{t('pricing.premiumFeature2')}</strong></li>
            <li><CheckIcon className="feature-icon-premium" /> {t('pricing.premiumFeature3')}</li>
            <li><CheckIcon className="feature-icon-premium" /> {t('pricing.premiumFeature4')}</li>
            <li><CheckIcon className="feature-icon-premium" /> {t('pricing.premiumFeature5')}</li>
          </ul>
          
          <button 
            className="btn-pricing btn-premium" 
            onClick={handleUpgrade}
            disabled={isProcessing || isPremium}
          >
            {isPremium ? t('pricing.alreadyPremium') : t('pricing.upgradeNow')}
          </button>
          {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
        </div>
      </div>

      {/* Loading & Success Overlays */}
      {isProcessing && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <h2 className="loading-text">{t('pricing.processing')}</h2>
          <p className="loading-subtext">{t('pricing.processingDesc')}</p>
        </div>
      )}

      {isSuccess && (
        <div className="loading-overlay">
          <div className="success-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 className="loading-text">{t('pricing.success')}</h2>
          <p className="loading-subtext">{t('pricing.successDesc')}</p>
        </div>
      )}
    </div>
  );
}
