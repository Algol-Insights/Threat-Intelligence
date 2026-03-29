import { GoogleGenAI, Type } from "@google/genai";
import { FirewallLog, ThreatAnalysis, OrganizationalContext, RunningService } from '../types';

// Assume process.env.API_KEY is configured in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const threatAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    threatName: {
      type: Type.STRING,
      description: "A concise name for the identified threat (e.g., 'SSH Brute-force Attempt').",
    },
    severity: {
      type: Type.STRING,
      description: "The baseline assessed severity level: 'Critical', 'High', 'Medium', 'Low', or 'Informational'.",
    },
    contextualSeverity: {
        type: Type.STRING,
        description: "The adaptive severity score, adjusted for the provided organizational context. If no context is provided, this should be the same as the baseline severity.",
    },
    cveId: {
      type: Type.STRING,
      description: "The most relevant CVE ID if applicable (e.g., 'CVE-2023-12345'), otherwise 'N/A'.",
    },
    summary: {
      type: Type.STRING,
      description: "A brief, one-paragraph summary of the threat and its potential impact.",
    },
    mitigation: {
      type: Type.STRING,
      description: "Recommended mitigation steps beyond the firewall's action.",
    },
    firewallActionAnalysis: {
      type: Type.STRING,
      description: "An analysis of how the firewall's action (e.g., 'BLOCKED') handled this specific threat.",
    },
    threatActorDNA: {
      type: Type.OBJECT,
      properties: {
          name: {
             type: Type.STRING,
             description: "The likely threat actor or group (e.g., 'APT28', 'FIN7', 'Unknown', 'Commodity Malware'). Otherwise 'N/A'."
          },
          ttps: {
            type: Type.ARRAY,
            description: "An array of Tactics, Techniques, and Procedures (TTPs) associated with this actor and attack type. Each TTP must have a description and its corresponding MITRE ATT&CK ID.",
            items: {
              type: Type.OBJECT,
              properties: {
                technique: {
                  type: Type.STRING,
                  description: "The name of the MITRE ATT&CK technique (e.g., 'Lateral Movement')."
                },
                id: {
                  type: Type.STRING,
                  description: "The MITRE ATT&CK ID (e.g., 'T1021.001')."
                }
              },
              required: ['technique', 'id']
            }
          },
          commonTools: {
              type: Type.STRING,
              description: "Tools commonly used by this actor for this type of activity (e.g., 'Metasploit', 'Cobalt Strike', 'Custom Malware')."
          },
          motivation: {
              type: Type.STRING,
              description: "The likely motivation of the threat actor (e.g., 'Financial Gain', 'Espionage', 'Disruption', 'Notoriety')."
          }
      },
      required: ['name', 'ttps', 'commonTools', 'motivation'],
    },
    predictiveAnalysis: {
        type: Type.STRING,
        description: "A forecast of the attacker's likely next steps if this attack had succeeded or as part of the broader campaign (e.g., 'Lateral Movement', 'Privilege Escalation', 'Ransomware Deployment')."
    },
    crossDomainCorrelation: {
        type: Type.STRING,
        description: "Potential links between this cyber threat and other domains. Consider the source IP's origin, the target, and the attack type to correlate with geopolitical events, financial fraud patterns, or misinformation campaigns. State 'None apparent' if no correlation exists."
    },
    complianceImpact: {
      type: Type.STRING,
      description: "Analysis of potential impact on compliance frameworks (e.g., GDPR, HIPAA, PCI-DSS) adjusted for the provided context. Briefly explain the relevance. Example: 'For a Healthcare org, this could be a HIPAA breach.' If no impact, state 'None'.",
    },
  },
  required: ['threatName', 'severity', 'cveId', 'summary', 'mitigation', 'firewallActionAnalysis', 'threatActorDNA', 'complianceImpact', 'predictiveAnalysis', 'crossDomainCorrelation', 'contextualSeverity'],
};

export const analyzeThreat = async (log: FirewallLog, context: OrganizationalContext | null): Promise<ThreatAnalysis> => {
  const { mispContext, ...logDetails } = log;
  const logString = JSON.stringify(logDetails, null, 2);
  
  const contextString = context ? `
    Organizational Context:
    - Industry: ${context.industry}
    - Primary Country of Operation: ${context.country}
  ` : "No organizational context provided.";

  const mispContextString = mispContext ? `
    External Threat Intelligence (from MISP):
    ${JSON.stringify(mispContext, null, 2)}
    **Crucially, this external intelligence confirms the indicator is known. Correlate this with the log data.**
  ` : "No external intelligence was found for this indicator.";


  const prompt = `
    As a senior cybersecurity analyst named Algol, provide an expert-level, multi-faceted threat analysis of the following firewall log.
    
    ${contextString}
    ${mispContextString}

    Firewall Log:
    ${logString}
    
    Your analysis must be comprehensive and structured. Populate all fields in the requested JSON format.
    
    **Analysis Dimensions:**
    1.  **Baseline Identification**: Name the threat, identify relevant CVEs, and determine a baseline severity.
    2.  **Adaptive Scoring**: Based on the provided **Organizational Context**, determine an **Adaptive Severity Score**. For example, a data exfiltration attempt is more critical for a 'Healthcare' company in the 'USA' (HIPAA concerns) than for a personal blog. If no context, adaptive score should equal baseline.
    3.  **Threat Actor DNA**: Profile the likely threat actor. For their TTPs, provide an array of objects, where each object contains the technique name and its specific MITRE ATT&CK ID (e.g., { "technique": "Valid Accounts", "id": "T1078" }). Describe their tools and motivations as well.
    4.  **Predictive Intelligence**: What would the attacker do next? Forecast the subsequent stages of their attack campaign.
    5.  **Cross-Domain Correlation**: Think bigger picture. Could this event be tied to geopolitical tensions (e.g., attacks from a specific country), broader fraud schemes, or other intelligence domains?
    6.  **Impact & Response**: Analyze the firewall's action, recommend further mitigation, and assess the **Compliance Impact** specifically through the lens of the provided organizational context.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: threatAnalysisSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    // Basic validation to ensure the response matches the expected structure
    if (
      !parsedJson.threatName ||
      !parsedJson.severity ||
      !parsedJson.threatActorDNA?.name ||
      !Array.isArray(parsedJson.threatActorDNA?.ttps)
    ) {
      throw new Error("Invalid response structure from the AI model.");
    }

    return parsedJson as ThreatAnalysis;
  } catch (error) {
    console.error("Error calling AI API:", error);
    if (error instanceof Error && error.message.includes('JSON')) {
        throw new Error("Algol returned a malformed JSON. The model may be unable to generate a valid analysis for this log.");
    }
    throw new Error("Failed to parse threat analysis from Algol.");
  }
};


export const getRemediationSuggestion = async (service: RunningService): Promise<string> => {
  const prompt = `
    As a senior cybersecurity engineer, provide clear, actionable, step-by-step remediation advice for the following insecure service running on an internal device. The advice should be practical for a system administrator to follow.

    Vulnerable Service Details:
    - Service Name: ${service.name}
    - Port: ${service.port}/${service.protocol}
    - Version: ${service.version}
    - Reason for Insecurity: ${service.insecurityReason}

    Format your response as a markdown-formatted string with a clear heading, a brief explanation of the risk, and a numbered list of remediation steps. For example:

    ### Remediation Plan for ${service.name} on Port ${service.port}

    **Risk Overview:** The current configuration is insecure because...

    **Remediation Steps:**
    1.  First step...
    2.  Second step...
    3.  Third step, which might involve a configuration change or patch.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Flash is suitable for this kind of direct instruction generation
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling AI API for remediation:", error);
    throw new Error("Failed to generate remediation steps from Algol.");
  }
};