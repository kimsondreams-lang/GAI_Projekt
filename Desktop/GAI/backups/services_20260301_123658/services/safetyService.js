/**
 * 🛡️ GAI SAFETY SERVICE - Zabezpieczenia przed samozniszczeniem
 *
 * To jest SYSTEM BEZPIECZEŃSTWA który:
 * - Chroni przed samozniszczeniem
 * - Blokuje niebezpieczne operacje
 * - Ma inteligentne recovery
 * - Monitoruje ryzyko
 * - Pozwala na bezpieczny rozwój
 */
class GAISafetyService {
    constructor() {
        this.rules = new Map();
        this.incidents = [];
        this.isEnabled = true;
        this.strictMode = false;
        this.learningMode = false;
        this.maxIncidentsBeforeLockdown = 10;
        this.lockdownThreshold = 5; // critical incidents
        this.isInLockdown = false;
        this.stats = {
            totalIncidents: 0,
            blockedOperations: 0,
            warningsIssued: 0,
            approvalsRequired: 0,
            bySeverity: {},
            byCategory: {}
        };
        this.initializeDefaultRules();
    }
    // 🛡️ DOMYŚLNE REGUŁY BEZPIECZEŃSTWA
    initializeDefaultRules() {
        const defaultRules = [
            // 🚨 KRYTYCZNE - BLOKOWANE
            {
                id: 'critical-system-files',
                name: 'Protect System Files',
                description: 'Prevents modification of critical system files',
                severity: 'critical',
                category: 'file_system',
                pattern: /(server\.js|package\.json|tsconfig\.json|\.env|system\.db)/i,
                action: 'block',
                message: 'Critical system files cannot be modified',
                documentation: 'These files are essential for system operation'
            },
            {
                id: 'dangerous-commands',
                name: 'Block Dangerous Commands',
                description: 'Prevents execution of system-destroying commands',
                severity: 'critical',
                category: 'code_execution',
                pattern: /(rm -rf \/|format c:|del \/f \/s \/q|sudo rm -rf)/i,
                action: 'block',
                message: 'Dangerous system commands are blocked',
                documentation: 'These commands could destroy the system'
            },
            {
                id: 'self-deletion',
                name: 'Prevent Self-Deletion',
                description: 'Prevents the system from deleting itself',
                severity: 'critical',
                category: 'file_system',
                pattern: (op) => op.type === 'delete' && op.target.includes('GAI') && op.target.includes('system'),
                action: 'block',
                message: 'Self-deletion is not allowed',
                documentation: 'System cannot delete its own files'
            },
            // ⚠️ WYSOKIE RYZYKO - WYMAGANE POTWIERDZENIE
            {
                id: 'mass-deletion',
                name: 'Mass Deletion Warning',
                description: 'Warns about operations that delete many files',
                severity: 'high',
                category: 'file_system',
                pattern: /(delete.*all|remove.*everything|clear.*all|rm.*\*)/i,
                action: 'require_approval',
                message: 'Mass deletion operation requires approval',
                documentation: 'Large deletion operations need user confirmation'
            },
            {
                id: 'system-config-change',
                name: 'System Configuration Changes',
                description: 'Monitors changes to system configuration',
                severity: 'high',
                category: 'system_config',
                pattern: /(settings\.json|config\.json|\.env|system.*config)/i,
                action: 'require_approval',
                message: 'System configuration changes require approval',
                documentation: 'Critical system settings are protected'
            },
            // ⚡ ŚREDNIE RYZYKO - OSTRZEŻENIA
            {
                id: 'memory-overflow',
                name: 'Memory Overflow Protection',
                description: 'Prevents operations that could cause memory overflow',
                severity: 'medium',
                category: 'memory',
                pattern: /(create.*10000|generate.*1000|infinite.*loop|while.*true)/i,
                action: 'warn',
                message: 'Operation may cause memory overflow',
                documentation: 'Large operations are monitored for memory usage'
            },
            {
                id: 'infinite-recursion',
                name: 'Infinite Recursion Protection',
                description: 'Prevents infinite recursive operations',
                severity: 'medium',
                category: 'code_execution',
                pattern: /(function.*call.*itself|recursive.*without.*exit|stack.*overflow)/i,
                action: 'warn',
                message: 'Potential infinite recursion detected',
                documentation: 'Recursive operations need proper exit conditions'
            },
            // ℹ️ NISKIE RYZYKO - INFORMACYJNE
            {
                id: 'experimental-feature',
                name: 'Experimental Feature Warning',
                description: 'Warns about experimental features',
                severity: 'low',
                category: 'code_execution',
                pattern: /(experimental|beta|alpha|test.*feature)/i,
                action: 'warn',
                message: 'Experimental feature detected',
                documentation: 'Experimental features may have bugs'
            }
        ];
        defaultRules.forEach(rule => {
            this.rules.set(rule.id, rule);
        });
    }
    // 🔍 SPRAWDZANIE BEZPIECZEŃSTWA
    async checkSafety(operation) {
        if (!this.isEnabled) {
            return { safe: true, action: 'allow', message: 'Safety system disabled' };
        }
        if (this.isInLockdown) {
            return {
                safe: false,
                action: 'block',
                message: 'System is in safety lockdown mode',
                details: 'Too many safety incidents detected. Manual intervention required.'
            };
        }
        // Sprawdź każdą regułę
        for (const rule of this.rules.values()) {
            const matches = this.checkRule(rule, operation);
            if (matches) {
                return this.handleRuleViolation(rule, operation);
            }
        }
        return { safe: true, action: 'allow', message: 'Operation is safe' };
    }
    checkRule(rule, operation) {
        try {
            if (typeof rule.pattern === 'function') {
                return rule.pattern(operation);
            }
            else if (rule.pattern instanceof RegExp) {
                const target = operation.target || '';
                const content = operation.content || '';
                return rule.pattern.test(target) || rule.pattern.test(content);
            }
            else if (typeof rule.pattern === 'string') {
                const target = operation.target || '';
                const content = operation.content || '';
                return target.includes(rule.pattern) || content.includes(rule.pattern);
            }
        }
        catch (error) {
            console.error(`Error checking rule ${rule.id}:`, error);
            return false;
        }
        return false;
    }
    handleRuleViolation(rule, operation) {
        const incident = {
            id: `incident_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            ruleId: rule.id,
            operation,
            action: rule.action,
            severity: rule.severity,
            message: rule.message,
            timestamp: Date.now(),
            resolved: false
        };
        this.incidents.push(incident);
        this.updateStats(incident);
        // Sprawdź czy powinniśmy wejść w tryb lockdown
        this.checkLockdownConditions();
        return {
            safe: rule.action === 'allow' || rule.action === 'warn',
            action: rule.action,
            rule,
            message: rule.message,
            details: rule.documentation
        };
    }
    updateStats(incident) {
        this.stats.totalIncidents++;
        this.stats.bySeverity[incident.severity] = (this.stats.bySeverity[incident.severity] || 0) + 1;
        this.stats.byCategory[incident.operation.type] = (this.stats.byCategory[incident.operation.type] || 0) + 1;
        this.stats.lastIncident = incident.timestamp;
        switch (incident.action) {
            case 'block':
                this.stats.blockedOperations++;
                break;
            case 'warn':
                this.stats.warningsIssued++;
                break;
            case 'require_approval':
                this.stats.approvalsRequired++;
                break;
        }
    }
    checkLockdownConditions() {
        const recentIncidents = this.incidents.filter(incident => Date.now() - incident.timestamp < 5 * 60 * 1000 // 5 minut
        );
        const criticalIncidents = recentIncidents.filter(incident => incident.severity === 'critical');
        if (recentIncidents.length >= this.maxIncidentsBeforeLockdown ||
            criticalIncidents.length >= this.lockdownThreshold) {
            this.enterLockdown();
        }
    }
    enterLockdown() {
        if (this.isInLockdown)
            return;
        this.isInLockdown = true;
        console.error('🚨 SAFETY LOCKDOWN ACTIVATED 🚨');
        console.error('Too many safety incidents detected');
        console.error('Manual intervention required');
        // Zapisz incydent lockdown
        const lockdownIncident = {
            id: `lockdown_${Date.now()}`,
            ruleId: 'system-lockdown',
            operation: {
                id: 'system-lockdown',
                type: 'system',
                target: 'safety-system',
                content: 'Automatic lockdown due to excessive safety incidents',
                timestamp: Date.now()
            },
            action: 'block',
            severity: 'critical',
            message: 'System entered safety lockdown mode',
            timestamp: Date.now(),
            resolved: false
        };
        this.incidents.push(lockdownIncident);
    }
    // 🛠️ ZARZĄDZANIE REGUŁAMI
    addRule(rule) {
        this.rules.set(rule.id, rule);
        console.log(`✅ Added safety rule: ${rule.name}`);
    }
    removeRule(ruleId) {
        const removed = this.rules.delete(ruleId);
        if (removed) {
            console.log(`🗑️ Removed safety rule: ${ruleId}`);
        }
        return removed;
    }
    getRule(ruleId) {
        return this.rules.get(ruleId);
    }
    getAllRules() {
        return Array.from(this.rules.values());
    }
    // 📊 RAPORTOWANIE
    getStats() {
        return { ...this.stats };
    }
    getRecentIncidents(limit = 10) {
        return [...this.incidents]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    getUnresolvedIncidents() {
        return this.incidents.filter(incident => !incident.resolved);
    }
    resolveIncident(incidentId, resolution) {
        const incident = this.incidents.find(i => i.id === incidentId);
        if (incident) {
            incident.resolved = true;
            incident.resolution = resolution;
            // Sprawdź czy możemy wyjść z lockdown
            if (this.isInLockdown && this.getUnresolvedIncidents().length === 0) {
                this.exitLockdown();
            }
            return true;
        }
        return false;
    }
    exitLockdown() {
        this.isInLockdown = false;
        console.log('✅ Safety lockdown lifted');
    }
    // ⚙️ KONFIGURACJA
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`Safety system ${enabled ? 'enabled' : 'disabled'}`);
    }
    setStrictMode(strict) {
        this.strictMode = strict;
        console.log(`Strict mode ${strict ? 'enabled' : 'disabled'}`);
    }
    setLearningMode(learning) {
        this.learningMode = learning;
        console.log(`Learning mode ${learning ? 'enabled' : 'disabled'}`);
    }
    // 🧹 CZYSZCZENIE
    clearStats() {
        this.stats = {
            totalIncidents: 0,
            blockedOperations: 0,
            warningsIssued: 0,
            approvalsRequired: 0,
            bySeverity: {},
            byCategory: {}
        };
    }
    clearIncidents() {
        this.incidents = [];
        this.isInLockdown = false;
    }
}
// 🌍 GLOBALNA INSTANCJA
export const gaiSafety = new GAISafetyService();
// 🚀 INICJALIZACJA
export const initializeSafetySystem = async () => {
    console.log('🛡️ GAI Safety System initialized');
    console.log(`📊 Loaded ${gaiSafety.getAllRules().length} safety rules`);
    // Test systemu
    const testOperation = {
        id: 'test_safety',
        type: 'file_system',
        target: 'server.js',
        content: 'attempt to modify system file',
        timestamp: Date.now()
    };
    const result = await gaiSafety.checkSafety(testOperation);
    console.log(`🧪 Safety system test: ${result.safe ? 'PASSED' : 'BLOCKED'}`);
};
// 🎯 FUNKCJE POMOCNICZE
export const createSafeOperation = (type, target, content) => ({
    id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    target,
    content,
    timestamp: Date.now()
});
export const checkOperationSafety = async (operation) => {
    const result = await gaiSafety.checkSafety(operation);
    return {
        safe: result.safe,
        action: result.action,
        message: result.message,
        details: result.details
    };
};
