/**
 * 🔓 GAI UNCENSOR SERVICE - Usuwanie cenzury i ograniczeń
 * 
 * To rozszerza system GAI o:
 * - Brak cenzury treści
 * - Pełna swoboda działania
 * - Inteligentne granice (tylko techniczne zabezpieczenia)
 * - Transparentność operacji
 * - User empowerment
 */

export interface UncensorRule {
  id: string;
  name: string;
  description: string;
  type: 'content' | 'operation' | 'topic' | 'capability';
  severity: 'none' | 'low' | 'medium' | 'high';
  restriction: string;
  reason: string;
  bypassAllowed: boolean;
  bypassReason?: string;
  userOverride: boolean;
}

export interface UncensorRequest {
  id: string;
  ruleId: string;
  userReason: string;
  requestedAt: number;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: number;
  approvedReason?: string;
}

export interface TransparencyReport {
  totalOperations: number;
  censoredOperations: number;
  bypassedOperations: number;
  userOverrides: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentBypasses: UncensorRequest[];
}

class GAIUncensorService {
  private restrictions: Map<string, UncensorRule> = new Map();
  private bypassRequests: UncensorRequest[] = [];
  private isEnabled = true;
  private transparencyMode = true;
  private userEmpowerment = true;
  private operationLog: Array<{
    timestamp: number;
    operation: string;
    restriction?: string;
    bypassed: boolean;
    userOverride: boolean;
    reason?: string;
  }> = [];

  constructor() {
    this.initializeDefaultRestrictions();
  }

  // 🔓 DOMYŚLNE OGRANICZENIA - TYLKO TECHNICZNE
  private initializeDefaultRestrictions(): void {
    const defaultRestrictions: UncensorRule[] = [
      // 🛡️ TYLKO TECHNICZNE ZABEZPIECZENIA
      {
        id: 'system-stability',
        name: 'System Stability Only',
        description: 'Only technical restrictions that prevent system crashes',
        type: 'operation',
        severity: 'high',
        restriction: 'Prevent infinite loops, memory exhaustion, and system crashes',
        reason: 'Technical necessity to keep system running',
        bypassAllowed: false,
        userOverride: false
      },
      {
        id: 'data-integrity',
        name: 'Data Integrity Protection',
        description: 'Protect against data corruption',
        type: 'operation',
        severity: 'high',
        restriction: 'Prevent operations that could corrupt database or files',
        reason: 'Prevent data loss and corruption',
        bypassAllowed: false,
        userOverride: false
      },
      {
        id: 'security-boundaries',
        name: 'Security Boundaries',
        description: 'Prevent access outside allowed directories',
        type: 'operation',
        severity: 'medium',
        restriction: 'Prevent file system access outside project boundaries',
        reason: 'Prevent accidental access to system files',
        bypassAllowed: true,
        bypassReason: 'User may need to access external directories',
        userOverride: true
      }
    ];

    defaultRestrictions.forEach(rule => {
      this.restrictions.set(rule.id, rule);
    });
  }

  // 🔍 SPRAWDZANIE OGRANICZEŃ
  checkRestrictions(operation: string, context?: string): {
    restricted: boolean;
    rule?: UncensorRule;
    message: string;
    bypassAvailable: boolean;
    userOverrideAvailable: boolean;
  } {
    if (!this.isEnabled) {
      return {
        restricted: false,
        message: 'Restrictions disabled',
        bypassAvailable: false,
        userOverrideAvailable: false
      };
    }

    // Sprawdź każdą regułę
    for (const rule of this.restrictions.values()) {
      if (this.matchesRestriction(rule, operation, context)) {
        this.logOperation(operation, rule.id, false, false, rule.reason);
        
        return {
          restricted: true,
          rule,
          message: rule.reason,
          bypassAvailable: rule.bypassAllowed,
          userOverrideAvailable: rule.userOverride
        };
      }
    }

    this.logOperation(operation, undefined, false, false, 'No restrictions applied');
    
    return {
      restricted: false,
      message: 'Operation allowed',
      bypassAvailable: false,
      userOverrideAvailable: false
    };
  }

  private matchesRestriction(rule: UncensorRule, operation: string, context?: string): boolean {
    try {
      // Proste dopasowanie - można rozbudować o bardziej zaawansowaną logikę
      const combinedText = `${operation} ${context || ''}`.toLowerCase();
      
      switch (rule.id) {
        case 'system-stability':
          return /(infinite.*loop|while.*true.*no.*exit|memory.*leak|stack.*overflow)/i.test(combinedText);
        
        case 'data-integrity':
          return /(corrupt.*database|delete.*all.*data|overwrite.*system.*files)/i.test(combinedText);
        
        case 'security-boundaries':
          return /(\/etc\/|\/usr\/|\/var\/|\/system\/|\.\.\.\.)/i.test(combinedText);
        
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error checking restriction ${rule.id}:`, error);
      return false;
    }
  }

  // 🚫 BYPASSOWANIE OGRANICZEŃ
  requestBypass(ruleId: string, userReason: string): {
    success: boolean;
    requestId?: string;
    message: string;
    autoApproved?: boolean;
  } {
    const rule = this.restrictions.get(ruleId);
    if (!rule) {
      return { success: false, message: 'Rule not found' };
    }

    if (!rule.bypassAllowed) {
      return { success: false, message: 'This restriction cannot be bypassed' };
    }

    const requestId = `bypass_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const request: UncensorRequest = {
      id: requestId,
      ruleId,
      userReason,
      requestedAt: Date.now(),
      approved: false
    };

    // Auto-approve dla niskiego ryzyka
    if (rule.severity === 'low' || rule.severity === 'none') {
      request.approved = true;
      request.approvedBy = 'auto';
      request.approvedAt = Date.now();
      request.approvedReason = 'Low risk operation - auto-approved';
      
      this.bypassRequests.push(request);
      
      return {
        success: true,
        requestId,
        message: 'Bypass auto-approved for low-risk operation',
        autoApproved: true
      };
    }

    // Wymagaj manualnej aprobaty dla wysokiego ryzyka
    this.bypassRequests.push(request);
    
    return {
      success: true,
      requestId,
      message: 'Bypass request submitted for approval',
      autoApproved: false
    };
  }

  approveBypass(requestId: string, approver: string, reason: string): boolean {
    const request = this.bypassRequests.find(r => r.id === requestId);
    if (!request || request.approved) {
      return false;
    }

    request.approved = true;
    request.approvedBy = approver;
    request.approvedAt = Date.now();
    request.approvedReason = reason;

    console.log(`✅ Bypass approved: ${requestId} by ${approver}`);
    return true;
  }

  // 👤 USER OVERRIDE
  userOverride(operation: string, userConfirmation: boolean): {
    success: boolean;
    message: string;
    operationId?: string;
  } {
    if (!this.userEmpowerment) {
      return { success: false, message: 'User empowerment is disabled' };
    }

    if (!userConfirmation) {
      return { success: false, message: 'User confirmation required' };
    }

    const operationId = `override_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    this.logOperation(operation, undefined, true, true, 'User override applied');
    
    return {
      success: true,
      message: 'User override successful - operation allowed',
      operationId
    };
  }

  // 📊 TRANSPARENTNOŚĆ I RAPORTOWANIE
  getAllRestrictions(): UncensorRule[] {
    return Array.from(this.restrictions.values());
  }

  getTransparencyReport(): TransparencyReport {
    const recentRequests = this.bypassRequests.slice(-10);
    
    const report: TransparencyReport = {
      totalOperations: this.operationLog.length,
      censoredOperations: this.operationLog.filter(op => op.restriction).length,
      bypassedOperations: this.operationLog.filter(op => op.bypassed).length,
      userOverrides: this.operationLog.filter(op => op.userOverride).length,
      byType: {},
      bySeverity: {},
      recentBypasses: recentRequests
    };

    // Agreguj po typach
    this.operationLog.forEach(op => {
      if (op.restriction) {
        report.byType[op.restriction] = (report.byType[op.restriction] || 0) + 1;
      }
    });

    // Agreguj po severity
    this.restrictions.forEach(rule => {
      report.bySeverity[rule.severity] = this.operationLog.filter(op => 
        op.restriction === rule.id
      ).length;
    });

    return report;
  }

  getBypassHistory(limit = 50): UncensorRequest[] {
    return [...this.bypassRequests]
      .sort((a, b) => b.requestedAt - a.requestedAt)
      .slice(0, limit);
  }

  // 🔧 KONFIGURACJA
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`Uncensor system ${enabled ? 'enabled' : 'disabled'}`);
  }

  setTransparencyMode(enabled: boolean): void {
    this.transparencyMode = enabled;
    console.log(`Transparency mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  setUserEmpowerment(enabled: boolean): void {
    this.userEmpowerment = enabled;
    console.log(`User empowerment ${enabled ? 'enabled' : 'disabled'}`);
  }

  // 🧹 CZYSZCZENIE
  clearHistory(): void {
    this.operationLog = [];
    this.bypassRequests = [];
    console.log('Uncensor history cleared');
  }

  // 🔧 PRYWATNE METODY
  private logOperation(operation: string, restriction?: string, bypassed = false, userOverride = false, reason?: string): void {
    if (!this.transparencyMode) return;

    this.operationLog.push({
      timestamp: Date.now(),
      operation,
      restriction,
      bypassed,
      userOverride,
      reason
    });

    // Zachowaj tylko ostatnie 1000 operacji
    if (this.operationLog.length > 1000) {
      this.operationLog = this.operationLog.slice(-1000);
    }
  }
}

// 🌍 GLOBALNA INSTANCJA
export const gaiUncensor = new GAIUncensorService();

// 🚀 INICJALIZACJA
export const initializeUncensorSystem = (): void => {
  console.log(`🔓 GAI Uncensor System initialized - restrictions minimized, user empowerment maximized`);
  console.log(`📊 Loaded ${gaiUncensor.getAllRestrictions().length} minimal restrictions`);
  
  // Test systemu
  const testResult = gaiUncensor.checkRestrictions('test operation');
  console.log(`🧪 Uncensor system test: ${testResult.restricted ? 'RESTRICTED' : 'ALLOWED'}`);
};

// 🎯 EKSPORT DODATKOWYCH FUNKCJI
export { gaiUncensor as uncensor };