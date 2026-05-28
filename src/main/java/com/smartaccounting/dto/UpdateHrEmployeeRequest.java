package com.smartaccounting.dto;

import java.time.LocalDate;
import java.util.Map;

public record UpdateHrEmployeeRequest(
    String fullName,
    String department,
    String title,
    String status,
    String phone,
    String email,
    LocalDate hireDate,
    Map<String, Object> profile
) {}
