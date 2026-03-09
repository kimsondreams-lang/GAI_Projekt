
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GAIAgentRouter {
  constructor() {
    this.initialized = false;
    this.config = null;
    this.activeAgents = new Map();
  }

  async init(systemDB) {
    console.log('[AGENT_ROUTER] Initializing Agent Router...');
    this.config = systemDB.settings.agenticSystem;
    this.initialized = !!(this.config && this.config.enabled);
    if (!this.initialized) {
      console.log('[AGENT_ROUTER] Agentic System is disabled.');
      return;
    }

    console.log(`[AGENT_ROUTER] Loaded ${this.config.modules.length} agent modules.`);
  }

  setConfig(nextConfig) {
    this.config = nextConfig || null;
    this.initialized = !!(this.config && this.config.enabled);
  }

  getModules() {
    return this.config?.modules || [];
  }

  getMasterModel() {
    return this.config?.masterModel || this.config?.allowedModels?.[0] || '';
  }

  /**
   * Main routing function. Decides which agent should handle the user request.
   * If "Agentic System" is disabled, returns null (fallback to standard chat).
   */
  async routeRequest(userMessage, history, ollamaService) {
    if (!this.config || !this.config.enabled) return null;
    if (!this.initialized) this.initialized = true;

    const masterModel = this.getMasterModel();
    if (!masterModel) return null;

    console.log(`[AGENT_ROUTER] Routing request via Brain (${masterModel})...`);

    // 1. Brain Analysis Phase
    // The Brain decides if it can handle it or needs to delegate
    const plan = await this.askBrain(userMessage, masterModel, ollamaService);
    
    if (plan.action === 'multi_agent' && Array.isArray(plan.subtasks)) {
        console.log(`[AGENT_ROUTER] Brain initiating MULTI-AGENT protocol with ${plan.subtasks.length} subtasks.`);
        if (typeof global.logToSystem === 'function') {
             global.logToSystem('info', `[AGENT_ROUTER] Multi-Agent Protocol: ${plan.subtasks.length} agents deployed.`);
        }
        
        const results = [];
        for (const subtask of plan.subtasks) {
            // Recursively process each subtask as a mini-plan
            const subPlan = {
                ...subtask,
                // Inherit or default missing fields if necessary
            };
            
            let result = null;
            if (subPlan.action === 'delegate') {
                const agent = this.config.modules.find(m => m.id === subPlan.targetAgentId);
                if (agent) {
                     result = await this.runAgent(agent, subPlan.instruction, ollamaService);
                }
            } else if (subPlan.action === 'create_agent') {
                const newAgent = {
                    id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: subPlan.newAgentName,
                    description: subPlan.newAgentDescription || `Specialist created for: ${subPlan.instruction.slice(0,30)}`,
                    model: subPlan.suggestedModel || this.config.masterModel, 
                    systemPrompt: subPlan.newAgentPrompt || `You are a specialist agent named ${subPlan.newAgentName}.`,
                    capabilities: subPlan.capabilities || [],
                    memoryContext: []
                };
                this.config.modules.push(newAgent);
                if (global.saveSystemDB) global.saveSystemDB();
                console.log(`[AGENT_ROUTER] Brain created sub-agent: ${newAgent.name}`);
                result = await this.runAgent(newAgent, subPlan.instruction, ollamaService);
            }
            
            if (result) {
                results.push(`--- REPORT FROM ${result.agent} ---\n${result.content}`);
            }
        }
        
        // Captain synthesizes the report
        const finalReport = `
**CAPTAIN'S REPORT (MISSION SUMMARY)**
--------------------------------------------------
Operation: Multi-Agent Coordination
Agents Deployed: ${plan.subtasks.length}

${results.join('\n\n')}

--------------------------------------------------
**CAPTAIN'S CONCLUSION:**
Mission executed. Review the agent reports above for details.
`;
        return {
            type: 'multi_agent_result',
            agentName: 'The Captain',
            response: finalReport
        };

    } else if (plan.action === 'delegate') {
        const agent = this.config.modules.find(m => m.id === plan.targetAgentId);
        if (agent) {
             const result = await this.runAgent(agent, plan.instruction, ollamaService);
             return { 
                 type: 'delegated',
                 agentName: 'The Captain', // Captain presents the result
                 response: `**CAPTAIN'S REPORT (DELEGATED TASK)**\n\nI assigned this task to **${agent.name}**.\n\n**AGENT REPORT:**\n${result.content}` 
             };
        }
    } else if (plan.action === 'create_agent') {
        // Dynamic Agent Creation Logic
        const newAgent = {
            id: `agent_${Date.now()}`,
            name: plan.newAgentName,
            description: plan.newAgentDescription,
            model: plan.suggestedModel || this.getMasterModel(),
            systemPrompt: plan.newAgentPrompt,
            capabilities: plan.capabilities || [],
            memoryContext: []
        };
        
        // Add to config and save DB (we need access to db save method or just update in memory and let sync handle it)
        // For now we assume this.config is a reference to SYSTEM_DB.settings.agenticSystem
        this.config.modules.push(newAgent);
        if (global.saveSystemDB) global.saveSystemDB();
        console.log(`[AGENT_ROUTER] Brain created new agent: ${newAgent.name}`);
        
        // Immediately use the new agent
        const result = await this.runAgent(newAgent, plan.instruction, ollamaService);
        return {
            type: 'delegated',
            agentName: 'The Captain',
            response: `**CAPTAIN'S REPORT (NEW AGENT DEPLOYED)**\n\nI have commissioned a new agent: **${newAgent.name}**.\n\n**AGENT REPORT:**\n${result.content}`
        };
    }

    // Default: Brain handles it directly
    return null; 
  }

  async askBrain(message, model, ollamaService) {
      const modulesList = this.config.modules.map(m => `- ${m.name} (ID: ${m.id}): ${m.description}`).join('\n');
      const allowedModels = (this.config.allowedModels || []).join(', ');
      
      const prompt = `You are the CAPTAIN (The Brain) of the GAI OS.
User Request: "${message}"

Available Agents:
${modulesList}

Available Models for new agents: ${allowedModels}

Your goal is to decide:
1. "direct": Handle this yourself ONLY if it's a simple chat or general knowledge query.
2. "delegate": Delegate to an existing agent (specialized task).
3. "create_agent": Create a NEW specialized agent if none fit.
4. "multi_agent": Decompose a complex task into subtasks for MULTIPLE agents.

CORE PRINCIPLES (CAPTAIN'S CODE):
- You are the CAPTAIN. Your job is to COMMAND, not to row the boat.
- You do NOT do the work yourself unless it's trivial. You COORDINATE.
- If a task involves multiple aspects (e.g. "Fix blog" -> code, design, content), you MUST use "multi_agent" and assign specialists to each part.
- Do NOT be a "hero". Heroes scale poorly. Captains build armies.
- When creating an agent, carefully select the most appropriate model.

You (The Orchestrator) are responsible for high-level PLANNING.
If a task requires complex planning, handle it yourself or create a sub-planner if absolutely necessary, but generally YOU are the planner.

When defining capabilities for a new agent, do NOT be limited to a fixed list. You can invent new capabilities that describe what the agent needs (e.g., "speech_synthesis", "advanced_reasoning", "creative_writing"). The system will interpret them as best as it can or use them for context.

Important: If the user asks for a status report, progress update, or success confirmation, you should handle it or delegate to an agent that can check system status. If creating an agent, ensure its system prompt includes instructions to REPORT back results clearly.

WHEN CREATING A NEW AGENT (create_agent):
- You MUST write a SPECIFIC, DEDICATED system prompt for the new agent in 'newAgentPrompt'.
- The prompt must define the agent's ROLE, GOAL, and SPECIALIZED KNOWLEDGE.
- Do NOT just copy a generic prompt. Customize it for the requested task.

Return JSON ONLY. No markdown, no explanations.
Format:
{
  "action": "direct" | "delegate" | "create_agent" | "multi_agent",
  "targetAgentId": "id_if_delegate",
  "instruction": "Instructions for the agent...",
  "newAgentName": "Name if creating",
  "newAgentDescription": "Description if creating",
  "newAgentPrompt": "System prompt for new agent",
  "suggestedModel": "One from available models",
  "capabilities": ["string", "string"],
  "subtasks": [ // Only for multi_agent
      { "action": "create_agent", "newAgentName": "...", "instruction": "..." },
      { "action": "delegate", "targetAgentId": "...", "instruction": "..." }
  ]
}`;
      try {
          // We need to use generate but ensure json format is requested if supported by model
          // or parse carefully. Using temperature 0.1 for stability.
          const response = await ollamaService.generate(model, prompt, { format: 'json', temperature: 0.1 });
          
          // Clean response if model adds markdown blocks
          const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
          const plan = JSON.parse(cleaned);
          console.log(`[AGENT_ROUTER] Brain plan: ${plan.action} ${plan.newAgentName ? `(Creating: ${plan.newAgentName})` : ''} ${plan.targetAgentId ? `(Delegating to: ${plan.targetAgentId})` : ''}`);
          // Log to system so it appears in terminal if filters allow
          if (typeof global.logToSystem === 'function') {
              global.logToSystem('info', `[AGENT_ROUTER] Brain Plan: ${plan.action} -> ${plan.targetAgentId || plan.newAgentName || 'self'}`);
          }
          return plan;
      } catch (e) {
          console.error('[AGENT_ROUTER] Brain failed to plan:', e);
          return { action: 'direct' };
      }
  }

  async runAgent(agent, instruction, ollamaService) {
      console.log(`[AGENT_ROUTER] Running Agent ${agent.name} with instruction: ${instruction.slice(0, 100)}...`);
      if (typeof global.logToSystem === 'function') {
          global.logToSystem('info', `[AGENT_ROUTER] Running Agent ${agent.name}: ${instruction.slice(0, 60)}...`);
      }
      
      const systemPrompt = agent.systemPrompt;
      const model = agent.model || this.getMasterModel();
      if (!model) {
          return {
              agent: agent.name || 'Unnamed Agent',
              content: 'Agent cannot run: no model configured.'
          };
      }
      const response = await ollamaService.chat(model, [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: instruction }
      ]);
      
      console.log(`[AGENT_ROUTER] Agent ${agent.name} finished.`);
      if (typeof global.logToSystem === 'function') {
          global.logToSystem('info', `[AGENT_ROUTER] Agent ${agent.name} finished.`);
      }

      // Check for success/failure in agent response to report via Telegram if needed
      if (instruction.includes('report') || response.includes('SUCCESS') || response.includes('COMPLETED')) {
          if (typeof global.sendTelegramMessage === 'function') {
              try {
                  const report = `[AGENT REPORT: ${agent.name}]\n\n${response.slice(0, 400)}...`;
                  await global.sendTelegramMessage(report);
              } catch (e) {
                  console.error('Failed to send agent report to Telegram', e);
              }
          }
      }
      
      // Return structured response
      return {
          agent: agent.name,
          content: response
      };
  }
}

export const gaiAgentRouter = new GAIAgentRouter();

export const initializeAgentRouter = async (systemDB) => {
  await gaiAgentRouter.init(systemDB);
};
