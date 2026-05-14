export function formatCurrency(value: number, isBlindMode: boolean, fractionDigits: number = 2): string {
    if (isBlindMode) {
        // Trả về dấu *** kèm màu đỏ hoặc xanh tùy giá trị (hoặc trung lập)
        // Nhưng logic trả về string thì ta có thể trả *** 
        // Tuy nhiên thường ta dùng dấu -*** / +***
        if (value < 0) return '-$***';
        if (value > 0) return '+$***';
        return '$***';
    }
    
    const formatted = Math.abs(value).toLocaleString('en-US', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
    });
    
    if (value < 0) return `-$${formatted}`;
    return `$${formatted}`;
}
