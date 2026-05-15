package com.smartaccounting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

@ConfigurationProperties(prefix = "smartaccounting.tenant-plans")
public class TenantPlanLimitsProperties {
    /**
     * Max users (all rows in users for tenant) per plan code.
     */
    private Map<String, Integer> maxUsersByPlan = defaultLimits();

    private static Map<String, Integer> defaultLimits() {
        Map<String, Integer> m = new HashMap<>();
        m.put("TRIAL", 5);
        m.put("STARTER", 25);
        m.put("PROFESSIONAL", 100);
        m.put("ENTERPRISE", 500);
        m.put("STANDARD", 1000);
        return m;
    }

    public Map<String, Integer> getMaxUsersByPlan() {
        return maxUsersByPlan;
    }

    public void setMaxUsersByPlan(Map<String, Integer> maxUsersByPlan) {
        this.maxUsersByPlan = maxUsersByPlan != null ? maxUsersByPlan : defaultLimits();
    }

    public int maxUsersForPlan(String plan) {
        if (plan == null || plan.isBlank()) {
            return 1000;
        }
        return maxUsersByPlan.getOrDefault(plan.toUpperCase(), 50);
    }
}
