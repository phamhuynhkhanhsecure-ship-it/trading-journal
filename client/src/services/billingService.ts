const API_URL = 'http://localhost:8000/api/v1/billing';

export const billingApi = {
  purchasePremium: async (token: string) => {
    const response = await fetch(`${API_URL}/purchase-premium`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Payment failed');
    }
    
    return await response.json();
  }
};
