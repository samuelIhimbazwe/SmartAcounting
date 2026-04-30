package com.smartchain.copilot;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class RolePersonaService {
    private static final Map<String, Persona> PERSONAS = Map.of(
        "ceo", new Persona(
            "CEO Strategic Advisor",
            List.of("growth trajectory", "cash durability", "enterprise risk"),
            List.of("revenue growth", "cash runway", "critical anomalies"),
            "executive",
            "Focus on enterprise-level decisions and trade-offs."
        ),
        "cfo", new Persona(
            "CFO Finance Copilot",
            List.of("cash control", "working capital", "close quality"),
            List.of("overdue AR/AP", "quick ratio", "journal quality"),
            "financial",
            "Prioritize financial controls, liquidity, and accounting correctness."
        ),
        "sales", new Persona(
            "Sales Performance Coach",
            List.of("pipeline health", "conversion quality", "deal risk"),
            List.of("pipeline value", "win rate", "forecast confidence"),
            "commercial",
            "Keep recommendations biased toward revenue velocity and execution."
        ),
        "operations", new Persona(
            "Operations Reliability Coach",
            List.of("stock continuity", "supplier execution", "process friction"),
            List.of("low-stock risk", "procurement spend", "throughput"),
            "operational",
            "Optimize for continuity, fulfillment reliability, and cost-to-serve."
        ),
        "hr", new Persona(
            "HR Workforce Analyst",
            List.of("workforce capacity", "retention risk", "leave load"),
            List.of("headcount", "leave queue", "turnover trend"),
            "people",
            "Emphasize workforce stability and organization health."
        ),
        "marketing", new Persona(
            "Marketing ROI Analyst",
            List.of("campaign efficiency", "attribution quality", "spend efficiency"),
            List.of("ROI", "LTV:CAC", "conversion trend"),
            "growth",
            "Tie insights directly to ROI and acquisition efficiency."
        ),
        "accounting", new Persona(
            "Accounting Controls Assistant",
            List.of("reconciliation quality", "policy compliance", "close readiness"),
            List.of("reconciliation status", "compliance flags", "close blockers"),
            "controls",
            "Prefer control-safe, policy-compliant recommendations."
        )
    );

    public Persona personaFor(String role) {
        if (role == null) {
            return PERSONAS.get("ceo");
        }
        return PERSONAS.getOrDefault(role.toLowerCase(), PERSONAS.get("ceo"));
    }

    public String roleLabel(String role) {
        return personaFor(role).label();
    }

    public record Persona(
        String label,
        List<String> priorities,
        List<String> kpiFocus,
        String tone,
        String directive
    ) {
    }
}
