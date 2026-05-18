package com.smartaccounting.dto;

public record CustomerSegmentSummary(
    String segment,
    long customerCount
) {}
